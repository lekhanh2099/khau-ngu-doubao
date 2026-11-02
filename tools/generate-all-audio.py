import asyncio, json, os, re
import edge_tts

VOICE_A = "zh-CN-YunxiNeural"     # Giọng nam Vân Hi tự nhiên, sinh động
VOICE_B = "zh-CN-XiaoyiNeural"    # Giọng nữ Hiểu Di hoạt bát, giàu cảm xúc khẩu ngữ đời sống
RATE = "+6%"                      # Tốc độ đàm thoại đời thực tự nhiên, không rề rà như máy đọc

async def generate_sentence(text, voice, idx):
    tmp_path = f"/tmp/edge_line_{idx}.mp3"
    comm = edge_tts.Communicate(text, voice, rate=RATE)
    await comm.save(tmp_path)
    with open(tmp_path, "rb") as f:
        data = f.read()
    if os.path.exists(tmp_path):
        os.remove(tmp_path)
    return data

async def process_topic(topic, sem):
    async with sem:
        topic_id = topic["id"]
        v2_lines = topic.get("v2_lines") or topic["lines"]
        print(f"-> Đang tạo audio cho {topic_id}: {topic['titleVi']} ({len(v2_lines)} câu)...")
        
        combined_bytes = bytearray()
        timings = []
        current_time = 0.0
        
        for i, line in enumerate(v2_lines):
            voice = VOICE_A if line["role"] == "A" else VOICE_B
            # Retry mechanism for network robustness
            data = None
            for retry in range(3):
                try:
                    data = await generate_sentence(line["zh"], voice, f"{topic_id}_{i}")
                    break
                except Exception as e:
                    if retry == 2:
                        raise e
                    await asyncio.sleep(1.0)
            
            duration = len(data) / 6000.0  # 48000 bps / 8 = 6000 bytes/sec
            start = round(current_time, 2)
            end = round(current_time + duration, 2)
            
            timings.append({
                "n": line["n"],
                "role": line["role"],
                "start": start,
                "end": end
            })
            current_time += duration
            combined_bytes.extend(data)
        
        out_mp3 = f"audio/{topic_id}.mp3"
        with open(out_mp3, "wb") as f_out:
            f_out.write(combined_bytes)
        
        print(f"✓ Hoàn thành {topic_id}: {out_mp3} ({len(combined_bytes)} bytes, {current_time:.1f}s)")
        return topic_id, {
            "file": f"audio/{topic_id}.mp3",
            "duration": round(current_time, 2),
            "timings": timings
        }

async def main():
    root = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
    data_js_path = os.path.join(root, "data.js")
    
    with open(data_js_path, "r", encoding="utf-8") as f:
        content = f.read()
    
    content = re.sub(r'^[^\n]*\n', '', content)
    content = re.sub(r'^window\.APP_DATA\s*=\s*', '', content)
    content = re.sub(r';\s*$', '', content)
    data = json.loads(content)
    
    audio_dir = os.path.join(root, "audio")
    os.makedirs(audio_dir, exist_ok=True)
    
    topics = []
    for lesson in data["lessons"]:
        for t in lesson["topics"]:
            topics.append(t)
    
    print(f"Bắt đầu tạo audio cho {len(topics)} đề thi...")
    
    # Giới hạn 2 topic đồng thời để tránh rate limit của Edge TTS
    sem = asyncio.Semaphore(2)
    tasks = [process_topic(t, sem) for t in topics]
    results = await asyncio.gather(*tasks)
    
    audio_manifest = dict(results)
    out_manifest_path = os.path.join(root, "tools", "audio-manifest.json")
    with open(out_manifest_path, "w", encoding="utf-8") as mf:
        json.dump(audio_manifest, mf, ensure_ascii=False, indent=2)
    
    print(f"\n🎉 Tất cả 13 file audio đã được tạo thành công! Ghi manifest vào {out_manifest_path}")

if __name__ == "__main__":
    asyncio.run(main())
