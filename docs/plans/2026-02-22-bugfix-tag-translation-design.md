# Bug Fix 設計文件：Tag 資料夾化 + 翻譯快取修復

- **日期**：2026-02-22
- **狀態**：⏳ 待實作

---

## 問題一：Tag 移至資料夾層級

### 現狀

- Tag 目前掛在 `Document`（`Document.tagIds`），Sidebar 的 Tag 篩選過濾的是文件
- `Folder` 型別只有 `id / name / order`，無 Tag 欄位
- 使用者無法為資料夾設定 Tag

### 目標行為

- Tag 改掛在 `Folder`（`Folder.tagIds`）
- Tag 篩選過濾的是**資料夾**：選中 Tag A 時，只顯示標有 Tag A 的資料夾（資料夾內所有文件一律顯示）
- `Document` 不再有 `tagIds` 欄位

### 變更範圍

#### 後端

| 檔案 | 變更 |
|------|------|
| `backend/app/services/library_service.py` | `create_folder()` 加入 `tagIds: []`；`update_folder()` 支援 tagIds 更新 |
| `backend/app/routers/library.py` | `PATCH /folders/{id}` 的 request body 加入 `tagIds: list[str]` |
| `backend/tests/` | 更新 folder 相關測試；移除 document tagIds 測試 |

#### 前端

| 檔案 | 變更 |
|------|------|
| `frontend/src/services/libraryApi.ts` | `Folder` 加 `tagIds: string[]`；`Document` 移除 `tagIds` |
| `frontend/src/components/Sidebar.tsx` | `filteredDocs()` 改為 `filteredFolders()`，依 `activeTags` 過濾資料夾 |
| `frontend/src/components/FolderItem.tsx` | 標頭加 Tag 色點顯示；加入「設定 Tag」按鈕（checkbox 選單，點擊外部關閉） |
| `frontend/src/components/DocumentItem.tsx` | 移除 Tag 顯示（若有） |
| `frontend/src/components/Sidebar.test.tsx` | 更新 Tag 篩選測試（改為過濾資料夾） |
| `frontend/src/services/libraryApi.test.ts` | 更新 Folder 型別測試 |

### UI 設計：FolderItem 設定 Tag

```
▼ ASMR 腳本  [●][●]  [🏷]   2
              ↑色點    ↑按鈕

點擊 [🏷] 後展開 inline checkbox 選單：
┌─────────────────┐
│ ☑ 完成  ● 綠   │
│ ☐ 進行中 ● 藍  │
└─────────────────┘
點擊外部自動關閉，呼叫 updateFolder API
```

---

## 問題二：翻譯快取未正確使用持久化資料

### 現狀

`PagedPreview` 有兩層快取：
- **React state** `translationCache`：暫時快取，元件重掛時清空
- **prop** `cachedTranslations`：持久化翻譯，來自 `selectedDoc.translations`（已存後端）

`performTranslation()` 目前只檢查 `translationCache`（React state），不檢查 `cachedTranslations`（持久化）。導致重新開啟文件或切換供應商後，明明有已翻譯的快取仍重新呼叫 API。

### 修復邏輯

在 `performTranslation()` 內，於呼叫 API 前增加一層檢查：

```
1. 計算 cacheKey = `${provider}|${lang}|${currentPage}`
2. 若 translationCache[cacheKey] 存在 → 直接使用（現有邏輯，不變）
3. 否則，檢查 cachedTranslations?.[provider]?.[lang]
   - cachedTranslations 格式：Record<paragraphIndex, translatedText>
   - 將其轉為陣列格式，寫入 translationCache[cacheKey]
   - 直接顯示，不呼叫 API
4. 若持久化快取也無 → 呼叫翻譯 API（現有邏輯，不變）
```

### 變更範圍

| 檔案 | 變更 |
|------|------|
| `frontend/src/components/PagedPreview.tsx` | `performTranslation()` 加入持久化快取檢查 |
| `frontend/src/components/PagedPreview.test.tsx` | 新增測試：cachedTranslations 有資料時不應呼叫 API |

---

## 實作順序建議

1. **Issue 2（翻譯快取）**：範圍小，只改一個元件，先完成
2. **Issue 1（Tag 資料夾化）**：範圍較大，後端 + 前端均需修改，分多個 Task

---

## 驗收標準

### Issue 1

- [ ] Folder 可設定 Tag（透過 FolderItem 的設定按鈕）
- [ ] Tag 篩選過濾資料夾（而非文件）
- [ ] 選中 Tag A 時，含 Tag A 的資料夾顯示所有文件
- [ ] 不含 Tag A 的資料夾隱藏
- [ ] Document 不再有 tagIds 欄位（後端 + 前端）
- [ ] 所有後端與前端測試通過

### Issue 2

- [ ] 已翻譯過的文本，重新開啟文件後點翻譯不再重新呼叫 API
- [ ] 切換供應商後，若該供應商有快取，直接顯示不重翻
- [ ] 全新翻譯（無快取）仍正常呼叫 API
- [ ] 所有前端測試通過
