# MCP Server Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** 建立 `backend/mcp_server.py`，透過 stdio transport 將振り仮名轉換與書庫管理功能公開為 MCP Tools，供 Claude Desktop 直接操作。

**Architecture:** 獨立 MCP Server，直接 import 現有 `app.services.*` 模組，繞過 HTTP 層。每個 Tool 的業務邏輯提取為獨立 `handle_*` async 函式，方便測試。MCP routing（`list_tools` / `call_tool`）統一在同一檔案底部定義。

**Tech Stack:** Python `mcp` SDK、`pytest-asyncio`（已安裝）、`unittest.mock`

---

## Task 1：安裝依賴 + 建立 MCP Server 骨架

**Files:**
- Modify: `backend/requirements.txt`
- Create: `backend/mcp_server.py`
- Create: `backend/tests/test_mcp_server.py`

---

**Step 1：在 requirements.txt 末尾加入 mcp**

```
mcp>=1.0.0
```

**Step 2：安裝依賴**

```bash
cd backend
pip install mcp
```

Expected: 安裝成功，無 error

**Step 3：建立 mcp_server.py 骨架**

```python
# backend/mcp_server.py
import asyncio
import json

import mcp.types as types
from mcp.server import NotificationOptions, Server
from mcp.server.models import InitializationOptions
from mcp.server.stdio import stdio_server

server = Server("furigana-tool")


# ── Tool Handlers（業務邏輯，供測試直接呼叫）────────────────────────────────


# ── MCP Routing ───────────────────────────────────────────────────────────────

@server.list_tools()
async def handle_list_tools() -> list[types.Tool]:
    return []


@server.call_tool()
async def handle_call_tool(
    name: str, arguments: dict
) -> list[types.TextContent]:
    raise ValueError(f"未知 tool：{name}")


# ── Entry Point ───────────────────────────────────────────────────────────────

async def main() -> None:
    async with stdio_server() as (read_stream, write_stream):
        await server.run(
            read_stream,
            write_stream,
            InitializationOptions(
                server_name="furigana-tool",
                server_version="0.1.0",
                capabilities=server.get_capabilities(
                    notification_options=NotificationOptions(),
                    experimental_capabilities={},
                ),
            ),
        )


if __name__ == "__main__":
    asyncio.run(main())
```

**Step 4：寫匯入測試**

```python
# backend/tests/test_mcp_server.py
import pytest


def test_mcp_server_imports():
    """確認 mcp_server 可以正常匯入，不會有 ImportError"""
    import mcp_server  # noqa: F401
```

**Step 5：執行測試確認失敗（因為骨架尚未完整）**

```bash
cd backend
PYTHONPATH=. pytest tests/test_mcp_server.py::test_mcp_server_imports -v
```

Expected: PASS（骨架能 import 即可）

**Step 6：Commit**

```bash
git add backend/requirements.txt backend/mcp_server.py backend/tests/test_mcp_server.py
git commit -m "[Feature] 新增 MCP Server 骨架與依賴"
```

---

## Task 2：`add_furigana` Tool

**Files:**
- Modify: `backend/mcp_server.py`
- Modify: `backend/tests/test_mcp_server.py`

---

**Step 1：寫失敗測試**

在 `test_mcp_server.py` 加入：

```python
import pytest


@pytest.mark.asyncio
async def test_handle_add_furigana_kanji():
    from mcp_server import handle_add_furigana
    result = await handle_add_furigana("漢字")
    assert "<ruby>" in result
    assert "漢字" in result


@pytest.mark.asyncio
async def test_handle_add_furigana_empty():
    from mcp_server import handle_add_furigana
    result = await handle_add_furigana("")
    assert result == ""
```

**Step 2：執行確認失敗**

```bash
PYTHONPATH=. pytest tests/test_mcp_server.py::test_handle_add_furigana_kanji -v
```

Expected: FAIL with `ImportError: cannot import name 'handle_add_furigana'`

**Step 3：實作 handler + 加入 list_tools + call_tool routing**

在 `mcp_server.py` 的 `# Tool Handlers` 區塊加入：

```python
from app.services.furigana import add_furigana as _add_furigana


async def handle_add_furigana(text: str) -> str:
    return _add_furigana(text)
```

更新 `handle_list_tools`：

```python
@server.list_tools()
async def handle_list_tools() -> list[types.Tool]:
    return [
        types.Tool(
            name="add_furigana",
            description="對日文文字加上振り仮名，回傳含 <ruby> 標籤的 HTML",
            inputSchema={
                "type": "object",
                "properties": {
                    "text": {"type": "string", "description": "要加振り仮名的日文文字"}
                },
                "required": ["text"],
            },
        ),
    ]
```

更新 `handle_call_tool`：

```python
@server.call_tool()
async def handle_call_tool(
    name: str, arguments: dict
) -> list[types.TextContent]:
    if name == "add_furigana":
        result = await handle_add_furigana(arguments["text"])
        return [types.TextContent(type="text", text=result)]
    raise ValueError(f"未知 tool：{name}")
```

**Step 4：執行確認通過**

```bash
PYTHONPATH=. pytest tests/test_mcp_server.py -k "add_furigana" -v
```

Expected: 2 PASSED

**Step 5：Commit**

```bash
git add backend/mcp_server.py backend/tests/test_mcp_server.py
git commit -m "[Feature] MCP Server 加入 add_furigana tool"
```

---

## Task 3：`convert_file` Tool

**Files:**
- Modify: `backend/mcp_server.py`
- Modify: `backend/tests/test_mcp_server.py`

---

**Step 1：寫失敗測試**

```python
import pytest
from unittest.mock import patch, MagicMock
from pathlib import Path


@pytest.mark.asyncio
async def test_handle_convert_file_txt(tmp_path):
    from mcp_server import handle_convert_file
    txt_file = tmp_path / "test.txt"
    txt_file.write_text("今日は学校に行く", encoding="utf-8")
    result = await handle_convert_file(str(txt_file))
    assert "html" in result
    assert "page_count" in result
    assert result["page_count"] == 1


@pytest.mark.asyncio
async def test_handle_convert_file_pdf(tmp_path):
    from mcp_server import handle_convert_file
    fake_pdf = tmp_path / "test.pdf"
    fake_pdf.write_bytes(b"fake")
    with patch("mcp_server._extract_text_by_pages", return_value=["page1"]), \
         patch("mcp_server._generate_html", return_value="<html>test</html>"):
        result = await handle_convert_file(str(fake_pdf))
    assert result["html"] == "<html>test</html>"
    assert result["page_count"] == 1


@pytest.mark.asyncio
async def test_handle_convert_file_unsupported(tmp_path):
    from mcp_server import handle_convert_file
    bad_file = tmp_path / "test.docx"
    bad_file.write_bytes(b"fake")
    with pytest.raises(ValueError, match="不支援"):
        await handle_convert_file(str(bad_file))
```

**Step 2：執行確認失敗**

```bash
PYTHONPATH=. pytest tests/test_mcp_server.py -k "convert_file" -v
```

Expected: FAIL with `ImportError`

**Step 3：實作 handler**

在 `mcp_server.py` imports 區塊加入：

```python
from app.services.html_generator import generate_html as _generate_html
from app.services.html_generator import generate_html_from_script_txt as _generate_html_from_txt
from app.services.pdf_extractor import extract_text_by_pages as _extract_text_by_pages
```

在 Tool Handlers 加入：

```python
async def handle_convert_file(file_path: str) -> dict:
    path = Path(file_path)
    name_lower = path.name.lower()

    if name_lower.endswith(".pdf"):
        pages = _extract_text_by_pages(file_path)
        html = _generate_html(pages)
        return {"html": html, "page_count": len(pages)}
    elif name_lower.endswith(".txt"):
        text = path.read_text(encoding="utf-8")
        html = _generate_html_from_txt(text)
        return {"html": html, "page_count": 1}
    else:
        raise ValueError(f"不支援的檔案格式：{path.suffix}（僅支援 .pdf / .txt）")
```

在 `handle_list_tools` 的 return list 加入：

```python
        types.Tool(
            name="convert_file",
            description="將本地 PDF 或 TXT 檔案轉換為含振り仮名的 HTML",
            inputSchema={
                "type": "object",
                "properties": {
                    "file_path": {"type": "string", "description": "檔案的絕對路徑"}
                },
                "required": ["file_path"],
            },
        ),
```

在 `handle_call_tool` 的 if-elif 加入：

```python
    elif name == "convert_file":
        result = await handle_convert_file(arguments["file_path"])
        return [types.TextContent(type="text", text=json.dumps(result, ensure_ascii=False))]
```

在 `mcp_server.py` 頂部加入：

```python
from pathlib import Path
```

**Step 4：執行確認通過**

```bash
PYTHONPATH=. pytest tests/test_mcp_server.py -k "convert_file" -v
```

Expected: 3 PASSED

**Step 5：Commit**

```bash
git add backend/mcp_server.py backend/tests/test_mcp_server.py
git commit -m "[Feature] MCP Server 加入 convert_file tool"
```

---

## Task 4：`list_library` Tool

**Files:**
- Modify: `backend/mcp_server.py`
- Modify: `backend/tests/test_mcp_server.py`

---

**Step 1：寫失敗測試**

```python
@pytest.mark.asyncio
async def test_handle_list_library():
    from mcp_server import handle_list_library
    fake_lib = {"folders": [{"id": "f-1", "name": "Test"}], "tags": [], "documents": []}
    with patch("mcp_server._load_library", return_value=fake_lib):
        result = await handle_list_library()
    assert result == fake_lib
    assert len(result["folders"]) == 1
```

**Step 2：執行確認失敗**

```bash
PYTHONPATH=. pytest tests/test_mcp_server.py::test_handle_list_library -v
```

Expected: FAIL

**Step 3：實作 handler**

Import 區塊加入：

```python
from app.services import library_service as _lib_svc

_load_library = _lib_svc.load_library
_create_folder = _lib_svc.create_folder
_delete_folder = _lib_svc.delete_folder
_set_document_html = _lib_svc.set_document_html
```

Tool Handlers 加入：

```python
async def handle_list_library() -> dict:
    return _load_library()
```

`handle_list_tools` 加入：

```python
        types.Tool(
            name="list_library",
            description="列出書庫中所有資料夾、文件與標籤",
            inputSchema={"type": "object", "properties": {}},
        ),
```

`handle_call_tool` 加入：

```python
    elif name == "list_library":
        result = await handle_list_library()
        return [types.TextContent(type="text", text=json.dumps(result, ensure_ascii=False))]
```

**Step 4：執行確認通過**

```bash
PYTHONPATH=. pytest tests/test_mcp_server.py::test_handle_list_library -v
```

Expected: PASS

**Step 5：Commit**

```bash
git add backend/mcp_server.py backend/tests/test_mcp_server.py
git commit -m "[Feature] MCP Server 加入 list_library tool"
```

---

## Task 5：`create_folder` Tool

**Files:**
- Modify: `backend/mcp_server.py`
- Modify: `backend/tests/test_mcp_server.py`

---

**Step 1：寫失敗測試**

```python
@pytest.mark.asyncio
async def test_handle_create_folder():
    from mcp_server import handle_create_folder
    fake_folder = {"id": "f-abc", "name": "新資料夾", "order": 0, "tagIds": []}
    with patch("mcp_server._create_folder", return_value=fake_folder):
        result = await handle_create_folder("新資料夾")
    assert result["name"] == "新資料夾"
    assert "id" in result
```

**Step 2：執行確認失敗**

```bash
PYTHONPATH=. pytest tests/test_mcp_server.py::test_handle_create_folder -v
```

Expected: FAIL

**Step 3：實作 handler**

```python
async def handle_create_folder(name: str) -> dict:
    return _create_folder(name)
```

`handle_list_tools` 加入：

```python
        types.Tool(
            name="create_folder",
            description="在書庫中新建資料夾",
            inputSchema={
                "type": "object",
                "properties": {
                    "name": {"type": "string", "description": "資料夾名稱"}
                },
                "required": ["name"],
            },
        ),
```

`handle_call_tool` 加入：

```python
    elif name == "create_folder":
        result = await handle_create_folder(arguments["name"])
        return [types.TextContent(type="text", text=json.dumps(result, ensure_ascii=False))]
```

**Step 4：執行確認通過**

```bash
PYTHONPATH=. pytest tests/test_mcp_server.py::test_handle_create_folder -v
```

Expected: PASS

**Step 5：Commit**

```bash
git add backend/mcp_server.py backend/tests/test_mcp_server.py
git commit -m "[Feature] MCP Server 加入 create_folder tool"
```

---

## Task 6：`delete_folder` Tool

**Files:**
- Modify: `backend/mcp_server.py`
- Modify: `backend/tests/test_mcp_server.py`

---

**Step 1：寫失敗測試**

```python
@pytest.mark.asyncio
async def test_handle_delete_folder_success():
    from mcp_server import handle_delete_folder
    with patch("mcp_server._delete_folder", return_value=True):
        result = await handle_delete_folder("f-abc")
    assert result == {"ok": True}


@pytest.mark.asyncio
async def test_handle_delete_folder_not_found():
    from mcp_server import handle_delete_folder
    with patch("mcp_server._delete_folder", return_value=False):
        with pytest.raises(ValueError, match="找不到"):
            await handle_delete_folder("f-notexist")
```

**Step 2：執行確認失敗**

```bash
PYTHONPATH=. pytest tests/test_mcp_server.py -k "delete_folder" -v
```

Expected: FAIL

**Step 3：實作 handler**

```python
async def handle_delete_folder(folder_id: str) -> dict:
    ok = _delete_folder(folder_id)
    if not ok:
        raise ValueError(f"找不到資料夾：{folder_id}")
    return {"ok": True}
```

`handle_list_tools` 加入：

```python
        types.Tool(
            name="delete_folder",
            description="刪除指定資料夾（連同其下所有文件）",
            inputSchema={
                "type": "object",
                "properties": {
                    "folder_id": {"type": "string", "description": "資料夾 ID（如 f-abc12345）"}
                },
                "required": ["folder_id"],
            },
        ),
```

`handle_call_tool` 加入：

```python
    elif name == "delete_folder":
        result = await handle_delete_folder(arguments["folder_id"])
        return [types.TextContent(type="text", text=json.dumps(result, ensure_ascii=False))]
```

**Step 4：執行確認通過**

```bash
PYTHONPATH=. pytest tests/test_mcp_server.py -k "delete_folder" -v
```

Expected: 2 PASSED

**Step 5：Commit**

```bash
git add backend/mcp_server.py backend/tests/test_mcp_server.py
git commit -m "[Feature] MCP Server 加入 delete_folder tool"
```

---

## Task 7：`upload_document` Tool

**Files:**
- Modify: `backend/mcp_server.py`
- Modify: `backend/tests/test_mcp_server.py`

---

**Step 1：寫失敗測試**

```python
@pytest.mark.asyncio
async def test_handle_upload_document_txt(tmp_path):
    from mcp_server import handle_upload_document
    txt_file = tmp_path / "script.txt"
    txt_file.write_text("今日は学校に行く", encoding="utf-8")
    fake_doc = {"id": "doc-abc", "name": "script", "htmlFile": "doc-abc.html"}
    with patch("mcp_server._set_document_html", return_value=fake_doc):
        result = await handle_upload_document("doc-abc", str(txt_file))
    assert result["id"] == "doc-abc"


@pytest.mark.asyncio
async def test_handle_upload_document_pdf(tmp_path):
    from mcp_server import handle_upload_document
    pdf_file = tmp_path / "script.pdf"
    pdf_file.write_bytes(b"fake-pdf")
    fake_doc = {"id": "doc-xyz", "name": "script", "htmlFile": "doc-xyz.html"}
    with patch("mcp_server._extract_text_by_pages", return_value=["page1"]), \
         patch("mcp_server._generate_html", return_value="<html/>"), \
         patch("mcp_server._set_document_html", return_value=fake_doc):
        result = await handle_upload_document("doc-xyz", str(pdf_file))
    assert result["id"] == "doc-xyz"


@pytest.mark.asyncio
async def test_handle_upload_document_unsupported(tmp_path):
    from mcp_server import handle_upload_document
    bad_file = tmp_path / "test.docx"
    bad_file.write_bytes(b"fake")
    with pytest.raises(ValueError, match="不支援"):
        await handle_upload_document("doc-abc", str(bad_file))
```

**Step 2：執行確認失敗**

```bash
PYTHONPATH=. pytest tests/test_mcp_server.py -k "upload_document" -v
```

Expected: FAIL

**Step 3：實作 handler**

```python
async def handle_upload_document(doc_id: str, file_path: str) -> dict:
    path = Path(file_path)
    name_lower = path.name.lower()

    if name_lower.endswith(".pdf"):
        pages = _extract_text_by_pages(file_path)
        html = _generate_html(pages)
    elif name_lower.endswith(".txt"):
        text = path.read_text(encoding="utf-8")
        html = _generate_html_from_txt(text)
    else:
        raise ValueError(f"不支援的檔案格式：{path.suffix}（僅支援 .pdf / .txt）")

    result = _set_document_html(doc_id, html)
    if result is None:
        raise ValueError(f"找不到文件：{doc_id}")
    return result
```

`handle_list_tools` 加入：

```python
        types.Tool(
            name="upload_document",
            description="將本地 PDF 或 TXT 上傳並轉換為振り仮名 HTML，儲存至書庫中指定文件",
            inputSchema={
                "type": "object",
                "properties": {
                    "doc_id": {"type": "string", "description": "書庫中的文件 ID（如 doc-abc12345）"},
                    "file_path": {"type": "string", "description": "本地檔案的絕對路徑"},
                },
                "required": ["doc_id", "file_path"],
            },
        ),
```

`handle_call_tool` 加入：

```python
    elif name == "upload_document":
        result = await handle_upload_document(arguments["doc_id"], arguments["file_path"])
        return [types.TextContent(type="text", text=json.dumps(result, ensure_ascii=False))]
```

**Step 4：執行全部測試**

```bash
PYTHONPATH=. pytest tests/test_mcp_server.py -v
```

Expected: 全部 PASS（共約 13 tests）

**Step 5：Commit**

```bash
git add backend/mcp_server.py backend/tests/test_mcp_server.py
git commit -m "[Feature] MCP Server 加入 upload_document tool，完成全部 6 Tools"
```

---

## 完成後驗證：連接 Claude Desktop

**Step 1：找到 Claude Desktop 設定檔**

- Windows：`%APPDATA%\Claude\claude_desktop_config.json`

**Step 2：加入 MCP Server 設定**

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

**Step 3：重啟 Claude Desktop，確認左下角出現 hammer 圖示（Tools 已載入）**

**Step 4：測試對話**

> 「列出我的書庫」→ Claude 應呼叫 `list_library`
> 「這段日文加振り仮名：東京は大きい都市です」→ Claude 應呼叫 `add_furigana`
