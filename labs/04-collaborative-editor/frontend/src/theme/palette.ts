import type { PaletteOptions } from '@mui/material/styles';
import { alpha } from '@mui/material/styles';
import { colors, getSciLatexTokens, type ThemePreset } from './tokens';

export const getPalette = (
  mode: 'light' | 'dark',
  preset: ThemePreset = 'overleaf'
): PaletteOptions => {
  const tokens = getSciLatexTokens(mode, preset);

  if (mode === 'dark') {
    return {
      mode: 'dark',
      primary: {
        main: tokens.primary.main,
        light: tokens.primary.hover,
        dark: tokens.primary.active,
        contrastText: tokens.primary.contrast,
      },
      secondary: {
        main: tokens.secondary.main,
        light: colors.indigo[300],
        dark: colors.indigo[600],
        contrastText: colors.white,
      },
      error: {
        main: tokens.error.main,
        light: colors.red[300],
        dark: colors.red[600],
        contrastText: colors.white,
      },
      warning: {
        main: tokens.warning.main,
        light: colors.amber[300],
        dark: colors.amber[600],
        contrastText: colors.gray[950],
      },
      info: {
        main: tokens.primary.main,
        light: colors.sky[300],
        dark: colors.sky[600],
        contrastText: colors.white,
      },
      success: {
        main: tokens.success.main,
        light: colors.emerald[300],
        dark: colors.emerald[600],
        contrastText: colors.white,
      },
      grey: colors.slate,
      background: {
        default: tokens.background.default,
        paper: tokens.background.paper,
      },
      text: {
        primary: tokens.text.primary,
        secondary: tokens.text.secondary,
        disabled: tokens.text.disabled,
      },
      divider: tokens.border.default,
      action: {
        active: tokens.primary.main,
        hover: alpha(tokens.primary.main, 0.08),
        selected: alpha(tokens.primary.main, 0.16),
      },
    };
  }

  // Light Mode
  return {
    mode: 'light',
    primary: {
      main: tokens.primary.main,
      light: tokens.primary.hover,
      dark: tokens.primary.active,
      contrastText: tokens.primary.contrast,
    },
    secondary: {
      main: tokens.secondary.main,
      light: colors.indigo[500],
      dark: colors.indigo[700],
      contrastText: colors.white,
    },
    error: {
      main: tokens.error.main,
      light: colors.red[500],
      dark: colors.red[700],
      contrastText: colors.white,
    },
    warning: {
      main: tokens.warning.main,
      light: colors.amber[500],
      dark: colors.amber[700],
      contrastText: colors.white,
    },
    info: {
      main: tokens.primary.main,
      light: colors.sky[500],
      dark: colors.sky[700],
      contrastText: colors.white,
    },
    success: {
      main: tokens.success.main,
      light: colors.emerald[500],
      dark: colors.emerald[700],
      contrastText: colors.white,
    },
    grey: colors.slate,
    background: {
      default: tokens.background.default,
      paper: tokens.background.paper,
    },
    text: {
      primary: tokens.text.primary,
      secondary: tokens.text.secondary,
      disabled: tokens.text.disabled,
    },
    divider: tokens.border.default,
    action: {
      active: tokens.primary.main,
      hover: alpha(tokens.primary.main, 0.08),
      selected: alpha(tokens.primary.main, 0.14),
    },
  };
};

export const darkPalette = getPalette('dark', 'blue');
export const lightPalette = getPalette('light', 'blue');
