# Cast prompts

One exact prompt per picture, ready to paste into an image generator (ElevenLabs image generation, or whatever Muse uses). This file is written by `tools/make-cast-prompts.js` from the template in [STYLE-GUIDE.md](STYLE-GUIDE.md); change the wording there, not here.

There are 15 characters with four pictures each, and 5 backgrounds: 65 pictures in all.

## How to use this

1. Generate each picture from its prompt. Make the head first; if it comes out in a slightly different style, generate again until it matches the others.
2. Make sure the background is truly transparent (not white, not a checkerboard pattern) for the character parts. Remove it with a background remover if needed.
3. Resize or crop to the exact size named at the end of the prompt.
4. Save it under the exact path shown above the prompt, replacing the placeholder file that is there now.
5. Delete the `PLACEHOLDER` file in that character's folder (for a background, delete `<name>.PLACEHOLDER`).
6. Run `node tools/validate-cast.js`, then `node tools/cast-sheet.js` and look at `out/cast-sheet.png`. If a head sits wrong on its neck or a mouth is off-centre, add a `meta.json` as the style guide explains.

The two mouth prompts are the same for every character. You can generate one good pair and copy it into every folder: mouths are deliberately identical.

## Shared mouths

**Closed** (`mouth-closed.png`, 200 x 120)

> Flat paper cutout of a closed mouth only: a single soft smile line in dark brown (#3a2f2c), a gentle upward curve, rounded ends. Nothing else in the picture: no face, no skin, no border, no shadow. Flat colour, no gradient. Centred. Transparent background. 200 x 120 pixels.

**Open** (`mouth-open.png`, 200 x 120)

> Flat paper cutout of an open talking mouth only: a dark red-brown oval (#5a1f24) with a thin dark brown outline, a row of off-white upper teeth along the top, and a pink tongue (#d9727a) at the bottom. Nothing else in the picture: no face, no skin, no border, no shadow. Flat colours, no gradients. Centred. Transparent background. 200 x 120 pixels.

## Characters

### philosopher

**`assets/cast/philosopher/body.png`** (800 x 1000)

> Flat paper cutout illustration of the upper body of an ancient Greek philosopher, an old man, shown from the waist up, facing straight forward, standing still, arms down at the sides. A loose off-white toga draped diagonally across the chest from one shoulder, with two long fold lines and a round bronze clasp at the shoulder. No head and no face: the picture starts at the neck. Made of simple flat pieces of coloured paper layered on top of each other, like a children's cut-paper collage. Flat solid colours only, no gradients, no ink outlines, no texture, no 3D shading. A thin even off-white paper border around the whole outline, like a sticker cut out with scissors. Slightly uneven hand-cut edges. No shadow under or around it. Warm muted colours: off-white (#efe6d2), bronze brown (#9a7b4f), light tan skin (#e3b48f). Centred, neck at the top centre, torso running off the bottom edge. Transparent background. 800 x 1000 pixels, portrait.

**`assets/cast/philosopher/head.png`** (600 x 600)

> Flat paper cutout illustration of the head of an ancient Greek philosopher, an old man, facing straight forward. Bald on top with tufts of white hair at the sides above the ears, and a full, rounded white beard covering the jaw and chin. Light tan skin (#e3b48f). Friendly calm expression. Important: the head has NO MOUTH. Leave the mouth area as plain skin (or plain beard); the mouth is added separately. Two simple dark oval eyes with a small white dot, short eyebrows, a simple curved line for the nose, soft blush circles on the cheeks. Made of simple flat pieces of coloured paper layered on top of each other, like a children's cut-paper collage. Flat solid colours only, no gradients, no ink outlines, no texture, no 3D shading. A thin even off-white paper border around the whole outline, like a sticker cut out with scissors. Slightly uneven hand-cut edges. No neck, no shoulders, no shadow. Warm muted colours: light tan skin (#e3b48f), white hair and beard (#ece7dc). Head centred, filling most of the square. Transparent background. 600 x 600 pixels, square.

**`assets/cast/philosopher/mouth-closed.png`** (200 x 120)

> Flat paper cutout of a closed mouth only: a single soft smile line in dark brown (#3a2f2c), a gentle upward curve, rounded ends. Nothing else in the picture: no face, no skin, no border, no shadow. Flat colour, no gradient. Centred. Transparent background. 200 x 120 pixels.

**`assets/cast/philosopher/mouth-open.png`** (200 x 120)

> Flat paper cutout of an open talking mouth only: a dark red-brown oval (#5a1f24) with a thin dark brown outline, a row of off-white upper teeth along the top, and a pink tongue (#d9727a) at the bottom. Nothing else in the picture: no face, no skin, no border, no shadow. Flat colours, no gradients. Centred. Transparent background. 200 x 120 pixels.

### pastor

**`assets/cast/pastor/body.png`** (800 x 1000)

> Flat paper cutout illustration of the upper body of a kind middle-aged pastor, shown from the waist up, facing straight forward, standing still, arms down at the sides. A plain dark charcoal clergy shirt with a white clerical collar tab at the throat, and a small wooden cross hanging on a thin cord. No head and no face: the picture starts at the neck. Made of simple flat pieces of coloured paper layered on top of each other, like a children's cut-paper collage. Flat solid colours only, no gradients, no ink outlines, no texture, no 3D shading. A thin even off-white paper border around the whole outline, like a sticker cut out with scissors. Slightly uneven hand-cut edges. No shadow under or around it. Warm muted colours: dark charcoal (#2f3038), off-white collar (#fbf7ee), wood brown cross (#b98a52), medium brown skin (#c98f6b). Centred, neck at the top centre, torso running off the bottom edge. Transparent background. 800 x 1000 pixels, portrait.

**`assets/cast/pastor/head.png`** (600 x 600)

> Flat paper cutout illustration of the head of a kind middle-aged pastor, facing straight forward. Short neat grey hair. Clean-shaven. Medium brown skin (#c98f6b). Friendly calm expression. Important: the head has NO MOUTH. Leave the mouth area as plain skin (or plain beard); the mouth is added separately. Two simple dark oval eyes with a small white dot, short eyebrows, a simple curved line for the nose, soft blush circles on the cheeks. Made of simple flat pieces of coloured paper layered on top of each other, like a children's cut-paper collage. Flat solid colours only, no gradients, no ink outlines, no texture, no 3D shading. A thin even off-white paper border around the whole outline, like a sticker cut out with scissors. Slightly uneven hand-cut edges. No neck, no shoulders, no shadow. Warm muted colours: medium brown skin (#c98f6b), grey hair (#8b8680). Head centred, filling most of the square. Transparent background. 600 x 600 pixels, square.

**`assets/cast/pastor/mouth-closed.png`** (200 x 120)

> Flat paper cutout of a closed mouth only: a single soft smile line in dark brown (#3a2f2c), a gentle upward curve, rounded ends. Nothing else in the picture: no face, no skin, no border, no shadow. Flat colour, no gradient. Centred. Transparent background. 200 x 120 pixels.

**`assets/cast/pastor/mouth-open.png`** (200 x 120)

> Flat paper cutout of an open talking mouth only: a dark red-brown oval (#5a1f24) with a thin dark brown outline, a row of off-white upper teeth along the top, and a pink tongue (#d9727a) at the bottom. Nothing else in the picture: no face, no skin, no border, no shadow. Flat colours, no gradients. Centred. Transparent background. 200 x 120 pixels.

### worker

**`assets/cast/worker/body.png`** (800 x 1000)

> Flat paper cutout illustration of the upper body of a construction worker, shown from the waist up, facing straight forward, standing still, arms down at the sides. A blue work shirt under mustard-yellow bib overalls with two straps, two round buttons and a chest pocket. No head and no face: the picture starts at the neck. Made of simple flat pieces of coloured paper layered on top of each other, like a children's cut-paper collage. Flat solid colours only, no gradients, no ink outlines, no texture, no 3D shading. A thin even off-white paper border around the whole outline, like a sticker cut out with scissors. Slightly uneven hand-cut edges. No shadow under or around it. Warm muted colours: work blue (#3f6f9e), mustard yellow (#e0a526), tan skin (#d9a078). Centred, neck at the top centre, torso running off the bottom edge. Transparent background. 800 x 1000 pixels, portrait.

**`assets/cast/worker/head.png`** (600 x 600)

> Flat paper cutout illustration of the head of a construction worker, facing straight forward. A mustard-yellow hard hat with a short brim and a raised ridge down the middle, short dark brown hair showing under it, and a light stubble shadow on the jaw. Tan skin (#d9a078). Friendly calm expression. Important: the head has NO MOUTH. Leave the mouth area as plain skin (or plain beard); the mouth is added separately. Two simple dark oval eyes with a small white dot, short eyebrows, a simple curved line for the nose, soft blush circles on the cheeks. Made of simple flat pieces of coloured paper layered on top of each other, like a children's cut-paper collage. Flat solid colours only, no gradients, no ink outlines, no texture, no 3D shading. A thin even off-white paper border around the whole outline, like a sticker cut out with scissors. Slightly uneven hand-cut edges. No neck, no shoulders, no shadow. Warm muted colours: tan skin (#d9a078), mustard yellow hard hat (#e0a526), dark brown hair (#3b2f2a). Head centred, filling most of the square. Transparent background. 600 x 600 pixels, square.

**`assets/cast/worker/mouth-closed.png`** (200 x 120)

> Flat paper cutout of a closed mouth only: a single soft smile line in dark brown (#3a2f2c), a gentle upward curve, rounded ends. Nothing else in the picture: no face, no skin, no border, no shadow. Flat colour, no gradient. Centred. Transparent background. 200 x 120 pixels.

**`assets/cast/worker/mouth-open.png`** (200 x 120)

> Flat paper cutout of an open talking mouth only: a dark red-brown oval (#5a1f24) with a thin dark brown outline, a row of off-white upper teeth along the top, and a pink tongue (#d9727a) at the bottom. Nothing else in the picture: no face, no skin, no border, no shadow. Flat colours, no gradients. Centred. Transparent background. 200 x 120 pixels.

### dad

**`assets/cast/dad/body.png`** (800 x 1000)

> Flat paper cutout illustration of the upper body of a friendly dad in his late thirties, shown from the waist up, facing straight forward, standing still, arms down at the sides. A green polo shirt with a cream collar, open at the neck, with two small buttons. No head and no face: the picture starts at the neck. Made of simple flat pieces of coloured paper layered on top of each other, like a children's cut-paper collage. Flat solid colours only, no gradients, no ink outlines, no texture, no 3D shading. A thin even off-white paper border around the whole outline, like a sticker cut out with scissors. Slightly uneven hand-cut edges. No shadow under or around it. Warm muted colours: soft green (#4f8a6a), cream (#f3ead8), light tan skin (#e0ab85). Centred, neck at the top centre, torso running off the bottom edge. Transparent background. 800 x 1000 pixels, portrait.

**`assets/cast/dad/head.png`** (600 x 600)

> Flat paper cutout illustration of the head of a friendly dad in his late thirties, facing straight forward. Short tidy brown hair and a light stubble shadow on the jaw. Light tan skin (#e0ab85). Friendly calm expression. Important: the head has NO MOUTH. Leave the mouth area as plain skin (or plain beard); the mouth is added separately. Two simple dark oval eyes with a small white dot, short eyebrows, a simple curved line for the nose, soft blush circles on the cheeks. Made of simple flat pieces of coloured paper layered on top of each other, like a children's cut-paper collage. Flat solid colours only, no gradients, no ink outlines, no texture, no 3D shading. A thin even off-white paper border around the whole outline, like a sticker cut out with scissors. Slightly uneven hand-cut edges. No neck, no shoulders, no shadow. Warm muted colours: light tan skin (#e0ab85), brown hair (#5a4030). Head centred, filling most of the square. Transparent background. 600 x 600 pixels, square.

**`assets/cast/dad/mouth-closed.png`** (200 x 120)

> Flat paper cutout of a closed mouth only: a single soft smile line in dark brown (#3a2f2c), a gentle upward curve, rounded ends. Nothing else in the picture: no face, no skin, no border, no shadow. Flat colour, no gradient. Centred. Transparent background. 200 x 120 pixels.

**`assets/cast/dad/mouth-open.png`** (200 x 120)

> Flat paper cutout of an open talking mouth only: a dark red-brown oval (#5a1f24) with a thin dark brown outline, a row of off-white upper teeth along the top, and a pink tongue (#d9727a) at the bottom. Nothing else in the picture: no face, no skin, no border, no shadow. Flat colours, no gradients. Centred. Transparent background. 200 x 120 pixels.

### kid

**`assets/cast/kid/body.png`** (800 x 1000)

> Flat paper cutout illustration of the upper body of a cheerful child of about eight, shown from the waist up, facing straight forward, standing still, arms down at the sides. A terracotta T-shirt with wide cream horizontal stripes. Narrow shoulders, a child's build. No head and no face: the picture starts at the neck. Made of simple flat pieces of coloured paper layered on top of each other, like a children's cut-paper collage. Flat solid colours only, no gradients, no ink outlines, no texture, no 3D shading. A thin even off-white paper border around the whole outline, like a sticker cut out with scissors. Slightly uneven hand-cut edges. No shadow under or around it. Warm muted colours: terracotta (#d1603d), cream (#f3ead8), fair skin (#ecc19c). Centred, neck at the top centre, torso running off the bottom edge. Transparent background. 800 x 1000 pixels, portrait.

**`assets/cast/kid/head.png`** (600 x 600)

> Flat paper cutout illustration of the head of a cheerful child of about eight, facing straight forward. Short messy brown hair with a little tuft sticking up on top. A round young face, no facial hair. Fair skin (#ecc19c). Friendly calm expression. Important: the head has NO MOUTH. Leave the mouth area as plain skin (or plain beard); the mouth is added separately. Two simple dark oval eyes with a small white dot, short eyebrows, a simple curved line for the nose, soft blush circles on the cheeks. Made of simple flat pieces of coloured paper layered on top of each other, like a children's cut-paper collage. Flat solid colours only, no gradients, no ink outlines, no texture, no 3D shading. A thin even off-white paper border around the whole outline, like a sticker cut out with scissors. Slightly uneven hand-cut edges. No neck, no shoulders, no shadow. Warm muted colours: fair skin (#ecc19c), brown hair (#7a4a2a). Head centred, filling most of the square. Transparent background. 600 x 600 pixels, square.

**`assets/cast/kid/mouth-closed.png`** (200 x 120)

> Flat paper cutout of a closed mouth only: a single soft smile line in dark brown (#3a2f2c), a gentle upward curve, rounded ends. Nothing else in the picture: no face, no skin, no border, no shadow. Flat colour, no gradient. Centred. Transparent background. 200 x 120 pixels.

**`assets/cast/kid/mouth-open.png`** (200 x 120)

> Flat paper cutout of an open talking mouth only: a dark red-brown oval (#5a1f24) with a thin dark brown outline, a row of off-white upper teeth along the top, and a pink tongue (#d9727a) at the bottom. Nothing else in the picture: no face, no skin, no border, no shadow. Flat colours, no gradients. Centred. Transparent background. 200 x 120 pixels.

### king

**`assets/cast/king/body.png`** (800 x 1000)

> Flat paper cutout illustration of the upper body of a medieval king, shown from the waist up, facing straight forward, standing still, arms down at the sides. A brick-red royal robe open at the front over a white ermine panel with small black spots, and a gold chain with a diamond-shaped gold pendant. No head and no face: the picture starts at the neck. Made of simple flat pieces of coloured paper layered on top of each other, like a children's cut-paper collage. Flat solid colours only, no gradients, no ink outlines, no texture, no 3D shading. A thin even off-white paper border around the whole outline, like a sticker cut out with scissors. Slightly uneven hand-cut edges. No shadow under or around it. Warm muted colours: brick red (#a5372f), off-white ermine (#f6f1e6) with ink spots, gold (#e0a526), tan skin (#dba27c). Centred, neck at the top centre, torso running off the bottom edge. Transparent background. 800 x 1000 pixels, portrait.

**`assets/cast/king/head.png`** (600 x 600)

> Flat paper cutout illustration of the head of a medieval king, facing straight forward. A gold crown with five points and three small jewels (one red, two teal), short brown hair, and a short trimmed brown beard. Tan skin (#dba27c). Friendly calm expression. Important: the head has NO MOUTH. Leave the mouth area as plain skin (or plain beard); the mouth is added separately. Two simple dark oval eyes with a small white dot, short eyebrows, a simple curved line for the nose, soft blush circles on the cheeks. Made of simple flat pieces of coloured paper layered on top of each other, like a children's cut-paper collage. Flat solid colours only, no gradients, no ink outlines, no texture, no 3D shading. A thin even off-white paper border around the whole outline, like a sticker cut out with scissors. Slightly uneven hand-cut edges. No neck, no shoulders, no shadow. Warm muted colours: tan skin (#dba27c), gold crown (#e0a526), brown hair and beard (#6b4a2f). Head centred, filling most of the square. Transparent background. 600 x 600 pixels, square.

**`assets/cast/king/mouth-closed.png`** (200 x 120)

> Flat paper cutout of a closed mouth only: a single soft smile line in dark brown (#3a2f2c), a gentle upward curve, rounded ends. Nothing else in the picture: no face, no skin, no border, no shadow. Flat colour, no gradient. Centred. Transparent background. 200 x 120 pixels.

**`assets/cast/king/mouth-open.png`** (200 x 120)

> Flat paper cutout of an open talking mouth only: a dark red-brown oval (#5a1f24) with a thin dark brown outline, a row of off-white upper teeth along the top, and a pink tongue (#d9727a) at the bottom. Nothing else in the picture: no face, no skin, no border, no shadow. Flat colours, no gradients. Centred. Transparent background. 200 x 120 pixels.

### monk

**`assets/cast/monk/body.png`** (800 x 1000)

> Flat paper cutout illustration of the upper body of a gentle medieval monk, shown from the waist up, facing straight forward, standing still, arms down at the sides. A plain brown wool habit with a wide cowl collar lying on the shoulders, and a pale rope belt tied at the waist with one end hanging down. No head and no face: the picture starts at the neck. Made of simple flat pieces of coloured paper layered on top of each other, like a children's cut-paper collage. Flat solid colours only, no gradients, no ink outlines, no texture, no 3D shading. A thin even off-white paper border around the whole outline, like a sticker cut out with scissors. Slightly uneven hand-cut edges. No shadow under or around it. Warm muted colours: habit brown (#7a5a3c), pale rope (#d9c7a3), tan skin (#d7a47f). Centred, neck at the top centre, torso running off the bottom edge. Transparent background. 800 x 1000 pixels, portrait.

**`assets/cast/monk/head.png`** (600 x 600)

> Flat paper cutout illustration of the head of a gentle medieval monk, facing straight forward. A brown hood up around the head, framing the face. A little brown hair at the temples. Clean-shaven. Tan skin (#d7a47f). Friendly calm expression. Important: the head has NO MOUTH. Leave the mouth area as plain skin (or plain beard); the mouth is added separately. Two simple dark oval eyes with a small white dot, short eyebrows, a simple curved line for the nose, soft blush circles on the cheeks. Made of simple flat pieces of coloured paper layered on top of each other, like a children's cut-paper collage. Flat solid colours only, no gradients, no ink outlines, no texture, no 3D shading. A thin even off-white paper border around the whole outline, like a sticker cut out with scissors. Slightly uneven hand-cut edges. No neck, no shoulders, no shadow. Warm muted colours: tan skin (#d7a47f), habit brown hood (#7a5a3c). Head centred, filling most of the square. Transparent background. 600 x 600 pixels, square.

**`assets/cast/monk/mouth-closed.png`** (200 x 120)

> Flat paper cutout of a closed mouth only: a single soft smile line in dark brown (#3a2f2c), a gentle upward curve, rounded ends. Nothing else in the picture: no face, no skin, no border, no shadow. Flat colour, no gradient. Centred. Transparent background. 200 x 120 pixels.

**`assets/cast/monk/mouth-open.png`** (200 x 120)

> Flat paper cutout of an open talking mouth only: a dark red-brown oval (#5a1f24) with a thin dark brown outline, a row of off-white upper teeth along the top, and a pink tongue (#d9727a) at the bottom. Nothing else in the picture: no face, no skin, no border, no shadow. Flat colours, no gradients. Centred. Transparent background. 200 x 120 pixels.

### mother

**`assets/cast/mother/body.png`** (800 x 1000)

> Flat paper cutout illustration of the upper body of a warm mother in her thirties, shown from the waist up, facing straight forward, standing still, arms down at the sides. A dusty rose dress with a cream scoop neckline and a slightly lighter rose skirt below a waistband. No head and no face: the picture starts at the neck. Made of simple flat pieces of coloured paper layered on top of each other, like a children's cut-paper collage. Flat solid colours only, no gradients, no ink outlines, no texture, no 3D shading. A thin even off-white paper border around the whole outline, like a sticker cut out with scissors. Slightly uneven hand-cut edges. No shadow under or around it. Warm muted colours: dusty rose (#b5677d), lighter rose (#d97f96), cream (#f3ead8), medium brown skin (#c68d6a). Centred, neck at the top centre, torso running off the bottom edge. Transparent background. 800 x 1000 pixels, portrait.

**`assets/cast/mother/head.png`** (600 x 600)

> Flat paper cutout illustration of the head of a warm mother in her thirties, facing straight forward. Dark hair pulled up into a round bun on top of the head, with a smooth hairline. No facial hair. Medium brown skin (#c68d6a). Friendly calm expression. Important: the head has NO MOUTH. Leave the mouth area as plain skin (or plain beard); the mouth is added separately. Two simple dark oval eyes with a small white dot, short eyebrows, a simple curved line for the nose, soft blush circles on the cheeks. Made of simple flat pieces of coloured paper layered on top of each other, like a children's cut-paper collage. Flat solid colours only, no gradients, no ink outlines, no texture, no 3D shading. A thin even off-white paper border around the whole outline, like a sticker cut out with scissors. Slightly uneven hand-cut edges. No neck, no shoulders, no shadow. Warm muted colours: medium brown skin (#c68d6a), dark hair (#2f2622). Head centred, filling most of the square. Transparent background. 600 x 600 pixels, square.

**`assets/cast/mother/mouth-closed.png`** (200 x 120)

> Flat paper cutout of a closed mouth only: a single soft smile line in dark brown (#3a2f2c), a gentle upward curve, rounded ends. Nothing else in the picture: no face, no skin, no border, no shadow. Flat colour, no gradient. Centred. Transparent background. 200 x 120 pixels.

**`assets/cast/mother/mouth-open.png`** (200 x 120)

> Flat paper cutout of an open talking mouth only: a dark red-brown oval (#5a1f24) with a thin dark brown outline, a row of off-white upper teeth along the top, and a pink tongue (#d9727a) at the bottom. Nothing else in the picture: no face, no skin, no border, no shadow. Flat colours, no gradients. Centred. Transparent background. 200 x 120 pixels.

### soldier

**`assets/cast/soldier/body.png`** (800 x 1000)

> Flat paper cutout illustration of the upper body of a soldier, shown from the waist up, facing straight forward, standing still, arms down at the sides. An olive green field uniform with a pointed collar, two buttoned chest pockets, shoulder straps and a centre seam. No head and no face: the picture starts at the neck. Made of simple flat pieces of coloured paper layered on top of each other, like a children's cut-paper collage. Flat solid colours only, no gradients, no ink outlines, no texture, no 3D shading. A thin even off-white paper border around the whole outline, like a sticker cut out with scissors. Slightly uneven hand-cut edges. No shadow under or around it. Warm muted colours: olive green (#6b7446), dark olive (#4d5532), tan skin (#cf9a74). Centred, neck at the top centre, torso running off the bottom edge. Transparent background. 800 x 1000 pixels, portrait.

**`assets/cast/soldier/head.png`** (600 x 600)

> Flat paper cutout illustration of the head of a soldier, facing straight forward. A rounded olive green helmet with a darker band, short dark hair just showing under it. Clean-shaven. Tan skin (#cf9a74). Friendly calm expression. Important: the head has NO MOUTH. Leave the mouth area as plain skin (or plain beard); the mouth is added separately. Two simple dark oval eyes with a small white dot, short eyebrows, a simple curved line for the nose, soft blush circles on the cheeks. Made of simple flat pieces of coloured paper layered on top of each other, like a children's cut-paper collage. Flat solid colours only, no gradients, no ink outlines, no texture, no 3D shading. A thin even off-white paper border around the whole outline, like a sticker cut out with scissors. Slightly uneven hand-cut edges. No neck, no shoulders, no shadow. Warm muted colours: tan skin (#cf9a74), olive green helmet (#6b7446). Head centred, filling most of the square. Transparent background. 600 x 600 pixels, square.

**`assets/cast/soldier/mouth-closed.png`** (200 x 120)

> Flat paper cutout of a closed mouth only: a single soft smile line in dark brown (#3a2f2c), a gentle upward curve, rounded ends. Nothing else in the picture: no face, no skin, no border, no shadow. Flat colour, no gradient. Centred. Transparent background. 200 x 120 pixels.

**`assets/cast/soldier/mouth-open.png`** (200 x 120)

> Flat paper cutout of an open talking mouth only: a dark red-brown oval (#5a1f24) with a thin dark brown outline, a row of off-white upper teeth along the top, and a pink tongue (#d9727a) at the bottom. Nothing else in the picture: no face, no skin, no border, no shadow. Flat colours, no gradients. Centred. Transparent background. 200 x 120 pixels.

### scientist

**`assets/cast/scientist/body.png`** (800 x 1000)

> Flat paper cutout illustration of the upper body of a curious scientist, shown from the waist up, facing straight forward, standing still, arms down at the sides. A white lab coat with wide lapels over a pale blue shirt, and a chest pocket holding a teal pen and a terracotta pen. No head and no face: the picture starts at the neck. Made of simple flat pieces of coloured paper layered on top of each other, like a children's cut-paper collage. Flat solid colours only, no gradients, no ink outlines, no texture, no 3D shading. A thin even off-white paper border around the whole outline, like a sticker cut out with scissors. Slightly uneven hand-cut edges. No shadow under or around it. Warm muted colours: lab coat off-white (#f4f1ea), pale blue (#8fb8c9), teal (#2a8c82), fair skin (#e6b995). Centred, neck at the top centre, torso running off the bottom edge. Transparent background. 800 x 1000 pixels, portrait.

**`assets/cast/scientist/head.png`** (600 x 600)

> Flat paper cutout illustration of the head of a curious scientist, facing straight forward. Slightly messy dark brown hair, and round thin dark glasses. Clean-shaven. Fair skin (#e6b995). Friendly calm expression. Important: the head has NO MOUTH. Leave the mouth area as plain skin (or plain beard); the mouth is added separately. Two simple dark oval eyes with a small white dot, short eyebrows, a simple curved line for the nose, soft blush circles on the cheeks. Made of simple flat pieces of coloured paper layered on top of each other, like a children's cut-paper collage. Flat solid colours only, no gradients, no ink outlines, no texture, no 3D shading. A thin even off-white paper border around the whole outline, like a sticker cut out with scissors. Slightly uneven hand-cut edges. No neck, no shoulders, no shadow. Warm muted colours: fair skin (#e6b995), dark brown hair (#4a3b33), ink glasses (#2b2a33). Head centred, filling most of the square. Transparent background. 600 x 600 pixels, square.

**`assets/cast/scientist/mouth-closed.png`** (200 x 120)

> Flat paper cutout of a closed mouth only: a single soft smile line in dark brown (#3a2f2c), a gentle upward curve, rounded ends. Nothing else in the picture: no face, no skin, no border, no shadow. Flat colour, no gradient. Centred. Transparent background. 200 x 120 pixels.

**`assets/cast/scientist/mouth-open.png`** (200 x 120)

> Flat paper cutout of an open talking mouth only: a dark red-brown oval (#5a1f24) with a thin dark brown outline, a row of off-white upper teeth along the top, and a pink tongue (#d9727a) at the bottom. Nothing else in the picture: no face, no skin, no border, no shadow. Flat colours, no gradients. Centred. Transparent background. 200 x 120 pixels.

### businessman

**`assets/cast/businessman/body.png`** (800 x 1000)

> Flat paper cutout illustration of the upper body of a confident businessman in his forties, shown from the waist up, facing straight forward, standing still, arms down at the sides. A slate blue suit jacket with notched lapels over a white shirt, a terracotta tie, and a white pocket square. No head and no face: the picture starts at the neck. Made of simple flat pieces of coloured paper layered on top of each other, like a children's cut-paper collage. Flat solid colours only, no gradients, no ink outlines, no texture, no 3D shading. A thin even off-white paper border around the whole outline, like a sticker cut out with scissors. Slightly uneven hand-cut edges. No shadow under or around it. Warm muted colours: slate blue (#34405a), off-white shirt (#f4f1ea), terracotta tie (#d1603d), deep brown skin (#b9805c). Centred, neck at the top centre, torso running off the bottom edge. Transparent background. 800 x 1000 pixels, portrait.

**`assets/cast/businessman/head.png`** (600 x 600)

> Flat paper cutout illustration of the head of a confident businessman in his forties, facing straight forward. Short black hair combed neatly back. Clean-shaven. Deep brown skin (#b9805c). Friendly calm expression. Important: the head has NO MOUTH. Leave the mouth area as plain skin (or plain beard); the mouth is added separately. Two simple dark oval eyes with a small white dot, short eyebrows, a simple curved line for the nose, soft blush circles on the cheeks. Made of simple flat pieces of coloured paper layered on top of each other, like a children's cut-paper collage. Flat solid colours only, no gradients, no ink outlines, no texture, no 3D shading. A thin even off-white paper border around the whole outline, like a sticker cut out with scissors. Slightly uneven hand-cut edges. No neck, no shoulders, no shadow. Warm muted colours: deep brown skin (#b9805c), black hair (#221d1b). Head centred, filling most of the square. Transparent background. 600 x 600 pixels, square.

**`assets/cast/businessman/mouth-closed.png`** (200 x 120)

> Flat paper cutout of a closed mouth only: a single soft smile line in dark brown (#3a2f2c), a gentle upward curve, rounded ends. Nothing else in the picture: no face, no skin, no border, no shadow. Flat colour, no gradient. Centred. Transparent background. 200 x 120 pixels.

**`assets/cast/businessman/mouth-open.png`** (200 x 120)

> Flat paper cutout of an open talking mouth only: a dark red-brown oval (#5a1f24) with a thin dark brown outline, a row of off-white upper teeth along the top, and a pink tongue (#d9727a) at the bottom. Nothing else in the picture: no face, no skin, no border, no shadow. Flat colours, no gradients. Centred. Transparent background. 200 x 120 pixels.

### farmer

**`assets/cast/farmer/body.png`** (800 x 1000)

> Flat paper cutout illustration of the upper body of a weathered farmer, shown from the waist up, facing straight forward, standing still, arms down at the sides. A brick red work shirt under faded blue denim bib overalls with two straps, two round buttons and a chest pocket. No head and no face: the picture starts at the neck. Made of simple flat pieces of coloured paper layered on top of each other, like a children's cut-paper collage. Flat solid colours only, no gradients, no ink outlines, no texture, no 3D shading. A thin even off-white paper border around the whole outline, like a sticker cut out with scissors. Slightly uneven hand-cut edges. No shadow under or around it. Warm muted colours: brick red (#c0503a), denim blue (#5f7fa6), sun-tanned skin (#d49b72). Centred, neck at the top centre, torso running off the bottom edge. Transparent background. 800 x 1000 pixels, portrait.

**`assets/cast/farmer/head.png`** (600 x 600)

> Flat paper cutout illustration of the head of a weathered farmer, facing straight forward. A wide-brimmed straw hat with a red band, short reddish-brown hair under it, and a light stubble shadow on the jaw. Sun-tanned skin (#d49b72). Friendly calm expression. Important: the head has NO MOUTH. Leave the mouth area as plain skin (or plain beard); the mouth is added separately. Two simple dark oval eyes with a small white dot, short eyebrows, a simple curved line for the nose, soft blush circles on the cheeks. Made of simple flat pieces of coloured paper layered on top of each other, like a children's cut-paper collage. Flat solid colours only, no gradients, no ink outlines, no texture, no 3D shading. A thin even off-white paper border around the whole outline, like a sticker cut out with scissors. Slightly uneven hand-cut edges. No neck, no shoulders, no shadow. Warm muted colours: sun-tanned skin (#d49b72), straw (#e3c176), red hat band (#a5372f). Head centred, filling most of the square. Transparent background. 600 x 600 pixels, square.

**`assets/cast/farmer/mouth-closed.png`** (200 x 120)

> Flat paper cutout of a closed mouth only: a single soft smile line in dark brown (#3a2f2c), a gentle upward curve, rounded ends. Nothing else in the picture: no face, no skin, no border, no shadow. Flat colour, no gradient. Centred. Transparent background. 200 x 120 pixels.

**`assets/cast/farmer/mouth-open.png`** (200 x 120)

> Flat paper cutout of an open talking mouth only: a dark red-brown oval (#5a1f24) with a thin dark brown outline, a row of off-white upper teeth along the top, and a pink tongue (#d9727a) at the bottom. Nothing else in the picture: no face, no skin, no border, no shadow. Flat colours, no gradients. Centred. Transparent background. 200 x 120 pixels.

### teacher

**`assets/cast/teacher/body.png`** (800 x 1000)

> Flat paper cutout illustration of the upper body of a thoughtful teacher, a woman in her forties, shown from the waist up, facing straight forward, standing still, arms down at the sides. An indigo cardigan with a row of round buttons, open over a cream blouse with a small pointed collar. No head and no face: the picture starts at the neck. Made of simple flat pieces of coloured paper layered on top of each other, like a children's cut-paper collage. Flat solid colours only, no gradients, no ink outlines, no texture, no 3D shading. A thin even off-white paper border around the whole outline, like a sticker cut out with scissors. Slightly uneven hand-cut edges. No shadow under or around it. Warm muted colours: indigo (#4a4e9a), cream (#f3ead8), brown skin (#a8714f). Centred, neck at the top centre, torso running off the bottom edge. Transparent background. 800 x 1000 pixels, portrait.

**`assets/cast/teacher/head.png`** (600 x 600)

> Flat paper cutout illustration of the head of a thoughtful teacher, a woman in her forties, facing straight forward. Dark hair in a chin-length bob with a centre parting, and round thin dark glasses. No facial hair. Brown skin (#a8714f). Friendly calm expression. Important: the head has NO MOUTH. Leave the mouth area as plain skin (or plain beard); the mouth is added separately. Two simple dark oval eyes with a small white dot, short eyebrows, a simple curved line for the nose, soft blush circles on the cheeks. Made of simple flat pieces of coloured paper layered on top of each other, like a children's cut-paper collage. Flat solid colours only, no gradients, no ink outlines, no texture, no 3D shading. A thin even off-white paper border around the whole outline, like a sticker cut out with scissors. Slightly uneven hand-cut edges. No neck, no shoulders, no shadow. Warm muted colours: brown skin (#a8714f), dark hair (#2a211d), ink glasses (#2b2a33). Head centred, filling most of the square. Transparent background. 600 x 600 pixels, square.

**`assets/cast/teacher/mouth-closed.png`** (200 x 120)

> Flat paper cutout of a closed mouth only: a single soft smile line in dark brown (#3a2f2c), a gentle upward curve, rounded ends. Nothing else in the picture: no face, no skin, no border, no shadow. Flat colour, no gradient. Centred. Transparent background. 200 x 120 pixels.

**`assets/cast/teacher/mouth-open.png`** (200 x 120)

> Flat paper cutout of an open talking mouth only: a dark red-brown oval (#5a1f24) with a thin dark brown outline, a row of off-white upper teeth along the top, and a pink tongue (#d9727a) at the bottom. Nothing else in the picture: no face, no skin, no border, no shadow. Flat colours, no gradients. Centred. Transparent background. 200 x 120 pixels.

### old-man

**`assets/cast/old-man/body.png`** (800 x 1000)

> Flat paper cutout illustration of the upper body of a gentle old man, a grandfather, shown from the waist up, facing straight forward, standing still, arms down at the sides. A brown tweed jacket over a cream waistcoat with three buttons, a cream shirt collar and a small red bow tie. No head and no face: the picture starts at the neck. Made of simple flat pieces of coloured paper layered on top of each other, like a children's cut-paper collage. Flat solid colours only, no gradients, no ink outlines, no texture, no 3D shading. A thin even off-white paper border around the whole outline, like a sticker cut out with scissors. Slightly uneven hand-cut edges. No shadow under or around it. Warm muted colours: tweed brown (#7b6a58), cream (#e6d9bf), brick red bow tie (#a5372f), fair skin (#e2b596). Centred, neck at the top centre, torso running off the bottom edge. Transparent background. 800 x 1000 pixels, portrait.

**`assets/cast/old-man/head.png`** (600 x 600)

> Flat paper cutout illustration of the head of a gentle old man, a grandfather, facing straight forward. Bald on top with tufts of white hair at the sides above the ears, a short white beard, and round thin dark glasses. Fair skin (#e2b596). Friendly calm expression. Important: the head has NO MOUTH. Leave the mouth area as plain skin (or plain beard); the mouth is added separately. Two simple dark oval eyes with a small white dot, short eyebrows, a simple curved line for the nose, soft blush circles on the cheeks. Made of simple flat pieces of coloured paper layered on top of each other, like a children's cut-paper collage. Flat solid colours only, no gradients, no ink outlines, no texture, no 3D shading. A thin even off-white paper border around the whole outline, like a sticker cut out with scissors. Slightly uneven hand-cut edges. No neck, no shoulders, no shadow. Warm muted colours: fair skin (#e2b596), white hair and beard (#f1eee8), ink glasses (#2b2a33). Head centred, filling most of the square. Transparent background. 600 x 600 pixels, square.

**`assets/cast/old-man/mouth-closed.png`** (200 x 120)

> Flat paper cutout of a closed mouth only: a single soft smile line in dark brown (#3a2f2c), a gentle upward curve, rounded ends. Nothing else in the picture: no face, no skin, no border, no shadow. Flat colour, no gradient. Centred. Transparent background. 200 x 120 pixels.

**`assets/cast/old-man/mouth-open.png`** (200 x 120)

> Flat paper cutout of an open talking mouth only: a dark red-brown oval (#5a1f24) with a thin dark brown outline, a row of off-white upper teeth along the top, and a pink tongue (#d9727a) at the bottom. Nothing else in the picture: no face, no skin, no border, no shadow. Flat colours, no gradients. Centred. Transparent background. 200 x 120 pixels.

### young-woman

**`assets/cast/young-woman/body.png`** (800 x 1000)

> Flat paper cutout illustration of the upper body of a young woman in her twenties, shown from the waist up, facing straight forward, standing still, arms down at the sides. A teal blouse with a soft cream V-neck collar and a small gold pendant on a thin chain. No head and no face: the picture starts at the neck. Made of simple flat pieces of coloured paper layered on top of each other, like a children's cut-paper collage. Flat solid colours only, no gradients, no ink outlines, no texture, no 3D shading. A thin even off-white paper border around the whole outline, like a sticker cut out with scissors. Slightly uneven hand-cut edges. No shadow under or around it. Warm muted colours: teal (#2a8c82), cream (#f3ead8), gold (#e0a526), fair skin (#edc3a0). Centred, neck at the top centre, torso running off the bottom edge. Transparent background. 800 x 1000 pixels, portrait.

**`assets/cast/young-woman/head.png`** (600 x 600)

> Flat paper cutout illustration of the head of a young woman in her twenties, facing straight forward. Long straight copper-red hair falling past the jaw on both sides, with a side-swept fringe. No facial hair. Fair skin (#edc3a0). Friendly calm expression. Important: the head has NO MOUTH. Leave the mouth area as plain skin (or plain beard); the mouth is added separately. Two simple dark oval eyes with a small white dot, short eyebrows, a simple curved line for the nose, soft blush circles on the cheeks. Made of simple flat pieces of coloured paper layered on top of each other, like a children's cut-paper collage. Flat solid colours only, no gradients, no ink outlines, no texture, no 3D shading. A thin even off-white paper border around the whole outline, like a sticker cut out with scissors. Slightly uneven hand-cut edges. No neck, no shoulders, no shadow. Warm muted colours: fair skin (#edc3a0), copper-red hair (#b5622f). Head centred, filling most of the square. Transparent background. 600 x 600 pixels, square.

**`assets/cast/young-woman/mouth-closed.png`** (200 x 120)

> Flat paper cutout of a closed mouth only: a single soft smile line in dark brown (#3a2f2c), a gentle upward curve, rounded ends. Nothing else in the picture: no face, no skin, no border, no shadow. Flat colour, no gradient. Centred. Transparent background. 200 x 120 pixels.

**`assets/cast/young-woman/mouth-open.png`** (200 x 120)

> Flat paper cutout of an open talking mouth only: a dark red-brown oval (#5a1f24) with a thin dark brown outline, a row of off-white upper teeth along the top, and a pink tongue (#d9727a) at the bottom. Nothing else in the picture: no face, no skin, no border, no shadow. Flat colours, no gradients. Centred. Transparent background. 200 x 120 pixels.

## Backgrounds

### study

**`assets/backgrounds/study.png`** (1080 x 1920, solid, no transparency)

> Flat paper cutout illustration of a cosy study, as a quiet backdrop for a puppet show. A wall with soft vertical stripes, a wooden bookshelf with three rows of coloured book spines on the left, a window with a paper sun on the right, a small framed landscape picture under the window, a wooden floor and an oval red rug with a gold ring. Made of simple flat pieces of coloured paper layered on top of each other, like a children's cut-paper collage, each layer with a thin flat shadow at its lower right. Flat solid colours only, no gradients, no ink outlines, no texture, no people, no text or letters. Pale, warm, muted colours, low contrast: warm tan wall (#d8c4a2), wood brown (#7d5a3c), book spines in brick red, teal, mustard, indigo and terracotta, pale sky blue window (#bfe0ea). A floor or ground line about three quarters of the way down. The middle and lower part of the picture left fairly plain, because a character will stand in front of it. Vertical, 1080 x 1920 pixels, filling the whole picture edge to edge.

### church

**`assets/backgrounds/church.png`** (1080 x 1920, solid, no transparency)

> Flat paper cutout illustration of the inside of a small church, as a quiet backdrop for a puppet show. A pale blue-grey wall, one tall arched stained-glass window in the centre made of simple coloured squares, a plain fluted stone column on each side, a stone floor with a red carpet runner down the middle and the tops of dark wooden pews at the bottom left and right. Made of simple flat pieces of coloured paper layered on top of each other, like a children's cut-paper collage, each layer with a thin flat shadow at its lower right. Flat solid colours only, no gradients, no ink outlines, no texture, no people, no text or letters. Pale, warm, muted colours, low contrast: pale blue-grey wall (#cdd0de), stone off-white (#e8e4da), stained glass in indigo, brick red, mustard, teal and terracotta, dark wood (#6b4a33). A floor or ground line about three quarters of the way down. The middle and lower part of the picture left fairly plain, because a character will stand in front of it. Vertical, 1080 x 1920 pixels, filling the whole picture edge to edge.

### workshop

**`assets/backgrounds/workshop.png`** (1080 x 1920, solid, no transparency)

> Flat paper cutout illustration of a craftsman's workshop, as a quiet backdrop for a puppet show. A pegboard wall with rows of small dots, a wooden shelf near the top holding six coloured jars with cream lids, a hand saw, a hammer, a wrench and a carpenter's square hanging on the wall, and a wooden workbench with a drawer across the bottom. Made of simple flat pieces of coloured paper layered on top of each other, like a children's cut-paper collage, each layer with a thin flat shadow at its lower right. Flat solid colours only, no gradients, no ink outlines, no texture, no people, no text or letters. Pale, warm, muted colours, low contrast: pegboard tan (#c9b896), wood brown (#7d5a3c, #8a6248), tool grey (#8c9098), jars in teal, mustard, terracotta, indigo, olive and brick red. A floor or ground line about three quarters of the way down. The middle and lower part of the picture left fairly plain, because a character will stand in front of it. Vertical, 1080 x 1920 pixels, filling the whole picture edge to edge.

### city-street

**`assets/backgrounds/city-street.png`** (1080 x 1920, solid, no transparency)

> Flat paper cutout illustration of a quiet city street in daylight, as a quiet backdrop for a puppet show. A pale blue sky with a soft yellow sun and one paper cloud, a row of distant blue-grey buildings, four nearer buildings in different colours with simple square windows, a shop with a red and cream striped awning, a pale pavement, a grey road with a dashed white centre line, and one black street lamp on the right. Made of simple flat pieces of coloured paper layered on top of each other, like a children's cut-paper collage, each layer with a thin flat shadow at its lower right. Flat solid colours only, no gradients, no ink outlines, no texture, no people, no text or letters. Pale, warm, muted colours, low contrast: sky blue (#bcdde8), distant blue-grey (#8fa7bd), buildings in terracotta, cream, indigo and kraft, pavement (#cfc8ba), road grey (#5d6068). A floor or ground line about three quarters of the way down. The middle and lower part of the picture left fairly plain, because a character will stand in front of it. Vertical, 1080 x 1920 pixels, filling the whole picture edge to edge.

### open-field

**`assets/backgrounds/open-field.png`** (1080 x 1920, solid, no transparency)

> Flat paper cutout illustration of an open field under a big sky, as a quiet backdrop for a puppet show. A pale blue sky with a soft yellow sun and two paper clouds, three layers of rolling green hills, one round tree on the far hill, a short cream wooden fence on the right, and small grass tufts and a few tiny flowers in the foreground. Made of simple flat pieces of coloured paper layered on top of each other, like a children's cut-paper collage, each layer with a thin flat shadow at its lower right. Flat solid colours only, no gradients, no ink outlines, no texture, no people, no text or letters. Pale, warm, muted colours, low contrast: sky blue (#cfe8ee), sun yellow (#f6e3a1), three greens from light to deep (#a9c38a, #8fb072, #6f9458), cream fence (#e6d9bf). A floor or ground line about three quarters of the way down. The middle and lower part of the picture left fairly plain, because a character will stand in front of it. Vertical, 1080 x 1920 pixels, filling the whole picture edge to edge.
