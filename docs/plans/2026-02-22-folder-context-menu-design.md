# 資料夾右鍵選單設計文件

**日期**：2026-02-22
**狀態**：✅ 設計完成，待實作

## 需求

左側 Sidebar 資料夾列目前沒有刪除/重新命名的 UI 入口，需要補上。

## 設計決策

採用與文件相同的**右鍵選單**模式（方案 C），保持操作體驗一致性。

## 涉及元件

| 元件 | 變更說明 |
|------|----------|
| `FolderContextMenu.tsx`（新建） | 資料夾專用右鍵選單，提供「重新命名」與「刪除」選項 |
| `FolderItem.tsx` | 新增 `onContextMenu?: (e, folder) => void` prop，綁定在資料夾列 div |
| `Sidebar.tsx` | 補解構 `onRenameFolder`/`onDeleteFolder`；新增 `folderContextMenu` state；渲染 `FolderContextMenu` |

## 元件規格

### FolderContextMenu

```tsx
interface Props {
  folder: Folder;
  x: number;
  y: number;
  onClose: () => void;
  onRename: (id: string, name: string) => void;
  onDelete: (id: string) => void;
}
```

- 絕對定位浮動，`onMouseLeave` 關閉
- 「重新命名」→ `window.prompt` 輸入新名稱
- 「刪除」→ `window.confirm` 確認後刪除（資料夾 + 所有文件）

### FolderItem 新增 prop

```tsx
onContextMenu?: (e: React.MouseEvent, folder: Folder) => void;
```

資料夾列 div 加上 `onContextMenu` 事件綁定。

### Sidebar 變更

- 解構補上 `onRenameFolder`、`onDeleteFolder`
- 新增 state：`folderContextMenu: { folder, x, y } | null`
- 渲染 `FolderContextMenu`（與 `DocumentContextMenu` 並排）

## 測試計畫

- `FolderContextMenu.test.tsx`：顯示選單、點擊重新命名、點擊刪除、關閉行為
- `FolderItem.test.tsx`：右鍵觸發 `onContextMenu` callback
- `Sidebar.test.tsx`：整合右鍵開選單、rename/delete 傳遞正確
