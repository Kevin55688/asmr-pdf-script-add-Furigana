from app.services.furigana import add_furigana, contains_kanji, kata_to_hira


def test_contains_kanji_with_kanji():
    assert contains_kanji("漢字") is True


def test_contains_kanji_with_hiragana():
    assert contains_kanji("ひらがな") is False


def test_contains_kanji_with_mixed():
    assert contains_kanji("食べる") is True


def test_contains_kanji_with_ascii():
    assert contains_kanji("hello") is False


def test_kata_to_hira_basic():
    assert kata_to_hira("カンジ") == "かんじ"


def test_kata_to_hira_mixed():
    assert kata_to_hira("タベル") == "たべる"


def test_kata_to_hira_already_hiragana():
    assert kata_to_hira("かんじ") == "かんじ"


def test_add_furigana_kanji_only():
    result = add_furigana("漢字")
    assert "<ruby>" in result
    assert "<rt>" in result
    assert "漢字" in result


def test_add_furigana_hiragana_unchanged():
    result = add_furigana("ひらがな")
    assert "<ruby>" not in result
    assert result == "ひらがな"


def test_add_furigana_mixed_sentence():
    result = add_furigana("東京は大きい都市です")
    # 漢字部分應該有 ruby 標籤
    assert "<ruby>東京" in result or "<ruby>東" in result
    # 平假名部分不應有 ruby 標籤
    assert "です</ruby>" not in result


def test_add_furigana_empty_string():
    result = add_furigana("")
    assert result == ""
