# 雙 Session 工作流程設計

**日期：** 2026-02-23
**目標：** 支援前端 / 後端兩個 Claude Code Session 同時並行工作

---

## 背景

目前所有 Session 共用根目錄 CLAUDE.md，無法區分前端/後端角色。希望能：
1. 同時開 2 個 Session，各自專注前端或後端
2. 計畫文件明確拆分前後端，各 Session 只讀自己需要的部分

## 設計方案

### Session 角色識別

透過 Claude Code 自動載入所在目錄的 `CLAUDE.md` 機制：

- 開啟 `frontend/` 目錄的 Session → 自動載入 `frontend/CLAUDE.md` → 知道自己是前端角色
- 開啟 `backend/` 目錄的 Session → 自動載入 `backend/CLAUDE.md` → 知道自己是後端角色

### 文件結構

```
asmr-pdf-script-add-Furigana/
├── CLAUDE.md                   # 根目錄：全局規範、計畫索引表（三欄）
├── backend/
│   └── CLAUDE.md               # 後端脈絡：技術棧、指令、API 端點、計畫連結
├── frontend/
│   └── CLAUDE.md               # 前端脈絡：技術棧、指令、結構、樣式規範、計畫連結
└── docs/plans/
    ├── YYYY-MM-DD-<feature>-design.md    # 共用設計文件（API 合約）
    ├── YYYY-MM-DD-<feature>-backend.md  # 後端實作計畫
    └── YYYY-MM-DD-<feature>-frontend.md # 前端實作計畫
```

### 計畫檔命名規則

| 類型 | 命名 | 使用者 |
|------|------|--------|
| 設計文件 | `YYYY-MM-DD-<feature>-design.md` | 雙方閱讀，定義 API 合約 |
| 後端計畫 | `YYYY-MM-DD-<feature>-backend.md` | 後端 Session 執行 |
| 前端計畫 | `YYYY-MM-DD-<feature>-frontend.md` | 前端 Session 執行 |

若功能純前端（無 API 異動），則只需 design + frontend 兩個檔案。
若功能純後端，則只需 design + backend 兩個檔案。

### `.claude/CLAUDE.md` 需調整項目

1. **計畫表格式**：`實作計畫` 欄拆成 `後端計畫` + `前端計畫` 兩欄：

```markdown
| 功能 | 設計文件 | 後端計畫 | 前端計畫 |
|------|---------|---------|---------|
| 功能名稱 | `...design.md` | `...backend.md` 或 — | `...frontend.md` 或 — |
```

2. **開發流程**：說明後端 session 讀後端計畫、前端 session 讀前端計畫

3. **現有計畫路徑更新**：所有 `-plan.md` 路徑改為 `-frontend.md`

### 現有計畫檔處理

所有現有 `-plan.md` 重新命名為 `-frontend.md`（因為均為純前端計畫）。

## 各 CLAUDE.md 職責

### `frontend/CLAUDE.md` 內容
- 技術棧（React 18 + TypeScript / Vite / Tailwind CSS）
- 常用指令（npm install / dev / test）
- 專案結構（src/components、src/services）
- 樣式規範
- API 合約（後端提供的端點，供前端對接）
- 當前前端計畫連結

### `backend/CLAUDE.md` 內容
- 技術棧（Python 3.11+ / FastAPI / PyMuPDF / fugashi）
- 常用指令（pip install / uvicorn / pytest）
- 專案結構（app/routers、app/services、tests）
- API 端點清單
- 當前後端計畫連結
