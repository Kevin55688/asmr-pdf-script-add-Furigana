from app.services.furigana import contains_kanji, kata_to_hira


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
