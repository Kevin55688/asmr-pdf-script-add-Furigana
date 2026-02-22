import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi, beforeEach } from "vitest";
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

  it("開啟翻譯 switch 時呼叫 translateTexts", async () => {
    const user = userEvent.setup();
    const mockTranslate = vi
      .spyOn(api, "translateTexts")
      .mockResolvedValue(["翻譯結果"]);

    render(<PagedPreview html={makeHtml(1)} pageCount={1} />);
    await user.click(screen.getByLabelText("翻譯"));

    await waitFor(() => {
      expect(mockTranslate).toHaveBeenCalledTimes(1);
    });
  });

  it("關閉翻譯 switch 時不呼叫 translateTexts", async () => {
    const mockTranslate = vi.spyOn(api, "translateTexts").mockResolvedValue([]);
    render(<PagedPreview html={makeHtml(1)} pageCount={1} />);
    // 不點 switch，直接確認沒有呼叫
    expect(mockTranslate).not.toHaveBeenCalled();
  });

  it("同一頁再次開啟翻譯不重複呼叫 API（cache）", async () => {
    const user = userEvent.setup();
    const mockTranslate = vi
      .spyOn(api, "translateTexts")
      .mockResolvedValue(["翻譯結果"]);

    render(<PagedPreview html={makeHtml(1)} pageCount={1} />);
    const toggleBtn = screen.getByLabelText("翻譯");

    await user.click(toggleBtn); // 開啟 → 呼叫 API
    await waitFor(() => expect(mockTranslate).toHaveBeenCalledTimes(1));

    await user.click(toggleBtn); // 關閉
    await user.click(toggleBtn); // 再開啟 → 應使用 cache，不再呼叫

    expect(mockTranslate).toHaveBeenCalledTimes(1);
  });

  it("切換語言時重新呼叫翻譯 API", async () => {
    const user = userEvent.setup();
    const mockTranslate = vi
      .spyOn(api, "translateTexts")
      .mockResolvedValue(["翻譯結果"]);

    render(<PagedPreview html={makeHtml(1)} pageCount={1} />);
    await user.click(screen.getByLabelText("翻譯")); // 開啟翻譯
    await waitFor(() => expect(mockTranslate).toHaveBeenCalledTimes(1));

    // 切換語言
    await user.selectOptions(screen.getByLabelText("目標語言"), "en");
    await waitFor(() => expect(mockTranslate).toHaveBeenCalledTimes(2));
  });
});
