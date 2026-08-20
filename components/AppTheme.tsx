import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';

import { loadThemeId, saveThemeId } from '@/lib/theme-store';
import {
  DEFAULT_THEME_ID,
  THEMES,
  type AppColors,
  type ThemeId,
} from '@/lib/theme';

type AppThemeValue = {
  themeId: ThemeId;
  colors: AppColors;
  setThemeId: (id: ThemeId) => void;
};

const AppThemeContext = createContext<AppThemeValue | null>(null);

export function AppThemeProvider({ children }: { children: ReactNode }) {
  const [themeId, setThemeIdState] = useState<ThemeId>(DEFAULT_THEME_ID);

  useEffect(() => {
    void loadThemeId().then(setThemeIdState);
  }, []);

  const setThemeId = useCallback((id: ThemeId) => {
    setThemeIdState(id);
    void saveThemeId(id);
  }, []);

  const value = useMemo(
    () => ({
      themeId,
      colors: THEMES[themeId],
      setThemeId,
    }),
    [setThemeId, themeId]
  );

  return <AppThemeContext.Provider value={value}>{children}</AppThemeContext.Provider>;
}

export function useAppTheme(): AppThemeValue {
  const value = useContext(AppThemeContext);
  if (!value) {
    throw new Error('useAppTheme must be used within AppThemeProvider.');
  }
  return value;
}
