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
