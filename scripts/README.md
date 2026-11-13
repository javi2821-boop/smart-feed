# Scripts

One script is one text file, and one text file becomes one clip. Put the file in `scripts/inbox/`. The factory picks it up by itself, makes the clip, and moves the file to `scripts/done/`. If something is wrong with the file, it moves to `scripts/failed/` with a note beside it (`<name>.why.txt`) saying exactly what to fix.

## The format

```
---
type: lesson
title: What is yours to control
character: philosopher
background: study
source: Marcus Aurelius, Meditations (paraphrased)
---
Marcus Aurelius ruled the Roman Empire, and he still could not control the weather, the plague, or what people said about him. So in his private notebook he kept returning to one idea he had learned from the Stoics. Some things are up to us, and some are not. Our judgments and our choices are ours. Almost everything else is not. He argued that most of our suffering comes from mixing the two up. We try to steer what was never ours, and neglect the one thing that is. Next time something goes wrong, ask one question first. Is this mine to control?
```

A blank one to copy:

```
---
type: lesson | question | story | scripture
title: 
character: 
background: 
source: 
---

```

(Keep only one of the four words after `type:`.)

## The rules the factory checks

| Line | Rule |
|---|---|
| File name | Lowercase letters, numbers and dashes, ending in `.md`, like `marcus-control.md`. It becomes the clip's name, so it must not repeat one already on the feed. |
| `---` | The file starts with a line holding only three dashes, and the header ends with another one. |
| `type` | One of `lesson`, `question`, `story`, `scripture`. |
| `title` | Short: 60 characters at most. It is shown on a card for the first four seconds. |
| `character` | One of the folders in `assets/cast/`: philosopher, pastor, worker, dad, kid, king, monk, mother, soldier, scientist, businessman, farmer, teacher, old-man, young-woman. |
| `background` | One of the pictures in `assets/backgrounds/`: study, church, workshop, city-street, open-field. |
| `source` | Where the idea comes from, 90 characters at most. Shown under the title. |
| Narration | Everything under the header. **About 100 words** (80 to 125 are accepted). Plain sentences, written to be heard. No headings, lists or stage directions. |
| Question clips | The narration's **last sentence must be the question**, ending in a question mark, 170 characters at most. That sentence is held on screen in silence for three seconds at the end. |

The header has exactly those five lines. Any other line there is treated as a mistake, so a typo like `tittle:` is caught instead of ignored.

## Length

Every clip must come out between 35 and 45 seconds. About 100 words does that. The factory nudges the reading speed a little to land in range; if a script is too short or too long for that to work, it fails with a note saying roughly how many words to add or cut.

## What makes a good script

- **One small idea.** Never a summary of a book. One thought that can be turned over for the rest of the day.
- **Lesson:** one idea from a book or thinker.
- **Question:** a thinker's open question. Do not answer it. End on it.
- **Story:** a short moment from someone's life and what it taught.
- **Scripture:** a verse, or one idea from C.S. Lewis.
- Topics: psychology, philosophy, Christianity, business, and what Javi is building.
- Write numbers and years the way they are said: "nineteen seventy-four", "Matthew six, thirty-four".

## Quotes: the rule that is never bent

- **Never invent a quote.** Use someone's exact words only when you are sure of the wording, and name the source.
- If you are not sure of the exact words, **paraphrase and say so**: "Lewis argued that...", "Marcus kept returning to the idea that...". Put `(paraphrased)` in the `source` line.
- **Bible verses** come from a public domain translation, the King James Version (KJV) or the World English Bible (WEB), with the reference, like `source: Matthew 6:34 (KJV)`.
- The character on screen is a narrator, not the person being quoted. The philosopher puppet never "is" Marcus Aurelius.

## Examples of each type

Four complete scripts are in [`samples/scripts/`](../samples/scripts/): one lesson, one question, one story, one scripture.

## Checking a script before sending it

If you have the repo on a computer with Node installed: put the file in `scripts/inbox/` and run `node factory/run.js --check`. It reads every script in the inbox and lists what is wrong, without rendering or moving anything.
