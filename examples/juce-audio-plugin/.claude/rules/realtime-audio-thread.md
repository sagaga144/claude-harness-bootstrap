---
paths:
  - "Source/PluginProcessor.cpp"
  - "Source/PluginProcessor.h"
  - "Source/DelayLine.h"
---

# The real-time audio thread contract

`AudioProcessor::processBlock()` and everything it transitively calls run on
the host's real-time audio thread. This thread has a hard deadline every
block (block size / sample rate, often a few milliseconds) and the OS can
give it elevated scheduling priority. Miss the deadline, or block for any
reason, and the result is an audible click, pop, or dropout in the user's
mix — not a crash, not a wrong number, an audible glitch in real time. There
is no user-facing error message; a DAW just plays the glitch.

**Inside `processBlock()` (and anything it calls — `DelayLine::pushSample`,
`DelayLine::readDelayed`, the `SmoothedValue` calls), never:**

- **Allocate or free heap memory.** No `new`/`delete`, no `malloc`/`free`, no
  `std::vector::push_back`/`resize`/`assign` on a vector that isn't already
  at capacity, no `juce::String` construction from scratch, no
  `std::make_unique`/`shared_ptr` churn. The allocator can itself take a lock
  internally — this is true even of "fast" allocators.
- **Take a lock.** No `std::mutex`, `std::lock_guard`, `juce::CriticalSection`,
  or anything that can block waiting for another thread — including the
  message thread, which might itself be blocked on something slow (a file
  dialog, a redraw). Parameters cross from the message thread to the audio
  thread through `juce::AudioProcessorValueTreeState`'s atomic-backed raw
  parameter pointers (`apvts.getRawParameterValue(...)`), never through a
  mutex-guarded shared struct.
- **Do blocking I/O or syscalls.** No file access (`fopen`, `std::ifstream`),
  no console/logging output (`std::cout`, `printf`, JUCE's `DBG()`), no
  network calls. All of these can block for an unbounded time.
- **Throw or catch exceptions.** Stack unwinding cost is unbounded and
  exception machinery can allocate.
- **Run unbounded loops or recursion.** Every loop must be bounded by the
  block's sample count or a fixed constant known at `prepareToPlay()` time —
  never by data that could, in principle, be arbitrarily large.
- **Use `dynamic_cast`, `typeid`, or other RTTI-driven calls** that aren't
  guaranteed O(1) and allocation-free on every target platform.

**What's allowed and expected instead:**

- Pre-allocate everything the block will need in `prepareToPlay()` — this is
  why `DelayLine::prepare()` exists as a separate method from
  `pushSample()`/`readDelayed()`; `prepare()` runs on the message thread
  before streaming starts, and is the only place the ring buffer's
  `std::vector` is resized.
- Read parameters via the atomic pointers into `apvts`'s storage
  (`std::atomic<float>*`, `.load(std::memory_order_relaxed)`) — lock-free by
  construction.
- Smooth parameter changes with `juce::SmoothedValue` (fixed-size state,
  `getNextValue()` is O(1) and allocation-free) rather than reacting to a
  raw discontinuous jump every block, which would also cause zipper noise.
- Prefer fixed-size arrays / `std::array` / pre-sized `std::vector` indexed
  in place over anything that grows.

**How this gets checked in this harness** (three layers, not one):

1. `.claude/hooks/warn-realtime-unsafe.cjs` — a `PostToolUse` regex scan of
   `PluginProcessor.cpp`/`DelayLine.h` for the patterns above. Advisory, not
   a hard block (it can't perfectly distinguish "inside `processBlock()`"
   from "inside `prepareToPlay()`" in the same file), but it flags a hit
   immediately, every time either file is edited.
2. The `correctness-reviewer` agent's prompt explicitly includes this file's
   contract as part of what "correct" means for this project — a
   real-time-safety violation is treated as a correctness bug, not a
   separate "performance" concern, the same way a data race would be.
3. Manual/offline verification per CLAUDE.md's Testing section — there is no
   compiler flag or unit test that proves real-time safety; a static audit
   plus (once a toolchain exists) a tool like `real-time-sanitizer` or
   `pluginval`'s stress-test mode is the actual ground truth.

If you're touching `PluginEditor.*` instead, none of this applies — GUI code
runs on the message thread and can allocate, log, and lock freely.
