// Writes docs/CAST-PROMPTS.md: one exact image prompt for every part of every character, and one per background,
// built from the template in docs/STYLE-GUIDE.md so the wording never drifts.  node tools/make-cast-prompts.js
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const spec = JSON.parse(fs.readFileSync(path.join(ROOT, 'assets/spec.json'), 'utf8'));

const PAPER = 'Made of simple flat pieces of coloured paper layered on top of each other, like a children\'s cut-paper collage. Flat solid colours only, no gradients, no ink outlines, no texture, no 3D shading. A thin even off-white paper border around the whole outline, like a sticker cut out with scissors. Slightly uneven hand-cut edges.';

// who, what they wear, face and hair, colours
const CAST = {
  philosopher: { who: 'an ancient Greek philosopher, an old man', wear: 'A loose off-white toga draped diagonally across the chest from one shoulder, with two long fold lines and a round bronze clasp at the shoulder.', face: 'Bald on top with tufts of white hair at the sides above the ears, and a full, rounded white beard covering the jaw and chin. Light tan skin (#e3b48f).', bodyColours: 'off-white (#efe6d2), bronze brown (#9a7b4f), light tan skin (#e3b48f)', headColours: 'light tan skin (#e3b48f), white hair and beard (#ece7dc)' },
  pastor: { who: 'a kind middle-aged pastor', wear: 'A plain dark charcoal clergy shirt with a white clerical collar tab at the throat, and a small wooden cross hanging on a thin cord.', face: 'Short neat grey hair. Clean-shaven. Medium brown skin (#c98f6b).', bodyColours: 'dark charcoal (#2f3038), off-white collar (#fbf7ee), wood brown cross (#b98a52), medium brown skin (#c98f6b)', headColours: 'medium brown skin (#c98f6b), grey hair (#8b8680)' },
  worker: { who: 'a construction worker', wear: 'A blue work shirt under mustard-yellow bib overalls with two straps, two round buttons and a chest pocket.', face: 'A mustard-yellow hard hat with a short brim and a raised ridge down the middle, short dark brown hair showing under it, and a light stubble shadow on the jaw. Tan skin (#d9a078).', bodyColours: 'work blue (#3f6f9e), mustard yellow (#e0a526), tan skin (#d9a078)', headColours: 'tan skin (#d9a078), mustard yellow hard hat (#e0a526), dark brown hair (#3b2f2a)' },
  dad: { who: 'a friendly dad in his late thirties', wear: 'A green polo shirt with a cream collar, open at the neck, with two small buttons.', face: 'Short tidy brown hair and a light stubble shadow on the jaw. Light tan skin (#e0ab85).', bodyColours: 'soft green (#4f8a6a), cream (#f3ead8), light tan skin (#e0ab85)', headColours: 'light tan skin (#e0ab85), brown hair (#5a4030)' },
  kid: { who: 'a cheerful child of about eight', wear: 'A terracotta T-shirt with wide cream horizontal stripes. Narrow shoulders, a child\'s build.', face: 'Short messy brown hair with a little tuft sticking up on top. A round young face, no facial hair. Fair skin (#ecc19c).', bodyColours: 'terracotta (#d1603d), cream (#f3ead8), fair skin (#ecc19c)', headColours: 'fair skin (#ecc19c), brown hair (#7a4a2a)' },
  king: { who: 'a medieval king', wear: 'A brick-red royal robe open at the front over a white ermine panel with small black spots, and a gold chain with a diamond-shaped gold pendant.', face: 'A gold crown with five points and three small jewels (one red, two teal), short brown hair, and a short trimmed brown beard. Tan skin (#dba27c).', bodyColours: 'brick red (#a5372f), off-white ermine (#f6f1e6) with ink spots, gold (#e0a526), tan skin (#dba27c)', headColours: 'tan skin (#dba27c), gold crown (#e0a526), brown hair and beard (#6b4a2f)' },
  monk: { who: 'a gentle medieval monk', wear: 'A plain brown wool habit with a wide cowl collar lying on the shoulders, and a pale rope belt tied at the waist with one end hanging down.', face: 'A brown hood up around the head, framing the face. A little brown hair at the temples. Clean-shaven. Tan skin (#d7a47f).', bodyColours: 'habit brown (#7a5a3c), pale rope (#d9c7a3), tan skin (#d7a47f)', headColours: 'tan skin (#d7a47f), habit brown hood (#7a5a3c)' },
  mother: { who: 'a warm mother in her thirties', wear: 'A dusty rose dress with a cream scoop neckline and a slightly lighter rose skirt below a waistband.', face: 'Dark hair pulled up into a round bun on top of the head, with a smooth hairline. No facial hair. Medium brown skin (#c68d6a).', bodyColours: 'dusty rose (#b5677d), lighter rose (#d97f96), cream (#f3ead8), medium brown skin (#c68d6a)', headColours: 'medium brown skin (#c68d6a), dark hair (#2f2622)' },
  soldier: { who: 'a soldier', wear: 'An olive green field uniform with a pointed collar, two buttoned chest pockets, shoulder straps and a centre seam.', face: 'A rounded olive green helmet with a darker band, short dark hair just showing under it. Clean-shaven. Tan skin (#cf9a74).', bodyColours: 'olive green (#6b7446), dark olive (#4d5532), tan skin (#cf9a74)', headColours: 'tan skin (#cf9a74), olive green helmet (#6b7446)' },
  scientist: { who: 'a curious scientist', wear: 'A white lab coat with wide lapels over a pale blue shirt, and a chest pocket holding a teal pen and a terracotta pen.', face: 'Slightly messy dark brown hair, and round thin dark glasses. Clean-shaven. Fair skin (#e6b995).', bodyColours: 'lab coat off-white (#f4f1ea), pale blue (#8fb8c9), teal (#2a8c82), fair skin (#e6b995)', headColours: 'fair skin (#e6b995), dark brown hair (#4a3b33), ink glasses (#2b2a33)' },
  businessman: { who: 'a confident businessman in his forties', wear: 'A slate blue suit jacket with notched lapels over a white shirt, a terracotta tie, and a white pocket square.', face: 'Short black hair combed neatly back. Clean-shaven. Deep brown skin (#b9805c).', bodyColours: 'slate blue (#34405a), off-white shirt (#f4f1ea), terracotta tie (#d1603d), deep brown skin (#b9805c)', headColours: 'deep brown skin (#b9805c), black hair (#221d1b)' },
  farmer: { who: 'a weathered farmer', wear: 'A brick red work shirt under faded blue denim bib overalls with two straps, two round buttons and a chest pocket.', face: 'A wide-brimmed straw hat with a red band, short reddish-brown hair under it, and a light stubble shadow on the jaw. Sun-tanned skin (#d49b72).', bodyColours: 'brick red (#c0503a), denim blue (#5f7fa6), sun-tanned skin (#d49b72)', headColours: 'sun-tanned skin (#d49b72), straw (#e3c176), red hat band (#a5372f)' },
  teacher: { who: 'a thoughtful teacher, a woman in her forties', wear: 'An indigo cardigan with a row of round buttons, open over a cream blouse with a small pointed collar.', face: 'Dark hair in a chin-length bob with a centre parting, and round thin dark glasses. No facial hair. Brown skin (#a8714f).', bodyColours: 'indigo (#4a4e9a), cream (#f3ead8), brown skin (#a8714f)', headColours: 'brown skin (#a8714f), dark hair (#2a211d), ink glasses (#2b2a33)' },
  'old-man': { who: 'a gentle old man, a grandfather', wear: 'A brown tweed jacket over a cream waistcoat with three buttons, a cream shirt collar and a small red bow tie.', face: 'Bald on top with tufts of white hair at the sides above the ears, a short white beard, and round thin dark glasses. Fair skin (#e2b596).', bodyColours: 'tweed brown (#7b6a58), cream (#e6d9bf), brick red bow tie (#a5372f), fair skin (#e2b596)', headColours: 'fair skin (#e2b596), white hair and beard (#f1eee8), ink glasses (#2b2a33)' },
  'young-woman': { who: 'a young woman in her twenties', wear: 'A teal blouse with a soft cream V-neck collar and a small gold pendant on a thin chain.', face: 'Long straight copper-red hair falling past the jaw on both sides, with a side-swept fringe. No facial hair. Fair skin (#edc3a0).', bodyColours: 'teal (#2a8c82), cream (#f3ead8), gold (#e0a526), fair skin (#edc3a0)', headColours: 'fair skin (#edc3a0), copper-red hair (#b5622f)' },
};

const BACKGROUNDS = {
  study: { place: 'a cosy study', what: 'A wall with soft vertical stripes, a wooden bookshelf with three rows of coloured book spines on the left, a window with a paper sun on the right, a small framed landscape picture under the window, a wooden floor and an oval red rug with a gold ring.', colours: 'warm tan wall (#d8c4a2), wood brown (#7d5a3c), book spines in brick red, teal, mustard, indigo and terracotta, pale sky blue window (#bfe0ea)' },
  church: { place: 'the inside of a small church', what: 'A pale blue-grey wall, one tall arched stained-glass window in the centre made of simple coloured squares, a plain fluted stone column on each side, a stone floor with a red carpet runner down the middle and the tops of dark wooden pews at the bottom left and right.', colours: 'pale blue-grey wall (#cdd0de), stone off-white (#e8e4da), stained glass in indigo, brick red, mustard, teal and terracotta, dark wood (#6b4a33)' },
  workshop: { place: 'a craftsman\'s workshop', what: 'A pegboard wall with rows of small dots, a wooden shelf near the top holding six coloured jars with cream lids, a hand saw, a hammer, a wrench and a carpenter\'s square hanging on the wall, and a wooden workbench with a drawer across the bottom.', colours: 'pegboard tan (#c9b896), wood brown (#7d5a3c, #8a6248), tool grey (#8c9098), jars in teal, mustard, terracotta, indigo, olive and brick red' },
  'city-street': { place: 'a quiet city street in daylight', what: 'A pale blue sky with a soft yellow sun and one paper cloud, a row of distant blue-grey buildings, four nearer buildings in different colours with simple square windows, a shop with a red and cream striped awning, a pale pavement, a grey road with a dashed white centre line, and one black street lamp on the right.', colours: 'sky blue (#bcdde8), distant blue-grey (#8fa7bd), buildings in terracotta, cream, indigo and kraft, pavement (#cfc8ba), road grey (#5d6068)' },
  'open-field': { place: 'an open field under a big sky', what: 'A pale blue sky with a soft yellow sun and two paper clouds, three layers of rolling green hills, one round tree on the far hill, a short cream wooden fence on the right, and small grass tufts and a few tiny flowers in the foreground.', colours: 'sky blue (#cfe8ee), sun yellow (#f6e3a1), three greens from light to deep (#a9c38a, #8fb072, #6f9458), cream fence (#e6d9bf)' },
};

const body = (c) => `Flat paper cutout illustration of the upper body of ${c.who}, shown from the waist up, facing straight forward, standing still, arms down at the sides. ${c.wear} No head and no face: the picture starts at the neck. ${PAPER} No shadow under or around it. Warm muted colours: ${c.bodyColours}. Centred, neck at the top centre, torso running off the bottom edge. Transparent background. 800 x 1000 pixels, portrait.`;
const head = (c) => `Flat paper cutout illustration of the head of ${c.who}, facing straight forward. ${c.face} Friendly calm expression. Important: the head has NO MOUTH. Leave the mouth area as plain skin (or plain beard); the mouth is added separately. Two simple dark oval eyes with a small white dot, short eyebrows, a simple curved line for the nose, soft blush circles on the cheeks. ${PAPER} No neck, no shoulders, no shadow. Warm muted colours: ${c.headColours}. Head centred, filling most of the square. Transparent background. 600 x 600 pixels, square.`;
const CLOSED = 'Flat paper cutout of a closed mouth only: a single soft smile line in dark brown (#3a2f2c), a gentle upward curve, rounded ends. Nothing else in the picture: no face, no skin, no border, no shadow. Flat colour, no gradient. Centred. Transparent background. 200 x 120 pixels.';
const OPEN = 'Flat paper cutout of an open talking mouth only: a dark red-brown oval (#5a1f24) with a thin dark brown outline, a row of off-white upper teeth along the top, and a pink tongue (#d9727a) at the bottom. Nothing else in the picture: no face, no skin, no border, no shadow. Flat colours, no gradients. Centred. Transparent background. 200 x 120 pixels.';
const backdrop = (b) => `Flat paper cutout illustration of ${b.place}, as a quiet backdrop for a puppet show. ${b.what} Made of simple flat pieces of coloured paper layered on top of each other, like a children's cut-paper collage, each layer with a thin flat shadow at its lower right. Flat solid colours only, no gradients, no ink outlines, no texture, no people, no text or letters. Pale, warm, muted colours, low contrast: ${b.colours}. A floor or ground line about three quarters of the way down. The middle and lower part of the picture left fairly plain, because a character will stand in front of it. Vertical, 1080 x 1920 pixels, filling the whole picture edge to edge.`;

const out = [
  '# Cast prompts',
  '',
  'One exact prompt per picture, ready to paste into an image generator (ElevenLabs image generation, or whatever Muse uses). This file is written by `tools/make-cast-prompts.js` from the template in [STYLE-GUIDE.md](STYLE-GUIDE.md); change the wording there, not here.',
  '',
  `There are ${spec.characters.length} characters with four pictures each, and ${spec.backgrounds.length} backgrounds: ${spec.characters.length * 4 + spec.backgrounds.length} pictures in all.`,
  '',
  '## How to use this',
  '',
  '1. Generate each picture from its prompt. Make the head first; if it comes out in a slightly different style, generate again until it matches the others.',
  '2. Make sure the background is truly transparent (not white, not a checkerboard pattern) for the character parts. Remove it with a background remover if needed.',
  '3. Resize or crop to the exact size named at the end of the prompt.',
  '4. Save it under the exact path shown above the prompt, replacing the placeholder file that is there now.',
  '5. Delete the `PLACEHOLDER` file in that character\'s folder (for a background, delete `<name>.PLACEHOLDER`).',
  '6. Run `node tools/validate-cast.js`, then `node tools/cast-sheet.js` and look at `out/cast-sheet.png`. If a head sits wrong on its neck or a mouth is off-centre, add a `meta.json` as the style guide explains.',
  '',
  'The two mouth prompts are the same for every character. You can generate one good pair and copy it into every folder: mouths are deliberately identical.',
  '',
  '## Shared mouths',
  '',
  '**Closed** (`mouth-closed.png`, 200 x 120)',
  '',
  `> ${CLOSED}`,
  '',
  '**Open** (`mouth-open.png`, 200 x 120)',
  '',
  `> ${OPEN}`,
  '',
  '## Characters',
  '',
];
for (const name of spec.characters) {
  const c = CAST[name];
  if (!c) throw new Error(`no prompt details for "${name}": add it to tools/make-cast-prompts.js`);
  out.push(`### ${name}`, '', `**\`assets/cast/${name}/body.png\`** (800 x 1000)`, '', `> ${body(c)}`, '', `**\`assets/cast/${name}/head.png\`** (600 x 600)`, '', `> ${head(c)}`, '',
    `**\`assets/cast/${name}/mouth-closed.png\`** (200 x 120)`, '', `> ${CLOSED}`, '', `**\`assets/cast/${name}/mouth-open.png\`** (200 x 120)`, '', `> ${OPEN}`, '');
}
out.push('## Backgrounds', '');
for (const name of spec.backgrounds) {
  const b = BACKGROUNDS[name];
  if (!b) throw new Error(`no prompt details for background "${name}"`);
  out.push(`### ${name}`, '', `**\`assets/backgrounds/${name}.png\`** (1080 x 1920, solid, no transparency)`, '', `> ${backdrop(b)}`, '');
}
fs.writeFileSync(path.join(ROOT, 'docs/CAST-PROMPTS.md'), out.join('\n'));
console.log(`docs/CAST-PROMPTS.md: ${spec.characters.length * 4 + spec.backgrounds.length} prompts`);
