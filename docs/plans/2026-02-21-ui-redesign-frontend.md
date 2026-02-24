# UI 重設計 Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** 將現有前端 UI 重新設計為「和風現代（Wa-modern）」風格，統一使用 Tailwind CSS，新增 FileUploader 收起態與 PagedPreview 分頁元件。

**Architecture:** 以米白（#F9F4EE）＋朱紅（#C0392B）＋炭灰（#3D3D3D）為色彩系統，透過 Tailwind v4 `@theme` 定義 CSS token；FileUploader 新增 `collapsed` prop 實現兩種渲染態；新增 `PagedPreview` 包裝 `HtmlPreview` 提供分頁導覽；`HtmlPreview` 保持不動；刪除 `App.css`。

**Tech Stack:** React 19 + TypeScript、Vitest 4、@testing-library/react、@testing-library/user-event、happy-dom、Tailwind CSS 4

---

## 背景資訊

**設計文件：** `docs/plans/2026-02-21-ui-redesign-design.md`

**現有元件：**
- `frontend/src/App.tsx` — 主元件，import App.css，使用 `.app` CSS class
- `frontend/src/App.css` — 舊式 CSS，本次刪除
- `frontend/src/index.css` — 只有 `@import "tailwindcss"`（Tailwind v4）
- `frontend/src/components/FileUploader.tsx` — 使用舊式 CSS class（`file-uploader`、`dragging`）
- `frontend/src/components/ProgressBar.tsx` — 已使用 Tailwind，預設訊息「處理中...」
- `frontend/src/components/HtmlPreview.tsx` — **不動**

**現有測試：**
- `ProgressBar.test.tsx` — 3 個測試（含預設訊息「處理中...」斷言需更新）
- `HtmlPreview.test.tsx` — **不動**
- `FileUploader.test.tsx` — **不存在，本次新增**

**測試指令：** `cd frontend && npm test`
**編譯指令：** `cd frontend && npm run build`

**Tailwind v4 色彩 Token 語法（`@theme` 區塊，寫在 index.css）：**

```css
@import "tailwindcss";

@theme {
  --color-washi: #F9F4EE;
  --color-ink: #3D3D3D;
  --color-ink-light: #7A7A7A;
  --color-vermilion: #C0392B;
  --color-vermilion-light: #E8503F;
  --color-paper: #FFFFFF;
  --color-border: #E2D9CE;
}
```

使用方式：`bg-washi`、`text-vermilion`、`border-border` 等（Tailwind 自動對應 `--color-*`）。

**⚠️ 注意：** `border-border` 是 Tailwind 保留字，請改用 `border-[#E2D9CE]` 或自訂名稱 `washi-border`。

---

## Task 1：色彩 Token 設定

**Files:**
- Modify: `frontend/src/index.css`

---

### Step 1：修改 index.css，加入 @theme 色彩 token

將 `frontend/src/index.css` 改為：

```css
@import "tailwindcss";

@theme {
  --color-washi: #F9F4EE;
  --color-ink: #3D3D3D;
  --color-ink-light: #7A7A7A;
  --color-vermilion: #C0392B;
  --color-vermilion-light: #E8503F;
  --color-paper: #FFFFFF;
  --color-washi-border: #E2D9CE;
}

@keyframes indeterminate {
  0%   { transform: translateX(-100%); width: 40%; }
  50%  { transform: translateX(60%);   width: 60%; }
  100% { transform: translateX(200%);  width: 40%; }
}
```

> 同時將原本分散的 `@keyframes indeterminate` 統一移到此處（`App.css` 刪除後不會遺失）。

### Step 2：確認 Tailwind dev server 無報錯

```bash
cd frontend && npm run dev
```

預期：啟動成功，無 CSS 錯誤（可按 Ctrl+C 停止）

### Step 3：Commit

```bash
cd /c/Project/asmr-pdf-script-add-Furigana
git add frontend/src/index.css
git commit -m "[Style] 新增 Tailwind v4 和風色彩 token（washi / vermilion / ink）"
```

---

## Task 2：ProgressBar 重設計（TDD）

**Files:**
- Modify: `frontend/src/components/ProgressBar.test.tsx`
- Modify: `frontend/src/components/ProgressBar.tsx`

---

### Step 1：更新測試 — 預設訊息改為日文

將 `frontend/src/components/ProgressBar.test.tsx` 完整替換為：

```tsx
import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { ProgressBar } from './ProgressBar';

describe('ProgressBar', () => {
  it('顯示預設訊息「振り仮名を処理中...」', () => {
    render(<ProgressBar />);
    expect(screen.getByText('振り仮名を処理中...')).toBeInTheDocument();
  });

  it('顯示自訂訊息', () => {
    render(<ProgressBar message="アップロード中..." />);
    expect(screen.getByText('アップロード中...')).toBeInTheDocument();
  });

  it('渲染動畫進度條', () => {
    const { container } = render(<ProgressBar />);
    expect(container.firstChild).toBeInTheDocument();
  });
});
```

### Step 2：確認測試失敗（預設訊息不符）

```bash
cd frontend && npm test -- ProgressBar
```

預期：FAIL，「振り仮名を処理中...」 not found

### Step 3：實作 ProgressBar 新樣式

將 `frontend/src/components/ProgressBar.tsx` 完整替換為：

```tsx
interface ProgressBarProps {
  message?: string;
}

export function ProgressBar({ message = '振り仮名を処理中...' }: ProgressBarProps) {
  return (
    <div className="my-6 text-center">
      <div className="h-1.5 w-full overflow-hidden rounded-full bg-washi-border">
        <div className="h-full animate-[indeterminate_1.5s_infinite_ease-in-out] rounded-full bg-vermilion" />
      </div>
      <p className="mt-2 text-sm text-ink-light">{message}</p>
    </div>
  );
}
```

### Step 4：確認測試通過

```bash
cd frontend && npm test -- ProgressBar
```

預期：PASS（3 tests）

### Step 5：Commit

```bash
cd /c/Project/asmr-pdf-script-add-Furigana
git add frontend/src/components/ProgressBar.tsx frontend/src/components/ProgressBar.test.tsx
git commit -m "[Style] ProgressBar 改為朱紅色＋日文提示"
```

---

## Task 3：FileUploader 重設計（TDD）

**Files:**
- Create: `frontend/src/components/FileUploader.test.tsx`
- Modify: `frontend/src/components/FileUploader.tsx`

**Props 異動：**

```ts
interface FileUploaderProps {
  onFileSelect: (file: File) => void;
  disabled?: boolean;
  collapsed?: boolean;   // ← 新增：true = 收起態
  fileName?: string;     // ← 新增：收起態顯示的檔名
  onReset?: () => void;  // ← 新增：「重新選擇」按鈕的 callback
}
```

---

### Step 1：建立失敗測試

建立 `frontend/src/components/FileUploader.test.tsx`：

```tsx
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi } from 'vitest';
import { FileUploader } from './FileUploader';

describe('FileUploader', () => {
  describe('展開態（collapsed=false）', () => {
    it('顯示拖放提示文字', () => {
      render(<FileUploader onFileSelect={vi.fn()} />);
      expect(screen.getByText('拖放 PDF 至此')).toBeInTheDocument();
      expect(screen.getByText('或 點擊選擇檔案')).toBeInTheDocument();
    });
  });

  describe('收起態（collapsed=true）', () => {
    it('顯示檔名', () => {
      render(
        <FileUploader
          onFileSelect={vi.fn()}
          collapsed
          fileName="script.pdf"
          onReset={vi.fn()}
        />
      );
      expect(screen.getByText('script.pdf')).toBeInTheDocument();
    });

    it('不顯示拖放提示', () => {
      render(
        <FileUploader
          onFileSelect={vi.fn()}
          collapsed
          fileName="script.pdf"
          onReset={vi.fn()}
        />
      );
      expect(screen.queryByText('拖放 PDF 至此')).not.toBeInTheDocument();
    });

    it('點擊「重新選擇」呼叫 onReset', async () => {
      const user = userEvent.setup();
      const onReset = vi.fn();
      render(
        <FileUploader
          onFileSelect={vi.fn()}
          collapsed
          fileName="script.pdf"
          onReset={onReset}
        />
      );
      await user.click(screen.getByText('重新選擇'));
      expect(onReset).toHaveBeenCalledOnce();
    });
  });
});
```

### Step 2：確認測試失敗

```bash
cd frontend && npm test -- FileUploader
```

預期：FAIL（collapsed prop 不存在，文字不符）

### Step 3：實作新版 FileUploader

將 `frontend/src/components/FileUploader.tsx` 完整替換為：

```tsx
import { useCallback, useRef, useState } from 'react';

interface FileUploaderProps {
  onFileSelect: (file: File) => void;
  disabled?: boolean;
  collapsed?: boolean;
  fileName?: string;
  onReset?: () => void;
}

export function FileUploader({
  onFileSelect,
  disabled,
  collapsed,
  fileName,
  onReset,
}: FileUploaderProps) {
  const [isDragging, setIsDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      const file = e.dataTransfer.files[0];
      if (file && file.type === 'application/pdf') {
        onFileSelect(file);
      }
    },
    [onFileSelect],
  );

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) onFileSelect(file);
  };

  // 收起態
  if (collapsed) {
    return (
      <div className="flex items-center justify-between rounded-lg bg-[#FFF5F5] px-4 py-3 transition-all duration-300">
        <div className="flex items-center gap-2 text-ink">
          <span className="text-vermilion">📄</span>
          <span className="text-sm font-medium">{fileName}</span>
        </div>
        <button
          type="button"
          onClick={onReset}
          className="text-sm text-vermilion hover:text-vermilion-light transition-colors"
        >
          重新選擇
        </button>
      </div>
    );
  }

  // 展開態
  return (
    <div
      className={[
        'rounded-lg border-2 border-dashed border-vermilion p-12 text-center cursor-pointer transition-all duration-300',
        isDragging ? 'border-solid bg-[#FFF5F5]' : 'bg-paper hover:bg-[#FFF5F5] hover:border-solid',
        disabled ? 'opacity-50 pointer-events-none' : '',
      ].join(' ')}
      onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
      onDragLeave={() => setIsDragging(false)}
      onDrop={handleDrop}
      onClick={() => inputRef.current?.click()}
    >
      <div className="mb-3 text-4xl text-vermilion">☁</div>
      <p className="text-base font-medium text-ink">拖放 PDF 至此</p>
      <p className="mt-1 text-sm text-ink-light">或 點擊選擇檔案</p>
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

### Step 4：確認測試通過

```bash
cd frontend && npm test -- FileUploader
```

預期：PASS（4 tests）

### Step 5：Commit

```bash
cd /c/Project/asmr-pdf-script-add-Furigana
git add frontend/src/components/FileUploader.tsx frontend/src/components/FileUploader.test.tsx
git commit -m "[Style] FileUploader 重設計：和風樣式＋收起態（collapsed prop）"
```

---

## Task 4：Header + App.tsx 重構

**Files:**
- Modify: `frontend/src/App.tsx`

> App.css import 在此刪除，App.css 本身在 Task 6 刪除。

---

### Step 1：讀取現有 App.tsx 確認內容

閱讀 `frontend/src/App.tsx` 確認目前 import 與 JSX 結構。

### Step 2：改寫 App.tsx

將 `frontend/src/App.tsx` 完整替換為：

```tsx
import { useState } from 'react';
import { FileUploader } from './components/FileUploader';
import { HtmlPreview } from './components/HtmlPreview';
import { ProgressBar } from './components/ProgressBar';
import { convertPdf } from './services/api';

type AppState = 'idle' | 'uploading' | 'success' | 'error';

function App() {
  const [appState, setAppState] = useState<AppState>('idle');
  const [html, setHtml] = useState<string | null>(null);
  const [pageCount, setPageCount] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string>('');

  const handleFileSelect = async (file: File) => {
    setAppState('uploading');
    setError(null);
    setHtml(null);
    setFileName(file.name);

    try {
      const result = await convertPdf(file);
      setHtml(result.html);
      setPageCount(result.page_count);
      setAppState('success');
    } catch (err) {
      setError(err instanceof Error ? err.message : '轉換失敗');
      setAppState('error');
    }
  };

  const handleReset = () => {
    setAppState('idle');
    setHtml(null);
    setError(null);
    setFileName('');
  };

  const isCollapsed = appState === 'uploading' || appState === 'success';

  return (
    <div className="min-h-screen bg-washi">
      {/* Header */}
      <header className="bg-washi border-b border-washi-border px-6 py-4">
        <div className="mx-auto flex max-w-3xl items-center gap-3">
          <div className="h-7 w-[3px] rounded-full bg-vermilion" />
          <div>
            <span className="text-xl font-bold text-vermilion">振り仮名</span>
            <span className="ml-2 text-sm text-ink-light">PDF ふりがなツール</span>
          </div>
        </div>
      </header>

      {/* Main */}
      <main className="mx-auto max-w-3xl px-6 py-8">
        <FileUploader
          onFileSelect={handleFileSelect}
          disabled={appState === 'uploading'}
          collapsed={isCollapsed}
          fileName={fileName}
          onReset={handleReset}
        />

        {appState === 'uploading' && <ProgressBar />}

        {appState === 'error' && error && (
          <div className="mt-4 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}

        {appState === 'success' && html && (
          <HtmlPreview html={html} pageCount={pageCount} />
        )}
      </main>
    </div>
  );
}

export default App;
```

> **注意：** 此階段暫時仍使用 `HtmlPreview`，Task 5 完成後換為 `PagedPreview`。

### Step 3：確認既有測試不受影響

```bash
cd frontend && npm test
```

預期：PASS（HtmlPreview + ProgressBar + FileUploader 全部通過）

### Step 4：Commit

```bash
cd /c/Project/asmr-pdf-script-add-Furigana
git add frontend/src/App.tsx
git commit -m "[Style] App.tsx 重構：和風佈局＋Header＋狀態機（AppState）"
```

---

## Task 5：PagedPreview 新增（frontend-design → TDD → 實作）

**Files:**
- Create: `frontend/src/components/PagedPreview.tsx`
- Create: `frontend/src/components/PagedPreview.test.tsx`

> ⚠️ **強制規定**：實作此元件 UI 前，必須先呼叫 `frontend-design:frontend-design` skill，依照 skill 產出的導覽列樣式設計來撰寫 Tailwind 類別。

**元件規格：**

```ts
interface PagedPreviewProps {
  html: string;       // 後端回傳完整 HTML（含多個 <section class="page">）
  pageCount: number;  // 總頁數
}
```

**後端 HTML 格式（每頁一個 section）：**

```html
<section class="page" data-page="1"><p>第 1 頁</p></section>
<section class="page" data-page="2"><p>第 2 頁</p></section>
```

---

### Step 1：呼叫 frontend-design skill

```
使用 frontend-design:frontend-design skill
目標：設計 PagedPreview 的分頁導覽列 UI（和風現代風格）
色彩 token：bg-vermilion（按鈕）、text-ink、bg-paper、border-washi-border
元素：上一頁按鈕、頁碼 input（type=number）、「/ N」文字、下一頁按鈕
位置：sticky top-0
```

依照 skill 產出的設計，決定最終 Tailwind 類別後，繼續以下步驟。

### Step 2：建立失敗測試

建立 `frontend/src/components/PagedPreview.test.tsx`：

```tsx
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect } from 'vitest';
import { PagedPreview } from './PagedPreview';

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

  it('顯示頁碼資訊「1」與「/ 3」', () => {
    render(<PagedPreview html={makeHtml(3)} pageCount={3} />);
    expect(screen.getByDisplayValue('1')).toBeInTheDocument();
    expect(screen.getByText('/ 3')).toBeInTheDocument();
  });

  it('第 1 頁時「上一頁」按鈕 disabled', () => {
    render(<PagedPreview html={makeHtml(3)} pageCount={3} />);
    expect(screen.getByRole('button', { name: /上一頁/ })).toBeDisabled();
  });

  it('點「下一頁」後顯示第 2 頁', async () => {
    const user = userEvent.setup();
    render(<PagedPreview html={makeHtml(3)} pageCount={3} />);
    await user.click(screen.getByRole('button', { name: /下一頁/ }));
    expect(screen.getByText('第 2 頁內容')).toBeInTheDocument();
    expect(screen.queryByText('第 1 頁內容')).not.toBeInTheDocument();
  });

  it('最後一頁時「下一頁」按鈕 disabled', async () => {
    const user = userEvent.setup();
    render(<PagedPreview html={makeHtml(2)} pageCount={2} />);
    await user.click(screen.getByRole('button', { name: /下一頁/ }));
    expect(screen.getByRole('button', { name: /下一頁/ })).toBeDisabled();
  });

  it('從第 2 頁點「上一頁」回到第 1 頁', async () => {
    const user = userEvent.setup();
    render(<PagedPreview html={makeHtml(3)} pageCount={3} />);
    await user.click(screen.getByRole('button', { name: /下一頁/ }));
    await user.click(screen.getByRole('button', { name: /上一頁/ }));
    expect(screen.getByText('第 1 頁內容')).toBeInTheDocument();
  });

  it('輸入頁碼 3 並按 Enter 跳頁', async () => {
    const user = userEvent.setup();
    render(<PagedPreview html={makeHtml(5)} pageCount={5} />);
    const input = screen.getByDisplayValue('1');
    await user.clear(input);
    await user.type(input, '3');
    await user.keyboard('{Enter}');
    expect(screen.getByText('第 3 頁內容')).toBeInTheDocument();
  });

  it('輸入 0 自動修正至第 1 頁', async () => {
    const user = userEvent.setup();
    render(<PagedPreview html={makeHtml(3)} pageCount={3} />);
    const input = screen.getByDisplayValue('1');
    await user.clear(input);
    await user.type(input, '0');
    await user.keyboard('{Enter}');
    expect(screen.getByDisplayValue('1')).toBeInTheDocument();
  });

  it('輸入 999 自動修正至最後一頁', async () => {
    const user = userEvent.setup();
    render(<PagedPreview html={makeHtml(3)} pageCount={3} />);
    const input = screen.getByDisplayValue('1');
    await user.clear(input);
    await user.type(input, '999');
    await user.keyboard('{Enter}');
    expect(screen.getByDisplayValue('3')).toBeInTheDocument();
  });
});
```

### Step 3：確認測試失敗

```bash
cd frontend && npm test -- PagedPreview
```

預期：FAIL，`Cannot find module './PagedPreview'`

### Step 4：實作 PagedPreview

建立 `frontend/src/components/PagedPreview.tsx`。

導覽列 Tailwind 樣式依照 Step 1 的 frontend-design skill 產出結果填入（下方為邏輯骨架，樣式由 skill 決定）：

```tsx
import { useMemo, useState } from 'react';
import { HtmlPreview } from './HtmlPreview';

interface PagedPreviewProps {
  html: string;
  pageCount: number;
}

export function PagedPreview({ html, pageCount }: PagedPreviewProps) {
  const [currentPage, setCurrentPage] = useState(1);
  const [inputValue, setInputValue] = useState('1');

  const pages = useMemo(() => {
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, 'text/html');
    const sections = doc.querySelectorAll('section.page');
    return Array.from(sections).map((s) => s.outerHTML);
  }, [html]);

  function goToPage(page: number) {
    const clamped = Math.max(1, Math.min(page, pageCount));
    setCurrentPage(clamped);
    setInputValue(String(clamped));
  }

  return (
    <div className="mt-6">
      {/* 導覽列 — 樣式依 frontend-design skill 產出填入 */}
      <div className="sticky top-0 z-10 flex items-center gap-3 rounded-t-lg border border-washi-border bg-paper px-4 py-3">
        <button
          aria-label="上一頁"
          onClick={() => goToPage(currentPage - 1)}
          disabled={currentPage === 1}
          className="rounded bg-vermilion px-3 py-1 text-sm text-white disabled:opacity-40 hover:bg-vermilion-light transition-colors"
        >
          ← 上一頁
        </button>
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
          className="w-14 rounded border border-washi-border py-1 text-center text-sm text-ink"
          min={1}
          max={pageCount}
        />
        <span className="text-sm text-ink-light">/ {pageCount}</span>
        <button
          aria-label="下一頁"
          onClick={() => goToPage(currentPage + 1)}
          disabled={currentPage === pageCount}
          className="rounded bg-vermilion px-3 py-1 text-sm text-white disabled:opacity-40 hover:bg-vermilion-light transition-colors"
        >
          下一頁 →
        </button>
      </div>

      {/* 內容區 */}
      <HtmlPreview html={pages[currentPage - 1] ?? ''} pageCount={pageCount} />
    </div>
  );
}
```

### Step 5：確認測試通過

```bash
cd frontend && npm test -- PagedPreview
```

預期：PASS（9 tests）

### Step 6：Commit

```bash
cd /c/Project/asmr-pdf-script-add-Furigana
git add frontend/src/components/PagedPreview.tsx frontend/src/components/PagedPreview.test.tsx
git commit -m "[Feature] 新增 PagedPreview 元件（和風導覽列＋分頁邏輯，9 tests passed）"
```

---

## Task 6：整合清理 + 最終驗證

**Files:**
- Modify: `frontend/src/App.tsx`（換用 PagedPreview）
- Delete: `frontend/src/App.css`
- Modify: `.claude/SUMMARY.md`

---

### Step 1：App.tsx 換用 PagedPreview

修改 `frontend/src/App.tsx`：

**import 區塊**：將 `HtmlPreview` 替換為 `PagedPreview`

```tsx
// 刪除：
import { HtmlPreview } from './components/HtmlPreview';
// 新增：
import { PagedPreview } from './components/PagedPreview';
```

**JSX 區塊**：將 `<HtmlPreview>` 替換為 `<PagedPreview>`

```tsx
// 改前：
{appState === 'success' && html && (
  <HtmlPreview html={html} pageCount={pageCount} />
)}
// 改後：
{appState === 'success' && html && (
  <PagedPreview html={html} pageCount={pageCount} />
)}
```

### Step 2：刪除 App.css

```bash
cd /c/Project/asmr-pdf-script-add-Furigana
rm frontend/src/App.css
```

### Step 3：確認所有測試通過

```bash
cd frontend && npm test
```

預期：PASS（全部測試，含 HtmlPreview + ProgressBar + FileUploader + PagedPreview）

### Step 4：確認編譯通過

```bash
cd frontend && npm run build
```

預期：Build 成功，無 TypeScript 錯誤

### Step 5：更新 SUMMARY.md

在 `.claude/SUMMARY.md` 中：
- 新增「UI 重設計（和風現代主題）」至已完成項目清單
- 更新專案狀態
- 更新最後更新日期為 2026-02-21

### Step 6：Commit

```bash
cd /c/Project/asmr-pdf-script-add-Furigana
git add frontend/src/App.tsx .claude/SUMMARY.md
git rm frontend/src/App.css
git commit -m "[Feature] 整合 PagedPreview＋刪除 App.css，UI 重設計完成"
```

---

## 完成標準

- [ ] `npm test` — 全部通過（FileUploader 4 + ProgressBar 3 + HtmlPreview 原有 + PagedPreview 9）
- [ ] `npm run build` — 無 TypeScript 錯誤
- [ ] 瀏覽器視覺確認：和風米白底、朱紅按鈕、Header 豎線 Logo
- [ ] FileUploader 上傳後收起為紙籤條，點「重新選擇」可回到展開態
- [ ] `App.css` 已刪除，無殘留舊式 CSS
- [ ] SUMMARY.md 已更新
