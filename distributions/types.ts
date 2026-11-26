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

/** Font family name → asset (a `require('…ttf')` module id), loaded with expo-font at startup. */
export type FontAssets = Record<string, number>;
