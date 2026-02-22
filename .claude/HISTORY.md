## [2026-02-22 19:14] @Claude

### 處理項目

- Sidebar 文件庫 Task 8：FolderItem 加入「+ 新增文件」按鈕

### 實作方式

- TDD 流程：先在 Sidebar.test.tsx 新增失敗測試，確認 RED 後實作
- `FolderItem.tsx`：新增 `onAddDocument: (folderId, name) => void` prop，在展開清單後加入「+ 新增文件」按鈕，點擊後呼叫 `window.prompt` 取得文件名稱
- `Sidebar.tsx`：補上 `onCreateDocument` 解構，並在 FolderItem 傳入 `onAddDocument={(folderId, name) => onCreateDocument(name, folderId)}`

### 變更檔案

- `frontend/src/components/FolderItem.tsx` - 新增 onAddDocument prop 與按鈕
- `frontend/src/components/Sidebar.tsx` - 解構 onCreateDocument，傳遞 onAddDocument
- `frontend/src/components/Sidebar.test.tsx` - 新增「+ 新增文件按鈕觸發 onCreateDocument」測試
- `.claude/SUMMARY.md` - Task 8 完成，狀態更新為全部完成

---

## [2026-02-22 13:40] @Claude

### 處理項目

- PagedPreview 翻譯錯誤改用 Toast（含重試按鈕）

### 實作方式

- 新增 2 個測試：翻譯失敗時顯示 Toast、Toast 重試按鈕再呼叫 API
- 修改 Toast.tsx：createContext 改用 no-op 預設值，移除 useToast throw（方便無 Provider 環境的測試）
- 修改 PagedPreview.tsx：新增 useToast import、移除 translationError state、catch 區塊改用 showToast（含 action: 重試）、移除 inline 錯誤 div
- 測試設計：點 toggle 開啟翻譯後再點翻譯按鈕，觸發 API 失敗，Toast 顯示錯誤訊息與重試按鈕

### 變更檔案

- `frontend/src/components/PagedPreview.tsx` - 移除 translationError state，catch 區塊改用 showToast
- `frontend/src/components/PagedPreview.test.tsx` - 新增 2 個 Toast 測試
- `frontend/src/components/Toast.tsx` - createContext 改用 no-op 預設值

---
# 變更紀錄

## [2026-02-22 08:01] @Claude

### 處理項目

- 翻譯功能 Task 4：HtmlPreview ruby toggle + 翻譯顯示（TDD）

### 實作方式

- 完整替換 `HtmlPreview.test.tsx`：新增 5 個測試（`showRuby` toggle、翻譯文字顯示、isTranslating skeleton、未傳 translations 不顯示），共 9 tests
- 完整重寫 `HtmlPreview.tsx`：新增 `showRuby`、`translations`、`isTranslating` props；以 `DOMParser` 解析 `<p>` 段落，逐段顯示翻譯列或 skeleton
- `index.css` 末尾加入 `.hide-ruby rt { display: none; }`
- TDD 流程：測試先失敗（3 個）→ 實作後 9/9 通過 → 全部前端 27 tests passed

### 變更檔案

- `frontend/src/components/HtmlPreview.tsx` - 重寫，支援 showRuby toggle 與段落翻譯顯示
- `frontend/src/components/HtmlPreview.test.tsx` - 更新為 9 個測試
- `frontend/src/index.css` - 新增 .hide-ruby rt 隱藏規則

---

## [2026-02-21 16:00] @Claude

### 處理項目

- 翻譯功能 Task 2：後端 translate router（TDD）

### 實作方式

- TDD 流程：先新增 3 個測試（確認失敗 → 404）→ 建立 router → 修改 main.py → 全部通過
- `TranslateRequest` / `TranslateResponse` Pydantic model 定義在 router 內
- ValueError（不支援的 provider、未設定 API key）轉為 HTTP 400
- 其他例外轉為 HTTP 502
- 50 tests passed

### 變更檔案

- `backend/tests/test_api.py` - 新增 3 個 /api/translate 測試
- `backend/app/routers/translate.py` - 新增（POST /translate endpoint）
- `backend/app/main.py` - 新增 translate router 注冊

---

## [2026-02-21 15:30] @Claude

### 處理項目

- 翻譯功能 Task 1：後端 translator service（TDD）

### 實作方式

- 遵循 TDD 流程：先建立測試 → 確認 Red → 建立實作 → 確認 Green
- 安裝 `anthropic` 套件（v0.83.0）與 `pytest-asyncio`（v1.3.0）
- 建立 `pytest.ini` 設定 `asyncio_mode = auto`（原專案無此設定）
- `translator.py` 實作三個供應商：DeepL（httpx POST）、Google（httpx POST）、Claude（Anthropic SDK）
- 所有 API Key 未設定時拋出 `ValueError`，`texts=[]` 提早回傳空列表
- 8 tests passed，既有 39 tests 全部維持通過

### 變更檔案

- `backend/requirements.txt` - 新增 `pytest-asyncio>=0.23.0`、`anthropic>=0.40.0`
- `backend/pytest.ini` - 新增（設定 asyncio_mode=auto）
- `backend/app/services/translator.py` - 新增（translator service）
- `backend/tests/test_translator.py` - 新增（8 個測試）
- `.claude/SUMMARY.md` - 更新專案狀態與待完成項目
- `.claude/HISTORY.md` - 新增本次變更紀錄

---

## [2026-02-21 24:30] @Claude

### 處理項目

- TXT 支援功能：需求探討、設計、實作計畫（新功能規劃）

### 實作方式

- 使用 brainstorming skill 逐步釐清需求：分頁策略（整個檔案視為 1 頁）、編碼（UTF-8）、API 方案（單一端點依副檔名分派）
- 選定方案 A（單一 `/api/convert` 端點），改動最小、前後端介面穩定
- 設計文件涵蓋：架構、資料流、前後端改動點、測試策略
- 撰寫 4 個 Task 的 TDD 實作計畫（txt_extractor → convert.py → api.ts → FileUploader）
- 實作將在獨立 session 以 executing-plans skill 執行

### 變更檔案

- `docs/plans/2026-02-21-txt-support-design.md` - 新增 TXT 支援設計文件
- `docs/plans/2026-02-21-txt-support-plan.md` - 新增 TXT 支援實作計畫（4 Tasks，TDD）
- `.claude/SUMMARY.md` - 更新專案狀態（待實作）
- `.claude/HISTORY.md` - 新增本次變更紀錄

---

## [2026-02-21 23:55] @Claude

### 處理項目

- Task 12：端對端整合測試

### 實作方式

- 執行全部 24 個後端測試，全數通過（24 passed in 0.70s）
- 啟動後端伺服器（uvicorn，port 8000），驗證 `/api/health` 回傳 `{"status":"ok"}`
- 啟動前端開發伺服器（Vite，port 5173），驗證頁面回傳正確 HTML
- 更新 SUMMARY.md 與 HISTORY.md，標記 Task 12/12 完成

### 變更檔案

- `.claude/SUMMARY.md` - 更新專案狀態為全部完成（Task 12/12）
- `.claude/HISTORY.md` - 新增本次變更紀錄

---

## [2026-02-13 22:00] @Claude

### 處理項目

- PDF 振り仮名標注工具 — 需求探討、設計與實作計畫

### 實作方式

- 透過 brainstorming 流程逐步釐清需求：輸入（一般日文 PDF）、輸出（HTML 預覽）、執行方式（Web 應用）、技術偏好（Python + FastAPI）、準確度（MeCab 高準確度）
- 比較三種技術方案後選定方案 A（PyMuPDF + MeCab）
- 分段呈現系統架構、核心處理邏輯、API 設計與前端介面，逐段取得使用者核可
- 根據使用者回饋調整：移除下載功能、前端改用 React
- 撰寫設計文件與 12 個 Task 的 TDD 實作計畫
- 更新 CLAUDE.md 加入設計文件對照表與專案技術棧描述

### 變更檔案

- `docs/plans/2026-02-13-furigana-tool-design.md` - 新增設計文件（已核可）
- `docs/plans/2026-02-13-furigana-tool-plan.md` - 新增實作計畫（12 Tasks, TDD）
- `.claude/CLAUDE.md` - 更新功能開發計畫對照表與專案特定規範
- `.claude/SUMMARY.md` - 更新專案狀態摘要
- `.claude/HISTORY.md` - 新增本次變更紀錄

---
