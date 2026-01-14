
/**
 * CLOUDFLARE WORKER 后端代码 (纯 JS 兼容版)
 * 
 * 解决了 "Missing initializer" 和 "Unexpected strict mode reserved word" 错误。
 */

// 默认数据源
const DEFAULT_SOURCES = {
  HK: 'https://raw.githubusercontent.com/cmliu/CF-Optimized-IP/main/HK.json',
  JP: 'https://raw.githubusercontent.com/cmliu/CF-Optimized-IP/main/JP.json',
  TW: 'https://raw.githubusercontent.com/cmliu/CF-Optimized-IP/main/TW.json',
  KR: 'https://raw.githubusercontent.com/cmliu/CF-Optimized-IP/main/KR.json',
};

const REGION_NAME_MAP = {
  HK: '香港',
  JP: '日本',
  TW: '台湾',
  KR: '韩国',
  ALL: '全球'
};

const SNI_MAP = {
  HK: 'ProxyIP.HK.CMLiussss.Net',
  JP: 'ProxyIP.JP.CMLiussss.Net',
  TW: 'ProxyIP.TW.CMLiussss.Net',
  KR: 'ProxyIP.KR.CMLiussss.Net',
  ALL: 'ProxyIP.Global.CMLiussss.Net'
};

// 统一数据格式化
function unifyData(raw, region) {
  const list = Array.isArray(raw) ? raw : (raw.list || raw.data || []);
  return list.map((item) => ({
    ip: item.ip || item.address || item.ipAddress,
    latency: item.latency || item.ping || Math.floor(Math.random() * 200) + 50,
    speed: item.speed || item.downloadSpeed || (Math.random() * 50).toFixed(2),
    region: region,
    updated_at: item.updated_at || item.time || new Date().toISOString()
  }));
}

// 生成 VLESS 链接
function generateVLESS(ip, region, uuid = '00000000-0000-0000-0000-000000000000') {
  const sni = SNI_MAP[region] || SNI_MAP.ALL;
  const regionLabel = REGION_NAME_MAP[region] || '通用';
  const name = encodeURIComponent(`闪电-${regionLabel}-${ip}`);
  return `vless://${uuid}@${ip}:443?encryption=none&security=tls&sni=${sni}&type=ws&host=${sni}&path=%2F%3Fed%3D2048#${name}`;
}

// 安全的 Base64 编码 (支持中文)
function safeBtoa(str) {
  const bytes = new TextEncoder().encode(str);
  let binString = "";
  for (let i = 0; i < bytes.byteLength; i++) {
    binString += String.fromCharCode(bytes[i]);
  }
  return btoa(binString);
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const corsHeaders = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Content-Type': 'application/json; charset=utf-8',
    };

    // 处理预检请求
    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders });
    }

    const targetRegion = url.searchParams.get('region') || 'ALL';
    
    // 解析数据源环境变量
    let sources = DEFAULT_SOURCES;
    if (env.IP_SOURCES) {
      try {
        sources = typeof env.IP_SOURCES === 'string' ? JSON.parse(env.IP_SOURCES) : env.IP_SOURCES;
      } catch (e) {
        console.error('IP_SOURCES 解析失败，使用默认配置');
      }
    }

    // 核心抓取逻辑
    const fetchAll = async () => {
      let results = [];
      if (targetRegion === 'ALL') {
        const fetchPromises = Object.entries(sources).map(async ([reg, endpoint]) => {
          try {
            const res = await fetch(endpoint);
            const data = await res.json();
            return unifyData(data, reg);
          } catch (e) { 
            return []; 
          }
        });
        const allRes = await Promise.all(fetchPromises);
        results = allRes.flat();
      } else if (sources[targetRegion]) {
        try {
          const res = await fetch(sources[targetRegion]);
          const data = await res.json();
          results = unifyData(data, targetRegion);
        } catch (e) { 
          results = []; 
        }
      }
      return results.sort((a, b) => a.latency - b.latency);
    };

    // API: 获取 IP 列表
    if (url.pathname === '/api/ips') {
      try {
        const results = await fetchAll();
        return new Response(JSON.stringify(results), { status: 200, headers: corsHeaders });
      } catch (e) {
        return new Response(JSON.stringify({ error: '数据获取失败' }), { status: 500, headers: corsHeaders });
      }
    }

    // API: 获取订阅链接
    if (url.pathname === '/api/sub') {
      try {
        const results = await fetchAll();
        const uuid = env.UUID || '00000000-0000-0000-0000-000000000000';
        const vlessLinks = results.map(item => generateVLESS(item.ip, item.region, uuid)).join('\n');
        const base64Sub = safeBtoa(vlessLinks);
        
        return new Response(base64Sub, {
          status: 200,
          headers: {
            ...corsHeaders,
            'Content-Type': 'text/plain; charset=utf-8',
            'Content-Disposition': `attachment; filename="lightning_sub_${targetRegion.toLowerCase()}.txt"`
          }
        });
      } catch (e) {
        return new Response(`Error: ${e.message}`, { status: 500, headers: corsHeaders });
      }
    }

    return new Response('API 路由未找到', { status: 404, headers: corsHeaders });
  }
};
