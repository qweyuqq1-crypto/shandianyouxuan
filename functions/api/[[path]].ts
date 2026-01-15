export const onRequest = async (context) => {
  const { request, env } = context;

  if (!env.API) {
    return new Response(
      JSON.stringify({ error: "Service Binding 'API' missing" }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }

  try {
    // 这里的 fetch 会透传完整的请求对象（包含 URL、Headers、Method 等）
    return await env.API.fetch(request.clone());
  } catch (err) {
    return new Response(
      JSON.stringify({ error: "Proxy failed", message: err.message }),
      { status: 502, headers: { 'Content-Type': 'application/json' } }
    );
  }
};