import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import App from "./App";
import * as libraryApi from "./services/libraryApi";
import * as api from "./services/api";

vi.mock("./services/libraryApi");

const mockLibrary: libraryApi.Library = {
  folders: [{ id: "f-001", name: "ASMR", order: 0 }],
  tags: [],
  documents: [
    {
      id: "doc-001",
      name: "腳本",
      folderId: "f-001",
      tagIds: [],
      htmlFile: "doc-001.html",
      lastPage: 2,
      notes: "test note",
      translations: {},
      createdAt: "",
      uploadedAt: "2026-02-22",
    },
  ],
};

beforeEach(() => {
  vi.mocked(libraryApi.getLibrary).mockResolvedValue(mockLibrary);
  vi.mocked(libraryApi.getDocumentHtml).mockResolvedValue({
    html: '<section class="page"><p>Hello</p></section>',
    page_count: 1,
  });
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("App", () => {
  it("renders sidebar with folder", async () => {
    render(<App />);
    await waitFor(() => expect(screen.getByText("ASMR")).toBeInTheDocument());
  });

  it("shows idle state with welcome message initially", async () => {
    render(<App />);
    await waitFor(() => screen.getByText("ASMR"));
    expect(screen.getByText(/選擇文件/)).toBeInTheDocument();
  });

  it("loads document html when document clicked", async () => {
    render(<App />);
    await waitFor(() => screen.getByText("腳本"));
    fireEvent.click(screen.getByText("腳本"));
    await waitFor(() =>
      expect(libraryApi.getDocumentHtml).toHaveBeenCalledWith("doc-001"),
    );
  });

  it("翻譯儲存後重新選取同一文件時使用快取，不重新呼叫翻譯 API", async () => {
    const user = userEvent.setup();

    // lastPage:1 確保 initialPage 與 page_count:1 的 mock 一致
    const doc1: libraryApi.Document = {
      ...mockLibrary.documents[0],
      lastPage: 1,
      translations: {},
    };
    const doc2: libraryApi.Document = {
      id: "doc-002",
      name: "第二份文件",
      folderId: "f-001",
      tagIds: [],
      htmlFile: "doc-002.html",
      lastPage: 1,
      notes: "",
      translations: {},
      createdAt: "",
      uploadedAt: "2026-02-22",
    };

    // saveTranslations 回傳帶有翻譯的文件
    const docWithTranslations: libraryApi.Document = {
      ...doc1,
      translations: { deepl: { "zh-TW": { "p-0": "快取翻譯" } } },
    };
    vi.mocked(libraryApi.saveTranslations).mockResolvedValue(
      docWithTranslations,
    );
    vi.mocked(libraryApi.getLibrary).mockResolvedValue({
      ...mockLibrary,
      documents: [doc1, doc2],
    });

    const mockTranslate = vi
      .spyOn(api, "translateTexts")
      .mockResolvedValue(["快取翻譯"]);

    render(<App />);
    await waitFor(() => screen.getByText("腳本"));

    // Step 1: 開啟文件並翻譯
    fireEvent.click(screen.getByText("腳本"));
    await waitFor(() => screen.getByText("Hello"));
    await user.click(screen.getByLabelText("翻譯"));
    await user.click(screen.getByRole("button", { name: "翻譯" }));
    await waitFor(() => expect(mockTranslate).toHaveBeenCalledTimes(1));
    await waitFor(() =>
      expect(libraryApi.saveTranslations).toHaveBeenCalledTimes(1),
    );

    // Step 2: 切換到另一份文件（PagedPreview 重新掛載）
    fireEvent.click(screen.getByText("第二份文件"));
    await waitFor(() =>
      expect(libraryApi.getDocumentHtml).toHaveBeenCalledWith("doc-002"),
    );

    // Step 3: 切回原文件（PagedPreview 重新掛載，應帶有更新後的 cachedTranslations）
    fireEvent.click(screen.getByText("腳本"));
    await waitFor(() => screen.getAllByText("Hello").length > 0);

    // Step 4: 再次翻譯 → 應從持久化快取載入，translateTexts 不應被再次呼叫
    await user.click(screen.getByLabelText("翻譯"));
    await user.click(screen.getByRole("button", { name: "翻譯" }));

    await waitFor(() =>
      expect(screen.getByText("快取翻譯")).toBeInTheDocument(),
    );
    expect(mockTranslate).toHaveBeenCalledTimes(1); // 仍然只呼叫 1 次
  });
});
