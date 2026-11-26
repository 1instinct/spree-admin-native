/** Font roles. Families are loaded by the app with @expo-google-fonts. */
export const fonts = {
  display: 'BricolageGrotesque_700Bold',
  displayMedium: 'BricolageGrotesque_600SemiBold',
  ui: 'Geist_400Regular',
  uiMedium: 'Geist_500Medium',
  uiSemibold: 'Geist_600SemiBold',
  mono: 'GeistMono_400Regular',
  monoMedium: 'GeistMono_500Medium',
} as const;
export type FontRole = keyof typeof fonts;

/** Type scale in points. `hero` is the one display money figure per screen. */
export const typeScale = {
  caption: 12,
  footnote: 13,
  body: 15,
  callout: 17,
  title3: 20,
  title2: 24,
  title1: 32,
  hero: 44,
} as const;
export type TypeStep = keyof typeof typeScale;

/** Hero money caps Dynamic Type growth so Home stays readable. */
export const MAX_HERO_FONT_SCALE = 1.3;
