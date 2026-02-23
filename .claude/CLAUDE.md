# Claude Code 專案指引

## 啟動流程（每次新 Session 必讀）

1. **閱讀專案狀態**：讀取 `.claude/SUMMARY.md` 了解當前進行中功能與待辦 Tasks
2. **確認工作項目**：根據 SUMMARY 中的待辦清單，詢問使用者要處理哪個項目

## 程式碼規範（生成程式碼前必讀）

**重要**：在撰寫或修改任何程式碼之前，必須遵循 `.claude/skills.md` 中定義的開發規範，包括：

詳細規範請參閱：[`.claude/skills.md`](.claude/skills.md)

## 功能開發計畫（開發前必讀）

開發以下功能時，**必須先讀取對應的設計文件**：

| 功能 | 設計文件 | 實作計畫 |
|------|---------|---------|
| PDF 振り仮名標注工具 | `docs/plans/2026-02-13-furigana-tool-design.md` | `docs/plans/2026-02-13-furigana-tool-plan.md` |

**開發流程**：

1. 讀取設計文件，了解組件規格
2. 讀取實作計畫，按照 Task 順序逐步執行（TDD 流程）
3. 完成後更新設計文件中的狀態（⏳ → ✅）

## 任務完成檢查（每次任務結束必做）

⚠️ **在回報「完成」之前，必須確認：**

1. [ ] 已更新 `.claude/SUMMARY.md`（**每完成一個 Task 都必須立即更新**，不等用戶提醒）
2. [ ] 確認程式碼是否有符合設計規範

**SUMMARY.md 更新內容（每個 Task 完成後）：**
- 將該 Task 從 `[ ]` 改為 `[x]`（待辦清單縮減）
- 若該功能所有 Tasks 完成，清空待辦清單並更新「當前進行中功能」
- 更新「最後更新」日期

> ℹ️ 已完成 Task 的詳細記錄請查 `git log`；設計決策請查對應 plan 文件。

**Commit 順序規定：**

> ⚠️ **必須先更新 SUMMARY.md，再執行 git commit。**
> 正確順序：測試通過 → 更新 SUMMARY.md → `git add`（含 SUMMARY.md）→ `git commit`

**無論任務大小（包含 bug 修復、緊急修復），都必須執行此檢查。**

## 多人協作規範

## 專案特定規範

### 技術棧

- **後端**：Python 3.11+ / FastAPI / PyMuPDF / fugashi (MeCab) / unidic-lite / Jinja2
- **前端**：React + TypeScript / Vite
- **測試**：pytest / Vitest

### 專案結構

```
asmr_pdf_script_add_Furigana/
├── backend/              # Python FastAPI 後端
│   ├── app/
│   │   ├── main.py       # FastAPI 入口 + CORS
│   │   ├── routers/      # API 路由
│   │   └── services/     # 業務邏輯（PDF 提取、振り仮名、HTML 產生）
│   ├── tests/
│   └── requirements.txt
├── frontend/             # React + Vite 前端
│   ├── src/
│   │   ├── components/   # React 元件
│   │   └── services/     # API 呼叫
│   └── package.json
├── docs/plans/           # 設計與實作文件
└── .claude/              # Claude Code 設定與紀錄
```

### 程式碼風格

- Python：遵循 PEP 8
- TypeScript：React 函式元件 + Hooks

### 前端設計規範

**設計任何前端 UI 之前，必須遵循以下流程：**

1. 使用 `frontend-design:frontend-design` skill 進行 UI 設計（產生高品質、有特色的介面）
2. 所有樣式一律使用 **Tailwind CSS**，不使用 inline style 或額外 CSS 檔案
3. 技術棧：React + TypeScript + Tailwind CSS

> ⚠️ **強制規定**：前端 UI 設計前必須呼叫 `frontend-design` skill，不可跳過。
