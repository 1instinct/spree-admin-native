import { describe, expect, it } from 'vitest';
import { COLOR_TOKENS, contrastFailures, contrastRatio, counterDark, counterLight } from './color';
import { counterTheme, defineTheme, paletteToCssVars } from './theme';

describe('palettes', () => {
  it.each([
    ['light', counterLight],
    ['dark', counterDark],
  ] as const)('%s defines every token', (_name, palette) => {
    expect(Object.keys(palette).sort()).toEqual([...COLOR_TOKENS].sort());
  });

  it.each([
    ['light', counterLight],
    ['dark', counterDark],
  ] as const)('%s meets WCAG contrast for every required pair', (_name, palette) => {
    expect(contrastFailures(palette)).toEqual([]);
  });

  it('computes contrast like WCAG', () => {
    expect(contrastRatio('#000000', '#FFFFFF')).toBeCloseTo(21, 0);
    expect(contrastRatio('#FFFFFF', '#FFFFFF')).toBeCloseTo(1, 5);
  });
});

describe('defineTheme', () => {
  it('overrides values and keeps the rest', () => {
    const t = defineTheme({ name: 'acme', dark: { accent: '#FF008A' }, defaultScheme: 'dark' });
    expect(t.dark.accent).toBe('#FF008A');
    expect(t.dark.ink).toBe(counterTheme.dark.ink);
    expect(t.light).toEqual(counterLight);
    expect(t.defaultScheme).toBe('dark');
  });

  it('emits kebab-case CSS variables', () => {
    expect(paletteToCssVars(counterLight)).toMatchObject({
      '--color-ink-muted': '#5F656D',
      '--color-on-accent': '#1C1503',
    });
  });
});
