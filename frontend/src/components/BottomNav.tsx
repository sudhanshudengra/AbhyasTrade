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
  const tabs = [
    { id: 'WATCHLIST' as MobileTab, label: 'Watchlist', icon: List },
    { id: 'CHART' as MobileTab, label: 'Chart', icon: LineChart },
    {
      id: 'POSITIONS' as MobileTab,
      label: 'Positions',
      icon: Layers,
      badge: openPositionsCount > 0 ? openPositionsCount : undefined,
      badgeColor: 'bg-emerald-600',
    },
    {
      id: 'ORDERS' as MobileTab,
      label: 'Orders',
      icon: FileText,
      badge: pendingOrdersCount > 0 ? pendingOrdersCount : undefined,
      badgeColor: 'bg-amber-600',
    },
    { id: 'ANALYTICS' as MobileTab, label: 'Analytics', icon: PieChart },
  ];

  return (
    <nav
      className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 dark:bg-obsidian-900/95 backdrop-blur-xl border-t border-slate-200/90 dark:border-obsidian-700/80 px-1 pt-1.5 shadow-[0_-4px_20px_rgba(0,0,0,0.06)] dark:shadow-[0_-4px_24px_rgba(0,0,0,0.35)] select-none"
      style={{ paddingBottom: 'max(env(safe-area-inset-bottom, 0px), 8px)' }}
    >
      <div className="grid grid-cols-5 gap-0.5 max-w-lg mx-auto">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;

          return (
            <button
              key={tab.id}
              onClick={() => onChangeTab(tab.id)}
              className={`flex flex-col items-center justify-center py-1 px-1 rounded-2xl relative transition-all duration-150 cursor-pointer active:scale-95 touch-manipulation min-h-[48px] ${
                isActive
                  ? 'text-brand-blue dark:text-brand-cyan'
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
              }`}
            >
              <div
                className={`relative flex items-center justify-center px-3 py-1 rounded-full transition-all duration-150 ${
                  isActive
                    ? 'bg-brand-blue/15 dark:bg-brand-cyan/15 scale-105'
                    : 'bg-transparent'
                }`}
              >
                <Icon
                  className={`w-5 h-5 transition-transform duration-150 ${
                    isActive ? 'stroke-[2.4]' : 'stroke-[1.8]'
                  }`}
                />
                {tab.badge !== undefined && (
                  <span
                    className={`absolute -top-1 -right-1 min-w-[17px] h-[17px] px-1 rounded-full ${tab.badgeColor} text-white text-[9px] font-black flex items-center justify-center shadow-sm font-tabular`}
                  >
                    {tab.badge}
                  </span>
                )}
              </div>
              <span
                className={`text-[10px] mt-0.5 tracking-tight transition-all ${
                  isActive ? 'font-bold' : 'font-medium'
                }`}
              >
                {tab.label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
};
