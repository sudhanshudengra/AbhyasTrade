import { Monitor, Moon, Sun } from 'lucide-react';
import React from 'react';
import { ThemeMode, useTheme } from '../hooks/useTheme';

interface ThemeSwitchProps {
  compact?: boolean;
  className?: string;
}

export const ThemeSwitch: React.FC<ThemeSwitchProps> = ({ compact = false, className = '' }) => {
  const { theme, setTheme, resolvedTheme } = useTheme();

  const options: { id: ThemeMode; label: string; icon: React.ReactNode; tooltip: string }[] = [
    {
      id: 'system',
      label: 'System',
      icon: <Monitor className="w-3.5 h-3.5" />,
      tooltip: `System Default (${resolvedTheme === 'dark' ? 'Dark' : 'Light'})`,
    },
    {
      id: 'light',
      label: 'Light',
      icon: <Sun className="w-3.5 h-3.5 text-amber-500" />,
      tooltip: 'Light Mode',
    },
    {
      id: 'dark',
      label: 'Dark',
      icon: <Moon className="w-3.5 h-3.5 text-indigo-400" />,
      tooltip: 'Dark Mode',
    },
  ];

  return (
    <div
      role="group"
      aria-label="Theme selection"
      className={`inline-flex items-center p-1 rounded-xl bg-obsidian-950/80 border border-obsidian-700/80 shadow-inner ${className}`}
    >
      {options.map((opt) => {
        const isActive = theme === opt.id;
        return (
          <button
            key={opt.id}
            type="button"
            onClick={() => setTheme(opt.id)}
            title={opt.tooltip}
            aria-pressed={isActive}
            className={`flex items-center justify-center gap-1.5 py-1 px-2.5 rounded-lg text-xs font-bold transition-all duration-200 select-none cursor-pointer ${
              isActive
                ? 'bg-white dark:bg-obsidian-700 text-slate-900 dark:text-white shadow-sm border border-slate-200/60 dark:border-obsidian-600'
                : 'text-slate-400 hover:text-slate-200 hover:bg-obsidian-800/40'
            } ${compact ? 'flex-1' : ''}`}
          >
            {opt.icon}
            <span className={compact ? 'text-[11px]' : 'text-xs'}>{opt.label}</span>
          </button>
        );
      })}
    </div>
  );
};
