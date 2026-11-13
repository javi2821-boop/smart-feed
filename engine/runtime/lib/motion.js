// Motion rules with real numbers: the curves, springs, staggers, durations, typing speed and reading holds a piece
// should use unless it means to differ, plus a check that a timeline keeps them. Opt-in: nothing in the engine calls
// this module, so a scene moves by these rules only when it uses them. Scenes reach it as
//   import { motionRules } from 'render-machine';   // motionRules.springAt(t, 1.5, 'pop')
// and Node code imports engine/runtime/lib/motion.js directly. Pure functions of t, like anim.js.
//
// Ported from claude-motion (MIT, Copyright (c) 2026 whaleyxbt; see THIRD_PARTY.md), commit e627941:
// .claude/skills/motion-design/SKILL.md §2-4 and §9 (curves, spring table, staggers, durations, typing, reading
// holds, anti-patterns), src/lib.ts (easeOut, easeIn, easeInOut, sp() and its 14/140/0.8 default, KNOB, the rewind
// spring, the overshoot curve in effortAt), src/components/primitives.tsx (Mask), src/EffortVideo.tsx (the word and
// exit staggers, the 0.45 s word exit, the caret, the prompt bar and callout springs), src/components/PromptBar.tsx
// (whole typed characters), src/scenes/Sanitizer.tsx (the result-dot pop spring) and AGENTS.md (conventions).
// Changed for render-machine: plain JS, time in seconds instead of frames, the spring table's ranges pinned to the
// values claude-motion's own code uses, and lintTiming, which checks in code what claude-motion reviews by eye.
//
// The rules, in plain words:
// - Anything entering eases out (CURVES.arrive). Exits ease in and leave fast (CURVES.leave). A move between two
//   states eases both ways (CURVES.move). A value that lands may pass its mark by a hair (CURVES.land).
// - Springs for things that feel physical (UI, objects); bezier tweens for type and camera-like moves.
// - Stagger words by about 0.09 s, list items and chips by 0.2-0.25 s, rings and dots by 0.06 s. Nothing fades in
//   all at once, and not everything takes the same time.
// - A word reveal takes 0.8 s. Entrances take 0.7-1.25 s; an exit is about half its entrance, 0.35-0.55 s.
// - Overlap scenes: the next starts drawing before the last has fully left. A hard gap reads as loading.
// - Typing runs 0.035 s a character. The caret is solid while typing and blinks when idle (2.4 changes a second).
// - Every readable state holds after it settles: 1 s for a short phrase, 0.25 s more for each word beyond three,
//   2 s for the final hook. Text does not move while it is being read. When in doubt, hold longer and animate less.
// Never:
// - CSS animations, transitions or keyframes. Every value is a pure function of t, or frames that render alone and
//   out of order disagree.
// - Math.random or Date. Use the scene's ctx.rng (rng.js).
// - Linear easing on anything that starts or stops. Linear is only for continuous motion: rotation, drift, grain,
//   ticking hands.
// - More than one elastic spring per video. SPRINGS.elastic is the one hero moment; build to it, don't spend it early.

import { clamp, cubicBezier, easings, progress, spring } from './anim.js';

// ── Curves ────────────────────────────────────────────────────────────────
/**
 * The four bezier curves (CSS cubic-bezier, as Remotion's Easing.bezier). arrive is the same curve as EASE.snappy
 * and move the same as EASE.smooth. leave and land have no twin in EASE: EASE.exit (0.7, 0, 0.84, 0) starts slower
 * (0.03 at halfway, leave 0.11), and EASE.overshoot passes its mark by 6.6 %, land by 0.9 %.
 */
export const CURVES = Object.freeze({
  arrive: cubicBezier(0.16, 1, 0.3, 1), // claude-motion easeOut: entrances, anything arriving (0.972 at halfway)
  leave: cubicBezier(0.6, 0, 0.9, 0.35), // easeIn: exits, leaves fast and doesn't linger (0.113 at halfway)
  move: cubicBezier(0.65, 0, 0.35, 1), // easeInOut: between two states (flip, dock, morph)
  land: cubicBezier(0.55, 0, 0.2, 1.12), // a value that lands: peaks at 1.009 about 89 % of the way through
});

/** A curve from a function, a CURVES name or an anim.js easing name. Unlike anim's easing(), a typo throws. */
function curveOf(ease) {
  if (typeof ease === 'function') return ease;
  const fn = Object.hasOwn(CURVES, ease) ? CURVES[ease] : Object.hasOwn(easings, ease) ? easings[ease] : null;
  if (!fn) {
    throw new Error(`unknown curve "${ease}" (use ${Object.keys(CURVES).join(', ')}, an anim.js easing or a function)`);
  }
  return fn;
}

// ── Springs ───────────────────────────────────────────────────────────────
/**
 * The spring table (SKILL.md §3) as damping / stiffness / mass. Where the table gives a range, the preset is the value
 * claude-motion's code uses: heavy is the prompt bar's rise, calm the rewind, callout the callouts, pop the result
 * dots; elastic's mass is sp()'s default. Peaks sampled at 60 fps: settle 1.063 (0.32 s), heavy 1.043, calm 1.009,
 * knob 1.160, callout 1.219, pop 1.304, elastic 1.349.
 */
export const SPRINGS = Object.freeze({
  settle: Object.freeze({ damping: 14, stiffness: 140, mass: 0.8 }), // the default: general UI entering
  heavy: Object.freeze({ damping: 15, stiffness: 140, mass: 0.8 }), // big panels
  calm: Object.freeze({ damping: 20, stiffness: 240, mass: 0.6 }), // rewind-like, almost no overshoot
  knob: Object.freeze({ damping: 12, stiffness: 190, mass: 0.75 }), // a control snapping to a step
  callout: Object.freeze({ damping: 11, stiffness: 200, mass: 0.8 }), // callouts
  pop: Object.freeze({ damping: 9, stiffness: 230, mass: 0.7 }), // badges, success dots
  elastic: Object.freeze({ damping: 8, stiffness: 200, mass: 0.8 }), // one hero moment per video, not more
});

/**
 * A spring from 0 → 1 that starts at `start` (seconds), as claude-motion's sp(): 0 at or before start, then
 * anim.spring from rest. `preset` is a SPRINGS name or a { damping, stiffness, mass } object; `overrides` replaces
 * any of the three. As in sp(), a field an object leaves out comes from settle (14 / 140 / 0.8), so a config copied
 * from claude-motion without its mass, { damping: 15, stiffness: 140 }, moves as heavy. A field that is not a finite
 * number, or a stiffness or mass not above 0, throws instead of turning every frame into NaN.
 *
 * anim.spring is the same oscillator as Remotion's spring: x(t) = 1 − e^(−ζω₀t)(cos ω₁t + (ζω₀/ω₁) sin ω₁t), with
 * ω₀ = √(k/m), ζ = c / 2√(km) and ω₁ = ω₀√(1 − ζ²). Remotion steps it a frame at a time with the exact solution, and
 * at whole-frame offsets above 15.6 fps lands on the same values as springAt. Remotion caps a step at 64 ms, and its
 * last step from a fractional start is 1 + the remainder frames long, so below about 31 fps a start between frames
 * can make Remotion drift from the exact value springAt returns (pop, 0.95 of a frame off: 0.011 at 30 fps, 0.2 at
 * 24 fps). One more difference: Remotion treats any ζ ≥ 1 as critically damped, so damping is capped at critical
 * here and a config copied from a Remotion piece moves the same way. For a truly overdamped spring, call anim.spring.
 */
export function springAt(t, start, preset = 'settle', overrides = {}) {
  const p = typeof preset !== 'string' ? preset : Object.hasOwn(SPRINGS, preset) ? SPRINGS[preset] : null;
  if (!p) throw new Error(`unknown spring preset "${preset}" (use one of ${Object.keys(SPRINGS).join(', ')})`);
  const field = (key) => overrides[key] ?? p[key] ?? SPRINGS.settle[key];
  const stiffness = field('stiffness');
  const mass = field('mass');
  const c = field('damping');
  if (![stiffness, mass, c].every(Number.isFinite) || !(stiffness > 0 && mass > 0)) {
    throw new Error(`bad spring { damping: ${c}, stiffness: ${stiffness}, mass: ${mass} } ` +
      '(finite numbers; stiffness and mass above 0)');
  }
  if (!(t > start)) return 0;
  const damping = Math.min(c, 2 * Math.sqrt(stiffness * mass));
  return spring(t - start, { stiffness, damping, mass });
}

// ── Stagger ───────────────────────────────────────────────────────────────
/** Seconds between neighbours in a group (SKILL.md §4; the exit staggers are EffortVideo.tsx's). */
export const STAGGER = Object.freeze({
  word: 0.09, // words in a line
  item: 0.22, // list items, chips (claude-motion: 0.2-0.25)
  dot: 0.06, // rings, dots
  exitWord: 0.03, // words leaving
  exitLine: 0.05, // lines leaving
});

const stepOf = (step) => {
  const s = typeof step === 'number' ? step : Object.hasOwn(STAGGER, step) ? STAGGER[step] : undefined;
  if (s === undefined) throw new Error(`unknown stagger "${step}" (use ${Object.keys(STAGGER).join(', ')} or seconds)`);
  return s;
};

/** When the i-th member of a group starts, the first starting at `start`. `step` is a STAGGER name or seconds. */
export const staggerAt = (start, i, step = 'word') => start + i * stepOf(step);

/** When word `word` of line `line` starts to leave, from the group's exit time: lines 0.05 s apart, words 0.03 s. */
export const exitStaggerAt = (exit, line, word) => exit + line * STAGGER.exitLine + word * STAGGER.exitWord;

// ── Durations ─────────────────────────────────────────────────────────────
/** Seconds. An entrance and its exit are a pair: the exit is about half as long and eases in. */
export const DURATION = Object.freeze({
  word: 0.8, // a word rising out of its mask
  wordExit: 0.45, // a word leaving
  enterMin: 0.7,
  enterMax: 1.25,
  exitMin: 0.35,
  exitMax: 0.55,
});

/** The exit for an entrance of `entrance` seconds: half of it, kept within 0.35-0.55 s. */
export const exitFor = (entrance) => clamp(entrance / 2, DURATION.exitMin, DURATION.exitMax);

/** 0 → 1 over an entrance from `start`, eased with `ease` (a function or a curve name). */
export const enterAt = (t, start, dur, ease = CURVES.arrive) => curveOf(ease)(progress(t, start, dur));

/** 0 → 1 over an exit from `start` (1 is gone), eased with `ease`. */
export const exitAt = (t, start, dur, ease = CURVES.leave) => curveOf(ease)(progress(t, start, dur));

// ── Masked word reveal ────────────────────────────────────────────────────
/**
 * claude-motion's Mask (primitives.tsx:9-36). The outer span clips (overflow hidden, display inline-block,
 * vertical-align bottom) with `padding` and a matching negative `margin` to leave room for descenders and the tilt;
 * the inner span is inline-block, turns about `origin` and slides `travel` % of its own height: below the clip before
 * it enters, above it once it has left.
 */
export const MASK = Object.freeze({
  travel: 118, // % of the word's own height
  tilt: 5, // degrees, at the start of the entrance
  origin: '0% 100%',
  padding: '0.06em 0.06em 0.16em',
  margin: '-0.06em -0.06em -0.16em',
});

/**
 * Word `index` of a line that starts at `start` (EffortVideo.tsx:159-160): it rises out of its mask over 0.8 s,
 * 0.09 s after the word before it, and, when `exit` is given (not null), leaves upward from exitStaggerAt(exit,
 * line, index) over 0.45 s. Returns k (in, 0 → 1), out (gone, 0 → 1) and the inner span's transform as numbers:
 *   translateY = (1 − k − out) · 118  (% of its height)      rotate = (1 − k) · 5  (degrees)
 */
export function wordReveal(t, start, index, {
  line = 0, exit, step = 'word', duration = DURATION.word, ease = CURVES.arrive,
  exitDuration = DURATION.wordExit, exitEase = CURVES.leave, tilt = MASK.tilt,
} = {}) {
  const k = enterAt(t, staggerAt(start, index, step), duration, ease);
  const out = exit == null ? 0 : exitAt(t, exitStaggerAt(exit, line, index), exitDuration, exitEase);
  return { k, out, translateY: (1 - k - out) * MASK.travel, rotate: (1 - k) * tilt };
}

// ── Typing ────────────────────────────────────────────────────────────────
/** Seconds per typed character, and how many times a second an idle caret turns on or off (a full blink is 0.83 s). */
export const TYPING = Object.freeze({ perChar: 0.035, caretRate: 2.4 });

/** When typing `length` characters from `start` finishes. */
export const typingEnd = (start, length, perChar = TYPING.perChar) => start + length * perChar;

/** How many of `length` characters show at t, typing from `start`: whole characters, 0 until the first lands. */
export const typedChars = (t, start, length, perChar = TYPING.perChar) =>
  Math.max(0, Math.min(length, Math.floor((t - start) / perChar + 1e-9)));

/** Whether characters are still being typed at t. */
export const isTyping = (t, start, length, perChar = TYPING.perChar) =>
  t > start && t < typingEnd(start, length, perChar);

/** Whether the caret shows at t: always while typing, otherwise on and off 2.4 times a second. */
export const caretOn = (t, typing = false) => typing || (((Math.floor(t * TYPING.caretRate) % 2) + 2) % 2) === 0;

// ── Reading holds ─────────────────────────────────────────────────────────
/** Seconds a readable state holds after it settles (SKILL.md §4). */
export const HOLD = Object.freeze({
  short: 1, // a short phrase, up to `freeWords` words
  freeWords: 3,
  perWord: 0.25, // for each word beyond that
  final: 2, // the final hook, at least
});

const wordCount = (words) =>
  typeof words === 'number' ? words
    : Array.isArray(words) ? words.length
      : String(words).split(/\s+/).filter(Boolean).length;

/** How long a state with `words` (a count, the text or a list of words) must hold once it has settled. */
export function readingHold(words, { final = false } = {}) {
  const hold = HOLD.short + HOLD.perWord * Math.max(0, wordCount(words) - HOLD.freeWords);
  return final ? Math.max(HOLD.final, hold) : hold;
}

// ── Timing check ──────────────────────────────────────────────────────────
const secs = (v) => `${+v.toFixed(2)} s`;
const EPS = 1e-6;

/**
 * Checks a timeline against the rules above and returns one sentence per problem; an empty list means it is clean.
 * Pure: it only reads `items`. Each item, in seconds (every field is optional, null counts as left out, as it comes
 * from JSON, and a check runs when its fields are there):
 *   { name, enter, enterDur, settled, exit, exitDur, words, final }
 * enterDur is one element's entrance (one word's 0.8 s, not the whole stagger); the hold runs from `settled` (default
 * enter + enterDur; give it for a staggered line, when the last word is in) to `exit`. words is a count or the text;
 * leave it out for something that is not read. final marks the closing hook, which holds at least 2 s (the end of the
 * video is its exit).
 */
export function lintTiming(items) {
  const warnings = [];
  items.forEach((item, i) => {
    const { enter, enterDur, exit, exitDur, words, final = false } = item;
    const name = item.name ?? `item ${i + 1}`;
    if (enterDur != null && (enterDur < DURATION.enterMin - EPS || enterDur > DURATION.enterMax + EPS)) {
      warnings.push(`${name}: enters over ${secs(enterDur)}; ` +
        `entrances take ${DURATION.enterMin}-${DURATION.enterMax} s`);
    }
    if (exitDur != null && (exitDur < DURATION.exitMin - EPS || exitDur > DURATION.exitMax + EPS)) {
      warnings.push(`${name}: exits over ${secs(exitDur)}; exits take ${DURATION.exitMin}-${DURATION.exitMax} s`);
    }
    if (enterDur != null && exitDur != null && exitDur > enterDur - EPS) {
      warnings.push(`${name}: exits over ${secs(exitDur)}, no faster than its ${secs(enterDur)} entrance; ` +
        `make it about half (${secs(exitFor(enterDur))})`);
    }
    if ((words != null || final) && exit != null) {
      const settled = item.settled ?? (enter != null ? enter + (enterDur ?? 0) : undefined);
      if (settled != null) {
        const need = readingHold(words ?? 0, { final });
        const hold = exit - settled;
        if (hold < need - EPS) {
          const what = final ? 'the final hook needs' : `${wordCount(words ?? 0)} words need`;
          warnings.push(`${name}: holds ${secs(hold)} after it settles; ${what} ${secs(need)}`);
        }
      }
    }
  });
  return warnings;
}
