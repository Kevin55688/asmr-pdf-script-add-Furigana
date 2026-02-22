import pytest
from fastapi.testclient import TestClient
from app.main import app
import app.services.library_service as lib_svc


@pytest.fixture
def client(tmp_path, monkeypatch):
    docs_dir = tmp_path / "documents"
    docs_dir.mkdir()
    monkeypatch.setattr(lib_svc, "DATA_DIR", tmp_path)
    monkeypatch.setattr(lib_svc, "LIBRARY_FILE", tmp_path / "library.json")
    monkeypatch.setattr(lib_svc, "DOCUMENTS_DIR", docs_dir)
    return TestClient(app)


def test_get_library_empty(client):
    resp = client.get("/api/library")
    assert resp.status_code == 200
    assert resp.json() == {"folders": [], "tags": [], "documents": []}


def test_create_and_rename_folder(client):
    resp = client.post("/api/library/folders", json={"name": "ASMR"})
    assert resp.status_code == 200
    folder_id = resp.json()["id"]

    resp = client.patch(f"/api/library/folders/{folder_id}", json={"name": "新名稱"})
    assert resp.json()["name"] == "新名稱"


def test_delete_folder(client):
    folder = client.post("/api/library/folders", json={"name": "f"}).json()
    client.delete(f"/api/library/folders/{folder['id']}")
    lib = client.get("/api/library").json()
    assert lib["folders"] == []


def test_create_and_delete_tag(client):
    resp = client.post("/api/library/tags", json={"name": "完成", "color": "#4ade80"})
    assert resp.status_code == 200
    tag_id = resp.json()["id"]

    client.delete(f"/api/library/tags/{tag_id}")
    lib = client.get("/api/library").json()
    assert lib["tags"] == []


def test_create_document(client):
    folder = client.post("/api/library/folders", json={"name": "f"}).json()
    resp = client.post(
        "/api/library/documents", json={"name": "doc1", "folderId": folder["id"]}
    )
    assert resp.status_code == 200
    assert resp.json()["htmlFile"] is None


def test_update_document_metadata(client):
    folder = client.post("/api/library/folders", json={"name": "f"}).json()
    doc = client.post(
        "/api/library/documents", json={"name": "d", "folderId": folder["id"]}
    ).json()
    resp = client.patch(
        f"/api/library/documents/{doc['id']}", json={"lastPage": 5, "notes": "hello"}
    )
    assert resp.json()["lastPage"] == 5
    assert resp.json()["notes"] == "hello"


def test_move_document_to_folder(client):
    f1 = client.post("/api/library/folders", json={"name": "f1"}).json()
    f2 = client.post("/api/library/folders", json={"name": "f2"}).json()
    doc = client.post(
        "/api/library/documents", json={"name": "d", "folderId": f1["id"]}
    ).json()
    resp = client.patch(
        f"/api/library/documents/{doc['id']}", json={"folderId": f2["id"]}
    )
    assert resp.json()["folderId"] == f2["id"]


def test_upload_txt_document(client):
    folder = client.post("/api/library/folders", json={"name": "f"}).json()
    doc = client.post(
        "/api/library/documents", json={"name": "d", "folderId": folder["id"]}
    ).json()
    resp = client.post(
        f"/api/library/documents/{doc['id']}/upload",
        files={"file": ("test.txt", "あいうえお".encode("utf-8"), "text/plain")},
    )
    assert resp.status_code == 200
    assert resp.json()["htmlFile"] is not None


def test_get_document_html(client):
    folder = client.post("/api/library/folders", json={"name": "f"}).json()
    doc = client.post(
        "/api/library/documents", json={"name": "d", "folderId": folder["id"]}
    ).json()
    client.post(
        f"/api/library/documents/{doc['id']}/upload",
        files={"file": ("test.txt", "あいうえお".encode("utf-8"), "text/plain")},
    )
    resp = client.get(f"/api/library/documents/{doc['id']}/html")
    assert resp.status_code == 200
    assert "html" in resp.json()


def test_get_document_html_not_uploaded(client):
    folder = client.post("/api/library/folders", json={"name": "f"}).json()
    doc = client.post(
        "/api/library/documents", json={"name": "d", "folderId": folder["id"]}
    ).json()
    resp = client.get(f"/api/library/documents/{doc['id']}/html")
    assert resp.status_code == 404


def test_save_translations(client):
    folder = client.post("/api/library/folders", json={"name": "f"}).json()
    doc = client.post(
        "/api/library/documents", json={"name": "d", "folderId": folder["id"]}
    ).json()
    resp = client.patch(
        f"/api/library/documents/{doc['id']}/translations",
        json={"provider": "deepl", "lang": "zh-TW", "translations": {"p-0": "你好"}},
    )
    assert resp.status_code == 200
    assert resp.json()["translations"]["deepl"]["zh-TW"] == {"p-0": "你好"}


def test_delete_document(client):
    folder = client.post("/api/library/folders", json={"name": "f"}).json()
    doc = client.post(
        "/api/library/documents", json={"name": "d", "folderId": folder["id"]}
    ).json()
    client.delete(f"/api/library/documents/{doc['id']}")
    lib = client.get("/api/library").json()
    assert lib["documents"] == []


def test_404_on_nonexistent(client):
    assert client.patch("/api/library/folders/f-notexist", json={"name": "x"}).status_code == 404
    assert client.delete("/api/library/folders/f-notexist").status_code == 404
    assert client.patch("/api/library/documents/doc-notexist", json={}).status_code == 404
    assert client.delete("/api/library/documents/doc-notexist").status_code == 404


def test_get_document_html_returns_correct_page_count_for_multi_page(client):
    """多頁文件：get_document_html 應回傳正確頁數（而非永遠 1）"""
    folder = client.post("/api/library/folders", json={"name": "f"}).json()
    doc = client.post(
        "/api/library/documents", json={"name": "d", "folderId": folder["id"]}
    ).json()

    # 直接寫入模擬 generate_html 產生的 3 頁 HTML（含 data-page 屬性）
    three_page_html = '\n'.join([
        '<section class="page" data-page="1"><p>Page 1</p></section>',
        '<section class="page" data-page="2"><p>Page 2</p></section>',
        '<section class="page" data-page="3"><p>Page 3</p></section>',
    ])
    lib_svc.set_document_html(doc["id"], three_page_html)

    resp = client.get(f"/api/library/documents/{doc['id']}/html")
    assert resp.status_code == 200
    assert resp.json()["page_count"] == 3
