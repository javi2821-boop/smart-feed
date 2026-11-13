// Script + narration → the composition the engine renders. One fixed template for every clip.
import path from 'node:path';
import { REPO_ROOT } from '../../src/paths.js';
import { OUTPUT } from './render.js';
import { loadCast } from './cast.js';
import { VOICE_START, QUESTION_GAP, QUESTION_HOLD, TAIL } from './voice.js';

export const FPS = 30;

/**
 * @param {object} script  from parseScript()
 * @param {object} voice   { wav, seconds, levels }
 */
export function composeClip(script, voice) {
  const { spec, characters, backgrounds } = loadCast(REPO_ROOT);
  const c = characters.find((x) => x.name === script.character);
  const b = backgrounds.find((x) => x.name === script.background);
  if (!c) throw new Error(`no character "${script.character}" in assets/cast`);
  if (!b) throw new Error(`no background "${script.background}" in assets/backgrounds`);
  const isQuestion = script.type === 'question';
  const questionAt = VOICE_START + voice.seconds + QUESTION_GAP;
  const duration = isQuestion ? questionAt + QUESTION_HOLD : VOICE_START + voice.seconds + TAIL;
  const part = (k) => path.join(c.dir, spec.parts[k].file);
  return {
    name: script.id,
    width: 1080,
    height: 1920,
    fps: FPS,
    theme: 'paper',
    seed: script.id,
    scenes: [
      {
        id: 'clip',
        type: 'custom/clip',
        duration: Math.round(duration * FPS) / FPS,
        props: {
          type: script.type,
          title: script.title,
          source: script.source,
          background: b.file,
          character: { body: part('body'), head: part('head'), mouthClosed: part('mouth-closed'), mouthOpen: part('mouth-open'), anchors: c.anchors },
          levels: voice.levels,
          voiceStart: VOICE_START,
          question: isQuestion ? script.question : '',
          questionAt: isQuestion ? questionAt : 0,
        },
      },
    ],
    audio: [{ src: voice.wav, start: VOICE_START }],
    output: OUTPUT,
  };
}
