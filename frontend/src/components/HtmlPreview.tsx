interface HtmlPreviewProps {
  html: string;
  pageCount: number;
}

export function HtmlPreview({ html, pageCount }: HtmlPreviewProps) {
  return (
    <div className="mt-8 rounded-lg border border-gray-200 p-6">
      <h2 className="mb-4 text-lg font-semibold text-gray-800">
        預覽（共 {pageCount} 頁）
      </h2>
      <div
        className="leading-loose text-base [&_rt]:text-[0.6em] [&_rt]:text-gray-500 [&_ruby]:ruby-position-over [&_.page]:mb-8 [&_.page]:border-b [&_.page]:border-gray-100 [&_.page]:pb-4"
        dangerouslySetInnerHTML={{ __html: html }}
      />
    </div>
  );
}
