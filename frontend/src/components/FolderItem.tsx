import { useState } from "react";
import type { Document, Folder, Tag } from "../services/libraryApi";
import { DocumentItem } from "./DocumentItem";

interface Props {
  folder: Folder;
  documents: Document[];
  tags: Tag[];
  selectedDocId: string | null;
  onSelectDocument: (doc: Document) => void;
  onDocumentContextMenu: (e: React.MouseEvent, doc: Document) => void;
  onDocumentDragStart: (e: React.DragEvent, doc: Document) => void;
  onDrop: (e: React.DragEvent, folderId: string) => void;
  onAddDocument: (folderId: string, name: string) => void;
  onUpdateFolderTags: (folderId: string, tagIds: string[]) => void;
}

export function FolderItem({
  folder,
  documents,
  tags,
  selectedDocId,
  onSelectDocument,
  onDocumentContextMenu,
  onDocumentDragStart,
  onDrop,
  onAddDocument,
  onUpdateFolderTags,
}: Props) {
  const [expanded, setExpanded] = useState(true);
  const [isDragOver, setIsDragOver] = useState(false);
  const [showTagPicker, setShowTagPicker] = useState(false);

  const toggleFolderTag = (tagId: string) => {
    const current = folder.tagIds ?? [];
    const next = current.includes(tagId)
      ? current.filter((id) => id !== tagId)
      : [...current, tagId];
    onUpdateFolderTags(folder.id, next);
  };

  return (
    <div className="relative">
      <div
        className={[
          "group flex cursor-pointer items-center gap-2 rounded px-2 py-1.5 text-sm font-medium transition-colors",
          isDragOver
            ? "bg-vermilion/10 ring-1 ring-vermilion"
            : "hover:bg-washi-border/40",
        ].join(" ")}
        onClick={() => setExpanded((v) => !v)}
        onDragOver={(e) => {
          e.preventDefault();
          setIsDragOver(true);
        }}
        onDragLeave={() => setIsDragOver(false)}
        onDrop={(e) => {
          setIsDragOver(false);
          onDrop(e, folder.id);
        }}
      >
        <span className="text-xs text-ink-light">{expanded ? "▼" : "▶"}</span>
        <span className="truncate text-ink">{folder.name}</span>

        {/* Tag 色點 */}
        {(folder.tagIds ?? []).length > 0 && (
          <span className="flex gap-0.5">
            {(folder.tagIds ?? []).map((tid) => {
              const tag = tags.find((t) => t.id === tid);
              return tag ? (
                <span
                  key={tid}
                  className="h-2 w-2 rounded-full"
                  style={{ backgroundColor: tag.color }}
                />
              ) : null;
            })}
          </span>
        )}

        {/* Tag 設定按鈕 */}
        <button
          aria-label="設定資料夾 Tag"
          onClick={(e) => {
            e.stopPropagation();
            setShowTagPicker((v) => !v);
          }}
          className="ml-auto rounded p-0.5 text-xs text-ink-light opacity-0 transition-opacity group-hover:opacity-100 hover:text-vermilion"
        >
          🏷
        </button>

        <span className="text-xs text-ink-light">{documents.length}</span>
      </div>

      {/* Tag Picker 下拉 */}
      {showTagPicker && tags.length > 0 && (
        <div
          className="absolute right-0 top-8 z-20 min-w-[120px] rounded border border-washi-border bg-paper shadow-md"
          onMouseLeave={() => setShowTagPicker(false)}
        >
          {tags.map((tag) => {
            const checked = (folder.tagIds ?? []).includes(tag.id);
            return (
              <label
                key={tag.id}
                aria-label={`Tag: ${tag.name}`}
                className="flex cursor-pointer items-center gap-2 px-3 py-1.5 text-xs text-ink hover:bg-washi-border/30"
              >
                <input
                  type="checkbox"
                  checked={checked}
                  onChange={() => toggleFolderTag(tag.id)}
                  className="accent-vermilion"
                />
                <span
                  className="h-2 w-2 rounded-full"
                  style={{ backgroundColor: tag.color }}
                />
                {tag.name}
              </label>
            );
          })}
        </div>
      )}

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
          <button
            onClick={() => {
              const name = window.prompt("文件名稱");
              if (name?.trim()) onAddDocument(folder.id, name.trim());
            }}
            className="mt-1 w-full rounded px-3 py-1 text-left text-xs text-ink-light transition-colors hover:text-vermilion"
          >
            + 新增文件
          </button>
        </div>
      )}
    </div>
  );
}
