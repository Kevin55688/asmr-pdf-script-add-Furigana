# 專案狀態摘要

> 此檔案為每次 Session **必讀**的主要狀態文件
> HISTORY.md 僅在需要查詢細節時才載入

## 專案資訊

- **專案名稱**：PDF 振り仮名標注工具 (asmr_pdf_script_add_Furigana)
- **技術棧**：Python (FastAPI + PyMuPDF + fugashi/MeCab) / React + TypeScript (Vite)
- **最後更新**：2026-02-22（Claude 翻譯改用 Haiku 4.5）

## 專案狀態：✅ API 錯誤 Toast 通知完成

## 待完成項目

（無）

## 已完成項目

- [2026-02-22] Claude 翻譯改用 Haiku 4.5（`claude-haiku-4-5-20251001`），降低 API 費用
- [2026-02-22] 修復 .env 載入路徑：`load_dotenv()` 改用 `Path(__file__)` 絕對路徑，確保不論從哪個目錄啟動伺服器都能正確讀取 `backend/.env`；新增 `python-dotenv` 至 requirements.txt
- [2026-02-22] API 錯誤 Toast 通知完成：新增 Toast.tsx（ToastProvider + useToast hook），App.tsx convert 錯誤改用 Toast，PagedPreview.tsx 翻譯錯誤改用 Toast（含重試按鈕），40 tests passed
- [2026-02-22] PagedPreview 翻譯錯誤改用 Toast：移除 translationError state，catch 區塊改用 showToast（含重試按鈕）；Toast.tsx 改用 no-op 預設 context，40 tests passed
- [2026-02-22] 翻譯改為手動觸發：移除 toggle 觸發 API 的行為，新增「翻譯」確認按鈕；切換供應商或語言後需重新點按；換頁仍自動翻譯，15 tests passed
- [2026-02-22] 修復 `hide-ruby` CSS：改為 `visibility: hidden; font-size: 0; line-height: 0`，隱藏振り仮名時版面不跳動，33 tests passed
- [2026-02-22] 翻譯功能 Task 5 完成：`PagedPreview` 新增控制列（振り仮名 toggle、翻譯 toggle、語言選單、供應商選單）、翻譯 cache（React state）、useEffect 觸發翻譯，前端共 33 tests passed
- [2026-02-22] 翻譯功能 Task 4 完成：`HtmlPreview` 支援 `showRuby` toggle 與段落翻譯顯示（`translations`、`isTranslating` skeleton），`index.css` 加入 `.hide-ruby rt`，9 tests passed，前端共 27 tests passed
- [2026-02-21] 翻譯功能 Task 3 完成：前端 `translateTexts` API 函式，27 tests passed
- [2026-02-21] 翻譯功能 Task 2 完成：新增 `routers/translate.py` + 修改 `main.py`，`POST /api/translate` endpoint，50 tests passed
- [2026-02-21] 翻譯功能 Task 1 完成：新增 `translator.py`（支援 DeepL / Google / Claude，8 tests passed）

- [2026-02-13] 需求探討、技術方案選型、系統架構設計
- [2026-02-21] 後端全部實作（PDF 提取、振り仮名標注、HTML 產生、FastAPI API）— 24 tests passed
- [2026-02-21] 前端全部實作（FileUploader、ProgressBar、HtmlPreview、App 整合）— 7 tests passed
- [2026-02-21] 端對端整合測試通過（後端 :8000 + 前端 :5173）
- [2026-02-21] 前端分頁功能腦力激盪與設計完成（方案 C：PagedPreview 包裝層）
- [2026-02-21] UI 重設計 Task 1-3 完成（色彩 Token、ProgressBar、FileUploader 重設計，11 tests passed）
- [2026-02-21] UI 重設計 Task 4 完成（Header + App.tsx 重構，AppState 狀態機，11 tests passed）
- [2026-02-21] UI 重設計 Task 5 完成（PagedPreview 新增，和風導覽列，20 tests passed）
- [2026-02-21] UI 重設計 Task 6 完成（App.tsx 換用 PagedPreview、刪除 App.css，20 tests + build 通過）
- [2026-02-21] 修復縦書き PDF 提取：自動偵測排版方向、按右欄→左欄讀序、合併同欄相鄰 block — 26 tests passed（29 碎片段落 → 11 有意義段落）
- [2026-02-21] TXT 支援設計與計畫完成（brainstorming → 設計文件 → 4-Task TDD 實作計畫）
- [2026-02-21] TXT 支援 Task 1 完成：新增 `txt_extractor.py`（6 tests passed）
- [2026-02-21] TXT 支援 Task 2 完成：`convert.py` 支援 `.txt` 分派，33 tests passed
- [2026-02-21] TXT 支援 Task 3 完成：`api.ts` `convertPdf` 改名 `convertFile`，前端 20 tests passed
- [2026-02-21] TXT 支援 Task 4 完成：`FileUploader` 支援 `.txt` 拖放與選擇，前端 22 tests passed
- [2026-02-21] TXT 腳本排版保留：`generate_html_from_script_txt` 逐行處理，`---` 變 `<hr>`，日文加振り仮名，英文翻譯保留原文，39 tests passed
- [2026-02-21] 翻譯功能 Task 1 完成：新增 `translator.py`（支援 DeepL / Google / Claude，8 tests passed）

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
├── frontend/             # React + Vite 前端（完成，和風 UI + 分頁）
│   ├── src/
│   │   ├── components/   # FileUploader, ProgressBar, HtmlPreview, PagedPreview
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
| 2026-02-21 | pdf_extractor 新增縦書き偵測與欄位合併邏輯 | 原 get_text("blocks") 每個 box 獨立 → 加入橫/縦排自動偵測 |

## 協作者紀錄

- @Claude — 2026-02-13 — 需求探討、設計與實作計畫
- @Claude — 2026-02-21 — 後端 + 前端全部實作（Task 1–12，端對端驗證通過）
- @Claude — 2026-02-21 — 前端分頁功能腦力激盪、設計文件、實作計畫
- @Claude — 2026-02-21 — UI 重設計腦力激盪、設計文件、實作計畫（和風現代主題）
