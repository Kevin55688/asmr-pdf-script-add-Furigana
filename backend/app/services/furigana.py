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


def add_furigana(text: str) -> str:
    """將文字中的漢字加上振り仮名，回傳含 ruby 標籤的 HTML"""
    if not text:
        return ""

    result = []
    for word in _tagger(text):
        surface = word.surface
        reading = word.feature.kana

        if reading and contains_kanji(surface):
            hiragana = kata_to_hira(reading)
            result.append(
                f"<ruby>{surface}<rp>(</rp><rt>{hiragana}</rt><rp>)</rp></ruby>"
            )
        else:
            result.append(surface)

    return "".join(result)
