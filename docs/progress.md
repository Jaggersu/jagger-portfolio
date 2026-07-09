# JAGGER OS 專案進度日誌

## 2026-07-10

### 今日完成項目

#### 1. Client Task Detail Panel V2（已完成）
- 移除 Client Dashboard 的 `+ New Project` 按鈕及相關狀態邏輯
- 將任務狀態改為 Linear 風格：`Todo` / `In Progress` / `In Review` / `Done`
- 加入狀態對應的進度條與視覺標籤
- 新增 Activity Update 區塊（Client 可讀，顯示 Admin 發布的最新進度）
- 新增 Client Comments 區塊：
  - 可寫入留言
  - 打字時才會出現 `AI Polish` 按鈕
  - 串接 `/api/ai-comment` 以繁體中文潤稿
  - 潤稿後可直接送出
- 整個右側面板採用 Linear 風格細 scrollbar 與深色佈局

#### 2. Admin Activity Update（已完成）
- 於 `AdminDashboard` 新增 `selectedTaskId`、`activityDraft`、`activityLoading` 狀態
- 任務列表每列新增 `Update` 按鈕，點開後可撰寫 Activity Update
- 儲存時透過 `supabase.auth.getUser()` 取得 user_id 寫入 `task_activities`
- Client 端可透過 Realtime 即時看到 Admin 發布的更新

#### 3. Supabase Schema 更新（已完成）
- 新增 `task_activities` 表：
  - `id`, `task_id`, `user_id`, `content`, `created_at`
  - RLS：admin 可讀寫所有、用戶可讀寫自身任務相關
- 新增 `task_comments` 表：
  - `id`, `task_id`, `user_id`, `content`, `is_admin`, `created_at`
  - RLS：admin 可讀寫所有、用戶可讀寫自身任務相關
- 兩表皆加入 `supabase_realtime` publication，支援 Realtime 同步
- 將 `profiles` policies 與 Realtime publication 加入改為 idempotent，可重複執行 schema.sql

#### 4. AI Comment API（已完成）
- 新增 `app/api/ai-comment/route.ts`
- 使用 Google Gemini 1.5 Flash 將留言草稿潤稿為繁體中文
- 接收參數：`draft`、`context`

#### 5. Checkout 流程強化（已完成）
- 回調路由 `app/api/checkout/callback/route.ts` 持續負責付款成功後建立 tasks
- 新增 `app/api/checkout/return/route.ts` fallback：
  - 若藍新 NotifyURL（callback）在測試環境未觸發，ReturnURL 也會檢查並補建立 tasks
  - 從 form body 或 query string 解析 `MerchantOrderNo`
  - 避免重複初始化：檢查 contract status 與是否已有 tasks

#### 6. 測試用資料種子按鈕（已完成）
- 在 Client Dashboard 無任務空白狀態新增 `+ 建立測試任務` 按鈕
- 一鍵為目前登入者建立專案與 4 個涵蓋各狀態的測試 tasks
- 解決反覆手動找 UUID /貼 SQL 的問題

#### 7. 部署與程式碼提交
- TypeScript 檢查通過
- 多次 git commit 並 push 至 `main` 分支
- 重要 commits：
  - `d124bf0`: client task detail panel v2
  - `b49e095`: schema idempotent policies
  - `7ee4ec7`: realtime idempotent
  - `cc0465a`: return route fallback
  - `9d0ffdc`: seed demo tasks button

---

### 已知問題與排除過程

| 問題 | 原因 | 解法 |
|------|------|------|
| Client Dashboard 沒有任務 | 資料庫中 tasks 屬於舊 auth user id，與目前瀏覽器 session 的 user_id 不一致 | 新增「建立測試任務」按鈕，以目前登入者身份自動重建 |
| 重跑合約沒有產生 tasks | 藍新測試環境 NotifyURL 不穩定；return route 修正尚未部署 | return route 增加 fallback 建立 tasks |
| schema.sql 重複執行報錯 | policies 與 realtime publication 已存在 | 改為 `drop policy if exists` 與 `if not exists` 條件加入 |
| `task_activities` 不存在錯誤 | SQL 執行順序問題 | 提供正確順序：先 CREATE TABLE，再加 publication |

---

### 尚未製作 / 待完成項目

#### 高優先
1. **Project-centric 重構**
   - Admin 開 Project 並將 tasks 歸屬於 project
   - Client Dashboard 改為顯示 Project cards，每張卡片內含進度條
   - 點開 Project 後才顯示其下的 tasks

2. **Client Submit Request（提交需求）**
   - 取代原本 `+ New Project` 按鈕的功能
   - 提供表單讓 Client 描述新需求，送出後通知 Admin

3. **Admin Projects 看板**
   - 將 Admin Dashboard 的 tasks 列表改為 Kanban-style board
   - 支援拖曳任務切換狀態

#### 中優先
4. **Contracts 強化**
   - 簽約時將 contract 內容（文字 + 簽名快照）寫入 `content` 欄位
   - Admin Contract Panel 加入 fuzzy search

5. **Realtime 同步完整驗證**
   - 確認 Admin 改變 task 狀態後 Client 端自動更新
   - 確認 Admin 新增 activity 後 Client 端即時顯示
   - 確認 Client 新增 comment 後 Admin 端即時顯示

6. **Header icon 尺寸統一**
   - 所有 Header animated icon 統一使用 `size={18}`

#### 低優先 / 優化
7. **UI 一致性調整**
   - 確認狀態卡片文字與列表狀態標籤一致（Todo / In Progress / In Review / Done）
   - Activity / Comments 空狀態提示
   - 手機版自適應佈局微調

8. **測試與正式部署**
   - 完整走過付款流程驗證 callback / return 都能建立 tasks
   - 移除測試用 seed 按鈕或加上 dev-only flag

---

### 明日建議優先順序

1. 先驗證目前已完成的 Client Task Detail Panel 與 Admin Activity Update 功能是否正常運作
2. 接著做 **Project-centric 重構**（Admin 開 Project、Client 看 Project cards）
3. 再做 **Client Submit Request** 與 **Admin Kanban board**
4. 最後處理 Contracts 內容儲存與 fuzzy search
