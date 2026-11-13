import React from 'react';
import { List, LineChart, Layers, FileText, PieChart } from 'lucide-react';

export type MobileTab = 'WATCHLIST' | 'CHART' | 'POSITIONS' | 'ORDERS' | 'ANALYTICS';

interface BottomNavProps {
  activeTab: MobileTab;
  onChangeTab: (tab: MobileTab) => void;
  openPositionsCount: number;
  pendingOrdersCount: number;
}

export const BottomNav: React.FC<BottomNavProps> = ({
  activeTab,
  onChangeTab,
  openPositionsCount,
  pendingOrdersCount,
}) => {
  return (
    <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 dark:bg-obsidian-800/95 backdrop-blur-lg border-t border-slate-200 dark:border-obsidian-700/80 px-2 py-1.5 pb-safe">
      <div className="grid grid-cols-5 gap-1">
        {/* Watchlist Tab */}
        <button
          onClick={() => onChangeTab('WATCHLIST')}
          className={`flex flex-col items-center justify-center py-1 rounded-xl transition cursor-pointer ${
            activeTab === 'WATCHLIST'
              ? 'text-brand-blue dark:text-brand-cyan font-bold'
              : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
          }`}
        >
          <List className="w-5 h-5" />
          <span className="text-[10px] mt-0.5">Watchlist</span>
        </button>

        {/* Chart Tab */}
        <button
          onClick={() => onChangeTab('CHART')}
          className={`flex flex-col items-center justify-center py-1 rounded-xl transition cursor-pointer ${
            activeTab === 'CHART'
              ? 'text-brand-blue dark:text-brand-cyan font-bold'
              : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
          }`}
        >
          <LineChart className="w-5 h-5" />
          <span className="text-[10px] mt-0.5">Chart</span>
        </button>

        {/* Positions Tab */}
        <button
          onClick={() => onChangeTab('POSITIONS')}
          className={`flex flex-col items-center justify-center py-1 rounded-xl relative transition cursor-pointer ${
            activeTab === 'POSITIONS'
              ? 'text-brand-blue dark:text-brand-cyan font-bold'
              : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
          }`}
        >
          <Layers className="w-5 h-5" />
          <span className="text-[10px] mt-0.5">Positions</span>
          {openPositionsCount > 0 && (
            <span className="absolute top-0.5 right-3 w-4 h-4 rounded-full bg-emerald-600 text-white text-[9px] font-extrabold flex items-center justify-center shadow-sm">
              {openPositionsCount}
            </span>
          )}
        </button>

        {/* Orders Tab */}
        <button
          onClick={() => onChangeTab('ORDERS')}
          className={`flex flex-col items-center justify-center py-1 rounded-xl relative transition cursor-pointer ${
            activeTab === 'ORDERS'
              ? 'text-brand-blue dark:text-brand-cyan font-bold'
              : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
          }`}
        >
          <FileText className="w-5 h-5" />
          <span className="text-[10px] mt-0.5">Orders</span>
          {pendingOrdersCount > 0 && (
            <span className="absolute top-0.5 right-3 w-4 h-4 rounded-full bg-amber-600 text-white text-[9px] font-extrabold flex items-center justify-center shadow-sm">
              {pendingOrdersCount}
            </span>
          )}
        </button>

        {/* Analytics Tab */}
        <button
          onClick={() => onChangeTab('ANALYTICS')}
          className={`flex flex-col items-center justify-center py-1 rounded-xl transition cursor-pointer ${
            activeTab === 'ANALYTICS'
              ? 'text-brand-blue dark:text-brand-cyan font-bold'
              : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
          }`}
        >
          <PieChart className="w-5 h-5" />
          <span className="text-[10px] mt-0.5">Analytics</span>
        </button>
      </div>
    </nav>
  );
};
