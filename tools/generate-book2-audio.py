"""
Tạo audio hội thoại A & B chuẩn chất lượng cao cho Book 2: 《汉语口语教程》 (13 tình huống).
Giọng A: zh-CN-YunxiNeural (Nam, tự nhiên, sinh động, chuẩn Bắc Kinh)
Giọng B: zh-CN-XiaoxiaoNeural (Nữ, ấm áp, truyền cảm, tự nhiên)
Rate: +0% (chuẩn nhịp nói đời thường)

Điểm cải tiến loại bỏ hoàn toàn hiện tượng vấp/khựng:
- TUYỆT ĐỐI KHÔNG cắt xén bên trong câu. Giữ nguyên 100% ngữ điệu, hơi thở và khoảng ngắt tự nhiên do AI mô hình hoá.
- Chỉ cắt bỏ phần im lặng đệm thừa ở đầu (pre-speech) và cuối (post-speech) của từng file.
- Khoảng nghỉ đổi lượt thoại giữa A và B được cố định ở 0.40s tự nhiên.
- Mã hoá trực tiếp sang AAC mono .m4a chất lượng cao 64kbps bằng afconvert.
- Timing karaoke được tính chính xác theo từng sample âm thanh.
"""
import array
import asyncio
import hashlib
import json
import os
import subprocess
import tempfile
import wave

import edge_tts

VOICE_A = "zh-CN-YunxiNeural"
VOICE_B = "zh-CN-XiaoxiaoNeural"
RATE = "+0%"

SR = 24000
FRAME = int(SR * 0.01)
SIL_RMS = 100
TURN_GAP = 0.40
LEAD_IN = 0.25
TAIL = 0.50

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
CACHE_DIR = os.path.join(ROOT, "tools", ".tts-cache")


async def tts_mp3(text, voice):
    os.makedirs(CACHE_DIR, exist_ok=True)
    key = hashlib.sha1(f"{voice}|{RATE}|{text}".encode()).hexdigest()[:16]
    path = os.path.join(CACHE_DIR, f"{key}.mp3")
    if not os.path.exists(path) or os.path.getsize(path) == 0:
        for attempt in range(4):
            try:
                await edge_tts.Communicate(text, voice, rate=RATE).save(path)
                break
            except Exception:
                if attempt == 3:
                    raise
                await asyncio.sleep(1.5)
    return path


def decode_pcm(mp3_path):
    with tempfile.TemporaryDirectory() as td:
        wav = os.path.join(td, "x.wav")
        subprocess.run(
            ["afconvert", "-f", "WAVE", "-d", f"LEI16@{SR}", "-c", "1", mp3_path, wav],
            check=True,
        )
        with wave.open(wav) as w:
            assert w.getframerate() == SR and w.getnchannels() == 1
            return array.array("h", w.readframes(w.getnframes()))


def silent_frames(pcm):
    flags = []
    for i in range(0, len(pcm), FRAME):
        seg = pcm[i:i + FRAME]
        rms = (sum(x * x for x in seg) / max(1, len(seg))) ** 0.5
        flags.append(rms < SIL_RMS)
    return flags


def trim_speech_pcm(pcm):
    """
    Chỉ cắt phần im lặng đệm thừa ở đầu và đuôi câu.
    Không cắt bên trong câu để giữ trọn vẹn ngữ điệu tự nhiên, không bị khựng vấp.
    """
    flags = silent_frames(pcm)
    voiced = [i for i, s in enumerate(flags) if not s]
    if not voiced:
        return pcm
    keep_start = int(0.04 * SR)
    keep_end = int(0.06 * SR)
    start = max(0, voiced[0] * FRAME - keep_start)
    end = min(len(pcm), (voiced[-1] + 1) * FRAME + keep_end)
    out = pcm[start:end]
    f = min(int(SR * 0.006), len(out) // 2)
    for k in range(f):
        out[k] = int(out[k] * k / f)
        out[-1 - k] = int(out[-1 - k] * k / f)
    return out


def silence(sec):
    return array.array("h", [0]) * int(sec * SR)


async def process_topic(topic, sem):
    topic_id = topic["id"]
    lines = topic.get("v2_lines") or topic["lines"]
    async with sem:
        paths = []
        for line in lines:
            voice = VOICE_A if line["role"] == "A" else VOICE_B
            paths.append(await tts_mp3(line["zh"], voice))

    track = silence(LEAD_IN)
    timings = []
    for i, (line, path) in enumerate(zip(lines, paths)):
        if i > 0:
            track.extend(silence(TURN_GAP))
        seg = trim_speech_pcm(decode_pcm(path))
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

    # Đồng bộ karaoke: mỗi câu kéo dài tới đầu câu kế tiếp
    for a, b in zip(timings, timings[1:]):
        a["end"] = b["start"]
    timings[-1]["end"] = round(len(track) / SR, 2)

    out_rel = f"audio/{topic_id}.m4a"
    out_path = os.path.join(ROOT, out_rel)
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
                "-b", "64000",
                "-q", "127",
                wav,
                out_path,
            ],
            check=True,
        )
    dur = round(len(track) / SR, 2)
    print(f"✓ {topic_id}: {len(lines)} câu, {dur:.1f}s -> {out_rel}")
    return topic_id, {"file": out_rel, "duration": dur, "timings": timings}


async def main():
    b2_path = os.path.join(ROOT, "tools", "book2-data.json")
    with open(b2_path, encoding="utf-8") as f:
        book2 = json.load(f)

    os.makedirs(os.path.join(ROOT, "audio"), exist_ok=True)
    topics = [t for lesson in book2["lessons"] for t in lesson["topics"]]
    print(f"Bắt đầu tạo audio tự nhiên, mượt mà cho {len(topics)} tình huống Book 2...")

    sem = asyncio.Semaphore(3)
    results = await asyncio.gather(*(process_topic(t, sem) for t in topics))

    manifest_path = os.path.join(ROOT, "tools", "book2-audio-manifest.json")
    manifest_data = dict(results)
    with open(manifest_path, "w", encoding="utf-8") as mf:
        json.dump(manifest_data, mf, ensure_ascii=False, indent=2)

    # Cập nhật trực tiếp vào book2-data.json
    for l in book2["lessons"]:
        for t in l["topics"]:
            if t["id"] in manifest_data:
                t["audio"] = manifest_data[t["id"]]["file"]
                t["audioDuration"] = manifest_data[t["id"]]["duration"]
                t["audioTimings"] = manifest_data[t["id"]]["timings"]

    with open(b2_path, "w", encoding="utf-8") as f:
        json.dump(book2, f, ensure_ascii=False, indent=2)

    print(f"\n🎉 Hoàn thành xuất sắc 13/13 audio cho Book 2! Đã cập nhật book2-data.json và {manifest_path}")


if __name__ == "__main__":
    asyncio.run(main())
