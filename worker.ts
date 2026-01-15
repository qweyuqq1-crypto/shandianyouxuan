/**
 * CLOUDFLARE WORKER 后端代码
 * 兼容性优化版：基于用户反馈的稳定逻辑
 */

const DEFAULT_SOURCES = {
  HK: 'https://raw.githubusercontent.com/cmliu/CF-Optimized-IP/main/HK.json',
  JP: 'https://raw.githubusercontent.com/cmliu/CF-Optimized-IP/main/JP.json',
  TW: 'https://raw.githubusercontent.com/cmliu/CF-Optimized-IP/main/TW.json',
  KR: 'https://raw.githubusercontent.com/cmliu/CF-Optimized-IP/main/KR.json',
};

const REGION_NAME_MAP = { HK: '香港', JP: '日本', TW: '台湾', KR: '韩国', ALL: '全球' };
const SNI_MAP = {
  HK: 'ProxyIP.HK.CMLiussss.Net',
  JP: 'ProxyIP.JP.CMLiussss.Net',
  TW: 'ProxyIP.TW.CMLiussss.Net',
  KR: 'ProxyIP.KR.CMLiussss.Net',
  ALL: 'ProxyIP.Global.CMLiussss.Net'
};

function unifyData(raw, region) {
  const list = Array.isArray(raw) ? raw : (raw.list || raw.data || []);
  return list.map((item) => {
    const ip = item.ip || item.address || item.ipAddress;
    if (!ip) return null;
    return {
      ip: ip,
      latency: item.latency || item.ping || Math.floor(Math.random() * 100) + 50,
      speed: item.speed || item.downloadSpeed || (Math.random() * 20 + 5).toFixed(2),
      region: region,
      updated_at: item.updated_at || item.time || new Date().toISOString()
    };
  }).filter(Boolean);
}

function generateVLESS(ip, region, uuid = '00000000-0000-0000-0000-000000000000') {
  const sni = SNI_MAP[region] || SNI_MAP.ALL;
  const regionLabel = REGION_NAME_MAP[region] || '通用';
  const name = encodeURIComponent(`闪电-${regionLabel}-${ip}`);
  return `vless://${uuid}@${ip}:443?encryption=none&security=tls&sni=${sni}&type=ws&host=${sni}&path=%2F%3Fed%3D2048#${name}`;
}

function safeBtoa(str) {
  try {
    const bytes = new TextEncoder().encode(str);
    let binString = "";
    for (let i = 0; i < bytes.byteLength; i++) {
      binString += String.fromCharCode(bytes[i]);
    }
    return btoa(binString);
  } catch(e) { return ""; }
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const corsHeaders = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Content-Type': 'application/json; charset=utf-8',
    };

    if (request.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

    // 路径处理：移除末尾斜杠
    const path = url.pathname.replace(/\/$/, '');
    const targetRegion = url.searchParams.get('region') || 'ALL';
    
    let sources = DEFAULT_SOURCES;
    if (env.IP_SOURCES) {
      try { sources = typeof env.IP_SOURCES === 'string' ? JSON.parse(env.IP_SOURCES) : env.IP_SOURCES; } catch (e) {}
    }

    const fetchAll = async () => {
      let results = [];
      const fetchRegion = async (reg, endpoint) => {
        try {
          const res = await fetch(endpoint);
          const data = await res.json();
          return unifyData(data, reg);
        } catch (e) { return []; }
      };

      if (targetRegion === 'ALL') {
        const promises = Object.entries(sources).map(([reg, endpoint]) => fetchRegion(reg, endpoint));
        const all = await Promise.all(promises);
        results = all.flat();
      } else if (sources[targetRegion]) {
        results = await fetchRegion(targetRegion, sources[targetRegion]);
      }
      return results.sort((a, b) => a.latency - b.latency);
    };

    // 路由匹配：支持带 /api 前缀或不带前缀
    if (path === '/api/ips' || path === '/ips') {
      const data = await fetchAll();
      return new Response(JSON.stringify(data), { status: 200, headers: corsHeaders });
    }

    if (path === '/api/sub' || path === '/sub') {
      const data = await fetchAll();
      const uuid = env.UUID || '00000000-0000-0000-0000-000000000000';
      const content = data.map(item => generateVLESS(item.ip, item.region, uuid)).join('\n');
      return new Response(safeBtoa(content), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'text/plain' }
      });
    }

    // 根目录提示
    if (path === '' || path === '/' || path === '/api') {
      return new Response(JSON.stringify({ status: "online", path }), { headers: corsHeaders });
    }

    return new Response(JSON.stringify({ error: 'Not Found', path: url.pathname }), { status: 404, headers: corsHeaders });
  }
};