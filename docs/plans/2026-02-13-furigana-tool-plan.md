# PDF 振り仮名標注工具 Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** 建立一個 Web 應用，使用者上傳日文 PDF 後自動為漢字加上振り仮名，並在瀏覽器預覽結果。

**Architecture:** 前後端分離架構。後端 FastAPI 提供 `/api/convert` 端點，接收 PDF 檔案後透過 PyMuPDF 提取文字、fugashi (MeCab) 解析讀音、產生帶 `<ruby>` 標籤的 HTML。前端 React + Vite + TypeScript 提供上傳介面與預覽。

**Tech Stack:** Python 3.11+, FastAPI, PyMuPDF, fugashi, unidic-lite, Jinja2, React, TypeScript, Vite, pytest

**Design doc:** `docs/plans/2026-02-13-furigana-tool-design.md`

---

## Task 1: 後端專案初始化

**Files:**
- Create: `backend/requirements.txt`
- Create: `backend/app/__init__.py`

**Step 1: 建立後端目錄結構與 requirements.txt**

```txt
# backend/requirements.txt
fastapi==0.115.0
uvicorn[standard]==0.30.0
python-multipart==0.0.9
PyMuPDF==1.24.0
fugashi[unidic-lite]==1.3.2
unidic-lite==1.0.8
Jinja2==3.1.4
pytest==8.3.0
httpx==0.27.0
```

```python
# backend/app/__init__.py
(empty file)
```

**Step 2: 建立目錄結構**

```bash
mkdir -p backend/app/routers backend/app/services backend/tests
```

建立所有 `__init__.py`：

```python
# backend/app/routers/__init__.py
# backend/app/services/__init__.py
# backend/tests/__init__.py
(all empty files)
```

**Step 3: 安裝依賴**

```bash
cd backend && pip install -r requirements.txt
```

Expected: 全部安裝成功，無錯誤

**Step 4: 驗證關鍵套件可 import**

```bash
python -c "import fitz; import fugashi; print('OK')"
```

Expected: `OK`

**Step 5: Commit**

```bash
git add backend/
git commit -m "[Feature] 初始化後端專案結構與依賴"
```

---

## Task 2: 片假名轉平假名工具函式 (TDD)

**Files:**
- Create: `backend/tests/test_furigana.py`
- Create: `backend/app/services/furigana.py`

**Step 1: 寫 failing test — contains_kanji 與 kata_to_hira**

```python
# backend/tests/test_furigana.py
from app.services.furigana import contains_kanji, kata_to_hira


def test_contains_kanji_with_kanji():
    assert contains_kanji("漢字") is True


def test_contains_kanji_with_hiragana():
    assert contains_kanji("ひらがな") is False


def test_contains_kanji_with_mixed():
    assert contains_kanji("食べる") is True


def test_contains_kanji_with_ascii():
    assert contains_kanji("hello") is False


def test_kata_to_hira_basic():
    assert kata_to_hira("カンジ") == "かんじ"


def test_kata_to_hira_mixed():
    assert kata_to_hira("タベル") == "たべる"


def test_kata_to_hira_already_hiragana():
    assert kata_to_hira("かんじ") == "かんじ"
```

**Step 2: 執行測試確認失敗**

```bash
cd backend && python -m pytest tests/test_furigana.py -v
```

Expected: FAIL — `ModuleNotFoundError: No module named 'app.services.furigana'`

**Step 3: 實作 contains_kanji 與 kata_to_hira**

```python
# backend/app/services/furigana.py
import re

import fugashi

_tagger = fugashi.Tagger()


def contains_kanji(text: str) -> bool:
    """判斷文字中是否包含漢字"""
    return bool(re.search(r"[\u4e00-\u9fff]", text))


def kata_to_hira(text: str) -> str:
    """片假名轉平假名"""
    return "".join(
        chr(ord(c) - 0x60) if "\u30a1" <= c <= "\u30f6" else c for c in text
    )
```

**Step 4: 執行測試確認通過**

```bash
cd backend && python -m pytest tests/test_furigana.py -v
```

Expected: 7 passed

**Step 5: Commit**

```bash
git add backend/app/services/furigana.py backend/tests/test_furigana.py
git commit -m "[Feature] 新增漢字判斷與片假名轉平假名工具函式"
```

---

## Task 3: 振り仮名標注核心邏輯 (TDD)

**Files:**
- Modify: `backend/tests/test_furigana.py`
- Modify: `backend/app/services/furigana.py`

**Step 1: 寫 failing test — add_furigana**

在 `backend/tests/test_furigana.py` 追加：

```python
from app.services.furigana import add_furigana


def test_add_furigana_kanji_only():
    result = add_furigana("漢字")
    assert "<ruby>" in result
    assert "<rt>" in result
    assert "漢字" in result


def test_add_furigana_hiragana_unchanged():
    result = add_furigana("ひらがな")
    assert "<ruby>" not in result
    assert result == "ひらがな"


def test_add_furigana_mixed_sentence():
    result = add_furigana("東京は大きい都市です")
    # 漢字部分應該有 ruby 標籤
    assert "<ruby>東京" in result or "<ruby>東" in result
    # 平假名部分不應有 ruby 標籤
    assert "です</ruby>" not in result


def test_add_furigana_empty_string():
    result = add_furigana("")
    assert result == ""
```

**Step 2: 執行測試確認失敗**

```bash
cd backend && python -m pytest tests/test_furigana.py::test_add_furigana_kanji_only -v
```

Expected: FAIL — `ImportError: cannot import name 'add_furigana'`

**Step 3: 實作 add_furigana**

在 `backend/app/services/furigana.py` 追加：

```python
def add_furigana(text: str) -> str:
    """將文字中的漢字加上振り仮名，回傳含 ruby 標籤的 HTML"""
    if not text:
        return ""

    result = []
    for word in _tagger(text):
        surface = word.surface
        reading = word.feature.kana

        if reading and contains_kanji(surface):
            hiragana = kata_to_hira(reading)
            result.append(
                f"<ruby>{surface}<rp>(</rp><rt>{hiragana}</rt><rp>)</rp></ruby>"
            )
        else:
            result.append(surface)

    return "".join(result)
```

**Step 4: 執行測試確認通過**

```bash
cd backend && python -m pytest tests/test_furigana.py -v
```

Expected: 11 passed

**Step 5: Commit**

```bash
git add backend/app/services/furigana.py backend/tests/test_furigana.py
git commit -m "[Feature] 新增振り仮名標注核心邏輯 add_furigana"
```

---

## Task 4: PDF 文字提取服務 (TDD)

**Files:**
- Create: `backend/tests/test_pdf_extractor.py`
- Create: `backend/app/services/pdf_extractor.py`
- Create: `backend/tests/fixtures/` (測試用 PDF)

**Step 1: 建立測試用 PDF fixture**

```python
# backend/tests/conftest.py
import fitz
import pytest


@pytest.fixture
def sample_pdf(tmp_path):
    """建立一個包含日文文字的測試 PDF"""
    pdf_path = tmp_path / "test.pdf"
    doc = fitz.open()
    page = doc.new_page()
    # 插入日文文字（使用內建字型只支援 ASCII，但足夠測試結構）
    text = "This is a test page"
    page.insert_text((72, 72), text, fontsize=12)
    doc.save(str(pdf_path))
    doc.close()
    return str(pdf_path)


@pytest.fixture
def empty_pdf(tmp_path):
    """建立一個空白 PDF"""
    pdf_path = tmp_path / "empty.pdf"
    doc = fitz.open()
    doc.new_page()
    doc.save(str(pdf_path))
    doc.close()
    return str(pdf_path)
```

**Step 2: 寫 failing test**

```python
# backend/tests/test_pdf_extractor.py
from app.services.pdf_extractor import extract_text_by_pages


def test_extract_returns_list(sample_pdf):
    result = extract_text_by_pages(sample_pdf)
    assert isinstance(result, list)
    assert len(result) == 1


def test_extract_page_structure(sample_pdf):
    result = extract_text_by_pages(sample_pdf)
    page = result[0]
    assert "page_num" in page
    assert "paragraphs" in page
    assert page["page_num"] == 1


def test_extract_has_text(sample_pdf):
    result = extract_text_by_pages(sample_pdf)
    paragraphs = result[0]["paragraphs"]
    assert len(paragraphs) > 0


def test_extract_empty_pdf(empty_pdf):
    result = extract_text_by_pages(empty_pdf)
    assert len(result) == 1
    assert result[0]["paragraphs"] == []


def test_extract_invalid_file():
    import pytest
    with pytest.raises(Exception):
        extract_text_by_pages("nonexistent.pdf")
```

**Step 3: 執行測試確認失敗**

```bash
cd backend && python -m pytest tests/test_pdf_extractor.py -v
```

Expected: FAIL — `ModuleNotFoundError`

**Step 4: 實作 pdf_extractor**

```python
# backend/app/services/pdf_extractor.py
import fitz


def extract_text_by_pages(pdf_path: str) -> list[dict]:
    """從 PDF 逐頁提取文字，保留段落結構。

    Returns:
        list of {"page_num": int, "paragraphs": list[str]}
    """
    doc = fitz.open(pdf_path)
    pages = []
    for page in doc:
        blocks = page.get_text("blocks")
        paragraphs = [b[4].strip() for b in blocks if b[6] == 0 and b[4].strip()]
        pages.append({"page_num": page.number + 1, "paragraphs": paragraphs})
    doc.close()
    return pages
```

**Step 5: 執行測試確認通過**

```bash
cd backend && python -m pytest tests/test_pdf_extractor.py -v
```

Expected: 5 passed

**Step 6: Commit**

```bash
git add backend/app/services/pdf_extractor.py backend/tests/test_pdf_extractor.py backend/tests/conftest.py
git commit -m "[Feature] 新增 PDF 文字提取服務"
```

---

## Task 5: HTML 產生器 (TDD)

**Files:**
- Create: `backend/tests/test_html_generator.py`
- Create: `backend/app/services/html_generator.py`

**Step 1: 寫 failing test**

```python
# backend/tests/test_html_generator.py
from app.services.html_generator import generate_html


def test_generate_html_single_page():
    pages = [
        {"page_num": 1, "paragraphs": ["これはテストです"]}
    ]
    result = generate_html(pages)
    assert "<ruby>" in result or "これはテストです" in result
    assert "1" in result  # 頁碼


def test_generate_html_multiple_pages():
    pages = [
        {"page_num": 1, "paragraphs": ["第一頁"]},
        {"page_num": 2, "paragraphs": ["第二頁"]},
    ]
    result = generate_html(pages)
    assert "1" in result
    assert "2" in result


def test_generate_html_empty_pages():
    pages = [{"page_num": 1, "paragraphs": []}]
    result = generate_html(pages)
    assert isinstance(result, str)


def test_generate_html_preserves_paragraphs():
    pages = [
        {"page_num": 1, "paragraphs": ["段落一", "段落二"]}
    ]
    result = generate_html(pages)
    # 每個段落應該被包在 <p> 標籤中
    assert result.count("<p>") >= 2
```

**Step 2: 執行測試確認失敗**

```bash
cd backend && python -m pytest tests/test_html_generator.py -v
```

Expected: FAIL — `ModuleNotFoundError`

**Step 3: 實作 html_generator**

```python
# backend/app/services/html_generator.py
from app.services.furigana import add_furigana


def generate_html(pages: list[dict]) -> str:
    """將各頁段落轉換為帶振り仮名的 HTML。

    Args:
        pages: list of {"page_num": int, "paragraphs": list[str]}

    Returns:
        完整 HTML 字串
    """
    html_parts = []

    for page in pages:
        html_parts.append(f'<section class="page" data-page="{page["page_num"]}">')
        html_parts.append(f'<h2>Page {page["page_num"]}</h2>')

        for paragraph in page["paragraphs"]:
            furigana_text = add_furigana(paragraph)
            html_parts.append(f"<p>{furigana_text}</p>")

        html_parts.append("</section>")

    return "\n".join(html_parts)
```

**Step 4: 執行測試確認通過**

```bash
cd backend && python -m pytest tests/test_html_generator.py -v
```

Expected: 4 passed

**Step 5: Commit**

```bash
git add backend/app/services/html_generator.py backend/tests/test_html_generator.py
git commit -m "[Feature] 新增 HTML 產生器，組合振り仮名與頁面結構"
```

---

## Task 6: FastAPI 應用與轉換 API (TDD)

**Files:**
- Create: `backend/app/main.py`
- Create: `backend/app/routers/convert.py`
- Create: `backend/tests/test_api.py`

**Step 1: 寫 failing test — API 端點**

```python
# backend/tests/test_api.py
import fitz
import pytest
from fastapi.testclient import TestClient

from app.main import app

client = TestClient(app)


@pytest.fixture
def japanese_pdf(tmp_path):
    """建立含日文的測試 PDF"""
    pdf_path = tmp_path / "japanese.pdf"
    doc = fitz.open()
    page = doc.new_page()
    # 使用 insert_text 插入 ASCII 文字作為基本測試
    page.insert_text((72, 72), "Test document", fontsize=12)
    doc.save(str(pdf_path))
    doc.close()
    return pdf_path


def test_convert_endpoint_exists():
    response = client.post("/api/convert")
    # 沒有上傳檔案應該回 422（缺少必要欄位）
    assert response.status_code == 422


def test_convert_with_pdf(japanese_pdf):
    with open(japanese_pdf, "rb") as f:
        response = client.post("/api/convert", files={"file": ("test.pdf", f, "application/pdf")})
    assert response.status_code == 200
    data = response.json()
    assert "html" in data
    assert "page_count" in data
    assert data["page_count"] == 1


def test_convert_rejects_non_pdf():
    response = client.post(
        "/api/convert",
        files={"file": ("test.txt", b"not a pdf", "text/plain")},
    )
    assert response.status_code == 400


def test_health_check():
    response = client.get("/api/health")
    assert response.status_code == 200
```

**Step 2: 執行測試確認失敗**

```bash
cd backend && python -m pytest tests/test_api.py -v
```

Expected: FAIL — `ModuleNotFoundError: No module named 'app.main'`

**Step 3: 實作 FastAPI 應用**

```python
# backend/app/main.py
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
```

```python
# backend/app/routers/convert.py
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
```

**Step 4: 執行測試確認通過**

```bash
cd backend && python -m pytest tests/test_api.py -v
```

Expected: 4 passed

**Step 5: 執行全部後端測試**

```bash
cd backend && python -m pytest -v
```

Expected: All tests passed

**Step 6: Commit**

```bash
git add backend/app/main.py backend/app/routers/convert.py backend/tests/test_api.py
git commit -m "[Feature] 新增 FastAPI 應用與 /api/convert 端點"
```

---

## Task 7: 前端專案初始化

**Files:**
- Create: `frontend/` (Vite scaffold)

**Step 1: 使用 Vite 建立 React + TypeScript 專案**

```bash
cd frontend && npm create vite@latest . -- --template react-ts
```

若目錄已存在，選擇覆蓋。

**Step 2: 安裝依賴**

```bash
cd frontend && npm install
```

**Step 3: 驗證開發伺服器可啟動**

```bash
cd frontend && npm run dev -- --host 0.0.0.0 &
# 等幾秒後 curl 測試
curl -s http://localhost:5173 | head -5
# 然後 kill 背景程序
```

Expected: 回傳 HTML 內容

**Step 4: 清理 Vite 預設檔案**

清空 `src/App.tsx` 和 `src/App.css` 的預設內容，保留空殼。

**Step 5: Commit**

```bash
git add frontend/
git commit -m "[Feature] 初始化 React + TypeScript 前端專案 (Vite)"
```

---

## Task 8: API 呼叫服務層

**Files:**
- Create: `frontend/src/services/api.ts`

**Step 1: 實作 API 呼叫函式**

```typescript
// frontend/src/services/api.ts
const API_BASE = "http://localhost:8000/api";

export interface ConvertResponse {
  html: string;
  page_count: number;
}

export async function convertPdf(file: File): Promise<ConvertResponse> {
  const formData = new FormData();
  formData.append("file", file);

  const response = await fetch(`${API_BASE}/convert`, {
    method: "POST",
    body: formData,
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ detail: "未知錯誤" }));
    throw new Error(error.detail || `HTTP ${response.status}`);
  }

  return response.json();
}
```

**Step 2: Commit**

```bash
git add frontend/src/services/api.ts
git commit -m "[Feature] 新增前端 API 服務層"
```

---

## Task 9: FileUploader 元件

**Files:**
- Create: `frontend/src/components/FileUploader.tsx`

**Step 1: 實作拖放上傳元件**

```tsx
// frontend/src/components/FileUploader.tsx
import { useCallback, useRef, useState } from "react";

interface FileUploaderProps {
  onFileSelect: (file: File) => void;
  disabled?: boolean;
}

export function FileUploader({ onFileSelect, disabled }: FileUploaderProps) {
  const [isDragging, setIsDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      const file = e.dataTransfer.files[0];
      if (file && file.type === "application/pdf") {
        onFileSelect(file);
      }
    },
    [onFileSelect]
  );

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      onFileSelect(file);
    }
  };

  return (
    <div
      className={`file-uploader ${isDragging ? "dragging" : ""}`}
      onDragOver={(e) => {
        e.preventDefault();
        setIsDragging(true);
      }}
      onDragLeave={() => setIsDragging(false)}
      onDrop={handleDrop}
      onClick={() => inputRef.current?.click()}
    >
      <p>拖放 PDF 檔案至此</p>
      <p>或 點擊選擇檔案</p>
      <input
        ref={inputRef}
        type="file"
        accept=".pdf"
        onChange={handleChange}
        disabled={disabled}
        hidden
      />
    </div>
  );
}
```

**Step 2: Commit**

```bash
git add frontend/src/components/FileUploader.tsx
git commit -m "[Feature] 新增 FileUploader 拖放上傳元件"
```

---

## Task 10: ProgressBar 與 HtmlPreview 元件

**Files:**
- Create: `frontend/src/components/ProgressBar.tsx`
- Create: `frontend/src/components/HtmlPreview.tsx`

**Step 1: 實作 ProgressBar**

```tsx
// frontend/src/components/ProgressBar.tsx
interface ProgressBarProps {
  message?: string;
}

export function ProgressBar({ message = "處理中..." }: ProgressBarProps) {
  return (
    <div className="progress-bar">
      <div className="progress-bar__track">
        <div className="progress-bar__fill" />
      </div>
      <p>{message}</p>
    </div>
  );
}
```

**Step 2: 實作 HtmlPreview**

```tsx
// frontend/src/components/HtmlPreview.tsx
interface HtmlPreviewProps {
  html: string;
  pageCount: number;
}

export function HtmlPreview({ html, pageCount }: HtmlPreviewProps) {
  return (
    <div className="html-preview">
      <h2>預覽（共 {pageCount} 頁）</h2>
      <div
        className="html-preview__content"
        dangerouslySetInnerHTML={{ __html: html }}
      />
    </div>
  );
}
```

**Step 3: Commit**

```bash
git add frontend/src/components/ProgressBar.tsx frontend/src/components/HtmlPreview.tsx
git commit -m "[Feature] 新增 ProgressBar 與 HtmlPreview 元件"
```

---

## Task 11: App 主元件整合

**Files:**
- Modify: `frontend/src/App.tsx`
- Modify: `frontend/src/App.css`

**Step 1: 實作 App 主元件**

```tsx
// frontend/src/App.tsx
import { useState } from "react";
import { FileUploader } from "./components/FileUploader";
import { HtmlPreview } from "./components/HtmlPreview";
import { ProgressBar } from "./components/ProgressBar";
import { convertPdf } from "./services/api";
import "./App.css";

function App() {
  const [loading, setLoading] = useState(false);
  const [html, setHtml] = useState<string | null>(null);
  const [pageCount, setPageCount] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const handleFileSelect = async (file: File) => {
    setLoading(true);
    setError(null);
    setHtml(null);

    try {
      const result = await convertPdf(file);
      setHtml(result.html);
      setPageCount(result.page_count);
    } catch (err) {
      setError(err instanceof Error ? err.message : "轉換失敗");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="app">
      <h1>PDF 振り仮名標注工具</h1>
      <FileUploader onFileSelect={handleFileSelect} disabled={loading} />
      {loading && <ProgressBar />}
      {error && <p className="error">{error}</p>}
      {html && <HtmlPreview html={html} pageCount={pageCount} />}
    </div>
  );
}

export default App;
```

**Step 2: 加入基本樣式**

```css
/* frontend/src/App.css */
.app {
  max-width: 800px;
  margin: 0 auto;
  padding: 2rem;
  font-family: "Noto Sans JP", sans-serif;
}

h1 {
  text-align: center;
  margin-bottom: 2rem;
}

.file-uploader {
  border: 2px dashed #ccc;
  border-radius: 8px;
  padding: 3rem;
  text-align: center;
  cursor: pointer;
  transition: border-color 0.2s, background-color 0.2s;
}

.file-uploader:hover,
.file-uploader.dragging {
  border-color: #4a90d9;
  background-color: #f0f7ff;
}

.progress-bar {
  margin: 1.5rem 0;
  text-align: center;
}

.progress-bar__track {
  height: 6px;
  background: #e0e0e0;
  border-radius: 3px;
  overflow: hidden;
}

.progress-bar__fill {
  height: 100%;
  background: #4a90d9;
  border-radius: 3px;
  animation: indeterminate 1.5s infinite ease-in-out;
}

@keyframes indeterminate {
  0% { transform: translateX(-100%); width: 40%; }
  50% { transform: translateX(60%); width: 60%; }
  100% { transform: translateX(200%); width: 40%; }
}

.error {
  color: #d32f2f;
  text-align: center;
  padding: 1rem;
  background: #ffeaea;
  border-radius: 4px;
}

.html-preview {
  margin-top: 2rem;
  border: 1px solid #e0e0e0;
  border-radius: 8px;
  padding: 1.5rem;
}

.html-preview__content {
  line-height: 2.5;
  font-size: 1.1rem;
}

.html-preview__content ruby {
  ruby-position: over;
}

.html-preview__content rt {
  font-size: 0.6em;
  color: #666;
}

.html-preview__content .page {
  margin-bottom: 2rem;
  padding-bottom: 1rem;
  border-bottom: 1px solid #eee;
}
```

**Step 3: 驗證前端可正常編譯**

```bash
cd frontend && npm run build
```

Expected: 編譯成功，無錯誤

**Step 4: Commit**

```bash
git add frontend/src/App.tsx frontend/src/App.css
git commit -m "[Feature] 整合 App 主元件，完成前端頁面"
```

---

## Task 12: 端對端整合測試

**Step 1: 啟動後端**

```bash
cd backend && uvicorn app.main:app --reload --port 8000 &
```

**Step 2: 啟動前端**

```bash
cd frontend && npm run dev &
```

**Step 3: 手動測試**

1. 開啟 `http://localhost:5173`
2. 上傳一個日文 PDF
3. 確認 HTML 預覽正確顯示振り仮名

**Step 4: 執行全部後端測試確認無回歸**

```bash
cd backend && python -m pytest -v
```

Expected: All tests passed

**Step 5: Commit**

```bash
git add -A
git commit -m "[Chore] 端對端整合驗證完成"
```

---

## Task Summary

| Task | 內容 | 預計步驟數 |
|------|------|-----------|
| 1 | 後端專案初始化 | 5 |
| 2 | 片假名轉平假名工具函式 (TDD) | 5 |
| 3 | 振り仮名標注核心邏輯 (TDD) | 5 |
| 4 | PDF 文字提取服務 (TDD) | 6 |
| 5 | HTML 產生器 (TDD) | 5 |
| 6 | FastAPI 應用與 API (TDD) | 6 |
| 7 | 前端專案初始化 | 5 |
| 8 | API 呼叫服務層 | 2 |
| 9 | FileUploader 元件 | 2 |
| 10 | ProgressBar 與 HtmlPreview 元件 | 3 |
| 11 | App 主元件整合 | 4 |
| 12 | 端對端整合測試 | 5 |
