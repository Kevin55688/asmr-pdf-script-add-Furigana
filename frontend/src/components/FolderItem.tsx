import { useState } from "react";
import type { Document, Folder } from "../services/libraryApi";
import { DocumentItem } from "./DocumentItem";

interface Props {
  folder: Folder;
  documents: Document[];
  selectedDocId: string | null;
  onSelectDocument: (doc: Document) => void;
  onDocumentContextMenu: (e: React.MouseEvent, doc: Document) => void;
  onDocumentDragStart: (e: React.DragEvent, doc: Document) => void;
  onDrop: (e: React.DragEvent, folderId: string) => void;
}

export function FolderItem({
  folder,
  documents,
  selectedDocId,
  onSelectDocument,
  onDocumentContextMenu,
  onDocumentDragStart,
  onDrop,
}: Props) {
  const [expanded, setExpanded] = useState(true);
  const [isDragOver, setIsDragOver] = useState(false);

  return (
    <div>
      <div
        className={[
          "flex cursor-pointer items-center gap-2 rounded px-2 py-1.5 text-sm font-medium transition-colors",
          isDragOver ? "bg-vermilion/10 ring-1 ring-vermilion" : "hover:bg-washi-border/40",
        ].join(" ")}
        onClick={() => setExpanded((v) => !v)}
        onDragOver={(e) => { e.preventDefault(); setIsDragOver(true); }}
        onDragLeave={() => setIsDragOver(false)}
        onDrop={(e) => { setIsDragOver(false); onDrop(e, folder.id); }}
      >
        <span className="text-xs text-ink-light">{expanded ? "▼" : "▶"}</span>
        <span className="truncate text-ink">{folder.name}</span>
        <span className="ml-auto text-xs text-ink-light">{documents.length}</span>
      </div>

      {expanded && (
        <div className="ml-4">
          {documents.map((doc) => (
            <DocumentItem
              key={doc.id}
              doc={doc}
              isSelected={doc.id === selectedDocId}
              onClick={onSelectDocument}
              onContextMenu={onDocumentContextMenu}
              onDragStart={onDocumentDragStart}
            />
          ))}
        </div>
      )}
    </div>
  );
}
