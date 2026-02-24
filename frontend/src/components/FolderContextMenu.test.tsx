import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import { FolderContextMenu } from "./FolderContextMenu";
import type { Folder } from "../services/libraryApi";

const folder: Folder = { id: "f-001", name: "ASMR", order: 0 };

describe("FolderContextMenu", () => {
  it("renders rename and delete options", () => {
    render(
      <FolderContextMenu
        folder={folder}
        x={0}
        y={0}
        onClose={vi.fn()}
        onRename={vi.fn()}
        onDelete={vi.fn()}
      />,
    );
    expect(screen.getByText("重新命名")).toBeInTheDocument();
    expect(screen.getByText("刪除")).toBeInTheDocument();
  });

  it("calls onRename with new name when rename clicked", () => {
    const onRename = vi.fn();
    vi.stubGlobal("prompt", vi.fn().mockReturnValueOnce("新資料夾"));
    render(
      <FolderContextMenu
        folder={folder}
        x={0}
        y={0}
        onClose={vi.fn()}
        onRename={onRename}
        onDelete={vi.fn()}
      />,
    );
    fireEvent.click(screen.getByText("重新命名"));
    expect(onRename).toHaveBeenCalledWith("f-001", "新資料夾");
  });

  it("calls onDelete when delete clicked", () => {
    const onDelete = vi.fn();
    vi.stubGlobal("confirm", vi.fn().mockReturnValueOnce(true));
    render(
      <FolderContextMenu
        folder={folder}
        x={0}
        y={0}
        onClose={vi.fn()}
        onRename={vi.fn()}
        onDelete={onDelete}
      />,
    );
    fireEvent.click(screen.getByText("刪除"));
    expect(onDelete).toHaveBeenCalledWith("f-001");
  });

  it("does not call onDelete when confirm is cancelled", () => {
    const onDelete = vi.fn();
    vi.stubGlobal("confirm", vi.fn().mockReturnValueOnce(false));
    render(
      <FolderContextMenu
        folder={folder}
        x={0}
        y={0}
        onClose={vi.fn()}
        onRename={vi.fn()}
        onDelete={onDelete}
      />,
    );
    fireEvent.click(screen.getByText("刪除"));
    expect(onDelete).not.toHaveBeenCalled();
  });

  it("calls onClose when backdrop clicked", () => {
    const onClose = vi.fn();
    render(
      <FolderContextMenu
        folder={folder}
        x={0}
        y={0}
        onClose={onClose}
        onRename={vi.fn()}
        onDelete={vi.fn()}
      />,
    );
    // backdrop is the fixed inset-0 div
    fireEvent.click(document.querySelector(".fixed.inset-0")!);
    expect(onClose).toHaveBeenCalled();
  });
});
