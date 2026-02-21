# 專案狀態摘要

> 此檔案為每次 Session **必讀**的主要狀態文件
> HISTORY.md 僅在需要查詢細節時才載入

## 專案資訊

- **專案名稱**：PDF 振り仮名標注工具 (asmr_pdf_script_add_Furigana)
- **技術棧**：Python (FastAPI + PyMuPDF + fugashi/MeCab) / React + TypeScript (Vite)
- **最後更新**：2026-02-21（Task 12 完成，全部實作完畢）

## 專案狀態：✅ 全部實作完成（Task 12/12 完成）

## 開發規範符合度

### ✅ 已完成項目

- [2026-02-13] 需求探討與腦力激盪（brainstorming）
- [2026-02-13] 技術方案選型（方案 A：PyMuPDF + MeCab）
- [2026-02-13] 系統架構設計核可
- [2026-02-13] 設計文件撰寫 → `docs/plans/2026-02-13-furigana-tool-design.md`
- [2026-02-13] 實作計畫撰寫 → `docs/plans/2026-02-13-furigana-tool-plan.md`（共 12 個 Task）
- [2026-02-21] Task 1：後端專案初始化（目錄結構 + 依賴安裝）
- [2026-02-21] Task 2：片假名轉平假名工具函式 (TDD) — `contains_kanji`, `kata_to_hira`（7 tests passed）
- [2026-02-21] Task 3：振り仮名標注核心邏輯 (TDD) — `add_furigana`（11 tests passed）
- [2026-02-21] Task 4：PDF 文字提取服務 (TDD) — `extract_text_by_pages`（16 tests passed，使用 script.pdf 為真實測試資料）
- [2026-02-21] Task 5：HTML 產生器 (TDD) — `generate_html`（4 tests passed，全部 20 tests passed）
- [2026-02-21] Task 6：FastAPI 應用與 /api/convert 端點 (TDD) — `main.py` + `routers/convert.py`（4 tests passed，全部 24 tests passed）
- [2026-02-21] Task 7：前端專案初始化 — Vite + React + TypeScript 腳手架建立，編譯驗證通過
- [2026-02-21] Task 8：前端 API 服務層 — `frontend/src/services/api.ts`，`convertPdf` 函式，編譯驗證通過
- [2026-02-21] Task 9：FileUploader 拖放上傳元件 — `frontend/src/components/FileUploader.tsx`，支援拖放與點擊選檔，編譯驗證通過
- [2026-02-21] Task 10：ProgressBar + HtmlPreview 元件 — Tailwind CSS 樣式，7 tests passed，編譯驗證通過
- [2026-02-21] Task 11：App 主元件整合 — App.tsx 整合四個元件，App.css 基本樣式，編譯驗證通過
- [2026-02-21] Task 12：端對端整合測試 — 全部 24 tests passed，後端 :8000 與前端 :5173 伺服器啟動驗證通過

### ✅ 所有 Task 完成（實作計畫 12/12）

1. [x] Task 1：後端專案初始化（目錄結構 + 依賴安裝）
2. [x] Task 2：片假名轉平假名工具函式 (TDD)
3. [x] Task 3：振り仮名標注核心邏輯 (TDD)
4. [x] Task 4：PDF 文字提取服務 (TDD)
5. [x] Task 5：HTML 產生器 (TDD)
6. [x] Task 6：FastAPI 應用與 /api/convert 端點 (TDD)
7. [x] Task 7：前端專案初始化 (Vite + React + TS)
8. [x] Task 8：前端 API 服務層
9. [x] Task 9：FileUploader 拖放上傳元件
10. [x] Task 10：ProgressBar + HtmlPreview 元件
11. [x] Task 11：App 主元件整合 + 樣式
12. [x] Task 12：端對端整合測試

## 專案結構

```
asmr_pdf_script_add_Furigana/
├── backend/              # Python FastAPI 後端（完成）
│   ├── app/
│   │   ├── main.py       # FastAPI 入口 + CORS
│   │   ├── routers/      # API 路由
│   │   └── services/     # PDF 提取、振り仮名、HTML 產生
│   ├── tests/
│   └── requirements.txt
├── frontend/             # React + Vite 前端（完成）
│   ├── src/
│   │   ├── components/   # FileUploader, ProgressBar, HtmlPreview
│   │   └── services/     # API 呼叫
│   └── package.json
├── docs/plans/           # 設計與實作文件
│   ├── 2026-02-13-furigana-tool-design.md  # 設計文件（已核可）
│   └── 2026-02-13-furigana-tool-plan.md    # 實作計畫（12 Tasks）
└── .claude/
```

## 重要決策紀錄

| 日期 | 決策 | 理由 |
|------|------|------|
| 2026-02-13 | PDF 解析使用 PyMuPDF | 速度最快、CJK 支援佳 |
| 2026-02-13 | 日文分詞使用 fugashi + unidic-lite (MeCab) | 業界標準、讀音準確度最高 |
| 2026-02-13 | 輸出為 HTML 搭配 ruby 標籤 | 瀏覽器原生支援振り仮名顯示 |
| 2026-02-13 | 前後端分離（FastAPI + React） | 職責清楚、開發彈性高 |
| 2026-02-13 | 只做瀏覽器預覽，不提供下載 | 符合使用者需求，簡化功能 |

## 協作者紀錄

- @Claude — 2026-02-13 — 需求探討、設計與實作計畫
- @Claude — 2026-02-21 — Task 1–3 實作（後端初始化、furigana 工具函式、振り仮名核心邏輯）
- @Claude — 2026-02-21 — Task 4–5 實作（PDF 文字提取、HTML 產生器）
- @Claude — 2026-02-21 — Task 6 實作（FastAPI main.py + /api/convert 端點，24 tests passed）
- @Claude — 2026-02-21 — Task 7 實作（前端 Vite + React + TS 初始化，清理預設檔案）
- @Claude — 2026-02-21 — Task 8 實作（前端 API 服務層，api.ts，編譯驗證通過）
- @Claude — 2026-02-21 — Task 9 實作（FileUploader 拖放上傳元件，編譯驗證通過）
- @Claude — 2026-02-21 — Task 10 實作（ProgressBar + HtmlPreview，Tailwind CSS，7 tests passed）
- @Claude — 2026-02-21 — Task 11 實作（App.tsx 主元件整合，App.css 基本樣式，編譯驗證通過）
- @Claude — 2026-02-21 — Task 12 實作（端對端整合測試，24 tests passed，後端 :8000 + 前端 :5173 啟動驗證通過）
