from pathlib import Path

from dotenv import load_dotenv

load_dotenv(Path(__file__).resolve().parent.parent / ".env")

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.routers import convert, translate, library

app = FastAPI(title="PDF Furigana Tool")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(convert.router, prefix="/api")
app.include_router(translate.router, prefix="/api")
app.include_router(library.router)


@app.get("/api/health")
def health_check():
    return {"status": "ok"}
