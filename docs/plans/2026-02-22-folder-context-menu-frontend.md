# 資料夾右鍵選單 Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** 在左側 Sidebar 資料夾列加入右鍵選單，提供「重新命名」與「刪除」功能。

**Architecture:** 新建 `FolderContextMenu` 元件（仿 `DocumentContextMenu` 模式），`FolderItem` 新增 `onContextMenu` prop，`Sidebar` 新增 `folderContextMenu` state 並補接 `onRenameFolder`/`onDeleteFolder`。

**Tech Stack:** React + TypeScript / Vitest + Testing Library

---

### Task 1：新建 FolderContextMenu 元件

**Files:**
- Create: `frontend/src/components/FolderContextMenu.tsx`
- Create: `frontend/src/components/FolderContextMenu.test.tsx`

**Step 1: 寫失敗測試**

```tsx
// frontend/src/components/FolderContextMenu.test.tsx
import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import { FolderContextMenu } from "./FolderContextMenu";
import type { Folder } from "../services/libraryApi";

const folder: Folder = { id: "f-001", name: "ASMR", order: 0 };

describe("FolderContextMenu", () => {
  it("renders rename and delete options", () => {
    render(
      <FolderContextMenu
        folder={folder}
        x={0}
        y={0}
        onClose={vi.fn()}
        onRename={vi.fn()}
        onDelete={vi.fn()}
      />,
    );
    expect(screen.getByText("重新命名")).toBeInTheDocument();
    expect(screen.getByText("刪除")).toBeInTheDocument();
  });

  it("calls onRename with new name when rename clicked", () => {
    const onRename = vi.fn();
    vi.stubGlobal("prompt", vi.fn().mockReturnValueOnce("新資料夾"));
    render(
      <FolderContextMenu
        folder={folder}
        x={0}
        y={0}
        onClose={vi.fn()}
        onRename={onRename}
        onDelete={vi.fn()}
      />,
    );
    fireEvent.click(screen.getByText("重新命名"));
    expect(onRename).toHaveBeenCalledWith("f-001", "新資料夾");
  });

  it("calls onDelete when delete clicked", () => {
    const onDelete = vi.fn();
    vi.stubGlobal("confirm", vi.fn().mockReturnValueOnce(true));
    render(
      <FolderContextMenu
        folder={folder}
        x={0}
        y={0}
        onClose={vi.fn()}
        onRename={vi.fn()}
        onDelete={onDelete}
      />,
    );
    fireEvent.click(screen.getByText("刪除"));
    expect(onDelete).toHaveBeenCalledWith("f-001");
  });

  it("does not call onDelete when confirm is cancelled", () => {
    const onDelete = vi.fn();
    vi.stubGlobal("confirm", vi.fn().mockReturnValueOnce(false));
    render(
      <FolderContextMenu
        folder={folder}
        x={0}
        y={0}
        onClose={vi.fn()}
        onRename={vi.fn()}
        onDelete={onDelete}
      />,
    );
    fireEvent.click(screen.getByText("刪除"));
    expect(onDelete).not.toHaveBeenCalled();
  });

  it("calls onClose when backdrop clicked", () => {
    const onClose = vi.fn();
    render(
      <FolderContextMenu
        folder={folder}
        x={0}
        y={0}
        onClose={onClose}
        onRename={vi.fn()}
        onDelete={vi.fn()}
      />,
    );
    // backdrop is the fixed inset-0 div
    fireEvent.click(document.querySelector(".fixed.inset-0")!);
    expect(onClose).toHaveBeenCalled();
  });
});
```

**Step 2: 執行測試，確認失敗**

```bash
cd frontend && npx vitest run src/components/FolderContextMenu.test.tsx
```
預期：FAIL（FolderContextMenu 不存在）

**Step 3: 實作 FolderContextMenu**

```tsx
// frontend/src/components/FolderContextMenu.tsx
import type { Folder } from "../services/libraryApi";

interface Props {
  folder: Folder;
  x: number;
  y: number;
  onClose: () => void;
  onRename: (id: string, name: string) => void;
  onDelete: (id: string) => void;
}

export function FolderContextMenu({ folder, x, y, onClose, onRename, onDelete }: Props) {
  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 z-40" onClick={onClose} />
      {/* Menu */}
      <div
        className="fixed z-50 min-w-[140px] rounded border border-washi-border bg-paper shadow-lg"
        style={{ top: y, left: x }}
      >
        <button
          className="w-full px-4 py-2 text-left text-sm text-ink hover:bg-washi-border/40"
          onClick={() => {
            const name = window.prompt("新名稱", folder.name);
            if (name?.trim()) onRename(folder.id, name.trim());
            onClose();
          }}
        >
          重新命名
        </button>
        <hr className="border-washi-border" />
        <button
          className="w-full px-4 py-2 text-left text-sm text-red-500 hover:bg-red-50"
          onClick={() => {
            if (window.confirm(`確定刪除資料夾「${folder.name}」及其所有文件？`)) {
              onDelete(folder.id);
            }
            onClose();
          }}
        >
          刪除
        </button>
      </div>
    </>
  );
}
```

**Step 4: 執行測試，確認通過**

```bash
cd frontend && npx vitest run src/components/FolderContextMenu.test.tsx
```
預期：5 tests PASS

**Step 5: Commit**

```bash
git add frontend/src/components/FolderContextMenu.tsx frontend/src/components/FolderContextMenu.test.tsx
git commit -m "[Feature] 新增 FolderContextMenu 元件（重新命名/刪除）"
```

---

### Task 2：FolderItem 加入 onContextMenu prop

**Files:**
- Modify: `frontend/src/components/FolderItem.tsx`
- Create: `frontend/src/components/FolderItem.test.tsx`

**Step 1: 寫失敗測試**

```tsx
// frontend/src/components/FolderItem.test.tsx
import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import { FolderItem } from "./FolderItem";
import type { Folder } from "../services/libraryApi";

const folder: Folder = { id: "f-001", name: "ASMR", order: 0 };
const noop = vi.fn();

describe("FolderItem", () => {
  it("calls onContextMenu when right-clicked on folder row", () => {
    const onContextMenu = vi.fn();
    render(
      <FolderItem
        folder={folder}
        documents={[]}
        tags={[]}
        selectedDocId={null}
        onSelectDocument={noop}
        onDocumentContextMenu={noop}
        onDocumentDragStart={noop}
        onDrop={noop}
        onAddDocument={noop}
        onUpdateFolderTags={noop}
        onContextMenu={onContextMenu}
      />,
    );
    fireEvent.contextMenu(screen.getByText("ASMR"));
    expect(onContextMenu).toHaveBeenCalled();
  });
});
```

**Step 2: 執行測試，確認失敗**

```bash
cd frontend && npx vitest run src/components/FolderItem.test.tsx
```
預期：FAIL（onContextMenu prop 不存在）

**Step 3: 修改 FolderItem.tsx**

在 `Props` interface 新增：
```tsx
onContextMenu?: (e: React.MouseEvent, folder: Folder) => void;
```

在解構加入：
```tsx
onContextMenu,
```

在資料夾列 div（有 `onClick={() => setExpanded...}` 那一行的 div）加上：
```tsx
onContextMenu={(e) => {
  e.preventDefault();
  onContextMenu?.(e, folder);
}}
```

**Step 4: 執行測試，確認通過**

```bash
cd frontend && npx vitest run src/components/FolderItem.test.tsx
```
預期：1 test PASS

**Step 5: 執行全部前端測試確認無回歸**

```bash
cd frontend && npx vitest run
```
預期：全部 PASS

**Step 6: Commit**

```bash
git add frontend/src/components/FolderItem.tsx frontend/src/components/FolderItem.test.tsx
git commit -m "[Feature] FolderItem 加入 onContextMenu prop（右鍵觸發）"
```

---

### Task 3：Sidebar 整合 FolderContextMenu

**Files:**
- Modify: `frontend/src/components/Sidebar.tsx`
- Modify: `frontend/src/components/Sidebar.test.tsx`

**Step 1: 寫失敗測試（在 Sidebar.test.tsx 末尾新增）**

先看看 Sidebar.test.tsx 的 noop/library fixture 設定，在最後新增：

```tsx
it("shows FolderContextMenu on folder right-click", async () => {
  const lib: Library = {
    folders: [{ id: "f-001", name: "ASMR", order: 0 }],
    documents: [],
    tags: [],
  };
  render(
    <Sidebar
      library={lib}
      selectedDocId={null}
      activeTags={[]}
      onSelectDocument={noop}
      onCreateFolder={noop}
      onRenameFolder={noop}
      onDeleteFolder={noop}
      onCreateDocument={noop}
      onRenameDocument={noop}
      onDeleteDocument={noop}
      onMoveDocument={noop}
      onUploadDocument={noop}
      onCreateTag={noop}
      onDeleteTag={noop}
      onTagFilterChange={noop}
      onUpdateFolderTags={noop}
    />,
  );
  fireEvent.contextMenu(screen.getByText("ASMR"));
  expect(await screen.findByText("重新命名")).toBeInTheDocument();
  expect(screen.getByText("刪除")).toBeInTheDocument();
});

it("calls onRenameFolder via context menu", async () => {
  const onRenameFolder = vi.fn();
  vi.stubGlobal("prompt", vi.fn().mockReturnValueOnce("新名稱"));
  const lib: Library = {
    folders: [{ id: "f-001", name: "ASMR", order: 0 }],
    documents: [],
    tags: [],
  };
  render(
    <Sidebar
      library={lib}
      selectedDocId={null}
      activeTags={[]}
      onSelectDocument={noop}
      onCreateFolder={noop}
      onRenameFolder={onRenameFolder}
      onDeleteFolder={noop}
      onCreateDocument={noop}
      onRenameDocument={noop}
      onDeleteDocument={noop}
      onMoveDocument={noop}
      onUploadDocument={noop}
      onCreateTag={noop}
      onDeleteTag={noop}
      onTagFilterChange={noop}
      onUpdateFolderTags={noop}
    />,
  );
  fireEvent.contextMenu(screen.getByText("ASMR"));
  fireEvent.click(await screen.findByText("重新命名"));
  expect(onRenameFolder).toHaveBeenCalledWith("f-001", "新名稱");
});
```

**Step 2: 執行測試，確認失敗**

```bash
cd frontend && npx vitest run src/components/Sidebar.test.tsx
```
預期：新增的 2 tests FAIL

**Step 3: 修改 Sidebar.tsx**

1. **import FolderContextMenu：**
```tsx
import { FolderContextMenu } from "./FolderContextMenu";
```

2. **解構補上缺漏的 props（第 26 行解構）：**
```tsx
export function Sidebar({
  library,
  selectedDocId,
  activeTags,
  onSelectDocument,
  onCreateFolder,
  onRenameFolder,      // ← 補上
  onDeleteFolder,      // ← 補上
  onCreateDocument,
  onRenameDocument,
  onDeleteDocument,
  onMoveDocument,
  onUploadDocument,
  onCreateTag,
  onDeleteTag,
  onTagFilterChange,
  onUpdateFolderTags,
}: SidebarProps) {
```

3. **新增 folderContextMenu state（第 42 行附近）：**
```tsx
const [folderContextMenu, setFolderContextMenu] = useState<{
  folder: Folder;
  x: number;
  y: number;
} | null>(null);
```
並在 import 補上 `Folder` 型別：
```tsx
import type { Document, Folder, Library } from "../services/libraryApi";
```

4. **FolderItem 加入 onContextMenu prop（第 116 行的 `<FolderItem>` 元素）：**
```tsx
onContextMenu={(e, f) =>
  setFolderContextMenu({ folder: f, x: e.clientX, y: e.clientY })
}
```

5. **在 `{contextMenu && ...}` 區塊後新增 FolderContextMenu 渲染（第 191 行後）：**
```tsx
{folderContextMenu && (
  <FolderContextMenu
    folder={folderContextMenu.folder}
    x={folderContextMenu.x}
    y={folderContextMenu.y}
    onClose={() => setFolderContextMenu(null)}
    onRename={(id, name) => {
      onRenameFolder(id, name);
      setFolderContextMenu(null);
    }}
    onDelete={(id) => {
      onDeleteFolder(id);
      setFolderContextMenu(null);
    }}
  />
)}
```

**Step 4: 執行測試，確認通過**

```bash
cd frontend && npx vitest run src/components/Sidebar.test.tsx
```
預期：全部 PASS（含新增的 2 tests）

**Step 5: 執行全部前端測試確認無回歸**

```bash
cd frontend && npx vitest run
```
預期：全部 PASS

**Step 6: 更新 SUMMARY.md，然後 Commit**

更新 `.claude/SUMMARY.md`：
- 在「已完成項目」最上方新增：`- [2026-02-22] 資料夾右鍵選單完成：FolderContextMenu + FolderItem onContextMenu + Sidebar 整合（重新命名/刪除）`
- 更新「最後更新」日期與狀態描述

```bash
git add frontend/src/components/Sidebar.tsx \
        frontend/src/components/Sidebar.test.tsx \
        .claude/SUMMARY.md
git commit -m "[Feature] Sidebar 整合 FolderContextMenu（右鍵重新命名/刪除資料夾）"
```
