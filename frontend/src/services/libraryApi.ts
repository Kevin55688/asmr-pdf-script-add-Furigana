const API_BASE = "http://localhost:8000/api/library";

export interface Folder {
  id: string;
  name: string;
  order: number;
}

export interface Tag {
  id: string;
  name: string;
  color: string;
}

export interface Document {
  id: string;
  name: string;
  folderId: string;
  tagIds: string[];
  htmlFile: string | null;
  lastPage: number;
  notes: string;
  translations: Record<string, Record<string, Record<string, string>>>;
  createdAt: string;
  uploadedAt: string | null;
}

export interface Library {
  folders: Folder[];
  tags: Tag[];
  documents: Document[];
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const resp = await fetch(`${API_BASE}${path}`, {
    headers: { "Content-Type": "application/json" },
    ...init,
  });
  if (!resp.ok) {
    const err = await resp.json().catch(() => ({ detail: "未知錯誤" }));
    throw new Error(err.detail || `HTTP ${resp.status}`);
  }
  return resp.json();
}

export const getLibrary = (): Promise<Library> => request("/");
export const createFolder = (name: string): Promise<Folder> =>
  request("/folders", { method: "POST", body: JSON.stringify({ name }) });
export const renameFolder = (id: string, name: string): Promise<Folder> =>
  request(`/folders/${id}`, {
    method: "PATCH",
    body: JSON.stringify({ name }),
  });
export const deleteFolder = (id: string): Promise<void> =>
  request(`/folders/${id}`, { method: "DELETE" });
export const createTag = (name: string, color: string): Promise<Tag> =>
  request("/tags", { method: "POST", body: JSON.stringify({ name, color }) });
export const deleteTag = (id: string): Promise<void> =>
  request(`/tags/${id}`, { method: "DELETE" });
export const createDocument = (
  name: string,
  folderId: string,
): Promise<Document> =>
  request("/documents", {
    method: "POST",
    body: JSON.stringify({ name, folderId }),
  });
export const updateDocument = (
  id: string,
  updates: Partial<Document>,
): Promise<Document> =>
  request(`/documents/${id}`, {
    method: "PATCH",
    body: JSON.stringify(updates),
  });
export const deleteDocument = (id: string): Promise<void> =>
  request(`/documents/${id}`, { method: "DELETE" });
export const saveTranslations = (
  id: string,
  provider: string,
  lang: string,
  translations: Record<string, string>,
): Promise<Document> =>
  request(`/documents/${id}/translations`, {
    method: "PATCH",
    body: JSON.stringify({ provider, lang, translations }),
  });

export async function uploadDocument(
  id: string,
  file: File,
): Promise<Document & { page_count: number }> {
  const formData = new FormData();
  formData.append("file", file);
  const resp = await fetch(`${API_BASE}/documents/${id}/upload`, {
    method: "POST",
    body: formData,
  });
  if (!resp.ok) {
    const err = await resp.json().catch(() => ({ detail: "上傳失敗" }));
    throw new Error(err.detail || `HTTP ${resp.status}`);
  }
  return resp.json();
}

export async function getDocumentHtml(
  id: string,
): Promise<{ html: string; page_count: number }> {
  const resp = await fetch(`${API_BASE}/documents/${id}/html`, {
    headers: { "Content-Type": "application/json" },
  });
  if (!resp.ok) {
    const err = await resp.json().catch(() => ({ detail: "未知錯誤" }));
    throw new Error(err.detail || `HTTP ${resp.status}`);
  }
  return resp.json();
}
