import { useState } from "react";
import type { Document, Folder } from "../services/libraryApi";

interface Props {
  doc: Document;
  folders: Folder[];
  x: number;
  y: number;
  onClose: () => void;
  onRename: (id: string, name: string) => void;
  onDelete: (id: string) => void;
  onMove: (docId: string, folderId: string) => void;
  onUpload: (doc: Document) => void;
}

export function DocumentContextMenu({ doc, folders, x, y, onClose, onRename, onDelete, onMove, onUpload }: Props) {
  const [showMove, setShowMove] = useState(false);

  const otherFolders = folders.filter((f) => f.id !== doc.folderId);

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 z-40" onClick={onClose} />
      {/* Menu */}
      <div
        className="fixed z-50 min-w-[140px] rounded border border-washi-border bg-paper shadow-lg"
        style={{ top: y, left: x }}
      >
        {!doc.htmlFile && (
          <button
            className="w-full px-4 py-2 text-left text-sm text-ink hover:bg-washi-border/40"
            onClick={() => { onUpload(doc); onClose(); }}
          >
            上傳檔案
          </button>
        )}
        <button
          className="w-full px-4 py-2 text-left text-sm text-ink hover:bg-washi-border/40"
          onClick={() => {
            const name = window.prompt("新名稱", doc.name);
            if (name?.trim()) onRename(doc.id, name.trim());
            onClose();
          }}
        >
          重新命名
        </button>
        <div className="relative">
          <button
            className="w-full px-4 py-2 text-left text-sm text-ink hover:bg-washi-border/40"
            onClick={() => setShowMove((v) => !v)}
          >
            移動到
          </button>
          {showMove && (
            <div className="absolute left-full top-0 min-w-[120px] rounded border border-washi-border bg-paper shadow-lg">
              {otherFolders.map((f) => (
                <button
                  key={f.id}
                  className="w-full px-4 py-2 text-left text-sm text-ink hover:bg-washi-border/40"
                  onClick={() => { onMove(doc.id, f.id); onClose(); }}
                >
                  {f.name}
                </button>
              ))}
              {otherFolders.length === 0 && (
                <p className="px-4 py-2 text-xs text-ink-light">無其他資料夾</p>
              )}
            </div>
          )}
        </div>
        <hr className="border-washi-border" />
        <button
          className="w-full px-4 py-2 text-left text-sm text-red-500 hover:bg-red-50"
          onClick={() => { onDelete(doc.id); onClose(); }}
        >
          刪除
        </button>
      </div>
    </>
  );
}
