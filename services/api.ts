import { Region, IPData } from '../types';

export async function fetchIPs(region: Region): Promise<IPData[]> {
  try {
    const response = await fetch(`/api/ips?region=${region}`);
    
    if (!response.ok) {
      console.error(`HTTP 错误: ${response.status}`);
      return [];
    }
    
    const result = await response.json();
    
    // 兼容 { success: true, data: [] } 格式
    if (result && typeof result === 'object' && Array.isArray(result.data)) {
      return result.data;
    }
    
    // 兼容直接返回 [] 格式
    if (Array.isArray(result)) {
      return result;
    }

    return [];
  } catch (error) {
    console.error('[API] 请求异常:', error);
    return [];
  }
}