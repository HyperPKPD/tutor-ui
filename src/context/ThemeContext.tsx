import React, { createContext, useContext, useEffect } from 'react';
import { PERSISTENCE } from '../config/appConfig';
import { oneOf } from '../db/sanitize';
import { usePersistedState } from '../db/usePersistedState';

type Theme = 'light' | 'dark';

interface ThemeContextValue {
  isDark: boolean;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

const systemTheme = (): Theme =>
  window.matchMedia?.('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Persisted in IndexedDB; falls back to the OS preference the first time
  const [theme, setTheme] = usePersistedState<Theme>(PERSISTENCE.keys.theme, systemTheme(), oneOf(['light', 'dark'] as const));
  const isDark = theme === 'dark';

  useEffect(() => {
    document.documentElement.classList.toggle('dark', isDark);
  }, [isDark]);

  return (
    <ThemeContext.Provider value={{ isDark, toggleTheme: () => setTheme((t) => (t === 'dark' ? 'light' : 'dark')) }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = (): ThemeContextValue => {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be used within a ThemeProvider');
  return ctx;
};
