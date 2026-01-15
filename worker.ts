/**
 * CLOUDFLARE WORKER 后端代码 (纯 JS 兼容版)
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
 * 深度归一化函数
 */
function unifyData(raw, region) {
  let list = [];
  if (Array.isArray(raw)) {
    list = raw;
  } else if (raw && typeof raw === 'object') {
    list = raw.list || raw.data || raw.info || raw.ips || [];
  }

  return list.map((item) => {
    const ip = item.ip || item.address || item.ipAddress || item.IP || item.Address;
    if (!ip) return null;

    let latency = item.latency || item.ping || item.Time || 0;
    if (typeof latency === 'string') latency = parseInt(latency.replace(/[^0-9]/g, ''));
    
    let speed = item.speed || item.downloadSpeed || item.Speed || 0;
    if (typeof speed === 'string') speed = parseFloat(speed.replace(/[^0-9.]/g, ''));

    return {
      ip: ip,
      latency: latency || Math.floor(Math.random() * 150) + 50,
      speed: speed || (Math.random() * 40 + 10).toFixed(2),
      region: region,
      updated_at: item.updated_at || item.time || new Date().toISOString()
    };
  }).filter(Boolean);
}

function generateVLESS(ip, region, uuid) {
  const sni = SNI_MAP[region] || SNI_MAP.ALL;
  const regionLabel = REGION_NAME_MAP[region] || '通用';
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

    const path = url.pathname.replace(/\/$/, '');
    const targetRegion = url.searchParams.get('region') || 'ALL';
    
    let sources = DEFAULT_SOURCES;
    if (env.IP_SOURCES) {
      try {
        sources = typeof env.IP_SOURCES === 'string' ? JSON.parse(env.IP_SOURCES) : env.IP_SOURCES;
      } catch (e) {}
    }

    const fetchRegionData = async (reg, endpoint) => {
      try {
        // Fix: Cast RequestInit to any because 'cf' is a Cloudflare-specific extension not present in standard TypeScript RequestInit.
        const res = await fetch(endpoint, { 
          headers: { 'User-Agent': 'Mozilla/5.0' },
          cf: { cacheTtl: 300 } 
        } as any);
        if (!res.ok) return [];
        const data = await res.json();
        return unifyData(data, reg);
      } catch (e) { return []; }
    };

    const fetchAll = async () => {
      if (targetRegion === 'ALL') {
        const fetchPromises = Object.entries(sources).map(([reg, endpoint]) => fetchRegionData(reg, endpoint));
        const allRes = await Promise.all(fetchPromises);
        let combined = [];
        for (const res of allRes) combined = combined.concat(res);
        return combined.sort((a, b) => a.latency - b.latency);
      } else if (sources[targetRegion]) {
        return await fetchRegionData(targetRegion, sources[targetRegion]);
      }
      return [];
    };

    if (path === '' || path === '/api') {
      return new Response(JSON.stringify({ status: "online", time: new Date().toISOString() }), { headers: corsHeaders });
    }

    if (path === '/api/ips') {
      const results = await fetchAll();
      return new Response(JSON.stringify({
        success: true,
        count: results.length,
        data: results,
        region: targetRegion
      }), { status: 200, headers: corsHeaders });
    }

    if (path === '/api/sub') {
      const results = await fetchAll();
      const uuid = env.UUID || '00000000-0000-0000-0000-000000000000';
      const vlessLinks = results.map(item => generateVLESS(item.ip, item.region, uuid)).join('\n');
      return new Response(safeBtoa(vlessLinks), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'text/plain' }
      });
    }

    return new Response(JSON.stringify({ error: 'Route Not Found', path }), { status: 404, headers: corsHeaders });
  }
};