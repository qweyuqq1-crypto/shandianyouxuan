import { Region, IPData } from '../types';

export async function fetchIPs(region: Region): Promise<IPData[]> {
  // 使用当前域名下的 /api 路径，触发 Pages Functions
  const url = `/api/ips?region=${region}&t=${Date.now()}`;
  
  try {
    const response = await fetch(url);
    
    if (!response.ok) {
      console.error(`[API ERROR] ${response.status} for ${url}`);
      return [];
    }
    
    const result = await response.json();
    
    // 如果返回的是直接数组，直接返回
    if (Array.isArray(result)) {
      return result;
    }
    
    // 兼容可能存在的 { data: [] } 包装
    if (result && typeof result === 'object' && Array.isArray(result.data)) {
      return result.data;
    }

    return [];
  } catch (error) {
    console.error('[API] Fetch Error:', error);
    return [];
  }
}