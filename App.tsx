
import React, { useState, useEffect, useMemo } from 'react';
import { RefreshCcw, Database, Info, Share2, Check, Copy, Zap, Activity, ShieldCheck, Cpu, Globe, Lock } from 'lucide-react';
import { Region, IPData, IPStats } from './types';
import { REGION_CONFIG } from './constants';
import { fetchIPs } from './services/api';
import { IPTable } from './components/IPTable';
import { ConfigModal } from './components/ConfigModal';

const App: React.FC = () => {
  const [activeRegion, setActiveRegion] = useState<Region>(Region.ALL);
  const [ips, setIps] = useState<IPData[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [selectedIP, setSelectedIP] = useState<IPData | null>(null);
  const [lastRefreshed, setLastRefreshed] = useState<Date>(new Date());
  const [subCopied, setSubCopied] = useState(false);

  const loadData = async (region: Region) => {
    setLoading(true);
    try {
      const data = await fetchIPs(region);
      setIps(data);
      setLastRefreshed(new Date());
    } catch (err) {
      console.error('无法加载 IP 数据', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData(activeRegion);
  }, [activeRegion]);

  const stats = useMemo<IPStats>(() => {
    if (ips.length === 0) return { avgLatency: 0, count: 0, fastestIP: null };
    const sum = ips.reduce((acc, curr) => acc + curr.latency, 0);
    const sorted = [...ips].sort((a, b) => a.latency - b.latency);
    return {
      avgLatency: sum / ips.length,
      count: ips.length,
      fastestIP: sorted[0]?.ip || null
    };
  }, [ips]);

  const copySubscription = () => {
    const subUrl = `${window.location.origin}/api/sub?region=${activeRegion}`;
    navigator.clipboard.writeText(subUrl);
    setSubCopied(true);
    setTimeout(() => setSubCopied(false), 2000);
  };

  const tabs = [Region.ALL, Region.HK, Region.JP, Region.TW, Region.KR];

  return (
    <div className="min-h-screen text-slate-100 flex flex-col selection:bg-yellow-500/30">
      {/* 背景光晕 */}
      <div className="fixed top-[-10%] right-[-10%] w-[600px] h-[600px] bg-yellow-600/10 blur-[150px] rounded-full -z-10 animate-pulse pointer-events-none"></div>
      <div className="fixed bottom-[-10%] left-[-10%] w-[600px] h-[600px] bg-blue-600/10 blur-[150px] rounded-full -z-10 animate-pulse pointer-events-none"></div>

      {/* 顶部导航 */}
      <nav className="sticky top-0 z-40 glass-effect border-b border-white/5 px-4 sm:px-8 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center space-x-5">
            <div className="relative">
              <div className="bg-gradient-to-tr from-yellow-400 to-amber-600 p-2.5 rounded-2xl shadow-[0_0_20px_rgba(251,191,36,0.4)] relative z-10">
                <Zap className="w-6 h-6 text-slate-950 fill-slate-950" />
              </div>
              <div className="absolute inset-0 bg-yellow-400 blur-lg opacity-40 animate-pulse"></div>
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-black tracking-tighter text-white flex items-center gap-1">
                闪电<span className="text-yellow-400">面板</span>
              </h1>
              <p className="text-[9px] font-black text-slate-500 uppercase tracking-[0.3em]">CF 优选监控系统</p>
            </div>
          </div>

          <div className="hidden lg:flex bg-black/40 border border-white/10 p-1 rounded-2xl">
            {tabs.map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveRegion(tab)}
                className={`px-6 py-2 rounded-xl text-sm font-black transition-all duration-500 flex items-center gap-2 ${
                  activeRegion === tab 
                    ? 'bg-yellow-400 text-slate-950 shadow-[0_0_20px_rgba(251,191,36,0.2)]' 
                    : 'text-slate-500 hover:text-white hover:bg-white/5'
                }`}
              >
                <span className="text-base">{REGION_CONFIG[tab].emoji}</span>
                {REGION_CONFIG[tab].label.split(' ')[0]}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-3">
             <button 
                onClick={() => loadData(activeRegion)}
                className="p-3 bg-white/5 border border-white/10 hover:border-yellow-400/50 hover:bg-yellow-400/10 rounded-2xl transition-all text-slate-300 group"
                title="强制刷新"
              >
                <RefreshCcw className={`w-5 h-5 transition-all duration-500 ${loading ? 'animate-spin text-yellow-400' : 'group-hover:rotate-180'}`} />
              </button>
          </div>
        </div>
      </nav>

      {/* 主容器 */}
      <main className="max-w-7xl mx-auto px-4 sm:px-8 pt-8 w-full flex-grow">
        
        {/* 区域快速切换 (移动端) */}
        <div className="lg:hidden flex overflow-x-auto pb-6 gap-3 no-scrollbar">
          {tabs.map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveRegion(tab)}
              className={`whitespace-nowrap px-6 py-3 rounded-2xl text-xs font-black transition-all border uppercase tracking-widest ${
                activeRegion === tab 
                  ? 'bg-yellow-500 border-yellow-400 text-slate-950 shadow-lg shadow-yellow-500/20' 
                  : 'bg-white/5 border-white/10 text-slate-500'
              }`}
            >
              {REGION_CONFIG[tab].emoji} {REGION_CONFIG[tab].label}
            </button>
          ))}
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-4 gap-8">
          
          {/* 状态统计栏 */}
          <div className="xl:col-span-1 space-y-6">
            <div className="glass-effect rounded-[32px] p-7 border border-white/5 shadow-2xl relative overflow-hidden group">
               <div className="absolute top-0 right-0 w-32 h-32 bg-yellow-500/10 blur-3xl rounded-full -mr-16 -mt-16"></div>
               <div className="flex items-center justify-between mb-8">
                  <h3 className="text-sm font-black text-slate-400 uppercase tracking-[0.2em] flex items-center gap-2">
                    <Activity className="w-4 h-4 text-yellow-400" />
                    网络脉动
                  </h3>
                  <div className="flex gap-1">
                    {[1, 2, 3].map(i => <div key={i} className={`w-1 h-3 rounded-full animate-bounce bg-yellow-500/50`} style={{animationDelay: `${i*0.1}s`}}></div>)}
                  </div>
               </div>
               
               <div className="space-y-8">
                  <div className="relative">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-black text-slate-500 uppercase tracking-widest">平均延迟</span>
                      <span className="text-2xl font-black text-yellow-400">{stats.avgLatency.toFixed(1)} <span className="text-xs text-slate-600">ms</span></span>
                    </div>
                    <div className="w-full bg-white/5 h-1.5 rounded-full overflow-hidden">
                      <div 
                        className="bg-gradient-to-r from-yellow-600 to-yellow-400 h-full transition-all duration-1000 ease-out" 
                        style={{ width: `${Math.max(5, Math.min(100, (1 - stats.avgLatency/300) * 100))}%` }}
                      ></div>
                    </div>
                  </div>
                  
                  <div className="flex items-center justify-between p-4 bg-blue-500/5 border border-blue-500/10 rounded-2xl">
                    <div className="flex items-center gap-3">
                       <ShieldCheck className="w-5 h-5 text-blue-400" />
                       <span className="text-xs font-black text-slate-400 uppercase tracking-widest">在线节点</span>
                    </div>
                    <span className="text-xl font-black text-blue-400">{stats.count}</span>
                  </div>

                  <div className="pt-4">
                    <p className="text-[10px] text-slate-600 uppercase font-black mb-3 tracking-[0.2em] flex items-center gap-2">
                      <Cpu className="w-3 h-3" /> 最优网关
                    </p>
                    <div className="bg-black/30 px-4 py-4 rounded-2xl border border-white/5 font-mono text-xs text-yellow-200/80 truncate group-hover:border-yellow-500/30 transition-colors">
                      {stats.fastestIP || '未连接'}
                    </div>
                  </div>
               </div>
            </div>

            {/* 数据源信息卡片 */}
            <div className="glass-effect rounded-[32px] p-7 border border-white/5 relative overflow-hidden">
               <h3 className="text-sm font-black text-slate-400 uppercase tracking-[0.2em] mb-4 flex items-center gap-2">
                 <Globe className="w-4 h-4 text-blue-400" />
                 测速数据源
               </h3>
               <div className="space-y-3">
                 <div className="flex items-start gap-3">
                   <div className="p-2 bg-white/5 rounded-lg border border-white/10 mt-0.5">
                     <Info className="w-3 h-3 text-slate-400" />
                   </div>
                   <p className="text-[11px] text-slate-500 leading-relaxed font-medium">
                     当前采用 <span className="text-blue-400">cmliu/CF-Optimized-IP</span> 社区公共测速源，每小时自动更新。
                   </p>
                 </div>
                 <div className="flex items-center gap-2 px-3 py-2 bg-green-500/5 border border-green-500/10 rounded-xl">
                    <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                    <span className="text-[10px] font-black text-green-500 uppercase tracking-widest">云端实时同步中</span>
                 </div>
               </div>
            </div>

            <div className="glass-effect rounded-[32px] p-7 border border-white/5 bg-gradient-to-br from-yellow-950/20 to-blue-950/20 relative overflow-hidden group">
              <div className="absolute -bottom-10 -right-10 opacity-5 group-hover:scale-125 transition-transform duration-700">
                <Zap className="w-40 h-40 text-yellow-400" />
              </div>
              <h3 className="text-lg font-black text-white mb-2 tracking-tight">配置聚合订阅</h3>
              <p className="text-slate-500 text-xs mb-8 leading-relaxed font-medium">
                获取当前地区所有优选 IP 的 VLESS 聚合链接。请确保已在 Worker 中配置 <span className="text-yellow-400">UUID</span>。
              </p>
              <button 
                onClick={copySubscription}
                className={`w-full py-4 rounded-2xl font-black text-xs uppercase tracking-[0.2em] flex items-center justify-center gap-3 transition-all active:scale-95 shadow-2xl ${
                  subCopied 
                    ? 'bg-blue-500 text-white shadow-blue-500/30' 
                    : 'bg-white text-slate-900 hover:bg-yellow-400 hover:text-slate-950 shadow-white/5'
                }`}
              >
                {subCopied ? <Check className="w-4 h-4" /> : <Share2 className="w-4 h-4" />}
                {subCopied ? '复制成功' : '获取订阅链接'}
              </button>
            </div>
          </div>

          {/* 表格栏 */}
          <div className="xl:col-span-3">
             <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-8 gap-4">
                <div className="flex items-center gap-4">
                   <div className="text-4xl filter drop-shadow-lg">{REGION_CONFIG[activeRegion].emoji}</div>
                   <div>
                      <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tighter">
                        {REGION_CONFIG[activeRegion].label} <span className="text-slate-600 font-light">节点列表</span>
                      </h2>
                      <div className="flex items-center gap-2 text-[10px] text-slate-500 font-black uppercase tracking-[0.2em] mt-1">
                        <Database className="w-3 h-3" />
                        最后同步: {lastRefreshed.toLocaleTimeString()}
                      </div>
                   </div>
                </div>
             </div>
             
             <div className="animate-in fade-in slide-in-from-bottom-8 duration-700">
                <IPTable 
                  ips={ips} 
                  loading={loading} 
                  onSelect={(ip) => setSelectedIP(ip)} 
                />
             </div>
          </div>
        </div>

        {/* 品牌页脚 */}
        <footer className="mt-24 py-12 border-t border-white/5">
          <div className="flex flex-col md:flex-row justify-between items-center gap-8">
            <div className="flex items-center gap-4">
              <div className="bg-white/5 p-3 rounded-2xl border border-white/10">
                <Zap className="w-5 h-5 text-yellow-400 fill-yellow-400" />
              </div>
              <div>
                <span className="text-white font-black text-sm tracking-tight">闪电面板 LIGHTNING</span>
                <p className="text-[9px] text-slate-600 uppercase font-black tracking-widest">新一代边缘优化技术</p>
              </div>
            </div>
            
            <p className="text-slate-600 text-[10px] font-black tracking-[0.3em] uppercase">
              &copy; 2024 闪电面板 <span className="text-yellow-500/50 mx-2">|</span> V1.5.0 稳定版
            </p>
            
            <div className="flex gap-8">
              {['状态', '文档', '支持'].map(link => (
                <a key={link} href="#" className="text-slate-500 hover:text-yellow-400 text-[10px] font-black uppercase tracking-[0.2em] transition-all">{link}</a>
              ))}
            </div>
          </div>
        </footer>
      </main>

      {/* 详情模态框 */}
      {selectedIP && (
        <ConfigModal 
          ip={selectedIP} 
          onClose={() => setSelectedIP(null)} 
        />
      )}
    </div>
  );
};

export default App;
