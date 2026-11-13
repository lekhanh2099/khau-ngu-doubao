"""Tạo audio hội thoại A & B tự nhiên cho Book 2: 《汉语口语教程》."""
import asyncio
import os
import sys

sys.path.insert(0, os.path.dirname(__file__))
from tts_builder import generate_book_audio

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))

if __name__ == "__main__":
    asyncio.run(
        generate_book_audio(
            os.path.join(ROOT, "tools", "book2-data.json"),
            os.path.join(ROOT, "tools", "book2-audio-manifest.json"),
            ROOT,
            "Book 2",
        )
    )
