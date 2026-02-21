import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect } from "vitest";
import { PagedPreview } from "./PagedPreview";

function makeHtml(pageCount: number): string {
  return Array.from(
    { length: pageCount },
    (_, i) =>
      `<section class="page" data-page="${i + 1}"><p>第 ${i + 1} 頁內容</p></section>`,
  ).join("\n");
}

describe("PagedPreview", () => {
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
});
