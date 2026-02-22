import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { translateTexts } from "../services/api";
import { HtmlPreview } from "./HtmlPreview";
import { useToast } from "./Toast";

interface PagedPreviewProps {
  html: string;
  pageCount: number;
  initialPage?: number;
  onPageChange?: (page: number) => void;
  cachedTranslations?: Record<string, Record<string, Record<string, string>>>;
  onTranslationSaved?: (provider: string, lang: string, translations: Record<string, string>) => void;
}

const PROVIDERS = [
  { value: "deepl", label: "DeepL" },
  { value: "google", label: "Google" },
  { value: "claude", label: "Claude AI" },
] as const;

const LANGUAGES = [
  { value: "zh-TW", label: "繁體中文" },
  { value: "zh-CN", label: "簡體中文" },
  { value: "en", label: "English" },
  { value: "ko", label: "한국어" },
] as const;

type Provider = (typeof PROVIDERS)[number]["value"];
type Language = (typeof LANGUAGES)[number]["value"];

export function PagedPreview({
  html,
  pageCount,
  initialPage = 1,
  onPageChange,
  onTranslationSaved,
}: PagedPreviewProps) {
  const { showToast } = useToast();

  const [currentPage, setCurrentPage] = useState(initialPage);
  const [inputValue, setInputValue] = useState(String(initialPage));

  // Toggle 狀態
  const [showRuby, setShowRuby] = useState(true);
  const [showTranslation, setShowTranslation] = useState(false);
  const [provider, setProvider] = useState<Provider>("deepl");
  const [targetLang, setTargetLang] = useState<Language>("zh-TW");

  // 翻譯 cache：key = "provider|lang|pageNum"
  const [translationCache, setTranslationCache] = useState<
    Record<string, string[]>
  >({});
  const [isTranslating, setIsTranslating] = useState(false);

  // 解析頁面 HTML
  const pages = useMemo(() => {
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, "text/html");
    const sections = doc.querySelectorAll("section.page");
    return Array.from(sections).map((s) => s.outerHTML);
  }, [html]);

  // 從當前頁 HTML 提取段落文字（送給翻譯 API）
  const currentPageTexts = useMemo(() => {
    const pageHtml = pages[currentPage - 1] ?? "";
    if (!pageHtml) return [];
    const parser = new DOMParser();
    const doc = parser.parseFromString(pageHtml, "text/html");
    return Array.from(doc.querySelectorAll("p")).map(
      (p) => p.textContent ?? "",
    );
  }, [pages, currentPage]);

  const cacheKey = `${provider}|${targetLang}|${currentPage}`;

  // 執行翻譯（不自動觸發，需使用者點按「翻譯」按鈕）
  const performTranslation = useCallback(async () => {
    if (currentPageTexts.length === 0) return;
    if (translationCache[cacheKey]) return; // cache hit

    setIsTranslating(true);
    try {
      const result = await translateTexts(
        currentPageTexts,
        provider,
        targetLang,
      );
      setTranslationCache((prev) => {
        const next = { ...prev, [cacheKey]: result };
        const perParagraph: Record<string, string> = {};
        result.forEach((t, i) => { perParagraph[`p-${i}`] = t; });
        onTranslationSaved?.(provider, targetLang, perParagraph);
        return next;
      });
    } catch (e) {
      const msg = e instanceof Error ? e.message : "翻譯失敗";
      showToast(msg, { action: { label: "重試", onClick: () => performTranslationRef.current() } });
    } finally {
      setIsTranslating(false);
    }
  }, [currentPageTexts, cacheKey, provider, targetLang, translationCache]);

  // Ref：保持最新版 performTranslation，供 effect 使用（避免 stale closure）
  const performTranslationRef = useRef(performTranslation);
  const pageChangeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  performTranslationRef.current = performTranslation;

  // 使用者是否已主動按過「翻譯」按鈕（換頁自動翻譯的前提）
  const translationRequestedRef = useRef(false);

  // 切換供應商或語言時重置（需再次手動點按「翻譯」）
  useEffect(() => {
    translationRequestedRef.current = false;
  }, [provider, targetLang]);

  // 換頁時若已觸發過翻譯，自動取得當頁翻譯
  useEffect(() => {
    if (translationRequestedRef.current && showTranslation) {
      performTranslationRef.current();
    }
  }, [currentPage, showTranslation]);

  // 使用者點按「翻譯」按鈕
  const handleTranslate = useCallback(() => {
    translationRequestedRef.current = true;
    performTranslation();
  }, [performTranslation]);

  function goToPage(page: number) {
    const clamped = Math.max(1, Math.min(page, pageCount));
    setCurrentPage(clamped);
    setInputValue(String(clamped));
    if (pageChangeTimerRef.current) clearTimeout(pageChangeTimerRef.current);
    pageChangeTimerRef.current = setTimeout(() => onPageChange?.(clamped), 1000);
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
              if (e.key === "Enter") {
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
                  <option key={l.value} value={l.value}>
                    {l.label}
                  </option>
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
                  <option key={p.value} value={p.value}>
                    {p.label}
                  </option>
                ))}
              </select>
            </label>

            {/* 翻譯確認按鈕 */}
            <button
              aria-label="翻譯"
              onClick={handleTranslate}
              disabled={isTranslating}
              className="rounded border border-vermilion px-3 py-1 text-sm font-medium text-vermilion transition-all duration-150 hover:bg-vermilion hover:text-white disabled:cursor-not-allowed disabled:border-washi-border disabled:text-ink-light"
            >
              {isTranslating ? "翻譯中…" : "翻譯"}
            </button>
          </>
        )}
      </div>


      {/* 內容區 */}
      <HtmlPreview
        html={pages[currentPage - 1] ?? ""}
        pageCount={pageCount}
        showRuby={showRuby}
        translations={showTranslation ? currentTranslations : undefined}
        isTranslating={showTranslation && isTranslating}
      />
    </div>
  );
}
