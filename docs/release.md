# Releasing: Expo Go, Snack and npm

## Run the app in Expo Go (works today)

Everything the app uses ships in Expo Go for SDK 58 (router, Native Tabs, camera, secure
store, fonts, local notifications), so no development build is needed to try it.

```sh
pnpm install
node scripts/spree-up.mjs 4.2          # or point at a real store
pnpm --filter @spree-native/mobile start
```

Scan the QR code with Expo Go (SDK 58). The phone can't reach `localhost`: connect to the
store with your machine's LAN address (`http://192.168.x.x:3042`) or a public store.

What does **not** work in Expo Go:

| Feature | Why | Use instead |
| --- | --- | --- |
| Push notifications | Removed from Expo Go in SDK 53 | `eas build --profile development` (dev client is installed) |
| `APP_DISTRIBUTION` themes for forks | Works, but the fork's fonts must be bundled | Same, nothing extra |

## Snack

Snack runs a single project from npm packages; it can't use this pnpm workspace, the
`@distribution` Metro alias or packages that only exist in git. So a Snack needs:

1. The shared packages on npm (below), built to JavaScript.
2. A Snack-sized entry: the **expo-spree example** is the natural first Snack (one screen tree,
   `expo-spree` from npm, a public demo store). The admin app is better shown as an Expo Go
   QR from `eas update` than as a Snack.
3. A public demo store reachable from snack.expo.dev, with CORS allowing the Snack web
   preview (Spree 4.2 sends no CORS headers; device previews in Expo Go don't need CORS).

## Publish to npm

| Package | Repo | Scope to claim on npm |
| --- | --- | --- |
| `@spree-native/domain` | spree-admin-native | `@spree-native` (org) |
| `@spree-native/spree-sdk` | spree-admin-native | `@spree-native` |
| `@spree-native/ui` | spree-admin-native | `@spree-native` |
| `@expo-spree/storefront` | expo-spree | `@expo-spree` (org) |
| `expo-spree` | expo-spree | unscoped (name free as of 2026-11-26) |

The packages build to `dist/` with tsup (ESM, CommonJS and `.d.ts`); `publishConfig` points
`exports` at the build only when publishing, so the workspace keeps using the TypeScript source.
Tarballs are checked in a fresh project with ESM `import`, CommonJS `require` and `tsc` under
`nodenext`, `bundler` and `node10` resolution.

To publish:

1. **npm orgs** `spree-native` and `expo-spree` on the publishing npm account (free orgs for
   public packages).
2. **`NPM_TOKEN` secret** in both GitHub repos: an npm *granular access token* with read and
   write on both scopes (and "bypass 2FA" so CI can publish).
3. **Run "Release to npm"** (`.github/workflows/release.yml`) from the Actions tab: first with
   *dry run* on, then off. It builds, lints, typechecks, tests and publishes every package
   under `packages/` whose version isn't on npm yet, with provenance. spree-admin-native goes
   first, since expo-spree's packages depend on `@spree-native/*`.
4. **Next versions** with Changesets (already a dev dependency): `pnpm changeset`, then
   `pnpm changeset version`, commit, and run the workflow again. GitHub immutable releases are
   fine with this; tags are never moved.
5. **Trusted publishing.** Once each package exists on npm, add this repo's `release.yml` as a
   trusted publisher in the package settings and remove `NPM_TOKEN`; CI then publishes with
   short-lived OIDC credentials instead of a stored token.

## Ship the app (any distribution)

`apps/mobile/eas.json` has `development`, `preview` and `production` profiles. Each
distribution sets its own Expo project in `distributions/<name>/distribution.json`
(`eas.projectId`, `eas.owner`), so builds pick it with:

```sh
cd apps/mobile
APP_DISTRIBUTION=<name> npx eas-cli build --profile production --platform ios
APP_DISTRIBUTION=<name> npx eas-cli submit --profile production --platform ios
```

Set `APP_DISTRIBUTION` as an environment variable in that EAS project too, so cloud builds and
`eas update` use the same distribution.
