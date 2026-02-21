from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.routers import convert

app = FastAPI(title="PDF Furigana Tool")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(convert.router, prefix="/api")


@app.get("/api/health")
def health_check():
    return {"status": "ok"}
