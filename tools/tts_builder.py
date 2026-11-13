"""Shared natural Edge-TTS dialogue builder for Book 1 and Book 2.

Avoids clipped sentence heads/tails by trimming only near-zero digital padding
(SIL_RMS=12), preserving full natural exhale decay, matching speaker loudness,
and adding relaxed conversational turn-taking gaps.
"""
import array
import asyncio
import hashlib
import json
import math
import os
import subprocess
import tempfile
import wave

import edge_tts

VOICE_A = "zh-CN-YunxiNeural"
VOICE_B = "zh-CN-XiaoxiaoNeural"
RATE = "-5%"

SR = 24000
FRAME = int(SR * 0.01)
SIL_RMS = 12
KEEP_START = 0.08
KEEP_END = 0.24
TURN_GAP = 0.38
LEAD_IN = 0.25
TAIL = 0.50
FADE_SEC = 0.025
TARGET_ACTIVE_RMS = 3200.0
AAC_BITRATE = "64000"


async def tts_mp3(text, voice, cache_dir, rate=RATE):
    """Synthesize or fetch cached MP3 for a single dialogue line."""
    os.makedirs(cache_dir, exist_ok=True)
    key = hashlib.sha1(f"{voice}|{rate}|{text}".encode()).hexdigest()[:16]
    path = os.path.join(cache_dir, f"{key}.mp3")
    if not os.path.exists(path) or os.path.getsize(path) == 0:
        for attempt in range(4):
            try:
                await edge_tts.Communicate(text, voice, rate=rate).save(path)
                break
            except Exception:
                if attempt == 3:
                    raise
                await asyncio.sleep(1.5)
    return path


def decode_pcm(mp3_path):
    """Decode MP3 into 24kHz mono 16-bit signed PCM."""
    with tempfile.TemporaryDirectory() as td:
        wav = os.path.join(td, "x.wav")
        subprocess.run(
            ["afconvert", "-f", "WAVE", "-d", f"LEI16@{SR}", "-c", "1", mp3_path, wav],
            check=True,
        )
        with wave.open(wav) as w:
            assert w.getframerate() == SR and w.getnchannels() == 1
            return array.array("h", w.readframes(w.getnframes()))


def trim_and_balance_pcm(pcm):
    """Trim pure leading/trailing digital silence while keeping full breath decay."""
    frame_rms = []
    for i in range(0, len(pcm), FRAME):
        seg = pcm[i:i + FRAME]
        rms = (sum(x * x for x in seg) / max(1, len(seg))) ** 0.5
        frame_rms.append(rms)

    voiced = [i for i, r in enumerate(frame_rms) if r >= SIL_RMS]
    if not voiced:
        return pcm

    start = max(0, voiced[0] * FRAME - int(KEEP_START * SR))
    end = min(len(pcm), (voiced[-1] + 1) * FRAME + int(KEEP_END * SR))
    out = pcm[start:end]

    # Balance speaker loudness gently using active voiced frames (RMS >= 200)
    active_sq = [r * r for r in frame_rms if r >= 200]
    if active_sq:
        active_rms = (sum(active_sq) / len(active_sq)) ** 0.5
        if active_rms > 0:
            peak = max((abs(x) for x in out), default=1)
            gain = min(TARGET_ACTIVE_RMS / active_rms, 28000.0 / max(1, peak), 1.6)
            if abs(gain - 1.0) > 0.05:
                for idx in range(len(out)):
                    val = int(out[idx] * gain)
                    out[idx] = max(-32767, min(32767, val))

    # Smooth half-cosine edge fades so transitions have zero clicks
    fade_len = min(int(SR * FADE_SEC), len(out) // 2)
    if fade_len > 1:
        for k in range(fade_len):
            w = 0.5 * (1.0 - math.cos(math.pi * k / fade_len))
            out[k] = int(out[k] * w)
            out[-1 - k] = int(out[-1 - k] * w)
    return out


def silence(sec):
    """Return mono PCM silence buffer of length `sec` seconds."""
    return array.array("h", [0]) * int(sec * SR)


async def process_topic(topic, sem, root_dir, cache_dir):
    """Build .m4a dialogue audio and exact karaoke timings for one topic."""
    topic_id = topic["id"]
    lines = topic.get("v2_lines") or topic["lines"]
    async with sem:
        paths = await asyncio.gather(
            *(
                tts_mp3(line["zh"], VOICE_A if line["role"] == "A" else VOICE_B, cache_dir)
                for line in lines
            )
        )

    track = silence(LEAD_IN)
    timings = []
    for i, (line, path) in enumerate(zip(lines, paths)):
        if i > 0:
            track.extend(silence(TURN_GAP))
        seg = trim_and_balance_pcm(decode_pcm(path))
        start = len(track) / SR
        track.extend(seg)
        end = len(track) / SR
        timings.append({
            "n": line["n"],
            "role": line["role"],
            "start": round(start, 2),
            "end": round(end, 2),
        })
    track.extend(silence(TAIL))

    for a, b in zip(timings, timings[1:]):
        a["end"] = b["start"]
    timings[-1]["end"] = round(len(track) / SR, 2)

    out_rel = f"audio/{topic_id}.m4a"
    out_path = os.path.join(root_dir, out_rel)
    with tempfile.TemporaryDirectory() as td:
        wav = os.path.join(td, "t.wav")
        with wave.open(wav, "wb") as w:
            w.setnchannels(1)
            w.setsampwidth(2)
            w.setframerate(SR)
            w.writeframes(track.tobytes())
        subprocess.run(
            [
                "afconvert",
                "-f", "m4af",
                "-d", "aac",
                "-b", AAC_BITRATE,
                "-q", "127",
                wav,
                out_path,
            ],
            check=True,
        )
    dur = round(len(track) / SR, 2)
    print(f"✓ {topic_id}: {len(lines)} câu, {dur:.1f}s -> {out_rel}")
    return topic_id, {"file": out_rel, "duration": dur, "timings": timings}


async def generate_book_audio(data_json_path, manifest_json_path, root_dir, label):
    """Synthesize all dialogue audio files for a book JSON dataset."""
    with open(data_json_path, encoding="utf-8") as f:
        book_data = json.load(f)

    cache_dir = os.path.join(root_dir, "tools", ".tts-cache")
    os.makedirs(os.path.join(root_dir, "audio"), exist_ok=True)
    topics = [t for lesson in book_data["lessons"] for t in lesson["topics"]]
    print(f"Tạo audio tự nhiên (RATE={RATE}, SIL_RMS={SIL_RMS}) cho {len(topics)} đề {label}...")

    sem = asyncio.Semaphore(4)
    results = await asyncio.gather(*(process_topic(t, sem, root_dir, cache_dir) for t in topics))

    manifest_data = dict(results)
    with open(manifest_json_path, "w", encoding="utf-8") as mf:
        json.dump(manifest_data, mf, ensure_ascii=False, indent=2)

    for lesson in book_data["lessons"]:
        for t in lesson["topics"]:
            if t["id"] in manifest_data:
                t["audio"] = manifest_data[t["id"]]["file"]
                t["audioDuration"] = manifest_data[t["id"]]["duration"]
                t["audioTimings"] = manifest_data[t["id"]]["timings"]

    with open(data_json_path, "w", encoding="utf-8") as f:
        json.dump(book_data, f, ensure_ascii=False, indent=2)

    print(f"🎉 Hoàn thành {len(results)}/{len(topics)} audio cho {label}!")
