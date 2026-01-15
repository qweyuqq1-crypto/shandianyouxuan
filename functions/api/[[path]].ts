export const onRequest = async (context) => {
  const { request, env } = context;

  // 如果没有服务绑定，直接返回 500 提示
  if (!env.API) {
    return new Response(
      JSON.stringify({ 
        error: "未发现服务绑定", 
        message: "请在 Cloudflare Pages 控制台 -> Settings -> Functions -> Service Bindings 中添加名为 'API' 的绑定。" 
      }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }

  // 转发请求给 Worker
  try {
    return await env.API.fetch(request.clone());
  } catch (err) {
    return new Response(
      JSON.stringify({ error: "转发失败", message: err.message }),
      { status: 502, headers: { 'Content-Type': 'application/json' } }
    );
  }
};