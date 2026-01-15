import { Region, IPData } from '../types';

export async function fetchIPs(region: Region): Promise<IPData[]> {
  try {
    const response = await fetch(`/api/ips?region=${region}`);
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: 服务器响应异常`);
    }
    
    const result = await response.json();
    
    // 兼容性处理：如果后端返回的是 { success, data } 或 直接是一个数组 []
    const data = result.data !== undefined ? result.data : (Array.isArray(result) ? result : []);
    
    if (Array.isArray(data) && data.length > 0) {
      return data;
    }
    
    console.warn(`[API] 区域 ${region} 未返回有效数据，可能后端抓取源暂不可用。`);
    return [];
  } catch (error) {
    console.error('[API] 请求失败:', error.message);
    // 在生产环境，如果 API 挂了，我们返回空数组，让 UI 显示“空数据”状态
    return [];
  }
}