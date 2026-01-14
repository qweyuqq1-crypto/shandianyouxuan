
# 部署指南 - 闪电面板 (Lightning Panel)

本系统采用 **Cloudflare Pages (前端)** + **Cloudflare Workers (后端 API)** 的架构。

## 1. 部署后端 (Workers)
1. 登录 [Cloudflare Dashboard](https://dash.cloudflare.com/)。
2. 进入 **Workers & Pages** -> **Create application** -> **Create Worker**。
3. 将 `worker.ts` (纯 JS 兼容版) 中的代码粘贴到编辑器并 **Save and Deploy**。
4. **设置环境变量**：
   - 进入 Worker -> **Settings** -> **Variables**。
   - 添加 `UUID`：填入你的 VLESS 用户 ID（重要：不设置此项链接将无效）。
   - 添加 `IP_SOURCES`：填入自定义 JSON 源（可选）。

## 2. 关于节点数据 (IP 从哪来？)
面板默认集成了社区公共测速源，如果你想使用自己的数据：

### A. 使用社区源 (默认)
代码中已内置 `cmliu/CF-Optimized-IP` 的测速结果。

### B. 自行测速并发布 (推荐)
1. 使用工具 [CloudflareSpeedTest](https://github.com/XIU2/CloudflareSpeedTest) 在本地进行测速。
2. 将得到的 `result.csv` 转换为 JSON 格式（包含 `ip`, `latency` 等字段）。
3. 将 JSON 文件上传至 GitHub Gist 或 Web 服务器。
4. 将该链接配置到 Worker 的 `IP_SOURCES` 变量中。格式：
   `{"HK":"链接1","JP":"链接2"}`

## 3. 绑定前后端 (关键步骤)
1. 进入 **Pages 项目** -> **Settings** -> **Functions**。
2. 在 **Service Bindings** 处添加绑定。
3. **Variable name** 填 `API`，**Service** 选择你的 Worker。

## 4. 常见问题
- **节点连不上**: 检查 UUID 是否匹配你的后端服务器。
- **数据不更新**: 检查 `IP_SOURCES` 的 URL 是否能正常访问（Raw 链接）。
