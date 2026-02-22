import { useCallback, useEffect, useState } from "react";
import { FileUploader } from "./components/FileUploader";
import { NotesPanel } from "./components/NotesPanel";
import { PagedPreview } from "./components/PagedPreview";
import { ProgressBar } from "./components/ProgressBar";
import { Sidebar } from "./components/Sidebar";
import { ToastProvider, useToast } from "./components/Toast";
import type { Document, Library } from "./services/libraryApi";
import * as libApi from "./services/libraryApi";

type AppState = "idle" | "loading" | "uploading" | "viewing";

function AppContent() {
  const { showToast } = useToast();

  // Library state
  const [library, setLibrary] = useState<Library>({
    folders: [],
    tags: [],
    documents: [],
  });
  const [activeTags, setActiveTags] = useState<string[]>([]);

  // View state
  const [appState, setAppState] = useState<AppState>("idle");
  const [selectedDoc, setSelectedDoc] = useState<Document | null>(null);
  const [html, setHtml] = useState<string | null>(null);
  const [pageCount, setPageCount] = useState(0);
  const [pendingUploadDoc, setPendingUploadDoc] = useState<Document | null>(
    null,
  );

  // Load library on mount
  useEffect(() => {
    libApi
      .getLibrary()
      .then(setLibrary)
      .catch(() => showToast("無法載入文件庫"));
  }, []);

  const refreshLibrary = useCallback(async () => {
    try {
      const lib = await libApi.getLibrary();
      setLibrary(lib);
    } catch {
      showToast("文件庫更新失敗");
    }
  }, []);

  // Select document (already uploaded)
  const handleSelectDocument = useCallback(async (doc: Document) => {
    setSelectedDoc(doc);
    setAppState("loading");
    try {
      const result = await libApi.getDocumentHtml(doc.id);
      setHtml(result.html);
      setPageCount(result.page_count);
      setAppState("viewing");
    } catch {
      showToast("無法載入文件內容");
      setAppState("idle");
    }
  }, []);

  // Upload document flow
  const handleUploadDocument = useCallback((doc: Document) => {
    setPendingUploadDoc(doc);
    setSelectedDoc(doc);
    setHtml(null);
    setAppState("uploading");
  }, []);

  // File selected in FileUploader → upload to library endpoint
  const handleFileSelect = useCallback(
    async (file: File) => {
      if (!pendingUploadDoc) return;
      setAppState("loading");
      try {
        const result = await libApi.uploadDocument(pendingUploadDoc.id, file);
        const docHtml = await libApi.getDocumentHtml(pendingUploadDoc.id);
        setHtml(docHtml.html);
        setPageCount(result.page_count);
        await refreshLibrary();
        setAppState("viewing");
      } catch (err) {
        showToast(err instanceof Error ? err.message : "上傳失敗");
        setAppState("uploading");
      }
    },
    [pendingUploadDoc, refreshLibrary],
  );

  // CRUD handlers
  const handleCreateFolder = async (name: string) => {
    await libApi.createFolder(name);
    await refreshLibrary();
  };
  const handleRenameFolder = async (id: string, name: string) => {
    await libApi.renameFolder(id, name);
    await refreshLibrary();
  };
  const handleDeleteFolder = async (id: string) => {
    await libApi.deleteFolder(id);
    await refreshLibrary();
    if (selectedDoc?.folderId === id) {
      setSelectedDoc(null);
      setHtml(null);
      setAppState("idle");
    }
  };
  const handleCreateDocument = async (name: string, folderId: string) => {
    await libApi.createDocument(name, folderId);
    await refreshLibrary();
  };
  const handleRenameDocument = async (id: string, name: string) => {
    await libApi.updateDocument(id, { name });
    await refreshLibrary();
    if (selectedDoc?.id === id) setSelectedDoc((d) => (d ? { ...d, name } : d));
  };
  const handleDeleteDocument = async (id: string) => {
    await libApi.deleteDocument(id);
    await refreshLibrary();
    if (selectedDoc?.id === id) {
      setSelectedDoc(null);
      setHtml(null);
      setAppState("idle");
    }
  };
  const handleMoveDocument = async (docId: string, folderId: string) => {
    await libApi.updateDocument(docId, { folderId });
    await refreshLibrary();
  };
  const handleCreateTag = async (name: string, color: string) => {
    await libApi.createTag(name, color);
    await refreshLibrary();
  };
  const handleDeleteTag = async (id: string) => {
    await libApi.deleteTag(id);
    await refreshLibrary();
  };
  const handleUpdateFolderTags = async (id: string, tagIds: string[]) => {
    const updated = await libApi.updateFolderTags(id, tagIds);
    setLibrary((prev) => ({
      ...prev,
      folders: prev.folders.map((f) => (f.id === id ? updated : f)),
    }));
  };
  const handlePageChange = useCallback(
    async (page: number) => {
      if (!selectedDoc) return;
      await libApi.updateDocument(selectedDoc.id, { lastPage: page });
    },
    [selectedDoc],
  );
  const handleTranslationSaved = useCallback(
    async (
      provider: string,
      lang: string,
      translations: Record<string, string>,
    ) => {
      if (!selectedDoc) return;
      const updated = await libApi.saveTranslations(
        selectedDoc.id,
        provider,
        lang,
        translations,
      );
      setSelectedDoc(updated);
      setLibrary((prev) => ({
        ...prev,
        documents: prev.documents.map((d) =>
          d.id === updated.id ? updated : d,
        ),
      }));
    },
    [selectedDoc],
  );
  const handleNotesSave = useCallback(
    async (notes: string) => {
      if (!selectedDoc) return;
      await libApi.updateDocument(selectedDoc.id, { notes });
    },
    [selectedDoc],
  );

  return (
    <div className="flex h-screen flex-col bg-washi">
      {/* Header */}
      <header className="flex-shrink-0 border-b border-washi-border bg-washi px-6 py-4">
        <div className="flex items-center gap-3">
          <div className="h-7 w-[3px] rounded-full bg-vermilion" />
          <div>
            <span className="text-xl font-bold text-vermilion">振り仮名</span>
            <span className="ml-2 text-sm text-ink-light">
              PDF ふりがなツール
            </span>
          </div>
        </div>
      </header>

      {/* Body */}
      <div className="flex flex-1 overflow-hidden">
        <Sidebar
          library={library}
          selectedDocId={selectedDoc?.id ?? null}
          activeTags={activeTags}
          onSelectDocument={handleSelectDocument}
          onCreateFolder={handleCreateFolder}
          onRenameFolder={handleRenameFolder}
          onDeleteFolder={handleDeleteFolder}
          onCreateDocument={handleCreateDocument}
          onRenameDocument={handleRenameDocument}
          onDeleteDocument={handleDeleteDocument}
          onMoveDocument={handleMoveDocument}
          onUploadDocument={handleUploadDocument}
          onCreateTag={handleCreateTag}
          onDeleteTag={handleDeleteTag}
          onTagFilterChange={setActiveTags}
          onUpdateFolderTags={handleUpdateFolderTags}
        />

        <main className="relative flex-1 overflow-auto px-6 py-8">
          {appState === "idle" && (
            <div className="flex h-full items-center justify-center text-ink-light">
              <p>從左側選擇文件以開始閱讀</p>
            </div>
          )}

          {appState === "loading" && (
            <div className="flex h-full items-center justify-center">
              <ProgressBar />
            </div>
          )}

          {appState === "uploading" && pendingUploadDoc && (
            <div className="mx-auto max-w-xl">
              <p className="mb-4 text-sm text-ink-light">
                上傳「{pendingUploadDoc.name}」的 PDF 或 TXT 檔案
              </p>
              <FileUploader
                onFileSelect={handleFileSelect}
                disabled={false}
                collapsed={false}
                fileName=""
                onReset={() => {
                  setAppState("idle");
                  setPendingUploadDoc(null);
                }}
              />
            </div>
          )}

          {appState === "viewing" && html && selectedDoc && (
            <>
              <PagedPreview
                html={html}
                pageCount={pageCount}
                initialPage={selectedDoc.lastPage || 1}
                onPageChange={handlePageChange}
                cachedTranslations={selectedDoc.translations}
                onTranslationSaved={handleTranslationSaved}
              />
              <NotesPanel
                initialNotes={selectedDoc.notes}
                onSave={handleNotesSave}
              />
            </>
          )}
        </main>
      </div>
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
