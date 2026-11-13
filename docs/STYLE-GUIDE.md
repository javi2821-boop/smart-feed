# Style guide: paper cutout puppets

Every clip looks the same: a paper puppet in front of a paper backdrop, like a hand-made cutout animation. Flat colours, an off-white paper edge around each piece, a slight drop shadow, slightly imperfect hand-cut shapes. Any character or background made later follows this page so it matches the rest.

The numbers on this page (sizes, anchor points, names) are read by the code from [`assets/spec.json`](../assets/spec.json). If this page and that file ever disagree, the file is right.

## The look in one paragraph

Cut paper, not drawings. Every shape is a flat piece of coloured paper with no gradients, no outlines drawn in ink, no textures, no 3D shading. Pieces are stacked like layers of card: hair sits on the head, a collar sits on the shirt. Each puppet part has an even off-white border all the way round, as if it was cut out of white card with scissors a few millimetres outside the colour. Shapes are simple and a little uneven, as a person with scissors would cut them: gentle curves, no tiny details, nothing thinner than a matchstick.

## Palette

Use these colours, or colours that sit comfortably beside them: warm, slightly muted, never neon, never pure black or pure white.

| Name | Hex | Used for |
|---|---|---|
| Paper | `#f3ead8` | The base cream; washes, light clothing |
| Paper edge | `#fbf7ee` | The cut border around every puppet part; cards |
| Deep paper | `#e6d9bf` | Light details, frames |
| Kraft | `#c9a66b` | Wood, straw, cardboard tones |
| Ink | `#2b2a33` | Eyes, glasses, the darkest clothing (instead of black) |
| Shadow | `#1d1b26` | Only for shadows, used see-through |
| Mustard | `#e0a526` | Accent; the **Lesson** colour |
| Teal | `#2a8c82` | Accent; the **Question** colour |
| Terracotta | `#d1603d` | Accent; the **Story** colour |
| Indigo | `#4a4e9a` | Accent; the **Scripture** colour |
| Brick red | `#a5372f` | Royal robes, book spines, small accents |
| Olive | `#6b7446` | Uniforms, plants |
| Slate blue | `#34405a` | Suits, night tones |
| Wood brown | `#7d5a3c` | Furniture, belts, floors |

Skin tones (pick one per character, flat, no shading): `#edc3a0`, `#e3b48f`, `#d9a078`, `#c98f6b`, `#b9805c`, `#a8714f`. Cheeks are a soft terracotta blush. Hair: white `#ece7dc`, grey `#8b8680`, red-brown `#b5622f`, brown `#5a4030`, dark `#2f2622`.

The four type colours are reserved for labels and cards. A character may wear them, but a backdrop should not be dominated by one of them.

## Edge and shadow

- **Paper edge:** every body and head has an off-white (`#fbf7ee`) border about **9 px** wide following its whole outline. Mouths have no border (a mouth is glued onto the face).
- **Layer shadows inside a part:** where one piece of paper sits on another (hair on a head, an apron on a shirt), a thin darker sliver shows at its lower right, about 4 px right and 6 px down, at roughly 13% black. Flat, not blurred.
- **Drop shadow:** do **not** draw a shadow around or under the puppet. The clip template adds the same soft shadow to every part itself (offset 10 px right, 16 px down, 20 px blur, 30% of the shadow colour), so all characters match.
- **Backdrops:** flat layered paper shapes with the same thin layer shadows. No white paper edge on backdrop shapes (the edge is what makes the puppet stand out from the backdrop).

## Proportions

A puppet is shown from the waist up, facing the viewer, centred, with a big head: the head is about as wide as two-thirds of the shoulders.

- **Head:** an egg-shaped face about 340 px wide and 410 px tall inside the 600 x 600 canvas, centred left to right. Ears small. Eyes are two dark ovals with a white dot, about a third of the way down the face, 130 px apart. A simple curved nose line. Eyebrows are short strokes in the hair colour. **No mouth is drawn on the head.** The area where the mouth goes stays plain skin (or beard).
- **Body:** neck at the top centre, rounded shoulders about 590 px wide, the torso widening slightly to the bottom edge of the canvas. Arms hang at the sides and are only hinted at by a fold line each. The body runs off the bottom of the canvas (no hands, no waistline needed).
- **A child** has shoulders about 15% narrower and a slightly smaller face.
- One or two things say who the character is: a crown, a hard hat, a clerical collar, glasses. Keep it to that.

## Poses

One pose only: standing straight, facing forward, arms down, calm friendly expression. The animation supplies the life (the puppet rises into frame, the head bobs, the mouth opens with the voice), so the art must be symmetrical-ish and neutral. No raised arms, no three-quarter views, no props held in hands.

## Parts, sizes and anchor points

Each character is a folder `assets/cast/<name>/` holding exactly four transparent PNGs. `<name>` is lowercase letters, numbers and dashes (`old-man`).

| File | Size (px) | What is in it |
|---|---|---|
| `body.png` | 800 x 1000 | Neck, shoulders and torso, running off the bottom edge. No head. |
| `head.png` | 600 x 600 | Head, hair, hat, beard, glasses. **No mouth.** |
| `mouth-closed.png` | 200 x 120 | The closed mouth only: a soft smile line. |
| `mouth-open.png` | 200 x 120 | The open mouth only: a dark oval, upper teeth, tongue. |

All four: 8-bit RGBA PNG, transparent background (not white), not interlaced. The picture must stay at least 16 px inside the canvas on the top and sides so the paper edge isn't cut off.

Anchor points say how the parts fit together. Measured in pixels from the top-left corner of each picture:

| Anchor | On | Point (x, y) | Meaning |
|---|---|---|---|
| `neck` | `body.png` | (400, 90) | Where the base of the head sits: the middle of the neck, a little below its top |
| `headPivot` | `head.png` | (300, 540) | The base of the head (bottom of the chin or beard). The head bobs around this point, and it is placed on the body's `neck` point |
| `mouth` | `head.png` | (300, 410) | The centre of the mouth. Both mouth pictures are centred on this point |

In the mouth pictures the mouth is centred in the 200 x 120 canvas, at (100, 60).

**If a piece of art doesn't land on these points** (an image generator won't hit them exactly), don't redraw it. Put a small file named `meta.json` in the character's folder with the points measured on that art, any or all of the three:

```json
{ "neck": [396, 104], "headPivot": [300, 552], "mouth": [304, 398] }
```

## Backgrounds

One file each: `assets/backgrounds/<name>.png`, **1080 x 1920**, solid (no transparency), in the same cut-paper look.

- The puppet covers the middle and bottom of the frame and a title card covers the top third for the first seconds, so nothing in the backdrop needs to be read. It sets a place and a mood, quietly.
- Keep the backdrop lower in contrast and slightly paler than the puppets. The template lays a light cream wash over it as well.
- A "floor line" (floor, bench top, pavement, ground) at about 1500 px from the top helps the puppet look like it is standing in the room.
- A tall phone crops about 110 px off each side, so keep anything that matters out of the outer 150 px.

## How the template uses the art (for reference)

The frame is 1080 x 1920 at 30 frames a second. The puppet is drawn at 95% size, centred, with the body running 100 px past the bottom of the frame, so the head sits a little above the middle. The head group (head plus mouth) turns a degree or two around `headPivot`. On each frame the mouth is the open picture when the voice is loud and the closed picture when it is quiet; the open mouth is also squashed or stretched a little with the loudness. Text only ever appears on paper cards in the top third, inside a 150 px side margin.

## Image prompt template

Use this for any new part. Replace the words in capitals. Keep everything else word for word, so every character comes out in the same style.

**Body**

> Flat paper cutout illustration of the upper body of a CHARACTER, shown from the waist up, facing straight forward, standing still, arms down at the sides. WHAT THEY WEAR. No head and no face: the picture starts at the neck. Made of simple flat pieces of coloured paper layered on top of each other, like a children's cut-paper collage. Flat solid colours only, no gradients, no ink outlines, no texture, no 3D shading. A thin even off-white paper border around the whole outline, like a sticker cut out with scissors. Slightly uneven hand-cut edges. No shadow under or around it. Warm muted colours: MAIN COLOURS. Centred, neck at the top centre, torso running off the bottom edge. Transparent background. 800 x 1000 pixels, portrait.

**Head**

> Flat paper cutout illustration of the head of a CHARACTER, facing straight forward. FACE AND HAIR DETAILS. Friendly calm expression. Important: the head has NO MOUTH. Leave the mouth area as plain skin (or plain beard); the mouth is added separately. Two simple dark oval eyes with a small white dot, short eyebrows, a simple curved line for the nose, soft blush circles on the cheeks. Made of simple flat pieces of coloured paper layered on top of each other, like a children's cut-paper collage. Flat solid colours only, no gradients, no ink outlines, no texture, no 3D shading. A thin even off-white paper border around the whole outline, like a sticker cut out with scissors. Slightly uneven hand-cut edges. No neck, no shoulders, no shadow. Warm muted colours: MAIN COLOURS. Head centred, filling most of the square. Transparent background. 600 x 600 pixels, square.

**Mouth, closed**

> Flat paper cutout of a closed mouth only: a single soft smile line in dark brown (#3a2f2c), a gentle upward curve, rounded ends. Nothing else in the picture: no face, no skin, no border, no shadow. Flat colour, no gradient. Centred. Transparent background. 200 x 120 pixels.

**Mouth, open**

> Flat paper cutout of an open talking mouth only: a dark red-brown oval (#5a1f24) with a thin dark brown outline, a row of off-white upper teeth along the top, and a pink tongue (#d9727a) at the bottom. Nothing else in the picture: no face, no skin, no border, no shadow. Flat colours, no gradients. Centred. Transparent background. 200 x 120 pixels.

**Background**

> Flat paper cutout illustration of PLACE, as a quiet backdrop for a puppet show. WHAT IS IN IT. Made of simple flat pieces of coloured paper layered on top of each other, like a children's cut-paper collage, each layer with a thin flat shadow at its lower right. Flat solid colours only, no gradients, no ink outlines, no texture, no people, no text or letters. Pale, warm, muted colours, low contrast: MAIN COLOURS. A floor or ground line about three quarters of the way down. The middle and lower part of the picture left fairly plain, because a character will stand in front of it. Vertical, 1080 x 1920 pixels, filling the whole picture edge to edge.

## After generating

1. Resize or crop to the exact size in the table above. Remove the background so it is truly transparent (generators often give white or a fake checkerboard).
2. Put the four files in `assets/cast/<name>/`, or the backdrop in `assets/backgrounds/`. Delete the `PLACEHOLDER` marker file in that folder (for a backdrop, delete `<name>.PLACEHOLDER`).
3. Run `node tools/validate-cast.js`. It lists anything wrong in plain words.
4. Run `node tools/cast-sheet.js` and open `out/cast-sheet.png`. If the head sits too high or low on the neck, or the mouth is off, add a `meta.json` with corrected points and run it again.

A new character that isn't in the list yet: add its folder, then add its name to `"characters"` in `assets/spec.json`. Scripts can use it straight away.
