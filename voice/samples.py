#!/usr/bin/env python3
"""Phase 2: read voice/sample-lesson.txt in several Kokoro voices.

  python voice/samples.py warm-male=am_michael calm-deep-male=am_fenrir warm-female=af_heart

Writes voice/samples/<label>.mp3 and voice/samples/REPORT.md. Exits 1 if a sample is not
35 to 45 seconds or its loudest sample is above -1 dBFS (clipping risk).
"""
import os
import re
import subprocess
import sys
import time

sys.path.insert(0, os.path.dirname(__file__))
import tts  # noqa: E402

HERE = os.path.dirname(__file__)
OUT = os.path.join(HERE, "samples")


def peak_of(path):
    r = subprocess.run(["ffmpeg", "-hide_banner", "-nostats", "-i", path, "-af", "volumedetect", "-f", "null", "-"], capture_output=True, text=True)
    m = re.search(r"max_volume: (-?[\d.]+) dB", r.stderr)
    return float(m.group(1)) if m else None


def main():
    pairs = [p.split("=", 1) for p in sys.argv[1:] if "=" in p]
    if not pairs:
        print(__doc__)
        return 2
    os.makedirs(OUT, exist_ok=True)
    text = open(os.path.join(HERE, "sample-lesson.txt"), encoding="utf-8").read()
    t0 = time.time()
    kokoro = tts.load(os.path.join(HERE, "models"))
    load_s = time.time() - t0
    rows, bad = [], False
    for label, voice in pairs:
        if not re.fullmatch(r"[a-z0-9-]+", label) or not re.fullmatch(r"[a-z]{2}_[a-z]+", voice):
            print(f"skipping odd pair {label}={voice}")
            bad = True
            continue
        wav = os.path.join(OUT, f"{label}.wav")
        mp3 = os.path.join(OUT, f"{label}.mp3")
        t1 = time.time()
        r = tts.narrate(kokoro, text, voice, wav, lo=36, hi=44, target=38)
        took = time.time() - t1
        if not r["ok"]:
            print(f"{label}: {r}")
            bad = True
            continue
        subprocess.run(["ffmpeg", "-hide_banner", "-loglevel", "error", "-y", "-i", wav, "-c:a", "libmp3lame", "-b:a", "128k", "-ac", "1", mp3], check=True)
        os.remove(wav)
        peak = peak_of(mp3)
        in_range = 35 <= r["seconds"] <= 45
        clean = peak is not None and peak <= -1.0
        bad = bad or not in_range or not clean
        rows.append((label, voice, r["words"], r["seconds"], r["speed"], peak, "yes" if in_range else "NO", "yes" if clean else "NO", took))
        print(f"{label} ({voice}): {r['seconds']} s, peak {peak} dBFS, made in {took:.1f} s")

    lines = [
        "# Voice samples",
        "",
        "Three Kokoro voices reading the same Lesson script (`voice/sample-lesson.txt`). A take that lands outside 36 to 44 seconds at normal speed is read again at a speed that aims for 38 seconds (the Speed column; 1.0 is Kokoro's normal pace).",
        "",
        "| Sample | Kokoro voice | Words | Length | Speed | Loudest sample | 35 to 45 s | No clipping | Time to make |",
        "|---|---|---|---|---|---|---|---|---|",
    ]
    for label, voice, words, secs, speed, peak, a, b, took in rows:
        lines.append(f"| [{label}.mp3]({label}.mp3) | `{voice}` | {words} | {secs} s | {speed} | {peak} dBFS | {a} | {b} | {took:.1f} s |")
    lines += ["", f"Loading the model took {load_s:.1f} s. Check result: {'FAIL' if bad else 'PASS'}.", ""]
    open(os.path.join(OUT, "REPORT.md"), "w", encoding="utf-8", newline="\n").write("\n".join(lines))
    return 1 if bad else 0


if __name__ == "__main__":
    sys.exit(main())
