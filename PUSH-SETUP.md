# Web Push 使用说明

## 1. 启动服务

在项目根目录运行：

```bash
npm.cmd install
npm.cmd start
```

启动后访问：

- `http://127.0.0.1:8787/index.html`

说明：首次启动会自动生成 `.push-vapid.json`，并保存推送订阅到 `.push-subscriptions.json`。

## 2. 开启推送权限

1. 打开应用后，进入聊天详情里的“开启浏览器通知”按钮。
2. 允许浏览器通知权限。
3. 页面会自动完成 Web Push 订阅并发送一条测试通知。

## 3. 验证“退出浏览器仍可推送”

1. 保持 `push-server.js` 在运行。
2. 关闭浏览器窗口（Service Worker 仍由浏览器后台托管）。
3. 在终端执行测试推送：

```powershell
Invoke-RestMethod -Uri 'http://127.0.0.1:8787/api/push/send-test' -Method Post -ContentType 'application/json' -Body '{"title":"后台推送","body":"浏览器窗口关闭后测试"}'
```

## 4. 常用接口

- `GET /api/push/vapid-public-key`
- `POST /api/push/subscribe`
- `POST /api/push/unsubscribe`
- `POST /api/push/send-test`
- `GET /api/push/subscriptions`

## 5. 注意

- 必须使用安全上下文：`https` 或 `localhost/127.0.0.1`。
- Safari 需要 iOS/iPadOS 16.4+ 或 macOS 13+ 才支持 Web Push。
- Firefox/Chrome 桌面端支持良好，前提是系统通知总开关开启。
