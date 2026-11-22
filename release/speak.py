"""Narration for the guide videos. Reads a JSON list of {"text", "file"} and writes one WAV per item.
Voice: Kokoro (Apache 2.0 licence), "af_heart", a natural female voice. Run by release/videos.mjs."""
import json
import os
import sys

import numpy as np
import soundfile as sf
from kokoro_onnx import Kokoro

MODEL = os.environ.get("KOKORO_MODEL", "/opt/voice/kokoro-v1.0.onnx")
VOICES = os.environ.get("KOKORO_VOICES", "/opt/voice/voices-v1.0.bin")
VOICE = os.environ.get("KOKORO_VOICE", "af_heart")
SPEED = float(os.environ.get("KOKORO_SPEED", "0.94"))

kokoro = Kokoro(MODEL, VOICES)
for item in json.load(open(sys.argv[1], encoding="utf-8")):
    samples, rate = kokoro.create(item["text"], voice=VOICE, speed=SPEED, lang="en-us")
    samples = np.asarray(samples, dtype=np.float32)
    # Trim silence at both ends so every line starts on its cue, then add a short tail.
    loud = np.flatnonzero(np.abs(samples) > 0.004)
    if loud.size:
        samples = samples[max(0, loud[0] - rate // 50): loud[-1] + rate // 8]
    sf.write(item["file"], samples, rate, subtype="PCM_16")
    print("%5.2fs  %s" % (len(samples) / rate, item["text"]))
