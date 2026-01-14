
import { Region, IPData } from '../types';

/**
 * 当 API 无法访问或返回为空时使用的兜底数据
 */
const MOCK_IPS: IPData[] = [
  { ip: '1.1.1.1', latency: 45, speed: 85.2, region: Region.HK, updated_at: new Date().toISOString() },
  { ip: '1.0.0.1', latency: 120, speed: 42.1, region: Region.JP, updated_at: new Date().toISOString() },
  { ip: '104.16.0.1', latency: 30, speed: 120.5, region: Region.KR, updated_at: new Date().toISOString() },
];

export async function fetchIPs(region: Region): Promise<IPData[]> {
  try {
    const response = await fetch(`/api/ips?region=${region}`);
    if (!response.ok) throw new Error(`服务器返回错误: ${response.status}`);
    
    const result = await response.json();
    
    // 检查返回的数据结构
    const data = result.data || result;
    
    if (Array.isArray(data) && data.length > 0) {
      return data;
    }
    
    console.warn(`API 返回了空数据 (${region})，可能是后端获取第三方源失败。`);
    throw new Error('空数据');
  } catch (error) {
    console.warn('API 请求失败或无数据，展示模拟数据进行界面预览:', error.message);
    // 模拟数据仅在开发测试时展示，生产环境下应引导用户检查源
    const filteredMock = region === Region.ALL ? MOCK_IPS : MOCK_IPS.filter(ip => ip.region === region);
    return filteredMock;
  }
}
