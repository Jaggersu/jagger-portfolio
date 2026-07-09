# Refactor: Linear-Style Layout & Unified Communication Timeline

We have completed the layout refactoring and communication timeline merging for the Client Dashboard (`DashboardPanel.tsx`) and the Admin Dashboard (`AdminDashboard.tsx`).

## Changes Made

### 1. 📐 Linear-Style Layout Refactor (Client端)
* **左側列表與右側屬性面板分割**：將原本的 `50/50` 左右對切重構。點擊任務時，右側會以一個寬度 `460px` 的精緻面板，帶有平滑的 CSS 滑入動畫 (`slideInRight 0.2s`) 從右側滑入，展現類似 Linear 應用程式的高密度資訊屬性欄。
* **Linear 風格狀態與優先級圖示**：
  * 新增圖示元件 `StatusIcon` 與 `PriorityIcon`，完美復刻 Linear 經典圖示。
  * `Todo` (QUEUED) 為細線空心圓，`In Progress` (IN_PROGRESS) 為橘色半滿圓，`In Review` (REVIEW) 為黃色虛線圓，`Done` (DELIVERED) 為綠色打勾實心圓。
  * 優先級以三格長條圖（LOW 亮一格、MED 亮兩格、HIGH 亮三格）來呈現。

### 2. 💬 整合時間軸雙向對話 (Admin & Client)
* **時間軸排列**：我們將 `task_activities` (Admin 的進度更新動態) 與 `task_comments` (雙方的留言) 在前端進行串接合併，並依照 `created_at` 時間順序 **由舊到新、由上至下** 排列（最新消息在最下方）。
* **對話氣泡區分**：
  * Client 留言為橘色邊框氣泡，偏向右側。
  * Jagger Team 的留言為深灰色氣泡，偏向左側。
  * Admin 的進度更新（Activity）則是以「⚡ 系統動態小卡」居中顯示在時間軸上。
* **對話自動滾底 (Auto-scroll)**：不管是切換任務還是傳送新留言，訊息框皆會自動平滑滾動到最底端，並附帶 `@motion/react` 雷達波微動畫的 `SatelliteDishIcon`。
* **雙向留言按鍵 (Admin 端)**：Admin 在 Kanban 卡片展開後，輸入的文字可以點擊 **「傳送留言」** (作為氣泡呈現對話) 或是 **「發布動態」** (作為系統卡片發布進度更新)。

### 3. 🛡️ 系統穩定性修復
* 修復了 Client 端點擊任務時，因為重名監聽器 (`client-activities`) 導致 Socket 重複註冊崩潰 (This page couldn't load) 的 bug。
* 為無法辨識的任務狀態加入了型別 Fallback，防止遺留的測試垃圾資料導致 UI 當機。
