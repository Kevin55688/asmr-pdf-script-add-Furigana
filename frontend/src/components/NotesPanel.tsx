import { useState } from "react";

interface Props {
  initialNotes: string;
  onSave: (notes: string) => void;
}

export function NotesPanel({ initialNotes, onSave }: Props) {
  const [open, setOpen] = useState(false);
  const [text, setText] = useState(initialNotes);

  return (
    <div className="fixed bottom-6 right-6 z-30 flex flex-col items-end gap-2">
      {open && (
        <div className="w-64 rounded-lg border border-washi-border bg-paper shadow-lg">
          <div className="border-b border-washi-border px-3 py-2 text-xs font-medium text-ink-light">
            備註
          </div>
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            onBlur={() => onSave(text)}
            rows={5}
            className="w-full resize-none rounded-b-lg bg-washi p-3 text-sm text-ink focus:outline-none"
            placeholder="在這裡寫下備註…"
          />
        </div>
      )}
      <button
        aria-label="備註"
        onClick={() => setOpen((v) => !v)}
        className={[
          "rounded-full px-4 py-2 text-sm font-medium shadow-md transition-colors",
          open
            ? "bg-vermilion text-white"
            : "bg-paper text-ink hover:bg-vermilion hover:text-white",
        ].join(" ")}
      >
        {open ? "✕" : "備註"}
      </button>
    </div>
  );
}
