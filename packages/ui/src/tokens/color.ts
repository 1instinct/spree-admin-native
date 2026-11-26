/** Colour token names. Distributions override values, never names. */
export const COLOR_TOKENS = [
  'bg',
  'surface',
  'surfaceSunk',
  'ink',
  'inkMuted',
  'line',
  'accent',
  'onAccent',
  'accentInk',
  'positive',
  'attention',
  'critical',
  'info',
  'neutral',
] as const;
export type ColorToken = (typeof COLOR_TOKENS)[number];
export type Palette = Record<ColorToken, string>;
export type ColorScheme = 'light' | 'dark';

/** "The Counter": stockroom greys, ink text, marigold for money-in moments. */
export const counterLight: Palette = {
  bg: '#F3F4F1',
  surface: '#FFFFFF',
  surfaceSunk: '#E9EBE6',
  ink: '#15181C',
  inkMuted: '#5F656D',
  line: '#DADDD6',
  accent: '#F2B01E',
  onAccent: '#1C1503',
  accentInk: '#7A5500',
  positive: '#1F7A4D',
  attention: '#B4470E',
  critical: '#B42318',
  info: '#2457C5',
  neutral: '#5F656D',
};

export const counterDark: Palette = {
  bg: '#0E1012',
  surface: '#171A1D',
  surfaceSunk: '#0A0B0D',
  ink: '#EEF0EC',
  inkMuted: '#9AA1A8',
  line: '#262A2F',
  accent: '#FFC23D',
  onAccent: '#1C1503',
  accentInk: '#FFD56E',
  positive: '#4CC38A',
  attention: '#FF8A4C',
  critical: '#FF6B5E',
  info: '#7FA6FF',
  neutral: '#9AA1A8',
};

/** WCAG relative luminance of a #RRGGBB colour. */
export function luminance(hex: string): number {
  const m = /^#([0-9a-f]{6})$/i.exec(hex);
  if (!m?.[1]) throw new Error(`Expected #RRGGBB, got ${hex}`);
  const n = Number.parseInt(m[1], 16);
  const channel = (c: number) => {
    const s = c / 255;
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * channel((n >> 16) & 255) + 0.7152 * channel((n >> 8) & 255) + 0.0722 * channel(n & 255);
}

export function contrastRatio(a: string, b: string): number {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x) as [number, number];
  return (hi + 0.05) / (lo + 0.05);
}

/**
 * Text/background pairs every palette must keep legible. 4.5 for text, 3 for large display
 * text and non-text marks.
 */
export const REQUIRED_CONTRAST: readonly [fg: ColorToken, bg: ColorToken, min: number][] = [
  ['ink', 'bg', 4.5],
  ['ink', 'surface', 4.5],
  ['ink', 'surfaceSunk', 4.5],
  ['inkMuted', 'surface', 4.5],
  ['inkMuted', 'bg', 4.5],
  ['onAccent', 'accent', 4.5],
  ['accentInk', 'surface', 4.5],
  ['positive', 'surface', 4.5],
  ['attention', 'surface', 4.5],
  ['critical', 'surface', 4.5],
  ['info', 'surface', 4.5],
  ['accent', 'bg', 1.4],
];

export function contrastFailures(palette: Palette): string[] {
  return REQUIRED_CONTRAST.flatMap(([fg, bg, min]) => {
    const ratio = contrastRatio(palette[fg], palette[bg]);
    return ratio < min ? [`${fg} on ${bg}: ${ratio.toFixed(2)} < ${min}`] : [];
  });
}
