# TXT 支援設計文件

**日期**：2026-02-21
**狀態**：⏳ 待實作

## 需求摘要

在現有 PDF 振り仮名標注工具基礎上，新增對 `.txt` 純文字檔案的支援，使用者可上傳 TXT 檔案並獲得相同的振り仮名 HTML 輸出。

## 設計決策

| 問題 | 決策 | 理由 |
|------|------|------|
| API 端點 | 單一端點 `/api/convert`，依副檔名分派 | 改動最小，前端介面穩定 |
| TXT 分頁 | 整個檔案視為第 1 頁 | 符合純文字劇本閱讀習慣 |
| TXT 分段 | 以連續空白行（`\n\s*\n`）切割段落 | 最常見純文字排版慣例 |
| 編碼 | 假設 UTF-8，失敗回傳明確錯誤訊息 | 現代日文檔案絕大多數為 UTF-8 |

## 架構

### 後端

```
backend/app/
├── routers/
│   └── convert.py          # 修改：依副檔名分派 PDF / TXT
└── services/
    ├── pdf_extractor.py    # 不變
    ├── txt_extractor.py    # 新增
    ├── furigana.py         # 不變（共用）
    └── html_generator.py   # 不變（共用）
```

**`txt_extractor.py` 介面：**

```python
def extract_text_from_txt(text: str) -> list[dict]:
    """
    將 TXT 文字依空白行分段落，整個檔案視為第 1 頁。

    Returns:
        [{"page_num": 1, "paragraphs": ["段落1", "段落2", ...]}]
    """
```

**`convert.py` 修改重點：**

```python
@router.post("/convert")
async def convert_file(file: UploadFile = File(...)):
    if not file.filename:
        raise HTTPException(400, "請選擇檔案")
    name_lower = file.filename.lower()
    if name_lower.endswith(".pdf"):
        # 現有 PDF 流程（不變）
        ...
    elif name_lower.endswith(".txt"):
        content = await file.read()
        text = content.decode("utf-8")
        pages = extract_text_from_txt(text)
        html = generate_html(pages)
        return {"html": html, "page_count": len(pages)}
    else:
        raise HTTPException(400, "只接受 PDF 或 TXT 檔案")
```

### 前端

```
frontend/src/
├── components/
│   └── FileUploader.tsx    # 修改：accept 加 .txt，drop 允許 text/plain
└── services/
    └── api.ts              # 修改：convertPdf → convertFile
```

**FileUploader 修改重點：**
- `accept=".pdf,.txt"`
- drop handler：接受 `application/pdf` 或 `text/plain`，或副檔名為 `.txt`（MIME fallback）
- 顯示文字：「拖放 PDF 或 TXT 至此」

## 資料流

```
使用者上傳 .txt
  → FileUploader（前端驗證通過）
  → convertFile() → POST /api/convert
  → convert.py 偵測 .txt 副檔名
  → extract_text_from_txt(text)
      → re.split(r'\n\s*\n', text) 切段落
      → return [{"page_num": 1, "paragraphs": [...]}]
  → generate_html(pages)（共用）
  → add_furigana(paragraph)（共用，每段落）
  → return {"html": "...", "page_count": 1}
  → PagedPreview 顯示「Page 1」
```

## 測試計畫

| 層級 | 檔案 | 測試案例 |
|------|------|---------|
| 後端 unit | `test_txt_extractor.py` | 空白行分段、多空白行合一、空檔案、無空白行（整段）、前後多餘空白 |
| 後端 API | `test_api.py` | TXT 上傳成功 200、非 UTF-8 回傳 400、副檔名錯誤 400 |
| 前端 unit | `FileUploader.test.tsx` | `.txt` 拖放接受、`text/plain` drop 接受、`.xyz` 拒絕 |

## 元件狀態（實作前）

| 元件 | 狀態 |
|------|------|
| `txt_extractor.py` | ⏳ 待建立 |
| `convert.py` | ⏳ 待修改 |
| `api.ts` | ⏳ 待修改 |
| `FileUploader.tsx` | ⏳ 待修改 |
| `test_txt_extractor.py` | ⏳ 待建立 |
| `test_api.py`（TXT 部分） | ⏳ 待補充 |
| `FileUploader.test.tsx`（TXT 部分） | ⏳ 待補充 |
