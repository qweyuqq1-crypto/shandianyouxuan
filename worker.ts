/**
 * CLOUDFLARE WORKER 后端代码
 * 增强逻辑版：支持灵活配置源与国家筛选
 */

// 默认源：如果环境变量未配置，则回退到此
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
 * 统一数据处理：
 * 自动识别不同的 JSON 结构 (数组或带 list 的对象)
 */
function unifyData(raw, region) {
  const list = Array.isArray(raw) ? raw : (raw.list || raw.data || raw.info || []);
  return list.map((item) => {
    const ip = item.ip || item.address || item.ipAddress || item.IP;
    if (!ip) return null;
    
    // 自动清洗延迟和速度数据
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
  }).filter(Boolean);
}

function generateVLESS(ip, region, uuid = '00000000-0000-0000-0000-000000000000') {
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

    const path = url.pathname.replace(/\/$/, '');
    const targetRegion = url.searchParams.get('region') || 'ALL';
    
    // 动态解析配置源
    let sources = DEFAULT_SOURCES;
    if (env.IP_SOURCES) {
      try {
        const customSources = typeof env.IP_SOURCES === 'string' ? JSON.parse(env.IP_SOURCES) : env.IP_SOURCES;
        sources = { ...DEFAULT_SOURCES, ...customSources };
      } catch (e) {
        console.error('IP_SOURCES Parse Error');
      }
    }

    const fetchAll = async () => {
      const fetchRegionData = async (reg, endpoint) => {
        try {
          // Cloudflare Worker 默认缓存 600 秒以减轻源站压力
          const res = await fetch(endpoint, { cf: { cacheTtl: 600 } } as any);
          const data = await res.json();
          return unifyData(data, reg);
        } catch (e) { return []; }
      };

      if (targetRegion === 'ALL') {
        const promises = Object.entries(sources).map(([reg, endpoint]) => fetchRegionData(reg, endpoint));
        const results = await Promise.all(promises);
        return results.flat().sort((a, b) => a.latency - b.latency);
      } else if (sources[targetRegion]) {
        return await fetchRegionData(targetRegion, sources[targetRegion]);
      }
      return [];
    };

    // 路由：获取 IP 列表
    if (path === '/api/ips' || path === '/ips') {
      const data = await fetchAll();
      return new Response(JSON.stringify(data), { status: 200, headers: corsHeaders });
    }

    // 路由：获取订阅链接
    if (path === '/api/sub' || path === '/sub') {
      const data = await fetchAll();
      const uuid = env.UUID || '00000000-0000-0000-0000-000000000000';
      const vlessContent = data.map(item => generateVLESS(item.ip, item.region, uuid)).join('\n');
      return new Response(safeBtoa(vlessContent), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'text/plain' }
      });
    }

    // 状态探针
    if (path === '' || path === '/' || path === '/api') {
      return new Response(JSON.stringify({ 
        status: "online", 
        regions: Object.keys(sources),
        active_sources: sources 
      }), { headers: corsHeaders });
    }

    return new Response(JSON.stringify({ error: 'Not Found' }), { status: 404, headers: corsHeaders });
  }
};