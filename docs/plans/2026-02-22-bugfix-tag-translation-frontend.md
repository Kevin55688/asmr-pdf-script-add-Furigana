# Bug Fix 實作計畫：Tag 資料夾化 + 翻譯快取修復

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** 修復兩個已知問題：(1) 翻譯快取未正確讀取持久化資料；(2) Tag 移至資料夾層級，資料夾可設定 Tag，Sidebar 依資料夾 Tag 篩選

**Architecture:**
- Issue 2 僅修改 `PagedPreview.tsx`：加入 `cachedTranslations` 解構，在 `performTranslation()` 中補查持久化快取
- Issue 1 從後端（Folder 加 tagIds）到前端（型別、API、Sidebar、FolderItem）全面修改，分 4 個 Task

**Tech Stack:** React + TypeScript / Vitest / Python FastAPI / pytest

---

## Task 1：翻譯快取修復（Issue 2）

**根本原因：** `PagedPreview` props 介面有 `cachedTranslations`，但 function 解構時遺漏，導致元件內永遠是 `undefined`，持久化快取從未被讀取。

**Files:**
- Modify: `frontend/src/components/PagedPreview.tsx`
- Test: `frontend/src/components/PagedPreview.test.tsx`

---

**Step 1：寫失敗測試**

在 `PagedPreview.test.tsx` 新增測試（加在最後一個 describe 內）：

```typescript
it("cachedTranslations 有資料時點翻譯不呼叫 API", async () => {
  const mockTranslate = vi.fn().mockResolvedValue(["翻訳API呼ばれた"]);
  vi.mock("../services/api", () => ({
    translateTexts: mockTranslate,
  }));

  const singlePageHtml = `<section class="page"><p>テスト</p></section>`;
  const cachedTranslations = {
    deepl: { "zh-TW": { "p-0": "測試（快取）" } },
  };

  render(
    <PagedPreview
      html={singlePageHtml}
      pageCount={1}
      cachedTranslations={cachedTranslations}
      onTranslationSaved={vi.fn()}
    />
  );

  // 開啟翻譯
  fireEvent.click(screen.getByLabelText("翻譯"));
  // 點翻譯按鈕
  fireEvent.click(screen.getByRole("button", { name: "翻譯" }));

  // 不應呼叫 API
  expect(mockTranslate).not.toHaveBeenCalled();
  // 應顯示快取內容
  expect(await screen.findByText("測試（快取）")).toBeInTheDocument();

  vi.restoreAllMocks();
});
```

**Step 2：執行測試確認失敗**

```bash
cd frontend && npx vitest run src/components/PagedPreview.test.tsx
```
預期：該測試 FAIL（快取未使用，API 被呼叫）

**Step 3：修改 `PagedPreview.tsx`**

**3a.** 在 function 解構加入 `cachedTranslations`（第 31-37 行）：

```typescript
export function PagedPreview({
  html,
  pageCount,
  initialPage = 1,
  onPageChange,
  cachedTranslations,
  onTranslationSaved,
}: PagedPreviewProps) {
```

**3b.** 在 `performTranslation()` 的 cache hit 判斷後（第 79 行之後）加入持久化快取檢查：

```typescript
const performTranslation = useCallback(async () => {
  if (currentPageTexts.length === 0) return;
  if (translationCache[cacheKey]) return; // React state cache hit

  // 檢查持久化快取
  const persistedLang = cachedTranslations?.[provider]?.[targetLang];
  if (persistedLang) {
    const cached = currentPageTexts.map((_, i) => persistedLang[`p-${i}`] ?? "");
    if (cached.some((t) => t)) {
      setTranslationCache((prev) => ({ ...prev, [cacheKey]: cached }));
      return;
    }
  }

  setIsTranslating(true);
  // ... 後面程式碼不變
```

**Step 4：執行測試確認通過**

```bash
cd frontend && npx vitest run src/components/PagedPreview.test.tsx
```
預期：全部 PASS

**Step 5：執行全部前端測試**

```bash
cd frontend && npx vitest run
```
預期：全部 PASS（≥ 75 tests）

**Step 6：Commit**

```bash
git add frontend/src/components/PagedPreview.tsx frontend/src/components/PagedPreview.test.tsx
git commit -m "[Hotfix] 修復 PagedPreview 未讀取持久化翻譯快取"
```

---

## Task 2：後端 Folder 加入 tagIds

**Files:**
- Modify: `backend/app/services/library_service.py`
- Modify: `backend/app/routers/library.py`
- Test: `backend/tests/test_library_service.py`
- Test: `backend/tests/test_library_router.py`（若有此檔案）

---

**Step 1：寫失敗測試**

在 `backend/tests/test_library_service.py` 新增：

```python
def test_create_folder_has_tag_ids():
    from app.services.library_service import create_folder
    folder = create_folder("測試資料夾")
    assert "tagIds" in folder
    assert folder["tagIds"] == []


def test_update_folder_tags():
    from app.services.library_service import create_folder, update_folder_tags
    folder = create_folder("資料夾A")
    updated = update_folder_tags(folder["id"], ["t-001", "t-002"])
    assert updated["tagIds"] == ["t-001", "t-002"]


def test_delete_tag_removes_from_folders():
    from app.services.library_service import (
        create_folder, create_tag, update_folder_tags, delete_tag, load_library
    )
    tag = create_tag("待刪除", "#ff0000")
    folder = create_folder("資料夾B")
    update_folder_tags(folder["id"], [tag["id"]])
    delete_tag(tag["id"])
    lib = load_library()
    for f in lib["folders"]:
        if f["id"] == folder["id"]:
            assert tag["id"] not in f.get("tagIds", [])
```

**Step 2：執行測試確認失敗**

```bash
cd backend && python -m pytest tests/test_library_service.py -k "tag_ids or update_folder_tags or delete_tag_removes_from_folders" -v
```
預期：3 個測試 FAIL

**Step 3：修改 `library_service.py`**

**3a.** `create_folder()` 加入 `tagIds`：

```python
def create_folder(name: str) -> dict:
    library = load_library()
    folder = {
        "id": f"f-{uuid.uuid4().hex[:8]}",
        "name": name,
        "order": len(library["folders"]),
        "tagIds": [],
    }
    library["folders"].append(folder)
    save_library(library)
    return folder
```

**3b.** 新增 `update_folder_tags()` 函式（加在 `delete_folder` 之後）：

```python
def update_folder_tags(folder_id: str, tag_ids: list) -> Optional[dict]:
    library = load_library()
    for folder in library["folders"]:
        if folder["id"] == folder_id:
            folder["tagIds"] = tag_ids
            save_library(library)
            return folder
    return None
```

**3c.** `delete_tag()` 改為從 folders 移除 tagId（而非 documents）：

```python
def delete_tag(tag_id: str) -> bool:
    library = load_library()
    if not any(t["id"] == tag_id for t in library["tags"]):
        return False
    library["tags"] = [t for t in library["tags"] if t["id"] != tag_id]
    for folder in library["folders"]:
        folder["tagIds"] = [tid for tid in folder.get("tagIds", []) if tid != tag_id]
    save_library(library)
    return True
```

**3d.** 修改 `routers/library.py`：

在 `FolderUpdate` 中加入 `tagIds`，並新增 `/folders/{folder_id}/tags` endpoint：

```python
class FolderUpdate(BaseModel):
    name: str


class FolderTagsUpdate(BaseModel):
    tagIds: List[str]
```

在 `delete_folder` endpoint 後加入：

```python
@router.patch("/folders/{folder_id}/tags")
def update_folder_tags(folder_id: str, body: FolderTagsUpdate):
    result = lib_svc.update_folder_tags(folder_id, body.tagIds)
    if result is None:
        raise HTTPException(status_code=404, detail="Folder not found")
    return result
```

**Step 4：執行測試確認通過**

```bash
cd backend && python -m pytest tests/test_library_service.py -v
```
預期：全部 PASS

**Step 5：執行全部後端測試**

```bash
cd backend && python -m pytest
```
預期：全部 PASS

**Step 6：Commit**

```bash
git add backend/app/services/library_service.py backend/app/routers/library.py backend/tests/test_library_service.py
git commit -m "[Feature] Folder 加入 tagIds，新增 update_folder_tags API"
```

---

## Task 3：前端型別 + API 更新

**Files:**
- Modify: `frontend/src/services/libraryApi.ts`
- Test: `frontend/src/services/libraryApi.test.ts`

---

**Step 1：寫失敗測試**

在 `libraryApi.test.ts` 新增：

```typescript
it("Folder 型別包含 tagIds 欄位", () => {
  const folder: Folder = {
    id: "f-001",
    name: "測試",
    order: 0,
    tagIds: ["t-001"],
  };
  expect(folder.tagIds).toEqual(["t-001"]);
});

it("updateFolderTags 傳送正確請求", async () => {
  fetchMock.mockResponseOnce(
    JSON.stringify({ id: "f-001", name: "A", order: 0, tagIds: ["t-001"] })
  );
  const result = await updateFolderTags("f-001", ["t-001"]);
  expect(result.tagIds).toEqual(["t-001"]);
  expect(fetchMock).toHaveBeenCalledWith(
    expect.stringContaining("/folders/f-001/tags"),
    expect.objectContaining({ method: "PATCH" })
  );
});
```

**Step 2：執行測試確認失敗**

```bash
cd frontend && npx vitest run src/services/libraryApi.test.ts
```
預期：2 個新測試 FAIL

**Step 3：修改 `libraryApi.ts`**

**3a.** `Folder` 型別加入 `tagIds`：

```typescript
export interface Folder {
  id: string;
  name: string;
  order: number;
  tagIds: string[];
}
```

**3b.** `Document` 型別移除 `tagIds`（刪除 `tagIds: string[];` 這行）

**3c.** 新增 `updateFolderTags` API 函式（加在 `deleteFolder` 後）：

```typescript
export const updateFolderTags = (id: string, tagIds: string[]): Promise<Folder> =>
  request(`/folders/${id}/tags`, {
    method: "PATCH",
    body: JSON.stringify({ tagIds }),
  });
```

**Step 4：執行測試確認通過**

```bash
cd frontend && npx vitest run src/services/libraryApi.test.ts
```
預期：全部 PASS

**Step 5：Commit**

```bash
git add frontend/src/services/libraryApi.ts frontend/src/services/libraryApi.test.ts
git commit -m "[Feature] Folder 型別加入 tagIds，新增 updateFolderTags API"
```

---

## Task 4：Sidebar Tag 篩選改為資料夾層級

**Files:**
- Modify: `frontend/src/components/Sidebar.tsx`
- Modify: `frontend/src/components/FolderItem.tsx`（加入 tags + onUpdateFolderTags props）
- Test: `frontend/src/components/Sidebar.test.tsx`

---

**Step 1：更新測試的 mockLibrary**

在 `Sidebar.test.tsx` 將 `mockLibrary` 的 `folders` 加入 `tagIds`，並把 `documents` 的 `tagIds` 移除：

```typescript
const mockLibrary: Library = {
  folders: [{ id: "f-001", name: "ASMR", order: 0, tagIds: [] }],
  tags: [{ id: "t-001", name: "完成", color: "#4ade80" }],
  documents: [
    {
      id: "doc-001",
      name: "腳本 Vol.1",
      folderId: "f-001",
      htmlFile: "doc-001.html",
      lastPage: 0,
      notes: "",
      translations: {},
      createdAt: "",
      uploadedAt: "2026-02-22",
    },
    {
      id: "doc-002",
      name: "草稿",
      folderId: "f-001",
      htmlFile: null,
      lastPage: 0,
      notes: "",
      translations: {},
      createdAt: "",
      uploadedAt: null,
    },
  ],
};
```

**Step 2：修改現有的 tag 篩選測試**

將 `"tag 篩選隱藏不符合的文件"` 測試改為測試資料夾篩選：

```typescript
it("tag 篩選隱藏不符合的資料夾", () => {
  const libraryWithTag: Library = {
    ...mockLibrary,
    folders: [
      { id: "f-001", name: "ASMR", order: 0, tagIds: ["t-001"] },
      { id: "f-002", name: "其他", order: 1, tagIds: [] },
    ],
    documents: [
      { ...mockLibrary.documents[0], folderId: "f-001" },
      { ...mockLibrary.documents[1], folderId: "f-002" },
    ],
  };
  render(
    <Sidebar
      library={libraryWithTag}
      selectedDocId={null}
      activeTags={["t-001"]}
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
    />
  );
  expect(screen.getByText("ASMR")).toBeInTheDocument();
  expect(screen.queryByText("其他")).not.toBeInTheDocument();
});
```

**Step 3：執行測試確認失敗**

```bash
cd frontend && npx vitest run src/components/Sidebar.test.tsx
```
預期：tag 篩選測試 FAIL

**Step 4：修改 `Sidebar.tsx`**

**4a.** 在 `SidebarProps` 加入：

```typescript
onUpdateFolderTags: (id: string, tagIds: string[]) => void;
```

**4b.** 在 function 解構加入 `onUpdateFolderTags`

**4c.** 將 `filteredDocs` 改為 `filteredFolders`：

```typescript
const filteredFolders = () => {
  if (activeTags.length === 0) return library.folders;
  return library.folders.filter((f) =>
    activeTags.every((tid) => f.tagIds.includes(tid))
  );
};
```

**4d.** 將 Folder List 渲染改為使用 `filteredFolders()`：

```typescript
{filteredFolders().map((folder) => (
  <FolderItem
    key={folder.id}
    folder={folder}
    documents={library.documents.filter((d) => d.folderId === folder.id)}
    tags={library.tags}
    selectedDocId={selectedDocId}
    onSelectDocument={(doc) => {
      if (doc.htmlFile) onSelectDocument(doc);
      else onUploadDocument(doc);
    }}
    onDocumentContextMenu={(e, doc) => setContextMenu({ doc, x: e.clientX, y: e.clientY })}
    onDocumentDragStart={(e, doc) => {
      setDragDocId(doc.id);
      e.dataTransfer.effectAllowed = "move";
    }}
    onDrop={(_, folderId) => {
      if (dragDocId) onMoveDocument(dragDocId, folderId);
      setDragDocId(null);
    }}
    onAddDocument={(folderId, name) => onCreateDocument(name, folderId)}
    onUpdateFolderTags={onUpdateFolderTags}
  />
))}
```

**Step 5：修改 `FolderItem.tsx`**

在 `Props` 加入：

```typescript
tags: import("../services/libraryApi").Tag[];
onUpdateFolderTags: (folderId: string, tagIds: string[]) => void;
```

在 function 解構加入 `tags, onUpdateFolderTags`，並在資料夾標頭加入 Tag 色點與設定按鈕（詳見 Task 5）

**Step 6：修改 `App.tsx`**

在 `Sidebar` 呼叫處加入：

```typescript
onUpdateFolderTags={async (id, tagIds) => {
  const updated = await libApi.updateFolderTags(id, tagIds);
  setLibrary((prev) => ({
    ...prev,
    folders: prev.folders.map((f) => (f.id === id ? updated : f)),
  }));
}}
```

**Step 7：執行測試確認通過**

```bash
cd frontend && npx vitest run src/components/Sidebar.test.tsx
```
預期：全部 PASS

**Step 8：Commit**

```bash
git add frontend/src/components/Sidebar.tsx frontend/src/components/Sidebar.test.tsx frontend/src/App.tsx
git commit -m "[Feature] Sidebar Tag 篩選改為資料夾層級"
```

---

## Task 5：FolderItem 加入 Tag 設定 UI

**Files:**
- Modify: `frontend/src/components/FolderItem.tsx`
- Test: `frontend/src/components/Sidebar.test.tsx`

---

**Step 1：寫失敗測試**

在 `Sidebar.test.tsx` 新增：

```typescript
it("點擊資料夾 Tag 按鈕後可選取 Tag", () => {
  const onUpdateFolderTags = vi.fn();
  render(
    <Sidebar
      library={{ ...mockLibrary, folders: [{ id: "f-001", name: "ASMR", order: 0, tagIds: [] }] }}
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
      onUpdateFolderTags={onUpdateFolderTags}
    />
  );
  fireEvent.click(screen.getByLabelText("設定資料夾 Tag"));
  fireEvent.click(screen.getByLabelText("Tag: 完成"));
  expect(onUpdateFolderTags).toHaveBeenCalledWith("f-001", ["t-001"]);
});
```

**Step 2：執行測試確認失敗**

```bash
cd frontend && npx vitest run src/components/Sidebar.test.tsx
```
預期：新測試 FAIL

**Step 3：修改 `FolderItem.tsx`**

完整新版實作：

```typescript
import { useState } from "react";
import type { Document, Folder, Tag } from "../services/libraryApi";
import { DocumentItem } from "./DocumentItem";

interface Props {
  folder: Folder;
  documents: Document[];
  tags: Tag[];
  selectedDocId: string | null;
  onSelectDocument: (doc: Document) => void;
  onDocumentContextMenu: (e: React.MouseEvent, doc: Document) => void;
  onDocumentDragStart: (e: React.DragEvent, doc: Document) => void;
  onDrop: (e: React.DragEvent, folderId: string) => void;
  onAddDocument: (folderId: string, name: string) => void;
  onUpdateFolderTags: (folderId: string, tagIds: string[]) => void;
}

export function FolderItem({
  folder,
  documents,
  tags,
  selectedDocId,
  onSelectDocument,
  onDocumentContextMenu,
  onDocumentDragStart,
  onDrop,
  onAddDocument,
  onUpdateFolderTags,
}: Props) {
  const [expanded, setExpanded] = useState(true);
  const [isDragOver, setIsDragOver] = useState(false);
  const [showTagPicker, setShowTagPicker] = useState(false);

  const toggleFolderTag = (tagId: string) => {
    const current = folder.tagIds ?? [];
    const next = current.includes(tagId)
      ? current.filter((id) => id !== tagId)
      : [...current, tagId];
    onUpdateFolderTags(folder.id, next);
  };

  return (
    <div className="relative">
      <div
        className={[
          "flex cursor-pointer items-center gap-2 rounded px-2 py-1.5 text-sm font-medium transition-colors",
          isDragOver ? "bg-vermilion/10 ring-1 ring-vermilion" : "hover:bg-washi-border/40",
        ].join(" ")}
        onClick={() => setExpanded((v) => !v)}
        onDragOver={(e) => { e.preventDefault(); setIsDragOver(true); }}
        onDragLeave={() => setIsDragOver(false)}
        onDrop={(e) => { setIsDragOver(false); onDrop(e, folder.id); }}
      >
        <span className="text-xs text-ink-light">{expanded ? "▼" : "▶"}</span>
        <span className="truncate text-ink">{folder.name}</span>

        {/* Tag 色點 */}
        {(folder.tagIds ?? []).length > 0 && (
          <span className="flex gap-0.5">
            {(folder.tagIds ?? []).map((tid) => {
              const tag = tags.find((t) => t.id === tid);
              return tag ? (
                <span
                  key={tid}
                  className="h-2 w-2 rounded-full"
                  style={{ backgroundColor: tag.color }}
                />
              ) : null;
            })}
          </span>
        )}

        {/* Tag 設定按鈕 */}
        <button
          aria-label="設定資料夾 Tag"
          onClick={(e) => { e.stopPropagation(); setShowTagPicker((v) => !v); }}
          className="ml-auto rounded p-0.5 text-xs text-ink-light opacity-0 transition-opacity group-hover:opacity-100 hover:text-vermilion"
        >
          🏷
        </button>

        <span className="text-xs text-ink-light">{documents.length}</span>
      </div>

      {/* Tag Picker 下拉 */}
      {showTagPicker && tags.length > 0 && (
        <div
          className="absolute right-0 top-8 z-20 min-w-[120px] rounded border border-washi-border bg-paper shadow-md"
          onMouseLeave={() => setShowTagPicker(false)}
        >
          {tags.map((tag) => {
            const checked = (folder.tagIds ?? []).includes(tag.id);
            return (
              <label
                key={tag.id}
                aria-label={`Tag: ${tag.name}`}
                className="flex cursor-pointer items-center gap-2 px-3 py-1.5 text-xs text-ink hover:bg-washi-border/30"
              >
                <input
                  type="checkbox"
                  checked={checked}
                  onChange={() => toggleFolderTag(tag.id)}
                  className="accent-vermilion"
                />
                <span
                  className="h-2 w-2 rounded-full"
                  style={{ backgroundColor: tag.color }}
                />
                {tag.name}
              </label>
            );
          })}
        </div>
      )}

      {expanded && (
        <div className="ml-4">
          {documents.map((doc) => (
            <DocumentItem
              key={doc.id}
              doc={doc}
              isSelected={doc.id === selectedDocId}
              onClick={onSelectDocument}
              onContextMenu={onDocumentContextMenu}
              onDragStart={onDocumentDragStart}
            />
          ))}
          <button
            onClick={() => {
              const name = window.prompt("文件名稱");
              if (name?.trim()) onAddDocument(folder.id, name.trim());
            }}
            className="mt-1 w-full rounded px-3 py-1 text-left text-xs text-ink-light transition-colors hover:text-vermilion"
          >
            + 新增文件
          </button>
        </div>
      )}
    </div>
  );
}
```

**Step 4：執行測試確認通過**

```bash
cd frontend && npx vitest run src/components/Sidebar.test.tsx
```
預期：全部 PASS

**Step 5：執行全部前端測試**

```bash
cd frontend && npx vitest run
```
預期：全部 PASS

**Step 6：Commit**

```bash
git add frontend/src/components/FolderItem.tsx frontend/src/components/Sidebar.test.tsx
git commit -m "[Feature] FolderItem 加入 Tag 設定 UI（色點 + checkbox 選單）"
```

---

## 最終驗收

```bash
# 後端全部測試
cd backend && python -m pytest

# 前端全部測試
cd frontend && npx vitest run
```

**手動驗收清單：**
- [ ] 翻譯過的文件，重新開啟後點翻譯 → 直接顯示快取，不呼叫 API（看 Network tab）
- [ ] 切換同供應商 → 快取命中；切換不同供應商且有快取 → 直接顯示
- [ ] 資料夾標頭可點 🏷 按鈕展開 Tag 選單
- [ ] 勾選 Tag 後資料夾標頭顯示色點
- [ ] 選中 Tag A → 僅含 Tag A 的資料夾顯示；不含 Tag A 的資料夾隱藏
- [ ] 刪除 Tag → 資料夾的 tagIds 同步移除
