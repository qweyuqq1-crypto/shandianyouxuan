
import { Region } from './types';

export const REGION_CONFIG: Record<string, { emoji: string; label: string; sni: string }> = {
  HK: { emoji: '🇭🇰', label: '香港 HK', sni: 'ProxyIP.HK.CMLiussss.Net' },
  JP: { emoji: '🇯🇵', label: '日本 JP', sni: 'ProxyIP.JP.CMLiussss.Net' },
  TW: { emoji: '🇹🇼', label: '台湾 TW', sni: 'ProxyIP.TW.CMLiussss.Net' },
  KR: { emoji: '🇰🇷', label: '韩国 KR', sni: 'ProxyIP.KR.CMLiussss.Net' },
  ALL: { emoji: '🌍', label: '全部', sni: 'ProxyIP.Global.CMLiussss.Net' }
};

export const API_BASE_URL = '/api'; // In production, this proxies to the worker
