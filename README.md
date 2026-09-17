# 復康科治療預約及排更系統

本倉庫保存現行示範系統的完整原始碼及 SQL 


## 技術架構

- 前端：React 19、TypeScript、Vite
- API：Cloudflare Pages Functions（TypeScript）
- 現行資料庫：Cloudflare D1（SQLite 相容語法）
- 現行託管：Cloudflare Pages
- Excel 輸出：ExcelJS
- 圖示：Lucide React

## 主要目錄

```text
src/                         React 前端介面
functions/api/[[path]].ts    API、排期規則及資料庫操作
migrations/                  完整 SQL schema、seed 及後續 migration
public/                      靜態部署設定
scripts/                     示範 seed 產生工具
docs/                        系統部署、資料庫及驗證說明
wrangler.toml                現行 Cloudflare Pages／D1 綁定設定
```

## 主要程式碼

- `src/App.tsx`：前台及後台主要介面與操作流程。
- `functions/api/[[path]].ts`：後端 API、預約規則及資料庫操作。
- `src/styles.css`：網站版面及手機顯示樣式。
- `migrations/`：完整 SQL 資料庫結構及更新內容。

## SQL 執行次序

新環境必須依檔名順序執行：

1. `migrations/0001_schema.sql`
2. `migrations/0002_patient_course_window.sql`
3. `migrations/0003_admin_queue_monday_portal.sql`
4. `migrations/0004_add_ot_service.sql`

`0001_schema.sql` 包含結構、容量、治療師、醫生及測試患者 seed。所有患者資料均為示範資料，但正式環境仍應先審閱並移除不需要的 seed。

## 本機開發

需要 Node.js 24：

```bash
npm install
npm run dev
```

建立 production bundle：

```bash
npm run build
```

Cloudflare D1 本機初始化：

```bash
npm run db:migrate:local
npm run build
npm run dev:cf
```

## 現行測試登入

- 後台示範密碼：`admin`

上述資料及後台驗證均只供示範。正式部署時必須移除前端預填密碼，並以正式身份認證及角色權限系統取代。

## 相關文件

- [系統部署說明](docs/SYSTEM_DEPLOYMENT.md)
- [資料庫及 SQL 說明](docs/DATABASE.md)
- [專案內容及驗證](docs/PROJECT_VERIFICATION.md)

## 現行線上版本

- 網址：`https://mfr.09071247.xyz`

