import { useMemo, useState } from 'react';
import { HtmlPreview } from './HtmlPreview';

interface PagedPreviewProps {
  html: string;
  pageCount: number;
}

export function PagedPreview({ html, pageCount }: PagedPreviewProps) {
  const [currentPage, setCurrentPage] = useState(1);
  const [inputValue, setInputValue] = useState('1');

  const pages = useMemo(() => {
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, 'text/html');
    const sections = doc.querySelectorAll('section.page');
    return Array.from(sections).map((s) => s.outerHTML);
  }, [html]);

  function goToPage(page: number) {
    const clamped = Math.max(1, Math.min(page, pageCount));
    setCurrentPage(clamped);
    setInputValue(String(clamped));
  }

  return (
    <div className="mt-6">
      {/* 導覽列 — 和風書冊式，頂端朱紅細線 */}
      <div className="relative sticky top-0 z-10 flex items-center justify-center gap-3 border-b border-washi-border bg-paper px-6 py-3 shadow-sm">
        {/* 朱紅頂端裝飾線 */}
        <div className="absolute inset-x-0 top-0 h-[2px] bg-vermilion" />

        <button
          aria-label="上一頁"
          onClick={() => goToPage(currentPage - 1)}
          disabled={currentPage === 1}
          className="flex items-center gap-1 rounded border border-vermilion px-3 py-1 text-sm font-medium text-vermilion transition-all duration-150 hover:bg-vermilion hover:text-white disabled:cursor-not-allowed disabled:border-washi-border disabled:text-ink-light"
        >
          ← 上一頁
        </button>

        <div className="flex items-center gap-2">
          <input
            type="number"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                const n = parseInt(inputValue, 10);
                goToPage(isNaN(n) ? currentPage : n);
              }
            }}
            className="w-12 rounded border border-washi-border bg-washi py-1 text-center text-sm font-medium text-ink focus:border-vermilion focus:outline-none focus:ring-1 focus:ring-vermilion/20 [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
            min={1}
            max={pageCount}
          />
          <span className="text-sm text-ink-light">/ {pageCount}</span>
        </div>

        <button
          aria-label="下一頁"
          onClick={() => goToPage(currentPage + 1)}
          disabled={currentPage === pageCount}
          className="flex items-center gap-1 rounded border border-vermilion px-3 py-1 text-sm font-medium text-vermilion transition-all duration-150 hover:bg-vermilion hover:text-white disabled:cursor-not-allowed disabled:border-washi-border disabled:text-ink-light"
        >
          下一頁 →
        </button>
      </div>

      {/* 內容區 */}
      <HtmlPreview html={pages[currentPage - 1] ?? ''} pageCount={pageCount} />
    </div>
  );
}
