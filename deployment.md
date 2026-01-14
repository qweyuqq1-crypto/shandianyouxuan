
# 部署指南 - 闪电面板 (Lightning Panel)

本系统采用 **Cloudflare Pages (前端)** + **Cloudflare Workers (后端 API)** 的架构部署。

## 1. 部署后端 (Workers)
1. 登录 [Cloudflare Dashboard](https://dash.cloudflare.com/)。
2. 进入 **Workers & Pages** -> **Create application** -> **Create Worker**。
3. 命名为 `lightning-ip-api`。
4. 将 `worker.ts` 中的代码粘贴到编辑器中并保存。
5. **设置环境变量**（必选）：
   - 在 Worker 的 **Settings** -> **Variables** 中添加 `IP_SOURCES`。
   - 格式为 JSON 字符串，例如：
     ```json
     {"HK":"https://raw.githubusercontent.com/.../HK.json","JP":"https://raw.githubusercontent.com/.../JP.json"}
     ```

## 2. 部署前端 (Pages)
1. 进入 **Workers & Pages** -> **Create application** -> **Pages**。
2. 选择 **Connect to Git** 或 **Direct Upload**。
3. **构建设置** (重要，防止部署失败)：
   - **Framework preset**: `Vite`
   - **Build command**: `npm run build`
   - **Output directory**: `dist`
   - **Node.js version**: 确保为 `18` 或更高版本。
4. **API 转发绑定**:
   - 在 Pages 项目的 **Settings** -> **Functions** 中，将 `/api` 路径绑定到你创建的 `lightning-ip-api` Worker。

## 3. 常见问题排查 (Troubleshooting)
- **构建报错**: 确保仓库根目录下包含 `package.json` 和 `vite.config.ts`。
- **数据加载失败**: 检查 Worker 的 CORS 设置，确保 `ALLOWED_ORIGIN` 包含你的 Pages 域名。
- **二维码显示异常**: 确保 `qrcode.react` 已正确安装并导入。

## 4. UI 优化特性
- **闪电动态**: 系统图标与测速条具有实时动画反馈。
- **电磁感应风格**: 琥珀黄与深邃蓝的暗色系搭配，极具科技感。
