import tempfile
from pathlib import Path

from fastapi import APIRouter, File, HTTPException, UploadFile

from app.services.html_generator import generate_html, generate_html_from_script_txt
from app.services.pdf_extractor import extract_text_by_pages

router = APIRouter()


@router.post("/convert")
async def convert_file(file: UploadFile = File(...)):
    if not file.filename:
        raise HTTPException(status_code=400, detail="請選擇檔案")

    name_lower = file.filename.lower()

    if name_lower.endswith(".pdf"):
        with tempfile.NamedTemporaryFile(suffix=".pdf", delete=False) as tmp:
            content = await file.read()
            tmp.write(content)
            tmp_path = tmp.name

        try:
            pages = extract_text_by_pages(tmp_path)
            html = generate_html(pages)
            return {"html": html, "page_count": len(pages)}
        except Exception as e:
            raise HTTPException(status_code=400, detail=f"PDF 處理失敗: {str(e)}")
        finally:
            Path(tmp_path).unlink(missing_ok=True)

    elif name_lower.endswith(".txt"):
        content = await file.read()
        try:
            text = content.decode("utf-8")
        except UnicodeDecodeError:
            raise HTTPException(status_code=400, detail="TXT 檔案必須為 UTF-8 編碼")

        html = generate_html_from_script_txt(text)
        return {"html": html, "page_count": 1}

    else:
        raise HTTPException(status_code=400, detail="只接受 PDF 或 TXT 檔案")
