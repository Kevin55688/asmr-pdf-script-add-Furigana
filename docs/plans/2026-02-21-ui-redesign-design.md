# UI 重新設計文件（和風現代）

- **日期**：2026-02-21
- **作者**：@Claude
- **狀態**：✅ 設計核可

---

## 背景

目前前端 UI 以功能性為優先，混用 `App.css` 傳統 CSS 與 Tailwind CSS，視覺上缺乏設計個性。本次重新設計統一採用 Tailwind CSS，以「和風現代（Wa-modern）」為主題，目標使用者為日語學習者。

---

## 設計目標

- 統一樣式系統：全面改為 Tailwind CSS，移除 `App.css`
- 建立和風視覺識別：米白底、朱紅主色、炭灰文字
- 改善 FileUploader 狀態切換：上傳後收起為紙籤條，不完全消失
- 新增 `PagedPreview` 元件（含分頁導覽），分頁導覽固定於預覽頂部
- 實作 UI 前必須呼叫 `frontend-design:frontend-design` skill

---

## 色彩系統

| Token | 色碼 | 用途 |
|-------|------|------|
| `washi` | `#F9F4EE` | 全頁背景（和紙米白） |
| `ink` | `#3D3D3D` | 主要文字（炭灰） |
| `ink-light` | `#7A7A7A` | 次要文字、提示 |
| `vermilion` | `#C0392B` | 主色調（朱紅） |
| `vermilion-light` | `#E8503F` | Hover 狀態 |
| `paper` | `#FFFFFF` | 卡片底色 |
| `border` | `#E2D9CE` | 分隔線、邊框（米色） |

Tailwind 設定（`tailwind.config.js` 或 CSS variables）需新增上述 token。

---

## 頁面佈局

```
<body bg=washi>
  <header>          ← 固定頂端，米白底 + 下邊框
    Logo 區
  </header>

  <main>            ← 置中單欄，max-width: 720px，padding: 2rem
    <FileUploader /> ← 展開態 or 收起態
    <ProgressBar />  ← uploading 時顯示
    <ErrorMsg />     ← error 時顯示
    <PagedPreview /> ← success 時顯示
  </main>
</body>
```

字型：`Noto Sans JP`（現有），標題字重 700，內文 400。

---

## 元件設計

### Header

- 左側 3px 朱紅豎線（書脊裝飾）
- 「振り仮名」字重 700，朱紅色（`vermilion`）
- 副標「PDF ふりがなツール」炭灰小字（`ink-light`）

### FileUploader

**展開態（未上傳 / 錯誤）：**

- 背景 `paper`，邊框 2px dashed `vermilion`，圓角
- 中央：雲朵 SVG 圖示（朱紅）+ 「拖放 PDF 至此」+ 「或 點擊選擇檔案」
- Hover / Dragging：背景 `#FFF5F5`，邊框改為實線

**收起態（上傳中 / 成功）：**

- 高度縮為 48px，背景 `#FFF5F5`
- 左側 📄 圖示 + 檔名（ink 色）
- 右側「重新選擇」朱紅文字按鈕
- 展開 → 收起有 `transition-all duration-300` 動畫
- Props：新增 `collapsed: boolean` 與 `fileName?: string`

**錯誤時：** 重新展開，在框內顯示紅色錯誤訊息。

### ProgressBar

- 進度條顏色改為朱紅（`vermilion`）
- 文字改為日文：「振り仮名を処理中...」
- 背景色改為 `border`（米色）

### PagedPreview（新增元件）

> ⚠️ 實作此元件 UI 前，必須呼叫 `frontend-design:frontend-design` skill。

**導覽列（sticky top-0）：**

- 背景 `paper`，下方 `border` 色分隔線
- 按鈕：朱紅實心圓角（`vermilion`），白字；disabled 時 `opacity-40`
- 頁碼輸入框：`border` 色框，置中，`w-14`；按 Enter 跳頁，超出範圍自動修正

**內容區：**

- 白底卡片（`paper`），`border` 色邊框，`rounded-lg`
- ruby/rt 標注樣式：`0.6em`，`ink-light` 色
- 分頁間隔線：`border` 色

---

## 狀態機

```
idle → uploading → success
         ↓
       error → idle（重試）
```

| 狀態 | FileUploader | ProgressBar | PagedPreview |
|------|-------------|-------------|--------------|
| `idle` | 展開 | 隱藏 | 隱藏 |
| `uploading` | 收起 + disabled | 顯示 | 隱藏 |
| `success` | 收起 + 可點 | 隱藏 | 顯示 |
| `error` | 展開 + 錯誤提示 | 隱藏 | 隱藏 |

---

## 影響範圍

| 檔案 | 變更類型 | 說明 |
|------|---------|------|
| `frontend/src/App.tsx` | 修改 | Tailwind 佈局、引入 PagedPreview、移除 App.css import |
| `frontend/src/App.css` | 刪除 | 全面改 Tailwind |
| `frontend/src/components/FileUploader.tsx` | 修改 | 新增 collapsed 態、全 Tailwind |
| `frontend/src/components/ProgressBar.tsx` | 修改 | 朱紅色、日文提示 |
| `frontend/src/components/PagedPreview.tsx` | 新增 | 分頁邏輯 + 導覽 UI |
| `frontend/src/components/PagedPreview.test.tsx` | 新增 | 分頁功能測試 |
| `frontend/src/components/HtmlPreview.tsx` | **不動** | 純展示元件 |
| `frontend/src/index.css` | 微調 | 補 `@keyframes indeterminate` |
| `tailwind.config.js` / CSS variables | 新增/修改 | 加入色彩 token |

---

## 開發規範

- 所有樣式一律使用 **Tailwind CSS**，不使用 inline style 或額外 CSS 檔案
- 實作 UI 元件前必須呼叫 `frontend-design:frontend-design` skill
- 測試框架：Vitest + @testing-library/react
