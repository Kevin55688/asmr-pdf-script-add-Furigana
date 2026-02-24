import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import { FolderItem } from "./FolderItem";
import type { Folder } from "../services/libraryApi";

const folder: Folder = { id: "f-001", name: "ASMR", order: 0 };
const noop = vi.fn();

describe("FolderItem", () => {
  it("calls onContextMenu when right-clicked on folder row", () => {
    const onContextMenu = vi.fn();
    render(
      <FolderItem
        folder={folder}
        documents={[]}
        tags={[]}
        selectedDocId={null}
        onSelectDocument={noop}
        onDocumentContextMenu={noop}
        onDocumentDragStart={noop}
        onDrop={noop}
        onAddDocument={noop}
        onUpdateFolderTags={noop}
        onContextMenu={onContextMenu}
      />,
    );
    fireEvent.contextMenu(screen.getByText("ASMR"));
    expect(onContextMenu).toHaveBeenCalled();
  });
});
