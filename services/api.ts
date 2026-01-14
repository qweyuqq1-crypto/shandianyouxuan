
import { Region, IPData } from '../types';

/**
 * Mock data for development when not deployed on Cloudflare
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
    // In local development, /api/ips might fail unless proxied, so we fallback to mock
    const response = await fetch(`/api/ips?region=${region}`);
    if (!response.ok) throw new Error('Network response was not ok');
    return await response.json();
  } catch (error) {
    console.warn('API call failed, using mock data for demonstration:', error);
    if (region === Region.ALL) return MOCK_IPS;
    return MOCK_IPS.filter(ip => ip.region === region);
  }
}
