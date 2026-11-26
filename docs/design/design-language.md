# Design Language: "The Counter"

The app is the shop counter in your pocket. A counter has receipts, packing slips, a till
and a tally. It is calm until money comes in. Our UI follows that: quiet surfaces, dense
and legible lists, big honest numbers, and one warm accent that means *money in*.

## Tokens

### Colour

| Token | Light | Dark | Use |
| --- | --- | --- | --- |
| `bg` | `#F3F4F1` | `#0E1012` | App background ("stockroom") |
| `surface` | `#FFFFFF` | `#171A1D` | Cards, sheets, list rows |
| `surface-sunk` | `#E9EBE6` | `#0A0B0D` | Wells, inputs, receipt tape |
| `ink` | `#15181C` | `#EEF0EC` | Primary text |
| `ink-muted` | `#5F656D` | `#9AA1A8` | Secondary text, labels |
| `line` | `#DADDD6` | `#262A2F` | Dividers, outlines |
| `accent` | `#F2B01E` | `#FFC23D` | **Marigold.** Money-in moments: new order, today's total, primary CTA fill |
| `on-accent` | `#1C1503` | `#1C1503` | Text on marigold |
| `accent-ink` | `#7A5500` | `#FFD56E` | Accent used as text on surface |

Semantic status colours are separate from the accent and always paired with a label or icon:

| Status | Light | Dark | Examples |
| --- | --- | --- | --- |
| `positive` | `#1F7A4D` | `#4CC38A` | Paid, Shipped |
| `attention` | `#B4470E` | `#FF8A4C` | Unfulfilled, Balance due |
| `critical` | `#B42318` | `#FF6B5E` | Failed payment, Canceled |
| `info` | `#2457C5` | `#7FA6FF` | Partially shipped, Backorder |
| `neutral` | `#5F656D` | `#9AA1A8` | Draft, Pending |

### Type

| Role | Face | Notes |
| --- | --- | --- |
| Display | **Bricolage Grotesque** 600–700 | Money figures, screen titles. Use sparingly: one display element per screen. |
| UI | **Geist** 400/500/600 | Everything else. |
| Mono | **Geist Mono** 400/500 | Order `R…`, shipment `H…`, payment `P…` numbers, SKUs, tracking numbers, tabular money columns. |

Scale (pt): 12 · 13 · 15 (body) · 17 · 20 · 24 · 32 · 44 (hero money). Respect Dynamic
Type; the 44pt hero caps at 1.3× to keep the dashboard readable.

### Shape, space, motion

- Space: 4-pt grid; list rows 56pt min; screen gutter 16pt (20pt on iPad).
- Radius: 6 (badges), 12 (cards), 20 (sheets). Lists are full-bleed rows, not cards.
- Elevation: one level (sheets). Cards use a 1px `line` outline, no shadow.
- Motion: 180ms ease-out for state changes; spring for sheets; the new-order banner drops
  in like a ticket from the top. All motion respects Reduce Motion.

## Signature details

1. **Receipt tape timeline.** Order history is a narrow `surface-sunk` strip with a
   perforated top and bottom edge, timestamps in mono on the left, events on the right.
2. **Number glyphs.** Spree numbers keep their prefix as a tiny inverted glyph: `[R]482913057`,
   `[H]38120471`, `[P]Q7K2M4ZD`. Long-press copies.
3. **Ticket banner.** The in-app new-order banner and the push notification share the same
   layout: amount (display face, marigold), order number (mono), item count, customer city.
4. **The till.** New-order sound is a short mechanical till chime recorded for this project.

## Patterns

| Pattern | Rules |
| --- | --- |
| Resource list | Title, secondary line, trailing money in mono, status badges under the title. Swipe right = primary action (Fulfil), swipe left = more. |
| Status badge | Dot + label, never colour alone. Payment badge first, then fulfilment. |
| Money | Always `MoneyText`; currency from the order; negative in `critical` with a minus sign. |
| Primary action | One marigold button per screen, pinned bottom on phones. |
| Destructive confirm | Sheet that states the effect in a sentence with the amount. |
| Empty state | Says what will appear and the one thing to do next. |
| Capability gate | Disabled action with a one-line reason and a "Learn more" link. Never hide silently. |

## Distribution theming

Forks override tokens in `distributions/<name>/theme.ts`. Only tokens change; layout and
patterns stay. The Beeper distribution is the reference example (dark-first, magenta accent,
retro display face).

## Avoid

- Shopify green, Polaris component look-alikes.
- Gradients on surfaces, glassmorphism, shadows on list rows.
- Emoji as icons. Use one icon set (Phosphor or SF Symbols via `expo-symbols`).
