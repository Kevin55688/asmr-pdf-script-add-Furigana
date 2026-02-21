import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import { HtmlPreview } from "./HtmlPreview";

describe("HtmlPreview", () => {
  it("顯示頁數標題", () => {
    render(<HtmlPreview html="<p>測試</p>" pageCount={3} showRuby />);
    expect(screen.getByText("預覽（共 3 頁）")).toBeInTheDocument();
  });

  it("渲染 HTML 內容", () => {
    render(<HtmlPreview html="<p>日本語テスト</p>" pageCount={1} showRuby />);
    expect(screen.getByText("日本語テスト")).toBeInTheDocument();
  });

  it("渲染 ruby 振り仮名標籤", () => {
    const html = "<ruby>漢字<rt>かんじ</rt></ruby>";
    const { container } = render(
      <HtmlPreview html={html} pageCount={1} showRuby />,
    );
    expect(container.querySelector("ruby")).toBeInTheDocument();
    expect(container.querySelector("rt")).toBeInTheDocument();
  });

  it("pageCount 為 1 時顯示正確頁數", () => {
    render(<HtmlPreview html="" pageCount={1} showRuby />);
    expect(screen.getByText("預覽（共 1 頁）")).toBeInTheDocument();
  });

  it("showRuby=false 時套用 hide-ruby class", () => {
    const { container } = render(
      <HtmlPreview html="<p>テスト</p>" pageCount={1} showRuby={false} />,
    );
    expect(container.querySelector(".hide-ruby")).toBeInTheDocument();
  });

  it("showRuby=true 時不套用 hide-ruby class", () => {
    const { container } = render(
      <HtmlPreview html="<p>テスト</p>" pageCount={1} showRuby />,
    );
    expect(container.querySelector(".hide-ruby")).not.toBeInTheDocument();
  });

  it("顯示翻譯文字", () => {
    render(
      <HtmlPreview
        html="<p>東京です</p>"
        pageCount={1}
        showRuby
        translations={["這是東京"]}
      />,
    );
    expect(screen.getByText("這是東京")).toBeInTheDocument();
  });

  it("isTranslating=true 時顯示 skeleton", () => {
    const { container } = render(
      <HtmlPreview html="<p>テスト</p>" pageCount={1} showRuby isTranslating />,
    );
    expect(
      container.querySelector(".translation-skeleton"),
    ).toBeInTheDocument();
  });

  it("未傳入 translations 時不顯示翻譯區塊", () => {
    const { container } = render(
      <HtmlPreview html="<p>テスト</p>" pageCount={1} showRuby />,
    );
    expect(
      container.querySelector(".translation-text"),
    ).not.toBeInTheDocument();
  });
});
