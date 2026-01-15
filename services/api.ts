import { Region, IPData } from '../types';

export async function fetchIPs(region: Region): Promise<IPData[]> {
  // 如果你在本地测试或未配置 Service Binding，可以手动在这里填入你的 Worker URL
  // 例如: const baseUrl = 'https://shanmianban-api.qweyuqq1.workers.dev';
  const baseUrl = ''; 
  const url = `${baseUrl}/api/ips?region=${region}&t=${Date.now()}`;
  
  try {
    const response = await fetch(url);
    
    const result = await response.json();

    // 专门处理 Cloudflare Pages 未配置 Service Binding 的错误提示
    if (result.error && result.error.includes('Service Binding')) {
      console.error('CRITICAL: 你需要在 Cloudflare Pages 控制台的 "设置 -> 函数 -> 服务绑定" 中添加一个名为 API 的绑定，指向你的 Worker。');
      // 如果检测到绑定丢失且我们知道 Worker URL，可以尝试直接请求 Worker
      const workerUrl = 'https://shanmianban-api.qweyuqq1.workers.dev';
      const directRes = await fetch(`${workerUrl}/api/ips?region=${region}&t=${Date.now()}`);
      return await directRes.json();
    }
    
    if (Array.isArray(result)) {
      return result;
    }
    
    if (result && typeof result === 'object' && Array.isArray(result.data)) {
      return result.data;
    }

    return [];
  } catch (error) {
    console.error('[API] Fetch Error:', error);
    return [];
  }
}