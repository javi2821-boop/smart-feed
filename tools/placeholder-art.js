// Placeholder art, drawn in code as SVG: simple paper-cutout puppets and backgrounds in the style guide's palette,
// at the exact sizes and anchor points of assets/spec.json. tools/make-placeholders.js turns these into PNGs.
// They exist so every later phase works before the real art does; real art replaces the PNGs file for file.

const EDGE = '#fbf7ee';
const INK = '#2b2a33';
const LINE = '#3a2f2c';

/** Everything inside gets an off-white paper edge around its outline, like a hand-cut sticker. */
const edged = (inner, w, h) => `
<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">
  <defs>
    <filter id="edge" x="-10%" y="-10%" width="120%" height="120%" color-interpolation-filters="sRGB">
      <feGaussianBlur in="SourceAlpha" stdDeviation="5"/>
      <feComponentTransfer><feFuncA type="linear" slope="24" intercept="-3"/></feComponentTransfer>
      <feFlood flood-color="${EDGE}"/>
      <feComposite operator="in" in2="SourceGraphic" result="x"/>
    </filter>
    <filter id="edgeFill" x="-10%" y="-10%" width="120%" height="120%" color-interpolation-filters="sRGB">
      <feGaussianBlur in="SourceAlpha" stdDeviation="5" result="b"/>
      <feComponentTransfer in="b" result="grown"><feFuncA type="linear" slope="24" intercept="-3"/></feComponentTransfer>
      <feFlood flood-color="${EDGE}" result="col"/>
      <feComposite in="col" in2="grown" operator="in" result="rim"/>
      <feMerge><feMergeNode in="rim"/><feMergeNode in="SourceGraphic"/></feMerge>
    </filter>
  </defs>
  <g filter="url(#edgeFill)">${inner}</g>
</svg>`;

/** A flat layer with a slim darker copy under it, so stacked pieces read as separate sheets of paper. */
const layer = (d, fill, extra = '') => `<path d="${d}" fill="#000" opacity="0.13" transform="translate(4 6)"/><path d="${d}" fill="${fill}" ${extra}/>`;
const circle = (cx, cy, r, fill) => `<circle cx="${cx}" cy="${cy}" r="${r}" fill="${fill}"/>`;
const ellipse = (cx, cy, rx, ry, fill, extra = '') => `<ellipse cx="${cx}" cy="${cy}" rx="${rx}" ry="${ry}" fill="${fill}" ${extra}/>`;
const rect = (x, y, w, h, fill, r = 0, extra = '') => `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${r}" fill="${fill}" ${extra}/>`;

// ---------------------------------------------------------------- characters

export const CAST = {
  philosopher: { skin: '#e3b48f', hair: '#ece7dc', hairStyle: 'balding', beard: 'full', cloth: '#efe6d2', clothStyle: 'toga', trim: '#9a7b4f' },
  pastor: { skin: '#c98f6b', hair: '#8b8680', hairStyle: 'short', cloth: '#2f3038', clothStyle: 'clergy', trim: '#fbf7ee' },
  worker: { skin: '#d9a078', hair: '#3b2f2a', hairStyle: 'short', hat: 'hardhat', cloth: '#3f6f9e', clothStyle: 'overalls', trim: '#e0a526', beard: 'stubble' },
  dad: { skin: '#e0ab85', hair: '#5a4030', hairStyle: 'short', beard: 'stubble', cloth: '#4f8a6a', clothStyle: 'polo', trim: '#f3ead8' },
  kid: { skin: '#ecc19c', hair: '#7a4a2a', hairStyle: 'tuft', cloth: '#d1603d', clothStyle: 'stripes', trim: '#f3ead8', small: true },
  king: { skin: '#dba27c', hair: '#6b4a2f', hairStyle: 'short', beard: 'short', hat: 'crown', cloth: '#a5372f', clothStyle: 'royal', trim: '#e0a526' },
  monk: { skin: '#d7a47f', hair: '#6b5440', hairStyle: 'tonsure', hat: 'hood', cloth: '#7a5a3c', clothStyle: 'habit', trim: '#d9c7a3' },
  mother: { skin: '#c68d6a', hair: '#2f2622', hairStyle: 'bun', cloth: '#b5677d', clothStyle: 'dress', trim: '#f3ead8' },
  soldier: { skin: '#cf9a74', hair: '#3a302a', hairStyle: 'short', hat: 'helmet', cloth: '#6b7446', clothStyle: 'uniform', trim: '#4d5532' },
  scientist: { skin: '#e6b995', hair: '#4a3b33', hairStyle: 'messy', glasses: true, cloth: '#f4f1ea', clothStyle: 'labcoat', trim: '#2a8c82' },
  businessman: { skin: '#b9805c', hair: '#221d1b', hairStyle: 'slick', cloth: '#34405a', clothStyle: 'suit', trim: '#d1603d' },
  farmer: { skin: '#d49b72', hair: '#8a5a33', hairStyle: 'short', hat: 'straw', beard: 'stubble', cloth: '#c0503a', clothStyle: 'overalls', trim: '#5f7fa6' },
  teacher: { skin: '#a8714f', hair: '#2a211d', hairStyle: 'bob', glasses: true, cloth: '#4a4e9a', clothStyle: 'cardigan', trim: '#f3ead8' },
  'old-man': { skin: '#e2b596', hair: '#f1eee8', hairStyle: 'balding', beard: 'short', glasses: true, cloth: '#7b6a58', clothStyle: 'vest', trim: '#e6d9bf' },
  'young-woman': { skin: '#edc3a0', hair: '#b5622f', hairStyle: 'long', cloth: '#2a8c82', clothStyle: 'blouse', trim: '#f3ead8' },
};

const shade = (hex, k) => {
  const n = parseInt(hex.slice(1), 16);
  const c = [n >> 16, (n >> 8) & 255, n & 255].map((v) => Math.max(0, Math.min(255, Math.round(v * k))));
  return `#${c.map((v) => v.toString(16).padStart(2, '0')).join('')}`;
};

/** body.png, 800x1000. The neck anchor (where the head's pivot sits) is at (400, 90). */
export function bodySvg(name) {
  const c = CAST[name];
  const s = c.small ? 0.84 : 1; // a child's shoulders are narrower
  const X = (x) => 400 + (x - 400) * s;
  const torso = `M ${X(326)} 60 L ${X(474)} 60 L ${X(474)} 150 Q ${X(640)} 168 ${X(694)} 290 L ${X(742)} 1000 L ${X(58)} 1000 L ${X(106)} 290 Q ${X(160)} 168 ${X(326)} 150 Z`;
  const cloth = `M ${X(326)} 150 Q ${X(400)} 196 ${X(474)} 150 Q ${X(640)} 168 ${X(694)} 290 L ${X(742)} 1000 L ${X(58)} 1000 L ${X(106)} 290 Q ${X(160)} 168 ${X(326)} 150 Z`;
  const dark = shade(c.cloth, 0.8);
  let o = '';
  o += `<path d="${torso}" fill="${c.skin}"/>`;
  o += `<path d="M ${X(326)} 118 Q 400 168 ${X(474)} 118 L ${X(474)} 150 L ${X(326)} 150 Z" fill="${shade(c.skin, 0.86)}"/>`; // the head's shadow on the neck
  o += layer(cloth, c.cloth);
  // arms: a fold line each side
  o += `<path d="M ${X(196)} 420 L ${X(170)} 1000" stroke="${dark}" stroke-width="7" stroke-linecap="round" fill="none"/>`;
  o += `<path d="M ${X(604)} 420 L ${X(630)} 1000" stroke="${dark}" stroke-width="7" stroke-linecap="round" fill="none"/>`;

  const vneck = (fill, depth = 330, half = 74) => layer(`M ${X(400 - half)} 152 L 400 ${depth} L ${X(400 + half)} 152 Q 400 196 ${X(400 - half)} 152 Z`, fill);
  switch (c.clothStyle) {
    case 'toga':
      o += layer(`M ${X(474)} 152 Q ${X(610)} 170 ${X(660)} 250 L ${X(250)} 1000 L ${X(58)} 1000 L ${X(98)} 420 Z`, shade(c.cloth, 0.93));
      o += `<path d="M ${X(600)} 250 L ${X(190)} 1000 M ${X(540)} 240 L ${X(120)} 880" stroke="${shade(c.cloth, 0.78)}" stroke-width="6" stroke-linecap="round" fill="none"/>`;
      o += circle(X(590), 222, 26, c.trim) + circle(X(590), 222, 11, shade(c.trim, 1.25));
      break;
    case 'clergy':
      o += layer(`M ${X(338)} 150 Q 400 190 ${X(462)} 150 L ${X(462)} 196 Q 400 232 ${X(338)} 196 Z`, shade(c.cloth, 1.25));
      o += rect(376, 168, 48, 40, c.trim, 6);
      o += `<path d="M 400 232 L 400 1000" stroke="${shade(c.cloth, 1.35)}" stroke-width="6"/>`;
      // a small wooden cross on a cord
      o += `<path d="M ${X(340)} 196 Q 400 420 ${X(460)} 196" stroke="${shade(c.cloth, 1.7)}" stroke-width="5" fill="none"/>`;
      o += layer('M 388 390 h 24 v 30 h 26 v 24 h -26 v 62 h -24 v -62 h -26 v -24 h 26 Z', '#b98a52');
      break;
    case 'overalls':
      o += vneck(shade(c.cloth, 1.18), 250, 60);
      o += layer(`M ${X(250)} 470 L ${X(550)} 470 L ${X(580)} 1000 L ${X(220)} 1000 Z`, c.trim);
      o += layer(`M ${X(262)} 170 L ${X(310)} 162 L ${X(318)} 480 L ${X(262)} 480 Z`, c.trim) + layer(`M ${X(538)} 170 L ${X(490)} 162 L ${X(482)} 480 L ${X(538)} 480 Z`, c.trim);
      o += circle(X(290), 492, 15, shade(c.trim, 0.7)) + circle(X(510), 492, 15, shade(c.trim, 0.7));
      o += layer(`M 340 600 h 120 v 96 q -60 34 -120 0 Z`, shade(c.trim, 0.86));
      break;
    case 'polo':
      o += vneck(c.skin, 290, 56);
      o += layer(`M ${X(330)} 150 L ${X(400 - 6)} 300 L ${X(296)} 252 Z`, c.trim) + layer(`M ${X(470)} 150 L ${X(400 + 6)} 300 L ${X(504)} 252 Z`, c.trim);
      o += circle(400, 350, 8, c.trim) + circle(400, 392, 8, c.trim);
      break;
    case 'stripes':
      for (let y = 260; y < 1000; y += 120) o += `<path d="M ${X(112) - (y - 260) * 0.05} ${y} L ${X(688) + (y - 260) * 0.05} ${y}" stroke="${c.trim}" stroke-width="44" opacity="0.92"/>`;
      o += layer(`M ${X(330)} 150 Q 400 214 ${X(470)} 150 Q 400 190 ${X(330)} 150 Z`, shade(c.cloth, 0.75));
      break;
    case 'royal':
      o += layer(`M ${X(326)} 150 Q 400 200 ${X(474)} 150 L ${X(560)} 162 L ${X(470)} 1000 L ${X(330)} 1000 L ${X(240)} 162 Z`, '#f6f1e6');
      for (const [x, y] of [[300, 260], [350, 420], [320, 600], [356, 780], [330, 930], [500, 260], [452, 420], [480, 600], [446, 780], [470, 930]]) o += ellipse(X(x), y, 9, 15, INK);
      o += `<path d="M ${X(300)} 200 Q 400 330 ${X(500)} 200" stroke="${c.trim}" stroke-width="16" fill="none" stroke-linecap="round"/>`;
      o += layer('M 400 290 l 34 34 l -34 34 l -34 -34 Z', c.trim);
      break;
    case 'habit':
      o += layer(`M ${X(250)} 160 Q 400 120 ${X(550)} 160 Q ${X(520)} 330 400 372 Q ${X(280)} 330 ${X(250)} 160 Z`, shade(c.cloth, 0.84));
      o += `<path d="M ${X(118)} 640 Q 400 700 ${X(682)} 640" stroke="${c.trim}" stroke-width="18" fill="none" stroke-linecap="round"/>`;
      o += `<path d="M ${X(450)} 668 L ${X(462)} 900" stroke="${c.trim}" stroke-width="14" stroke-linecap="round"/>` + circle(X(463), 912, 16, c.trim);
      break;
    case 'dress':
      o += vneck(c.skin, 270, 70);
      o += layer(`M ${X(330)} 150 Q 400 300 ${X(470)} 150 L ${X(500)} 160 Q 400 348 ${X(300)} 160 Z`, c.trim);
      o += layer(`M ${X(170)} 560 L ${X(630)} 560 L ${X(650)} 1000 L ${X(150)} 1000 Z`, shade(c.cloth, 1.2));
      o += `<path d="M ${X(120)} 556 L ${X(680)} 556" stroke="${shade(c.cloth, 0.72)}" stroke-width="16" stroke-linecap="round"/>`;
      break;
    case 'uniform':
      o += layer(`M ${X(330)} 150 L 400 260 L ${X(290)} 236 Z`, c.trim) + layer(`M ${X(470)} 150 L 400 260 L ${X(510)} 236 Z`, c.trim);
      o += `<path d="M 400 260 L 400 1000" stroke="${c.trim}" stroke-width="7"/>`;
      o += layer(`M ${X(210)} 360 h ${130 * s} v 110 h ${-130 * s} Z`, shade(c.cloth, 0.88)) + layer(`M ${X(460)} 360 h ${130 * s} v 110 h ${-130 * s} Z`, shade(c.cloth, 0.88));
      o += `<path d="M ${X(210)} 394 h ${130 * s} M ${X(460)} 394 h ${130 * s}" stroke="${c.trim}" stroke-width="6"/>`;
      o += layer(`M ${X(150)} 232 L ${X(250)} 196 L ${X(262)} 232 L ${X(160)} 270 Z`, c.trim) + layer(`M ${X(650)} 232 L ${X(550)} 196 L ${X(538)} 232 L ${X(640)} 270 Z`, c.trim);
      break;
    case 'labcoat':
      o += layer(`M ${X(350)} 152 L ${X(450)} 152 L ${X(440)} 1000 L ${X(360)} 1000 Z`, '#8fb8c9');
      o += layer(`M ${X(326)} 150 L ${X(360)} 520 L ${X(250)} 300 Z`, shade(c.cloth, 0.9)) + layer(`M ${X(474)} 150 L ${X(440)} 520 L ${X(550)} 300 Z`, shade(c.cloth, 0.9));
      o += layer(`M ${X(500)} 600 h ${120 * s} v 130 h ${-120 * s} Z`, shade(c.cloth, 0.92));
      o += rect(X(520), 566, 12, 60, c.trim, 4) + rect(X(546), 572, 12, 54, '#d1603d', 4);
      break;
    case 'suit':
      o += layer(`M ${X(348)} 152 L ${X(452)} 152 L ${X(432)} 1000 L ${X(368)} 1000 Z`, '#f4f1ea');
      o += layer('M 400 196 l 26 30 l -14 230 l -12 34 l -12 -34 l -14 -230 Z', c.trim);
      o += layer(`M ${X(326)} 150 L ${X(372)} 560 L ${X(236)} 320 L ${X(276)} 280 L ${X(250)} 250 Z`, shade(c.cloth, 0.84)) + layer(`M ${X(474)} 150 L ${X(428)} 560 L ${X(564)} 320 L ${X(524)} 280 L ${X(550)} 250 Z`, shade(c.cloth, 0.84));
      o += layer(`M ${X(500)} 430 l ${60 * s} -14 l 8 20 l ${-60 * s} 14 Z`, '#f4f1ea');
      break;
    case 'cardigan':
      o += layer(`M ${X(346)} 152 L ${X(454)} 152 L ${X(440)} 1000 L ${X(360)} 1000 Z`, c.trim);
      o += layer(`M ${X(338)} 150 L 400 250 L ${X(300)} 226 Z`, c.trim) + layer(`M ${X(462)} 150 L 400 250 L ${X(500)} 226 Z`, c.trim);
      for (const y of [420, 540, 660, 780, 900]) o += circle(X(456), y, 11, shade(c.cloth, 0.7));
      break;
    case 'vest':
      o += layer(`M ${X(340)} 152 L ${X(460)} 152 L ${X(446)} 1000 L ${X(354)} 1000 Z`, c.trim);
      o += layer(`M ${X(336)} 150 L 400 244 L ${X(300)} 224 Z`, shade(c.trim, 1.05)) + layer(`M ${X(464)} 150 L 400 244 L ${X(500)} 224 Z`, shade(c.trim, 1.05));
      o += layer('M 370 252 l 30 20 l 30 -20 l -8 44 l -22 -12 l -22 12 Z', '#a5372f');
      for (const y of [460, 600, 740]) o += circle(X(444), y, 10, shade(c.cloth, 0.7));
      break;
    case 'blouse':
    default:
      o += vneck(c.skin, 300, 76);
      o += layer(`M ${X(324)} 150 Q ${X(356)} 250 400 300 Q ${X(360)} 300 ${X(296)} 196 Z`, c.trim) + layer(`M ${X(476)} 150 Q ${X(444)} 250 400 300 Q ${X(440)} 300 ${X(504)} 196 Z`, c.trim);
      o += `<path d="M ${X(350)} 250 Q 400 300 ${X(450)} 250" stroke="#e0a526" stroke-width="6" fill="none"/>` + circle(400, 282, 12, '#e0a526');
  }
  return edged(o, 800, 1000);
}

/** head.png, 600x600. Its pivot (base of the head) is at (300, 540) and the mouth's centre at (300, 410). No mouth is drawn. */
export function headSvg(name) {
  const c = CAST[name];
  const k = c.small ? 0.94 : 1;
  const hair = c.hair;
  const hd = shade(hair, 0.82);
  const face = { cx: 300, cy: 318, rx: 168 * k, ry: 204 * k };
  let back = '';
  let o = '';
  let front = '';

  // behind the face
  if (c.hat === 'hood') back += layer('M 300 60 C 96 60 60 250 86 430 C 100 520 180 566 300 566 C 420 566 500 520 514 430 C 540 250 504 60 300 60 Z', shade(c.cloth, 0.9));
  if (c.hairStyle === 'long') back += layer('M 300 86 C 130 86 96 250 104 380 C 108 470 110 540 150 566 L 450 566 C 490 540 492 470 496 380 C 504 250 470 86 300 86 Z', hair);
  if (c.hairStyle === 'bob') back += layer('M 300 96 C 120 96 96 260 110 400 C 116 452 140 480 176 486 L 424 486 C 460 480 484 452 490 400 C 504 260 480 96 300 96 Z', hair);
  if (c.hairStyle === 'bun') back += layer('M 300 22 a 62 58 0 1 0 0.1 0 Z', hair) + `<path d="M 262 60 Q 300 40 338 60" stroke="${hd}" stroke-width="6" fill="none" stroke-linecap="round"/>`;

  // ears, face
  o += ellipse(face.cx - face.rx + 4, 330, 26, 36, shade(c.skin, 0.93)) + ellipse(face.cx + face.rx - 4, 330, 26, 36, shade(c.skin, 0.93));
  o += `<ellipse cx="${face.cx}" cy="${face.cy}" rx="${face.rx}" ry="${face.ry}" fill="#000" opacity="0.13" transform="translate(4 6)"/>`;
  o += ellipse(face.cx, face.cy, face.rx, face.ry, c.skin);
  // cheeks, nose, eyes, brows (the mouth area around y 410 stays clear)
  o += ellipse(204, 372, 30, 20, '#d1603d', 'opacity="0.2"') + ellipse(396, 372, 30, 20, '#d1603d', 'opacity="0.2"');
  o += `<path d="M 300 306 Q 282 352 290 362 Q 300 370 312 362" stroke="${shade(c.skin, 0.72)}" stroke-width="7" fill="none" stroke-linecap="round" stroke-linejoin="round"/>`;
  o += ellipse(236, 298, 15, 18, LINE) + ellipse(364, 298, 15, 18, LINE) + circle(241, 291, 5, '#fff') + circle(369, 291, 5, '#fff');
  const brow = c.hairStyle === 'balding' || name === 'old-man' ? shade(hair, 0.78) : shade(hair, 0.7);
  o += `<path d="M 204 262 Q 236 244 266 258 M 334 258 Q 364 244 396 262" stroke="${brow}" stroke-width="11" fill="none" stroke-linecap="round"/>`;

  // beards sit on the face; the mouth sprite is drawn over them
  if (c.beard === 'full') {
    o += layer('M 138 330 C 132 470 190 560 300 572 C 410 560 468 470 462 330 C 440 372 404 380 370 372 C 340 364 320 372 300 380 C 280 372 260 364 230 372 C 196 380 160 372 138 330 Z', hair);
    o += `<path d="M 232 492 Q 240 530 258 546 M 300 500 L 300 556 M 368 492 Q 360 530 342 546" stroke="${hd}" stroke-width="6" fill="none" stroke-linecap="round"/>`;
  } else if (c.beard === 'short') {
    o += layer('M 142 350 C 146 452 200 520 300 528 C 400 520 454 452 458 350 C 436 384 400 386 370 378 C 340 370 320 376 300 382 C 280 376 260 370 230 378 C 200 386 164 384 142 350 Z', hair);
  } else if (c.beard === 'stubble') {
    o += `<path d="M 150 372 C 160 462 214 512 300 518 C 386 512 440 462 450 372 C 430 440 386 470 300 474 C 214 470 170 440 150 372 Z" fill="${shade(c.skin, 0.8)}" opacity="0.75"/>`;
  }

  // hair on top
  switch (c.hairStyle) {
    case 'short':
      front += layer('M 132 290 C 116 150 196 96 300 96 C 404 96 484 150 468 290 C 452 222 420 190 380 182 C 320 170 240 178 196 200 C 160 218 142 250 132 290 Z', hair);
      break;
    case 'slick':
      front += layer('M 132 286 C 110 140 200 88 310 92 C 420 96 486 150 468 290 C 454 220 430 190 392 176 C 330 190 240 196 180 176 C 152 206 140 244 132 286 Z', hair);
      front += `<path d="M 196 150 Q 300 120 410 156" stroke="${shade(hair, 1.9)}" stroke-width="6" fill="none" stroke-linecap="round" opacity="0.6"/>`;
      break;
    case 'messy':
      front += layer('M 126 300 C 96 200 130 120 180 112 C 190 76 250 64 286 92 C 320 60 390 70 404 108 C 460 108 500 190 474 300 C 460 236 430 204 396 196 C 380 214 350 196 330 204 C 300 184 270 212 240 196 C 200 206 150 232 126 300 Z', hair);
      break;
    case 'tuft':
      front += layer('M 136 288 C 120 170 190 110 262 108 C 250 80 280 56 300 86 C 316 50 356 66 344 104 C 420 112 480 176 464 288 C 450 226 420 196 376 190 C 320 208 240 206 200 190 C 164 204 146 240 136 288 Z', hair);
      break;
    case 'balding':
      front += layer('M 120 372 C 96 320 104 250 142 226 C 138 280 150 330 160 380 Z', hair) + layer('M 480 372 C 504 320 496 250 458 226 C 462 280 450 330 440 380 Z', hair);
      break;
    case 'tonsure':
      front += layer('M 130 300 C 122 220 150 170 196 150 C 170 196 164 240 160 300 Z', hair) + layer('M 470 300 C 478 220 450 170 404 150 C 430 196 436 240 440 300 Z', hair);
      break;
    case 'bun':
    case 'bob':
      front += layer('M 130 300 C 114 160 196 100 300 100 C 404 100 486 160 470 300 C 452 240 420 200 300 176 C 180 200 148 240 130 300 Z', hair);
      break;
    case 'long':
      front += layer('M 126 330 C 104 170 190 92 300 92 C 410 92 496 170 474 330 C 460 250 420 196 330 172 C 300 220 200 232 150 250 C 138 276 130 300 126 330 Z', hair);
      break;
  }

  // hats and glasses
  if (c.hat === 'crown') {
    front += layer('M 150 196 L 136 52 L 214 124 L 300 34 L 386 124 L 464 52 L 450 196 Z', c.trim);
    front += rect(146, 176, 308, 40, shade(c.trim, 0.82), 8);
    front += circle(300, 126, 17, '#a5372f') + circle(212, 150, 12, '#2a8c82') + circle(388, 150, 12, '#2a8c82');
  } else if (c.hat === 'hardhat') {
    front += layer('M 130 214 C 130 100 220 56 300 56 C 380 56 470 100 470 214 Z', c.trim);
    front += layer('M 96 206 h 408 q 16 0 16 18 q 0 18 -16 18 h -408 q -16 0 -16 -18 q 0 -18 16 -18 Z', shade(c.trim, 0.86));
    front += rect(282, 56, 36, 150, shade(c.trim, 1.12), 10);
  } else if (c.hat === 'helmet') {
    front += layer('M 110 262 C 96 120 200 60 300 60 C 400 60 504 120 490 262 C 430 232 170 232 110 262 Z', c.cloth);
    front += `<path d="M 122 214 Q 300 176 478 214" stroke="${c.trim}" stroke-width="12" fill="none" stroke-linecap="round"/>`;
  } else if (c.hat === 'straw') {
    front += layer('M 176 196 C 176 96 240 60 300 60 C 360 60 424 96 424 196 Z', '#e3c176');
    front += layer('M 40 214 C 40 176 180 166 300 166 C 420 166 560 176 560 214 C 560 252 420 250 300 250 C 180 250 40 252 40 214 Z', '#d9b464');
    front += `<path d="M 180 170 Q 300 150 420 170" stroke="#a5372f" stroke-width="20" fill="none"/>`;
  } else if (c.hat === 'hood') {
    front += layer('M 300 60 C 150 60 96 190 104 330 C 130 210 200 150 300 146 C 400 150 470 210 496 330 C 504 190 450 60 300 60 Z', c.cloth);
  }
  if (c.glasses) {
    front += `<g fill="none" stroke="${INK}" stroke-width="9"><circle cx="236" cy="300" r="42"/><circle cx="364" cy="300" r="42"/><path d="M 278 296 Q 300 284 322 296 M 194 296 L 146 284 M 406 296 L 454 284" stroke-linecap="round"/></g>`;
  }
  return edged(back + o + front, 600, 600);
}

/** mouth-closed.png and mouth-open.png, 200x120, centred on (100, 60). No paper edge: a mouth is glued onto the face. */
export function mouthSvg(open) {
  const inner = open
    ? `<ellipse cx="100" cy="62" rx="46" ry="34" fill="#5a1f24"/>
       <path d="M 62 46 Q 100 30 138 46 L 134 58 Q 100 48 66 58 Z" fill="#fbf7ee"/>
       <ellipse cx="100" cy="82" rx="28" ry="13" fill="#d9727a"/>
       <ellipse cx="100" cy="62" rx="46" ry="34" fill="none" stroke="${LINE}" stroke-width="7"/>`
    : `<path d="M 50 54 Q 100 86 150 54" fill="none" stroke="${LINE}" stroke-width="10" stroke-linecap="round"/>`;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="200" height="120" viewBox="0 0 200 120">${inner}</svg>`;
}

// ---------------------------------------------------------------- backgrounds (1080x1920, opaque)

const bg = (inner) => `<svg xmlns="http://www.w3.org/2000/svg" width="1080" height="1920" viewBox="0 0 1080 1920">${inner}</svg>`;
/** A sheet of paper in a backdrop: its own flat shadow, no white edge (edges are for the puppets, so they stand out). */
const sheet = (d, fill, dy = 10) => `<path d="${d}" fill="#000" opacity="0.14" transform="translate(6 ${dy})"/><path d="${d}" fill="${fill}"/>`;

export const BACKGROUNDS = {
  study() {
    let o = rect(0, 0, 1080, 1920, '#d8c4a2');
    // wallpaper stripes
    for (let x = 60; x < 1080; x += 120) o += rect(x, 0, 14, 1920, '#cfb98f');
    // bookshelf
    o += sheet('M 60 380 h 620 v 760 h -620 Z', '#7d5a3c');
    const spines = ['#a5372f', '#2a8c82', '#e0a526', '#4a4e9a', '#d1603d', '#6b7446', '#f3ead8', '#34405a'];
    for (let row = 0; row < 3; row++) {
      const y = 410 + row * 244;
      o += rect(84, y, 572, 208, '#5e422b');
      let x = 96, i = row * 3;
      while (x < 620) {
        const w = 34 + ((i * 17) % 28), h = 150 + ((i * 29) % 48);
        o += rect(x, y + 208 - h, w, h, spines[i % spines.length], 4);
        x += w + 8;
        i++;
      }
    }
    // window with a paper sun
    o += sheet('M 760 420 h 260 v 420 h -260 Z', '#f3ead8');
    o += rect(782, 442, 216, 376, '#bfe0ea') + circle(930, 520, 44, '#e0a526') + rect(884, 442, 12, 376, '#f3ead8') + rect(782, 622, 216, 12, '#f3ead8');
    // framed picture, lamp
    o += sheet('M 770 920 h 220 v 170 h -220 Z', '#9a7b4f') + rect(790, 940, 180, 130, '#e6d9bf') + `<path d="M 800 1060 l 50 -70 l 40 46 l 30 -30 l 40 54 Z" fill="#6b7446"/>`;
    // floor and rug
    o += sheet('M 0 1500 h 1080 v 420 h -1080 Z', '#8a6248', -8);
    for (let x = 0; x < 1080; x += 180) o += rect(x, 1500, 6, 420, '#775239');
    o += `<ellipse cx="540" cy="1790" rx="470" ry="96" fill="#a5372f"/><ellipse cx="540" cy="1790" rx="400" ry="70" fill="none" stroke="#e0a526" stroke-width="10"/>`;
    return bg(o);
  },
  church() {
    let o = rect(0, 0, 1080, 1920, '#cdd0de');
    for (let y = 0; y < 1500; y += 150) o += rect(0, y, 1080, 6, '#bfc3d3');
    // arched stained-glass window
    o += sheet('M 340 1040 V 420 C 340 250 430 170 540 170 C 650 170 740 250 740 420 V 1040 Z', '#f3ead8');
    const panes = ['#4a4e9a', '#a5372f', '#e0a526', '#2a8c82', '#d1603d', '#6f86c9'];
    let i = 0;
    for (let y = 250; y < 1010; y += 130) for (let x = 372; x < 700; x += 114) {
      o += `<path d="M ${x} ${y} h 100 v 116 h -100 Z" fill="${panes[i++ % panes.length]}" clip-path="url(#arch)"/>`;
    }
    o = `<defs><clipPath id="arch"><path d="M 366 1014 V 424 C 366 268 446 196 540 196 C 634 196 714 268 714 424 V 1014 Z"/></clipPath></defs>` + o;
    o += `<path d="M 540 196 V 1014 M 366 600 H 714" stroke="#f3ead8" stroke-width="16"/>`;
    // columns
    for (const x of [90, 890]) {
      o += sheet(`M ${x} 300 h 100 v 1220 h -100 Z`, '#e8e4da') + rect(x - 20, 270, 140, 44, '#d9d4c6', 8) + rect(x - 20, 1490, 140, 44, '#d9d4c6', 8);
      o += rect(x + 30, 320, 8, 1170, '#d2cdbf') + rect(x + 62, 320, 8, 1170, '#d2cdbf');
    }
    // floor, pews
    o += sheet('M 0 1500 h 1080 v 420 h -1080 Z', '#8d7a6a', -8);
    o += sheet('M 0 1640 h 400 v 280 h -400 Z', '#6b4a33') + sheet('M 680 1640 h 400 v 280 h -400 Z', '#6b4a33');
    o += rect(0, 1640, 400, 26, '#7d5a3c') + rect(680, 1640, 400, 26, '#7d5a3c');
    o += rect(440, 1500, 200, 420, '#a5372f');
    return bg(o);
  },
  workshop() {
    let o = rect(0, 0, 1080, 1920, '#c9b896');
    for (let y = 220; y < 1300; y += 60) for (let x = 60; x < 1080; x += 60) o += circle(x, y, 5, '#b3a07c');
    // shelf with jars
    o += sheet('M 60 330 h 960 v 34 h -960 Z', '#7d5a3c');
    const jars = ['#2a8c82', '#e0a526', '#d1603d', '#4a4e9a', '#6b7446', '#a5372f'];
    jars.forEach((c, i) => { const x = 110 + i * 150; o += sheet(`M ${x} 220 h 84 v 110 h -84 Z`, c, 6) + rect(x - 6, 204, 96, 22, '#f3ead8', 6); });
    // tools on the pegboard: saw, hammer, wrench, square
    o += sheet('M 110 520 h 300 l 40 150 h -340 Z', '#d9dde3') + sheet('M 80 500 h 90 v 200 h -90 Z', '#7d5a3c');
    o += sheet('M 560 500 h 46 v 300 h -46 Z', '#9a7b4f') + sheet('M 510 470 h 170 v 76 h -170 Z', '#5d6068');
    o += sheet('M 800 480 a 56 56 0 1 0 60 0 v 60 h -60 Z M 812 560 h 36 v 250 h -36 Z', '#8c9098');
    o += sheet('M 120 880 h 44 v 300 h 220 v 44 h -264 Z', '#e0a526');
    o += sheet('M 600 900 h 330 v 40 h -330 Z', '#a5372f') + sheet('M 600 990 h 240 v 40 h -240 Z', '#34405a');
    // bench
    o += sheet('M 0 1470 h 1080 v 90 h -1080 Z', '#8a6248', -8) + rect(0, 1560, 1080, 360, '#6b4a33');
    o += rect(80, 1560, 60, 360, '#5a3d2a') + rect(940, 1560, 60, 360, '#5a3d2a');
    o += sheet('M 300 1620 h 480 v 300 h -480 Z', '#7d5a3c') + circle(540, 1760, 20, '#e0a526');
    return bg(o);
  },
  'city-street'() {
    let o = rect(0, 0, 1080, 1920, '#bcdde8');
    o += circle(860, 300, 90, '#f6e3a1');
    o += sheet('M 120 330 q 60 -60 130 -20 q 70 -40 120 20 q 40 0 40 34 h -330 q -10 -30 40 -34 Z', '#f3ead8', 6);
    // far buildings
    o += sheet('M 0 760 h 190 v -210 h 150 v 120 h 170 v -260 h 180 v 200 h 160 v -120 h 230 v 1100 h -1080 Z', '#8fa7bd');
    // near buildings with windows
    const b = [[0, 900, 300, '#d1603d'], [300, 760, 260, '#e6d9bf'], [560, 980, 240, '#4a4e9a'], [800, 820, 280, '#c9a66b']];
    for (const [x, y, w, c] of b) {
      o += sheet(`M ${x} ${y} h ${w} v ${1560 - y} h ${-w} Z`, c);
      for (let wy = y + 50; wy < 1400; wy += 120) for (let wx = x + 34; wx < x + w - 60; wx += 86) o += rect(wx, wy, 50, 70, (wx + wy) % 3 === 0 ? '#f6e3a1' : '#34405a', 6);
    }
    // shop awning
    o += sheet('M 300 1320 h 260 l 20 80 h -300 Z', '#a5372f');
    for (let x = 300; x < 560; x += 52) o += `<path d="M ${x} 1320 h 26 l 2 80 h -30 Z" fill="#f3ead8"/>`;
    // pavement, road, lamp
    o += sheet('M 0 1540 h 1080 v 120 h -1080 Z', '#cfc8ba', -8) + rect(0, 1660, 1080, 260, '#5d6068');
    for (let x = 40; x < 1080; x += 220) o += rect(x, 1780, 120, 16, '#f3ead8', 6);
    o += sheet('M 960 900 h 22 v 660 h -22 Z', '#2b2a33') + sheet('M 900 880 h 110 v 30 h -110 Z', '#2b2a33') + circle(915, 930, 26, '#f6e3a1');
    return bg(o);
  },
  'open-field'() {
    let o = rect(0, 0, 1080, 1920, '#cfe8ee');
    o += circle(820, 360, 110, '#f6e3a1') + circle(820, 360, 150, '#f6e3a1" opacity="0.35');
    o += sheet('M 110 420 q 70 -70 150 -24 q 80 -46 136 24 q 46 0 46 40 h -380 q -12 -36 48 -40 Z', '#f8f4ea', 6);
    o += sheet('M 600 620 q 50 -50 110 -18 q 60 -34 100 18 q 34 0 34 30 h -280 q -8 -26 36 -30 Z', '#f8f4ea', 6);
    // hills, back to front
    o += sheet('M 0 1060 C 200 900 420 900 620 1010 C 800 920 960 940 1080 1010 V 1920 H 0 Z', '#a9c38a', -8);
    o += sheet('M 0 1230 C 260 1090 520 1120 760 1220 C 900 1160 1000 1170 1080 1200 V 1920 H 0 Z', '#8fb072', -8);
    // a tree on the far hill, a fence
    o += sheet('M 196 1130 h 26 v -150 h -26 Z', '#7d5a3c', 6) + sheet('M 209 780 a 96 110 0 1 0 0.1 0 Z', '#5f8a55', 6);
    for (let x = 560; x < 1080; x += 104) o += sheet(`M ${x} 1150 h 22 v 130 h -22 Z`, '#e6d9bf', 6);
    o += rect(540, 1180, 540, 16, '#e6d9bf') + rect(540, 1230, 540, 16, '#e6d9bf');
    o += sheet('M 0 1470 C 300 1380 700 1400 1080 1480 V 1920 H 0 Z', '#6f9458', -8);
    // grass tufts and flowers
    for (let i = 0; i < 16; i++) {
      const x = 50 + i * 66 + ((i * 37) % 30), y = 1560 + ((i * 53) % 260);
      o += `<path d="M ${x} ${y} l 10 -40 l 8 40 l 12 -30 l 4 30 Z" fill="#5a7d47"/>`;
      if (i % 3 === 0) o += circle(x + 34, y - 20, 11, i % 2 ? '#e0a526' : '#f3ead8') + circle(x + 34, y - 20, 4, '#d1603d');
    }
    return bg(o);
  },
};
