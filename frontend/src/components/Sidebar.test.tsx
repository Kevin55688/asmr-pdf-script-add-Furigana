import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import { Sidebar } from "./Sidebar";
import type { Library } from "../services/libraryApi";

const mockLibrary: Library = {
  folders: [{ id: "f-001", name: "ASMR", order: 0 }],
  tags: [{ id: "t-001", name: "完成", color: "#4ade80" }],
  documents: [
    {
      id: "doc-001",
      name: "腳本 Vol.1",
      folderId: "f-001",
      tagIds: [],
      htmlFile: "doc-001.html",
      lastPage: 0,
      notes: "",
      translations: {},
      createdAt: "",
      uploadedAt: "2026-02-22",
    },
    {
      id: "doc-002",
      name: "草稿",
      folderId: "f-001",
      tagIds: [],
      htmlFile: null,
      lastPage: 0,
      notes: "",
      translations: {},
      createdAt: "",
      uploadedAt: null,
    },
  ],
};

const noop = vi.fn();

describe("Sidebar", () => {
  it("renders folder name", () => {
    render(
      <Sidebar
        library={mockLibrary}
        selectedDocId={null}
        activeTags={[]}
        onSelectDocument={noop}
        onCreateFolder={noop}
        onRenameFolder={noop}
        onDeleteFolder={noop}
        onCreateDocument={noop}
        onRenameDocument={noop}
        onDeleteDocument={noop}
        onMoveDocument={noop}
        onUploadDocument={noop}
        onCreateTag={noop}
        onDeleteTag={noop}
        onTagFilterChange={noop}
      />
    );
    expect(screen.getByText("ASMR")).toBeInTheDocument();
  });

  it("shows documents in folder", () => {
    render(
      <Sidebar
        library={mockLibrary}
        selectedDocId={null}
        activeTags={[]}
        onSelectDocument={noop}
        onCreateFolder={noop}
        onRenameFolder={noop}
        onDeleteFolder={noop}
        onCreateDocument={noop}
        onRenameDocument={noop}
        onDeleteDocument={noop}
        onMoveDocument={noop}
        onUploadDocument={noop}
        onCreateTag={noop}
        onDeleteTag={noop}
        onTagFilterChange={noop}
      />
    );
    expect(screen.getByText("腳本 Vol.1")).toBeInTheDocument();
    expect(screen.getByText("草稿")).toBeInTheDocument();
  });

  it("can collapse and expand", () => {
    render(
      <Sidebar
        library={mockLibrary}
        selectedDocId={null}
        activeTags={[]}
        onSelectDocument={noop}
        onCreateFolder={noop}
        onRenameFolder={noop}
        onDeleteFolder={noop}
        onCreateDocument={noop}
        onRenameDocument={noop}
        onDeleteDocument={noop}
        onMoveDocument={noop}
        onUploadDocument={noop}
        onCreateTag={noop}
        onDeleteTag={noop}
        onTagFilterChange={noop}
      />
    );
    const toggleBtn = screen.getByRole("button", { name: /收合側邊欄|展開側邊欄/ });
    fireEvent.click(toggleBtn);
    expect(screen.queryByText("ASMR")).not.toBeInTheDocument();
    fireEvent.click(toggleBtn);
    expect(screen.getByText("ASMR")).toBeInTheDocument();
  });

  it("calls onSelectDocument when uploaded document clicked", () => {
    const onSelect = vi.fn();
    render(
      <Sidebar
        library={mockLibrary}
        selectedDocId={null}
        activeTags={[]}
        onSelectDocument={onSelect}
        onCreateFolder={noop}
        onRenameFolder={noop}
        onDeleteFolder={noop}
        onCreateDocument={noop}
        onRenameDocument={noop}
        onDeleteDocument={noop}
        onMoveDocument={noop}
        onUploadDocument={noop}
        onCreateTag={noop}
        onDeleteTag={noop}
        onTagFilterChange={noop}
      />
    );
    fireEvent.click(screen.getByText("腳本 Vol.1"));
    expect(onSelect).toHaveBeenCalledWith(mockLibrary.documents[0]);
  });

  it("未上傳文件顯示上傳標示", () => {
    render(
      <Sidebar
        library={mockLibrary}
        selectedDocId={null}
        activeTags={[]}
        onSelectDocument={noop}
        onCreateFolder={noop}
        onRenameFolder={noop}
        onDeleteFolder={noop}
        onCreateDocument={noop}
        onRenameDocument={noop}
        onDeleteDocument={noop}
        onMoveDocument={noop}
        onUploadDocument={noop}
        onCreateTag={noop}
        onDeleteTag={noop}
        onTagFilterChange={noop}
      />
    );
    const draft = screen.getByText("草稿").closest("[data-uploaded]");
    expect(draft?.getAttribute("data-uploaded")).toBe("false");
  });

  it("tag 篩選隱藏不符合的文件", () => {
    const libraryWithTag: Library = {
      ...mockLibrary,
      documents: [
        { ...mockLibrary.documents[0], tagIds: ["t-001"] },
        { ...mockLibrary.documents[1], tagIds: [] },
      ],
    };
    render(
      <Sidebar
        library={libraryWithTag}
        selectedDocId={null}
        activeTags={["t-001"]}
        onSelectDocument={noop}
        onCreateFolder={noop}
        onRenameFolder={noop}
        onDeleteFolder={noop}
        onCreateDocument={noop}
        onRenameDocument={noop}
        onDeleteDocument={noop}
        onMoveDocument={noop}
        onUploadDocument={noop}
        onCreateTag={noop}
        onDeleteTag={noop}
        onTagFilterChange={noop}
      />
    );
    expect(screen.getByText("腳本 Vol.1")).toBeInTheDocument();
    expect(screen.queryByText("草稿")).not.toBeInTheDocument();
  });
});
