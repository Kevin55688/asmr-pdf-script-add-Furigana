import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { ToastProvider } from "./Toast";
import { PagedPreview } from "./PagedPreview";
import * as api from "../services/api";

function makeHtml(pageCount: number): string {
  return Array.from(
    { length: pageCount },
    (_, i) =>
      `<section class="page" data-page="${i + 1}"><p>第 ${i + 1} 頁內容</p></section>`,
  ).join("\n");
}

describe("PagedPreview", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("預設顯示第 1 頁內容", () => {
    render(<PagedPreview html={makeHtml(3)} pageCount={3} />);
    expect(screen.getByText("第 1 頁內容")).toBeInTheDocument();
    expect(screen.queryByText("第 2 頁內容")).not.toBeInTheDocument();
  });

  it("顯示頁碼資訊「1」與「/ 3」", () => {
    render(<PagedPreview html={makeHtml(3)} pageCount={3} />);
    expect(screen.getByDisplayValue("1")).toBeInTheDocument();
    expect(screen.getByText("/ 3")).toBeInTheDocument();
  });

  it("第 1 頁時「上一頁」按鈕 disabled", () => {
    render(<PagedPreview html={makeHtml(3)} pageCount={3} />);
    expect(screen.getByRole("button", { name: /上一頁/ })).toBeDisabled();
  });

  it("點「下一頁」後顯示第 2 頁", async () => {
    const user = userEvent.setup();
    render(<PagedPreview html={makeHtml(3)} pageCount={3} />);
    await user.click(screen.getByRole("button", { name: /下一頁/ }));
    expect(screen.getByText("第 2 頁內容")).toBeInTheDocument();
    expect(screen.queryByText("第 1 頁內容")).not.toBeInTheDocument();
  });

  it("最後一頁時「下一頁」按鈕 disabled", async () => {
    const user = userEvent.setup();
    render(<PagedPreview html={makeHtml(2)} pageCount={2} />);
    await user.click(screen.getByRole("button", { name: /下一頁/ }));
    expect(screen.getByRole("button", { name: /下一頁/ })).toBeDisabled();
  });

  it("從第 2 頁點「上一頁」回到第 1 頁", async () => {
    const user = userEvent.setup();
    render(<PagedPreview html={makeHtml(3)} pageCount={3} />);
    await user.click(screen.getByRole("button", { name: /下一頁/ }));
    await user.click(screen.getByRole("button", { name: /上一頁/ }));
    expect(screen.getByText("第 1 頁內容")).toBeInTheDocument();
  });

  it("輸入頁碼 3 並按 Enter 跳頁", async () => {
    const user = userEvent.setup();
    render(<PagedPreview html={makeHtml(5)} pageCount={5} />);
    const input = screen.getByDisplayValue("1");
    await user.clear(input);
    await user.type(input, "3");
    await user.keyboard("{Enter}");
    expect(screen.getByText("第 3 頁內容")).toBeInTheDocument();
  });

  it("輸入 0 自動修正至第 1 頁", async () => {
    const user = userEvent.setup();
    render(<PagedPreview html={makeHtml(3)} pageCount={3} />);
    const input = screen.getByDisplayValue("1");
    await user.clear(input);
    await user.type(input, "0");
    await user.keyboard("{Enter}");
    expect(screen.getByDisplayValue("1")).toBeInTheDocument();
  });

  it("輸入 999 自動修正至最後一頁", async () => {
    const user = userEvent.setup();
    render(<PagedPreview html={makeHtml(3)} pageCount={3} />);
    const input = screen.getByDisplayValue("1");
    await user.clear(input);
    await user.type(input, "999");
    await user.keyboard("{Enter}");
    expect(screen.getByDisplayValue("3")).toBeInTheDocument();
  });

  // ── Toggle 測試 ──────────────────────────────────────────────────────────

  it("預設顯示振り仮名 toggle 並標示「振り仮名」", () => {
    render(<PagedPreview html={makeHtml(1)} pageCount={1} />);
    expect(screen.getByLabelText("振り仮名")).toBeInTheDocument();
  });

  it("預設顯示翻譯 toggle 並標示「翻譯」", () => {
    render(<PagedPreview html={makeHtml(1)} pageCount={1} />);
    expect(screen.getByLabelText("翻譯")).toBeInTheDocument();
  });

  it("開啟翻譯 toggle 時不自動呼叫 translateTexts", async () => {
    const user = userEvent.setup();
    const mockTranslate = vi.spyOn(api, "translateTexts").mockResolvedValue([]);

    render(<PagedPreview html={makeHtml(1)} pageCount={1} />);
    await user.click(screen.getByLabelText("翻譯")); // 開啟 toggle

    expect(mockTranslate).not.toHaveBeenCalled();
  });

  it("點按「翻譯」按鈕時才呼叫 translateTexts", async () => {
    const user = userEvent.setup();
    const mockTranslate = vi
      .spyOn(api, "translateTexts")
      .mockResolvedValue(["翻譯結果"]);

    render(<PagedPreview html={makeHtml(1)} pageCount={1} />);
    await user.click(screen.getByLabelText("翻譯")); // 開啟 toggle（不呼叫 API）
    expect(mockTranslate).not.toHaveBeenCalled();

    await user.click(screen.getByRole("button", { name: "翻譯" })); // 點按鈕
    await waitFor(() => {
      expect(mockTranslate).toHaveBeenCalledTimes(1);
    });
  });

  it("同一頁再次開啟翻譯不重複呼叫 API（cache）", async () => {
    const user = userEvent.setup();
    const mockTranslate = vi
      .spyOn(api, "translateTexts")
      .mockResolvedValue(["翻譯結果"]);

    render(<PagedPreview html={makeHtml(1)} pageCount={1} />);
    const toggleCheckbox = screen.getByLabelText("翻譯");

    await user.click(toggleCheckbox); // 開啟 toggle
    await user.click(screen.getByRole("button", { name: "翻譯" })); // 點按鈕 → API
    await waitFor(() => expect(mockTranslate).toHaveBeenCalledTimes(1));

    await user.click(toggleCheckbox); // 關閉
    await user.click(toggleCheckbox); // 再開啟 → effect 觸發，但 cache hit，不再呼叫

    expect(mockTranslate).toHaveBeenCalledTimes(1);
  });

  it("切換語言後需重新點按「翻譯」才呼叫 API", async () => {
    const user = userEvent.setup();
    const mockTranslate = vi
      .spyOn(api, "translateTexts")
      .mockResolvedValue(["翻譯結果"]);

    render(<PagedPreview html={makeHtml(1)} pageCount={1} />);
    await user.click(screen.getByLabelText("翻譯")); // 開啟翻譯
    await user.click(screen.getByRole("button", { name: "翻譯" })); // 第一次翻譯
    await waitFor(() => expect(mockTranslate).toHaveBeenCalledTimes(1));

    // 切換語言後不自動呼叫
    await user.selectOptions(screen.getByLabelText("目標語言"), "en");
    expect(mockTranslate).toHaveBeenCalledTimes(1);

    // 需再次點按「翻譯」
    await user.click(screen.getByRole("button", { name: "翻譯" }));
    await waitFor(() => expect(mockTranslate).toHaveBeenCalledTimes(2));
  });

  it("翻譯失敗時顯示 Toast 錯誤訊息", async () => {
    const user = userEvent.setup();
    vi.spyOn(api, "translateTexts").mockRejectedValue(new Error("API 金鑰無效"));

    render(
      <ToastProvider>
        <PagedPreview html={makeHtml(1)} pageCount={1} />
      </ToastProvider>,
    );
    await user.click(screen.getByLabelText("翻譯"));
    await user.click(screen.getByRole("button", { name: "翻譯" }));

    await waitFor(() => {
      expect(screen.getByText("API 金鑰無效")).toBeInTheDocument();
    });
  });

  it("翻譯失敗 Toast 顯示重試按鈕，點擊後重新呼叫 API", async () => {
    const user = userEvent.setup();
    const mockTranslate = vi
      .spyOn(api, "translateTexts")
      .mockRejectedValue(new Error("網路錯誤"));

    render(
      <ToastProvider>
        <PagedPreview html={makeHtml(1)} pageCount={1} />
      </ToastProvider>,
    );
    await user.click(screen.getByLabelText("翻譯"));
    await user.click(screen.getByRole("button", { name: "翻譯" }));

    await waitFor(() => {
      expect(screen.getByText("重試")).toBeInTheDocument();
    });

    await user.click(screen.getByText("重試"));
    expect(mockTranslate).toHaveBeenCalledTimes(2);
  });
});

describe("PagedPreview cachedTranslations", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("cachedTranslations 有資料時點翻譯不呼叫 API", async () => {
    const user = userEvent.setup();
    const mockTranslate = vi.spyOn(api, "translateTexts").mockResolvedValue(["翻訳API呼ばれた"]);

    const singlePageHtml = `<section class="page"><p>テスト</p></section>`;
    const cachedTranslations = {
      deepl: { "zh-TW": { "p-0": "測試（快取）" } },
    };

    render(
      <PagedPreview
        html={singlePageHtml}
        pageCount={1}
        cachedTranslations={cachedTranslations}
        onTranslationSaved={vi.fn()}
      />
    );

    await user.click(screen.getByLabelText("翻譯"));
    await user.click(screen.getByRole("button", { name: "翻譯" }));

    await waitFor(() => expect(mockTranslate).not.toHaveBeenCalled());
    expect(await screen.findByText("測試（快取）")).toBeInTheDocument();
  });
});

describe("PagedPreview persistence props", () => {
  it("starts at initialPage when provided", () => {
    const html = Array.from({ length: 5 }, (_, i) =>
      `<section class="page"><p>Page ${i + 1}</p></section>`
    ).join("");
    render(<PagedPreview html={html} pageCount={5} initialPage={3} />);
    expect(screen.getByDisplayValue("3")).toBeInTheDocument();
  });

  it("calls onPageChange when page changes", async () => {
    const onPageChange = vi.fn();
    const html = Array.from({ length: 3 }, (_, i) =>
      `<section class="page"><p>Page ${i + 1}</p></section>`
    ).join("");
    render(<PagedPreview html={html} pageCount={3} onPageChange={onPageChange} />);
    fireEvent.click(screen.getByRole("button", { name: "下一頁" }));
    // debounce: wait 1.1s
    await new Promise((r) => setTimeout(r, 1100));
    expect(onPageChange).toHaveBeenCalledWith(2);
  });
});
