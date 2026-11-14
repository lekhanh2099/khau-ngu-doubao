"""Shared Kokoro-82M-v1.1-zh TTS pipeline for Mandarin dialogue audio tracks."""

import hashlib
import json
import os
import re
import subprocess
import sys
import time
import wave
from pathlib import Path

ROOT_DIR = Path(__file__).resolve().parent.parent
VENV_PYTHON = ROOT_DIR / "tools" / ".tts-venv" / "bin" / "python"


def ensure_venv():
    """Re-exec under tools/.tts-venv when invoked with a Python missing kokoro."""
    try:
        import kokoro  # noqa: F401
        import numpy  # noqa: F401
    except ImportError:
        if VENV_PYTHON.exists() and Path(sys.executable).resolve() != VENV_PYTHON.resolve():
            os.execv(str(VENV_PYTHON), [str(VENV_PYTHON), *sys.argv])
        raise


ensure_venv()

import numpy as np  # noqa: E402
import pypinyin
import torch  # noqa: E402
from kokoro import KPipeline  # noqa: E402

KOKORO_REPO = "hexgrad/Kokoro-82M-v1.1-zh"
PHRASE_OVERRIDES = {
    "麻麻": [["má"], ["má"]],
    "麻麻的": [["má"], ["má"], ["de"]],
    "少不了": [["shǎo"], ["bu"], ["liǎo"]],
    "舍得": [["shě"], ["de"]],
    "哪些": [["nǎ"], ["xiē"]],
    "天哪": [["tiān"], ["na"]],
    "鼻塞": [["bí"], ["sè"]],
    "一针见血": [["yì"], ["zhēn"], ["jiàn"], ["xuè"]],
    "头一次": [["tóu"], ["yí"], ["cì"]],
}
VOICE_A = "zm_010"
VOICE_B = "zf_001"
SPEED = 0.98

SR = 24000
FRAME = int(SR * 0.01)  # 10ms RMS window
SIL_RMS = 12.0
KEEP_START = 0.06
KEEP_END = 0.18
INTER_CHUNK_GAP = 0.22
TURN_GAP = 0.36
LEAD_IN = 0.25
TAIL = 0.50
FADE_SEC = 0.025
TARGET_ACTIVE_RMS = 3200.0
MAX_PEAK = 29500.0
AAC_BITRATE = "64000"

LETTER_IPA = {
    "A": "ˈeɪ", "B": "bˈiː", "C": "sˈiː", "D": "dˈiː", "E": "ˈiː",
    "F": "ˈɛf", "G": "dʒˈiː", "H": "ˈeɪtʃ", "I": "ˈaɪ", "J": "dʒˈeɪ",
    "K": "kˈeɪ", "L": "ˈɛl", "M": "ˈɛm", "N": "ˈɛn", "O": "ˈoʊ",
    "P": "pˈiː", "Q": "kjˈuː", "R": "ˈɑːɹ", "S": "ˈɛs", "T": "tˈiː",
    "U": "jˈuː", "V": "vˈiː", "W": "dˈʌbəljˌuː", "X": "ˈɛks", "Y": "wˈaɪ",
    "Z": "zˈiː",
}


def en_callable(text: str) -> str:
    """Convert embedded English acronyms (AA, AI, K, T, ...) to Kokoro IPA."""
    return " ".join(LETTER_IPA[ch] for ch in text.upper() if ch in LETTER_IPA)


def trim_edges(pcm_i16: np.ndarray) -> np.ndarray:
    """Trim excessive leading/trailing Kokoro silence while preserving soft breath cushions."""
    n = len(pcm_i16)
    if n < FRAME * 3:
        return pcm_i16

    usable = (n // FRAME) * FRAME
    frames = pcm_i16[:usable].reshape(-1, FRAME).astype(np.float32)
    rms = np.sqrt(np.mean(frames * frames, axis=1))
    active = np.flatnonzero(rms > SIL_RMS)
    if len(active) == 0:
        return pcm_i16[: int(0.30 * SR)]

    start = max(0, int(active[0]) * FRAME - int(KEEP_START * SR))
    end = min(n, (int(active[-1]) + 1) * FRAME + int(KEEP_END * SR))
    return pcm_i16[start:end]


def balance_and_fade(pcm_i16: np.ndarray) -> np.ndarray:
    """Match active loudness across speakers without clipping and smooth turn edges."""
    if len(pcm_i16) == 0:
        return pcm_i16

    arr = pcm_i16.astype(np.float32)
    usable = (len(arr) // FRAME) * FRAME
    if usable >= FRAME:
        frames = arr[:usable].reshape(-1, FRAME)
        rms = np.sqrt(np.mean(frames * frames, axis=1))
        active_rms = rms[rms > SIL_RMS * 2.5]
        if len(active_rms) > 0:
            cur_rms = float(np.sqrt(np.mean(active_rms * active_rms)))
            if cur_rms > 1.0:
                gain = min(2.5, TARGET_ACTIVE_RMS / cur_rms)
                peak = float(np.max(np.abs(arr)))
                if peak * gain > MAX_PEAK:
                    gain = MAX_PEAK / peak
                arr *= gain

    fade_n = min(int(FADE_SEC * SR), len(arr) // 4)
    if fade_n > 1:
        ramp = np.linspace(0.0, 1.0, fade_n, dtype=np.float32)
        arr[:fade_n] *= ramp
        arr[-fade_n:] *= ramp[::-1]

    return np.clip(np.round(arr), -32767, 32767).astype(np.int16)


def read_wav_i16(path: Path) -> np.ndarray:
    """Read a mono int16 WAV file into a numpy array."""
    with wave.open(str(path), "rb") as wf:
        frames = wf.readframes(wf.getnframes())
    return np.frombuffer(frames, dtype=np.int16).copy()


def write_wav_i16(path: Path, pcm_i16: np.ndarray) -> None:
    """Write a mono int16 24kHz WAV file."""
    path.parent.mkdir(parents=True, exist_ok=True)
    with wave.open(str(path), "wb") as wf:
        wf.setnchannels(1)
        wf.setsampwidth(2)
        wf.setframerate(SR)
        wf.writeframes(pcm_i16.tobytes())


PROCLITIC_WORDS = {
    "我3", "我2", "ㄋㄧ3", "ㄋㄧ2", "ㄋ阴2", "ㄊㄚ1",
    "ㄗㄢ2ㄇㄣ5", "我3ㄇㄣ5", "ㄋㄧ3ㄇㄣ5", "ㄊㄚ1ㄇㄣ5",
}


def count_syllables(word: str) -> int:
    """Count tone-marked Mandarin syllables inside a grouped phoneme token."""
    return sum(1 for ch in word if ch in "12345")


def is_enclitic(word: str) -> bool:
    """Return True for monosyllabic neutral-tone or erhua enclitics that attach backward."""
    return count_syllables(word) == 1 and (word.endswith("5") or "R" in word)


def regroup_clause_proclitic(ps: str) -> str:
    """Merge monosyllabic enclitics backward and proclitics/monosyllables forward inside each clause."""
    tokens = re.split(r"([,.;?!: ]+)", ps)
    out = []
    for tok in tokens:
        if not tok or re.fullmatch(r"[,.;?!: ]+", tok):
            out.append(tok)
            continue
        words = [w for w in tok.split("/") if w]
        if len(words) <= 1:
            out.append(tok)
            continue
        step1: list[str] = []
        for w in words:
            if step1 and is_enclitic(w):
                step1[-1] = step1[-1] + w
            else:
                step1.append(w)
        merged: list[str] = []
        i = 0
        while i < len(step1):
            w = step1[i]
            syl = count_syllables(w)
            if (syl == 1 or w in PROCLITIC_WORDS) and i + 1 < len(step1):
                merged.append(w + step1[i + 1])
                i += 2
            else:
                merged.append(w)
                i += 1
        out.append("/".join(merged))
    return "".join(out)


def synth_clause_tokens(pipe: KPipeline, ps: str, voice: str, speed: float = SPEED) -> np.ndarray:
    """Run KModel with smooth Mandarin prosody alignment (no mid-clause stalls, clear breath pauses)."""
    ps = regroup_clause_proclitic(ps.strip())
    if not ps:
        return np.zeros(0, dtype=np.float32)
    model = pipe.model
    pack = pipe.load_voice(voice).to(model.device)
    input_ids = list(
        filter(lambda i: i is not None, map(lambda p: model.vocab.get(p), ps))
    )
    if not input_ids:
        return np.zeros(0, dtype=np.float32)
    if len(input_ids) > 510:
        input_ids = input_ids[:510]

    ref_s = pack[len(input_ids) - 1]
    ids_tensor = torch.LongTensor([[0, *input_ids, 0]]).to(model.device)
    input_lengths = torch.LongTensor([ids_tensor.shape[-1]]).to(model.device)
    text_mask = torch.arange(input_lengths.max()).unsqueeze(0).expand(input_lengths.shape[0], -1).type_as(input_lengths)
    text_mask = torch.gt(text_mask + 1, input_lengths).to(model.device)

    with torch.no_grad():
        bert_dur = model.bert(ids_tensor, attention_mask=(~text_mask).int())
        d_en = model.bert_encoder(bert_dur).transpose(-1, -2)
        s = ref_s[:, 128:]
        d = model.predictor.text_encoder(d_en, s, input_lengths, text_mask)
        x, _ = model.predictor.lstm(d)
        duration = model.predictor.duration_proj(x)
        duration = torch.sigmoid(duration).sum(axis=-1) / speed
        pred_dur = torch.round(duration).clamp(min=1).long().squeeze()
        if pred_dur.ndim == 0:
            pred_dur = pred_dur.unsqueeze(0)

        slash_id = model.vocab.get("/")
        comma_ids = {model.vocab.get(p) for p in [",", ";", ":"] if model.vocab.get(p) is not None}
        stop_ids = {model.vocab.get(p) for p in [".", "?", "!"] if model.vocab.get(p) is not None}
        tone_ids = {model.vocab.get(p) for p in ["1", "2", "3", "4", "5"] if model.vocab.get(p) is not None}
        boundary_ids = {slash_id, 0} | comma_ids | stop_ids

        seq = ids_tensor[0].tolist()
        for idx, tid in enumerate(seq):
            if tid == slash_id:
                pred_dur[idx] = 1
            elif tid in comma_ids and idx < len(seq) - 3:
                if pred_dur[idx] < 5:
                    pred_dur[idx] = 5
            elif tid in stop_ids and idx < len(seq) - 3:
                if pred_dur[idx] < 9:
                    pred_dur[idx] = 9
            elif tid in tone_ids and idx + 1 < len(seq):
                next_tid = seq[idx + 1]
                if next_tid not in boundary_ids and idx >= 1:
                    v_dur = int(pred_dur[idx - 1].item())
                    t_dur = int(pred_dur[idx].item())
                    if v_dur + t_dur > 5:
                        pred_dur[idx] = max(2, 5 - v_dur)

        indices = torch.repeat_interleave(
            torch.arange(ids_tensor.shape[1], device=model.device), pred_dur
        )
        pred_aln_trg = torch.zeros(
            (ids_tensor.shape[1], indices.shape[0]), device=model.device
        )
        pred_aln_trg[indices, torch.arange(indices.shape[0], device=model.device)] = 1
        pred_aln_trg = pred_aln_trg.unsqueeze(0).to(model.device)
        en = d.transpose(-1, -2) @ pred_aln_trg
        F0_pred, N_pred = model.predictor.F0Ntrain(en, s)
        t_en = model.text_encoder(ids_tensor, input_lengths, text_mask)
        asr = t_en @ pred_aln_trg
        audio = model.decoder(asr, F0_pred, N_pred, ref_s[:, :128]).squeeze().cpu().numpy().astype(np.float32)
    return audio


def synthesize_line_pcm(pipe: KPipeline, text: str, voice: str, cache_dir: Path, force: bool = False) -> np.ndarray:
    """Synthesize a single Mandarin turn with Kokoro v1.1-zh and cache normalized PCM."""
    clean = text.strip()
    key = hashlib.sha1(f"kokoro-v1.1-zh-v3|{voice}|{SPEED:.2f}|{clean}".encode("utf-8")).hexdigest()[:16]
    wav_cache = cache_dir / f"kokoro_{voice}_{key}.wav"
    if wav_cache.exists() and not force:
        return read_wav_i16(wav_cache)

    chunks = []
    sentences = [s.strip() for s in re.split(r"(?<=[。？！!?;；])", clean) if s.strip()]
    for sent in sentences:
        ps, _ = pipe.g2p(sent)
        arr = synth_clause_tokens(pipe, ps, voice=voice, speed=SPEED)
        if len(arr) == 0:
            continue
        chunk_i16 = np.clip(arr * 32767.0, -32767, 32767).astype(np.int16)
        chunks.append(trim_edges(chunk_i16))

    if not chunks:
        pcm = np.zeros(int(0.30 * SR), dtype=np.int16)
    elif len(chunks) == 1:
        pcm = balance_and_fade(chunks[0])
    else:
        gap = np.zeros(int(INTER_CHUNK_GAP * SR), dtype=np.int16)
        joined = []
        for idx, ch in enumerate(chunks):
            joined.append(ch)
            if idx < len(chunks) - 1:
                joined.append(gap)
        pcm = balance_and_fade(np.concatenate(joined))

    write_wav_i16(wav_cache, pcm)
    return pcm


def encode_m4a(wav_path: Path, m4a_path: Path) -> None:
    """Encode 24kHz mono WAV to 64kbps AAC M4A via macOS afconvert."""
    m4a_path.parent.mkdir(parents=True, exist_ok=True)
    cmd = [
        "/usr/bin/afconvert",
        "-f", "m4af",
        "-d", "aac",
        "-b", AAC_BITRATE,
        str(wav_path),
        str(m4a_path),
    ]
    subprocess.run(cmd, check=True, stdout=subprocess.DEVNULL, stderr=subprocess.PIPE)


def build_topic_audio(pipe: KPipeline, topic: dict, root_dir: Path, cache_dir: Path, force: bool = False) -> dict:
    """Build full multi-turn M4A dialogue and line timings for a single topic."""
    topic_id = topic["id"]
    lines = topic.get("v2_lines") or topic.get("lines") or []
    topic["lines"] = lines
    parts = [np.zeros(int(LEAD_IN * SR), dtype=np.int16)]
    cursor = int(LEAD_IN * SR)
    turn_gap_samples = int(TURN_GAP * SR)
    tail_samples = int(TAIL * SR)
    timings = []

    for idx, ln in enumerate(lines):
        role = ln.get("role", "A")
        voice = VOICE_A if role == "A" else VOICE_B
        line_pcm = synthesize_line_pcm(pipe, ln["zh"], voice, cache_dir, force=force)
        start_sec = round(cursor / SR, 2)
        parts.append(line_pcm)
        cursor += len(line_pcm)

        pad = turn_gap_samples if idx < len(lines) - 1 else tail_samples
        parts.append(np.zeros(pad, dtype=np.int16))
        cursor += pad

        end_sec = round(cursor / SR, 2)
        timings.append({
            "n": ln.get("n") or f"{idx + 1:02d}",
            "role": role,
            "start": start_sec,
            "end": end_sec,
        })

    full_pcm = np.concatenate(parts)
    dur = round(len(full_pcm) / SR, 2)
    tmp_wav = cache_dir / f"_tmp_{topic_id}.wav"
    out_rel = f"audio/{topic_id}.m4a"
    out_m4a = root_dir / out_rel

    write_wav_i16(tmp_wav, full_pcm)
    try:
        encode_m4a(tmp_wav, out_m4a)
    finally:
        if tmp_wav.exists():
            tmp_wav.unlink()

    topic["audio"] = out_rel
    topic["audioDuration"] = dur
    topic["audioTimings"] = timings
    return {"file": out_rel, "duration": dur, "timings": timings}


def generate_book_audio(
    data_path: Path,
    manifest_path: Path,
    cache_dir: Path,
    only_ids: set[str] | None = None,
    force: bool = False,
) -> None:
    """Generate audio tracks for all (or filtered) topics in a book JSON and update its manifest."""
    data_path = Path(data_path)
    manifest_path = Path(manifest_path)
    cache_dir = Path(cache_dir)
    cache_dir.mkdir(parents=True, exist_ok=True)

    with open(data_path, "r", encoding="utf-8") as fh:
        book_data = json.load(fh)

    manifest = {}
    if manifest_path.exists():
        with open(manifest_path, "r", encoding="utf-8") as fh:
            manifest = json.load(fh)

    topics = [
        topic
        for lesson in book_data.get("lessons", [])
        for topic in lesson.get("topics", [])
        if not only_ids or topic["id"] in only_ids
    ]
    if not topics:
        print(f"No matching topics in {data_path}")
        return

    print(f"Loading Kokoro pipeline ({KOKORO_REPO}, A={VOICE_A}, B={VOICE_B}, speed={SPEED})...")
    pipe = KPipeline(lang_code="z", repo_id=KOKORO_REPO, device="cpu", en_callable=en_callable)
    pypinyin.load_phrases_dict(PHRASE_OVERRIDES)

    t0 = time.time()
    for idx, topic in enumerate(topics, 1):
        tid = topic["id"]
        ts = time.time()
        entry = build_topic_audio(pipe, topic, ROOT_DIR, cache_dir, force=force)
        manifest[tid] = entry
        m4a_kb = (ROOT_DIR / entry["file"]).stat().st_size / 1024.0
        print(f"[{idx}/{len(topics)}] {tid}: {entry['duration']}s ({m4a_kb:.1f} KB) in {time.time() - ts:.1f}s")

    with open(data_path, "w", encoding="utf-8") as fh:
        json.dump(book_data, fh, ensure_ascii=False, indent=2)
        fh.write("\n")

    with open(manifest_path, "w", encoding="utf-8") as fh:
        json.dump(manifest, fh, ensure_ascii=False, indent=2)
        fh.write("\n")

    print(f"Finished {len(topics)} topics for {data_path.name} in {time.time() - t0:.1f}s")
