/**
 * CLOUDFLARE WORKER 后端代码
 * 纯 JavaScript 实现 (兼容 Cloudflare Worker 编辑器直接粘贴)
 */

// 默认数据源 - 已指向你的仓库: qweyuqq1-crypto/shandianyouxuan
const DEFAULT_SOURCES = {
  HK: 'https://raw.githubusercontent.com/qweyuqq1-crypto/shandianyouxuan/main/HK.json',
  JP: 'https://raw.githubusercontent.com/qweyuqq1-crypto/shandianyouxuan/main/JP.json',
  TW: 'https://raw.githubusercontent.com/qweyuqq1-crypto/shandianyouxuan/main/TW.json',
  KR: 'https://raw.githubusercontent.com/qweyuqq1-crypto/shandianyouxuan/main/KR.json',
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

function fixGithubUrl(url) {
  if (typeof url !== 'string') return url;
  if (url.includes('github.com') && url.includes('/blob/')) {
    return url.replace('github.com', 'raw.githubusercontent.com').replace('/blob/', '/');
  }
  return url;
}

function unifyData(raw, region) {
  if (!raw) return [];
  // 兼容直接数组或带 list/data 的结构
  const list = Array.isArray(raw) ? raw : (raw.list || raw.data || raw.info || []);
  if (!Array.isArray(list)) return [];

  return list.map((item) => {
    // 兼容多种字段名
    const ip = item.ip || item.address || item.Address || item.ipAddress || item.Endpoint;
    if (!ip) return null;

    // 格式化 IP：只剔除端口
    const cleanIp = ip.split(':')[0];

    let lat = item.latency || item.ping || 0;
    if (typeof lat === 'string') lat = parseInt(lat.replace(/[^0-9]/g, '')) || 0;
    
    let spd = item.speed || item.downloadSpeed || 0;
    if (typeof spd === 'string') spd = parseFloat(spd.replace(/[^0-9.]/g, '')) || 0;

    return {
      ip: cleanIp,
      latency: lat || 50,
      speed: spd || 10,
      region: region,
      updated_at: item.updated_at || new Date().toISOString()
    };
  }).filter((item) => item !== null);
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
  } catch (e) { return ""; }
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const corsHeaders = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': '*',
      'Content-Type': 'application/json; charset=utf-8',
    };

    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders });
    }

    const path = url.pathname.replace(/\/$/, '');
    const targetRegion = url.searchParams.get('region') || 'ALL';
    
    let sources = Object.assign({}, DEFAULT_SOURCES);
    
    if (env.IP_SOURCES) {
      try {
        let cleaned = env.IP_SOURCES.trim().replace(/^`+/, '').replace(/`+$/, '').replace(/'/g, '"');
        const custom = JSON.parse(cleaned);
        for (const key in custom) {
          custom[key] = fixGithubUrl(custom[key]);
        }
        sources = Object.assign(sources, custom);
      } catch (e) {
        console.error("IP_SOURCES 解析失败");
      }
    }

    const fetchAll = async () => {
      const fetchOne = async (reg, endpoint) => {
        try {
          const fetchOptions = { 
            headers: { 'User-Agent': 'Cloudflare-Worker-Lightning-Panel' },
            cf: { cacheTtl: 60 } 
          };
          
          const res = await fetch(endpoint, fetchOptions);
          if (!res.ok) throw new Error(`HTTP ${res.status}`);
          
          const data = await res.json();
          return unifyData(data, reg);
        } catch (e) { 
          console.error(`[${reg}] 抓取失败: ${e.message}`);
          return []; 
        }
      };

      if (targetRegion === 'ALL') {
        const promises = Object.entries(sources).map(([reg, endpoint]) => fetchOne(reg, endpoint));
        const results = await Promise.all(promises);
        return results.flat().sort((a, b) => a.latency - b.latency);
      } else if (sources[targetRegion]) {
        return await fetchOne(targetRegion, sources[targetRegion]);
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
      const vlessLinks = results.map((item) => generateVLESS(item.ip, item.region, uuid)).join('\n');
      return new Response(safeBtoa(vlessLinks), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'text/plain; charset=utf-8' }
      });
    }

    return new Response(JSON.stringify({
      status: "online",
      regions: Object.keys(sources),
      env_check: {
        has_sources: !!env.IP_SOURCES,
        current_sources: sources
      }
    }), { status: 200, headers: corsHeaders });
  }
};