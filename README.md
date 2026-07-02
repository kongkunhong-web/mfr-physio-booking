# 物理治療預約

手機優先的物理治療預約前端原型。第一版為純前端 demo，使用 deterministic fake data 與 localStorage 保存預約結果。

## 開發

```bash
npm install
npm run dev
```

## Build

```bash
npm run build
```

## Deploy

Oracle 上請先切換 Node 24：

```bash
cd /home/ubuntu/projects/mfr-physio-booking
source ~/.nvm/nvm.sh
nvm use
```

若使用 Cloudflare API token：

```bash
export CLOUDFLARE_API_TOKEN="..."
npm run deploy
```

部署後在 Cloudflare Pages 綁定自訂網域：

```text
mfr.09071247.xyz
```

## Demo 帳戶

- 身份證：`6661`
- 電話：`28313731`

## Oracle Source Of Truth

正式修改位置：

```text
/home/ubuntu/projects/mfr-physio-booking
```
