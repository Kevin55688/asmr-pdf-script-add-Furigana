import { useState } from "react";
import { FileUploader } from "./components/FileUploader";
import { HtmlPreview } from "./components/HtmlPreview";
import { ProgressBar } from "./components/ProgressBar";
import { convertPdf } from "./services/api";

type AppState = "idle" | "uploading" | "success" | "error";

function App() {
  const [appState, setAppState] = useState<AppState>("idle");
  const [html, setHtml] = useState<string | null>(null);
  const [pageCount, setPageCount] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string>("");

  const handleFileSelect = async (file: File) => {
    setAppState("uploading");
    setError(null);
    setHtml(null);
    setFileName(file.name);

    try {
      const result = await convertPdf(file);
      setHtml(result.html);
      setPageCount(result.page_count);
      setAppState("success");
    } catch (err) {
      setError(err instanceof Error ? err.message : "轉換失敗");
      setAppState("error");
    }
  };

  const handleReset = () => {
    setAppState("idle");
    setHtml(null);
    setError(null);
    setFileName("");
  };

  const isCollapsed = appState === "uploading" || appState === "success";

  return (
    <div className="min-h-screen bg-washi">
      {/* Header */}
      <header className="bg-washi border-b border-washi-border px-6 py-4">
        <div className="mx-auto flex max-w-3xl items-center gap-3">
          <div className="h-7 w-[3px] rounded-full bg-vermilion" />
          <div>
            <span className="text-xl font-bold text-vermilion">振り仮名</span>
            <span className="ml-2 text-sm text-ink-light">
              PDF ふりがなツール
            </span>
          </div>
        </div>
      </header>

      {/* Main */}
      <main className="mx-auto max-w-3xl px-6 py-8">
        <FileUploader
          onFileSelect={handleFileSelect}
          disabled={appState === "uploading"}
          collapsed={isCollapsed}
          fileName={fileName}
          onReset={handleReset}
        />

        {appState === "uploading" && <ProgressBar />}

        {appState === "error" && error && (
          <div className="mt-4 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}

        {appState === "success" && html && (
          <HtmlPreview html={html} pageCount={pageCount} />
        )}
      </main>
    </div>
  );
}

export default App;
