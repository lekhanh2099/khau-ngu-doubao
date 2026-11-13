#!/usr/bin/env python3
"""Generate Kokoro v1.1-zh M4A audio tracks for Book 2."""

import argparse
from pathlib import Path
from tts_builder import ROOT_DIR, generate_book_audio


def main() -> None:
    parser = argparse.ArgumentParser(description="Generate Book 2 audio tracks")
    parser.add_argument("--only", nargs="*", help="Only regenerate specified topic IDs")
    parser.add_argument("--force", action="store_true", help="Ignore line WAV cache")
    args = parser.parse_args()

    generate_book_audio(
        data_path=ROOT_DIR / "tools" / "book2-data.json",
        manifest_path=ROOT_DIR / "tools" / "book2-audio-manifest.json",
        cache_dir=ROOT_DIR / "tools" / ".tts-cache",
        only_ids=set(args.only) if args.only else None,
        force=args.force,
    )


if __name__ == "__main__":
    main()
