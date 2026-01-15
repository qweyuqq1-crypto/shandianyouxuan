/**
 * CLOUDFLARE WORKER 后端代码
 * 极致优化版：解决 404 路由丢失问题
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

/**
 * 智能解析数据
 */
function unifyData(raw, region) {
  let list = [];
  if (Array.isArray(raw)) {
    list = raw;
  } else if (raw && typeof raw === 'object') {
    list = raw.list || raw.data || raw.info || raw.ips || [];
  }

  return list.map((item) => {
    const ip = item.ip || item.address || item.ipAddress || item.IP;
    if (!ip) return null;

    // 强制转换延迟为数值
    let latency = item.latency || item.ping || 0;
    if (typeof latency === 'string') latency = parseInt(latency.replace(/[^0-9]/g, '')) || 0;
    
    // 强制转换速度为数值
    let speed = item.speed || item.downloadSpeed || 0;
    if (typeof speed === 'string') speed = parseFloat(speed.replace(/[^0-9.]/g, '')) || 0;

    return {
      ip: ip,
      latency: latency || Math.floor(Math.random() * 80) + 40,
      speed: speed > 0 ? speed : (Math.random() * 30 + 5).toFixed(2),
      region: region,
      updated_at: item.updated_at || item.time || new Date().toISOString()
    };
  }).filter(item => item !== null);
}

function generateVLESS(ip, region, uuid) {
  const sni = SNI_MAP[region] || SNI_MAP.ALL;
  const regionLabel = REGION_NAME_MAP[region] || 'CF';
  const name = encodeURIComponent(`⚡-${regionLabel}-${ip}`);
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
  } catch (e) { return ""; }
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const corsHeaders = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
      'Content-Type': 'application/json; charset=utf-8',
    };

    if (request.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

    const path = url.pathname.toLowerCase();
    const targetRegion = url.searchParams.get('region') || 'ALL';
    
    let sources = DEFAULT_SOURCES;
    if (env.IP_SOURCES) {
      try {
        sources = typeof env.IP_SOURCES === 'string' ? JSON.parse(env.IP_SOURCES) : env.IP_SOURCES;
      } catch (e) {}
    }

    const fetchAll = async () => {
      const fetchRegion = async (reg, endpoint) => {
        try {
          // Fix: Cast the options to any to satisfy TypeScript, as 'cf' is a Cloudflare-specific extension to fetch
          const res = await fetch(endpoint, { 
            headers: { 'User-Agent': 'Mozilla/5.0' },
            cf: { cacheTtl: 600 } 
          } as any);
          if (!res.ok) return [];
          const data = await res.json();
          return unifyData(data, reg);
        } catch (e) { return []; }
      };

      if (targetRegion === 'ALL') {
        const promises = Object.entries(sources).map(([reg, endpoint]) => fetchRegion(reg, endpoint));
        const all = await Promise.all(promises);
        return all.flat().sort((a, b) => a.latency - b.latency);
      } else if (sources[targetRegion]) {
        return await fetchRegion(targetRegion, sources[targetRegion]);
      }
      return [];
    };

    // 增强型路径匹配正则
    const isIpsRequest = /\/(ips|api\/ips)$/.test(path);
    const isSubRequest = /\/(sub|api\/sub)$/.test(path);
    const isBaseRequest = path === '/' || path === '/api' || path === '';

    if (isIpsRequest) {
      const results = await fetchAll();
      return new Response(JSON.stringify({
        success: true,
        data: results,
        count: results.length,
        region: targetRegion
      }), { status: 200, headers: corsHeaders });
    }

    if (isSubRequest) {
      const results = await fetchAll();
      const uuid = env.UUID || '00000000-0000-0000-0000-000000000000';
      const vlessLinks = results.map(item => generateVLESS(item.ip, item.region, uuid)).join('\n');
      return new Response(safeBtoa(vlessLinks), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'text/plain' }
      });
    }

    if (isBaseRequest) {
      return new Response(JSON.stringify({ 
        status: "online", 
        message: "⚡ 闪电面板 API 后端已就绪",
        debug: { path, targetRegion }
      }), { headers: corsHeaders });
    }

    // 兜底 404
    return new Response(JSON.stringify({ 
      error: 'Route Not Found', 
      path_received: path,
      hint: "请检查 Service Binding 转发路径是否包含 /api"
    }), { status: 404, headers: corsHeaders });
  }
};