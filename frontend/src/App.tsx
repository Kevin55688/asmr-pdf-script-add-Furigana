import { useState } from "react";
import { FileUploader } from "./components/FileUploader";
import { PagedPreview } from "./components/PagedPreview";
import { ProgressBar } from "./components/ProgressBar";
import { ToastProvider, useToast } from "./components/Toast";
import { convertFile } from "./services/api";

type AppState = "idle" | "uploading" | "success";

function AppContent() {
  const { showToast } = useToast();
  const [appState, setAppState] = useState<AppState>("idle");
  const [html, setHtml] = useState<string | null>(null);
  const [pageCount, setPageCount] = useState(0);
  const [fileName, setFileName] = useState<string>("");

  const handleFileSelect = async (file: File) => {
    setAppState("uploading");
    setHtml(null);
    setFileName(file.name);

    try {
      const result = await convertFile(file);
      setHtml(result.html);
      setPageCount(result.page_count);
      setAppState("success");
    } catch (err) {
      showToast(err instanceof Error ? err.message : "轉換失敗");
      setAppState("idle");
    }
  };

  const handleReset = () => {
    setAppState("idle");
    setHtml(null);
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

        {appState === "success" && html && (
          <PagedPreview html={html} pageCount={pageCount} />
        )}
      </main>
    </div>
  );
}

function App() {
  return (
    <ToastProvider>
      <AppContent />
    </ToastProvider>
  );
}

export default App;
