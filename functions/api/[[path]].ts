/**
 * 这是一个 Cloudflare Pages Function
 * 它负责将所有 /api/* 的请求转发给名为 API 的服务绑定（Worker）
 */

// Added local type definitions for Cloudflare Pages environment to resolve compilation errors
interface Fetcher {
  fetch: (request: Request) => Promise<Response>;
}

type PagesFunction<Env = any> = (context: {
  request: Request;
  env: Env;
  params: Record<string, string | string[]>;
  data: any;
  next: (input?: Request | string, init?: RequestInit) => Promise<Response>;
}) => Response | Promise<Response>;

export const onRequest: PagesFunction<{ API: Fetcher }> = async (context) => {
  const { request, env } = context;

  // 检查是否设置了名为 API 的服务绑定
  if (!env.API) {
    return new Response(
      JSON.stringify({ error: "未发现服务绑定。请在 Pages 设置 -> 函数 -> 服务绑定中添加名为 'API' 的绑定。" }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }

  // 将请求转发给 Worker
  // Worker 接收到的 URL 将包含完整的路径（例如 /api/ips）
  return env.API.fetch(request.clone());
};