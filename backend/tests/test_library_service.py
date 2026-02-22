import pytest
from pathlib import Path
import app.services.library_service as lib_svc


@pytest.fixture(autouse=True)
def tmp_data(tmp_path, monkeypatch):
    docs_dir = tmp_path / "documents"
    docs_dir.mkdir()
    monkeypatch.setattr(lib_svc, "DATA_DIR", tmp_path)
    monkeypatch.setattr(lib_svc, "LIBRARY_FILE", tmp_path / "library.json")
    monkeypatch.setattr(lib_svc, "DOCUMENTS_DIR", docs_dir)


def test_load_library_empty():
    lib = lib_svc.load_library()
    assert lib == {"folders": [], "tags": [], "documents": []}


def test_create_folder():
    folder = lib_svc.create_folder("ASMR")
    assert folder["name"] == "ASMR"
    assert folder["id"].startswith("f-")
    lib = lib_svc.load_library()
    assert len(lib["folders"]) == 1


def test_rename_folder():
    folder = lib_svc.create_folder("old")
    result = lib_svc.rename_folder(folder["id"], "new")
    assert result["name"] == "new"


def test_rename_folder_not_found():
    assert lib_svc.rename_folder("f-notexist", "x") is None


def test_delete_folder_removes_documents_and_html():
    folder = lib_svc.create_folder("test")
    doc = lib_svc.create_document("doc1", folder["id"])
    lib_svc.set_document_html(doc["id"], "<html>test</html>")
    lib_svc.delete_folder(folder["id"])
    lib = lib_svc.load_library()
    assert lib["folders"] == []
    assert lib["documents"] == []


def test_delete_folder_not_found():
    assert lib_svc.delete_folder("f-notexist") is False


def test_create_tag():
    tag = lib_svc.create_tag("完成", "#4ade80")
    assert tag["name"] == "完成"
    assert tag["color"] == "#4ade80"
    assert tag["id"].startswith("t-")


def test_delete_tag_removes_from_documents():
    folder = lib_svc.create_folder("f")
    doc = lib_svc.create_document("d", folder["id"])
    tag = lib_svc.create_tag("tag", "#fff")
    lib_svc.update_document(doc["id"], {"tagIds": [tag["id"]]})
    lib_svc.delete_tag(tag["id"])
    lib = lib_svc.load_library()
    assert lib["documents"][0]["tagIds"] == []


def test_create_document():
    folder = lib_svc.create_folder("f")
    doc = lib_svc.create_document("My Doc", folder["id"])
    assert doc["name"] == "My Doc"
    assert doc["folderId"] == folder["id"]
    assert doc["htmlFile"] is None
    assert doc["lastPage"] == 0
    assert doc["notes"] == ""
    assert doc["translations"] == {}


def test_update_document():
    folder = lib_svc.create_folder("f")
    doc = lib_svc.create_document("d", folder["id"])
    updated = lib_svc.update_document(doc["id"], {"lastPage": 5, "notes": "hello"})
    assert updated["lastPage"] == 5
    assert updated["notes"] == "hello"


def test_update_document_not_found():
    assert lib_svc.update_document("doc-notexist", {"lastPage": 1}) is None


def test_delete_document_removes_html():
    folder = lib_svc.create_folder("f")
    doc = lib_svc.create_document("d", folder["id"])
    lib_svc.set_document_html(doc["id"], "<p>hello</p>")
    lib_svc.delete_document(doc["id"])
    lib = lib_svc.load_library()
    assert lib["documents"] == []


def test_set_and_get_document_html():
    folder = lib_svc.create_folder("f")
    doc = lib_svc.create_document("d", folder["id"])
    lib_svc.set_document_html(doc["id"], "<p>content</p>")
    html = lib_svc.get_document_html(doc["id"])
    assert html == "<p>content</p>"


def test_get_document_html_not_uploaded():
    folder = lib_svc.create_folder("f")
    doc = lib_svc.create_document("d", folder["id"])
    assert lib_svc.get_document_html(doc["id"]) is None


def test_update_translations():
    folder = lib_svc.create_folder("f")
    doc = lib_svc.create_document("d", folder["id"])
    result = lib_svc.update_translations(doc["id"], "deepl", "zh-TW", {"p-0": "你好"})
    assert result["translations"]["deepl"]["zh-TW"] == {"p-0": "你好"}


def test_update_translations_merges_providers():
    folder = lib_svc.create_folder("f")
    doc = lib_svc.create_document("d", folder["id"])
    lib_svc.update_translations(doc["id"], "deepl", "zh-TW", {"p-0": "A"})
    lib_svc.update_translations(doc["id"], "claude", "zh-TW", {"p-0": "B"})
    lib = lib_svc.load_library()
    trans = lib["documents"][0]["translations"]
    assert trans["deepl"]["zh-TW"] == {"p-0": "A"}
    assert trans["claude"]["zh-TW"] == {"p-0": "B"}


def test_create_folder_has_tag_ids():
    folder = lib_svc.create_folder("測試資料夾")
    assert "tagIds" in folder
    assert folder["tagIds"] == []


def test_update_folder_tags():
    folder = lib_svc.create_folder("資料夾A")
    updated = lib_svc.update_folder_tags(folder["id"], ["t-001", "t-002"])
    assert updated["tagIds"] == ["t-001", "t-002"]


def test_delete_tag_removes_from_folders():
    tag = lib_svc.create_tag("待刪除", "#ff0000")
    folder = lib_svc.create_folder("資料夾B")
    lib_svc.update_folder_tags(folder["id"], [tag["id"]])
    lib_svc.delete_tag(tag["id"])
    lib = lib_svc.load_library()
    for f in lib["folders"]:
        if f["id"] == folder["id"]:
            assert tag["id"] not in f.get("tagIds", [])
