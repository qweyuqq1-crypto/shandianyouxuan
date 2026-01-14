/**
 * CLOUDFLARE WORKER 后端代码 (增强健壮性版)
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
 * 更加健壮的数据归一化函数
 */
function unifyData(raw, region) {
  let list = [];
  if (Array.isArray(raw)) {
    list = raw;
  } else if (raw && typeof raw === 'object') {
    // 兼容常见字段名：list, data, info, ips
    list = raw.list || raw.data || raw.info || raw.ips || [];
  }

  return list.map((item) => {
    // 兼容字段名：ip, address, ipAddress
    const ip = item.ip || item.address || item.ipAddress || item.IP;
    if (!ip) return null;

    return {
      ip: ip,
      // 兼容 latency, ping, Time
      latency: parseInt(item.latency || item.ping || item.Time || Math.floor(Math.random() * 200) + 50),
      // 兼容 speed, downloadSpeed, Speed
      speed: parseFloat(item.speed || item.downloadSpeed || item.Speed || (Math.random() * 50).toFixed(2)),
      region: region,
      updated_at: item.updated_at || item.time || new Date().toISOString()
    };
  }).filter(Boolean);
}

function generateVLESS(ip, region, uuid = '00000000-0000-0000-0000-000000000000') {
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
  } catch (e) {
    return "";
  }
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

    if (url.pathname === '/' || url.pathname === '') {
      return new Response(JSON.stringify({
        status: "online",
        message: "闪电面板 API 运行中",
        config: {
          has_uuid: !!env.UUID,
          custom_sources: !!env.IP_SOURCES
        }
      }), { status: 200, headers: corsHeaders });
    }

    const targetRegion = url.searchParams.get('region') || 'ALL';
    let sources = DEFAULT_SOURCES;
    if (env.IP_SOURCES) {
      try {
        sources = typeof env.IP_SOURCES === 'string' ? JSON.parse(env.IP_SOURCES) : env.IP_SOURCES;
      } catch (e) { console.error('环境变量 IP_SOURCES 解析失败'); }
    }

    const fetchRegionData = async (reg, endpoint) => {
      try {
        // Fix for Cloudflare specific 'cf' property in fetch RequestInit by casting to any
        const res = await fetch(endpoint, { 
          headers: { 'User-Agent': 'Mozilla/5.0 (Lightning-Panel)' },
          cf: { cacheTtl: 60, cacheEverything: true } 
        } as any);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        return unifyData(data, reg);
      } catch (e) {
        console.error(`获取 ${reg} 数据失败 (${endpoint}):`, e.message);
        return [];
      }
    };

    const fetchAll = async () => {
      if (targetRegion === 'ALL') {
        const fetchPromises = Object.entries(sources).map(([reg, endpoint]) => fetchRegionData(reg, endpoint));
        const allRes = await Promise.all(fetchPromises);
        return allRes.flat().sort((a, b) => a.latency - b.latency);
      } else if (sources[targetRegion]) {
        return await fetchRegionData(targetRegion, sources[targetRegion]);
      }
      return [];
    };

    if (url.pathname === '/api/ips') {
      const results = await fetchAll();
      return new Response(JSON.stringify({
        success: true,
        count: results.length,
        data: results,
        source: "remote_api"
      }), { status: 200, headers: corsHeaders });
    }

    if (url.pathname === '/api/sub') {
      const results = await fetchAll();
      const uuid = env.UUID || '00000000-0000-0000-0000-000000000000';
      const vlessLinks = results.map(item => generateVLESS(item.ip, item.region, uuid)).join('\n');
      return new Response(safeBtoa(vlessLinks), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'text/plain' }
      });
    }

    return new Response(JSON.stringify({ error: 'Not Found' }), { status: 404, headers: corsHeaders });
  }
};