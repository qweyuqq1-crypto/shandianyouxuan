import { Region, IPData } from '../types';

export async function fetchIPs(region: Region): Promise<IPData[]> {
  // 使用相对路径，由 Pages Functions 处理转发
  const url = `/api/ips?region=${region}&t=${Date.now()}`;
  
  try {
    const response = await fetch(url);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.warn(`[API] 请求失败 (${response.status}):`, errorText);
      return [];
    }
    
    const contentType = response.headers.get('content-type') || '';
    if (!contentType.includes('application/json')) {
      console.warn('[API] 响应格式非 JSON:', contentType);
      return [];
    }

    const result = await response.json();
    
    // 灵活解析结果
    if (result && result.success && Array.isArray(result.data)) {
      return result.data;
    }
    
    if (Array.isArray(result)) {
      return result;
    }

    return [];
  } catch (error) {
    console.error('[API] 网络通信异常:', error);
    return [];
  }
}