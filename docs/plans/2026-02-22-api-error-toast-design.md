# API 錯誤 Toast 通知設計文件

**日期**：2026-02-22
**狀態**：⏳ 待實作

## 需求背景

目前 API 錯誤（convert 失敗、翻譯失敗）以 inline 靜態 div 顯示，位置不明顯且體驗不夠直覺。需改為右下角浮動 Toast 通知，讓使用者清楚感知錯誤。

## 設計目標

- 所有 API 錯誤以右下角 Toast 彈出顯示
- 翻譯錯誤 Toast 附帶「重試」按鈕
- 移除現有 inline error div
- 無外部依賴，樣式與現有和風設計一致

## 架構

```
App.tsx
└── ToastProvider（包裹全部）
    ├── ToastContainer（右下角固定，渲染所有 toast）
    ├── FileUploader
    └── PagedPreview  ← useToast() 觸發翻譯錯誤
```

## 新增檔案

### `frontend/src/components/Toast.tsx`

包含：
- `ToastContext` — React Context
- `ToastProvider` — 提供 context，管理 toast 清單 state
- `ToastContainer` — 渲染右下角浮動層，遍歷 toast 清單
- `useToast()` hook — 回傳 `showToast(message, options?)` 函式

**Toast 資料結構：**

```ts
interface Toast {
  id: string;
  message: string;
  action?: {
    label: string;
    onClick: () => void;
  };
  duration?: number; // ms，undefined = 不自動消失
}
```

## 修改檔案

### `App.tsx`

- 最外層包裹 `<ToastProvider>`
- `handleFileSelect` catch 區塊：`setError` / `setAppState("error")` 改為 `showToast(errMsg)`，appState 維持 `"idle"` 或另行處理
- 移除 `appState === "error"` 的 inline error div
- 移除 `error` state（若不再需要）

### `PagedPreview.tsx`

- `fetchTranslation` catch 區塊：改呼叫 `showToast(errMsg, { action: { label: '重試', onClick: fetchTranslation } })`
- 移除 `translationError` state
- 移除 inline 翻譯錯誤 div

## Toast 行為規格

| 情境 | 訊息 | 按鈕 | 自動消失 |
|------|------|------|---------|
| Convert 失敗 | API 回傳錯誤訊息 | 無 | 5 秒 |
| 翻譯失敗 | API 回傳錯誤訊息 | 重試 | 不自動消失 |

## Toast 樣式規格

- 位置：右下角固定（`fixed bottom-6 right-6 z-50`）
- 多個 toast 垂直疊加（`flex flex-col gap-2`）
- 背景：`bg-paper border border-washi-border shadow-md rounded-lg`
- 錯誤 icon：朱紅色 `⚠`
- 關閉按鈕：`×`，點擊立即移除
- 進入動畫：slide-in from right（CSS transition `translate-x`）
- 離開動畫：fade-out + slide-out

## 測試重點

- `useToast` 可在元件外部觸發 toast
- Toast 5 秒後自動消失（duration 設定）
- 帶 action 的 Toast 不自動消失
- 點擊關閉按鈕立即移除
- 點擊重試按鈕觸發 callback
- 多個 toast 可同時顯示
