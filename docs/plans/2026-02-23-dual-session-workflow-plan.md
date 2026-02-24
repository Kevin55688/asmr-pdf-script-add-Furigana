# 雙 Session 工作流程 Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** 讓前端/後端 Session 能同時並行工作，透過各自目錄的 CLAUDE.md 識別角色，計畫檔命名統一為 -frontend.md / -backend.md。

**Architecture:** 在 `backend/` 與 `frontend/` 目錄各放一個 CLAUDE.md（已建立）；將現有所有 `-plan.md` 重新命名為 `-frontend.md`；更新 `.claude/CLAUDE.md` 的計畫索引表格式與開發流程說明。

**Tech Stack:** 純文件異動，無程式碼變更。

---

### Task 1：Commit 設計文件與兩個新 CLAUDE.md

**Files:**
- Already created: `docs/plans/2026-02-23-dual-session-workflow-design.md`
- Already created: `backend/CLAUDE.md`
- Already created: `frontend/CLAUDE.md`

**Step 1: 確認三個新檔案狀態**

```bash
git status
```
預期看到三個 untracked 檔案。

**Step 2: 加入暫存區並 commit**

```bash
git add docs/plans/2026-02-23-dual-session-workflow-design.md \
        backend/CLAUDE.md \
        frontend/CLAUDE.md
git commit -m "[Docs] 新增雙 Session 工作流程設計與前後端 CLAUDE.md"
```

---

### Task 2：重新命名現有 -plan.md → -frontend.md

**Files（全部在 docs/plans/）:**

| 舊名 | 新名 |
|------|------|
| `2026-02-21-ui-redesign-plan.md` | `2026-02-21-ui-redesign-frontend.md` |
| `2026-02-21-txt-support-plan.md` | `2026-02-21-txt-support-frontend.md` |
| `2026-02-21-toggle-and-translation-plan.md` | `2026-02-21-toggle-and-translation-frontend.md` |
| `2026-02-22-api-error-toast-plan.md` | `2026-02-22-api-error-toast-frontend.md` |
| `2026-02-22-sidebar-library-plan.md` | `2026-02-22-sidebar-library-frontend.md` |
| `2026-02-22-bugfix-tag-translation-plan.md` | `2026-02-22-bugfix-tag-translation-frontend.md` |
| `2026-02-22-folder-context-menu-plan.md` | `2026-02-22-folder-context-menu-frontend.md` |

**Step 1: 執行 git mv 批次重新命名**

```bash
cd docs/plans
git mv 2026-02-21-ui-redesign-plan.md 2026-02-21-ui-redesign-frontend.md
git mv 2026-02-21-txt-support-plan.md 2026-02-21-txt-support-frontend.md
git mv 2026-02-21-toggle-and-translation-plan.md 2026-02-21-toggle-and-translation-frontend.md
git mv 2026-02-22-api-error-toast-plan.md 2026-02-22-api-error-toast-frontend.md
git mv 2026-02-22-sidebar-library-plan.md 2026-02-22-sidebar-library-frontend.md
git mv 2026-02-22-bugfix-tag-translation-plan.md 2026-02-22-bugfix-tag-translation-frontend.md
git mv 2026-02-22-folder-context-menu-plan.md 2026-02-22-folder-context-menu-frontend.md
```

**Step 2: 確認重新命名正確**

```bash
git status
```
預期看到 7 個 `renamed` 紀錄。

**Step 3: Commit**

```bash
git commit -m "[Chore] 重新命名計畫檔 -plan.md → -frontend.md"
```

---

### Task 3：更新 .claude/CLAUDE.md

**Files:**
- Modify: `.claude/CLAUDE.md`

**Step 1: 修改「功能開發計畫」區塊的表格**

找到此段：

```markdown
## 功能開發計畫（開發前必讀）

開發以下功能時，**必須先讀取對應的設計文件**：

| 功能 | 設計文件 | 實作計畫 |
|------|---------|---------|
| PDF 振り仮名標注工具 | `docs/plans/2026-02-13-furigana-tool-design.md` | `docs/plans/2026-02-13-furigana-tool-plan.md` |

**開發流程**：

1. 讀取設計文件，了解組件規格
2. 讀取實作計畫，按照 Task 順序逐步執行（TDD 流程）
3. 完成後更新設計文件中的狀態（⏳ → ✅）
```

改為：

```markdown
## 功能開發計畫（開發前必讀）

開發以下功能時，**必須先讀取對應的設計文件**：

| 功能 | 設計文件 | 後端計畫 | 前端計畫 |
|------|---------|---------|---------|
| PDF 振り仮名標注工具 | `docs/plans/2026-02-13-furigana-tool-design.md` | — | `docs/plans/2026-02-13-furigana-tool-frontend.md` |
| 資料夾右鍵選單 | `docs/plans/2026-02-22-folder-context-menu-design.md` | — | `docs/plans/2026-02-22-folder-context-menu-frontend.md` |

**開發流程**：

1. 讀取設計文件，了解組件規格與 API 合約
2. **後端 session** 讀取後端計畫、**前端 session** 讀取前端計畫，按 Task 順序逐步執行（TDD 流程）
3. 完成後更新設計文件中的狀態（⏳ → ✅）
```

**Step 2: Commit**

```bash
git add .claude/CLAUDE.md
git commit -m "[Chore] 更新 CLAUDE.md 計畫表格式為前後端分離三欄"
```

---

### Task 4：更新 SUMMARY.md 並最終 Commit

**Files:**
- Modify: `.claude/SUMMARY.md`

**Step 1: 更新 SUMMARY.md**

將狀態改為：

```markdown
## 目前狀態

🚧 資料夾右鍵選單開發中 — 前端計畫：`docs/plans/2026-02-22-folder-context-menu-frontend.md`
```

在適當位置加入已完成項目：

```
- [2026-02-23] 雙 Session 工作流程設立：新增 backend/CLAUDE.md、frontend/CLAUDE.md，計畫檔改為 -frontend.md / -backend.md 命名規則
```

**Step 2: Commit**

```bash
git add .claude/SUMMARY.md
git commit -m "[Chore] 更新 SUMMARY.md：雙 Session 工作流程完成"
```
