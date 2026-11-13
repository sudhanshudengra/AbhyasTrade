import React, { createContext, useContext, useEffect, useState } from 'react';

export type ThemeMode = 'system' | 'light' | 'dark';
export type ResolvedTheme = 'light' | 'dark';

interface ThemeContextType {
  theme: ThemeMode;
  resolvedTheme: ResolvedTheme;
  setTheme: (theme: ThemeMode) => void;
  toggleTheme: () => void;
}

const THEME_STORAGE_KEY = 'abhyastrade_theme';

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

const getSystemPreference = (): ResolvedTheme => {
  if (typeof window === 'undefined') return 'dark';
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
};

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [theme, setThemeState] = useState<ThemeMode>(() => {
    if (typeof window === 'undefined') return 'system';
    const saved = localStorage.getItem(THEME_STORAGE_KEY) as ThemeMode | null;
    if (saved === 'light' || saved === 'dark' || saved === 'system') {
      return saved;
    }
    // Default by system as requested
    return 'system';
  });

  const [systemPreference, setSystemPreference] = useState<ResolvedTheme>(getSystemPreference);

  // Listen to OS system color-scheme changes
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');

    const updateSystemPreference = (e: MediaQueryListEvent | MediaQueryList) => {
      setSystemPreference(e.matches ? 'dark' : 'light');
    };

    updateSystemPreference(mediaQuery);

    const listener = (e: MediaQueryListEvent) => updateSystemPreference(e);
    if (mediaQuery.addEventListener) {
      mediaQuery.addEventListener('change', listener);
      return () => mediaQuery.removeEventListener('change', listener);
    } else {
      // Fallback for older browsers
      mediaQuery.addListener(listener);
      return () => mediaQuery.removeListener(listener);
    }
  }, []);

  // Compute the effectively resolved theme
  const resolvedTheme: ResolvedTheme = theme === 'system' ? systemPreference : theme;

  // Apply theme class and metadata to document
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const root = document.documentElement;

    if (resolvedTheme === 'dark') {
      root.classList.add('dark');
      root.classList.remove('light');
    } else {
      root.classList.add('light');
      root.classList.remove('dark');
    }

    root.setAttribute('data-theme', resolvedTheme);
    root.style.colorScheme = resolvedTheme;

    // Update browser status bar / theme-color meta tag
    const metaThemeColor = document.querySelector('meta[name="theme-color"]');
    if (metaThemeColor) {
      metaThemeColor.setAttribute('content', resolvedTheme === 'dark' ? '#0b0e14' : '#f8fafc');
    }
  }, [resolvedTheme]);

  const setTheme = (newTheme: ThemeMode) => {
    setThemeState(newTheme);
    try {
      localStorage.setItem(THEME_STORAGE_KEY, newTheme);
    } catch {
      // Ignore localStorage write failures (e.g. private mode)
    }
  };

  const toggleTheme = () => {
    // If currently dark, switch to light; if light, switch to dark
    setTheme(resolvedTheme === 'dark' ? 'light' : 'dark');
  };

  return (
    <ThemeContext.Provider value={{ theme, resolvedTheme, setTheme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = (): ThemeContextType => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};
