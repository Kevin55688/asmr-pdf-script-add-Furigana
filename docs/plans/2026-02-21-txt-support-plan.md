# TXT 支援實作計畫

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** 讓使用者可上傳 `.txt` 檔案，與 PDF 走相同的振り仮名處理流程，輸出相同的 HTML 結構。

**Architecture:** 單一 `/api/convert` 端點依副檔名分派：`.pdf` 走現有流程，`.txt` 走新的 `txt_extractor`。前端 FileUploader 擴充接受類型，`api.ts` 函式改名去除 PDF 特定語意。`generate_html` / `add_furigana` 完全共用。

**Tech Stack:** Python 3.11+ / FastAPI / Vitest / pytest / React + TypeScript / Tailwind CSS

---

### Task 1: 後端 — `txt_extractor.py`（TDD）

**Files:**
- Create: `backend/app/services/txt_extractor.py`
- Create: `backend/tests/test_txt_extractor.py`

**Step 1: 建立測試檔，寫第一個失敗測試**

在 `backend/tests/test_txt_extractor.py` 新增：

```python
from app.services.txt_extractor import extract_text_from_txt


def test_returns_one_page():
    result = extract_text_from_txt("段落一\n\n段落二")
    assert len(result) == 1
    assert result[0]["page_num"] == 1
```

**Step 2: 執行測試，確認失敗**

```bash
cd backend
pytest tests/test_txt_extractor.py -v
```

預期：`ModuleNotFoundError: No module named 'app.services.txt_extractor'`

**Step 3: 建立最小實作 `backend/app/services/txt_extractor.py`**

```python
import re


def extract_text_from_txt(text: str) -> list[dict]:
    """將 TXT 文字依空白行分段落，整個檔案視為第 1 頁。

    Args:
        text: UTF-8 純文字內容

    Returns:
        [{"page_num": 1, "paragraphs": ["段落1", "段落2", ...]}]
    """
    paragraphs = [p.strip() for p in re.split(r'\n\s*\n', text)]
    paragraphs = [p for p in paragraphs if p]
    return [{"page_num": 1, "paragraphs": paragraphs}]
```

**Step 4: 執行測試，確認通過**

```bash
pytest tests/test_txt_extractor.py -v
```

預期：`PASSED`

**Step 5: 補齊其餘測試案例**

在 `backend/tests/test_txt_extractor.py` 追加：

```python
def test_splits_by_blank_line():
    result = extract_text_from_txt("段落一\n\n段落二\n\n段落三")
    assert result[0]["paragraphs"] == ["段落一", "段落二", "段落三"]


def test_multiple_blank_lines_treated_as_one():
    result = extract_text_from_txt("段落一\n\n\n\n段落二")
    assert result[0]["paragraphs"] == ["段落一", "段落二"]


def test_empty_text_returns_no_paragraphs():
    result = extract_text_from_txt("")
    assert result[0]["paragraphs"] == []


def test_no_blank_lines_is_single_paragraph():
    result = extract_text_from_txt("行一\n行二\n行三")
    assert len(result[0]["paragraphs"]) == 1
    assert result[0]["paragraphs"][0] == "行一\n行二\n行三"


def test_strips_leading_trailing_whitespace():
    result = extract_text_from_txt("  段落一  \n\n  段落二  ")
    assert result[0]["paragraphs"] == ["段落一", "段落二"]
```

**Step 6: 執行所有測試，確認全通過**

```bash
pytest tests/test_txt_extractor.py -v
```

預期：6 tests PASSED

**Step 7: Commit**

```bash
git add backend/app/services/txt_extractor.py backend/tests/test_txt_extractor.py
git commit -m "[Feature] 新增 txt_extractor 服務（6 tests）"
```

---

### Task 2: 後端 — 修改 `convert.py`，更新 API 測試

**Files:**
- Modify: `backend/app/routers/convert.py`
- Modify: `backend/tests/test_api.py`

**Step 1: 更新 `convert.py`，支援 `.txt`**

將 `backend/app/routers/convert.py` 全部替換為：

```python
import tempfile
from pathlib import Path

from fastapi import APIRouter, File, HTTPException, UploadFile

from app.services.html_generator import generate_html
from app.services.pdf_extractor import extract_text_by_pages
from app.services.txt_extractor import extract_text_from_txt

router = APIRouter()


@router.post("/convert")
async def convert_file(file: UploadFile = File(...)):
    if not file.filename:
        raise HTTPException(status_code=400, detail="請選擇檔案")

    name_lower = file.filename.lower()

    if name_lower.endswith(".pdf"):
        # PDF 流程：寫入暫存檔再用 PyMuPDF 解析
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

        pages = extract_text_from_txt(text)
        html = generate_html(pages)
        return {"html": html, "page_count": len(pages)}

    else:
        raise HTTPException(status_code=400, detail="只接受 PDF 或 TXT 檔案")
```

**Step 2: 更新 `test_api.py`**

在 `backend/tests/test_api.py` 中：

1. 將原本的 `test_convert_rejects_non_pdf` 改為測試「不明副檔名」被拒：

```python
def test_convert_rejects_unknown_extension():
    response = client.post(
        "/api/convert",
        files={"file": ("test.csv", b"col1,col2", "text/csv")},
    )
    assert response.status_code == 400
```

2. 在該測試後方新增 TXT 成功測試：

```python
def test_convert_with_txt():
    txt_content = "東京は日本の首都です。\n\n大阪は関西の中心地です。"
    response = client.post(
        "/api/convert",
        files={"file": ("script.txt", txt_content.encode("utf-8"), "text/plain")},
    )
    assert response.status_code == 200
    data = response.json()
    assert "html" in data
    assert "page_count" in data
    assert data["page_count"] == 1
```

**Step 3: 執行後端全部測試，確認通過**

```bash
cd backend
pytest tests/ -v
```

預期：所有測試 PASSED（原有 PDF 測試 + 新增 TXT 測試）

**Step 4: Commit**

```bash
git add backend/app/routers/convert.py backend/tests/test_api.py
git commit -m "[Feature] convert.py 支援 .txt 副檔名，更新 API 測試"
```

---

### Task 3: 前端 — `api.ts` 改名，更新 `App.tsx`

**Files:**
- Modify: `frontend/src/services/api.ts`
- Modify: `frontend/src/App.tsx`

> 注意：此 Task 沒有對應的單元測試（api.ts 是純網路呼叫層），改名是語意清理。

**Step 1: 修改 `frontend/src/services/api.ts`**

將 `convertPdf` 改名為 `convertFile`（函式語意更廣，不限 PDF）：

```typescript
const API_BASE = "http://localhost:8000/api";

export interface ConvertResponse {
  html: string;
  page_count: number;
}

export async function convertFile(file: File): Promise<ConvertResponse> {
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

**Step 2: 更新 `frontend/src/App.tsx`**

將 import 從 `convertPdf` 改為 `convertFile`，並更新呼叫：

第 5 行：
```typescript
import { convertFile } from "./services/api";
```

第 23 行：
```typescript
      const result = await convertFile(file);
```

**Step 3: 執行前端測試，確認無破壞**

```bash
cd frontend
npx vitest run
```

預期：原有測試全部 PASSED

**Step 4: Commit**

```bash
git add frontend/src/services/api.ts frontend/src/App.tsx
git commit -m "[Refactor] api.ts convertPdf 改名為 convertFile，支援多格式語意"
```

---

### Task 4: 前端 — `FileUploader.tsx` 支援 TXT，更新測試

**Files:**
- Modify: `frontend/src/components/FileUploader.tsx`
- Modify: `frontend/src/components/FileUploader.test.tsx`

**Step 1: 先在測試檔加入新的失敗測試**

在 `frontend/src/components/FileUploader.test.tsx` 新增：

```typescript
describe('檔案類型驗證', () => {
  it('顯示 PDF 或 TXT 提示文字', () => {
    render(<FileUploader onFileSelect={vi.fn()} />);
    expect(screen.getByText('拖放 PDF 或 TXT 至此')).toBeInTheDocument();
  });

  it('input 接受 .pdf 和 .txt', () => {
    render(<FileUploader onFileSelect={vi.fn()} />);
    const input = document.querySelector('input[type="file"]') as HTMLInputElement;
    expect(input.accept).toBe('.pdf,.txt');
  });
});
```

同時，將舊的 `'顯示拖放提示文字'` 測試中的文字更新為新文字：

```typescript
it('顯示拖放提示文字', () => {
  render(<FileUploader onFileSelect={vi.fn()} />);
  expect(screen.getByText('拖放 PDF 或 TXT 至此')).toBeInTheDocument();
  expect(screen.getByText('或 點擊選擇檔案')).toBeInTheDocument();
});
```

**Step 2: 執行測試，確認新測試失敗**

```bash
cd frontend
npx vitest run src/components/FileUploader.test.tsx
```

預期：新加的測試 FAIL（文字不符、accept 仍為 `.pdf`）

**Step 3: 修改 `FileUploader.tsx`**

修改三處：

1. `accept` 屬性（第 77 行附近）：
```typescript
accept=".pdf,.txt"
```

2. drop handler（第 26-29 行）— 改為副檔名判斷，避免 OS MIME 不一致問題：
```typescript
const handleDrop = useCallback(
  (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) {
      const ext = file.name.toLowerCase().split('.').pop();
      if (ext === 'pdf' || ext === 'txt') {
        onFileSelect(file);
      }
    }
  },
  [onFileSelect],
);
```

3. 提示文字（第 71 行）：
```typescript
<p className="text-base font-medium text-ink">拖放 PDF 或 TXT 至此</p>
```

**Step 4: 執行 FileUploader 測試，確認全通過**

```bash
cd frontend
npx vitest run src/components/FileUploader.test.tsx
```

預期：所有測試 PASSED

**Step 5: 執行前端全部測試**

```bash
npx vitest run
```

預期：所有測試 PASSED

**Step 6: 更新 SUMMARY.md**

在 `.claude/SUMMARY.md` 更新：
- 專案狀態改為「✅ TXT 支援完成」
- 將 TXT 支援移入已完成項目（含日期 2026-02-21）

**Step 7: Commit（含 SUMMARY.md）**

```bash
git add frontend/src/components/FileUploader.tsx frontend/src/components/FileUploader.test.tsx .claude/SUMMARY.md
git commit -m "[Feature] FileUploader 支援 TXT 拖放與選擇，更新測試與 SUMMARY"
```

---

## 驗收標準

- [ ] `pytest backend/tests/` 全部通過（含 `test_txt_extractor.py` 6 tests）
- [ ] `npx vitest run`（frontend）全部通過
- [ ] 手動上傳日文 TXT 檔案，確認 HTML 輸出含振り仮名 `<ruby>` 標籤
- [ ] 上傳 `.csv` 或其他副檔名，確認回傳 400 錯誤訊息
