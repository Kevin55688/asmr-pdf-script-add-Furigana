from pathlib import Path

import fitz
import pytest

# 專案根目錄下的真實日文 PDF（優先使用）
_SCRIPT_PDF = Path(__file__).parent.parent.parent / "script.pdf"


@pytest.fixture
def sample_pdf(tmp_path):
    """優先使用專案根目錄的 script.pdf，否則動態建立測試 PDF"""
    if _SCRIPT_PDF.exists():
        return str(_SCRIPT_PDF)

    pdf_path = tmp_path / "test.pdf"
    doc = fitz.open()
    page = doc.new_page()
    page.insert_text((72, 72), "This is a test page", fontsize=12)
    doc.save(str(pdf_path))
    doc.close()
    return str(pdf_path)


@pytest.fixture
def empty_pdf(tmp_path):
    """建立一個空白 PDF"""
    pdf_path = tmp_path / "empty.pdf"
    doc = fitz.open()
    doc.new_page()
    doc.save(str(pdf_path))
    doc.close()
    return str(pdf_path)
