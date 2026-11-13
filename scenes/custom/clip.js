// The one clip template: 1080x1920, a paper-cutout puppet in front of a paper backdrop.
//
//   0.0 s   the backdrop settles in, the puppet rises from the bottom, the title card drops in from the top
//   voice   the head bobs gently and the mouth opens and closes with the loudness of the voice, frame by frame
//   ~4 s    the title card leaves; a small label in the type's colour stays
//   end     Question clips: the mouth closes and the question is held on screen in silence
//
// Everything is a pure function of time t (no timers), as the engine requires. Sizes and anchor points of the
// puppet's parts come from assets/spec.json (docs/STYLE-GUIDE.md), passed in by factory/lib/compose.js.
import { el, px, loadImage, fitText, spring, springOptions, clamp, cubicOut, cubicInOut, tween } from 'render-machine';

const RISE = springOptions({ overshoot: 0.06, settle: 0.7 });
const DROP = springOptions({ overshoot: 0.08, settle: 0.55 });
const SAFE = 150; // px kept clear at the left and right: a tall (20:9) phone crops about 108 px off each side of a 9:16 video when it fills the screen
const K = 0.95; // puppet scale on the frame
const SHADOW = { color: 'rgba(29, 27, 38, 0.30)', blur: 20, dx: 10, dy: 16 };

export const LABELS = { lesson: 'Lesson', question: 'Question', story: 'Story', scripture: 'Scripture' };

/** A part drawn once onto a canvas with its drop shadow baked in, so moving it later costs nothing. */
function cutout(img, parent, { shadow = true } = {}) {
  const pad = shadow ? 48 : 0;
  const c = el('canvas', { style: { position: 'absolute', left: px(-pad), top: px(-pad) } }, parent);
  c.width = img.naturalWidth + pad * 2;
  c.height = img.naturalHeight + pad * 2;
  const g = c.getContext('2d');
  if (shadow) {
    g.shadowColor = SHADOW.color;
    g.shadowBlur = SHADOW.blur;
    g.shadowOffsetX = SHADOW.dx;
    g.shadowOffsetY = SHADOW.dy;
  }
  g.drawImage(img, pad, pad);
  return c;
}

/** A paper card: off-white sheet, slim hard shadow, a strip of the type's colour down its left side. */
function card(parent, { left, top, width, accent, colors }) {
  const wrap = el('div', { style: { position: 'absolute', left: px(left), top: px(top), width: px(width), transformOrigin: '50% 50%' } }, parent);
  el('div', { style: { position: 'absolute', inset: '0', background: colors.shadow, opacity: '0.26', borderRadius: px(26), transform: 'translate(12px, 18px)' } }, wrap);
  const sheet = el('div', { style: { position: 'relative', background: colors.edge, borderRadius: px(26), padding: `${px(44)} ${px(48)} ${px(48)} ${px(72)}`, overflow: 'hidden' } }, wrap);
  el('div', { style: { position: 'absolute', left: '0', top: '0', bottom: '0', width: px(24), background: accent } }, sheet);
  return { wrap, sheet };
}

export default {
  name: 'clip',
  description: 'The smart feed clip: a narrated paper puppet with a title card, and a held question for Question clips.',
  defaults: { type: 'lesson', title: '', source: '', levels: [], voiceStart: 0.6, titleHold: 4.2, question: '', questionAt: 0 },
  schema: {
    required: ['type', 'title', 'character', 'background'],
    properties: {
      type: { type: 'string', enum: ['lesson', 'question', 'story', 'scripture'] },
      title: { type: 'string' },
      source: { type: 'string' },
      background: { type: 'string', description: 'path to a 1080x1920 PNG' },
      character: {
        type: 'object',
        required: ['body', 'head', 'mouthClosed', 'mouthOpen', 'anchors'],
        properties: { body: { type: 'string' }, head: { type: 'string' }, mouthClosed: { type: 'string' }, mouthOpen: { type: 'string' }, anchors: { type: 'object' } },
      },
      levels: { type: 'array', items: { type: 'number' }, description: 'voice loudness per video frame from voiceStart, 0-100' },
      voiceStart: { type: 'number' },
      titleHold: { type: 'number' },
      question: { type: 'string', description: 'Question clips: the question held on screen at the end' },
      questionAt: { type: 'number', description: 'seconds: when the question card arrives (after the voice ends)' },
    },
  },

  async setup(ctx) {
    const { width: W, height: H, theme, props, root, fps } = ctx;
    const C = theme.colors;
    const accent = C[props.type] || C.accent;
    root.style.background = C.paper;

    const [bgImg, bodyImg, headImg, closedImg, openImg] = await Promise.all(
      [props.background, props.character.body, props.character.head, props.character.mouthClosed, props.character.mouthOpen].map((p) => loadImage(ctx.asset(p)))
    );
    const A = props.character.anchors;

    // ── backdrop ────────────────────────────────────────────────────────────
    const bg = el('div', { style: { position: 'absolute', left: '0', top: '0', width: px(W), height: px(H), transformOrigin: '50% 60%' } }, root);
    bgImg.style.cssText = `position:absolute;left:0;top:0;width:${W}px;height:${H}px`;
    bg.appendChild(bgImg);
    // a light wash so the puppet and the card always read against a busy backdrop
    el('div', { style: { position: 'absolute', inset: '0', background: C.paper, opacity: '0.16' } }, root);

    // ── puppet: body, then a head group (head + mouth) that turns around the base of the head ────────────
    const bodyLeft = (W - bodyImg.naturalWidth * K) / 2;
    const bodyTop = H + 100 - bodyImg.naturalHeight * K;
    const puppet = el('div', { style: { position: 'absolute', left: px(bodyLeft), top: px(bodyTop), width: '0', height: '0', transformOrigin: '0 0' } }, root);
    const scaled = el('div', { style: { position: 'absolute', left: '0', top: '0', transform: `scale(${K})`, transformOrigin: '0 0' } }, puppet);
    const body = el('div', { style: { position: 'absolute', left: '0', top: '0', transformOrigin: `${px(A.neck[0])} ${px(bodyImg.naturalHeight)}` } }, scaled);
    cutout(bodyImg, body);
    const head = el('div', {
      style: { position: 'absolute', left: px(A.neck[0] - A.headPivot[0]), top: px(A.neck[1] - A.headPivot[1]), width: px(headImg.naturalWidth), height: px(headImg.naturalHeight), transformOrigin: `${px(A.headPivot[0])} ${px(A.headPivot[1])}` },
    }, scaled);
    cutout(headImg, head);
    const mouthAt = (img) => ({ position: 'absolute', left: px(A.mouth[0] - img.naturalWidth / 2), top: px(A.mouth[1] - img.naturalHeight / 2), transformOrigin: '50% 50%' });
    const closed = el('div', { style: mouthAt(closedImg) }, head);
    cutout(closedImg, closed, { shadow: false });
    const open = el('div', { style: mouthAt(openImg) }, head);
    cutout(openImg, open, { shadow: false });

    // ── the mouth: open while the voice is loud, with a little hysteresis so it never flickers ────────────
    const L = props.levels;
    const isOpen = new Array(L.length).fill(false);
    let state = false;
    for (let i = 0; i < L.length; i++) {
      if (!state && L[i] > 20) state = true;
      else if (state && L[i] < 11) state = false;
      isOpen[i] = state;
    }
    // how much the puppet is "talking" around each frame (0-1), for the nod: a half-second average of the loudness
    const talk = L.map((_, i) => {
      let s = 0, n = 0;
      for (let j = Math.max(0, i - 7); j <= Math.min(L.length - 1, i + 7); j++) { s += L[j]; n++; }
      return clamp(s / n / 45);
    });

    // ── title card (top) and the small label that stays ───────────────────────────────────────
    const title = card(root, { left: SAFE, top: 150, width: W - SAFE * 2, accent, colors: C });
    const chipStyle = { display: 'inline-block', background: accent, color: C.edge, font: `700 ${px(34)} "DM Sans"`, letterSpacing: px(5), textTransform: 'uppercase', padding: `${px(10)} ${px(22)}`, borderRadius: px(10) };
    el('div', { text: LABELS[props.type], style: chipStyle }, title.sheet);
    const titleText = el('div', { text: props.title, style: { font: `600 ${px(84)} "Fraunces"`, lineHeight: '1.08', color: C.ink, marginTop: px(26), width: px(W - SAFE * 2 - 120), overflowWrap: 'break-word' } }, title.sheet);
    fitText(titleText, { maxWidth: W - SAFE * 2 - 120, maxHeight: 205, min: 44, max: 92 });
    if (props.source) el('div', { text: props.source, style: { font: `500 ${px(34)} "DM Sans"`, lineHeight: '1.25', color: C.muted, marginTop: px(24) } }, title.sheet);

    const label = el('div', { style: { position: 'absolute', left: px(SAFE), top: px(170), transformOrigin: '0 50%' } }, root);
    el('div', { style: { position: 'absolute', inset: '0', background: C.shadow, opacity: '0.26', borderRadius: px(10), transform: 'translate(6px, 9px)' } }, label);
    el('div', { text: LABELS[props.type], style: { ...chipStyle, position: 'relative', border: `${px(5)} solid ${C.edge}` } }, label);

    // ── Question clips: the question, held at the end ─────────────────────────────────────────
    let ask = null;
    if (props.question) {
      ask = card(root, { left: SAFE, top: 250, width: W - SAFE * 2, accent, colors: C });
      el('div', { text: '?', style: { position: 'absolute', right: px(36), top: px(-34), font: `600 ${px(300)} "Fraunces"`, color: accent, opacity: '0.13', lineHeight: '1' } }, ask.sheet);
      el('div', { text: LABELS.question, style: chipStyle }, ask.sheet);
      const q = el('div', { text: props.question, style: { position: 'relative', font: `600 ${px(76)} "Fraunces"`, lineHeight: '1.14', color: C.ink, marginTop: px(30), width: px(W - SAFE * 2 - 120), overflowWrap: 'break-word' } }, ask.sheet);
      fitText(q, { maxWidth: W - SAFE * 2 - 120, maxHeight: 440, min: 40, max: 84 });
    }

    const T_OUT = props.titleHold;
    return (t) => {
      // backdrop: settles from a little too close, then holds still (a still backdrop is not repainted every frame)
      const settle = cubicOut(clamp(t / 1.1));
      bg.style.transform = settle >= 1 ? 'scale(1.04)' : `translate(0px, ${px((1 - settle) * 70)}) scale(${(1.14 - 0.1 * settle).toFixed(5)})`;

      // puppet: rises from below the frame and settles
      const rise = spring(t - 0.2, RISE);
      const frame = Math.round((t - props.voiceStart) * fps);
      const lv = frame >= 0 && frame < L.length ? L[frame] : 0;
      const talking = frame >= 0 && frame < L.length ? talk[frame] : 0;
      const asking = ask ? cubicInOut(clamp((t - props.questionAt + 0.1) / 0.55)) : 0;
      // Question clips: the puppet ducks down to leave the question the top half of the screen
      puppet.style.transform = `translate(0px, ${px((1 - rise) * 1500 + asking * 370)})`;

      // breathing, a slow sway, and a small nod while speaking
      body.style.transform = `rotate(${(0.5 * Math.sin(t * 0.9)).toFixed(3)}deg) scale(1, ${(1 + 0.006 * Math.sin(t * 1.7)).toFixed(4)})`;
      const bob = 1.7 * Math.sin(t * 1.55) + talking * 1.5 * Math.sin(t * 6.1) + asking * 4;
      head.style.transform = `translate(0px, ${px(-talking * 5 * Math.abs(Math.sin(t * 6.1)) + 2 * Math.sin(t * 1.7))}) rotate(${bob.toFixed(3)}deg)`;

      const o = frame >= 0 && frame < L.length && isOpen[frame];
      open.style.display = o ? 'block' : 'none';
      closed.style.display = o ? 'none' : 'block';
      if (o) open.style.transform = `scale(${(0.86 + 0.14 * clamp(lv / 60)).toFixed(3)}, ${(0.5 + 0.6 * clamp(lv / 70)).toFixed(3)})`;

      // title card: drops in, holds, lifts away; the small label takes its place
      const inP = spring(t - 0.35, DROP);
      const outP = cubicInOut(clamp((t - T_OUT) / 0.5));
      title.wrap.style.transform = `translate(0px, ${px((1 - inP) * -900 - outP * 900)}) rotate(${(-1.6 + (1 - inP) * -5).toFixed(3)}deg)`;
      title.wrap.style.display = t < T_OUT + 0.55 ? 'block' : 'none';
      const lp = spring(t - T_OUT - 0.25, DROP);
      label.style.display = t > T_OUT + 0.25 ? 'block' : 'none';
      label.style.transform = `translate(${px((1 - lp) * -400)}, 0px) rotate(-2deg)`;
      label.style.opacity = String(1 - tween(t, props.questionAt || 1e9, 0.3, 0, 1));

      if (ask) {
        const ap = spring(t - props.questionAt, DROP);
        ask.wrap.style.display = t >= props.questionAt ? 'block' : 'none';
        ask.wrap.style.transform = `translate(0px, ${px((1 - ap) * -1100)}) rotate(${(1.4 + (1 - ap) * 5).toFixed(3)}deg)`;
      }
    };
  },
};
