# 設計文件：振り仮名 Toggle 與段落翻譯功能

- **日期**：2026-02-21
- **狀態**：⏳ 設計完成，待實作

## 需求摘要

1. **振り仮名 Toggle**：Switch 控制顯示/隱藏 ruby 標注（`<rt>` 元素）
2. **段落翻譯 Toggle**：Switch 控制顯示/隱藏每段落翻譯文字
3. **多供應商翻譯**：支援 Claude AI、Google Translate、DeepL
4. **目標語言選擇**：用戶在 UI 選擇翻譯目標語言
5. **Lazy 翻譯**：用戶開啟翻譯 Switch 時才呼叫 API
6. **前端 Cache**：翻譯結果存於 React state，同一 session 內不重複呼叫

---

## 架構設計

### 方案：後端翻譯 API + 前端 CSS Toggle（方案 A）

- **Ruby toggle**：純前端 CSS class 切換，零延遲，無後端依賴
- **翻譯**：後端新增 `/api/translate` endpoint，代理呼叫外部翻譯 API
- **API Key**：後端 `.env` 環境變數，不暴露於前端

---

## 後端設計

### 新增檔案：`backend/app/services/translator.py`

統一翻譯介面，支援三個 provider：

```python
async def translate(
    texts: list[str],
    provider: str,       # "deepl" | "google" | "claude"
    target_lang: str,    # "zh-TW" | "zh-CN" | "en" | "ko"
    source_lang: str = "ja"
) -> list[str]:
    """翻譯段落列表，回傳翻譯結果列表（順序對應）"""
```

各 provider 實作：

| Provider | 使用方式 | 環境變數 |
|---------|---------|---------|
| DeepL | DeepL REST API v2 | `DEEPL_API_KEY` |
| Google | Google Cloud Translation API v2 | `GOOGLE_API_KEY` |
| Claude | Anthropic API（`claude-sonnet-4-6`） | `ANTHROPIC_API_KEY` |

### 新增 Router：`backend/app/routers/translate.py`

```
POST /api/translate
```

**Request Body：**
```json
{
  "texts": ["段落1", "段落2"],
  "provider": "deepl",
  "target_lang": "zh-TW"
}
```

**Response：**
```json
{
  "translations": ["翻譯1", "翻譯2"]
}
```

**錯誤回應：**

| 狀況 | HTTP Status | 訊息 |
|------|------------|------|
| 未設定 API Key | 400 | `"未設定 DEEPL_API_KEY"` |
| 不支援的 provider | 422 | Pydantic validation error |
| 外部 API 失敗 | 502 | `"翻譯服務暫時無法使用"` |

### 環境變數（`backend/.env`）

```
DEEPL_API_KEY=
GOOGLE_API_KEY=
ANTHROPIC_API_KEY=
```

---

## 前端設計

### UI 佈局：`PagedPreview.tsx` 導覽列擴充

現有導覽列下方新增控制列（延續和風樣式）：

```
┌──────────────────────────────────────────────────────┐
│ [← 上一頁]   [  1  / 12 ]   [下一頁 →]              │  ← 現有
├──────────────────────────────────────────────────────┤
│ 振り仮名 [●━]   翻譯 [━○]   [語言 ▾]   [供應商 ▾]  │  ← 新增
└──────────────────────────────────────────────────────┘
```

### 振り仮名 Toggle（純 CSS）

開關切換 `HtmlPreview` 容器上的 CSS class：

```css
/* hideRuby = true 時套用 */
.hide-ruby rt {
  visibility: hidden;
  font-size: 0;
  line-height: 0;
}
```

### 翻譯 Toggle 與 Cache

```typescript
// App 層級 state（PagedPreview 向上提升）
const [showTranslation, setShowTranslation] = useState(false);
const [provider, setProvider] = useState<'deepl' | 'google' | 'claude'>('deepl');
const [targetLang, setTargetLang] = useState('zh-TW');

// key 格式："{provider}|{targetLang}|{pageNum}"
const [translationCache, setTranslationCache] = useState<Record<string, string[]>>({});
```

**觸發邏輯：**
1. 用戶開啟翻譯 switch → 檢查 cache key 是否存在
2. Cache miss → 呼叫 `POST /api/translate`（目前頁的所有段落）
3. Cache hit → 直接顯示已快取結果
4. 供應商或語言切換 → cache key 改變，自動觸發重新翻譯

### 翻譯顯示：`HtmlPreview.tsx`

傳入翻譯陣列，在每個 `<p>` 下方插入翻譯文字：

```
[原文段落（含振り仮名）]
[翻譯文字 — 淡灰色、小字、斜體，有左側朱紅細線裝飾]
```

Props 新增：
```typescript
interface HtmlPreviewProps {
  html: string;
  pageCount: number;
  showRuby: boolean;           // 新增
  translations?: string[];     // 新增，對應段落順序
  isTranslating?: boolean;     // 新增，顯示 loading state
}
```

### 支援語言

| 代號 | 顯示名稱 |
|------|---------|
| `zh-TW` | 繁體中文 |
| `zh-CN` | 簡體中文 |
| `en` | English |
| `ko` | 한국어 |

### 新增 API 呼叫：`frontend/src/services/api.ts`

```typescript
export async function translateTexts(
  texts: string[],
  provider: string,
  targetLang: string
): Promise<string[]>
```

---

## 錯誤處理

| 狀況 | 顯示方式 |
|------|---------|
| API Key 未設定 | 翻譯區塊顯示警告訊息「請在後端設定 XXX_API_KEY」 |
| 翻譯服務失敗 | 翻譯區塊顯示「翻譯失敗，請稍後再試」，可手動重試 |
| 翻譯中 | 每段落顯示灰色 skeleton loading 動畫 |

---

## 測試策略

### 後端（pytest）

**`tests/test_translator.py`（新增）：**
- 各 provider 正常翻譯（mock HTTP）
- API Key 缺失時拋出適當錯誤
- 不支援的 provider 拋出 ValueError

**`tests/test_api.py`（擴充）：**
- `POST /api/translate` 正常回應
- 缺少必填欄位回傳 422
- provider 未設定 key 回傳 400

### 前端（Vitest）

**`HtmlPreview.test.tsx`（擴充）：**
- `showRuby=false` 時套用 `.hide-ruby` class
- `translations` 陣列對應段落正確渲染
- `isTranslating=true` 顯示 skeleton

**`PagedPreview.test.tsx`（擴充）：**
- 翻譯 switch 開啟時呼叫 `translateTexts`
- Cache hit 不重複呼叫 API
- 語言/供應商切換觸發重新翻譯

---

## 元件變更摘要

| 檔案 | 變更類型 | 說明 |
|------|---------|------|
| `backend/app/services/translator.py` | 新增 | 翻譯 service，三個 provider |
| `backend/app/routers/translate.py` | 新增 | `POST /api/translate` endpoint |
| `backend/app/main.py` | 修改 | 註冊新 router |
| `backend/.env` | 修改 | 新增三個 API key 欄位 |
| `backend/tests/test_translator.py` | 新增 | translator service 單元測試 |
| `backend/tests/test_api.py` | 修改 | 新增 translate endpoint 測試 |
| `frontend/src/services/api.ts` | 修改 | 新增 `translateTexts` 函式 |
| `frontend/src/components/HtmlPreview.tsx` | 修改 | 支援 ruby toggle、翻譯顯示 |
| `frontend/src/components/PagedPreview.tsx` | 修改 | 新增控制列、翻譯邏輯與 cache |
| `frontend/src/components/HtmlPreview.test.tsx` | 修改 | 新增 toggle/翻譯測試 |
| `frontend/src/components/PagedPreview.test.tsx` | 修改 | 新增 cache 邏輯測試 |
