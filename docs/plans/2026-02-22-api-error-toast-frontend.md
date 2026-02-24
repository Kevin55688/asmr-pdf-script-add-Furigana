# API 錯誤 Toast 通知實作計畫

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** 將前端 API 錯誤（convert、翻譯）改為右下角 Toast 彈出通知，移除現有 inline error div。

**Architecture:** 建立 `ToastContext` + `useToast()` hook，`App.tsx` 包裹 `ToastProvider`，各元件呼叫 `useToast()` 觸發通知。翻譯錯誤 Toast 附帶「重試」按鈕，convert 錯誤純訊息 5 秒自動消失。

**Tech Stack:** React Context API, TypeScript, Tailwind CSS, Vitest + Testing Library

---

### Task 1: 建立 Toast Context、Provider 與 useToast hook

**Files:**
- Create: `frontend/src/components/Toast.tsx`
- Create: `frontend/src/components/Toast.test.tsx`

**Step 1: 建立測試檔案**

```tsx
// frontend/src/components/Toast.test.tsx
import { render, screen, act } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { ToastProvider, useToast } from "./Toast";

function TestConsumer({ action }: { action?: { label: string; onClick: () => void } }) {
  const { showToast } = useToast();
  return (
    <button
      onClick={() =>
        showToast("測試錯誤訊息", action ? { action } : undefined)
      }
    >
      觸發
    </button>
  );
}

describe("Toast", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("呼叫 showToast 後顯示訊息", async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    render(
      <ToastProvider>
        <TestConsumer />
      </ToastProvider>,
    );
    await user.click(screen.getByText("觸發"));
    expect(screen.getByText("測試錯誤訊息")).toBeInTheDocument();
  });

  it("有 duration 時自動消失", async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    render(
      <ToastProvider>
        <TestConsumer />
      </ToastProvider>,
    );
    await user.click(screen.getByText("觸發"));
    expect(screen.getByText("測試錯誤訊息")).toBeInTheDocument();
    act(() => vi.advanceTimersByTime(5100));
    expect(screen.queryByText("測試錯誤訊息")).not.toBeInTheDocument();
  });

  it("點擊關閉按鈕立即移除 Toast", async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    render(
      <ToastProvider>
        <TestConsumer />
      </ToastProvider>,
    );
    await user.click(screen.getByText("觸發"));
    await user.click(screen.getByLabelText("關閉通知"));
    expect(screen.queryByText("測試錯誤訊息")).not.toBeInTheDocument();
  });

  it("帶 action 的 Toast 顯示按鈕並觸發 callback", async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    const onAction = vi.fn();
    render(
      <ToastProvider>
        <TestConsumer action={{ label: "重試", onClick: onAction }} />
      </ToastProvider>,
    );
    await user.click(screen.getByText("觸發"));
    expect(screen.getByText("重試")).toBeInTheDocument();
    await user.click(screen.getByText("重試"));
    expect(onAction).toHaveBeenCalledOnce();
  });

  it("帶 action 的 Toast 不自動消失", async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    const onAction = vi.fn();
    render(
      <ToastProvider>
        <TestConsumer action={{ label: "重試", onClick: onAction }} />
      </ToastProvider>,
    );
    await user.click(screen.getByText("觸發"));
    act(() => vi.advanceTimersByTime(10000));
    expect(screen.getByText("測試錯誤訊息")).toBeInTheDocument();
  });
});
```

**Step 2: 執行測試，確認失敗**

```bash
cd frontend && npx vitest run src/components/Toast.test.tsx
```

預期：`FAIL` — `Toast` 模組不存在

**Step 3: 建立 `Toast.tsx`**

```tsx
// frontend/src/components/Toast.tsx
import { createContext, useCallback, useContext, useRef, useState } from "react";

interface ToastAction {
  label: string;
  onClick: () => void;
}

interface ToastItem {
  id: string;
  message: string;
  action?: ToastAction;
  duration?: number; // ms，undefined = 不自動消失
}

interface ToastContextValue {
  showToast: (message: string, options?: { action?: ToastAction; duration?: number }) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used within ToastProvider");
  return ctx;
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const timers = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
    const timer = timers.current.get(id);
    if (timer) {
      clearTimeout(timer);
      timers.current.delete(id);
    }
  }, []);

  const showToast = useCallback(
    (message: string, options?: { action?: ToastAction; duration?: number }) => {
      const id = crypto.randomUUID();
      const duration = options?.action ? undefined : (options?.duration ?? 5000);
      setToasts((prev) => [...prev, { id, message, action: options?.action, duration }]);
      if (duration !== undefined) {
        const timer = setTimeout(() => removeToast(id), duration);
        timers.current.set(id, timer);
      }
    },
    [removeToast],
  );

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      <ToastContainer toasts={toasts} onRemove={removeToast} />
    </ToastContext.Provider>
  );
}

function ToastContainer({
  toasts,
  onRemove,
}: {
  toasts: ToastItem[];
  onRemove: (id: string) => void;
}) {
  if (toasts.length === 0) return null;
  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col gap-2">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className="flex min-w-[280px] max-w-sm items-start gap-3 rounded-lg border border-washi-border bg-paper px-4 py-3 shadow-lg"
        >
          <span className="mt-0.5 text-vermilion">⚠</span>
          <p className="flex-1 text-sm text-ink">{toast.message}</p>
          {toast.action && (
            <button
              onClick={toast.action.onClick}
              className="shrink-0 text-sm text-vermilion underline hover:no-underline"
            >
              {toast.action.label}
            </button>
          )}
          <button
            aria-label="關閉通知"
            onClick={() => onRemove(toast.id)}
            className="shrink-0 text-ink-light hover:text-ink"
          >
            ✕
          </button>
        </div>
      ))}
    </div>
  );
}
```

**Step 4: 執行測試，確認通過**

```bash
cd frontend && npx vitest run src/components/Toast.test.tsx
```

預期：5 tests PASS

**Step 5: Commit**

```bash
git add frontend/src/components/Toast.tsx frontend/src/components/Toast.test.tsx
git commit -m "[Feature] 新增 Toast 通知元件（ToastProvider + useToast hook）"
```

---

### Task 2: App.tsx 整合 ToastProvider，convert 錯誤改用 Toast

**Files:**
- Modify: `frontend/src/App.tsx`

**Step 1: 確認現有全部測試通過（基準線）**

```bash
cd frontend && npx vitest run
```

預期：33 tests PASS（記錄此數字）

**Step 2: 修改 `App.tsx`**

修改 `frontend/src/App.tsx`，做以下變更：

1. import `ToastProvider` 與 `useToast`
2. 建立內層元件 `AppContent`，將邏輯移入，在裡面呼叫 `useToast()`
3. `App` 只剩 `<ToastProvider><AppContent /></ToastProvider>`
4. `handleFileSelect` 的 catch 區塊改呼叫 `showToast`，`setAppState` 改回 `"idle"`（讓使用者可重新上傳）
5. 移除 `error` state
6. 移除 `appState === "error"` 的 inline error div

```tsx
// frontend/src/App.tsx
import { useState } from "react";
import { FileUploader } from "./components/FileUploader";
import { PagedPreview } from "./components/PagedPreview";
import { ProgressBar } from "./components/ProgressBar";
import { ToastProvider, useToast } from "./components/Toast";
import { convertFile } from "./services/api";

type AppState = "idle" | "uploading" | "success";

function AppContent() {
  const { showToast } = useToast();
  const [appState, setAppState] = useState<AppState>("idle");
  const [html, setHtml] = useState<string | null>(null);
  const [pageCount, setPageCount] = useState(0);
  const [fileName, setFileName] = useState<string>("");

  const handleFileSelect = async (file: File) => {
    setAppState("uploading");
    setHtml(null);
    setFileName(file.name);

    try {
      const result = await convertFile(file);
      setHtml(result.html);
      setPageCount(result.page_count);
      setAppState("success");
    } catch (err) {
      showToast(err instanceof Error ? err.message : "轉換失敗");
      setAppState("idle");
    }
  };

  const handleReset = () => {
    setAppState("idle");
    setHtml(null);
    setFileName("");
  };

  const isCollapsed = appState === "uploading" || appState === "success";

  return (
    <div className="min-h-screen bg-washi">
      {/* Header */}
      <header className="bg-washi border-b border-washi-border px-6 py-4">
        <div className="mx-auto flex max-w-3xl items-center gap-3">
          <div className="h-7 w-[3px] rounded-full bg-vermilion" />
          <div>
            <span className="text-xl font-bold text-vermilion">振り仮名</span>
            <span className="ml-2 text-sm text-ink-light">
              PDF ふりがなツール
            </span>
          </div>
        </div>
      </header>

      {/* Main */}
      <main className="mx-auto max-w-3xl px-6 py-8">
        <FileUploader
          onFileSelect={handleFileSelect}
          disabled={appState === "uploading"}
          collapsed={isCollapsed}
          fileName={fileName}
          onReset={handleReset}
        />

        {appState === "uploading" && <ProgressBar />}

        {appState === "success" && html && (
          <PagedPreview html={html} pageCount={pageCount} />
        )}
      </main>
    </div>
  );
}

function App() {
  return (
    <ToastProvider>
      <AppContent />
    </ToastProvider>
  );
}

export default App;
```

**Step 3: 執行全部測試，確認不低於基準線**

```bash
cd frontend && npx vitest run
```

預期：≥ 33 tests PASS，0 FAIL

**Step 4: Commit**

```bash
git add frontend/src/App.tsx
git commit -m "[Feature] App.tsx 整合 ToastProvider，convert 錯誤改用 Toast"
```

---

### Task 3: PagedPreview.tsx 整合 useToast，翻譯錯誤改用 Toast（含重試）

**Files:**
- Modify: `frontend/src/components/PagedPreview.tsx`
- Modify: `frontend/src/components/PagedPreview.test.tsx`

**Step 1: 在 `PagedPreview.test.tsx` 新增翻譯錯誤 Toast 測試**

在現有 describe block 末尾加入：

```tsx
// 在 PagedPreview.test.tsx 頂部 import 新增：
import { ToastProvider } from "./Toast";

// 在 describe 末尾新增：
it("翻譯失敗時顯示 Toast 錯誤訊息", async () => {
  const user = userEvent.setup();
  vi.spyOn(api, "translateTexts").mockRejectedValue(new Error("API 金鑰無效"));

  render(
    <ToastProvider>
      <PagedPreview html={makeHtml(1)} pageCount={1} />
    </ToastProvider>,
  );
  await user.click(screen.getByLabelText("翻譯"));

  await waitFor(() => {
    expect(screen.getByText("API 金鑰無效")).toBeInTheDocument();
  });
});

it("翻譯失敗 Toast 顯示重試按鈕，點擊後重新呼叫 API", async () => {
  const user = userEvent.setup();
  const mockTranslate = vi
    .spyOn(api, "translateTexts")
    .mockRejectedValue(new Error("網路錯誤"));

  render(
    <ToastProvider>
      <PagedPreview html={makeHtml(1)} pageCount={1} />
    </ToastProvider>,
  );
  await user.click(screen.getByLabelText("翻譯"));

  await waitFor(() => {
    expect(screen.getByText("重試")).toBeInTheDocument();
  });

  await user.click(screen.getByText("重試"));
  expect(mockTranslate).toHaveBeenCalledTimes(2);
});
```

**Step 2: 執行新測試，確認失敗**

```bash
cd frontend && npx vitest run src/components/PagedPreview.test.tsx
```

預期：新增的 2 tests FAIL

**Step 3: 修改 `PagedPreview.tsx`**

做以下變更：

1. 新增 `import { useToast } from "./Toast";`
2. 移除 `translationError` state
3. `fetchTranslation` 的 catch 區塊改呼叫 `showToast`，帶 `action: { label: '重試', onClick: fetchTranslation }`
4. 移除 inline 翻譯錯誤 div（`{translationError && ...}`）

在 `PagedPreview` 函式開頭加入：
```tsx
const { showToast } = useToast();
```

將 catch 區塊：
```tsx
// 舊
} catch (e) {
  setTranslationError(e instanceof Error ? e.message : '翻譯失敗');
}
```
改為：
```tsx
// 新
} catch (e) {
  const msg = e instanceof Error ? e.message : '翻譯失敗';
  showToast(msg, { action: { label: '重試', onClick: fetchTranslation } });
}
```

移除整個 `translationError` state 宣告與 inline error div block。

> **注意**：`fetchTranslation` 使用 `useCallback`，在 `showToast` 的 action onClick 中引用 `fetchTranslation` 是安全的（閉包捕捉同一個穩定參考）。

**Step 4: 執行全部測試，確認通過**

```bash
cd frontend && npx vitest run
```

預期：≥ 35 tests PASS，0 FAIL

**Step 5: Commit**

```bash
git add frontend/src/components/PagedPreview.tsx frontend/src/components/PagedPreview.test.tsx
git commit -m "[Feature] PagedPreview 翻譯錯誤改用 Toast（含重試按鈕）"
```

---

### Task 4: 更新 SUMMARY.md 並 build 驗證

**Step 1: 執行 build 確認無 TypeScript 錯誤**

```bash
cd frontend && npm run build
```

預期：Build succeeded，0 errors

**Step 2: 更新 `.claude/SUMMARY.md`**

在「已完成項目」清單頂端加入：

```markdown
- [2026-02-22] API 錯誤 Toast 通知完成：新增 ToastProvider + useToast hook，convert/翻譯錯誤改為右下角 Toast，翻譯錯誤含重試按鈕，≥ 35 tests passed
```

更新「專案狀態」標題。

**Step 3: 最終 Commit**

```bash
git add .claude/SUMMARY.md
git commit -m "[Chore] 更新 SUMMARY.md — API 錯誤 Toast 通知完成"
```
