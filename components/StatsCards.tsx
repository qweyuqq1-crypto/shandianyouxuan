
import React from 'react';
import { Activity, Zap, ShieldCheck } from 'lucide-react';
import { IPStats } from '../types';

interface StatsCardsProps {
  stats: IPStats;
}

export const StatsCards: React.FC<StatsCardsProps> = ({ stats }) => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
      <div className="glass-effect p-5 rounded-2xl flex items-center space-x-4">
        <div className="bg-blue-100 p-3 rounded-xl">
          <Activity className="w-6 h-6 text-blue-600" />
        </div>
        <div>
          <p className="text-sm text-gray-500 font-medium">平均延迟</p>
          <p className="text-2xl font-bold text-gray-800">{stats.avgLatency.toFixed(1)} <span className="text-sm font-normal text-gray-400">ms</span></p>
        </div>
      </div>

      <div className="glass-effect p-5 rounded-2xl flex items-center space-x-4">
        <div className="bg-green-100 p-3 rounded-xl">
          <ShieldCheck className="w-6 h-6 text-green-600" />
        </div>
        <div>
          <p className="text-sm text-gray-500 font-medium">在线节点</p>
          <p className="text-2xl font-bold text-gray-800">{stats.count}</p>
        </div>
      </div>

      <div className="glass-effect p-5 rounded-2xl flex items-center space-x-4">
        <div className="bg-purple-100 p-3 rounded-xl">
          <Zap className="w-6 h-6 text-purple-600" />
        </div>
        <div>
          <p className="text-sm text-gray-500 font-medium">最优节点</p>
          <p className="text-lg font-bold text-gray-800 truncate max-w-[150px]">{stats.fastestIP || 'N/A'}</p>
        </div>
      </div>
    </div>
  );
};
