# DNA Admin Native

**Run your Spree Commerce store from your phone.** An open-source, native admin app for
[Spree](https://spreecommerce.org) 4.2 through the latest release, on iOS, Android, iPad
and the web.

> Status: **planning / Phase 0**. Read the [design spec](docs/superpowers/specs/2026-11-26-dna-admin-native-design.md)
> and the [Phase 0 plan](docs/superpowers/plans/2026-11-26-phase-0-foundations.md).

## What it does

- **Order notifications** with a till chime the moment a sale lands.
- **Home** that tells you what needs doing today: orders to fulfil, payments to capture,
  low stock.
- **Orders**: fulfil with barcode-scanned tracking numbers, capture, refund, cancel, notes.
- **Products and inventory**: edit, photograph, adjust stock, scan to find a variant.
- **Customers, promotions and full store settings.**
- **Extensions** from a community registry, including server-rendered "Blocks" extensions
  any Spree developer can write in Ruby.
- **Works with your Spree as it is.** No server of ours. An optional companion gem and
  optional self-hosted relay add push notifications and faster dashboards on older Spree.

## How it works

```
Expo app ── tRPC (runs in the app) ── spree-sdk adapters ── your Spree store
                                       ├─ Platform API v2  (Spree 4.2 – 5.x)
                                       └─ Admin API v3     (Spree 5.4+)
```

The app asks your store what it supports and adapts. Compatibility is proven by contract
tests against real Spree versions in CI; see [docs/compatibility.md](docs/compatibility.md)
(generated, coming in Phase 0).

## Repository layout (target)

| Path | What |
| --- | --- |
| `apps/mobile` | Expo app (iOS, Android, web) |
| `apps/relay` | Optional self-hosted push / webhook relay |
| `packages/domain` | Normalised commerce models (zod) |
| `packages/spree-sdk` | Version-adaptive Spree client |
| `packages/api` | tRPC router |
| `packages/ui` | Design tokens and components |
| `packages/extension-sdk` | Extension manifest, slots, Blocks schema |
| `gems/spree_admin_native` | Optional Spree companion gem |
| `distributions/default` | Brand, theme and config for the upstream app |

## Forking for your brand

Agencies and merchants can ship their own branded build. Everything brand-specific lives in
`distributions/<name>/`, so upstream updates merge cleanly. See [docs/forking.md](docs/forking.md).
[`beeper-admin-native`](https://github.com/Beeper-Buzz/beeper-admin-native) is the first fork.

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md). Decisions are recorded in [docs/adr](docs/adr).
Design language: [docs/design/design-language.md](docs/design/design-language.md).

## License

[MIT](LICENSE)
