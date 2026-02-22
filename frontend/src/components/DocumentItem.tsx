import type { Document } from "../services/libraryApi";

interface Props {
  doc: Document;
  isSelected: boolean;
  onClick: (doc: Document) => void;
  onContextMenu: (e: React.MouseEvent, doc: Document) => void;
  onDragStart: (e: React.DragEvent, doc: Document) => void;
}

export function DocumentItem({ doc, isSelected, onClick, onContextMenu, onDragStart }: Props) {
  const isUploaded = doc.htmlFile !== null;
  return (
    <div
      data-uploaded={String(isUploaded)}
      draggable
      onDragStart={(e) => onDragStart(e, doc)}
      onContextMenu={(e) => { e.preventDefault(); onContextMenu(e, doc); }}
      onClick={() => onClick(doc)}
      className={[
        "flex cursor-pointer items-center gap-2 rounded px-3 py-1.5 text-sm transition-colors",
        isSelected
          ? "bg-vermilion/10 text-vermilion font-medium"
          : "text-ink hover:bg-washi-border/40",
        !isUploaded && "opacity-60",
      ]
        .filter(Boolean)
        .join(" ")}
    >
      <span className={`text-xs ${isUploaded ? "text-vermilion" : "text-ink-light"}`}>
        {isUploaded ? "📄" : "📋"}
      </span>
      <span className="truncate">{doc.name}</span>
      {!isUploaded && (
        <span className="ml-auto rounded border border-dashed border-ink-light px-1 text-[10px] text-ink-light">
          未上傳
        </span>
      )}
    </div>
  );
}
