/** What a distribution (the upstream app or a fork) configures. Pure data: read by app.config.ts and at runtime. */
export interface DistributionConfig {
  /** Display name on the home screen and in the app. */
  name: string;
  slug: string;
  /** Deep-link scheme. */
  scheme: string;
  ios: { bundleIdentifier: string };
  android: { package: string };
  eas?: { projectId?: string; updatesChannel?: string };
  /** Pre-fills Connect. */
  defaultStoreUrl: string | null;
  /** Hide "add another store" (single-store forks). */
  lockToStore: boolean;
  /** Splash and adaptive-icon background. */
  brandColor: string;
}

/**
 * Font family name → asset, loaded with expo-font at startup. Require single weights by file
 * (`@expo-google-fonts/x/500Medium/X_500Medium.ttf`); a font package index bundles every weight.
 */
export type FontAssets = Record<string, number>;
