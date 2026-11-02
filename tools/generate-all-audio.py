"""
Tạo audio hội thoại A & B (bản V2) cho từng đề.

Vì sao bản cũ nghe "khựng khựng":
  1. Ghép thẳng byte MP3 của từng câu -> mỗi câu Edge TTS tự đệm ~0.5s im lặng ở đầu
     và cuối, nên giữa 2 lượt nói có khoảng lặng ~1s, nhịp bị đứt.
  2. Edge TTS ngắt rất lâu ở dấu phẩy (vd "嗨，" dừng 0.56s) -> nghe như bị vấp.
  3. Giọng XiaoyiNeural là giọng "Cartoon", ngữ điệu hay bị nhấp nhô thiếu ổn định.

Cách xử lý ở bản này:
  - Giải mã từng câu ra PCM (dùng afconvert có sẵn trên macOS), cắt im lặng đầu/cuối.
  - Rút ngắn các khoảng ngắt dài bên trong câu về mức tự nhiên của khẩu ngữ (~0.2–0.3s).
  - Chèn khoảng nghỉ đổi lượt cố định, tự nhiên giữa A và B.
  - Ghép trên PCM rồi mã hoá MỘT lần ra AAC (.m4a) -> không còn vết nối giữa các câu.
  - Timing karaoke tính chính xác theo số mẫu âm thanh (sample), không ước lượng theo byte.
  - Cache từng câu TTS trong tools/.tts-cache để chạy lại không phải gọi mạng.
"""
import array
import asyncio
import hashlib
import json
import os
import re
import subprocess
import tempfile
import wave

import edge_tts

VOICE_A = "zh-CN-YunxiNeural"      # Nam, tự nhiên, sáng giọng
VOICE_B = "zh-CN-XiaoxiaoNeural"   # Nữ, giọng chủ lực chất lượng cao nhất, ấm và ổn định
RATE = "+5%"

SR = 24000                 # Edge TTS trả về mono 24 kHz
FRAME = int(SR * 0.01)     # khung phân tích 10 ms
SIL_RMS = 120              # ngưỡng im lặng (~ -48 dBFS)
EDGE_KEEP = 0.03           # giữ lại 30 ms trước/sau tiếng nói khi cắt đầu/cuối
TURN_GAP = 0.38            # khoảng nghỉ đổi lượt A <-> B
LEAD_IN = 0.25
TAIL = 0.6
XFADE = int(SR * 0.006)    # crossfade 6 ms tại điểm cắt để không bị "tách"

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
CACHE_DIR = os.path.join(ROOT, "tools", ".tts-cache")


def target_pause(sec):
    """Map độ dài khoảng ngắt gốc -> độ dài mới (giữ tương quan phẩy < chấm)."""
    if sec <= 0.18:
        return sec
    return min(sec, 0.12 + 0.35 * sec, 0.34)


# ----------------------------------------------------------------- TTS + decode
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


# ----------------------------------------------------------------- xử lý im lặng
def silent_frames(pcm):
    flags = []
    for i in range(0, len(pcm), FRAME):
        seg = pcm[i:i + FRAME]
        rms = (sum(x * x for x in seg) / max(1, len(seg))) ** 0.5
        flags.append(rms < SIL_RMS)
    return flags


def crossfade_join(a, b):
    """Nối a + b với crossfade ngắn (cả hai đầu đều đang ở vùng im lặng)."""
    n = min(XFADE, len(a), len(b))
    if n == 0:
        return a + b
    out = a[:len(a) - n]
    for k in range(n):
        t = k / n
        out.append(int(a[len(a) - n + k] * (1 - t) + b[k] * t))
    out.extend(b[n:])
    return out


def clean_sentence(pcm):
    flags = silent_frames(pcm)
    voiced = [i for i, s in enumerate(flags) if not s]
    if not voiced:
        return array.array("h")
    keep = int(EDGE_KEEP * SR)
    start = max(0, voiced[0] * FRAME - keep)
    end = min(len(pcm), (voiced[-1] + 1) * FRAME + keep)

    # Tìm các khoảng lặng bên trong câu
    runs, s = [], None
    for i in range(voiced[0], voiced[-1] + 1):
        if flags[i] and s is None:
            s = i
        elif not flags[i] and s is not None:
            runs.append((s * FRAME, i * FRAME))
            s = None

    out = array.array("h")
    cursor = start
    for rs, re_ in runs:
        length = (re_ - rs) / SR
        new_len = target_pause(length)
        if new_len >= length - 0.01:
            continue
        cut = int((length - new_len) * SR)
        mid = rs + (re_ - rs) // 2
        a_end = mid - cut // 2
        b_start = a_end + cut
        out = crossfade_join(out, pcm[cursor:a_end]) if out else pcm[cursor:a_end]
        cursor = b_start
    piece = pcm[cursor:end]
    out = crossfade_join(out, piece) if out else piece

    # fade-in/out 8 ms ở hai đầu câu
    f = min(int(SR * 0.008), len(out) // 2)
    for k in range(f):
        out[k] = int(out[k] * k / f)
        out[-1 - k] = int(out[-1 - k] * k / f)
    return out


def silence(sec):
    return array.array("h", [0]) * int(sec * SR)


# ----------------------------------------------------------------- ghép từng đề
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
        seg = clean_sentence(decode_pcm(path))
        start = len(track) / SR
        track.extend(seg)
        end = len(track) / SR
        timings.append({"n": line["n"], "role": line["role"],
                        "start": round(start, 2), "end": round(end, 2)})
    track.extend(silence(TAIL))

    # Cho khoảng trống giữa 2 câu thuộc về câu trước để karaoke không bị "tắt" giữa chừng
    for a, b in zip(timings, timings[1:]):
        a["end"] = b["start"]
    timings[-1]["end"] = round(len(track) / SR, 2)

    out_rel = f"audio/{topic_id}.m4a"
    with tempfile.TemporaryDirectory() as td:
        wav = os.path.join(td, "t.wav")
        with wave.open(wav, "wb") as w:
            w.setnchannels(1)
            w.setsampwidth(2)
            w.setframerate(SR)
            w.writeframes(track.tobytes())
        subprocess.run(
            ["afconvert", "-f", "m4af", "-d", "aac", "-b", "64000", "-q", "127",
             wav, os.path.join(ROOT, out_rel)],
            check=True,
        )
    dur = round(len(track) / SR, 2)
    print(f"✓ {topic_id}: {len(lines)} câu, {dur:.1f}s")
    return topic_id, {"file": out_rel, "duration": dur, "timings": timings}


async def main():
    with open(os.path.join(ROOT, "data.js"), encoding="utf-8") as f:
        content = f.read()
    content = re.sub(r"^[^\n]*\n", "", content)
    content = re.sub(r"^window\.APP_DATA\s*=\s*", "", content)
    content = re.sub(r";\s*$", "", content)
    data = json.loads(content)

    os.makedirs(os.path.join(ROOT, "audio"), exist_ok=True)
    topics = [t for lesson in data["lessons"] for t in lesson["topics"]]
    sem = asyncio.Semaphore(2)
    results = await asyncio.gather(*(process_topic(t, sem) for t in topics))

    with open(os.path.join(ROOT, "tools", "audio-manifest.json"), "w", encoding="utf-8") as mf:
        json.dump(dict(results), mf, ensure_ascii=False, indent=2)
    print(f"\n🎉 Đã tạo {len(results)} file audio.")


if __name__ == "__main__":
    asyncio.run(main())
