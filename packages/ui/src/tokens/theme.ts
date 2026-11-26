import { type ColorScheme, counterDark, counterLight, type Palette } from './color';

export interface ThemeFonts {
  display: string;
  ui: string;
  mono: string;
}

export interface Theme {
  name: string;
  light: Palette;
  dark: Palette;
  /** Which scheme the app opens in when the device has no preference. */
  defaultScheme: ColorScheme;
  fonts?: Partial<ThemeFonts>;
}

export const counterTheme: Theme = {
  name: 'counter',
  light: counterLight,
  dark: counterDark,
  defaultScheme: 'light',
};

export interface ThemeOverrides {
  name: string;
  light?: Partial<Palette>;
  dark?: Partial<Palette>;
  defaultScheme?: ColorScheme;
  fonts?: Partial<ThemeFonts>;
}

/** Build a distribution theme by overriding token values on top of "The Counter". */
export function defineTheme(overrides: ThemeOverrides, base: Theme = counterTheme): Theme {
  const theme: Theme = {
    name: overrides.name,
    light: { ...base.light, ...overrides.light },
    dark: { ...base.dark, ...overrides.dark },
    defaultScheme: overrides.defaultScheme ?? base.defaultScheme,
  };
  const fonts = { ...base.fonts, ...overrides.fonts };
  if (Object.keys(fonts).length) theme.fonts = fonts;
  return theme;
}

/** CSS variables for NativeWind `vars()` / web: `--color-ink: #15181C`. */
export function paletteToCssVars(palette: Palette): Record<`--color-${string}`, string> {
  return Object.fromEntries(
    Object.entries(palette).map(([k, v]) => [
      `--color-${k.replace(/[A-Z]/g, (c) => `-${c.toLowerCase()}`)}`,
      v,
    ]),
  ) as Record<`--color-${string}`, string>;
}
