# 前端開發脈絡

> 這是**前端 Session**。只處理 `frontend/` 目錄內的程式碼。

## 技術棧

- **框架：** React 18 + TypeScript
- **建置工具：** Vite
- **樣式：** Tailwind CSS（自訂色彩：`paper`、`ink`、`washi-border`、`accent`）
- **測試：** Vitest + React Testing Library

## 常用指令

```bash
# 安裝依賴（在 frontend/ 目錄執行）
npm install

# 啟動開發伺服器（port 5173，需後端在 8000）
npm run dev

# 執行所有測試
npx vitest run

# 執行單一測試檔
npx vitest run src/components/Sidebar.test.tsx

# 監聽模式
npx vitest
```

## 專案結構

```
frontend/src/
├── App.tsx                          # 根組件，管理全域狀態
├── components/
│   ├── Sidebar.tsx / .test.tsx      # 左側資料夾/文件列表
│   ├── FolderItem.tsx               # 資料夾列（含展開文件）
│   ├── DocumentItem.tsx             # 文件列項目
│   ├── DocumentContextMenu.tsx / .test.tsx  # 文件右鍵選單
│   ├── FileUploader.tsx / .test.tsx # 拖曳上傳
│   ├── HtmlPreview.tsx / .test.tsx  # HTML 預覽（振り仮名）
│   ├── PagedPreview.tsx / .test.tsx # 分頁預覽包裝層
│   ├── ProgressBar.tsx / .test.tsx  # 進度條
│   ├── NotesPanel.tsx / .test.tsx   # 筆記面板
│   ├── TagManager.tsx / .test.tsx   # 標籤管理
│   └── Toast.tsx / .test.tsx        # 通知提示
└── services/
    ├── api.ts                       # convert / translate API
    └── libraryApi.ts / .test.ts     # library CRUD API
```

## 樣式規範

- **所有樣式使用 Tailwind utility class**，不寫自訂 CSS，不用 `style={{}}`
- 自訂色彩語義：`bg-paper`（米白背景）、`text-ink`（深色文字）、`border-washi-border`（邊框）、`text-accent`（強調色）
- 設計風格：和紙卡片式，目標用戶為日語學習者

## API 合約（後端提供）

| 方法 | 路徑 | 說明 |
|------|------|------|
| POST | `/api/convert` | 上傳 PDF/TXT，回傳 `{ html, page_count }` |
| POST | `/api/translate` | 批次翻譯，回傳 `{ translations: string[] }` |
| GET | `/api/library` | 取得 `{ folders, documents, tags }` |
| POST | `/api/library/folders` | 建立資料夾 |
| PATCH | `/api/library/folders/{id}` | 重新命名資料夾 |
| DELETE | `/api/library/folders/{id}` | 刪除資料夾 |
| PATCH | `/api/library/folders/{id}/tags` | 設定資料夾標籤 |
| POST | `/api/library/tags` | 建立標籤 |
| DELETE | `/api/library/tags/{id}` | 刪除標籤 |
| POST | `/api/library/documents` | 建立文件記錄 |
| PATCH | `/api/library/documents/{id}` | 更新文件資訊 |
| DELETE | `/api/library/documents/{id}` | 刪除文件 |
| POST | `/api/library/documents/{id}/upload` | 上傳文件並轉換 |
| GET | `/api/library/documents/{id}/html` | 取得文件 HTML |
| PATCH | `/api/library/documents/{id}/translations` | 儲存翻譯結果 |

## 實作計畫

`docs/plans/2026-02-22-folder-context-menu-frontend.md`
