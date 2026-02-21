# 變更紀錄

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
