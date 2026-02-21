import { useState } from "react";
import { FileUploader } from "./components/FileUploader";
import { HtmlPreview } from "./components/HtmlPreview";
import { ProgressBar } from "./components/ProgressBar";
import { convertPdf } from "./services/api";
import "./App.css";

function App() {
  const [loading, setLoading] = useState(false);
  const [html, setHtml] = useState<string | null>(null);
  const [pageCount, setPageCount] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const handleFileSelect = async (file: File) => {
    setLoading(true);
    setError(null);
    setHtml(null);

    try {
      const result = await convertPdf(file);
      setHtml(result.html);
      setPageCount(result.page_count);
    } catch (err) {
      setError(err instanceof Error ? err.message : "轉換失敗");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="app">
      <h1>PDF 振り仮名標注工具</h1>
      <FileUploader onFileSelect={handleFileSelect} disabled={loading} />
      {loading && <ProgressBar />}
      {error && <p className="error">{error}</p>}
      {html && <HtmlPreview html={html} pageCount={pageCount} />}
    </div>
  );
}

export default App;
