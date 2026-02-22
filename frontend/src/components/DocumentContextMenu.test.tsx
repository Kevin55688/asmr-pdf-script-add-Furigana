import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import { DocumentContextMenu } from "./DocumentContextMenu";
import type { Document, Folder } from "../services/libraryApi";

const doc: Document = {
  id: "doc-001",
  name: "腳本",
  folderId: "f-001",
  tagIds: [],
  htmlFile: "doc-001.html",
  lastPage: 0,
  notes: "",
  translations: {},
  createdAt: "",
  uploadedAt: "2026-02-22",
};
const folders: Folder[] = [
  { id: "f-001", name: "ASMR", order: 0 },
  { id: "f-002", name: "其他", order: 1 },
];

describe("DocumentContextMenu", () => {
  it("renders menu items for uploaded document", () => {
    render(
      <DocumentContextMenu
        doc={doc}
        folders={folders}
        x={0}
        y={0}
        onClose={vi.fn()}
        onRename={vi.fn()}
        onDelete={vi.fn()}
        onMove={vi.fn()}
        onUpload={vi.fn()}
      />,
    );
    expect(screen.getByText("重新命名")).toBeInTheDocument();
    expect(screen.getByText("刪除")).toBeInTheDocument();
    expect(screen.getByText("移動到")).toBeInTheDocument();
  });

  it("shows upload option for unuploaded document", () => {
    const unuploaded = { ...doc, htmlFile: null, uploadedAt: null };
    render(
      <DocumentContextMenu
        doc={unuploaded}
        folders={folders}
        x={0}
        y={0}
        onClose={vi.fn()}
        onRename={vi.fn()}
        onDelete={vi.fn()}
        onMove={vi.fn()}
        onUpload={vi.fn()}
      />,
    );
    expect(screen.getByText("上傳檔案")).toBeInTheDocument();
  });

  it("calls onRename when rename clicked", () => {
    const onRename = vi.fn();
    vi.stubGlobal("prompt", vi.fn().mockReturnValueOnce("新名稱"));
    render(
      <DocumentContextMenu
        doc={doc}
        folders={folders}
        x={0}
        y={0}
        onClose={vi.fn()}
        onRename={onRename}
        onDelete={vi.fn()}
        onMove={vi.fn()}
        onUpload={vi.fn()}
      />,
    );
    fireEvent.click(screen.getByText("重新命名"));
    expect(onRename).toHaveBeenCalledWith(doc.id, "新名稱");
  });

  it("calls onMove with target folder", () => {
    const onMove = vi.fn();
    render(
      <DocumentContextMenu
        doc={doc}
        folders={folders}
        x={0}
        y={0}
        onClose={vi.fn()}
        onRename={vi.fn()}
        onDelete={vi.fn()}
        onMove={onMove}
        onUpload={vi.fn()}
      />,
    );
    fireEvent.click(screen.getByText("移動到"));
    fireEvent.click(screen.getByText("其他"));
    expect(onMove).toHaveBeenCalledWith(doc.id, "f-002");
  });
});
