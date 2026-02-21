from app.services.html_generator import generate_html, generate_html_from_script_txt


def test_generate_html_single_page():
    pages = [
        {"page_num": 1, "paragraphs": ["これはテストです"]}
    ]
    result = generate_html(pages)
    assert "<ruby>" in result or "これはテストです" in result
    assert "1" in result  # 頁碼


def test_generate_html_multiple_pages():
    pages = [
        {"page_num": 1, "paragraphs": ["第一頁"]},
        {"page_num": 2, "paragraphs": ["第二頁"]},
    ]
    result = generate_html(pages)
    assert "1" in result
    assert "2" in result


def test_generate_html_empty_pages():
    pages = [{"page_num": 1, "paragraphs": []}]
    result = generate_html(pages)
    assert isinstance(result, str)


def test_generate_html_preserves_paragraphs():
    pages = [
        {"page_num": 1, "paragraphs": ["段落一", "段落二"]}
    ]
    result = generate_html(pages)
    # 每個段落應該被包在 <p> 標籤中
    assert result.count("<p>") >= 2


# --- generate_html_from_script_txt ---

def test_script_txt_separator_becomes_hr():
    result = generate_html_from_script_txt("-----------------------")
    assert "<hr" in result


def test_script_txt_japanese_gets_furigana():
    result = generate_html_from_script_txt("東京に行く")
    assert "<ruby>" in result


def test_script_txt_english_preserved():
    result = generate_html_from_script_txt("You took long.")
    assert "You took long." in result


def test_script_txt_empty_lines_skipped():
    result = generate_html_from_script_txt("遅かったね\n\n東京")
    assert result.count("<p") == 2


def test_script_txt_full_block():
    text = "-----------------------\n遅かったね\nYou took long."
    result = generate_html_from_script_txt(text)
    assert "<hr" in result
    assert "<ruby>" in result
    assert "You took long." in result


def test_script_txt_wraps_in_section():
    result = generate_html_from_script_txt("テスト")
    assert 'class="page"' in result
    assert 'data-page="1"' in result
