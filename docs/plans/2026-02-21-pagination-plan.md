# 前端分頁功能 Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** 在前端加入 `PagedPreview` 元件，每次只顯示一頁 PDF 內容，並提供上一頁 / 下一頁按鈕與頁碼輸入框。

**Architecture:** 新增 `PagedPreview` 包裝元件（Container），負責解析完整 HTML 字串、維護 `currentPage` 狀態、渲染導覽 UI；`HtmlPreview` 保持純展示元件不動。`App.tsx` 只改一行，將 `<HtmlPreview>` 換成 `<PagedPreview>`。

**Tech Stack:** React 19 + TypeScript、Vitest 4、@testing-library/react、@testing-library/user-event、happy-dom、Tailwind CSS 4

---

## 背景資訊

後端 `generate_html` 輸出格式（每頁一個 section）：

```html
<section class="page" data-page="1"><h2>Page 1</h2><p>...</p></section>
<section class="page" data-page="2"><h2>Page 2</h2><p>...</p></section>
```

現有元件：
- `frontend/src/components/HtmlPreview.tsx`：接收 `html: string`，用 `dangerouslySetInnerHTML` 渲染
- `frontend/src/App.tsx`：`{html && <HtmlPreview html={html} pageCount={pageCount} />}`

測試指令：`cd frontend && npm test`
編譯指令：`cd frontend && npm run build`

---

## Task 1：PagedPreview — HTML 解析與基礎渲染（TDD）

**Files:**
- Create: `frontend/src/components/PagedPreview.tsx`
- Create: `frontend/src/components/PagedPreview.test.tsx`

---

### Step 1：撰寫失敗測試

建立 `frontend/src/components/PagedPreview.test.tsx`，內容如下：

```tsx
import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { PagedPreview } from './PagedPreview';

// 測試用輔助函式：產生 N 頁的 HTML 字串
function makeHtml(pageCount: number): string {
  return Array.from({ length: pageCount }, (_, i) =>
    `<section class="page" data-page="${i + 1}"><p>第 ${i + 1} 頁內容</p></section>`
  ).join('\n');
}

describe('PagedPreview', () => {
  it('預設顯示第 1 頁內容', () => {
    render(<PagedPreview html={makeHtml(3)} pageCount={3} />);
    expect(screen.getByText('第 1 頁內容')).toBeInTheDocument();
    expect(screen.queryByText('第 2 頁內容')).not.toBeInTheDocument();
  });

  it('顯示頁碼資訊「1 / 3」', () => {
    render(<PagedPreview html={makeHtml(3)} pageCount={3} />);
    expect(screen.getByDisplayValue('1')).toBeInTheDocument(); // input 預設值
    expect(screen.getByText('/ 3')).toBeInTheDocument();
  });
});
```

### Step 2：確認測試失敗

```bash
cd frontend && npm test -- PagedPreview
```

預期：FAIL，錯誤訊息為 `Cannot find module './PagedPreview'`

---

### Step 3：實作最小可行的 PagedPreview

建立 `frontend/src/components/PagedPreview.tsx`：

```tsx
import { useMemo, useState } from 'react';
import { HtmlPreview } from './HtmlPreview';

interface PagedPreviewProps {
  html: string;
  pageCount: number;
}

export function PagedPreview({ html, pageCount }: PagedPreviewProps) {
  const [currentPage, setCurrentPage] = useState(1); // 1-indexed
  const [inputValue, setInputValue] = useState('1');

  const pages = useMemo(() => {
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, 'text/html');
    const sections = doc.querySelectorAll('section.page');
    return Array.from(sections).map((s) => s.outerHTML);
  }, [html]);

  const currentHtml = pages[currentPage - 1] ?? '';

  function goToPage(page: number) {
    const clamped = Math.max(1, Math.min(page, pageCount));
    setCurrentPage(clamped);
    setInputValue(String(clamped));
  }

  function handleInputChange(e: React.ChangeEvent<HTMLInputElement>) {
    setInputValue(e.target.value);
  }

  function handleInputKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter') {
      const parsed = parseInt(inputValue, 10);
      goToPage(isNaN(parsed) ? currentPage : parsed);
    }
  }

  return (
    <div>
      <div className="flex items-center gap-2 mb-4">
        <button
          onClick={() => goToPage(currentPage - 1)}
          disabled={currentPage === 1}
          className="px-3 py-1 rounded border border-gray-300 disabled:opacity-40 hover:bg-gray-100"
        >
          ← 上一頁
        </button>
        <input
          type="number"
          value={inputValue}
          onChange={handleInputChange}
          onKeyDown={handleInputKeyDown}
          className="w-14 text-center border border-gray-300 rounded py-1"
          min={1}
          max={pageCount}
        />
        <span>/ {pageCount}</span>
        <button
          onClick={() => goToPage(currentPage + 1)}
          disabled={currentPage === pageCount}
          className="px-3 py-1 rounded border border-gray-300 disabled:opacity-40 hover:bg-gray-100"
        >
          下一頁 →
        </button>
      </div>
      <HtmlPreview html={currentHtml} pageCount={pageCount} />
    </div>
  );
}
```

### Step 4：確認測試通過

```bash
cd frontend && npm test -- PagedPreview
```

預期：PASS（2 tests）

---

## Task 2：PagedPreview — 導覽按鈕邏輯（TDD）

**Files:**
- Modify: `frontend/src/components/PagedPreview.test.tsx`（新增測試）

---

### Step 1：在測試檔案新增導覽測試

在 `describe('PagedPreview', ...)` 區塊**末尾**新增以下測試：

```tsx
import userEvent from '@testing-library/user-event';

// （在現有 describe 區塊中新增）

  it('點「下一頁」後顯示第 2 頁內容', async () => {
    const user = userEvent.setup();
    render(<PagedPreview html={makeHtml(3)} pageCount={3} />);
    await user.click(screen.getByText('下一頁 →'));
    expect(screen.getByText('第 2 頁內容')).toBeInTheDocument();
    expect(screen.queryByText('第 1 頁內容')).not.toBeInTheDocument();
  });

  it('從第 2 頁點「上一頁」後回到第 1 頁', async () => {
    const user = userEvent.setup();
    render(<PagedPreview html={makeHtml(3)} pageCount={3} />);
    await user.click(screen.getByText('下一頁 →'));
    await user.click(screen.getByText('← 上一頁'));
    expect(screen.getByText('第 1 頁內容')).toBeInTheDocument();
  });

  it('第 1 頁時「上一頁」按鈕 disabled', () => {
    render(<PagedPreview html={makeHtml(3)} pageCount={3} />);
    expect(screen.getByText('← 上一頁')).toBeDisabled();
  });

  it('最後一頁時「下一頁」按鈕 disabled', async () => {
    const user = userEvent.setup();
    render(<PagedPreview html={makeHtml(2)} pageCount={2} />);
    await user.click(screen.getByText('下一頁 →'));
    expect(screen.getByText('下一頁 →')).toBeDisabled();
  });
```

### Step 2：確認新增測試通過（實作已完成，應直接通過）

```bash
cd frontend && npm test -- PagedPreview
```

預期：PASS（6 tests）

---

## Task 3：PagedPreview — 頁碼輸入（TDD）

**Files:**
- Modify: `frontend/src/components/PagedPreview.test.tsx`（新增測試）

---

### Step 1：新增頁碼輸入測試

```tsx
  it('輸入頁碼 3 並按 Enter 後跳至第 3 頁', async () => {
    const user = userEvent.setup();
    render(<PagedPreview html={makeHtml(5)} pageCount={5} />);
    const input = screen.getByDisplayValue('1');
    await user.clear(input);
    await user.type(input, '3');
    await user.keyboard('{Enter}');
    expect(screen.getByText('第 3 頁內容')).toBeInTheDocument();
  });

  it('輸入 0 並按 Enter 後修正至第 1 頁', async () => {
    const user = userEvent.setup();
    render(<PagedPreview html={makeHtml(3)} pageCount={3} />);
    const input = screen.getByDisplayValue('1');
    await user.clear(input);
    await user.type(input, '0');
    await user.keyboard('{Enter}');
    expect(screen.getByDisplayValue('1')).toBeInTheDocument();
    expect(screen.getByText('第 1 頁內容')).toBeInTheDocument();
  });

  it('輸入超出範圍（999）並按 Enter 後修正至最後一頁', async () => {
    const user = userEvent.setup();
    render(<PagedPreview html={makeHtml(3)} pageCount={3} />);
    const input = screen.getByDisplayValue('1');
    await user.clear(input);
    await user.type(input, '999');
    await user.keyboard('{Enter}');
    expect(screen.getByDisplayValue('3')).toBeInTheDocument();
    expect(screen.getByText('第 3 頁內容')).toBeInTheDocument();
  });
```

### Step 2：確認全部測試通過

```bash
cd frontend && npm test -- PagedPreview
```

預期：PASS（9 tests）

### Step 3：Commit Task 1–3 成果

```bash
cd /c/Project/asmr-pdf-script-add-Furigana
git add frontend/src/components/PagedPreview.tsx frontend/src/components/PagedPreview.test.tsx
git commit -m "[Feature] 新增 PagedPreview 元件（分頁導覽 + 頁碼輸入，9 tests passed）"
```

---

## Task 4：App.tsx 整合

**Files:**
- Modify: `frontend/src/App.tsx`（第 2、36 行）

---

### Step 1：更新 App.tsx

修改 `frontend/src/App.tsx`：

**第 2 行** — 將 import 改為：
```tsx
import { PagedPreview } from "./components/PagedPreview";
```
（刪除原本的 `import { HtmlPreview } from "./components/HtmlPreview";`）

**第 36 行** — 將：
```tsx
{html && <HtmlPreview html={html} pageCount={pageCount} />}
```
改為：
```tsx
{html && <PagedPreview html={html} pageCount={pageCount} />}
```

### Step 2：確認所有測試仍通過

```bash
cd frontend && npm test
```

預期：PASS（全部 tests，含原有 HtmlPreview 7 tests + 新增 PagedPreview 9 tests）

### Step 3：確認編譯通過

```bash
cd frontend && npm run build
```

預期：Build 成功，無 TypeScript 錯誤

### Step 4：更新 SUMMARY.md

在 `.claude/SUMMARY.md` 中：
- 新增「前端分頁功能」至已完成項目清單
- 更新最後更新日期為 2026-02-21

### Step 5：Commit

```bash
cd /c/Project/asmr-pdf-script-add-Furigana
git add frontend/src/App.tsx .claude/SUMMARY.md
git commit -m "[Feature] 整合 PagedPreview 至 App 主元件，替換 HtmlPreview"
```

---

## 完成標準

- [ ] `PagedPreview.test.tsx` 所有 9 個測試通過
- [ ] `HtmlPreview.test.tsx` 原有測試不受影響
- [ ] `npm run build` 編譯無錯誤
- [ ] 前端可正常上傳 PDF 並顯示分頁導覽
