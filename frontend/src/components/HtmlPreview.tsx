interface HtmlPreviewProps {
  html: string;
  pageCount: number;
  showRuby: boolean;
  translations?: string[];
  isTranslating?: boolean;
}

export function HtmlPreview({
  html,
  pageCount,
  showRuby,
  translations,
  isTranslating,
}: HtmlPreviewProps) {
  // 解析 HTML，取得各段落 outerHTML
  const paragraphs = (() => {
    if (!html) return [];
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, "text/html");
    return Array.from(doc.querySelectorAll("p")).map((p) => p.outerHTML);
  })();

  const showTranslationRow =
    isTranslating || (translations && translations.length > 0);

  return (
    <div className="mt-8 rounded-lg border border-gray-200 p-6">
      <h2 className="mb-4 text-lg font-semibold text-gray-800">
        預覽（共 {pageCount} 頁）
      </h2>

      {paragraphs.length === 0 ? (
        /* html 不含 <p>（例如只有 <section><h2>）→ 直接渲染原始 HTML */
        <div
          className={`leading-loose text-base [&_rt]:text-[0.6em] [&_rt]:text-gray-500 [&_.page]:mb-8 [&_.page]:border-b [&_.page]:border-gray-100 [&_.page]:pb-4${showRuby ? "" : " hide-ruby"}`}
          dangerouslySetInnerHTML={{ __html: html }}
        />
      ) : (
        <div
          className={`leading-loose text-base${showRuby ? "" : " hide-ruby"}`}
        >
          {paragraphs.map((pHtml, i) => (
            <div key={i} className="mb-4">
              {/* 原文段落 */}
              <div
                className="[&_rt]:text-[0.6em] [&_rt]:text-gray-500"
                dangerouslySetInnerHTML={{ __html: pHtml }}
              />

              {/* 翻譯列 */}
              {showTranslationRow &&
                (isTranslating ? (
                  <div className="translation-skeleton mt-1 h-4 w-3/4 animate-pulse rounded bg-gray-200" />
                ) : translations?.[i] ? (
                  <p className="translation-text mt-1 border-l-2 border-vermilion pl-2 text-sm italic text-ink-light">
                    {translations[i]}
                  </p>
                ) : null)}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
