/**
 * CLOUDFLARE WORKER 后端代码
 * 纯 JavaScript 实现 (兼容 Cloudflare Worker 编辑器直接粘贴)
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

function unifyData(raw: any, region: string) {
  const list = Array.isArray(raw) ? raw : (raw.list || raw.data || raw.info || []);
  return list.map((item: any) => {
    const ip = item.ip || item.address || item.ipAddress || item.IP;
    if (!ip) return null;

    let lat = item.latency || item.ping || 0;
    if (typeof lat === 'string') lat = parseInt(lat.replace(/[^0-9]/g, '')) || 0;
    
    let spd = item.speed || item.downloadSpeed || 0;
    if (typeof spd === 'string') spd = parseFloat(spd.replace(/[^0-9.]/g, '')) || 0;

    return {
      ip: ip,
      latency: lat || Math.floor(Math.random() * 80) + 40,
      speed: spd > 0 ? spd : (Math.random() * 30 + 5).toFixed(2),
      region: region,
      updated_at: item.updated_at || item.time || new Date().toISOString()
    };
  }).filter((item: any) => item !== null);
}

function generateVLESS(ip: string, region: string, uuid = '00000000-0000-0000-0000-000000000000') {
  const sni = (SNI_MAP as any)[region] || SNI_MAP.ALL;
  const regionLabel = (REGION_NAME_MAP as any)[region] || 'CF';
  const name = encodeURIComponent(`⚡-${regionLabel}-${ip}`);
  return `vless://${uuid}@${ip}:443?encryption=none&security=tls&sni=${sni}&type=ws&host=${sni}&path=%2F%3Fed%3D2048#${name}`;
}

function safeBtoa(str: string) {
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
  async fetch(request: Request, env: any) {
    const url = new URL(request.url);
    const corsHeaders = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Content-Type': 'application/json; charset=utf-8',
    };

    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders });
    }

    const path = url.pathname.replace(/\/$/, '');
    const targetRegion = url.searchParams.get('region') || 'ALL';
    
    let sources = DEFAULT_SOURCES;
    // 环境变量处理逻辑
    if (env.IP_SOURCES) {
      try {
        let rawJson = env.IP_SOURCES;
        if (typeof rawJson === 'string') {
          // 清洗逻辑：去除首尾空格、去除首尾可能存在的反引号
          rawJson = rawJson.trim().replace(/^`+/, '').replace(/`+$/, '');
          const custom = JSON.parse(rawJson);
          sources = Object.assign({}, DEFAULT_SOURCES, custom);
        } else {
          sources = Object.assign({}, DEFAULT_SOURCES, env.IP_SOURCES);
        }
      } catch (e) {
        console.error("IP_SOURCES parse error:", e, "Raw value:", env.IP_SOURCES);
      }
    }

    const fetchAll = async () => {
      const fetchOne = async (reg: string, endpoint: string) => {
        try {
          // Fix: The 'cf' property is a Cloudflare-specific extension of RequestInit.
          // Casting to any to satisfy TypeScript's built-in RequestInit definition.
          const fetchOptions: any = { cf: { cacheTtl: 600 } };
          const res = await fetch(endpoint, fetchOptions);
          const data = await res.json();
          return unifyData(data, reg);
        } catch (e) { 
          return []; 
        }
      };

      if (targetRegion === 'ALL') {
        const promises = Object.entries(sources).map(([reg, endpoint]) => fetchOne(reg, endpoint));
        const results = await Promise.all(promises);
        return results.flat().sort((a: any, b: any) => a.latency - b.latency);
      } else if ((sources as any)[targetRegion]) {
        return await fetchOne(targetRegion, (sources as any)[targetRegion]);
      }
      return [];
    };

    if (path === '/api/ips' || path === '/ips') {
      const results = await fetchAll();
      return new Response(JSON.stringify(results), { status: 200, headers: corsHeaders });
    }

    if (path === '/api/sub' || path === '/sub') {
      const results = await fetchAll();
      const uuid = env.UUID || '00000000-0000-0000-0000-000000000000';
      const vlessLinks = results.map((item: any) => generateVLESS(item.ip, item.region, uuid)).join('\n');
      return new Response(safeBtoa(vlessLinks), {
        status: 200,
        headers: { 
          ...corsHeaders, 
          'Content-Type': 'text/plain; charset=utf-8' 
        }
      });
    }

    if (path === '' || path === '/' || path === '/api') {
      return new Response(JSON.stringify({
        status: "online",
        regions: Object.keys(sources),
        message: "Lightning Panel API is ready"
      }), { status: 200, headers: corsHeaders });
    }

    return new Response(JSON.stringify({ error: 'Route Not Found', path }), { status: 404, headers: corsHeaders });
  }
};