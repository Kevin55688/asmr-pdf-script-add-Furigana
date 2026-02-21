# 前端分頁功能設計文件

- **日期**：2026-02-21
- **作者**：@Claude
- **狀態**：✅ 設計核可

---

## 背景

目前 `HtmlPreview` 元件將後端回傳的完整 HTML 字串一次性渲染，當 PDF 頁數多時，使用者需要大量捲動。本次新增分頁功能，讓使用者每次只看一頁。

---

## 設計目標

- 每次只顯示一頁內容
- 提供上一頁 / 下一頁按鈕與頁碼輸入框
- 後端與 `HtmlPreview` 元件不動，最小化改動範圍

---

## 元件架構

```
App.tsx
└── PagedPreview          ← 新元件（分頁狀態 + 導覽 UI）
    └── HtmlPreview       ← 保持不動（純展示）
```

### PagedPreview

**Props：**

```ts
interface PagedPreviewProps {
  html: string;       // 後端回傳的完整 HTML 字串
  pageCount: number;  // 後端回傳的總頁數
}
```

**內部邏輯：**

1. 用 `useMemo` + `DOMParser` 解析 `html`，抓取所有 `<section class="page">` 元素，轉成 `string[]`
2. 維護 `currentPage: number`（0-indexed）
3. 傳 `pages[currentPage]` 給 `HtmlPreview` 渲染
4. 邊界保護：`currentPage` 限制在 `[0, pageCount - 1]`

### HtmlPreview（不變）

接收單頁 HTML 字串，純展示，無狀態。

---

## 導覽 UI

```
[← 上一頁]  [  3  ] / 20  [下一頁 →]
─────────────────────────────────────
  （HtmlPreview 顯示目前頁內容）
```

- **上一頁按鈕**：第 1 頁時 disabled
- **下一頁按鈕**：最後一頁時 disabled
- **頁碼輸入框**：`<input type="number">`，按 Enter 跳頁；輸入超出範圍自動修正至邊界值（1 ≤ page ≤ total）

---

## App.tsx 異動

僅替換一行：

```tsx
// 改前
<HtmlPreview html={html} pageCount={pageCount} />

// 改後
<PagedPreview html={html} pageCount={pageCount} />
```

---

## 測試計畫

新增 `frontend/src/components/PagedPreview.test.tsx`：

| # | 測試案例 | 預期結果 |
|---|---------|---------|
| 1 | 解析含 N 個 `<section class="page">` 的 HTML | 得到 N 個頁面區塊 |
| 2 | 點「下一頁」 | `currentPage` + 1 |
| 3 | 點「上一頁」 | `currentPage` - 1 |
| 4 | 在第 1 頁時「上一頁」按鈕 | disabled |
| 5 | 在最後一頁時「下一頁」按鈕 | disabled |
| 6 | 輸入頁碼 5 並按 Enter | 跳至第 5 頁 |
| 7 | 輸入超出範圍（0 或 > total） | 自動修正至邊界 |

`HtmlPreview.test.tsx` 不需修改。

---

## 影響範圍

| 檔案 | 變更類型 |
|------|---------|
| `frontend/src/components/PagedPreview.tsx` | 新增 |
| `frontend/src/components/PagedPreview.test.tsx` | 新增 |
| `frontend/src/App.tsx` | 修改（1 行） |
| `frontend/src/components/HtmlPreview.tsx` | **不動** |
| `frontend/src/components/HtmlPreview.test.tsx` | **不動** |
| 後端所有檔案 | **不動** |
