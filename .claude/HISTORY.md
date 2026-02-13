# 變更紀錄

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
