# Sidebar 文件庫功能實作計畫

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** 實作可收合側邊欄，支援資料夾/文件管理、tag 篩選、本地持久化（後端 data/ 資料夾），使用者可直接從側邊欄選取已上傳文件，不需重新上傳。

**Architecture:** 全後端驅動（方案 A）。前端呼叫 FastAPI REST API 管理資料夾、tag、文件 metadata；後端將索引存於 `backend/data/library.json`，HTML 存於 `backend/data/documents/`。前端 App.tsx 升級為 `idle | loading | uploading | viewing` 狀態機，整合側邊欄與現有 PagedPreview。

**Tech Stack:** Python / FastAPI / Pydantic · React + TypeScript + Tailwind CSS / Vitest / @testing-library/react · pytest / httpx (TestClient)

---

## Task 1：後端 Library Service

**Files:**
- Create: `backend/app/services/library_service.py`
- Create: `backend/tests/test_library_service.py`

---

**Step 1：撰寫失敗測試**

建立 `backend/tests/test_library_service.py`：

```python
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
```

**Step 2：確認測試失敗**

```bash
cd backend && python -m pytest tests/test_library_service.py -v
```
Expected: `ModuleNotFoundError` 或 `ImportError`（library_service 尚未建立）

**Step 3：建立 `backend/app/services/library_service.py`**

```python
import json
import uuid
from datetime import datetime
from pathlib import Path
from typing import Optional

DATA_DIR = Path(__file__).resolve().parent.parent.parent / "data"
LIBRARY_FILE = DATA_DIR / "library.json"
DOCUMENTS_DIR = DATA_DIR / "documents"


def _ensure_dirs() -> None:
    DATA_DIR.mkdir(exist_ok=True)
    DOCUMENTS_DIR.mkdir(exist_ok=True)


def load_library() -> dict:
    _ensure_dirs()
    if not LIBRARY_FILE.exists():
        return {"folders": [], "tags": [], "documents": []}
    return json.loads(LIBRARY_FILE.read_text(encoding="utf-8"))


def save_library(library: dict) -> None:
    _ensure_dirs()
    LIBRARY_FILE.write_text(
        json.dumps(library, ensure_ascii=False, indent=2), encoding="utf-8"
    )


def create_folder(name: str) -> dict:
    library = load_library()
    folder = {
        "id": f"f-{uuid.uuid4().hex[:8]}",
        "name": name,
        "order": len(library["folders"]),
    }
    library["folders"].append(folder)
    save_library(library)
    return folder


def rename_folder(folder_id: str, name: str) -> Optional[dict]:
    library = load_library()
    for folder in library["folders"]:
        if folder["id"] == folder_id:
            folder["name"] = name
            save_library(library)
            return folder
    return None


def delete_folder(folder_id: str) -> bool:
    library = load_library()
    if not any(f["id"] == folder_id for f in library["folders"]):
        return False
    for doc in library["documents"]:
        if doc["folderId"] == folder_id and doc.get("htmlFile"):
            (DOCUMENTS_DIR / doc["htmlFile"]).unlink(missing_ok=True)
    library["folders"] = [f for f in library["folders"] if f["id"] != folder_id]
    library["documents"] = [d for d in library["documents"] if d["folderId"] != folder_id]
    save_library(library)
    return True


def create_tag(name: str, color: str) -> dict:
    library = load_library()
    tag = {"id": f"t-{uuid.uuid4().hex[:8]}", "name": name, "color": color}
    library["tags"].append(tag)
    save_library(library)
    return tag


def delete_tag(tag_id: str) -> bool:
    library = load_library()
    if not any(t["id"] == tag_id for t in library["tags"]):
        return False
    library["tags"] = [t for t in library["tags"] if t["id"] != tag_id]
    for doc in library["documents"]:
        doc["tagIds"] = [tid for tid in doc.get("tagIds", []) if tid != tag_id]
    save_library(library)
    return True


def create_document(name: str, folder_id: str) -> dict:
    library = load_library()
    doc = {
        "id": f"doc-{uuid.uuid4().hex[:8]}",
        "name": name,
        "folderId": folder_id,
        "tagIds": [],
        "htmlFile": None,
        "lastPage": 0,
        "notes": "",
        "translations": {},
        "createdAt": datetime.now().isoformat(),
        "uploadedAt": None,
    }
    library["documents"].append(doc)
    save_library(library)
    return doc


def update_document(doc_id: str, updates: dict) -> Optional[dict]:
    library = load_library()
    allowed = {"name", "folderId", "tagIds", "lastPage", "notes"}
    for doc in library["documents"]:
        if doc["id"] == doc_id:
            for key, value in updates.items():
                if key in allowed:
                    doc[key] = value
            save_library(library)
            return doc
    return None


def delete_document(doc_id: str) -> bool:
    library = load_library()
    doc = next((d for d in library["documents"] if d["id"] == doc_id), None)
    if not doc:
        return False
    if doc.get("htmlFile"):
        (DOCUMENTS_DIR / doc["htmlFile"]).unlink(missing_ok=True)
    library["documents"] = [d for d in library["documents"] if d["id"] != doc_id]
    save_library(library)
    return True


def set_document_html(doc_id: str, html_content: str) -> Optional[dict]:
    library = load_library()
    for doc in library["documents"]:
        if doc["id"] == doc_id:
            html_file = f"{doc_id}.html"
            (DOCUMENTS_DIR / html_file).write_text(html_content, encoding="utf-8")
            doc["htmlFile"] = html_file
            doc["uploadedAt"] = datetime.now().isoformat()
            save_library(library)
            return doc
    return None


def get_document_html(doc_id: str) -> Optional[str]:
    library = load_library()
    doc = next((d for d in library["documents"] if d["id"] == doc_id), None)
    if not doc or not doc.get("htmlFile"):
        return None
    html_path = DOCUMENTS_DIR / doc["htmlFile"]
    if not html_path.exists():
        return None
    return html_path.read_text(encoding="utf-8")


def update_translations(
    doc_id: str, provider: str, lang: str, translations: dict
) -> Optional[dict]:
    library = load_library()
    for doc in library["documents"]:
        if doc["id"] == doc_id:
            doc.setdefault("translations", {}).setdefault(provider, {})[lang] = translations
            save_library(library)
            return doc
    return None
```

**Step 4：確認測試通過**

```bash
cd backend && python -m pytest tests/test_library_service.py -v
```
Expected: 全部 PASS

**Step 5：Commit**

```bash
git add backend/app/services/library_service.py backend/tests/test_library_service.py
git commit -m "[Feature] 新增 library_service.py（資料夾/tag/文件 CRUD + HTML 儲存）"
```

---

## Task 2：後端 Library Router

**Files:**
- Create: `backend/app/routers/library.py`
- Modify: `backend/app/main.py`
- Create: `backend/tests/test_library_router.py`

---

**Step 1：撰寫失敗測試**

建立 `backend/tests/test_library_router.py`：

```python
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
```

**Step 2：確認測試失敗**

```bash
cd backend && python -m pytest tests/test_library_router.py -v
```
Expected: 路由不存在，回傳 404

**Step 3：建立 `backend/app/routers/library.py`**

```python
import tempfile
from pathlib import Path
from typing import List, Optional

from fastapi import APIRouter, File, HTTPException, UploadFile
from pydantic import BaseModel

from app.services import library_service as lib_svc
from app.services.html_generator import generate_html, generate_html_from_script_txt
from app.services.pdf_extractor import extract_text_by_pages

router = APIRouter(prefix="/api/library", tags=["library"])


# ── Request Bodies ────────────────────────────────────────────────────────────

class FolderCreate(BaseModel):
    name: str


class FolderUpdate(BaseModel):
    name: str


class TagCreate(BaseModel):
    name: str
    color: str


class DocumentCreate(BaseModel):
    name: str
    folderId: str


class DocumentUpdate(BaseModel):
    name: Optional[str] = None
    folderId: Optional[str] = None
    tagIds: Optional[List[str]] = None
    lastPage: Optional[int] = None
    notes: Optional[str] = None


class TranslationUpdate(BaseModel):
    provider: str
    lang: str
    translations: dict


# ── Endpoints ─────────────────────────────────────────────────────────────────

@router.get("")
def get_library():
    return lib_svc.load_library()


@router.post("/folders")
def create_folder(body: FolderCreate):
    return lib_svc.create_folder(body.name)


@router.patch("/folders/{folder_id}")
def rename_folder(folder_id: str, body: FolderUpdate):
    result = lib_svc.rename_folder(folder_id, body.name)
    if result is None:
        raise HTTPException(status_code=404, detail="Folder not found")
    return result


@router.delete("/folders/{folder_id}")
def delete_folder(folder_id: str):
    if not lib_svc.delete_folder(folder_id):
        raise HTTPException(status_code=404, detail="Folder not found")
    return {"ok": True}


@router.post("/tags")
def create_tag(body: TagCreate):
    return lib_svc.create_tag(body.name, body.color)


@router.delete("/tags/{tag_id}")
def delete_tag(tag_id: str):
    if not lib_svc.delete_tag(tag_id):
        raise HTTPException(status_code=404, detail="Tag not found")
    return {"ok": True}


@router.post("/documents")
def create_document(body: DocumentCreate):
    return lib_svc.create_document(body.name, body.folderId)


@router.patch("/documents/{doc_id}")
def update_document(doc_id: str, body: DocumentUpdate):
    updates = body.model_dump(exclude_none=True)
    result = lib_svc.update_document(doc_id, updates)
    if result is None:
        raise HTTPException(status_code=404, detail="Document not found")
    return result


@router.delete("/documents/{doc_id}")
def delete_document(doc_id: str):
    if not lib_svc.delete_document(doc_id):
        raise HTTPException(status_code=404, detail="Document not found")
    return {"ok": True}


@router.post("/documents/{doc_id}/upload")
async def upload_document(doc_id: str, file: UploadFile = File(...)):
    library = lib_svc.load_library()
    doc = next((d for d in library["documents"] if d["id"] == doc_id), None)
    if doc is None:
        raise HTTPException(status_code=404, detail="Document not found")

    if not file.filename:
        raise HTTPException(status_code=400, detail="請選擇檔案")

    name_lower = file.filename.lower()
    content = await file.read()

    if name_lower.endswith(".pdf"):
        with tempfile.NamedTemporaryFile(suffix=".pdf", delete=False) as tmp:
            tmp.write(content)
            tmp_path = tmp.name
        try:
            pages = extract_text_by_pages(tmp_path)
            html = generate_html(pages)
            page_count = len(pages)
        except Exception as e:
            raise HTTPException(status_code=400, detail=f"PDF 處理失敗: {e}")
        finally:
            Path(tmp_path).unlink(missing_ok=True)
    elif name_lower.endswith(".txt"):
        try:
            text = content.decode("utf-8")
        except UnicodeDecodeError:
            raise HTTPException(status_code=400, detail="TXT 必須為 UTF-8 編碼")
        html = generate_html_from_script_txt(text)
        page_count = 1
    else:
        raise HTTPException(status_code=400, detail="只接受 PDF 或 TXT 檔案")

    updated = lib_svc.set_document_html(doc_id, html)
    return {**updated, "page_count": page_count}


@router.get("/documents/{doc_id}/html")
def get_document_html(doc_id: str):
    html = lib_svc.get_document_html(doc_id)
    if html is None:
        raise HTTPException(status_code=404, detail="Document HTML not found")
    # 計算頁數（section.page 數量）
    page_count = html.count('<section class="page">')
    if page_count == 0:
        page_count = 1
    return {"html": html, "page_count": page_count}


@router.patch("/documents/{doc_id}/translations")
def update_translations(doc_id: str, body: TranslationUpdate):
    result = lib_svc.update_translations(
        doc_id, body.provider, body.lang, body.translations
    )
    if result is None:
        raise HTTPException(status_code=404, detail="Document not found")
    return result
```

**Step 4：在 `backend/app/main.py` 中 import 並掛載 library router**

在 `from app.routers import convert, translate` 後加入：
```python
from app.routers import convert, translate, library
```

在 `app.include_router(translate.router, prefix="/api")` 後加入：
```python
app.include_router(library.router)
```

> 注意：library router 已內含 `/api/library` prefix，不需再加 `prefix="/api"`。

**Step 5：確認測試通過**

```bash
cd backend && python -m pytest tests/test_library_router.py -v
```
Expected: 全部 PASS

**Step 6：確認舊測試不受影響**

```bash
cd backend && python -m pytest -v
```
Expected: 所有既有測試仍 PASS

**Step 7：Commit**

```bash
git add backend/app/routers/library.py backend/app/main.py backend/tests/test_library_router.py
git commit -m "[Feature] 新增 Library Router（11 個 endpoints）"
```

---

## Task 3：前端 Library API Service

**Files:**
- Create: `frontend/src/services/libraryApi.ts`
- Create: `frontend/src/services/libraryApi.test.ts`

---

**Step 1：撰寫失敗測試**

建立 `frontend/src/services/libraryApi.test.ts`：

```typescript
import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  getLibrary,
  createFolder,
  renameFolder,
  deleteFolder,
  createTag,
  deleteTag,
  createDocument,
  updateDocument,
  deleteDocument,
  uploadDocument,
  getDocumentHtml,
  saveTranslations,
} from "./libraryApi";

const mockFetch = vi.fn();
vi.stubGlobal("fetch", mockFetch);

function mockResponse(data: unknown, ok = true, status = 200) {
  mockFetch.mockResolvedValueOnce({
    ok,
    status,
    json: async () => data,
  });
}

beforeEach(() => mockFetch.mockReset());

describe("getLibrary", () => {
  it("calls GET /api/library and returns library", async () => {
    const lib = { folders: [], tags: [], documents: [] };
    mockResponse(lib);
    const result = await getLibrary();
    expect(result).toEqual(lib);
    expect(mockFetch).toHaveBeenCalledWith(
      "http://localhost:8000/api/library/",
      expect.objectContaining({ headers: expect.any(Object) })
    );
  });
});

describe("createFolder", () => {
  it("posts name and returns folder", async () => {
    mockResponse({ id: "f-001", name: "ASMR", order: 0 });
    const folder = await createFolder("ASMR");
    expect(folder.name).toBe("ASMR");
  });
});

describe("renameFolder", () => {
  it("patches folder name", async () => {
    mockResponse({ id: "f-001", name: "新名稱", order: 0 });
    const folder = await renameFolder("f-001", "新名稱");
    expect(folder.name).toBe("新名稱");
  });
});

describe("deleteFolder", () => {
  it("deletes folder", async () => {
    mockResponse({ ok: true });
    await expect(deleteFolder("f-001")).resolves.not.toThrow();
  });
});

describe("createTag / deleteTag", () => {
  it("creates tag", async () => {
    mockResponse({ id: "t-001", name: "完成", color: "#4ade80" });
    const tag = await createTag("完成", "#4ade80");
    expect(tag.name).toBe("完成");
  });
  it("deletes tag", async () => {
    mockResponse({ ok: true });
    await expect(deleteTag("t-001")).resolves.not.toThrow();
  });
});

describe("createDocument", () => {
  it("creates document placeholder", async () => {
    mockResponse({ id: "doc-001", name: "腳本", htmlFile: null });
    const doc = await createDocument("腳本", "f-001");
    expect(doc.htmlFile).toBeNull();
  });
});

describe("updateDocument", () => {
  it("patches document metadata", async () => {
    mockResponse({ id: "doc-001", lastPage: 5 });
    const doc = await updateDocument("doc-001", { lastPage: 5 });
    expect(doc.lastPage).toBe(5);
  });
});

describe("deleteDocument", () => {
  it("deletes document", async () => {
    mockResponse({ ok: true });
    await expect(deleteDocument("doc-001")).resolves.not.toThrow();
  });
});

describe("uploadDocument", () => {
  it("sends file as FormData", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ id: "doc-001", htmlFile: "doc-001.html", page_count: 1 }),
    });
    const file = new File(["content"], "test.txt", { type: "text/plain" });
    const result = await uploadDocument("doc-001", file);
    expect(result.htmlFile).toBe("doc-001.html");
    const [url, init] = mockFetch.mock.calls[0];
    expect(url).toContain("doc-001/upload");
    expect(init.body).toBeInstanceOf(FormData);
  });
});

describe("getDocumentHtml", () => {
  it("returns html and page_count", async () => {
    mockResponse({ html: "<p>test</p>", page_count: 3 });
    const result = await getDocumentHtml("doc-001");
    expect(result.html).toBe("<p>test</p>");
    expect(result.page_count).toBe(3);
  });
});

describe("saveTranslations", () => {
  it("patches translations", async () => {
    mockResponse({ id: "doc-001", translations: { deepl: { "zh-TW": { "p-0": "你好" } } } });
    const result = await saveTranslations("doc-001", "deepl", "zh-TW", { "p-0": "你好" });
    expect(result.translations.deepl["zh-TW"]["p-0"]).toBe("你好");
  });
});

describe("error handling", () => {
  it("throws error with detail message", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 404,
      json: async () => ({ detail: "Document not found" }),
    });
    await expect(getDocumentHtml("bad-id")).rejects.toThrow("Document not found");
  });
});
```

**Step 2：確認測試失敗**

```bash
cd frontend && npx vitest run src/services/libraryApi.test.ts
```
Expected: `Cannot find module './libraryApi'`

**Step 3：建立 `frontend/src/services/libraryApi.ts`**

```typescript
const API_BASE = "http://localhost:8000/api/library";

export interface Folder {
  id: string;
  name: string;
  order: number;
}

export interface Tag {
  id: string;
  name: string;
  color: string;
}

export interface Document {
  id: string;
  name: string;
  folderId: string;
  tagIds: string[];
  htmlFile: string | null;
  lastPage: number;
  notes: string;
  translations: Record<string, Record<string, Record<string, string>>>;
  createdAt: string;
  uploadedAt: string | null;
}

export interface Library {
  folders: Folder[];
  tags: Tag[];
  documents: Document[];
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const resp = await fetch(`${API_BASE}${path}`, {
    headers: { "Content-Type": "application/json" },
    ...init,
  });
  if (!resp.ok) {
    const err = await resp.json().catch(() => ({ detail: "未知錯誤" }));
    throw new Error(err.detail || `HTTP ${resp.status}`);
  }
  return resp.json();
}

export const getLibrary = (): Promise<Library> => request("/");
export const createFolder = (name: string): Promise<Folder> =>
  request("/folders", { method: "POST", body: JSON.stringify({ name }) });
export const renameFolder = (id: string, name: string): Promise<Folder> =>
  request(`/folders/${id}`, { method: "PATCH", body: JSON.stringify({ name }) });
export const deleteFolder = (id: string): Promise<void> =>
  request(`/folders/${id}`, { method: "DELETE" });
export const createTag = (name: string, color: string): Promise<Tag> =>
  request("/tags", { method: "POST", body: JSON.stringify({ name, color }) });
export const deleteTag = (id: string): Promise<void> =>
  request(`/tags/${id}`, { method: "DELETE" });
export const createDocument = (name: string, folderId: string): Promise<Document> =>
  request("/documents", { method: "POST", body: JSON.stringify({ name, folderId }) });
export const updateDocument = (id: string, updates: Partial<Document>): Promise<Document> =>
  request(`/documents/${id}`, { method: "PATCH", body: JSON.stringify(updates) });
export const deleteDocument = (id: string): Promise<void> =>
  request(`/documents/${id}`, { method: "DELETE" });
export const saveTranslations = (
  id: string,
  provider: string,
  lang: string,
  translations: Record<string, string>,
): Promise<Document> =>
  request(`/documents/${id}/translations`, {
    method: "PATCH",
    body: JSON.stringify({ provider, lang, translations }),
  });

export async function uploadDocument(
  id: string,
  file: File,
): Promise<Document & { page_count: number }> {
  const formData = new FormData();
  formData.append("file", file);
  const resp = await fetch(`${API_BASE}/documents/${id}/upload`, {
    method: "POST",
    body: formData,
  });
  if (!resp.ok) {
    const err = await resp.json().catch(() => ({ detail: "上傳失敗" }));
    throw new Error(err.detail || `HTTP ${resp.status}`);
  }
  return resp.json();
}

export async function getDocumentHtml(
  id: string,
): Promise<{ html: string; page_count: number }> {
  const resp = await fetch(`${API_BASE}/documents/${id}/html`, {
    headers: { "Content-Type": "application/json" },
  });
  if (!resp.ok) {
    const err = await resp.json().catch(() => ({ detail: "未知錯誤" }));
    throw new Error(err.detail || `HTTP ${resp.status}`);
  }
  return resp.json();
}
```

**Step 4：確認測試通過**

```bash
cd frontend && npx vitest run src/services/libraryApi.test.ts
```
Expected: 全部 PASS

**Step 5：Commit**

```bash
git add frontend/src/services/libraryApi.ts frontend/src/services/libraryApi.test.ts
git commit -m "[Feature] 新增 libraryApi.ts（型別定義 + 11 個 API 函式）"
```

---

## Task 4：前端 Sidebar + FolderItem + DocumentItem

**Files:**
- Create: `frontend/src/components/Sidebar.tsx`
- Create: `frontend/src/components/FolderItem.tsx`
- Create: `frontend/src/components/DocumentItem.tsx`
- Create: `frontend/src/components/Sidebar.test.tsx`

---

**Step 1：撰寫失敗測試**

建立 `frontend/src/components/Sidebar.test.tsx`：

```tsx
import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import { Sidebar } from "./Sidebar";
import type { Library } from "../services/libraryApi";

const mockLibrary: Library = {
  folders: [{ id: "f-001", name: "ASMR", order: 0 }],
  tags: [{ id: "t-001", name: "完成", color: "#4ade80" }],
  documents: [
    {
      id: "doc-001",
      name: "腳本 Vol.1",
      folderId: "f-001",
      tagIds: [],
      htmlFile: "doc-001.html",
      lastPage: 0,
      notes: "",
      translations: {},
      createdAt: "",
      uploadedAt: "2026-02-22",
    },
    {
      id: "doc-002",
      name: "草稿",
      folderId: "f-001",
      tagIds: [],
      htmlFile: null,
      lastPage: 0,
      notes: "",
      translations: {},
      createdAt: "",
      uploadedAt: null,
    },
  ],
};

const noop = vi.fn();

describe("Sidebar", () => {
  it("renders folder name", () => {
    render(
      <Sidebar
        library={mockLibrary}
        selectedDocId={null}
        activeTags={[]}
        onSelectDocument={noop}
        onCreateFolder={noop}
        onRenameFolder={noop}
        onDeleteFolder={noop}
        onCreateDocument={noop}
        onRenameDocument={noop}
        onDeleteDocument={noop}
        onMoveDocument={noop}
        onUploadDocument={noop}
        onCreateTag={noop}
        onDeleteTag={noop}
        onTagFilterChange={noop}
      />
    );
    expect(screen.getByText("ASMR")).toBeInTheDocument();
  });

  it("shows documents in folder", () => {
    render(
      <Sidebar
        library={mockLibrary}
        selectedDocId={null}
        activeTags={[]}
        onSelectDocument={noop}
        onCreateFolder={noop}
        onRenameFolder={noop}
        onDeleteFolder={noop}
        onCreateDocument={noop}
        onRenameDocument={noop}
        onDeleteDocument={noop}
        onMoveDocument={noop}
        onUploadDocument={noop}
        onCreateTag={noop}
        onDeleteTag={noop}
        onTagFilterChange={noop}
      />
    );
    expect(screen.getByText("腳本 Vol.1")).toBeInTheDocument();
    expect(screen.getByText("草稿")).toBeInTheDocument();
  });

  it("can collapse and expand", () => {
    render(
      <Sidebar
        library={mockLibrary}
        selectedDocId={null}
        activeTags={[]}
        onSelectDocument={noop}
        onCreateFolder={noop}
        onRenameFolder={noop}
        onDeleteFolder={noop}
        onCreateDocument={noop}
        onRenameDocument={noop}
        onDeleteDocument={noop}
        onMoveDocument={noop}
        onUploadDocument={noop}
        onCreateTag={noop}
        onDeleteTag={noop}
        onTagFilterChange={noop}
      />
    );
    const toggleBtn = screen.getByRole("button", { name: /收合側邊欄|展開側邊欄/ });
    fireEvent.click(toggleBtn);
    expect(screen.queryByText("ASMR")).not.toBeInTheDocument();
    fireEvent.click(toggleBtn);
    expect(screen.getByText("ASMR")).toBeInTheDocument();
  });

  it("calls onSelectDocument when uploaded document clicked", () => {
    const onSelect = vi.fn();
    render(
      <Sidebar
        library={mockLibrary}
        selectedDocId={null}
        activeTags={[]}
        onSelectDocument={onSelect}
        onCreateFolder={noop}
        onRenameFolder={noop}
        onDeleteFolder={noop}
        onCreateDocument={noop}
        onRenameDocument={noop}
        onDeleteDocument={noop}
        onMoveDocument={noop}
        onUploadDocument={noop}
        onCreateTag={noop}
        onDeleteTag={noop}
        onTagFilterChange={noop}
      />
    );
    fireEvent.click(screen.getByText("腳本 Vol.1"));
    expect(onSelect).toHaveBeenCalledWith(mockLibrary.documents[0]);
  });

  it("未上傳文件顯示上傳標示", () => {
    render(
      <Sidebar
        library={mockLibrary}
        selectedDocId={null}
        activeTags={[]}
        onSelectDocument={noop}
        onCreateFolder={noop}
        onRenameFolder={noop}
        onDeleteFolder={noop}
        onCreateDocument={noop}
        onRenameDocument={noop}
        onDeleteDocument={noop}
        onMoveDocument={noop}
        onUploadDocument={noop}
        onCreateTag={noop}
        onDeleteTag={noop}
        onTagFilterChange={noop}
      />
    );
    // 未上傳文件應有視覺標示（例如虛線或特殊 class）
    const draft = screen.getByText("草稿").closest("[data-uploaded]");
    expect(draft?.getAttribute("data-uploaded")).toBe("false");
  });

  it("tag 篩選隱藏不符合的文件", () => {
    const libraryWithTag: Library = {
      ...mockLibrary,
      documents: [
        { ...mockLibrary.documents[0], tagIds: ["t-001"] },
        { ...mockLibrary.documents[1], tagIds: [] },
      ],
    };
    render(
      <Sidebar
        library={libraryWithTag}
        selectedDocId={null}
        activeTags={["t-001"]}
        onSelectDocument={noop}
        onCreateFolder={noop}
        onRenameFolder={noop}
        onDeleteFolder={noop}
        onCreateDocument={noop}
        onRenameDocument={noop}
        onDeleteDocument={noop}
        onMoveDocument={noop}
        onUploadDocument={noop}
        onCreateTag={noop}
        onDeleteTag={noop}
        onTagFilterChange={noop}
      />
    );
    expect(screen.getByText("腳本 Vol.1")).toBeInTheDocument();
    expect(screen.queryByText("草稿")).not.toBeInTheDocument();
  });
});
```

**Step 2：確認測試失敗**

```bash
cd frontend && npx vitest run src/components/Sidebar.test.tsx
```
Expected: `Cannot find module './Sidebar'`

**Step 3：建立三個元件**

建立 `frontend/src/components/DocumentItem.tsx`：

```tsx
import type { Document } from "../services/libraryApi";

interface Props {
  doc: Document;
  isSelected: boolean;
  onClick: (doc: Document) => void;
  onContextMenu: (e: React.MouseEvent, doc: Document) => void;
  onDragStart: (e: React.DragEvent, doc: Document) => void;
}

export function DocumentItem({ doc, isSelected, onClick, onContextMenu, onDragStart }: Props) {
  const isUploaded = doc.htmlFile !== null;
  return (
    <div
      data-uploaded={String(isUploaded)}
      draggable
      onDragStart={(e) => onDragStart(e, doc)}
      onContextMenu={(e) => { e.preventDefault(); onContextMenu(e, doc); }}
      onClick={() => onClick(doc)}
      className={[
        "flex cursor-pointer items-center gap-2 rounded px-3 py-1.5 text-sm transition-colors",
        isSelected
          ? "bg-vermilion/10 text-vermilion font-medium"
          : "text-ink hover:bg-washi-border/40",
        !isUploaded && "opacity-60",
      ]
        .filter(Boolean)
        .join(" ")}
    >
      <span className={`text-xs ${isUploaded ? "text-vermilion" : "text-ink-light"}`}>
        {isUploaded ? "📄" : "📋"}
      </span>
      <span className="truncate">{doc.name}</span>
      {!isUploaded && (
        <span className="ml-auto rounded border border-dashed border-ink-light px-1 text-[10px] text-ink-light">
          未上傳
        </span>
      )}
    </div>
  );
}
```

建立 `frontend/src/components/FolderItem.tsx`：

```tsx
import { useState } from "react";
import type { Document, Folder } from "../services/libraryApi";
import { DocumentItem } from "./DocumentItem";

interface Props {
  folder: Folder;
  documents: Document[];
  selectedDocId: string | null;
  onSelectDocument: (doc: Document) => void;
  onDocumentContextMenu: (e: React.MouseEvent, doc: Document) => void;
  onDocumentDragStart: (e: React.DragEvent, doc: Document) => void;
  onDrop: (e: React.DragEvent, folderId: string) => void;
}

export function FolderItem({
  folder,
  documents,
  selectedDocId,
  onSelectDocument,
  onDocumentContextMenu,
  onDocumentDragStart,
  onDrop,
}: Props) {
  const [expanded, setExpanded] = useState(true);
  const [isDragOver, setIsDragOver] = useState(false);

  return (
    <div>
      <div
        className={[
          "flex cursor-pointer items-center gap-2 rounded px-2 py-1.5 text-sm font-medium transition-colors",
          isDragOver ? "bg-vermilion/10 ring-1 ring-vermilion" : "hover:bg-washi-border/40",
        ].join(" ")}
        onClick={() => setExpanded((v) => !v)}
        onDragOver={(e) => { e.preventDefault(); setIsDragOver(true); }}
        onDragLeave={() => setIsDragOver(false)}
        onDrop={(e) => { setIsDragOver(false); onDrop(e, folder.id); }}
      >
        <span className="text-xs text-ink-light">{expanded ? "▼" : "▶"}</span>
        <span className="truncate text-ink">{folder.name}</span>
        <span className="ml-auto text-xs text-ink-light">{documents.length}</span>
      </div>

      {expanded && (
        <div className="ml-4">
          {documents.map((doc) => (
            <DocumentItem
              key={doc.id}
              doc={doc}
              isSelected={doc.id === selectedDocId}
              onClick={onSelectDocument}
              onContextMenu={onDocumentContextMenu}
              onDragStart={onDocumentDragStart}
            />
          ))}
        </div>
      )}
    </div>
  );
}
```

建立 `frontend/src/components/Sidebar.tsx`：

```tsx
import { useState } from "react";
import type { Document, Library } from "../services/libraryApi";
import { FolderItem } from "./FolderItem";

interface SidebarProps {
  library: Library;
  selectedDocId: string | null;
  activeTags: string[];
  onSelectDocument: (doc: Document) => void;
  onCreateFolder: (name: string) => void;
  onRenameFolder: (id: string, name: string) => void;
  onDeleteFolder: (id: string) => void;
  onCreateDocument: (name: string, folderId: string) => void;
  onRenameDocument: (id: string, name: string) => void;
  onDeleteDocument: (id: string) => void;
  onMoveDocument: (docId: string, targetFolderId: string) => void;
  onUploadDocument: (doc: Document) => void;
  onCreateTag: (name: string, color: string) => void;
  onDeleteTag: (id: string) => void;
  onTagFilterChange: (tagIds: string[]) => void;
}

export function Sidebar({
  library,
  selectedDocId,
  activeTags,
  onSelectDocument,
  onCreateFolder,
  onMoveDocument,
  onUploadDocument,
  onTagFilterChange,
}: SidebarProps) {
  const [collapsed, setCollapsed] = useState(false);
  const [dragDocId, setDragDocId] = useState<string | null>(null);

  const filteredDocs = (folderId: string) => {
    return library.documents.filter((d) => {
      if (d.folderId !== folderId) return false;
      if (activeTags.length === 0) return true;
      return activeTags.every((tid) => d.tagIds.includes(tid));
    });
  };

  if (collapsed) {
    return (
      <div className="flex w-10 flex-col items-center border-r border-washi-border bg-paper pt-3">
        <button
          aria-label="展開側邊欄"
          onClick={() => setCollapsed(false)}
          className="rounded p-1 text-ink-light hover:text-vermilion"
        >
          ☰
        </button>
      </div>
    );
  }

  return (
    <div className="flex w-64 flex-shrink-0 flex-col border-r border-washi-border bg-paper">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-washi-border px-3 py-2">
        <span className="text-xs font-semibold uppercase tracking-wider text-ink-light">
          文件庫
        </span>
        <button
          aria-label="收合側邊欄"
          onClick={() => setCollapsed(true)}
          className="rounded p-1 text-ink-light hover:text-vermilion"
        >
          ←
        </button>
      </div>

      {/* Tag Filter */}
      {library.tags.length > 0 && (
        <div className="flex flex-wrap gap-1 border-b border-washi-border px-3 py-2">
          {library.tags.map((tag) => {
            const active = activeTags.includes(tag.id);
            return (
              <button
                key={tag.id}
                onClick={() =>
                  onTagFilterChange(
                    active
                      ? activeTags.filter((id) => id !== tag.id)
                      : [...activeTags, tag.id],
                  )
                }
                className={[
                  "rounded-full px-2 py-0.5 text-[11px] font-medium transition-all",
                  active ? "text-white ring-2 ring-offset-1" : "opacity-60 hover:opacity-100",
                ].join(" ")}
                style={{ backgroundColor: tag.color, ringColor: tag.color }}
              >
                {tag.name}
              </button>
            );
          })}
        </div>
      )}

      {/* Folder List */}
      <div className="flex-1 overflow-y-auto px-2 py-2">
        {library.folders.map((folder) => (
          <FolderItem
            key={folder.id}
            folder={folder}
            documents={filteredDocs(folder.id)}
            selectedDocId={selectedDocId}
            onSelectDocument={(doc) => {
              if (doc.htmlFile) onSelectDocument(doc);
              else onUploadDocument(doc);
            }}
            onDocumentContextMenu={() => {}}
            onDocumentDragStart={(e, doc) => {
              setDragDocId(doc.id);
              e.dataTransfer.effectAllowed = "move";
            }}
            onDrop={(_, folderId) => {
              if (dragDocId) onMoveDocument(dragDocId, folderId);
              setDragDocId(null);
            }}
          />
        ))}
      </div>

      {/* Footer */}
      <div className="border-t border-washi-border px-3 py-2">
        <button
          onClick={() => {
            const name = window.prompt("資料夾名稱");
            if (name?.trim()) onCreateFolder(name.trim());
          }}
          className="w-full rounded border border-dashed border-washi-border py-1 text-xs text-ink-light transition-colors hover:border-vermilion hover:text-vermilion"
        >
          + 新增資料夾
        </button>
      </div>
    </div>
  );
}
```

**Step 4：確認測試通過**

```bash
cd frontend && npx vitest run src/components/Sidebar.test.tsx
```
Expected: 全部 PASS

**Step 5：Commit**

```bash
git add frontend/src/components/Sidebar.tsx frontend/src/components/FolderItem.tsx \
  frontend/src/components/DocumentItem.tsx frontend/src/components/Sidebar.test.tsx
git commit -m "[Feature] 新增 Sidebar / FolderItem / DocumentItem 元件"
```

---

## Task 5：ContextMenu + TagManager 元件

**Files:**
- Create: `frontend/src/components/DocumentContextMenu.tsx`
- Create: `frontend/src/components/TagManager.tsx`
- Create: `frontend/src/components/DocumentContextMenu.test.tsx`
- Create: `frontend/src/components/TagManager.test.tsx`

---

**Step 1：撰寫失敗測試**

建立 `frontend/src/components/DocumentContextMenu.test.tsx`：

```tsx
import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import { DocumentContextMenu } from "./DocumentContextMenu";
import type { Document, Folder } from "../services/libraryApi";

const doc: Document = {
  id: "doc-001", name: "腳本", folderId: "f-001", tagIds: [],
  htmlFile: "doc-001.html", lastPage: 0, notes: "", translations: {},
  createdAt: "", uploadedAt: "2026-02-22",
};
const folders: Folder[] = [
  { id: "f-001", name: "ASMR", order: 0 },
  { id: "f-002", name: "其他", order: 1 },
];

describe("DocumentContextMenu", () => {
  it("renders menu items for uploaded document", () => {
    render(
      <DocumentContextMenu
        doc={doc} folders={folders} x={0} y={0}
        onClose={vi.fn()} onRename={vi.fn()} onDelete={vi.fn()}
        onMove={vi.fn()} onUpload={vi.fn()}
      />
    );
    expect(screen.getByText("重新命名")).toBeInTheDocument();
    expect(screen.getByText("刪除")).toBeInTheDocument();
    expect(screen.getByText("移動到")).toBeInTheDocument();
  });

  it("shows upload option for unuploaded document", () => {
    const unuploaded = { ...doc, htmlFile: null, uploadedAt: null };
    render(
      <DocumentContextMenu
        doc={unuploaded} folders={folders} x={0} y={0}
        onClose={vi.fn()} onRename={vi.fn()} onDelete={vi.fn()}
        onMove={vi.fn()} onUpload={vi.fn()}
      />
    );
    expect(screen.getByText("上傳檔案")).toBeInTheDocument();
  });

  it("calls onRename when rename clicked", () => {
    const onRename = vi.fn();
    vi.spyOn(window, "prompt").mockReturnValueOnce("新名稱");
    render(
      <DocumentContextMenu
        doc={doc} folders={folders} x={0} y={0}
        onClose={vi.fn()} onRename={onRename} onDelete={vi.fn()}
        onMove={vi.fn()} onUpload={vi.fn()}
      />
    );
    fireEvent.click(screen.getByText("重新命名"));
    expect(onRename).toHaveBeenCalledWith(doc.id, "新名稱");
  });

  it("calls onMove with target folder", () => {
    const onMove = vi.fn();
    render(
      <DocumentContextMenu
        doc={doc} folders={folders} x={0} y={0}
        onClose={vi.fn()} onRename={vi.fn()} onDelete={vi.fn()}
        onMove={onMove} onUpload={vi.fn()}
      />
    );
    fireEvent.click(screen.getByText("移動到"));
    fireEvent.click(screen.getByText("其他"));
    expect(onMove).toHaveBeenCalledWith(doc.id, "f-002");
  });
});
```

建立 `frontend/src/components/TagManager.test.tsx`：

```tsx
import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import { TagManager } from "./TagManager";
import type { Tag } from "../services/libraryApi";

const tags: Tag[] = [{ id: "t-001", name: "完成", color: "#4ade80" }];

describe("TagManager", () => {
  it("lists existing tags", () => {
    render(<TagManager tags={tags} onCreateTag={vi.fn()} onDeleteTag={vi.fn()} onClose={vi.fn()} />);
    expect(screen.getByText("完成")).toBeInTheDocument();
  });

  it("calls onCreateTag when form submitted", () => {
    const onCreate = vi.fn();
    render(<TagManager tags={[]} onCreateTag={onCreate} onDeleteTag={vi.fn()} onClose={vi.fn()} />);
    fireEvent.change(screen.getByPlaceholderText("Tag 名稱"), { target: { value: "進行中" } });
    fireEvent.click(screen.getByText("新增"));
    expect(onCreate).toHaveBeenCalledWith("進行中", expect.any(String));
  });

  it("calls onDeleteTag when delete clicked", () => {
    const onDelete = vi.fn();
    render(<TagManager tags={tags} onCreateTag={vi.fn()} onDeleteTag={onDelete} onClose={vi.fn()} />);
    fireEvent.click(screen.getByRole("button", { name: "刪除 完成" }));
    expect(onDelete).toHaveBeenCalledWith("t-001");
  });
});
```

**Step 2：確認測試失敗**

```bash
cd frontend && npx vitest run src/components/DocumentContextMenu.test.tsx src/components/TagManager.test.tsx
```

**Step 3：建立 `frontend/src/components/DocumentContextMenu.tsx`**

```tsx
import { useState } from "react";
import type { Document, Folder } from "../services/libraryApi";

interface Props {
  doc: Document;
  folders: Folder[];
  x: number;
  y: number;
  onClose: () => void;
  onRename: (id: string, name: string) => void;
  onDelete: (id: string) => void;
  onMove: (docId: string, folderId: string) => void;
  onUpload: (doc: Document) => void;
}

export function DocumentContextMenu({ doc, folders, x, y, onClose, onRename, onDelete, onMove, onUpload }: Props) {
  const [showMove, setShowMove] = useState(false);

  const otherFolders = folders.filter((f) => f.id !== doc.folderId);

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 z-40" onClick={onClose} />
      {/* Menu */}
      <div
        className="fixed z-50 min-w-[140px] rounded border border-washi-border bg-paper shadow-lg"
        style={{ top: y, left: x }}
      >
        {!doc.htmlFile && (
          <button
            className="w-full px-4 py-2 text-left text-sm text-ink hover:bg-washi-border/40"
            onClick={() => { onUpload(doc); onClose(); }}
          >
            上傳檔案
          </button>
        )}
        <button
          className="w-full px-4 py-2 text-left text-sm text-ink hover:bg-washi-border/40"
          onClick={() => {
            const name = window.prompt("新名稱", doc.name);
            if (name?.trim()) onRename(doc.id, name.trim());
            onClose();
          }}
        >
          重新命名
        </button>
        <div className="relative">
          <button
            className="w-full px-4 py-2 text-left text-sm text-ink hover:bg-washi-border/40"
            onClick={() => setShowMove((v) => !v)}
          >
            移動到 ▶
          </button>
          {showMove && (
            <div className="absolute left-full top-0 min-w-[120px] rounded border border-washi-border bg-paper shadow-lg">
              {otherFolders.map((f) => (
                <button
                  key={f.id}
                  className="w-full px-4 py-2 text-left text-sm text-ink hover:bg-washi-border/40"
                  onClick={() => { onMove(doc.id, f.id); onClose(); }}
                >
                  {f.name}
                </button>
              ))}
              {otherFolders.length === 0 && (
                <p className="px-4 py-2 text-xs text-ink-light">無其他資料夾</p>
              )}
            </div>
          )}
        </div>
        <hr className="border-washi-border" />
        <button
          className="w-full px-4 py-2 text-left text-sm text-red-500 hover:bg-red-50"
          onClick={() => { onDelete(doc.id); onClose(); }}
        >
          刪除
        </button>
      </div>
    </>
  );
}
```

建立 `frontend/src/components/TagManager.tsx`：

```tsx
import { useState } from "react";
import type { Tag } from "../services/libraryApi";

const PRESET_COLORS = ["#4ade80", "#facc15", "#f87171", "#60a5fa", "#c084fc", "#fb923c"];

interface Props {
  tags: Tag[];
  onCreateTag: (name: string, color: string) => void;
  onDeleteTag: (id: string) => void;
  onClose: () => void;
}

export function TagManager({ tags, onCreateTag, onDeleteTag, onClose }: Props) {
  const [name, setName] = useState("");
  const [color, setColor] = useState(PRESET_COLORS[0]);

  return (
    <>
      <div className="fixed inset-0 z-40 bg-black/20" onClick={onClose} />
      <div className="fixed left-1/2 top-1/2 z-50 w-80 -translate-x-1/2 -translate-y-1/2 rounded-lg border border-washi-border bg-paper p-4 shadow-xl">
        <div className="mb-3 flex items-center justify-between">
          <h3 className="font-semibold text-ink">Tag 管理</h3>
          <button onClick={onClose} className="text-ink-light hover:text-ink">✕</button>
        </div>

        {/* Existing Tags */}
        <div className="mb-4 space-y-1">
          {tags.map((tag) => (
            <div key={tag.id} className="flex items-center gap-2 rounded px-2 py-1 hover:bg-washi-border/20">
              <span className="h-3 w-3 rounded-full" style={{ backgroundColor: tag.color }} />
              <span className="flex-1 text-sm text-ink">{tag.name}</span>
              <button
                aria-label={`刪除 ${tag.name}`}
                onClick={() => onDeleteTag(tag.id)}
                className="text-xs text-ink-light hover:text-red-500"
              >
                ✕
              </button>
            </div>
          ))}
          {tags.length === 0 && <p className="text-xs text-ink-light">尚無 tag</p>}
        </div>

        {/* Create Tag */}
        <div className="space-y-2 border-t border-washi-border pt-3">
          <input
            placeholder="Tag 名稱"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full rounded border border-washi-border bg-washi px-2 py-1 text-sm text-ink focus:border-vermilion focus:outline-none"
          />
          <div className="flex gap-1">
            {PRESET_COLORS.map((c) => (
              <button
                key={c}
                onClick={() => setColor(c)}
                className={`h-5 w-5 rounded-full transition-transform ${color === c ? "scale-125 ring-2 ring-offset-1" : ""}`}
                style={{ backgroundColor: c, ringColor: c }}
              />
            ))}
          </div>
          <button
            onClick={() => { if (name.trim()) { onCreateTag(name.trim(), color); setName(""); } }}
            disabled={!name.trim()}
            className="w-full rounded bg-vermilion py-1 text-sm font-medium text-white disabled:opacity-40"
          >
            新增
          </button>
        </div>
      </div>
    </>
  );
}
```

**Step 4：Sidebar 整合 ContextMenu**

修改 `frontend/src/components/Sidebar.tsx`，在 import 區加入：
```tsx
import { DocumentContextMenu } from "./DocumentContextMenu";
import { TagManager } from "./TagManager";
```

在 `Sidebar` 函式內加入 state：
```tsx
const [contextMenu, setContextMenu] = useState<{
  doc: Document; x: number; y: number;
} | null>(null);
const [showTagManager, setShowTagManager] = useState(false);
```

將 `onDocumentContextMenu` 的 `() => {}` 改為：
```tsx
onDocumentContextMenu={(e, doc) => setContextMenu({ doc, x: e.clientX, y: e.clientY })}
```

在 `</div>`（最外層）之前加入：
```tsx
{contextMenu && (
  <DocumentContextMenu
    doc={contextMenu.doc}
    folders={library.folders}
    x={contextMenu.x}
    y={contextMenu.y}
    onClose={() => setContextMenu(null)}
    onRename={(id, name) => { onRenameDocument(id, name); setContextMenu(null); }}
    onDelete={(id) => { onDeleteDocument(id); setContextMenu(null); }}
    onMove={(docId, folderId) => { onMoveDocument(docId, folderId); setContextMenu(null); }}
    onUpload={(doc) => { onUploadDocument(doc); setContextMenu(null); }}
  />
)}
{showTagManager && (
  <TagManager
    tags={library.tags}
    onCreateTag={onCreateTag}
    onDeleteTag={onDeleteTag}
    onClose={() => setShowTagManager(false)}
  />
)}
```

在 `+ 新增資料夾` 按鈕後加入：
```tsx
<button
  onClick={() => setShowTagManager(true)}
  className="mt-1 w-full rounded border border-dashed border-washi-border py-1 text-xs text-ink-light transition-colors hover:border-vermilion hover:text-vermilion"
>
  🏷 管理 Tag
</button>
```

**Step 5：確認測試通過**

```bash
cd frontend && npx vitest run src/components/DocumentContextMenu.test.tsx src/components/TagManager.test.tsx src/components/Sidebar.test.tsx
```
Expected: 全部 PASS

**Step 6：Commit**

```bash
git add frontend/src/components/DocumentContextMenu.tsx \
  frontend/src/components/TagManager.tsx \
  frontend/src/components/DocumentContextMenu.test.tsx \
  frontend/src/components/TagManager.test.tsx \
  frontend/src/components/Sidebar.tsx
git commit -m "[Feature] 新增 DocumentContextMenu / TagManager，Sidebar 整合右鍵選單與 Tag 管理"
```

---

## Task 6：NotesPanel + PagedPreview 持久化 props

**Files:**
- Create: `frontend/src/components/NotesPanel.tsx`
- Create: `frontend/src/components/NotesPanel.test.tsx`
- Modify: `frontend/src/components/PagedPreview.tsx`
- Modify: `frontend/src/components/PagedPreview.test.tsx`

---

**Step 1：撰寫 NotesPanel 測試**

建立 `frontend/src/components/NotesPanel.test.tsx`：

```tsx
import { render, screen, fireEvent, act } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import { NotesPanel } from "./NotesPanel";

describe("NotesPanel", () => {
  it("displays initial notes", () => {
    render(<NotesPanel initialNotes="test note" onSave={vi.fn()} />);
    fireEvent.click(screen.getByRole("button", { name: "備註" }));
    expect(screen.getByDisplayValue("test note")).toBeInTheDocument();
  });

  it("calls onSave when textarea loses focus", async () => {
    const onSave = vi.fn();
    render(<NotesPanel initialNotes="" onSave={onSave} />);
    fireEvent.click(screen.getByRole("button", { name: "備註" }));
    const textarea = screen.getByRole("textbox");
    fireEvent.change(textarea, { target: { value: "新備註" } });
    await act(async () => { fireEvent.blur(textarea); });
    expect(onSave).toHaveBeenCalledWith("新備註");
  });

  it("toggles panel open and closed", () => {
    render(<NotesPanel initialNotes="" onSave={vi.fn()} />);
    const btn = screen.getByRole("button", { name: "備註" });
    fireEvent.click(btn);
    expect(screen.getByRole("textbox")).toBeInTheDocument();
    fireEvent.click(btn);
    expect(screen.queryByRole("textbox")).not.toBeInTheDocument();
  });
});
```

**Step 2：新增 PagedPreview 持久化測試**

在 `frontend/src/components/PagedPreview.test.tsx` 現有測試後加入：

```tsx
describe("PagedPreview persistence props", () => {
  it("starts at initialPage when provided", () => {
    const html = Array.from({ length: 5 }, (_, i) =>
      `<section class="page"><p>Page ${i + 1}</p></section>`
    ).join("");
    render(<PagedPreview html={html} pageCount={5} initialPage={3} />);
    expect(screen.getByDisplayValue("3")).toBeInTheDocument();
  });

  it("calls onPageChange when page changes", async () => {
    const onPageChange = vi.fn();
    const html = Array.from({ length: 3 }, (_, i) =>
      `<section class="page"><p>Page ${i + 1}</p></section>`
    ).join("");
    render(<PagedPreview html={html} pageCount={3} onPageChange={onPageChange} />);
    fireEvent.click(screen.getByRole("button", { name: "下一頁" }));
    // debounce: wait 1.1s
    await new Promise((r) => setTimeout(r, 1100));
    expect(onPageChange).toHaveBeenCalledWith(2);
  });
});
```

**Step 3：確認測試失敗**

```bash
cd frontend && npx vitest run src/components/NotesPanel.test.tsx src/components/PagedPreview.test.tsx
```

**Step 4：建立 `frontend/src/components/NotesPanel.tsx`**

```tsx
import { useState } from "react";

interface Props {
  initialNotes: string;
  onSave: (notes: string) => void;
}

export function NotesPanel({ initialNotes, onSave }: Props) {
  const [open, setOpen] = useState(false);
  const [text, setText] = useState(initialNotes);

  return (
    <div className="fixed bottom-6 right-6 z-30 flex flex-col items-end gap-2">
      {open && (
        <div className="w-64 rounded-lg border border-washi-border bg-paper shadow-lg">
          <div className="border-b border-washi-border px-3 py-2 text-xs font-medium text-ink-light">
            備註
          </div>
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            onBlur={() => onSave(text)}
            rows={5}
            className="w-full resize-none rounded-b-lg bg-washi p-3 text-sm text-ink focus:outline-none"
            placeholder="在這裡寫下備註…"
          />
        </div>
      )}
      <button
        aria-label="備註"
        onClick={() => setOpen((v) => !v)}
        className={[
          "rounded-full px-4 py-2 text-sm font-medium shadow-md transition-colors",
          open
            ? "bg-vermilion text-white"
            : "bg-paper text-ink hover:bg-vermilion hover:text-white",
        ].join(" ")}
      >
        {open ? "✕" : "備註"}
      </button>
    </div>
  );
}
```

**Step 5：修改 `frontend/src/components/PagedPreview.tsx`**

修改 `PagedPreviewProps` interface，新增可選 props：

```tsx
interface PagedPreviewProps {
  html: string;
  pageCount: number;
  initialPage?: number;
  onPageChange?: (page: number) => void;
  cachedTranslations?: Record<string, Record<string, Record<string, string>>>;
  onTranslationSaved?: (provider: string, lang: string, translations: Record<string, string>) => void;
}
```

修改函式簽名：
```tsx
export function PagedPreview({
  html,
  pageCount,
  initialPage = 1,
  onPageChange,
  cachedTranslations,
  onTranslationSaved,
}: PagedPreviewProps) {
```

修改 `currentPage` state 初始值：
```tsx
const [currentPage, setCurrentPage] = useState(initialPage);
const [inputValue, setInputValue] = useState(String(initialPage));
```

修改 `translationCache` state 初始值（將 cachedTranslations 格式轉換為 cache key 格式）：
```tsx
const [translationCache, setTranslationCache] = useState<Record<string, string[]>>(() => {
  if (!cachedTranslations) return {};
  const cache: Record<string, string[]> = {};
  // 僅載入，實際 key 格式於取得翻譯時建立
  return cache;
});
```

在 `setTranslationCache` 更新後，呼叫 `onTranslationSaved`：
```tsx
setTranslationCache((prev) => {
  const next = { ...prev, [cacheKey]: result };
  // 儲存到後端
  const perParagraph: Record<string, string> = {};
  result.forEach((t, i) => { perParagraph[`p-${i}`] = t; });
  onTranslationSaved?.(provider, targetLang, perParagraph);
  return next;
});
```

在 `goToPage` 函式內，換頁後呼叫 `onPageChange`（debounce 1 秒）：

在元件頂層加入：
```tsx
const pageChangeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
```

修改 `goToPage`：
```tsx
function goToPage(page: number) {
  const clamped = Math.max(1, Math.min(page, pageCount));
  setCurrentPage(clamped);
  setInputValue(String(clamped));
  if (pageChangeTimerRef.current) clearTimeout(pageChangeTimerRef.current);
  pageChangeTimerRef.current = setTimeout(() => onPageChange?.(clamped), 1000);
}
```

**Step 6：確認測試通過**

```bash
cd frontend && npx vitest run src/components/NotesPanel.test.tsx src/components/PagedPreview.test.tsx
```
Expected: 全部 PASS

**Step 7：Commit**

```bash
git add frontend/src/components/NotesPanel.tsx frontend/src/components/NotesPanel.test.tsx \
  frontend/src/components/PagedPreview.tsx frontend/src/components/PagedPreview.test.tsx
git commit -m "[Feature] 新增 NotesPanel，PagedPreview 支援 initialPage / onPageChange / 翻譯快取持久化"
```

---

## Task 7：App.tsx 重構 + 全面整合

**Files:**
- Modify: `frontend/src/App.tsx`
- Modify: `frontend/src/App.test.tsx`（若存在）

---

**Step 1：了解目前 App.tsx**

> 已讀取 App.tsx，目前狀態：`idle | uploading | success`，無側邊欄、無 library 狀態

**Step 2：撰寫失敗測試**

確認 App.test.tsx 存在，若無則建立 `frontend/src/App.test.tsx`：

```tsx
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import App from "./App";
import * as libraryApi from "./services/libraryApi";

vi.mock("./services/libraryApi");

const mockLibrary: libraryApi.Library = {
  folders: [{ id: "f-001", name: "ASMR", order: 0 }],
  tags: [],
  documents: [
    {
      id: "doc-001", name: "腳本", folderId: "f-001", tagIds: [],
      htmlFile: "doc-001.html", lastPage: 2, notes: "test note",
      translations: {}, createdAt: "", uploadedAt: "2026-02-22",
    },
  ],
};

beforeEach(() => {
  vi.mocked(libraryApi.getLibrary).mockResolvedValue(mockLibrary);
  vi.mocked(libraryApi.getDocumentHtml).mockResolvedValue({
    html: '<section class="page"><p>Hello</p></section>',
    page_count: 1,
  });
});

describe("App", () => {
  it("renders sidebar with folder", async () => {
    render(<App />);
    await waitFor(() => expect(screen.getByText("ASMR")).toBeInTheDocument());
  });

  it("shows idle state with welcome message initially", async () => {
    render(<App />);
    await waitFor(() => screen.getByText("ASMR"));
    expect(screen.getByText(/選擇文件/)).toBeInTheDocument();
  });

  it("loads document html when document clicked", async () => {
    render(<App />);
    await waitFor(() => screen.getByText("腳本"));
    fireEvent.click(screen.getByText("腳本"));
    await waitFor(() => expect(libraryApi.getDocumentHtml).toHaveBeenCalledWith("doc-001"));
  });
});
```

**Step 3：確認測試失敗**

```bash
cd frontend && npx vitest run src/App.test.tsx
```

**Step 4：重構 `frontend/src/App.tsx`**

```tsx
import { useCallback, useEffect, useState } from "react";
import { FileUploader } from "./components/FileUploader";
import { NotesPanel } from "./components/NotesPanel";
import { PagedPreview } from "./components/PagedPreview";
import { ProgressBar } from "./components/ProgressBar";
import { Sidebar } from "./components/Sidebar";
import { ToastProvider, useToast } from "./components/Toast";
import type { Document, Library } from "./services/libraryApi";
import * as libApi from "./services/libraryApi";

type AppState = "idle" | "loading" | "uploading" | "viewing";

function AppContent() {
  const { showToast } = useToast();

  // Library state
  const [library, setLibrary] = useState<Library>({ folders: [], tags: [], documents: [] });
  const [activeTags, setActiveTags] = useState<string[]>([]);

  // View state
  const [appState, setAppState] = useState<AppState>("idle");
  const [selectedDoc, setSelectedDoc] = useState<Document | null>(null);
  const [html, setHtml] = useState<string | null>(null);
  const [pageCount, setPageCount] = useState(0);
  const [pendingUploadDoc, setPendingUploadDoc] = useState<Document | null>(null);

  // Load library on mount
  useEffect(() => {
    libApi.getLibrary().then(setLibrary).catch(() => showToast("無法載入文件庫"));
  }, []);

  const refreshLibrary = useCallback(async () => {
    try {
      const lib = await libApi.getLibrary();
      setLibrary(lib);
    } catch {
      showToast("文件庫更新失敗");
    }
  }, []);

  // Select document (already uploaded)
  const handleSelectDocument = useCallback(async (doc: Document) => {
    setSelectedDoc(doc);
    setAppState("loading");
    try {
      const result = await libApi.getDocumentHtml(doc.id);
      setHtml(result.html);
      setPageCount(result.page_count);
      setAppState("viewing");
    } catch {
      showToast("無法載入文件內容");
      setAppState("idle");
    }
  }, []);

  // Upload document flow
  const handleUploadDocument = useCallback((doc: Document) => {
    setPendingUploadDoc(doc);
    setSelectedDoc(doc);
    setHtml(null);
    setAppState("uploading");
  }, []);

  // File selected in FileUploader → upload to library endpoint
  const handleFileSelect = useCallback(async (file: File) => {
    if (!pendingUploadDoc) return;
    setAppState("loading");
    try {
      const result = await libApi.uploadDocument(pendingUploadDoc.id, file);
      setHtml(
        (await libApi.getDocumentHtml(pendingUploadDoc.id)).html,
      );
      setPageCount(result.page_count);
      await refreshLibrary();
      setAppState("viewing");
    } catch (err) {
      showToast(err instanceof Error ? err.message : "上傳失敗");
      setAppState("uploading");
    }
  }, [pendingUploadDoc, refreshLibrary]);

  // CRUD handlers
  const handleCreateFolder = async (name: string) => {
    await libApi.createFolder(name);
    await refreshLibrary();
  };
  const handleRenameFolder = async (id: string, name: string) => {
    await libApi.renameFolder(id, name);
    await refreshLibrary();
  };
  const handleDeleteFolder = async (id: string) => {
    await libApi.deleteFolder(id);
    await refreshLibrary();
    if (selectedDoc?.folderId === id) { setSelectedDoc(null); setHtml(null); setAppState("idle"); }
  };
  const handleCreateDocument = async (name: string, folderId: string) => {
    await libApi.createDocument(name, folderId);
    await refreshLibrary();
  };
  const handleRenameDocument = async (id: string, name: string) => {
    await libApi.updateDocument(id, { name });
    await refreshLibrary();
    if (selectedDoc?.id === id) setSelectedDoc((d) => d ? { ...d, name } : d);
  };
  const handleDeleteDocument = async (id: string) => {
    await libApi.deleteDocument(id);
    await refreshLibrary();
    if (selectedDoc?.id === id) { setSelectedDoc(null); setHtml(null); setAppState("idle"); }
  };
  const handleMoveDocument = async (docId: string, folderId: string) => {
    await libApi.updateDocument(docId, { folderId });
    await refreshLibrary();
  };
  const handleCreateTag = async (name: string, color: string) => {
    await libApi.createTag(name, color);
    await refreshLibrary();
  };
  const handleDeleteTag = async (id: string) => {
    await libApi.deleteTag(id);
    await refreshLibrary();
  };
  const handlePageChange = useCallback(async (page: number) => {
    if (!selectedDoc) return;
    await libApi.updateDocument(selectedDoc.id, { lastPage: page });
  }, [selectedDoc]);
  const handleTranslationSaved = useCallback(async (
    provider: string, lang: string, translations: Record<string, string>
  ) => {
    if (!selectedDoc) return;
    await libApi.saveTranslations(selectedDoc.id, provider, lang, translations);
  }, [selectedDoc]);
  const handleNotesSave = useCallback(async (notes: string) => {
    if (!selectedDoc) return;
    await libApi.updateDocument(selectedDoc.id, { notes });
  }, [selectedDoc]);

  return (
    <div className="flex h-screen flex-col bg-washi">
      {/* Header */}
      <header className="flex-shrink-0 border-b border-washi-border bg-washi px-6 py-4">
        <div className="flex items-center gap-3">
          <div className="h-7 w-[3px] rounded-full bg-vermilion" />
          <div>
            <span className="text-xl font-bold text-vermilion">振り仮名</span>
            <span className="ml-2 text-sm text-ink-light">PDF ふりがなツール</span>
          </div>
        </div>
      </header>

      {/* Body */}
      <div className="flex flex-1 overflow-hidden">
        <Sidebar
          library={library}
          selectedDocId={selectedDoc?.id ?? null}
          activeTags={activeTags}
          onSelectDocument={handleSelectDocument}
          onCreateFolder={handleCreateFolder}
          onRenameFolder={handleRenameFolder}
          onDeleteFolder={handleDeleteFolder}
          onCreateDocument={handleCreateDocument}
          onRenameDocument={handleRenameDocument}
          onDeleteDocument={handleDeleteDocument}
          onMoveDocument={handleMoveDocument}
          onUploadDocument={handleUploadDocument}
          onCreateTag={handleCreateTag}
          onDeleteTag={handleDeleteTag}
          onTagFilterChange={setActiveTags}
        />

        <main className="relative flex-1 overflow-auto px-6 py-8">
          {appState === "idle" && (
            <div className="flex h-full items-center justify-center text-ink-light">
              <p>從左側選擇文件以開始閱讀</p>
            </div>
          )}

          {appState === "loading" && (
            <div className="flex h-full items-center justify-center">
              <ProgressBar />
            </div>
          )}

          {appState === "uploading" && pendingUploadDoc && (
            <div className="mx-auto max-w-xl">
              <p className="mb-4 text-sm text-ink-light">
                上傳「{pendingUploadDoc.name}」的 PDF 或 TXT 檔案
              </p>
              <FileUploader
                onFileSelect={handleFileSelect}
                disabled={false}
                collapsed={false}
                fileName=""
                onReset={() => { setAppState("idle"); setPendingUploadDoc(null); }}
              />
            </div>
          )}

          {appState === "viewing" && html && selectedDoc && (
            <>
              <PagedPreview
                html={html}
                pageCount={pageCount}
                initialPage={selectedDoc.lastPage || 1}
                onPageChange={handlePageChange}
                cachedTranslations={selectedDoc.translations}
                onTranslationSaved={handleTranslationSaved}
              />
              <NotesPanel
                initialNotes={selectedDoc.notes}
                onSave={handleNotesSave}
              />
            </>
          )}
        </main>
      </div>
    </div>
  );
}

function App() {
  return (
    <ToastProvider>
      <AppContent />
    </ToastProvider>
  );
}

export default App;
```

**Step 5：確認測試通過**

```bash
cd frontend && npx vitest run src/App.test.tsx
```
Expected: 全部 PASS

**Step 6：確認所有前端測試**

```bash
cd frontend && npx vitest run
```
Expected: 全部 PASS

**Step 7：Commit**

```bash
git add frontend/src/App.tsx frontend/src/App.test.tsx
git commit -m "[Feature] App.tsx 重構整合 Sidebar / 文件庫狀態機 / NotesPanel / 持久化"
```

---

## Task 8：新增文件對話框 + 側邊欄新增文件功能

> 目前 Sidebar 的 FolderItem 只顯示文件，尚未實作「在資料夾內新增文件」的 UI。

**Files:**
- Modify: `frontend/src/components/FolderItem.tsx`
- Modify: `frontend/src/components/Sidebar.tsx`

---

**Step 1：在 FolderItem 加入「+ 新增文件」按鈕**

在 `FolderItem.tsx` 的 `{expanded && (...)}` 區塊內，文件列表後加入：

```tsx
{expanded && (
  <div className="ml-4">
    {documents.map((doc) => (
      <DocumentItem key={doc.id} ... />
    ))}
    <button
      onClick={() => {
        const name = window.prompt("文件名稱");
        if (name?.trim()) onAddDocument(folder.id, name.trim());
      }}
      className="mt-1 w-full rounded px-3 py-1 text-left text-xs text-ink-light transition-colors hover:text-vermilion"
    >
      + 新增文件
    </button>
  </div>
)}
```

在 `FolderItem` Props 加入：
```tsx
onAddDocument: (folderId: string, name: string) => void;
```

**Step 2：Sidebar 傳遞 onAddDocument**

在 `FolderItem` 元件呼叫處加入：
```tsx
onAddDocument={(folderId, name) => onCreateDocument(name, folderId)}
```

**Step 3：確認既有測試不受影響**

```bash
cd frontend && npx vitest run
```
Expected: 全部 PASS

**Step 4：Commit**

```bash
git add frontend/src/components/FolderItem.tsx frontend/src/components/Sidebar.tsx
git commit -m "[Feature] FolderItem 加入新增文件按鈕"
```

---

## 驗收標準

- [ ] `python -m pytest` 所有後端測試通過
- [ ] `npx vitest run` 所有前端測試通過
- [ ] 啟動後端 + 前端，可建立資料夾、新增文件、上傳 PDF/TXT
- [ ] 關閉並重啟，文件仍存在側邊欄，點選後直接顯示內容
- [ ] 翻譯快取：同一文件同一供應商不重新呼叫翻譯 API
- [ ] 最後閱讀頁數：重新開啟文件跳到上次頁數
- [ ] 備註：輸入後失焦自動儲存，重新開啟仍顯示
- [ ] Tag 篩選：勾選 tag 後只顯示含有該 tag 的文件
- [ ] 拖放文件到其他資料夾正常運作
- [ ] 右鍵選單：重新命名、移動到、刪除、上傳（未上傳文件）
