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
