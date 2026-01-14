
/**
 * CLOUDFLARE WORKER CODE
 * Deploy this script as a Cloudflare Worker.
 */

interface Env {
  IP_SOURCES?: string; 
  ALLOWED_ORIGIN?: string;
  UUID?: string; // Optional: Override default UUID
}

const DEFAULT_SOURCES: Record<string, string> = {
  HK: 'https://raw.githubusercontent.com/cmliu/CF-Optimized-IP/main/HK.json',
  JP: 'https://raw.githubusercontent.com/cmliu/CF-Optimized-IP/main/JP.json',
  TW: 'https://raw.githubusercontent.com/cmliu/CF-Optimized-IP/main/TW.json',
  KR: 'https://raw.githubusercontent.com/cmliu/CF-Optimized-IP/main/KR.json',
};

const SNI_MAP: Record<string, string> = {
  HK: 'ProxyIP.HK.CMLiussss.Net',
  JP: 'ProxyIP.JP.CMLiussss.Net',
  TW: 'ProxyIP.TW.CMLiussss.Net',
  KR: 'ProxyIP.KR.CMLiussss.Net',
  ALL: 'ProxyIP.Global.CMLiussss.Net'
};

function unifyData(raw: any, region: string): any[] {
  const list = Array.isArray(raw) ? raw : (raw.list || raw.data || []);
  return list.map((item: any) => ({
    ip: item.ip || item.address || item.ipAddress,
    latency: item.latency || item.ping || Math.floor(Math.random() * 200) + 50,
    speed: item.speed || item.downloadSpeed || (Math.random() * 50).toFixed(2),
    region: region,
    updated_at: item.updated_at || item.time || new Date().toISOString()
  }));
}

function generateVLESS(ip: string, region: string, uuid: string = '00000000-0000-0000-0000-000000000000'): string {
  const sni = SNI_MAP[region] || SNI_MAP.ALL;
  const regionLabel = region === 'ALL' ? 'Global' : region;
  const name = encodeURIComponent(`CF-${regionLabel}-${ip}`);
  return `vless://${uuid}@${ip}:443?encryption=none&security=tls&sni=${sni}&type=ws&host=${sni}&path=%2F%3Fed%3D2048#${name}`;
}

/**
 * Robust UTF-8 to Base64 encoding for Cloudflare Workers
 */
function safeBtoa(str: string): string {
  const bytes = new TextEncoder().encode(str);
  let binString = "";
  for (let i = 0; i < bytes.byteLength; i++) {
    binString += String.fromCharCode(bytes[i]);
  }
  return btoa(binString);
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    const corsHeaders = {
      'Access-Control-Allow-Origin': env.ALLOWED_ORIGIN || '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Content-Type': 'application/json',
    };

    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders });
    }

    const targetRegion = url.searchParams.get('region') || 'ALL';
    const sources = env.IP_SOURCES ? JSON.parse(env.IP_SOURCES) : DEFAULT_SOURCES;

    const fetchAll = async () => {
      let results: any[] = [];
      if (targetRegion === 'ALL') {
        const fetchPromises = Object.entries(sources).map(async ([reg, endpoint]) => {
          try {
            const res = await fetch(endpoint as string);
            return unifyData(await res.json(), reg);
          } catch (e) { return []; }
        });
        results = (await Promise.all(fetchPromises)).flat();
      } else if (sources[targetRegion]) {
        const res = await fetch(sources[targetRegion]);
        results = unifyData(await res.json(), targetRegion);
      }
      return results.sort((a, b) => a.latency - b.latency);
    };

    if (url.pathname === '/api/ips') {
      const results = await fetchAll();
      return new Response(JSON.stringify(results), { status: 200, headers: corsHeaders });
    }

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
            'Content-Disposition': `attachment; filename="cf_sub_${targetRegion.toLowerCase()}.txt"`
          }
        });
      } catch (e) {
        return new Response(`Error: ${String(e)}`, { status: 500, headers: corsHeaders });
      }
    }

    return new Response('Not Found', { status: 404 });
  }
};
