from app.services.txt_extractor import extract_text_from_txt


def test_returns_one_page():
    result = extract_text_from_txt("段落一\n\n段落二")
    assert len(result) == 1
    assert result[0]["page_num"] == 1


def test_splits_by_blank_line():
    result = extract_text_from_txt("段落一\n\n段落二\n\n段落三")
    assert result[0]["paragraphs"] == ["段落一", "段落二", "段落三"]


def test_multiple_blank_lines_treated_as_one():
    result = extract_text_from_txt("段落一\n\n\n\n段落二")
    assert result[0]["paragraphs"] == ["段落一", "段落二"]


def test_empty_text_returns_no_paragraphs():
    result = extract_text_from_txt("")
    assert result[0]["paragraphs"] == []


def test_no_blank_lines_is_single_paragraph():
    result = extract_text_from_txt("行一\n行二\n行三")
    assert len(result[0]["paragraphs"]) == 1
    assert result[0]["paragraphs"][0] == "行一\n行二\n行三"


def test_strips_leading_trailing_whitespace():
    result = extract_text_from_txt("  段落一  \n\n  段落二  ")
    assert result[0]["paragraphs"] == ["段落一", "段落二"]
