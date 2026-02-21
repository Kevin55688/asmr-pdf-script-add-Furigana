from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from app.services.translator import translate

router = APIRouter()


class TranslateRequest(BaseModel):
    texts: list[str]
    provider: str  # "deepl" | "google" | "claude"
    target_lang: str  # "zh-TW" | "zh-CN" | "en" | "ko"


class TranslateResponse(BaseModel):
    translations: list[str]


@router.post("/translate", response_model=TranslateResponse)
async def translate_texts(req: TranslateRequest):
    try:
        result = await translate(req.texts, req.provider, req.target_lang)
        return TranslateResponse(translations=result)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception:
        raise HTTPException(status_code=502, detail="翻譯服務暫時無法使用")
