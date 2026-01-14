
import React, { useState } from 'react';
import { X, Copy, Check, Terminal, QrCode, Link as LinkIcon, Cpu, Globe, Download } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import { IPData } from '../types';
import { REGION_CONFIG } from '../constants';

interface ConfigModalProps {
  ip: IPData;
  onClose: () => void;
}

export const ConfigModal: React.FC<ConfigModalProps> = ({ ip, onClose }) => {
  const [copied, setCopied] = useState<string | null>(null);
  const [showQR, setShowQR] = useState(false);
  
  const sni = REGION_CONFIG[ip.region]?.sni || REGION_CONFIG.ALL.sni;
  const configName = `${REGION_CONFIG[ip.region]?.label || 'CF'} - ${ip.ip}`;

  // Use a more robust VLESS generation
  const v2rayLink = `vless://00000000-0000-0000-0000-000000000000@${ip.ip}:443?encryption=none&security=tls&sni=${sni}&type=ws&host=${sni}&path=${encodeURIComponent('/?ed=2048')}#${encodeURIComponent(configName)}`;

  const clashConfig = `
- name: "${configName}"
  type: vless
  server: ${ip.ip}
  port: 443
  uuid: 00000000-0000-0000-0000-000000000000
  tls: true
  udp: true
  sni: ${sni}
  network: ws
  ws-opts:
    path: /?ed=2048
    headers:
      Host: ${sni}
  `;

  const copyToClipboard = (text: string, type: string) => {
    navigator.clipboard.writeText(text);
    setCopied(type);
    setTimeout(() => setCopied(null), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-xl">
      <div className="bg-[#1e293b] rounded-[40px] w-full max-w-2xl overflow-hidden shadow-[0_0_50px_rgba(0,0,0,0.5)] border border-white/10 animate-in fade-in zoom-in duration-300">
        
        {/* 头部 */}
        <div className="p-8 border-b border-white/5 flex justify-between items-start bg-white/5 relative">
          <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/10 blur-[60px] rounded-full pointer-events-none"></div>
          <div>
            <div className="flex items-center gap-3 mb-2">
              <div className="text-3xl bg-white/5 p-2 rounded-2xl border border-white/10 shadow-inner">
                {REGION_CONFIG[ip.region]?.emoji}
              </div>
              <div>
                <h3 className="text-2xl font-black text-white tracking-tight">节点导出面板</h3>
                <p className="text-xs font-black text-blue-400 uppercase tracking-[0.2em]">{REGION_CONFIG[ip.region]?.label} 边缘服务器</p>
              </div>
            </div>
          </div>
          <button onClick={onClose} className="p-3 bg-white/5 hover:bg-white/10 border border-white/10 rounded-2xl transition-all text-slate-400 hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-5 gap-0">
          
          {/* 侧边切换栏 */}
          <div className="md:col-span-1 bg-black/20 p-4 flex md:flex-row md:flex-col gap-2">
            <button 
              onClick={() => setShowQR(false)}
              className={`flex-1 flex flex-col items-center justify-center gap-2 p-4 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all ${!showQR ? 'bg-white/10 text-white shadow-lg ring-1 ring-white/20' : 'text-slate-500 hover:text-slate-300 hover:bg-white/5'}`}
            >
              <LinkIcon className="w-5 h-5" /> 配置
            </button>
            <button 
              onClick={() => setShowQR(true)}
              className={`flex-1 flex flex-col items-center justify-center gap-2 p-4 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all ${showQR ? 'bg-white/10 text-white shadow-lg ring-1 ring-white/20' : 'text-slate-500 hover:text-slate-300 hover:bg-white/5'}`}
            >
              <QrCode className="w-5 h-5" /> 二维码
            </button>
          </div>

          {/* 内容区域 */}
          <div className="md:col-span-4 p-8 max-h-[70vh] overflow-y-auto no-scrollbar">
            {!showQR ? (
              <div className="space-y-8 animate-in fade-in slide-in-from-right-4 duration-500">
                
                {/* 信息卡片 */}
                <div className="grid grid-cols-2 gap-4">
                   <div className="bg-white/5 p-4 rounded-2xl border border-white/10">
                      <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1 flex items-center gap-1"><Globe className="w-3 h-3" /> 目标 IP</p>
                      <p className="text-sm font-mono font-bold text-white">{ip.ip}</p>
                   </div>
                   <div className="bg-white/5 p-4 rounded-2xl border border-white/10">
                      <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1 flex items-center gap-1"><Cpu className="w-3 h-3" /> 伪装域名 (SNI)</p>
                      <p className="text-sm font-mono font-bold text-blue-400 truncate">{sni}</p>
                   </div>
                </div>

                {/* V2Ray 链接 */}
                <div>
                  <div className="flex justify-between items-center mb-2">
                    <label className="text-xs font-black text-slate-500 uppercase tracking-[0.2em]">通用 VLESS 订阅链接</label>
                  </div>
                  <div className="flex gap-2">
                    <div className="flex-1 bg-black/30 border border-white/5 rounded-2xl px-5 py-4 text-xs font-mono text-slate-300 overflow-hidden truncate">
                      {v2rayLink}
                    </div>
                    <button 
                      onClick={() => copyToClipboard(v2rayLink, 'v2ray')}
                      className="bg-blue-600 text-white px-6 py-4 rounded-2xl font-black uppercase tracking-widest text-[10px] hover:bg-blue-500 transition-all shadow-xl shadow-blue-900/40 active:scale-95 flex items-center gap-2"
                    >
                      {copied === 'v2ray' ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                      {copied === 'v2ray' ? '已完成' : '复制'}
                    </button>
                  </div>
                </div>

                {/* Clash 配置 */}
                <div>
                  <div className="flex justify-between items-center mb-2">
                    <label className="text-xs font-black text-slate-500 uppercase tracking-[0.2em]">Clash 配置模板片段</label>
                    <button 
                      onClick={() => copyToClipboard(clashConfig, 'clash')}
                      className="text-[10px] font-black text-blue-400 uppercase tracking-widest hover:text-blue-300 transition-colors"
                    >
                      {copied === 'clash' ? '已复制' : '复制片段'}
                    </button>
                  </div>
                  <div className="relative group">
                    <pre className="bg-black/40 text-blue-200/80 p-6 rounded-3xl text-[11px] font-mono overflow-x-auto whitespace-pre border border-white/5 border-l-2 border-l-blue-500/50">
                      {clashConfig}
                    </pre>
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-6 animate-in fade-in slide-in-from-left-4 duration-500 text-center">
                <div className="p-8 bg-white rounded-[32px] shadow-[0_0_50px_rgba(255,255,255,0.05)] border-8 border-white/5 ring-1 ring-white/10">
                   <QRCodeSVG 
                    value={v2rayLink} 
                    size={220} 
                    level="Q" 
                    includeMargin={false} 
                    fgColor="#0f172a" 
                    bgColor="#ffffff"
                  />
                </div>
                <div className="mt-8">
                   <h4 className="text-white font-black text-lg">扫码导入节点</h4>
                   <p className="text-slate-500 text-sm mt-1 max-w-[280px] font-medium">使用任何支持 VLESS over WebSocket 的客户端快速扫描添加此节点。</p>
                </div>
                
                <div className="flex gap-4 mt-8">
                  <button 
                    onClick={() => copyToClipboard(v2rayLink, 'v2ray-qr')}
                    className="px-8 py-4 bg-white text-slate-900 font-black rounded-2xl hover:bg-slate-100 transition-all shadow-2xl shadow-black/20 flex items-center gap-3 text-[10px] uppercase tracking-[0.2em]"
                  >
                    {copied === 'v2ray-qr' ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                    复制节点链接
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* 页脚 */}
        <div className="p-6 bg-black/20 border-t border-white/5 flex justify-center">
          <button 
            onClick={onClose}
            className="px-10 py-3 bg-white/5 hover:bg-white/10 text-slate-300 font-black text-xs uppercase tracking-widest rounded-2xl transition-all border border-white/10"
          >
            关闭控制台
          </button>
        </div>
      </div>
    </div>
  );
};
