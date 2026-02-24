# 振り仮名 Toggle 與段落翻譯 Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** 在 PagedPreview 導覽列新增振り仮名 toggle 與翻譯 toggle，支援 Claude AI / Google / DeepL 三個翻譯供應商，翻譯結果以 React state cache。

**Architecture:** 後端新增 `translator.py` service 與 `POST /api/translate` endpoint，代理呼叫外部翻譯 API（API key 存於 `.env`）。前端 `PagedPreview` 持有所有 toggle 狀態與翻譯 cache，`HtmlPreview` 負責顯示（ruby toggle 用 CSS class，翻譯用 prop 注入）。

**Tech Stack:** Python / FastAPI / httpx / anthropic SDK（後端）；React + TypeScript + Tailwind CSS v4（前端）；pytest + Vitest（測試）

---

## Task 1：後端 translator service

**Files:**
- Create: `backend/app/services/translator.py`
- Modify: `backend/requirements.txt`
- Create: `backend/tests/test_translator.py`

### Step 1：新增 `anthropic` 依賴

編輯 `backend/requirements.txt`，在最後加一行：

```
anthropic>=0.40.0
```

安裝：
```bash
cd backend
pip install anthropic
```

### Step 2：寫失敗測試

建立 `backend/tests/test_translator.py`：

```python
import pytest
from unittest.mock import AsyncMock, patch, MagicMock


# ── DeepL ──────────────────────────────────────────────────────────────────

@pytest.mark.asyncio
async def test_deepl_translates_texts():
    from app.services.translator import translate
    mock_response = MagicMock()
    mock_response.json.return_value = {
        "translations": [{"text": "東京"}, {"text": "大阪"}]
    }
    mock_response.raise_for_status = MagicMock()

    with patch("app.services.translator.httpx.AsyncClient") as MockClient:
        MockClient.return_value.__aenter__.return_value.post = AsyncMock(
            return_value=mock_response
        )
        with patch.dict("os.environ", {"DEEPL_API_KEY": "test-key"}):
            result = await translate(["東京です", "大阪です"], "deepl", "zh-TW")

    assert result == ["東京", "大阪"]


@pytest.mark.asyncio
async def test_deepl_raises_when_no_api_key():
    from app.services.translator import translate
    import os
    with patch.dict("os.environ", {}, clear=True):
        os.environ.pop("DEEPL_API_KEY", None)
        with pytest.raises(ValueError, match="DEEPL_API_KEY"):
            await translate(["テスト"], "deepl", "zh-TW")


# ── Google ─────────────────────────────────────────────────────────────────

@pytest.mark.asyncio
async def test_google_translates_texts():
    from app.services.translator import translate
    mock_response = MagicMock()
    mock_response.json.return_value = {
        "data": {"translations": [{"translatedText": "東京"}, {"translatedText": "大阪"}]}
    }
    mock_response.raise_for_status = MagicMock()

    with patch("app.services.translator.httpx.AsyncClient") as MockClient:
        MockClient.return_value.__aenter__.return_value.post = AsyncMock(
            return_value=mock_response
        )
        with patch.dict("os.environ", {"GOOGLE_API_KEY": "test-key"}):
            result = await translate(["東京です", "大阪です"], "google", "zh-TW")

    assert result == ["東京", "大阪"]


@pytest.mark.asyncio
async def test_google_raises_when_no_api_key():
    from app.services.translator import translate
    import os
    with patch.dict("os.environ", {}, clear=True):
        os.environ.pop("GOOGLE_API_KEY", None)
        with pytest.raises(ValueError, match="GOOGLE_API_KEY"):
            await translate(["テスト"], "google", "zh-TW")


# ── Claude ─────────────────────────────────────────────────────────────────

@pytest.mark.asyncio
async def test_claude_translates_texts():
    from app.services.translator import translate
    mock_client = MagicMock()
    mock_message = MagicMock()
    mock_message.content = [MagicMock(text='["東京", "大阪"]')]
    mock_client.messages.create = AsyncMock(return_value=mock_message)

    with patch("app.services.translator.anthropic.AsyncAnthropic", return_value=mock_client):
        with patch.dict("os.environ", {"ANTHROPIC_API_KEY": "test-key"}):
            result = await translate(["東京です", "大阪です"], "claude", "zh-TW")

    assert result == ["東京", "大阪"]


@pytest.mark.asyncio
async def test_claude_raises_when_no_api_key():
    from app.services.translator import translate
    import os
    with patch.dict("os.environ", {}, clear=True):
        os.environ.pop("ANTHROPIC_API_KEY", None)
        with pytest.raises(ValueError, match="ANTHROPIC_API_KEY"):
            await translate(["テスト"], "claude", "zh-TW")


# ── 共用 ───────────────────────────────────────────────────────────────────

@pytest.mark.asyncio
async def test_invalid_provider_raises():
    from app.services.translator import translate
    with pytest.raises(ValueError, match="不支援的翻譯供應商"):
        await translate(["テスト"], "unknown", "zh-TW")


@pytest.mark.asyncio
async def test_empty_texts_returns_empty():
    from app.services.translator import translate
    result = await translate([], "deepl", "zh-TW")
    assert result == []
```

### Step 3：執行測試確認失敗

```bash
cd backend
pytest tests/test_translator.py -v
```

期望：`ImportError` 或 `ModuleNotFoundError`（translator 尚未建立）

### Step 4：實作 `translator.py`

建立 `backend/app/services/translator.py`：

```python
import json
import os

import anthropic
import httpx

# DeepL target_lang 對應表
_DEEPL_LANG_MAP = {
    "zh-TW": "ZH-HANT",
    "zh-CN": "ZH",
    "en": "EN-US",
    "ko": "KO",
}


async def translate(
    texts: list[str],
    provider: str,
    target_lang: str,
    source_lang: str = "ja",
) -> list[str]:
    """翻譯段落列表，回傳翻譯結果列表（順序對應）。"""
    if not texts:
        return []

    if provider == "deepl":
        return await _translate_deepl(texts, target_lang, source_lang)
    elif provider == "google":
        return await _translate_google(texts, target_lang, source_lang)
    elif provider == "claude":
        return await _translate_claude(texts, target_lang, source_lang)
    else:
        raise ValueError(f"不支援的翻譯供應商：{provider}")


async def _translate_deepl(
    texts: list[str], target_lang: str, source_lang: str
) -> list[str]:
    api_key = os.getenv("DEEPL_API_KEY")
    if not api_key:
        raise ValueError("未設定 DEEPL_API_KEY")

    deepl_target = _DEEPL_LANG_MAP.get(target_lang, target_lang.upper())

    async with httpx.AsyncClient() as client:
        response = await client.post(
            "https://api-free.deepl.com/v2/translate",
            headers={"Authorization": f"DeepL-Auth-Key {api_key}"},
            json={
                "text": texts,
                "source_lang": source_lang.upper(),
                "target_lang": deepl_target,
            },
        )
        response.raise_for_status()

    data = response.json()
    return [item["text"] for item in data["translations"]]


async def _translate_google(
    texts: list[str], target_lang: str, source_lang: str
) -> list[str]:
    api_key = os.getenv("GOOGLE_API_KEY")
    if not api_key:
        raise ValueError("未設定 GOOGLE_API_KEY")

    async with httpx.AsyncClient() as client:
        response = await client.post(
            "https://translation.googleapis.com/language/translate/v2",
            params={"key": api_key},
            json={"q": texts, "source": source_lang, "target": target_lang},
        )
        response.raise_for_status()

    data = response.json()
    return [item["translatedText"] for item in data["data"]["translations"]]


async def _translate_claude(
    texts: list[str], target_lang: str, source_lang: str
) -> list[str]:
    api_key = os.getenv("ANTHROPIC_API_KEY")
    if not api_key:
        raise ValueError("未設定 ANTHROPIC_API_KEY")

    lang_names = {
        "zh-TW": "繁體中文",
        "zh-CN": "簡體中文",
        "en": "English",
        "ko": "한국어",
    }
    target_name = lang_names.get(target_lang, target_lang)

    prompt = (
        f"請將以下日文段落翻譯為{target_name}。\n"
        "以 JSON 陣列格式回傳，每個元素對應一個段落的翻譯，不要加任何說明。\n\n"
        f"段落：\n{json.dumps(texts, ensure_ascii=False)}"
    )

    client = anthropic.AsyncAnthropic(api_key=api_key)
    message = await client.messages.create(
        model="claude-sonnet-4-6",
        max_tokens=4096,
        messages=[{"role": "user", "content": prompt}],
    )

    raw = message.content[0].text.strip()
    # 去除可能的 markdown code block
    if raw.startswith("```"):
        raw = raw.split("\n", 1)[1].rsplit("```", 1)[0].strip()

    return json.loads(raw)
```

### Step 5：執行測試確認通過

```bash
cd backend
pytest tests/test_translator.py -v
```

期望：8 tests passed

### Step 6：Commit

```bash
git add backend/requirements.txt backend/app/services/translator.py backend/tests/test_translator.py
git commit -m "[Feature] 新增 translator service（DeepL / Google / Claude）"
```

---

## Task 2：後端 translate router

**Files:**
- Create: `backend/app/routers/translate.py`
- Modify: `backend/app/main.py`
- Modify: `backend/tests/test_api.py`

### Step 1：在 `test_api.py` 末尾新增測試

```python
# ── /api/translate ──────────────────────────────────────────────────────────

def test_translate_endpoint_exists():
    response = client.post("/api/translate")
    # 沒有 body 應該回 422
    assert response.status_code == 422


def test_translate_missing_api_key(monkeypatch):
    monkeypatch.delenv("DEEPL_API_KEY", raising=False)
    response = client.post(
        "/api/translate",
        json={"texts": ["テスト"], "provider": "deepl", "target_lang": "zh-TW"},
    )
    assert response.status_code == 400
    assert "DEEPL_API_KEY" in response.json()["detail"]


def test_translate_invalid_provider():
    response = client.post(
        "/api/translate",
        json={"texts": ["テスト"], "provider": "unknown", "target_lang": "zh-TW"},
    )
    assert response.status_code == 400
    assert "不支援" in response.json()["detail"]
```

### Step 2：執行測試確認失敗

```bash
cd backend
pytest tests/test_api.py::test_translate_endpoint_exists -v
```

期望：FAIL（endpoint 不存在 → 404）

### Step 3：建立 `backend/app/routers/translate.py`

```python
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
```

### Step 4：在 `main.py` 註冊新 router

編輯 `backend/app/main.py`：

```python
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.routers import convert, translate   # 新增 translate

app = FastAPI(title="PDF Furigana Tool")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(convert.router, prefix="/api")
app.include_router(translate.router, prefix="/api")   # 新增


@app.get("/api/health")
def health_check():
    return {"status": "ok"}
```

### Step 5：執行全部後端測試

```bash
cd backend
pytest tests/ -v
```

期望：全部 passed（含原有測試）

### Step 6：Commit

```bash
git add backend/app/routers/translate.py backend/app/main.py backend/tests/test_api.py
git commit -m "[Feature] 新增 POST /api/translate endpoint"
```

---

## Task 3：前端 translateTexts API 函式

**Files:**
- Modify: `frontend/src/services/api.ts`

### Step 1：更新 `api.ts`

將 `frontend/src/services/api.ts` 全部替換為：

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

export async function translateTexts(
  texts: string[],
  provider: string,
  targetLang: string,
): Promise<string[]> {
  const response = await fetch(`${API_BASE}/translate`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ texts, provider, target_lang: targetLang }),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ detail: "翻譯失敗" }));
    throw new Error(error.detail || `HTTP ${response.status}`);
  }

  const data = await response.json();
  return data.translations;
}
```

### Step 2：Commit

```bash
git add frontend/src/services/api.ts
git commit -m "[Feature] 新增 translateTexts API 函式"
```

---

## Task 4：HtmlPreview 支援 ruby toggle + 翻譯顯示

**Files:**
- Modify: `frontend/src/components/HtmlPreview.tsx`
- Modify: `frontend/src/components/HtmlPreview.test.tsx`

### Step 1：在 `HtmlPreview.test.tsx` 末尾新增測試

```typescript
import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { HtmlPreview } from './HtmlPreview';

describe('HtmlPreview', () => {
  it('顯示頁數標題', () => {
    render(<HtmlPreview html="<p>測試</p>" pageCount={3} showRuby />);
    expect(screen.getByText('預覽（共 3 頁）')).toBeInTheDocument();
  });

  it('渲染 HTML 內容', () => {
    render(<HtmlPreview html="<p>日本語テスト</p>" pageCount={1} showRuby />);
    expect(screen.getByText('日本語テスト')).toBeInTheDocument();
  });

  it('渲染 ruby 振り仮名標籤', () => {
    const html = '<ruby>漢字<rt>かんじ</rt></ruby>';
    const { container } = render(<HtmlPreview html={html} pageCount={1} showRuby />);
    expect(container.querySelector('ruby')).toBeInTheDocument();
    expect(container.querySelector('rt')).toBeInTheDocument();
  });

  it('pageCount 為 1 時顯示正確頁數', () => {
    render(<HtmlPreview html="" pageCount={1} showRuby />);
    expect(screen.getByText('預覽（共 1 頁）')).toBeInTheDocument();
  });

  // ── 新增測試 ────────────────────────────────────────────────────────────

  it('showRuby=false 時套用 hide-ruby class', () => {
    const { container } = render(
      <HtmlPreview html="<p>テスト</p>" pageCount={1} showRuby={false} />,
    );
    expect(container.querySelector('.hide-ruby')).toBeInTheDocument();
  });

  it('showRuby=true 時不套用 hide-ruby class', () => {
    const { container } = render(
      <HtmlPreview html="<p>テスト</p>" pageCount={1} showRuby />,
    );
    expect(container.querySelector('.hide-ruby')).not.toBeInTheDocument();
  });

  it('顯示翻譯文字', () => {
    render(
      <HtmlPreview
        html="<p>東京です</p>"
        pageCount={1}
        showRuby
        translations={['這是東京']}
      />,
    );
    expect(screen.getByText('這是東京')).toBeInTheDocument();
  });

  it('isTranslating=true 時顯示 skeleton', () => {
    const { container } = render(
      <HtmlPreview html="<p>テスト</p>" pageCount={1} showRuby isTranslating />,
    );
    expect(container.querySelector('.translation-skeleton')).toBeInTheDocument();
  });

  it('未傳入 translations 時不顯示翻譯區塊', () => {
    const { container } = render(
      <HtmlPreview html="<p>テスト</p>" pageCount={1} showRuby />,
    );
    expect(container.querySelector('.translation-text')).not.toBeInTheDocument();
  });
});
```

### Step 2：執行測試確認新測試失敗

```bash
cd frontend
npx vitest run src/components/HtmlPreview.test.tsx
```

期望：舊測試因 props 改變而失敗，新測試也失敗

### Step 3：重寫 `HtmlPreview.tsx`

```tsx
interface HtmlPreviewProps {
  html: string;
  pageCount: number;
  showRuby: boolean;
  translations?: string[];
  isTranslating?: boolean;
}

export function HtmlPreview({
  html,
  pageCount,
  showRuby,
  translations,
  isTranslating,
}: HtmlPreviewProps) {
  // 解析 HTML，取得各段落 outerHTML
  const paragraphs = (() => {
    if (!html) return [];
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, 'text/html');
    return Array.from(doc.querySelectorAll('p')).map((p) => p.outerHTML);
  })();

  const showTranslationRow = isTranslating || (translations && translations.length > 0);

  return (
    <div className="mt-8 rounded-lg border border-gray-200 p-6">
      <h2 className="mb-4 text-lg font-semibold text-gray-800">
        預覽（共 {pageCount} 頁）
      </h2>

      {paragraphs.length === 0 ? (
        /* html 不含 <p>（例如只有 <section><h2>）→ 直接渲染原始 HTML */
        <div
          className={`leading-loose text-base [&_rt]:text-[0.6em] [&_rt]:text-gray-500 [&_.page]:mb-8 [&_.page]:border-b [&_.page]:border-gray-100 [&_.page]:pb-4${showRuby ? '' : ' hide-ruby'}`}
          dangerouslySetInnerHTML={{ __html: html }}
        />
      ) : (
        <div className={`leading-loose text-base${showRuby ? '' : ' hide-ruby'}`}>
          {/* hide-ruby 全域 CSS 定義在 index.css */}
          {paragraphs.map((pHtml, i) => (
            <div key={i} className="mb-4">
              {/* 原文段落 */}
              <div
                className="[&_rt]:text-[0.6em] [&_rt]:text-gray-500"
                dangerouslySetInnerHTML={{ __html: pHtml }}
              />

              {/* 翻譯列 */}
              {showTranslationRow && (
                isTranslating ? (
                  <div className="translation-skeleton mt-1 h-4 w-3/4 animate-pulse rounded bg-gray-200" />
                ) : translations?.[i] ? (
                  <p className="translation-text mt-1 border-l-2 border-vermilion pl-2 text-sm italic text-ink-light">
                    {translations[i]}
                  </p>
                ) : null
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
```

### Step 4：在 `frontend/src/index.css` 加入 hide-ruby 樣式

在現有 `index.css` 末尾加入：

```css
/* 振り仮名隱藏 */
.hide-ruby rt {
  display: none;
}
```

### Step 5：執行測試確認通過

```bash
cd frontend
npx vitest run src/components/HtmlPreview.test.tsx
```

期望：全部 passed

### Step 6：Commit

```bash
git add frontend/src/components/HtmlPreview.tsx frontend/src/components/HtmlPreview.test.tsx frontend/src/index.css
git commit -m "[Feature] HtmlPreview 支援 ruby toggle 與段落翻譯顯示"
```

---

## Task 5：PagedPreview 控制列 + 翻譯邏輯 + cache

**Files:**
- Modify: `frontend/src/components/PagedPreview.tsx`
- Modify: `frontend/src/components/PagedPreview.test.tsx`

### Step 1：在 `PagedPreview.test.tsx` 末尾新增測試

```typescript
import { vi } from 'vitest';
import * as api from '../services/api';

// ── 新增測試（在原有 describe 區塊內補充）────────────────────────────────

// 注意：下列測試需放在原有 describe("PagedPreview", () => { ... }) 區塊內
```

完整替換 `PagedPreview.test.tsx`：

```typescript
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { PagedPreview } from "./PagedPreview";
import * as api from "../services/api";

function makeHtml(pageCount: number): string {
  return Array.from(
    { length: pageCount },
    (_, i) =>
      `<section class="page" data-page="${i + 1}"><p>第 ${i + 1} 頁內容</p></section>`,
  ).join("\n");
}

describe("PagedPreview", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("預設顯示第 1 頁內容", () => {
    render(<PagedPreview html={makeHtml(3)} pageCount={3} />);
    expect(screen.getByText("第 1 頁內容")).toBeInTheDocument();
    expect(screen.queryByText("第 2 頁內容")).not.toBeInTheDocument();
  });

  it("顯示頁碼資訊「1」與「/ 3」", () => {
    render(<PagedPreview html={makeHtml(3)} pageCount={3} />);
    expect(screen.getByDisplayValue("1")).toBeInTheDocument();
    expect(screen.getByText("/ 3")).toBeInTheDocument();
  });

  it("第 1 頁時「上一頁」按鈕 disabled", () => {
    render(<PagedPreview html={makeHtml(3)} pageCount={3} />);
    expect(screen.getByRole("button", { name: /上一頁/ })).toBeDisabled();
  });

  it("點「下一頁」後顯示第 2 頁", async () => {
    const user = userEvent.setup();
    render(<PagedPreview html={makeHtml(3)} pageCount={3} />);
    await user.click(screen.getByRole("button", { name: /下一頁/ }));
    expect(screen.getByText("第 2 頁內容")).toBeInTheDocument();
    expect(screen.queryByText("第 1 頁內容")).not.toBeInTheDocument();
  });

  it("最後一頁時「下一頁」按鈕 disabled", async () => {
    const user = userEvent.setup();
    render(<PagedPreview html={makeHtml(2)} pageCount={2} />);
    await user.click(screen.getByRole("button", { name: /下一頁/ }));
    expect(screen.getByRole("button", { name: /下一頁/ })).toBeDisabled();
  });

  it("從第 2 頁點「上一頁」回到第 1 頁", async () => {
    const user = userEvent.setup();
    render(<PagedPreview html={makeHtml(3)} pageCount={3} />);
    await user.click(screen.getByRole("button", { name: /下一頁/ }));
    await user.click(screen.getByRole("button", { name: /上一頁/ }));
    expect(screen.getByText("第 1 頁內容")).toBeInTheDocument();
  });

  it("輸入頁碼 3 並按 Enter 跳頁", async () => {
    const user = userEvent.setup();
    render(<PagedPreview html={makeHtml(5)} pageCount={5} />);
    const input = screen.getByDisplayValue("1");
    await user.clear(input);
    await user.type(input, "3");
    await user.keyboard("{Enter}");
    expect(screen.getByText("第 3 頁內容")).toBeInTheDocument();
  });

  it("輸入 0 自動修正至第 1 頁", async () => {
    const user = userEvent.setup();
    render(<PagedPreview html={makeHtml(3)} pageCount={3} />);
    const input = screen.getByDisplayValue("1");
    await user.clear(input);
    await user.type(input, "0");
    await user.keyboard("{Enter}");
    expect(screen.getByDisplayValue("1")).toBeInTheDocument();
  });

  it("輸入 999 自動修正至最後一頁", async () => {
    const user = userEvent.setup();
    render(<PagedPreview html={makeHtml(3)} pageCount={3} />);
    const input = screen.getByDisplayValue("1");
    await user.clear(input);
    await user.type(input, "999");
    await user.keyboard("{Enter}");
    expect(screen.getByDisplayValue("3")).toBeInTheDocument();
  });

  // ── Toggle 測試 ──────────────────────────────────────────────────────────

  it("預設顯示振り仮名 toggle 並標示「振り仮名」", () => {
    render(<PagedPreview html={makeHtml(1)} pageCount={1} />);
    expect(screen.getByLabelText("振り仮名")).toBeInTheDocument();
  });

  it("預設顯示翻譯 toggle 並標示「翻譯」", () => {
    render(<PagedPreview html={makeHtml(1)} pageCount={1} />);
    expect(screen.getByLabelText("翻譯")).toBeInTheDocument();
  });

  it("開啟翻譯 switch 時呼叫 translateTexts", async () => {
    const user = userEvent.setup();
    const mockTranslate = vi
      .spyOn(api, "translateTexts")
      .mockResolvedValue(["翻譯結果"]);

    render(<PagedPreview html={makeHtml(1)} pageCount={1} />);
    await user.click(screen.getByLabelText("翻譯"));

    await waitFor(() => {
      expect(mockTranslate).toHaveBeenCalledTimes(1);
    });
  });

  it("關閉翻譯 switch 時不呼叫 translateTexts", async () => {
    const mockTranslate = vi.spyOn(api, "translateTexts").mockResolvedValue([]);
    render(<PagedPreview html={makeHtml(1)} pageCount={1} />);
    // 不點 switch，直接確認沒有呼叫
    expect(mockTranslate).not.toHaveBeenCalled();
  });

  it("同一頁再次開啟翻譯不重複呼叫 API（cache）", async () => {
    const user = userEvent.setup();
    const mockTranslate = vi
      .spyOn(api, "translateTexts")
      .mockResolvedValue(["翻譯結果"]);

    render(<PagedPreview html={makeHtml(1)} pageCount={1} />);
    const toggleBtn = screen.getByLabelText("翻譯");

    await user.click(toggleBtn); // 開啟 → 呼叫 API
    await waitFor(() => expect(mockTranslate).toHaveBeenCalledTimes(1));

    await user.click(toggleBtn); // 關閉
    await user.click(toggleBtn); // 再開啟 → 應使用 cache，不再呼叫

    expect(mockTranslate).toHaveBeenCalledTimes(1);
  });

  it("切換語言時重新呼叫翻譯 API", async () => {
    const user = userEvent.setup();
    const mockTranslate = vi
      .spyOn(api, "translateTexts")
      .mockResolvedValue(["翻譯結果"]);

    render(<PagedPreview html={makeHtml(1)} pageCount={1} />);
    await user.click(screen.getByLabelText("翻譯")); // 開啟翻譯
    await waitFor(() => expect(mockTranslate).toHaveBeenCalledTimes(1));

    // 切換語言
    await user.selectOptions(screen.getByLabelText("目標語言"), "en");
    await waitFor(() => expect(mockTranslate).toHaveBeenCalledTimes(2));
  });
});
```

### Step 2：執行測試確認新測試失敗

```bash
cd frontend
npx vitest run src/components/PagedPreview.test.tsx
```

期望：新增的 toggle/翻譯 測試 FAIL

### Step 3：重寫 `PagedPreview.tsx`

```tsx
import { useCallback, useEffect, useMemo, useState } from 'react';
import { translateTexts } from '../services/api';
import { HtmlPreview } from './HtmlPreview';

interface PagedPreviewProps {
  html: string;
  pageCount: number;
}

const PROVIDERS = [
  { value: 'deepl', label: 'DeepL' },
  { value: 'google', label: 'Google' },
  { value: 'claude', label: 'Claude AI' },
] as const;

const LANGUAGES = [
  { value: 'zh-TW', label: '繁體中文' },
  { value: 'zh-CN', label: '簡體中文' },
  { value: 'en', label: 'English' },
  { value: 'ko', label: '한국어' },
] as const;

type Provider = (typeof PROVIDERS)[number]['value'];
type Language = (typeof LANGUAGES)[number]['value'];

export function PagedPreview({ html, pageCount }: PagedPreviewProps) {
  const [currentPage, setCurrentPage] = useState(1);
  const [inputValue, setInputValue] = useState('1');

  // Toggle 狀態
  const [showRuby, setShowRuby] = useState(true);
  const [showTranslation, setShowTranslation] = useState(false);
  const [provider, setProvider] = useState<Provider>('deepl');
  const [targetLang, setTargetLang] = useState<Language>('zh-TW');

  // 翻譯 cache：key = "provider|lang|pageNum"
  const [translationCache, setTranslationCache] = useState<Record<string, string[]>>({});
  const [isTranslating, setIsTranslating] = useState(false);
  const [translationError, setTranslationError] = useState<string | null>(null);

  // 解析頁面 HTML
  const pages = useMemo(() => {
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, 'text/html');
    const sections = doc.querySelectorAll('section.page');
    return Array.from(sections).map((s) => s.outerHTML);
  }, [html]);

  // 從當前頁 HTML 提取段落文字（送給翻譯 API）
  const currentPageTexts = useMemo(() => {
    const pageHtml = pages[currentPage - 1] ?? '';
    if (!pageHtml) return [];
    const parser = new DOMParser();
    const doc = parser.parseFromString(pageHtml, 'text/html');
    return Array.from(doc.querySelectorAll('p')).map((p) => p.textContent ?? '');
  }, [pages, currentPage]);

  const cacheKey = `${provider}|${targetLang}|${currentPage}`;

  // 翻譯邏輯
  const fetchTranslation = useCallback(async () => {
    if (!showTranslation || currentPageTexts.length === 0) return;
    if (translationCache[cacheKey]) return; // cache hit

    setIsTranslating(true);
    setTranslationError(null);
    try {
      const result = await translateTexts(currentPageTexts, provider, targetLang);
      setTranslationCache((prev) => ({ ...prev, [cacheKey]: result }));
    } catch (e) {
      setTranslationError(e instanceof Error ? e.message : '翻譯失敗');
    } finally {
      setIsTranslating(false);
    }
  }, [showTranslation, currentPageTexts, cacheKey, provider, targetLang, translationCache]);

  // 開啟翻譯、換頁、換語言、換供應商時觸發翻譯
  useEffect(() => {
    fetchTranslation();
  }, [fetchTranslation]);

  function goToPage(page: number) {
    const clamped = Math.max(1, Math.min(page, pageCount));
    setCurrentPage(clamped);
    setInputValue(String(clamped));
  }

  const currentTranslations = translationCache[cacheKey];

  return (
    <div className="mt-6">
      {/* 主導覽列 */}
      <div className="relative sticky top-0 z-10 flex items-center justify-center gap-3 border-b border-washi-border bg-paper px-6 py-3 shadow-sm">
        <div className="absolute inset-x-0 top-0 h-[2px] bg-vermilion" />

        <button
          aria-label="上一頁"
          onClick={() => goToPage(currentPage - 1)}
          disabled={currentPage === 1}
          className="flex items-center gap-1 rounded border border-vermilion px-3 py-1 text-sm font-medium text-vermilion transition-all duration-150 hover:bg-vermilion hover:text-white disabled:cursor-not-allowed disabled:border-washi-border disabled:text-ink-light"
        >
          ← 上一頁
        </button>

        <div className="flex items-center gap-2">
          <input
            type="number"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                const n = parseInt(inputValue, 10);
                goToPage(isNaN(n) ? currentPage : n);
              }
            }}
            className="w-12 rounded border border-washi-border bg-washi py-1 text-center text-sm font-medium text-ink focus:border-vermilion focus:outline-none focus:ring-1 focus:ring-vermilion/20 [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
            min={1}
            max={pageCount}
          />
          <span className="text-sm text-ink-light">/ {pageCount}</span>
        </div>

        <button
          aria-label="下一頁"
          onClick={() => goToPage(currentPage + 1)}
          disabled={currentPage === pageCount}
          className="flex items-center gap-1 rounded border border-vermilion px-3 py-1 text-sm font-medium text-vermilion transition-all duration-150 hover:bg-vermilion hover:text-white disabled:cursor-not-allowed disabled:border-washi-border disabled:text-ink-light"
        >
          下一頁 →
        </button>
      </div>

      {/* 控制列 */}
      <div className="flex flex-wrap items-center gap-4 border-b border-washi-border bg-washi px-6 py-2 text-sm">
        {/* 振り仮名 Toggle */}
        <label className="flex cursor-pointer items-center gap-2 text-ink">
          <input
            aria-label="振り仮名"
            type="checkbox"
            checked={showRuby}
            onChange={(e) => setShowRuby(e.target.checked)}
            className="accent-vermilion"
          />
          振り仮名
        </label>

        {/* 翻譯 Toggle */}
        <label className="flex cursor-pointer items-center gap-2 text-ink">
          <input
            aria-label="翻譯"
            type="checkbox"
            checked={showTranslation}
            onChange={(e) => setShowTranslation(e.target.checked)}
            className="accent-vermilion"
          />
          翻譯
        </label>

        {/* 語言選單（翻譯開啟時才顯示） */}
        {showTranslation && (
          <>
            <label className="flex items-center gap-1 text-ink-light">
              <span>語言</span>
              <select
                aria-label="目標語言"
                value={targetLang}
                onChange={(e) => setTargetLang(e.target.value as Language)}
                className="rounded border border-washi-border bg-paper px-1 py-0.5 text-ink focus:border-vermilion focus:outline-none"
              >
                {LANGUAGES.map((l) => (
                  <option key={l.value} value={l.value}>{l.label}</option>
                ))}
              </select>
            </label>

            <label className="flex items-center gap-1 text-ink-light">
              <span>供應商</span>
              <select
                aria-label="翻譯供應商"
                value={provider}
                onChange={(e) => setProvider(e.target.value as Provider)}
                className="rounded border border-washi-border bg-paper px-1 py-0.5 text-ink focus:border-vermilion focus:outline-none"
              >
                {PROVIDERS.map((p) => (
                  <option key={p.value} value={p.value}>{p.label}</option>
                ))}
              </select>
            </label>
          </>
        )}
      </div>

      {/* 翻譯錯誤訊息 */}
      {translationError && (
        <div className="mx-6 mt-2 rounded bg-red-50 px-3 py-2 text-sm text-red-700">
          {translationError}
          <button
            onClick={fetchTranslation}
            className="ml-2 underline"
          >
            重試
          </button>
        </div>
      )}

      {/* 內容區 */}
      <HtmlPreview
        html={pages[currentPage - 1] ?? ''}
        pageCount={pageCount}
        showRuby={showRuby}
        translations={showTranslation ? currentTranslations : undefined}
        isTranslating={showTranslation && isTranslating}
      />
    </div>
  );
}
```

### Step 4：執行全部前端測試

```bash
cd frontend
npx vitest run
```

期望：全部 passed

### Step 5：更新 `SUMMARY.md`，再 commit

更新 `.claude/SUMMARY.md`：
- 將此功能加入已完成項目
- 更新狀態標題

```bash
git add frontend/src/components/PagedPreview.tsx frontend/src/components/PagedPreview.test.tsx .claude/SUMMARY.md
git commit -m "[Feature] PagedPreview 新增振り仮名 toggle、翻譯 toggle 與翻譯 cache"
```

---

## 驗收清單

完成後確認：

- [ ] `pytest backend/tests/ -v` 全部通過（含新增 translator + translate endpoint 測試）
- [ ] `npx vitest run` 全部通過（含新增 toggle/翻譯 測試）
- [ ] 後端啟動後 `POST /api/translate` 可正常回應
- [ ] 前端 UI 顯示振り仮名 toggle（勾選 = 顯示）
- [ ] 前端 UI 顯示翻譯 toggle，開啟後出現語言與供應商選單
- [ ] 切換頁面後翻譯結果正確對應
- [ ] 同一頁開關翻譯不重複呼叫 API
