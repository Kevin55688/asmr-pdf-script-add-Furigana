from app.services.pdf_extractor import extract_text_by_pages


def test_extract_returns_list(sample_pdf):
    result = extract_text_by_pages(sample_pdf)
    assert isinstance(result, list)
    assert len(result) >= 1


def test_extract_page_structure(sample_pdf):
    result = extract_text_by_pages(sample_pdf)
    page = result[0]
    assert "page_num" in page
    assert "paragraphs" in page
    assert page["page_num"] == 1


def test_extract_has_text(sample_pdf):
    result = extract_text_by_pages(sample_pdf)
    paragraphs = result[0]["paragraphs"]
    assert len(paragraphs) > 0


def test_extract_empty_pdf(empty_pdf):
    result = extract_text_by_pages(empty_pdf)
    assert len(result) == 1
    assert result[0]["paragraphs"] == []


def test_extract_invalid_file():
    import pytest
    with pytest.raises(Exception):
        extract_text_by_pages("nonexistent.pdf")
