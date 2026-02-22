import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  getLibrary,
  createFolder,
  renameFolder,
  deleteFolder,
  updateFolderTags,
  createTag,
  deleteTag,
  createDocument,
  updateDocument,
  deleteDocument,
  uploadDocument,
  getDocumentHtml,
  saveTranslations,
} from "./libraryApi";
import type { Folder } from "./libraryApi";

const mockFetch = vi.fn();
vi.stubGlobal("fetch", mockFetch);

function mockResponse(data: unknown, ok = true, status = 200) {
  mockFetch.mockResolvedValueOnce({
    ok,
    status,
    json: async () => data,
  });
}

beforeEach(() => mockFetch.mockReset());

describe("getLibrary", () => {
  it("calls GET /api/library and returns library", async () => {
    const lib = { folders: [], tags: [], documents: [] };
    mockResponse(lib);
    const result = await getLibrary();
    expect(result).toEqual(lib);
    expect(mockFetch).toHaveBeenCalledWith(
      "http://localhost:8000/api/library/",
      expect.objectContaining({ headers: expect.any(Object) }),
    );
  });
});

describe("createFolder", () => {
  it("posts name and returns folder", async () => {
    mockResponse({ id: "f-001", name: "ASMR", order: 0 });
    const folder = await createFolder("ASMR");
    expect(folder.name).toBe("ASMR");
  });
});

describe("renameFolder", () => {
  it("patches folder name", async () => {
    mockResponse({ id: "f-001", name: "新名稱", order: 0 });
    const folder = await renameFolder("f-001", "新名稱");
    expect(folder.name).toBe("新名稱");
  });
});

describe("deleteFolder", () => {
  it("deletes folder", async () => {
    mockResponse({ ok: true });
    await expect(deleteFolder("f-001")).resolves.not.toThrow();
  });
});

describe("createTag / deleteTag", () => {
  it("creates tag", async () => {
    mockResponse({ id: "t-001", name: "完成", color: "#4ade80" });
    const tag = await createTag("完成", "#4ade80");
    expect(tag.name).toBe("完成");
  });
  it("deletes tag", async () => {
    mockResponse({ ok: true });
    await expect(deleteTag("t-001")).resolves.not.toThrow();
  });
});

describe("createDocument", () => {
  it("creates document placeholder", async () => {
    mockResponse({ id: "doc-001", name: "腳本", htmlFile: null });
    const doc = await createDocument("腳本", "f-001");
    expect(doc.htmlFile).toBeNull();
  });
});

describe("updateDocument", () => {
  it("patches document metadata", async () => {
    mockResponse({ id: "doc-001", lastPage: 5 });
    const doc = await updateDocument("doc-001", { lastPage: 5 });
    expect(doc.lastPage).toBe(5);
  });
});

describe("deleteDocument", () => {
  it("deletes document", async () => {
    mockResponse({ ok: true });
    await expect(deleteDocument("doc-001")).resolves.not.toThrow();
  });
});

describe("uploadDocument", () => {
  it("sends file as FormData", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        id: "doc-001",
        htmlFile: "doc-001.html",
        page_count: 1,
      }),
    });
    const file = new File(["content"], "test.txt", { type: "text/plain" });
    const result = await uploadDocument("doc-001", file);
    expect(result.htmlFile).toBe("doc-001.html");
    const [url, init] = mockFetch.mock.calls[0];
    expect(url).toContain("doc-001/upload");
    expect(init.body).toBeInstanceOf(FormData);
  });
});

describe("getDocumentHtml", () => {
  it("returns html and page_count", async () => {
    mockResponse({ html: "<p>test</p>", page_count: 3 });
    const result = await getDocumentHtml("doc-001");
    expect(result.html).toBe("<p>test</p>");
    expect(result.page_count).toBe(3);
  });
});

describe("saveTranslations", () => {
  it("patches translations", async () => {
    mockResponse({
      id: "doc-001",
      translations: { deepl: { "zh-TW": { "p-0": "你好" } } },
    });
    const result = await saveTranslations("doc-001", "deepl", "zh-TW", {
      "p-0": "你好",
    });
    expect(result.translations.deepl["zh-TW"]["p-0"]).toBe("你好");
  });
});

describe("Folder 型別 + updateFolderTags", () => {
  it("Folder 型別包含 tagIds 欄位", () => {
    const folder: Folder = {
      id: "f-001",
      name: "測試",
      order: 0,
      tagIds: ["t-001"],
    };
    expect(folder.tagIds).toEqual(["t-001"]);
  });

  it("updateFolderTags 傳送正確請求", async () => {
    mockResponse({ id: "f-001", name: "A", order: 0, tagIds: ["t-001"] });
    const result = await updateFolderTags("f-001", ["t-001"]);
    expect(result.tagIds).toEqual(["t-001"]);
    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining("/folders/f-001/tags"),
      expect.objectContaining({ method: "PATCH" })
    );
  });
});

describe("error handling", () => {
  it("throws error with detail message", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 404,
      json: async () => ({ detail: "Document not found" }),
    });
    await expect(getDocumentHtml("bad-id")).rejects.toThrow(
      "Document not found",
    );
  });
});
