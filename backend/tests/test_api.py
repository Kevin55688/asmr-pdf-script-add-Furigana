import fitz
import pytest
from fastapi.testclient import TestClient

from app.main import app

client = TestClient(app)


@pytest.fixture
def japanese_pdf(tmp_path):
    """建立含日文的測試 PDF"""
    pdf_path = tmp_path / "japanese.pdf"
    doc = fitz.open()
    page = doc.new_page()
    page.insert_text((72, 72), "Test document", fontsize=12)
    doc.save(str(pdf_path))
    doc.close()
    return pdf_path


def test_convert_endpoint_exists():
    response = client.post("/api/convert")
    # 沒有上傳檔案應該回 422（缺少必要欄位）
    assert response.status_code == 422


def test_convert_with_pdf(japanese_pdf):
    with open(japanese_pdf, "rb") as f:
        response = client.post("/api/convert", files={"file": ("test.pdf", f, "application/pdf")})
    assert response.status_code == 200
    data = response.json()
    assert "html" in data
    assert "page_count" in data
    assert data["page_count"] == 1


def test_convert_rejects_unknown_extension():
    response = client.post(
        "/api/convert",
        files={"file": ("test.csv", b"col1,col2", "text/csv")},
    )
    assert response.status_code == 400


def test_convert_with_txt():
    txt_content = "東京は日本の首都です。\n\n大阪は関西の中心地です。"
    response = client.post(
        "/api/convert",
        files={"file": ("script.txt", txt_content.encode("utf-8"), "text/plain")},
    )
    assert response.status_code == 200
    data = response.json()
    assert "html" in data
    assert "page_count" in data
    assert data["page_count"] == 1


def test_health_check():
    response = client.get("/api/health")
    assert response.status_code == 200


# ── /api/translate ──────────────────────────────────────────────────────────

def test_translate_endpoint_exists():
    response = client.post("/api/translate")
    # 沒有 body 應該回 422
    assert response.status_code == 422


def test_translate_missing_api_key(monkeypatch):
    monkeypatch.delenv("DEEPL_API_KEY", raising=False)
    response = client.post(
        "/api/translate",
        json={"texts": ["テスト"], "provider": "deepl", "target_lang": "zh-TW"},
    )
    assert response.status_code == 400
    assert "DEEPL_API_KEY" in response.json()["detail"]


def test_translate_invalid_provider():
    response = client.post(
        "/api/translate",
        json={"texts": ["テスト"], "provider": "unknown", "target_lang": "zh-TW"},
    )
    assert response.status_code == 400
    assert "不支援" in response.json()["detail"]
