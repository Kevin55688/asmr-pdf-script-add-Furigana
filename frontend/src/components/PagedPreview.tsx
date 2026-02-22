import { useCallback, useEffect, useMemo, useState } from 'react';
import { translateTexts } from '../services/api';
import { HtmlPreview } from './HtmlPreview';

interface PagedPreviewProps {
  html: string;
  pageCount: number;
}

const PROVIDERS = [
  { value: 'deepl', label: 'DeepL' },
  { value: 'google', label: 'Google' },
  { value: 'claude', label: 'Claude AI' },
] as const;

const LANGUAGES = [
  { value: 'zh-TW', label: '繁體中文' },
  { value: 'zh-CN', label: '簡體中文' },
  { value: 'en', label: 'English' },
  { value: 'ko', label: '한국어' },
] as const;

type Provider = (typeof PROVIDERS)[number]['value'];
type Language = (typeof LANGUAGES)[number]['value'];

export function PagedPreview({ html, pageCount }: PagedPreviewProps) {
  const [currentPage, setCurrentPage] = useState(1);
  const [inputValue, setInputValue] = useState('1');

  // Toggle 狀態
  const [showRuby, setShowRuby] = useState(true);
  const [showTranslation, setShowTranslation] = useState(false);
  const [provider, setProvider] = useState<Provider>('deepl');
  const [targetLang, setTargetLang] = useState<Language>('zh-TW');

  // 翻譯 cache：key = "provider|lang|pageNum"
  const [translationCache, setTranslationCache] = useState<Record<string, string[]>>({});
  const [isTranslating, setIsTranslating] = useState(false);
  const [translationError, setTranslationError] = useState<string | null>(null);

  // 解析頁面 HTML
  const pages = useMemo(() => {
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, 'text/html');
    const sections = doc.querySelectorAll('section.page');
    return Array.from(sections).map((s) => s.outerHTML);
  }, [html]);

  // 從當前頁 HTML 提取段落文字（送給翻譯 API）
  const currentPageTexts = useMemo(() => {
    const pageHtml = pages[currentPage - 1] ?? '';
    if (!pageHtml) return [];
    const parser = new DOMParser();
    const doc = parser.parseFromString(pageHtml, 'text/html');
    return Array.from(doc.querySelectorAll('p')).map((p) => p.textContent ?? '');
  }, [pages, currentPage]);

  const cacheKey = `${provider}|${targetLang}|${currentPage}`;

  // 翻譯邏輯
  const fetchTranslation = useCallback(async () => {
    if (!showTranslation || currentPageTexts.length === 0) return;
    if (translationCache[cacheKey]) return; // cache hit

    setIsTranslating(true);
    setTranslationError(null);
    try {
      const result = await translateTexts(currentPageTexts, provider, targetLang);
      setTranslationCache((prev) => ({ ...prev, [cacheKey]: result }));
    } catch (e) {
      setTranslationError(e instanceof Error ? e.message : '翻譯失敗');
    } finally {
      setIsTranslating(false);
    }
  }, [showTranslation, currentPageTexts, cacheKey, provider, targetLang, translationCache]);

  // 開啟翻譯、換頁、換語言、換供應商時觸發翻譯
  useEffect(() => {
    fetchTranslation();
  }, [fetchTranslation]);

  function goToPage(page: number) {
    const clamped = Math.max(1, Math.min(page, pageCount));
    setCurrentPage(clamped);
    setInputValue(String(clamped));
  }

  const currentTranslations = translationCache[cacheKey];

  return (
    <div className="mt-6">
      {/* 主導覽列 */}
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

      {/* 控制列 */}
      <div className="flex flex-wrap items-center gap-4 border-b border-washi-border bg-washi px-6 py-2 text-sm">
        {/* 振り仮名 Toggle */}
        <label className="flex cursor-pointer items-center gap-2 text-ink">
          <input
            aria-label="振り仮名"
            type="checkbox"
            checked={showRuby}
            onChange={(e) => setShowRuby(e.target.checked)}
            className="accent-vermilion"
          />
          振り仮名
        </label>

        {/* 翻譯 Toggle */}
        <label className="flex cursor-pointer items-center gap-2 text-ink">
          <input
            aria-label="翻譯"
            type="checkbox"
            checked={showTranslation}
            onChange={(e) => setShowTranslation(e.target.checked)}
            className="accent-vermilion"
          />
          翻譯
        </label>

        {/* 語言與供應商選單（翻譯開啟時才顯示） */}
        {showTranslation && (
          <>
            <label className="flex items-center gap-1 text-ink-light">
              <span>語言</span>
              <select
                aria-label="目標語言"
                value={targetLang}
                onChange={(e) => setTargetLang(e.target.value as Language)}
                className="rounded border border-washi-border bg-paper px-1 py-0.5 text-ink focus:border-vermilion focus:outline-none"
              >
                {LANGUAGES.map((l) => (
                  <option key={l.value} value={l.value}>{l.label}</option>
                ))}
              </select>
            </label>

            <label className="flex items-center gap-1 text-ink-light">
              <span>供應商</span>
              <select
                aria-label="翻譯供應商"
                value={provider}
                onChange={(e) => setProvider(e.target.value as Provider)}
                className="rounded border border-washi-border bg-paper px-1 py-0.5 text-ink focus:border-vermilion focus:outline-none"
              >
                {PROVIDERS.map((p) => (
                  <option key={p.value} value={p.value}>{p.label}</option>
                ))}
              </select>
            </label>
          </>
        )}
      </div>

      {/* 翻譯錯誤訊息 */}
      {translationError && (
        <div className="mx-6 mt-2 rounded bg-red-50 px-3 py-2 text-sm text-red-700">
          {translationError}
          <button onClick={fetchTranslation} className="ml-2 underline">
            重試
          </button>
        </div>
      )}

      {/* 內容區 */}
      <HtmlPreview
        html={pages[currentPage - 1] ?? ''}
        pageCount={pageCount}
        showRuby={showRuby}
        translations={showTranslation ? currentTranslations : undefined}
        isTranslating={showTranslation && isTranslating}
      />
    </div>
  );
}
