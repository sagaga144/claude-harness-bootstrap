#!/usr/bin/env node
// PostToolUse:Edit|Write -- the domain-specific "domain-guard note" hook for
// this project. Scoped to the files that make up the real-time audio path
// (Source/PluginProcessor.cpp, Source/DelayLine.h) and does a best-effort
// scan for the classic real-time-unsafe patterns: heap allocation, locking,
// blocking I/O, exceptions, logging.
//
// Deliberately advisory (always exits 0), not a hard block: a plain regex
// can't reliably tell "inside processBlock()" apart from "inside
// prepareToPlay() in the same file" (where allocation is legitimate), so a
// hard block here would false-positive on correct code. It prints findings
// for Claude/the correctness-reviewer agent to weigh, the same way the
// standard hook inventory's "domain-guard note" row is advisory rather than
// blocking. Fails open (silently) on any internal error.

let input = '';
process.stdin.on('data', (chunk) => { input += chunk; });
process.stdin.on('end', () => {
  try {
    const payload = JSON.parse(input || '{}');
    const filePath = String(payload?.tool_input?.file_path ?? '').replace(/\\/g, '/');

    const isAudioThreadFile = /Source\/(PluginProcessor\.cpp|DelayLine\.h)$/i.test(filePath);
    if (!isAudioThreadFile) {
      process.exit(0);
      return;
    }

    const content = String(
      payload?.tool_input?.content ?? payload?.tool_input?.new_string ?? ''
    );

    // Best-effort: scope the scan to the processBlock() function BODY only
    // (opening brace to its matching closing brace), via a simple brace-depth
    // counter -- not just "from processBlock's { to end of file", which
    // would also catch unrelated code further down the same file (e.g. a
    // `new` in a factory function after processBlock ends). Falls back to
    // scanning the whole file when no processBlock signature is found (still
    // useful for DelayLine.h, which has no prepare-time exemption to make).
    function extractFunctionBody(src, openBraceIndex) {
      let depth = 0;
      for (let i = openBraceIndex; i < src.length; i++) {
        if (src[i] === '{') depth++;
        else if (src[i] === '}') {
          depth--;
          if (depth === 0) return src.slice(openBraceIndex, i + 1);
        }
      }
      return src.slice(openBraceIndex); // unbalanced -- fall back to "rest of file"
    }

    const fnMatch = content.match(/processBlock\s*\([^)]*\)\s*\{/);
    const scanRegion = fnMatch
      ? extractFunctionBody(content, fnMatch.index + fnMatch[0].length - 1)
      : content;

    const unsafePatterns = [
      { re: /\bnew\s+[A-Za-z_]/, why: 'heap allocation (new)' },
      { re: /\bmalloc\s*\(/, why: 'heap allocation (malloc)' },
      { re: /\.push_back\s*\(|\.resize\s*\(|\.assign\s*\(/, why: 'container growth that can allocate' },
      { re: /\bstd::mutex\b|\.lock\s*\(\)|std::lock_guard|std::unique_lock/, why: 'locking' },
      { re: /\bstd::cout\b|\bprintf\s*\(|\bDBG\s*\(/, why: 'blocking I/O / logging' },
      { re: /\bfopen\s*\(|std::ifstream|std::ofstream/, why: 'file I/O' },
      { re: /\bthrow\s+/, why: 'exceptions' },
      { re: /\bdynamic_cast\s*</, why: 'dynamic_cast (can be surprisingly slow / allocate under the hood)' },
    ];

    const findings = unsafePatterns
      .filter(({ re }) => re.test(scanRegion))
      .map(({ why }) => why);

    if (findings.length > 0) {
      console.log(
        `Real-time-safety note on ${filePath}: possible audio-thread violation(s) - ` +
        `${findings.join(', ')}. If this is inside processBlock() (or something it calls), ` +
        `it must be fixed before this ships - see .claude/rules/realtime-audio-thread.md. ` +
        `If it's actually in prepareToPlay()/reset()/the constructor, this is a false positive.`
      );
    }

    process.exit(0);
  } catch (err) {
    process.exit(0);
  }
});
