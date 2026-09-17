# 資料庫及 SQL 說明

## Migration 清單

| 檔案 | 用途 |
| --- | --- |
| `0001_schema.sql` | 建立核心 tables、indexes、治療師、醫生、容量及測試 seed |
| `0002_patient_course_window.sql` | 加入患者首次登入及療程窗口欄位 |
| `0003_admin_queue_monday_portal.sql` | 加入候選通知佇列、星期一療程、前台開關、公眾假期及批量轉移紀錄 |
| `0004_add_ot_service.sql` | 加入 OT 類別、OT1 至 OT7 治療師及容量 |

## 主要資料表

- `patients`：患者登入資料、療程條件、優先級及通知狀態。
- `therapists`：治療師代號、性別、類別及啟用狀態。
- `doctors`：轉介醫生及 quota。
- `slot_capacities`：治療師、星期、時間及子類容量。
- `unavailable_blocks`：年假、病假、會議及其他不可預約時段。
- `bookings`：患者整個療程的 booking header。
- `booking_events`：每一堂治療的日期、時間及治療師。
- `activation_batches`、`sms_logs`：患者開通及模擬通知紀錄。
- `help_requests`：患者求助紀錄。
- `portal_settings`、`public_holidays`：前台開放控制。
- `transfer_batches`、`transfer_items`：批量轉移及待處理紀錄。

## 執行方式

Cloudflare D1：

```bash
npx wrangler@latest d1 migrations apply mfr_physio_booking --local
npx wrangler@latest d1 migrations apply mfr_physio_booking --remote
```

改用其他資料庫時，需要建立對應的 schema migration，並特別檢查：

- `TEXT` 日期／時間欄位的正式型別；
- `CURRENT_TIMESTAMP`、`date()` 及 SQLite 函數；
- `INSERT OR IGNORE` 的替代語法；
- unique constraints、foreign keys 及 cascade policy；
- transaction isolation 與同時預約衝突；
- 個人資料加密、遮罩、備份及保留政策。

## Seed 資料

`0001_schema.sql` 內的患者、電話和 SMS 全部是示範資料。建立正式資料庫前，建議把 schema migration 與 demo seed 拆開，正式環境只執行 schema 和經部門核准的治療師／容量設定。
