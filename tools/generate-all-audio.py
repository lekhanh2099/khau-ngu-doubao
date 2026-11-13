"""Tạo audio hội thoại A & B tự nhiên cho Book 1: 《汉语口语速成 · 中级篇》."""
import asyncio
import os
import sys

sys.path.insert(0, os.path.dirname(__file__))
from tts_builder import generate_book_audio

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))

if __name__ == "__main__":
    asyncio.run(
        generate_book_audio(
            os.path.join(ROOT, "tools", "book1-data.json"),
            os.path.join(ROOT, "tools", "audio-manifest.json"),
            ROOT,
            "Book 1",
        )
    )
