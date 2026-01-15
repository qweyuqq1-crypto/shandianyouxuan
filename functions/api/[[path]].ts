export const onRequest = async (context) => {
  const { request, env } = context;

  // 1. 检查服务绑定是否存在
  if (!env.API) {
    return new Response(
      JSON.stringify({ 
        error: "未发现服务绑定", 
        message: "请在 Cloudflare Pages 控制台 -> Settings -> Functions -> Service Bindings 中添加名为 'API' 的绑定。" 
      }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }

  // 2. 转发请求给 Worker
  // 使用 clone() 确保请求体可以被多次读取（如果需要）
  try {
    // 这里的 fetch 会触发绑定的 Worker 的 fetch 方法
    return await env.API.fetch(request.clone());
  } catch (err) {
    console.error('[Pages Function Error]:', err);
    return new Response(
      JSON.stringify({ 
        error: "转发至 Worker 失败", 
        message: err.message,
        stack: err.stack
      }),
      { status: 502, headers: { 'Content-Type': 'application/json' } }
    );
  }
};