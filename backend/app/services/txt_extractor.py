import re


def extract_text_from_txt(text: str) -> list[dict]:
    """將 TXT 文字依空白行分段落，整個檔案視為第 1 頁。

    Args:
        text: UTF-8 純文字內容

    Returns:
        [{"page_num": 1, "paragraphs": ["段落1", "段落2", ...]}]
    """
    paragraphs = [p.strip() for p in re.split(r'\n\s*\n', text)]
    paragraphs = [p for p in paragraphs if p]
    return [{"page_num": 1, "paragraphs": paragraphs}]
