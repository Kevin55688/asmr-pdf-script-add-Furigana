import fitz


def extract_text_by_pages(pdf_path: str) -> list[dict]:
    """從 PDF 逐頁提取文字，保留段落結構。

    Returns:
        list of {"page_num": int, "paragraphs": list[str]}
    """
    doc = fitz.open(pdf_path)
    pages = []
    for page in doc:
        blocks = page.get_text("blocks")
        paragraphs = [b[4].strip() for b in blocks if b[6] == 0 and b[4].strip()]
        pages.append({"page_num": page.number + 1, "paragraphs": paragraphs})
    doc.close()
    return pages
