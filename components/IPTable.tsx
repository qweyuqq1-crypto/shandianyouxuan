
import React from 'react';
import { ChevronRight, RefreshCw, SignalHigh, SignalMedium, SignalLow, Zap, ArrowUpRight, Database } from 'lucide-react';
import { IPData } from '../types';
import { REGION_CONFIG } from '../constants';

interface IPTableProps {
  ips: IPData[];
  onSelect: (ip: IPData) => void;
  loading: boolean;
}

export const IPTable: React.FC<IPTableProps> = ({ ips, onSelect, loading }) => {
  const getLatencyColor = (latency: number) => {
    if (latency < 100) return 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20';
    if (latency < 180) return 'text-amber-400 bg-amber-500/10 border-amber-500/20';
    return 'text-rose-400 bg-rose-500/10 border-rose-500/20';
  };

  const getLatencyIcon = (latency: number) => {
    if (latency < 100) return <SignalHigh className="w-3.5 h-3.5" />;
    if (latency < 180) return <SignalMedium className="w-3.5 h-3.5" />;
    return <SignalLow className="w-3.5 h-3.5" />;
  };

  if (loading) {
    return (
      <div className="glass-effect rounded-[40px] p-24 sm:p-40 flex flex-col items-center justify-center border border-white/5 shadow-inner">
        <div className="relative mb-8">
          <div className="absolute inset-0 bg-yellow-400/20 blur-2xl rounded-full animate-pulse"></div>
          <Zap className="w-16 h-16 text-yellow-400 animate-bounce relative z-10" />
        </div>
        <div className="text-center">
          <p className="text-white font-black text-xl tracking-tighter">寻找最优链路...</p>
          <p className="text-slate-500 text-[10px] mt-2 uppercase tracking-[0.4em] font-black">正在同步边缘节点</p>
        </div>
      </div>
    );
  }

  return (
    <div className="glass-effect rounded-[40px] overflow-hidden border border-white/5 shadow-2xl transition-all">
      <div className="overflow-x-auto no-scrollbar">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-black/20 text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] border-b border-white/5">
              <th className="px-8 py-6">归属地</th>
              <th className="px-8 py-6">网关地址</th>
              <th className="px-8 py-6 text-center">稳定性</th>
              <th className="px-8 py-6 text-center">吞吐速度</th>
              <th className="px-8 py-6 text-right">链接</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {ips.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-8 py-24 text-center">
                   <div className="flex flex-col items-center">
                      <Database className="w-12 h-12 text-slate-800 mb-4" />
                      <p className="text-slate-600 font-black text-xs uppercase tracking-[0.2em]">数据流为空</p>
                   </div>
                </td>
              </tr>
            ) : (
              ips.map((item, index) => (
                <tr 
                  key={`${item.ip}-${index}`}
                  onClick={() => onSelect(item)}
                  className="hover:bg-white/[0.03] cursor-pointer transition-all duration-500 group relative"
                >
                  <td className="px-8 py-7">
                    <div className="flex items-center gap-5">
                      <div className="w-12 h-12 flex items-center justify-center bg-black/40 rounded-2xl text-2xl border border-white/10 group-hover:border-yellow-400/50 group-hover:bg-yellow-400/10 transition-all duration-500 group-hover:scale-110 shadow-inner">
                        {REGION_CONFIG[item.region]?.emoji}
                      </div>
                      <div>
                        <span className="text-sm font-black text-white tracking-tight block">{REGION_CONFIG[item.region]?.label.split(' ')[0]}</span>
                        <span className="text-[9px] text-slate-600 uppercase font-black tracking-widest">边缘节点-{index + 101}</span>
                      </div>
                    </div>
                  </td>
                  <td className="px-8 py-7">
                    <div className="flex items-center gap-2">
                       <code className="text-xs font-mono font-bold text-yellow-200/60 bg-yellow-400/5 px-3 py-1.5 rounded-xl border border-yellow-400/10 group-hover:text-yellow-400 group-hover:border-yellow-400/30 transition-all">
                         {item.ip}
                       </code>
                    </div>
                  </td>
                  <td className="px-8 py-7">
                    <div className="flex justify-center">
                      <div className={`px-4 py-2 rounded-2xl border flex items-center gap-2 text-[11px] font-black uppercase tracking-wider shadow-sm transition-all duration-500 group-hover:scale-105 ${getLatencyColor(item.latency)}`}>
                        {getLatencyIcon(item.latency)}
                        {item.latency} ms
                      </div>
                    </div>
                  </td>
                  <td className="px-8 py-7">
                    <div className="flex flex-col items-center min-w-[100px]">
                       <div className="flex items-center gap-1.5 text-slate-300 font-black text-xs mb-2">
                         <Zap className="w-3 h-3 text-yellow-500 group-hover:animate-pulse" />
                         {item.speed} <span className="text-[9px] text-slate-600">MB/s</span>
                       </div>
                       <div className="w-20 bg-white/5 h-1 rounded-full overflow-hidden">
                          <div 
                            className="bg-gradient-to-r from-yellow-600 to-yellow-400 h-full transition-all duration-1000 delay-300" 
                            style={{ width: `${Math.min(100, (item.speed / 150) * 100)}%` }}
                          ></div>
                       </div>
                    </div>
                  </td>
                  <td className="px-8 py-7 text-right">
                    <div className="flex items-center justify-end gap-3 opacity-20 group-hover:opacity-100 transition-all duration-500 translate-x-4 group-hover:translate-x-0">
                      <span className="text-[10px] font-black uppercase text-yellow-500 tracking-widest hidden sm:block">打开</span>
                      <div className="p-2.5 bg-yellow-400 text-slate-950 rounded-xl shadow-lg shadow-yellow-500/20 group-hover:rotate-45 transition-transform">
                        <ArrowUpRight className="w-4 h-4" />
                      </div>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};
