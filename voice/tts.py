#!/usr/bin/env python3
"""Narration with Kokoro (open source, Apache 2.0 weights, CPU only).

Reads a text file, writes a mono 16-bit WAV, and prints one JSON line:
  {"ok": true, "seconds": 38.2, "speed": 1.0, "peak_db": -3.0, "words": 101, "voice": "am_michael"}

If --min/--max are given and the first take lands outside them, it re-reads once at a
speed that aims for --target seconds (never slower than 0.85x or faster than 1.2x, so the
voice stays natural). A script that still misses is the caller's to reject.
"""
import argparse
import json
import sys
import wave

import numpy as np

PEAK = 10 ** (-3 / 20)  # the loudest sample sits at -3 dBFS: no clipping, room for the encoder


def lang_for(voice: str) -> str:
    return "en-gb" if voice.startswith("b") else "en-us"


def synth(kokoro, text, voice, speed):
    audio, rate = kokoro.create(text, voice=voice, speed=speed, lang=lang_for(voice))
    audio = np.asarray(audio, dtype=np.float32).reshape(-1)
    return audio, rate


def load(models="voice/models"):
    from kokoro_onnx import Kokoro

    return Kokoro(f"{models}/kokoro-v1.0.onnx", f"{models}/voices-v1.0.bin")


def narrate(kokoro, text, voice, out, speed=1.0, lo=None, hi=None, target=None):
    """Read `text` to `out` (WAV). Returns the dict main() prints."""
    text = " ".join(text.split())
    if not text:
        return {"ok": False, "error": "the narration is empty"}
    voices = sorted(kokoro.get_voices())
    if voice not in voices:
        return {"ok": False, "error": f'no voice "{voice}"', "voices": voices}

    first = speed
    audio, rate = synth(kokoro, text, voice, speed)
    seconds = len(audio) / rate
    if lo is not None and hi is not None and not (lo <= seconds <= hi):
        speed = round(min(1.2, max(0.85, speed * seconds / (target or (lo + hi) / 2))), 3)
        if speed != first:
            audio, rate = synth(kokoro, text, voice, speed)
            seconds = len(audio) / rate

    top = float(np.max(np.abs(audio))) if len(audio) else 0.0
    if top <= 0:
        return {"ok": False, "error": "Kokoro returned silence"}
    pcm = np.clip(np.round(audio * (PEAK / top) * 32767), -32768, 32767).astype("<i2")
    with wave.open(out, "wb") as w:
        w.setnchannels(1)
        w.setsampwidth(2)
        w.setframerate(rate)
        w.writeframes(pcm.tobytes())
    return {
        "ok": True,
        "seconds": round(seconds, 2),
        "speed": speed,
        "peak_db": round(20 * float(np.log10(np.max(np.abs(pcm)) / 32768)), 2),
        "words": len(text.split()),
        "voice": voice,
        "rate": rate,
    }


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--text-file", required=True)
    ap.add_argument("--out", required=True)
    ap.add_argument("--voice", required=True)
    ap.add_argument("--speed", type=float, default=1.0)
    ap.add_argument("--models", default="voice/models")
    ap.add_argument("--min", type=float, default=None, dest="lo")
    ap.add_argument("--max", type=float, default=None, dest="hi")
    ap.add_argument("--target", type=float, default=None)
    a = ap.parse_args()
    text = open(a.text_file, encoding="utf-8").read()
    r = narrate(load(a.models), text, a.voice, a.out, a.speed, a.lo, a.hi, a.target)
    print(json.dumps(r))
    return 0 if r["ok"] else 3


if __name__ == "__main__":
    sys.exit(main())
