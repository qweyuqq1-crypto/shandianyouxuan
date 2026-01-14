
export enum Region {
  HK = 'HK',
  JP = 'JP',
  TW = 'TW',
  KR = 'KR',
  ALL = 'ALL'
}

export interface IPData {
  ip: string;
  latency: number;
  speed: number; // in MB/s
  region: Region;
  updated_at: string;
}

export interface IPStats {
  avgLatency: number;
  count: number;
  fastestIP: string | null;
}

export interface ConfigOptions {
  host: string;
  port: number;
  uuid: string;
  path: string;
  sni: string;
}
