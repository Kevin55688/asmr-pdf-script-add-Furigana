import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi } from "vitest";
import { FileUploader } from "./FileUploader";

describe("FileUploader", () => {
  describe("展開態（collapsed=false）", () => {
    it("顯示拖放提示文字", () => {
      render(<FileUploader onFileSelect={vi.fn()} />);
      expect(screen.getByText("拖放 PDF 或 TXT 至此")).toBeInTheDocument();
      expect(screen.getByText("或 點擊選擇檔案")).toBeInTheDocument();
    });
  });

  describe("檔案類型驗證", () => {
    it("顯示 PDF 或 TXT 提示文字", () => {
      render(<FileUploader onFileSelect={vi.fn()} />);
      expect(screen.getByText("拖放 PDF 或 TXT 至此")).toBeInTheDocument();
    });

    it("input 接受 .pdf 和 .txt", () => {
      render(<FileUploader onFileSelect={vi.fn()} />);
      const input = document.querySelector(
        'input[type="file"]',
      ) as HTMLInputElement;
      expect(input.accept).toBe(".pdf,.txt");
    });
  });

  describe("收起態（collapsed=true）", () => {
    it("顯示檔名", () => {
      render(
        <FileUploader
          onFileSelect={vi.fn()}
          collapsed
          fileName="script.pdf"
          onReset={vi.fn()}
        />,
      );
      expect(screen.getByText("script.pdf")).toBeInTheDocument();
    });

    it("不顯示拖放提示", () => {
      render(
        <FileUploader
          onFileSelect={vi.fn()}
          collapsed
          fileName="script.pdf"
          onReset={vi.fn()}
        />,
      );
      expect(screen.queryByText("拖放 PDF 至此")).not.toBeInTheDocument();
    });

    it("點擊「重新選擇」呼叫 onReset", async () => {
      const user = userEvent.setup();
      const onReset = vi.fn();
      render(
        <FileUploader
          onFileSelect={vi.fn()}
          collapsed
          fileName="script.pdf"
          onReset={onReset}
        />,
      );
      await user.click(screen.getByText("重新選擇"));
      expect(onReset).toHaveBeenCalledOnce();
    });
  });
});
