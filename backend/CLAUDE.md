# 後端開發脈絡

> 這是**後端 Session**。只處理 `backend/` 目錄內的程式碼。

## 技術棧

- **框架：** FastAPI 0.115
- **PDF 解析：** PyMuPDF
- **日文分詞：** fugashi + unidic-lite (MeCab)
- **HTML 產生：** Jinja2
- **翻譯：** Anthropic SDK（claude-haiku-4-5）
- **測試：** pytest + httpx TestClient
- **Python：** 3.11+

## 常用指令

```bash
# 安裝依賴（在 backend/ 目錄執行）
pip install -r requirements.txt

# 啟動開發伺服器（port 8000）
uvicorn app.main:app --reload

# 執行所有測試
pytest tests/ -v

# 執行單一測試檔
pytest tests/test_convert.py -v
```

## 專案結構

```
backend/
├── app/
│   ├── main.py                  # FastAPI 入口 + CORS（允許 localhost:5173）
│   ├── routers/
│   │   ├── convert.py           # POST /api/convert（PDF/TXT → HTML）
│   │   ├── library.py           # /api/library/* 資料庫 CRUD
│   │   └── translate.py         # POST /api/translate
│   └── services/
│       ├── furigana.py          # fugashi 振り仮名標注
│       ├── html_generator.py    # 產生 <ruby> HTML
│       ├── library_service.py   # 資料夾/文件/標籤 CRUD 邏輯
│       ├── pdf_extractor.py     # PyMuPDF 文字擷取
│       ├── translator.py        # Anthropic API 翻譯
│       └── txt_extractor.py     # TXT 文字擷取
├── tests/
├── data/                        # JSON 資料庫 + 上傳檔案
├── requirements.txt
└── .env                         # ANTHROPIC_API_KEY
```

## API 端點

| 方法 | 路徑 | 說明 |
|------|------|------|
| POST | `/api/convert` | 上傳 PDF/TXT，回傳 HTML + page_count |
| POST | `/api/translate` | 批次翻譯文字陣列 |
| GET | `/api/library` | 取得完整資料庫（folders + documents + tags） |
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
| GET | `/api/health` | 健康檢查 |

## 實作計畫

目前無進行中的後端計畫。
