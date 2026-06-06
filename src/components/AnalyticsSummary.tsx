import React from 'react';
import { Page } from '../types';
import { Eye, MousePointerClick, TrendingUp, BarChart2 } from 'lucide-react';

interface Props {
  pages: Page[];
}

export default function AnalyticsSummary({ pages }: Props) {
  const totalViews = pages.reduce((acc, p) => acc + (p.views || 0), 0);
  const totalClicks = pages.reduce((acc, p) => acc + (p.clicks || 0), 0);
  const averageCtr = totalViews > 0 ? parseFloat(((totalClicks / totalViews) * 100).toFixed(2)) : 0;

  // Render a simulated visual graph using high-craftsmanship Tailwind bars
  const maxViews = Math.max(...pages.map((p) => p.views || 1), 100);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-4 gap-6" id="analytics-summary">
      {/* Views Card */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 transition-all hover:border-slate-700">
        <div className="flex justify-between items-start">
          <div>
            <p className="text-xs text-slate-500 font-mono tracking-wider uppercase">Visualizações Totais</p>
            <h3 className="text-3xl font-black text-white mt-1 tracking-tight">{totalViews.toLocaleString()}</h3>
          </div>
          <div className="p-3 bg-blue-950/40 border border-blue-900 rounded-lg text-blue-400">
            <Eye size={20} />
          </div>
        </div>
        <p className="text-xs text-slate-400 mt-4 flex items-center gap-1">
          <span className="text-green-400 font-medium font-mono">↑ 12.4%</span> em relação à semana passada
        </p>
      </div>

      {/* Clicks Card */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 transition-all hover:border-slate-700">
        <div className="flex justify-between items-start">
          <div>
            <p className="text-xs text-slate-500 font-mono tracking-wider uppercase">Cliques Gravados</p>
            <h3 className="text-3xl font-black text-white mt-1 tracking-tight">{totalClicks.toLocaleString()}</h3>
          </div>
          <div className="p-3 bg-green-950/40 border border-green-900 rounded-lg text-green-400">
            <MousePointerClick size={20} />
          </div>
        </div>
        <p className="text-xs text-slate-400 mt-4 flex items-center gap-1">
          <span className="text-green-400 font-medium font-mono">↑ 8.2%</span> de engajamento do tráfego
        </p>
      </div>

      {/* CTR Card */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 transition-all hover:border-slate-700">
        <div className="flex justify-between items-start">
          <div>
            <p className="text-xs text-slate-500 font-mono tracking-wider uppercase">CTR Médio (Cliques/Visualizações)</p>
            <h3 className="text-3xl font-black text-white mt-1 tracking-tight">{averageCtr}%</h3>
          </div>
          <div className="p-3 bg-amber-950/40 border border-amber-900 rounded-lg text-amber-400">
            <TrendingUp size={20} />
          </div>
        </div>
        <p className="text-xs text-slate-400 mt-4 flex items-center gap-1">
          <span className="text-green-400 font-medium font-mono">Estável</span> acima da média nacional de 11.2%
        </p>
      </div>

      {/* Micro Analytics Graph */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 lg:col-span-1 flex flex-col justify-between">
        <div className="flex items-center gap-2 mb-3">
          <BarChart2 className="text-green-400" size={18} />
          <span className="text-xs font-mono tracking-wider uppercase text-slate-400">Desempenho de Páginas</span>
        </div>
        <div className="space-y-2">
          {pages.slice(0, 3).map((p) => {
            const percentage = Math.min(100, Math.round(((p.views || 0) / maxViews) * 100));
            return (
              <div key={p.id}>
                <div className="flex justify-between items-center text-[11px] text-slate-400 mb-1">
                  <span className="truncate max-w-[120px] font-medium">{p.productName}</span>
                  <span className="font-mono font-bold text-white">{p.views} views</span>
                </div>
                <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden">
                  <div
                    className="bg-gradient-to-r from-green-500 to-blue-500 h-full rounded-full"
                    style={{ width: `${percentage}%` }}
                  ></div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
