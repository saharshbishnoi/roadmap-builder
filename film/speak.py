"""Speaks the film's lines. Reads a JSON list of {"say", "file"} and writes one WAV per item.
The voice and speed are settings (FILM_VOICE, FILM_SPEED); the recorder caches every line it has spoken."""
import json
import os
import sys

import numpy as np
import soundfile as sf
from kokoro_onnx import Kokoro

VOICE = os.environ.get("FILM_VOICE", "af_heart")
SPEED = float(os.environ.get("FILM_SPEED", "1.05"))
kokoro = Kokoro(os.environ.get("KOKORO_MODEL", "/opt/voice/kokoro-v1.0.onnx"), os.environ.get("KOKORO_VOICES", "/opt/voice/voices-v1.0.bin"))

for item in json.load(open(sys.argv[1], encoding="utf-8")):
    samples, rate = kokoro.create(item["say"], voice=VOICE, speed=SPEED, lang="en-us")
    samples = np.asarray(samples, dtype=np.float32)
    loud = np.flatnonzero(np.abs(samples) > 0.004)          # trim silence so each line starts on its cue
    if loud.size:
        samples = samples[max(0, loud[0] - rate // 50): loud[-1] + rate // 10]
    sf.write(item["file"], samples, rate, subtype="PCM_16")
    print("spoke %5.2fs  %s" % (len(samples) / rate, item["say"]), flush=True)
