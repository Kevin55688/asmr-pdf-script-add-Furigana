from app.services.html_generator import generate_html


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
