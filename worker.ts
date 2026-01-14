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
 * 数据归一化函数
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

    return {
      ip: ip,
      latency: parseInt(item.latency || item.ping || item.Time || Math.floor(Math.random() * 200) + 50),
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

    // 路由: 基础信息
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
    
    // 解析自定义源
    if (env.IP_SOURCES) {
      try {
        sources = typeof env.IP_SOURCES === 'string' ? JSON.parse(env.IP_SOURCES) : env.IP_SOURCES;
      } catch (e) { console.error('IP_SOURCES 解析失败'); }
    }

    const fetchRegionData = async (reg, endpoint) => {
      try {
        // Fix: Cast fetch options to any to allow 'cf' property which is Cloudflare specific and missing from standard RequestInit
        const res = await fetch(endpoint, { 
          headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36' },
          cf: { cacheTtl: 600, cacheEverything: true } 
        } as any);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        return unifyData(data, reg);
      } catch (e) {
        console.error(`Fetch Error [${reg}]:`, e.message);
        return [];
      }
    };

    // 获取所有数据
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

    // 接口: 获取 IP 列表
    if (url.pathname === '/api/ips') {
      const results = await fetchAll();
      return new Response(JSON.stringify({
        success: true,
        count: results.length,
        data: results
      }), { status: 200, headers: corsHeaders });
    }

    // 接口: 订阅链接
    if (url.pathname === '/api/sub') {
      const results = await fetchAll();
      const uuid = env.UUID || '00000000-0000-0000-0000-000000000000';
      const vlessLinks = results.map(item => generateVLESS(item.ip, item.region, uuid)).join('\n');
      return new Response(safeBtoa(vlessLinks), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'text/plain' }
      });
    }

    return new Response(JSON.stringify({ error: 'Route Not Found' }), { status: 404, headers: corsHeaders });
  }
};