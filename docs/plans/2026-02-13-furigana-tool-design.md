# PDF 振り仮名標注工具 — 設計文件

> 日期：2026-02-13
> 狀態：已核可

## 目標

開發一個 Web 應用，使用者上傳日文 PDF 後，系統自動為漢字加上振り仮名（furigana），並在瀏覽器中即時預覽結果。

## 需求規格

| 項目 | 規格 |
|------|------|
| 輸入 | 一般日文文章 PDF |
| 輸出 | 帶 `<ruby>` 標籤的 HTML（瀏覽器預覽） |
| 執行方式 | Web 應用（前後端分離） |
| 準確度 | 高（MeCab 形態素解析） |

## 系統架構

```
┌─────────────────────────────────────────────────┐
│              React 前端 (Vite + TS)              │
│  ┌───────────┐  ┌────────────┐  ┌────────────┐  │
│  │ PDF 上傳   │→│ 進度顯示    │→│ HTML 預覽   │  │
│  │ (拖放/選檔) │  │ (進度條)    │  │ (ruby 渲染) │  │
│  └───────────┘  └────────────┘  └────────────┘  │
└──────────────────────┬──────────────────────────┘
                       │ HTTP API (CORS)
┌──────────────────────▼──────────────────────────┐
│               FastAPI 後端                       │
│                                                  │
│  POST /api/convert                               │
│  ┌──────────┐  ┌──────────┐  ┌───────────────┐  │
│  │ PDF 解析  │→│ 日文分析  │→│ HTML 片段產生  │  │
│  │ (PyMuPDF) │  │ (MeCab)  │  │ (Jinja2+ruby) │  │
│  └──────────┘  └──────────┘  └───────────────┘  │
└─────────────────────────────────────────────────┘
```

## 技術棧

| 類別 | 技術 | 用途 |
|------|------|------|
| 後端框架 | FastAPI | API 服務 |
| PDF 解析 | PyMuPDF (fitz) | 從 PDF 提取文字 |
| 日文分詞 | fugashi + unidic-lite | MeCab 形態素解析，取得讀音 |
| HTML 產生 | Jinja2 | 產生帶 ruby 標籤的 HTML 片段 |
| 前端框架 | React + TypeScript | SPA 介面 |
| 建置工具 | Vite | 前端打包 |
| 測試 | pytest / Vitest | 後端/前端測試 |

## API 設計

### POST /api/convert

- **請求**：`multipart/form-data`，檔案欄位 `file`
- **回應**：

```json
{
  "html": "<p><ruby>漢字<rp>(</rp><rt>かんじ</rt><rp>)</rp></ruby>の...</p>",
  "page_count": 5
}
```

## 核心處理邏輯

### 1. PDF 文字提取 (pdf_extractor.py)

使用 PyMuPDF 逐頁提取文字塊（段落級），保留段落結構。

```python
import fitz

def extract_text_by_pages(pdf_path: str) -> list[dict]:
    doc = fitz.open(pdf_path)
    pages = []
    for page in doc:
        blocks = page.get_text("blocks")
        paragraphs = [b[4] for b in blocks if b[6] == 0]
        pages.append({"page_num": page.number + 1, "paragraphs": paragraphs})
    return pages
```

### 2. 振り仮名標注 (furigana.py)

使用 fugashi (MeCab Python binding) 做形態素解析，為漢字詞加上平假名讀音。

```python
import fugashi
import re

tagger = fugashi.Tagger()

def add_furigana(text: str) -> str:
    result = []
    for word in tagger(text):
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

def contains_kanji(text: str) -> bool:
    return bool(re.search(r'[\u4e00-\u9fff]', text))

def kata_to_hira(text: str) -> str:
    return "".join(
        chr(ord(c) - 0x60) if "\u30A1" <= c <= "\u30F6" else c for c in text
    )
```

**設計決策**：
- 使用 `<rp>` 標籤作為不支援 ruby 的瀏覽器 fallback
- 讀音轉平假名，符合振り仮名慣例
- 只對含漢字的詞標注，平假名/片假名/英數不處理

### 3. HTML 產生 (html_generator.py)

使用 Jinja2 模板將各頁段落組裝成完整 HTML 片段。

## 前端設計

### 介面

```
┌─────────────────────────────────────┐
│         PDF 振り仮名標注工具          │
│                                     │
│  ┌─────────────────────────────┐   │
│  │     拖放 PDF 檔案至此        │   │
│  │     或 點擊選擇檔案          │   │
│  └─────────────────────────────┘   │
│                                     │
│  [=========>        ] 60% 處理中...  │
│                                     │
│  ┌─ 預覽 ──────────────────────┐   │
│  │                             │   │
│  │  漢字（かんじ）の読み方...     │   │
│  │                             │   │
│  └─────────────────────────────┘   │
└─────────────────────────────────────┘
```

### React 元件

| 元件 | 職責 |
|------|------|
| `FileUploader` | 拖放/點擊上傳 PDF |
| `ProgressBar` | 顯示轉換進度 |
| `HtmlPreview` | 渲染帶 ruby 標籤的 HTML 預覽 |

## 專案結構

```
asmr_pdf_script_add_Furigana/
├── backend/
│   ├── app/
│   │   ├── __init__.py
│   │   ├── main.py              # FastAPI 入口 + CORS
│   │   ├── routers/
│   │   │   └── convert.py       # 轉換 API
│   │   └── services/
│   │       ├── pdf_extractor.py  # PDF 文字提取
│   │       ├── furigana.py       # 振り仮名標注
│   │       └── html_generator.py # HTML 片段產生
│   ├── tests/
│   │   ├── test_pdf_extractor.py
│   │   ├── test_furigana.py
│   │   └── test_html_generator.py
│   └── requirements.txt
├── frontend/
│   ├── src/
│   │   ├── App.tsx
│   │   ├── components/
│   │   │   ├── FileUploader.tsx
│   │   │   ├── ProgressBar.tsx
│   │   │   └── HtmlPreview.tsx
│   │   └── services/
│   │       └── api.ts
│   ├── package.json
│   └── vite.config.ts
├── docs/
│   └── plans/
│       └── 2026-02-13-furigana-tool-design.md
└── README.md
```

## 錯誤處理

- PDF 解析失敗 → 回傳 400 + 錯誤訊息
- 不支援的檔案格式 → 前端驗證 + 後端驗證
- MeCab 解析異常 → 該詞保留原文不加標注
