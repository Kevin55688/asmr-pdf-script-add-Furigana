import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import { ProgressBar } from "./ProgressBar";

describe("ProgressBar", () => {
  it("顯示預設訊息「振り仮名を処理中...」", () => {
    render(<ProgressBar />);
    expect(screen.getByText("振り仮名を処理中...")).toBeInTheDocument();
  });

  it("顯示自訂訊息", () => {
    render(<ProgressBar message="アップロード中..." />);
    expect(screen.getByText("アップロード中...")).toBeInTheDocument();
  });

  it("渲染動畫進度條", () => {
    const { container } = render(<ProgressBar />);
    expect(container.firstChild).toBeInTheDocument();
  });
});
