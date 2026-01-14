
# 部署指南 - 闪电面板 (Lightning Panel)

本系统采用 **Cloudflare Pages (前端)** + **Cloudflare Workers (后端 API)** 的架构。

## 1. 部署后端 (Workers)
1. 登录 [Cloudflare Dashboard](https://dash.cloudflare.com/)。
2. 进入 **Workers & Pages** -> **Create application** -> **Create Worker**。
3. 将 `worker.ts` (纯 JS 兼容版) 中的代码粘贴到编辑器并 **Save and Deploy**。
4. **设置环境变量**：
   - 进入 Worker -> **Settings** -> **Variables**。
   - 添加 `IP_SOURCES`：填入 JSON 格式的源（例如：`{"HK":"URL1","JP":"URL2"}`）。
   - 添加 `UUID`：你的 VLESS 用户 ID（可选）。

## 2. 绑定前后端 (关键步骤)
你有两种方式让前端 Pages 访问到后端 Worker：

### 方案 A：在 Pages 中设置服务绑定 (推荐)
1. 进入 **Pages 项目** -> **Settings** -> **Functions**。
2. 在 **Service Bindings** 处点击 **Add binding**。
3. **Variable name** 填 `API`，**Service** 选择你的 Worker。
4. 这种方式不需要额外配置路由，Pages 会自动处理。

### 方案 B：在 Worker 中设置路由触发器
1. 进入 **Worker 项目** -> **Settings** -> **Triggers**。
2. 点击 **Add Route**。
3. **Route**: `你的Pages域名/api/*` (例如 `lightning.pages.dev/api/*`)。
4. **Zone**: 选择关联的域名区域。

## 3. 常见问题
- **404 错误**: 检查路由是否以 `/api/*` 结尾。
- **跨域 (CORS)**: Worker 代码已默认开启 CORS，若仍有问题，请在 Worker 环境变量中设置 `ALLOWED_ORIGIN`。
- **数据不显示**: 检查 `IP_SOURCES` 的 JSON 格式是否正确。
