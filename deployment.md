# 部署与配置深度指南

## 1. 准备数据源 (JSON 文件)
你需要准备若干个 JSON 文件。你可以将它们上传到 GitHub 仓库并使用 `raw` 链接。

**推荐的 JSON 结构：**
```json
[
  { "ip": "1.1.1.1", "latency": 50, "speed": 25.5 },
  { "ip": "1.0.0.1", "latency": 60, "speed": 18.2 }
]
```

## 2. 配置 Worker 环境变量
在 Cloudflare 控制台的 **Settings -> Variables** 中配置以下内容：

| 变量名 | 示例值 | 说明 |
| :--- | :--- | :--- |
| `UUID` | `你的-VLESS-UUID` | 必填，用于生成节点链接 |
| `IP_SOURCES` | `{"HK":"https://raw.../hk.json", "JP":"..."}` | 选填，覆盖默认的 GitHub 数据源 |

## 3. 国家筛选逻辑
面板会自动根据 URL 参数 `?region=HK` 向 Worker 发起请求。Worker 会根据 `IP_SOURCES` 中定义的键值对去抓取对应的 JSON 文件。

**注意：** 
- 如果你新增了国家（比如美国 US），只需在 `IP_SOURCES` 中添加 `"US": "url"`。
- 同时在前端 `constants.tsx` 的 `REGION_CONFIG` 中同步添加对应的图标和标签即可显示在页面上。