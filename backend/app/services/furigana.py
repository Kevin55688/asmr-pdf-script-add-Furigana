import re

import fugashi

_tagger = fugashi.Tagger()


def contains_kanji(text: str) -> bool:
    """判斷文字中是否包含漢字"""
    return bool(re.search(r"[\u4e00-\u9fff]", text))


def kata_to_hira(text: str) -> str:
    """片假名轉平假名"""
    return "".join(
        chr(ord(c) - 0x60) if "\u30a1" <= c <= "\u30f6" else c for c in text
    )
