import tempfile
from pathlib import Path

from fastapi import APIRouter, File, HTTPException, UploadFile

from app.services.html_generator import generate_html
from app.services.pdf_extractor import extract_text_by_pages

router = APIRouter()


@router.post("/convert")
async def convert_pdf(file: UploadFile = File(...)):
    # 驗證檔案類型
    if not file.filename or not file.filename.lower().endswith(".pdf"):
        raise HTTPException(status_code=400, detail="只接受 PDF 檔案")

    # 儲存上傳的檔案到暫存目錄
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
