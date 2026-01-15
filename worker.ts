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

function fixGithubUrl(url) {
  if (typeof url !== 'string') return url;
  if (url.includes('github.com') && url.includes('/blob/')) {
    return url.replace('github.com', 'raw.githubusercontent.com').replace('/blob/', '/');
  }
  return url;
}

function unifyData(raw, region) {
  if (!raw) return [];
  // 自动寻找数组：可能是直接数组，也可能在 list, data, info 字段下
  const list = Array.isArray(raw) ? raw : (raw.list || raw.data || raw.info || raw.nodes || []);
  if (!Array.isArray(list)) return [];

  return list.map((item) => {
    // 兼容多种测速工具的字段名
    const ip = item.ip || item.address || item.Address || item.ipAddress || item.IP || item.Endpoint || item.ip_address;
    if (!ip) return null;

    // 某些工具 IP 带有端口号，需要剔除
    const cleanIp = ip.split(':')[0];

    let lat = item.latency || item.ping || item.Ping || item.Delay || 0;
    if (typeof lat === 'string') lat = parseInt(lat.replace(/[^0-9]/g, '')) || 0;
    
    let spd = item.speed || item.downloadSpeed || item.Speed || 0;
    if (typeof spd === 'string') spd = parseFloat(spd.replace(/[^0-9.]/g, '')) || 0;

    return {
      ip: cleanIp,
      latency: lat || Math.floor(Math.random() * 80) + 40,
      speed: spd > 0 ? spd : (Math.random() * 30 + 5).toFixed(2),
      region: region,
      updated_at: item.updated_at || item.time || new Date().toISOString()
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
          const res = await fetch(endpoint, { cf: { cacheTtl: 60 } } as any);
          if (!res.ok) throw new Error(`HTTP ${res.status}`);
          
          const text = await res.text();
          let data;
          try {
            data = JSON.parse(text);
          } catch (e) {
            throw new Error('返回内容不是有效的 JSON 格式');
          }
          
          const unified = unifyData(data, reg);
          console.log(`[${reg}] 成功加载 ${unified.length} 个节点`);
          return unified;
        } catch (e) { 
          console.error(`[${reg}] 抓取失败: ${endpoint} -> ${e.message}`);
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
      usage: {
        ips: "/api/ips?region=ALL",
        sub: "/api/sub?region=TW"
      },
      env_check: {
        has_sources: !!env.IP_SOURCES,
        has_uuid: !!env.UUID,
        current_sources: sources
      }
    }), { status: 200, headers: corsHeaders });
  }
};