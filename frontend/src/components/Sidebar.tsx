import { useState } from "react";
import type { Document, Folder, Library } from "../services/libraryApi";
import { FolderItem } from "./FolderItem";
import { DocumentContextMenu } from "./DocumentContextMenu";
import { FolderContextMenu } from "./FolderContextMenu";
import { TagManager } from "./TagManager";

interface SidebarProps {
  library: Library;
  selectedDocId: string | null;
  activeTags: string[];
  onSelectDocument: (doc: Document) => void;
  onCreateFolder: (name: string) => void;
  onRenameFolder: (id: string, name: string) => void;
  onDeleteFolder: (id: string) => void;
  onCreateDocument: (name: string, folderId: string) => void;
  onRenameDocument: (id: string, name: string) => void;
  onDeleteDocument: (id: string) => void;
  onMoveDocument: (docId: string, targetFolderId: string) => void;
  onUploadDocument: (doc: Document) => void;
  onCreateTag: (name: string, color: string) => void;
  onDeleteTag: (id: string) => void;
  onTagFilterChange: (tagIds: string[]) => void;
  onUpdateFolderTags: (id: string, tagIds: string[]) => void;
}

export function Sidebar({
  library,
  selectedDocId,
  activeTags,
  onSelectDocument,
  onCreateFolder,
  onRenameFolder,
  onDeleteFolder,
  onCreateDocument,
  onRenameDocument,
  onDeleteDocument,
  onMoveDocument,
  onUploadDocument,
  onCreateTag,
  onDeleteTag,
  onTagFilterChange,
  onUpdateFolderTags,
}: SidebarProps) {
  const [collapsed, setCollapsed] = useState(false);
  const [dragDocId, setDragDocId] = useState<string | null>(null);
  const [contextMenu, setContextMenu] = useState<{
    doc: Document;
    x: number;
    y: number;
  } | null>(null);
  const [showTagManager, setShowTagManager] = useState(false);
  const [folderContextMenu, setFolderContextMenu] = useState<{
    folder: Folder;
    x: number;
    y: number;
  } | null>(null);

  const filteredFolders = () => {
    if (activeTags.length === 0) return library.folders;
    return library.folders.filter((f) =>
      activeTags.every((tid) => (f.tagIds ?? []).includes(tid)),
    );
  };

  return (
    <div
      className={[
        "flex flex-shrink-0 flex-col border-r border-washi-border bg-paper transition-all",
        collapsed ? "w-10" : "w-64",
      ].join(" ")}
    >
      {/* Header — toggle button 始終在 DOM 中 */}
      <div className="flex items-center justify-between border-b border-washi-border px-2 py-2">
        {!collapsed && (
          <span className="text-xs font-semibold uppercase tracking-wider text-ink-light">
            文件庫
          </span>
        )}
        <button
          aria-label={collapsed ? "展開側邊欄" : "收合側邊欄"}
          onClick={() => setCollapsed((v) => !v)}
          className="ml-auto rounded p-1 text-ink-light hover:text-vermilion"
        >
          {collapsed ? "☰" : "←"}
        </button>
      </div>

      {!collapsed && (
        <>
          {/* Tag Filter */}
          {library.tags.length > 0 && (
            <div className="flex flex-wrap gap-1 border-b border-washi-border px-3 py-2">
              {library.tags.map((tag) => {
                const active = activeTags.includes(tag.id);
                return (
                  <button
                    key={tag.id}
                    onClick={() =>
                      onTagFilterChange(
                        active
                          ? activeTags.filter((id) => id !== tag.id)
                          : [...activeTags, tag.id],
                      )
                    }
                    className={[
                      "rounded-full px-2 py-0.5 text-[11px] font-medium transition-all",
                      active
                        ? "text-white ring-2 ring-offset-1"
                        : "opacity-60 hover:opacity-100",
                    ].join(" ")}
                    style={{ backgroundColor: tag.color }}
                  >
                    {tag.name}
                  </button>
                );
              })}
            </div>
          )}

          {/* Folder List */}
          <div className="flex-1 overflow-y-auto px-2 py-2">
            {filteredFolders().map((folder) => (
              <FolderItem
                key={folder.id}
                folder={folder}
                documents={library.documents.filter(
                  (d) => d.folderId === folder.id,
                )}
                tags={library.tags}
                selectedDocId={selectedDocId}
                onSelectDocument={(doc) => {
                  if (doc.htmlFile) onSelectDocument(doc);
                  else onUploadDocument(doc);
                }}
                onDocumentContextMenu={(e, doc) =>
                  setContextMenu({ doc, x: e.clientX, y: e.clientY })
                }
                onDocumentDragStart={(e, doc) => {
                  setDragDocId(doc.id);
                  e.dataTransfer.effectAllowed = "move";
                }}
                onDrop={(_, folderId) => {
                  if (dragDocId) onMoveDocument(dragDocId, folderId);
                  setDragDocId(null);
                }}
                onAddDocument={(folderId, name) =>
                  onCreateDocument(name, folderId)
                }
                onUpdateFolderTags={onUpdateFolderTags}
                onContextMenu={(e, f) =>
                  setFolderContextMenu({ folder: f, x: e.clientX, y: e.clientY })
                }
              />
            ))}
          </div>

          {/* Footer */}
          <div className="border-t border-washi-border px-3 py-2">
            <button
              onClick={() => {
                const name = window.prompt("資料夾名稱");
                if (name?.trim()) onCreateFolder(name.trim());
              }}
              className="w-full rounded border border-dashed border-washi-border py-1 text-xs text-ink-light transition-colors hover:border-vermilion hover:text-vermilion"
            >
              + 新增資料夾
            </button>
            <button
              onClick={() => setShowTagManager(true)}
              className="mt-1 w-full rounded border border-dashed border-washi-border py-1 text-xs text-ink-light transition-colors hover:border-vermilion hover:text-vermilion"
            >
              🏷 管理 Tag
            </button>
          </div>
        </>
      )}
      {contextMenu && (
        <DocumentContextMenu
          doc={contextMenu.doc}
          folders={library.folders}
          x={contextMenu.x}
          y={contextMenu.y}
          onClose={() => setContextMenu(null)}
          onRename={(id, name) => {
            onRenameDocument(id, name);
            setContextMenu(null);
          }}
          onDelete={(id) => {
            onDeleteDocument(id);
            setContextMenu(null);
          }}
          onMove={(docId, folderId) => {
            onMoveDocument(docId, folderId);
            setContextMenu(null);
          }}
          onUpload={(doc) => {
            onUploadDocument(doc);
            setContextMenu(null);
          }}
        />
      )}
      {folderContextMenu && (
        <FolderContextMenu
          folder={folderContextMenu.folder}
          x={folderContextMenu.x}
          y={folderContextMenu.y}
          onClose={() => setFolderContextMenu(null)}
          onRename={(id, name) => {
            onRenameFolder(id, name);
            setFolderContextMenu(null);
          }}
          onDelete={(id) => {
            onDeleteFolder(id);
            setFolderContextMenu(null);
          }}
        />
      )}
      {showTagManager && (
        <TagManager
          tags={library.tags}
          onCreateTag={onCreateTag}
          onDeleteTag={onDeleteTag}
          onClose={() => setShowTagManager(false)}
        />
      )}
    </div>
  );
}
