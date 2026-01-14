
import { Region, IPData } from '../types';

/**
 * 开发环境模拟数据（当 API 无法访问时使用）
 */
const MOCK_IPS: IPData[] = [
  { ip: '1.1.1.1', latency: 45, speed: 85.2, region: Region.HK, updated_at: new Date().toISOString() },
  { ip: '1.0.0.1', latency: 120, speed: 42.1, region: Region.JP, updated_at: new Date().toISOString() },
  { ip: '8.8.8.8', latency: 160, speed: 12.5, region: Region.TW, updated_at: new Date().toISOString() },
  { ip: '104.16.0.1', latency: 30, speed: 120.5, region: Region.KR, updated_at: new Date().toISOString() },
  { ip: '172.67.12.1', latency: 88, speed: 66.4, region: Region.HK, updated_at: new Date().toISOString() },
];

export async function fetchIPs(region: Region): Promise<IPData[]> {
  try {
    // 尝试请求真实 Worker API
    const response = await fetch(`/api/ips?region=${region}`);
    if (!response.ok) throw new Error('网络响应异常');
    return await response.json();
  } catch (error) {
    console.warn('API 请求失败，正在切换至模拟数据进行演示:', error);
    if (region === Region.ALL) return MOCK_IPS;
    return MOCK_IPS.filter(ip => ip.region === region);
  }
}
