import type { Folder } from "../services/libraryApi";

interface Props {
  folder: Folder;
  x: number;
  y: number;
  onClose: () => void;
  onRename: (id: string, name: string) => void;
  onDelete: (id: string) => void;
}

export function FolderContextMenu({ folder, x, y, onClose, onRename, onDelete }: Props) {
  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 z-40" onClick={onClose} />
      {/* Menu */}
      <div
        className="fixed z-50 min-w-[140px] rounded border border-washi-border bg-paper shadow-lg"
        style={{ top: y, left: x }}
      >
        <button
          className="w-full px-4 py-2 text-left text-sm text-ink hover:bg-washi-border/40"
          onClick={() => {
            const name = window.prompt("新名稱", folder.name);
            if (name?.trim()) onRename(folder.id, name.trim());
            onClose();
          }}
        >
          重新命名
        </button>
        <hr className="border-washi-border" />
        <button
          className="w-full px-4 py-2 text-left text-sm text-red-500 hover:bg-red-50"
          onClick={() => {
            if (window.confirm(`確定刪除資料夾「${folder.name}」及其所有文件？`)) {
              onDelete(folder.id);
            }
            onClose();
          }}
        >
          刪除
        </button>
      </div>
    </>
  );
}
