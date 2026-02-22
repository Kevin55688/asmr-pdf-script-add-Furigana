import { useState } from "react";
import type { Tag } from "../services/libraryApi";

const PRESET_COLORS = ["#4ade80", "#facc15", "#f87171", "#60a5fa", "#c084fc", "#fb923c"];

interface Props {
  tags: Tag[];
  onCreateTag: (name: string, color: string) => void;
  onDeleteTag: (id: string) => void;
  onClose: () => void;
}

export function TagManager({ tags, onCreateTag, onDeleteTag, onClose }: Props) {
  const [name, setName] = useState("");
  const [color, setColor] = useState(PRESET_COLORS[0]);

  return (
    <>
      <div className="fixed inset-0 z-40 bg-black/20" onClick={onClose} />
      <div className="fixed left-1/2 top-1/2 z-50 w-80 -translate-x-1/2 -translate-y-1/2 rounded-lg border border-washi-border bg-paper p-4 shadow-xl">
        <div className="mb-3 flex items-center justify-between">
          <h3 className="font-semibold text-ink">Tag 管理</h3>
          <button onClick={onClose} className="text-ink-light hover:text-ink">✕</button>
        </div>

        {/* Existing Tags */}
        <div className="mb-4 space-y-1">
          {tags.map((tag) => (
            <div key={tag.id} className="flex items-center gap-2 rounded px-2 py-1 hover:bg-washi-border/20">
              <span className="h-3 w-3 rounded-full" style={{ backgroundColor: tag.color }} />
              <span className="flex-1 text-sm text-ink">{tag.name}</span>
              <button
                aria-label={`刪除 ${tag.name}`}
                onClick={() => onDeleteTag(tag.id)}
                className="text-xs text-ink-light hover:text-red-500"
              >
                ✕
              </button>
            </div>
          ))}
          {tags.length === 0 && <p className="text-xs text-ink-light">尚無 tag</p>}
        </div>

        {/* Create Tag */}
        <div className="space-y-2 border-t border-washi-border pt-3">
          <input
            placeholder="Tag 名稱"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full rounded border border-washi-border bg-washi px-2 py-1 text-sm text-ink focus:border-vermilion focus:outline-none"
          />
          <div className="flex gap-1">
            {PRESET_COLORS.map((c) => (
              <button
                key={c}
                onClick={() => setColor(c)}
                className={`h-5 w-5 rounded-full transition-transform ${color === c ? "scale-125 ring-2 ring-offset-1" : ""}`}
                style={{ backgroundColor: c }}
              />
            ))}
          </div>
          <button
            onClick={() => { if (name.trim()) { onCreateTag(name.trim(), color); setName(""); } }}
            disabled={!name.trim()}
            className="w-full rounded bg-vermilion py-1 text-sm font-medium text-white disabled:opacity-40"
          >
            新增
          </button>
        </div>
      </div>
    </>
  );
}
