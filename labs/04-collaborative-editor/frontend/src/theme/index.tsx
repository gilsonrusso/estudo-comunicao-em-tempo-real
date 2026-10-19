import { createTheme, CssBaseline, ThemeProvider } from '@mui/material';
import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { componentsOverrides } from './components';
import { getPalette } from './palette';
import { getSciLatexTokens, tailwindFonts, type ThemePreset } from './tokens';
import { typography } from './typography';

export * from './tokens';

export type ColorMode = 'dark' | 'light';

export const ACTIVE_THEME_PRESET: ThemePreset = 'overleaf';

export interface ThemeContextType {
  mode: ColorMode;
  preset: ThemePreset;
  toggleColorMode: () => void;
  setMode: (mode: ColorMode) => void;
  setPreset: (preset: ThemePreset) => void;
}

const ThemeContext = createContext<ThemeContextType>({
  mode: 'dark',
  preset: 'overleaf',
  toggleColorMode: () => {},
  setMode: () => {},
  setPreset: () => {},
});

export function useColorMode(): ThemeContextType {
  return useContext(ThemeContext);
}

export interface ThemeContextProviderProps {
  children: ReactNode;
  defaultPreset?: ThemePreset;
}

export function ThemeContextProvider({
  children,
  defaultPreset = 'overleaf',
}: ThemeContextProviderProps) {
  const [mode, setModeState] = useState<ColorMode>(() => {
    const saved = localStorage.getItem('theme_mode');
    return saved === 'light' || saved === 'dark' ? saved : 'dark';
  });

  const [preset, setPresetState] = useState<ThemePreset>(defaultPreset);

  const toggleColorMode = () => {
    setModeState((prev) => {
      const next = prev === 'dark' ? 'light' : 'dark';
      localStorage.setItem('theme_mode', next);
      return next;
    });
  };

  const setMode = (newMode: ColorMode) => {
    setModeState(newMode);
    localStorage.setItem('theme_mode', newMode);
  };

  const setPreset = (newPreset: ThemePreset) => {
    setPresetState(newPreset);
    localStorage.setItem('theme_preset', newPreset);
  };

  useEffect(() => {
    const root = document.documentElement;
    const tokens = getSciLatexTokens(mode, preset);

    root.setAttribute('data-theme', mode);
    root.setAttribute('data-theme-preset', preset);
    root.style.setProperty('--font-sans', tailwindFonts.sans);
    root.style.setProperty('--font-mono', tailwindFonts.mono);

    root.style.setProperty('--bg-default', tokens.background.default);
    root.style.setProperty('--bg-paper', tokens.background.paper);
    root.style.setProperty('--text-primary', tokens.text.primary);
    root.style.setProperty('--text-secondary', tokens.text.secondary);
    root.style.setProperty('--border-color', tokens.border.default);
    root.style.setProperty('--primary-main', tokens.primary.main);
    root.style.setProperty('--code-bg', tokens.code.background);
    root.style.setProperty('--code-fg', tokens.code.foreground);
  }, [mode, preset]);

  const theme = useMemo(() => {
    const palette = getPalette(mode, preset);
    return createTheme({
      cssVariables: true,
      palette,
      typography,
      shape: {
        borderRadius: 8,
      },
      components: componentsOverrides,
    });
  }, [mode, preset]);

  return (
    <ThemeContext.Provider value={{ mode, preset, toggleColorMode, setMode, setPreset }}>
      <ThemeProvider theme={theme}>
        <CssBaseline />
        {children}
      </ThemeProvider>
    </ThemeContext.Provider>
  );
}
