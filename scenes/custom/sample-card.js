// The engine's own sample: a paper card that drops in and settles. It proves the copied engine renders in GitHub
// Actions (Chromium, fonts, the encoder) without needing any voice or art.
import { el, px, spring, springOptions, clamp, cubicOut } from 'render-machine';

const POP = springOptions({ overshoot: 0.1, settle: 0.5 });

export default {
  name: 'sample-card',
  description: 'A paper card with two lines of text, used by the engine sample.',
  defaults: { title: 'smart-feed', line: 'The engine renders.' },
  schema: { properties: { title: { type: 'string' }, line: { type: 'string' } } },

  setup(ctx) {
    const { width: W, height: H, theme, props, root } = ctx;
    const c = theme.colors;
    root.style.background = c.paper;
    const shadow = el('div', { style: { position: 'absolute', left: px(W * 0.14), top: px(H * 0.36), width: px(W * 0.72), height: px(H * 0.24), background: c.shadow, opacity: '0.18', borderRadius: px(28) } }, root);
    const card = el('div', {
      style: {
        position: 'absolute', left: px(W * 0.14), top: px(H * 0.36), width: px(W * 0.72), height: px(H * 0.24), background: c.edge,
        borderRadius: px(28), display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: px(24),
      },
    }, root);
    el('div', { text: props.title, style: { font: `600 ${px(96)} "Fraunces"`, color: c.ink } }, card);
    el('div', { text: props.line, style: { font: `500 ${px(44)} "DM Sans"`, color: c.muted } }, card);
    const bar = el('div', { style: { position: 'absolute', left: '0', bottom: '0', height: px(18), width: '100%', background: c.accent, transformOrigin: '0 50%' } }, card);
    card.style.overflow = 'hidden';

    return (t) => {
      const p = spring(clamp(t - 0.15, 0, 10), POP);
      const y = (1 - p) * -H * 0.5;
      card.style.transform = `translate(0px, ${px(y)}) rotate(${((1 - p) * -6).toFixed(3)}deg)`;
      shadow.style.transform = `translate(${px(14)}, ${px(y + 18)}) rotate(${((1 - p) * -6).toFixed(3)}deg)`;
      bar.style.transform = `scaleX(${cubicOut(clamp((t - 0.8) / 2.4)).toFixed(4)})`;
    };
  },
};
