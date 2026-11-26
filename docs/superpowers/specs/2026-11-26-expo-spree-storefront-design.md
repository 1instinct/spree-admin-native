# expo-spree — Storefront Kit Design Spec

- **Status:** Draft for review (scope addendum to the Spree Admin Native spec)
- **Date:** 2026-11-26
- **Package:** `expo-spree` (npm name free as of 2026-11-26), internals under `@spree-native/*`

## 1. Why

Any Expo app should be able to add a Spree shop (catalog, cart, checkout, account, order
history) with a provider and a few hooks, against any Spree from 4.2 to 6.x.

### What exists today (checked 2026-11-26)

| Thing | What it covers | Gap for us |
| --- | --- | --- |
| `@spree/sdk` 6.0.6 (official) | Store API **v3** client (Spree 5.4+ / 6), types, zod schemas | No Spree 4.2–5.3, no React hooks, no RN concerns (secure token storage, offline, payment sheets) |
| `@spree/storefront-api-v2-sdk` 6.0.6 | Storefront API v2 client | Last published April 2023; no hooks |
| Spree's official storefront | Next.js (React Server Components) | Web only |
| Expo commerce templates (Sellflow etc.) | Full apps for Shopify / Medusa | Not Spree; templates, not packages |

Nothing gives React Native developers version-agnostic Spree hooks. BeeperNative has had to
build all of it by hand: `src/api/spree/*` (auth, cart, checkout, products, variant option
logic), `src/api/http/*` (error kinds, retry, online and focus managers, cache persister),
`digitalGuard`, cart and token atoms, and Stripe checkout. That code is the starting point.

## 2. Shape

```
your Expo app
   └─ <SpreeProvider client={…} storage={secureStorage} payments={[stripe()]}>
        useProducts · useProduct · useVariantPicker · useTaxon · useSearch
        useCart · useCheckout · useAuth · useAccount · useOrders · useOrder
   expo-spree                 React provider + TanStack Query hooks, Expo config plugin
   @spree-native/storefront   framework-free client: catalog, cart, checkout, account
        ├─ adapter storefront-v2   Spree 4.2 → 5.x   (OAuth2 password grant, X-Spree-Order-Token)
        └─ adapter store-v3        Spree 5.4 → 6.x   (publishable key pk_…, customer JWT)
   @spree-native/spree-sdk    shared transport, error kinds, retry, capability probe
   @spree-native/domain       shared models (Product, Variant, Cart = Order, Address, Money)
   @spree-native/payments-stripe   PaymentSheet, Apple Pay / Google Pay via @stripe/stripe-react-native
```

**No tRPC in the storefront kit** (ADR 0007). A library that other people drop into their
apps should be a plain client plus hooks; asking them to host a router is too much. The
admin app keeps tRPC for its own reasons (ADR 0002). Both share `domain` and `spree-sdk`.

## 3. Features

| Area | What the kit does | From BeeperNative |
| --- | --- | --- |
| Catalog | Products, taxons, search, featured collections, pagination, image sizes | `products.ts`, `getTaxon*` |
| Variants | Option groups, chip states (available / unavailable with selection), default pick, resolve selection → variant | `productVariants.ts` (pure, well tested) |
| Cart | Guest and signed-in carts, merge on sign-in, optimistic quantity changes, coupons, unavailable-line detection with human messages | `cart.ts`, `CartItemUnavailableError` |
| Checkout | State machine over Spree's address → delivery → payment → confirm, shipping-rate estimate, payment plug-ins, completion | `checkout.ts`, `useCheckout` |
| Account | Sign up, sign in, password reset, profile, addresses, saved cards, order history | `account.ts`, `auth.ts` |
| Purchase guards | Rules that stop items being bought in-app (e.g. digital goods that App Store rules require through IAP) with a clear message | `digitalGuard.ts` |
| Resilience | Error kinds (offline, timeout, invalid, notFound…), retry with `Retry-After`, online/focus managers, persisted cache with size cap | `api/http/*` |
| Storage | Tokens in `expo-secure-store`; cart token survives restarts | `token` atom |
| Deep links | Config plugin for universal links to `/products/:slug` and order status | — |

## 4. Principles

- **Headless first.** Hooks and pure helpers. An optional, themeable UI kit
  (`expo-spree/ui`: ProductCard, VariantPicker, CartLine, CheckoutSheet) comes later and uses
  the same tokens system as the admin app.
- **Capabilities, not versions** (same as the admin app). Coupons, gift cards, markets and
  price lists appear when the store supports them.
- **Bring your own state.** Hooks are TanStack Query; no global store library is required.
- **Tested against real Spree.** The storefront contract suite runs on the same Docker matrix
  as the admin suite.

## 5. Phasing (interleaved with the admin roadmap)

| Phase | Scope |
| --- | --- |
| S0 (= admin Phase 0) | Shared `domain`, `spree-sdk` transport, error kinds, probe |
| S1 | `@spree-native/storefront` catalog + cart on both adapters; `expo-spree` provider and catalog/cart hooks; `apps/storefront-example` |
| S2 | Checkout state machine, `payments-stripe`, purchase guards |
| S3 | Account, addresses, orders, password reset |
| S4 | BeeperNative migrates `src/api/spree` + cart atoms to `expo-spree` (proof in production) |
| S5 | `expo-spree/ui` kit, docs site section, 1.0 |

## 6. Open questions

1. Payment providers beyond Stripe for v1 (Adyen, PayPal via `spree_paypal_checkout`?).
2. Whether the example storefront ships as a template (`create-expo-app --template`).
3. Whether to propose `@spree-native/storefront`'s v2 adapter upstream as a maintained
   replacement for the stale v2 SDK.
