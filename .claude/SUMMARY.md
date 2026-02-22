# 專案狀態摘要

> 此檔案為每次 Session **必讀**的主要狀態文件
> HISTORY.md 僅在需要查詢細節時才載入

## 專案資訊

- **專案名稱**：PDF 振り仮名標注工具 (asmr_pdf_script_add_Furigana)
- **技術棧**：Python (FastAPI + PyMuPDF + fugashi/MeCab) / React + TypeScript (Vite)
- **最後更新**：2026-02-22（Bug Fix Task 1+2+3 完成：翻譯快取修復、後端 Folder tagIds、前端型別 API 更新，前端 78 tests / 後端 83 tests）

## 專案狀態：🔧 Bug Fix 進行中（Tag 資料夾化 + 翻譯快取修復，Task 3/5 完成）

> 設計文件：`docs/plans/2026-02-22-bugfix-tag-translation-design.md`
> 實作計畫：`docs/plans/2026-02-22-bugfix-tag-translation-plan.md`

## 待完成項目

### Bug Fix：Tag 資料夾化 + 翻譯快取修復（5 Tasks）

- [x] **Task 1**：翻譯快取修復（`PagedPreview.tsx` 解構加入 `cachedTranslations`，補查持久化快取）
- [x] **Task 2**：後端 Folder 加入 tagIds（`library_service.py` + `routers/library.py`，新增 `update_folder_tags` API）
- [x] **Task 3**：前端型別 + API 更新（`libraryApi.ts`：`Folder` 加 `tagIds`，新增 `updateFolderTags`）
- [ ] **Task 4**：Sidebar Tag 篩選改為資料夾層級（`Sidebar.tsx` `filteredFolders`、`FolderItem` 加 props、`App.tsx` 傳入 `onUpdateFolderTags`）
- [ ] **Task 5**：FolderItem 加入 Tag 設定 UI（🏷 按鈕 + checkbox 選單 + 色點顯示）

## 已完成項目

- [2026-02-22] 修復問題 3：`GET /api/library/documents/{id}/html` 的 `page_count` 計數字串由 `'<section class="page">'` 改為 `'<section class="page"'`，後端共 80 tests passed
- [2026-02-22] Sidebar 文件庫 Task 8 完成：FolderItem 加入「+ 新增文件」按鈕（onAddDocument prop）、Sidebar 傳遞 onCreateDocument，前端共 75 tests passed
- [2026-02-22] Sidebar 文件庫 Task 7 完成：App.tsx 重構整合 Sidebar / 文件庫狀態機（idle|loading|uploading|viewing）/ NotesPanel / 持久化，前端共 74 tests passed
- [2026-02-22] Sidebar 文件庫 Task 5 完成：新增 DocumentContextMenu（右鍵選單）+ TagManager（Tag 管理）元件，Sidebar 整合右鍵選單與 Tag 管理按鈕，前端共 71 tests passed
- [2026-02-22] Sidebar 文件庫 Task 4 + Task 6 完成（並行）：Sidebar/FolderItem/DocumentItem（6 tests）、NotesPanel（3 tests）、PagedPreview 持久化 props（2 tests），前端共 64 tests passed
- [2026-02-22] Sidebar 文件庫 Task 3 完成：新增 `libraryApi.ts`（型別定義 + 11 個 API 函式，13 tests passed，前端共 53 tests passed）
- [2026-02-22] Sidebar 文件庫 Task 2 完成：新增 `routers/library.py`（11 個 endpoints，13 tests passed，後端共 79 tests passed）、`main.py` 掛載 library router
- [2026-02-22] Sidebar 文件庫 Task 1 完成：新增 `library_service.py`（資料夾/tag/文件 CRUD + HTML 儲存，16 tests passed，後端共 66 tests passed）
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

## 已知問題

> 發現問題時記錄於此，修復後移至「已完成項目」

| # | 嚴重度 | 描述 | 發現日期 | 狀態 |
|---|--------|------|----------|------|
| 1 | 中 | 左側選單的資料夾無法設定所屬 Tag，導致無法透過 Tag 篩選整個資料夾 | 2026-02-22 | 🔴 待修復 |
| 2 | 中 | 已翻譯過的文本，重新勾選翻譯並選擇供應商後按下翻譯鈕，不會顯示快取內容而是重新呼叫翻譯 API | 2026-02-22 | 🔴 待修復 |

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
│   ├── 2026-02-21-ui-redesign-design.md        # UI 重設計文件
│   ├── 2026-02-21-ui-redesign-plan.md          # UI 重設計計畫（已完成）
│   ├── 2026-02-22-sidebar-library-design.md    # Sidebar 文件庫設計文件
│   └── 2026-02-22-sidebar-library-plan.md      # Sidebar 文件庫實作計畫（8 Tasks）
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
- @Claude — 2026-02-22 — Sidebar 文件庫功能 brainstorming、設計文件、8-Task TDD 實作計畫
