const API_BASE = "http://localhost:8000/api";

export interface ConvertResponse {
  html: string;
  page_count: number;
}

export async function convertFile(file: File): Promise<ConvertResponse> {
  const formData = new FormData();
  formData.append("file", file);

  const response = await fetch(`${API_BASE}/convert`, {
    method: "POST",
    body: formData,
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ detail: "未知錯誤" }));
    throw new Error(error.detail || `HTTP ${response.status}`);
  }

  return response.json();
}

export async function translateTexts(
  texts: string[],
  provider: string,
  targetLang: string,
): Promise<string[]> {
  const response = await fetch(`${API_BASE}/translate`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ texts, provider, target_lang: targetLang }),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ detail: "翻譯失敗" }));
    throw new Error(error.detail || `HTTP ${response.status}`);
  }

  const data = await response.json();
  return data.translations;
}
