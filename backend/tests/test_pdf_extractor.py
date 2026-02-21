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


def test_extract_merges_timing_blocks(sample_pdf):
    """縦書き PDF 中，同欄位的分/秒應合併為同一段落（如「口内射精10分30秒」）"""
    result = extract_text_by_pages(sample_pdf)
    all_paras = result[0]["paragraphs"]
    # 應有至少一個段落同時包含「分」和「秒」
    timing_paras = [p for p in all_paras if "分" in p and "秒" in p]
    assert len(timing_paras) > 0, (
        "計時資訊（分/秒）應合併在同一段落，目前每個 block 都是獨立 <p>"
    )


def test_extract_vertical_text_reading_order(sample_pdf):
    """縦書き PDF 應從最右欄開始讀（標題在最右），標題應出現在前幾個段落"""
    result = extract_text_by_pages(sample_pdf)
    all_paras = result[0]["paragraphs"]
    title_idx = next(
        (i for i, p in enumerate(all_paras) if "ドスケベ" in p), None
    )
    assert title_idx is not None, "標題文字應存在於段落中"
    assert title_idx <= 2, (
        f"標題應在前 3 個段落（右欄優先），實際位置：{title_idx}"
    )
