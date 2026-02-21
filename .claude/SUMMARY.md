# 專案狀態摘要

> 此檔案為每次 Session **必讀**的主要狀態文件
> HISTORY.md 僅在需要查詢細節時才載入

## 專案資訊

- **專案名稱**：PDF 振り仮名標注工具 (asmr_pdf_script_add_Furigana)
- **技術棧**：Python (FastAPI + PyMuPDF + fugashi/MeCab) / React + TypeScript (Vite)
- **最後更新**：2026-02-21（UI 重設計全部完成）

## 專案狀態：✅ UI 重設計完成（待下一步規劃）

## 待完成項目

> 目前無待完成項目

## 已完成項目

- [2026-02-13] 需求探討、技術方案選型、系統架構設計
- [2026-02-21] 後端全部實作（PDF 提取、振り仮名標注、HTML 產生、FastAPI API）— 24 tests passed
- [2026-02-21] 前端全部實作（FileUploader、ProgressBar、HtmlPreview、App 整合）— 7 tests passed
- [2026-02-21] 端對端整合測試通過（後端 :8000 + 前端 :5173）
- [2026-02-21] 前端分頁功能腦力激盪與設計完成（方案 C：PagedPreview 包裝層）
- [2026-02-21] UI 重設計 Task 1-3 完成（色彩 Token、ProgressBar、FileUploader 重設計，11 tests passed）
- [2026-02-21] UI 重設計 Task 4 完成（Header + App.tsx 重構，AppState 狀態機，11 tests passed）
- [2026-02-21] UI 重設計 Task 5 完成（PagedPreview 新增，和風導覽列，20 tests passed）
- [2026-02-21] UI 重設計 Task 6 完成（App.tsx 換用 PagedPreview、刪除 App.css，20 tests + build 通過）

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
├── frontend/             # React + Vite 前端（基礎完成，分頁待實作）
│   ├── src/
│   │   ├── components/   # FileUploader, ProgressBar, HtmlPreview
│   │   └── services/     # API 呼叫
│   └── package.json
├── docs/plans/           # 進行中的設計與實作文件
│   ├── 2026-02-21-ui-redesign-design.md # 現行設計文件（和風現代主題）
│   └── 2026-02-21-ui-redesign-plan.md   # 現行實作計畫（6 Tasks）
└── .claude/
```

## 重要決策紀錄

| 日期 | 決策 | 理由 |
|------|------|------|
| 2026-02-13 | PDF 解析使用 PyMuPDF | 速度最快、CJK 支援佳 |
| 2026-02-13 | 日文分詞使用 fugashi + unidic-lite (MeCab) | 業界標準、讀音準確度最高 |
| 2026-02-13 | 輸出為 HTML 搭配 ruby 標籤 | 瀏覽器原生支援振り仮名顯示 |
| 2026-02-13 | 前後端分離（FastAPI + React） | 職責清楚、開發彈性高 |
| 2026-02-21 | 分頁採方案 C（PagedPreview 包裝層） | Container/Presentational 模式，擴展性最佳 |
| 2026-02-21 | UI 重設計採方案 A（和紙卡片式） | 目標用戶為日語學習者，和風現代最符合氛圍 |
| 2026-02-21 | 舊分頁計畫併入 UI 重設計計畫（Task 5） | 避免雙軌維護，統一在 ui-redesign-plan.md |

## 協作者紀錄

- @Claude — 2026-02-13 — 需求探討、設計與實作計畫
- @Claude — 2026-02-21 — 後端 + 前端全部實作（Task 1–12，端對端驗證通過）
- @Claude — 2026-02-21 — 前端分頁功能腦力激盪、設計文件、實作計畫
- @Claude — 2026-02-21 — UI 重設計腦力激盪、設計文件、實作計畫（和風現代主題）
