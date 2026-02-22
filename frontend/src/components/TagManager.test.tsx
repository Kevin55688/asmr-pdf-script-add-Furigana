import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import { TagManager } from "./TagManager";
import type { Tag } from "../services/libraryApi";

const tags: Tag[] = [{ id: "t-001", name: "完成", color: "#4ade80" }];

describe("TagManager", () => {
  it("lists existing tags", () => {
    render(
      <TagManager
        tags={tags}
        onCreateTag={vi.fn()}
        onDeleteTag={vi.fn()}
        onClose={vi.fn()}
      />,
    );
    expect(screen.getByText("完成")).toBeInTheDocument();
  });

  it("calls onCreateTag when form submitted", () => {
    const onCreate = vi.fn();
    render(
      <TagManager
        tags={[]}
        onCreateTag={onCreate}
        onDeleteTag={vi.fn()}
        onClose={vi.fn()}
      />,
    );
    fireEvent.change(screen.getByPlaceholderText("Tag 名稱"), {
      target: { value: "進行中" },
    });
    fireEvent.click(screen.getByText("新增"));
    expect(onCreate).toHaveBeenCalledWith("進行中", expect.any(String));
  });

  it("calls onDeleteTag when delete clicked", () => {
    const onDelete = vi.fn();
    render(
      <TagManager
        tags={tags}
        onCreateTag={vi.fn()}
        onDeleteTag={onDelete}
        onClose={vi.fn()}
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: "刪除 完成" }));
    expect(onDelete).toHaveBeenCalledWith("t-001");
  });
});
