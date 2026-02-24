# MCP Server 設計文件

- **建立日期**：2026-02-24
- **狀態**：⏳ 待實作

---

## 目標

將現有後端的核心功能包裝成 **MCP Server**，讓 Claude Desktop 能透過自然語言直接操作振り仮名轉換工具與書庫管理，無需開啟瀏覽器前端。

---

## 架構

### 方案選擇

採用**方案 A：獨立 MCP Server（stdio transport）**。

- MCP Server 直接 import 現有 `app.services.*` 模組
- 透過 stdio 與 Claude Desktop 通訊
- **不需要** FastAPI server 運行
- FastAPI（前端用）與 MCP Server（Claude Desktop 用）為完全獨立的使用路徑

### 檔案結構

```
backend/
├── app/                        # 現有 FastAPI（完全不動）
│   ├── services/
│   │   ├── furigana.py         ← MCP Server 直接 import
│   │   ├── library_service.py  ← MCP Server 直接 import
│   │   ├── pdf_extractor.py    ← MCP Server 直接 import
│   │   └── html_generator.py   ← MCP Server 直接 import
│   └── ...
├── mcp_server.py               # 新增：MCP Server 入口
└── requirements.txt            # 新增：mcp SDK
```

---

## 公開 Tools（共 6 個）

### 振り仮名相關

| Tool | 說明 | 輸入參數 | 回傳值 |
|------|------|----------|--------|
| `convert_file` | 將本地 PDF 或 TXT 檔案轉換為含振り仮名的 HTML | `file_path: str` | `html: str`, `page_count: int` |
| `add_furigana` | 對單段日文文字加上振り仮名 | `text: str` | 含 `<ruby>` 標籤的 HTML 字串 |

### 書庫管理

| Tool | 說明 | 輸入參數 | 回傳值 |
|------|------|----------|--------|
| `list_library` | 列出所有資料夾、文件與標籤 | 無 | 書庫完整 JSON |
| `create_folder` | 新建資料夾 | `name: str` | 資料夾物件 |
| `delete_folder` | 刪除資料夾 | `folder_id: str` | `{ok: true}` |
| `upload_document` | 上傳 PDF/TXT 並處理為振り仮名 HTML 存入書庫 | `doc_id: str`, `file_path: str` | 更新後的文件物件 |

### 刻意不納入（YAGNI）

- `rename_folder`、`create_tag`、`delete_tag`、翻譯相關 Tool
- 使用頻率低，有需要時再擴充

---

## Claude Desktop 設定

### 設定檔路徑

- **Windows**：`%APPDATA%\Claude\claude_desktop_config.json`
- **macOS**：`~/Library/Application Support/Claude/claude_desktop_config.json`

### 設定內容

```json
{
  "mcpServers": {
    "furigana-tool": {
      "command": "python",
      "args": ["C:/Users/utafy/OneDrive/桌面/asmr_pdf_script_add_Furigana/backend/mcp_server.py"],
      "env": {
        "PYTHONPATH": "C:/Users/utafy/OneDrive/桌面/asmr_pdf_script_add_Furigana/backend"
      }
    }
  }
}
```

---

## 依賴

`requirements.txt` 新增：

```
mcp
```

其餘依賴（`fugashi`、`PyMuPDF`、`unidic-lite` 等）已存在，無需額外安裝。

---

## 啟動流程

```
1. pip install mcp           （一次性安裝）
2. 填寫 Claude Desktop 設定檔
3. 重啟 Claude Desktop
4. 直接在對話中操作，例如：
   「幫我把 /Downloads/script.pdf 轉成有振り仮名的 HTML」
   「列出我書庫裡的所有資料夾」
   「建一個叫『七月作品』的資料夾」
```

---

## 使用情境範例

| 使用者說 | Claude 自動呼叫 |
|---------|----------------|
| 「轉換這個 PDF」 | `convert_file(file_path=...)` |
| 「這段日文加振り仮名」 | `add_furigana(text=...)` |
| 「我的書庫有什麼？」 | `list_library()` |
| 「建一個新資料夾」 | `create_folder(name=...)` |
| 「刪掉這個資料夾」 | `delete_folder(folder_id=...)` |
| 「上傳這個文件」 | `upload_document(doc_id=..., file_path=...)` |
