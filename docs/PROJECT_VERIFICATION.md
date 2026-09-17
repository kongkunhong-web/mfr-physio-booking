# 專案內容及驗證

## 專案內容

- React／TypeScript 前端原始碼；
- Cloudflare Pages Functions API；
- 四份 SQL migrations；
- build、preview、migration 及 deploy scripts；
- 系統排期規則與示範 seed；
- 系統部署及資料庫說明。

## 本機驗證

```bash
npm ci
npm run build
npm run db:migrate:local
```

完成後應在隔離環境驗證患者登入、後台登入、名額查詢、預約確認、不可預約時段、改期、批量轉移及 Excel 匯出。

## 目前檢查結果

- `npm run build`：通過。
- 四份 D1 migrations：已在全新本機資料庫依序執行成功。
- `npm audit --omit=dev`：現有 ExcelJS 依賴鏈回報 1 個 high、2 個 moderate 弱點。正式部署前應重新評估 Excel 匯出方案、鎖定版本及依賴風險。
