# Pushkaralu — Design System

Status: Sprint 1 deliverable. This is the reference for the visual language
used across web, mobile, and admin.

## Why these choices

Spec §8 asked for "modern Indian pilgrimage + tourism" that avoids looking
like an "outdated religious website." The brief for river-inspired +
warm-spiritual + clean + premium is broad enough to collapse into generic
"AI app" defaults (cream background, terracotta accent, serif headlines) if
not made deliberately specific. This system picks concrete, distinct values
instead.

## Color

| Token | Hex | Use |
|---|---|---|
| `river-deep` | `#0E4C5C` | Primary brand, admin sidebar, secondary CTA |
| `river-current` | `#1C7C93` | Links, active states, focus rings |
| `river-mist` | `#DCEEF2` | Icon backgrounds, subtle section tint |
| `saffron` | `#E8961F` | Primary CTA — marigold/saffron, not clay/terracotta |
| `saffron-light` | `#FDF0DC` | Badges, highlight backgrounds |
| `ember` | `#C4501F` | Secondary warm accent, used sparingly |
| `surface` | `#FAF8F4` | Page background — warm off-white |
| `surface-raised` | `#FFFFFF` | Cards, header, modals |
| `ink` / `ink-muted` | `#16262E` / `#4B5C63` | Text — blue-black, not pure black, ties to river theme |

Status colors (crowd levels, booking states) are a **separate** palette
(green/amber/orange/red) so they're never confused with brand color — a
`saffron` button and a `MODERATE` crowd badge should never look related.

## Typography

- **Display/body:** system-ui sans stack (bold + tight tracking for
  headlines, regular for body). No web font fetch — this sandbox's network
  policy blocks Google Fonts at build time, and depending on an external
  font host is fragile for production CI anyway. Revisit with a
  self-hosted variable font (e.g. via `next/font/local`) in a later polish
  pass if desired.
- **Data/utility (`font-data` class):** monospace with tabular figures, used
  for timestamps, prices, crowd-status badges, admin stat numbers. This is
  the one deliberately "unusual" typographic choice — it borrows a
  transit/status-board feel that reinforces "this is a live logistics
  platform," not just a content site.

## Signature element: the river line

A thin flowing SVG wave-stroke (`river-current` → `saffron` gradient),
used in exactly three places: under the header wordmark, as a large soft
backdrop shape behind the homepage hero headline, and as the footer's top
border (reversed gradient, to bookend the page). It is NOT used as a
decorative repeat element throughout the UI — restraint is what makes it
read as a signature rather than wallpaper.

## Components (`src/components/ui/`)

Button, Card, Badge, Modal, Input, Select, SearchBar, Tabs, EmptyState,
ErrorState, LoadingState, Breadcrumb, LocationCard, ServiceCard — all
built directly against the tokens above, no separate component-level
color values. `LocationCard` and `ServiceCard` are the two
domain-adjacent components (used for listings and quick-access tiles
respectively); everything else is generic.

## Mobile parity

`pushkaralu-mobile/src/theme/tokens.ts` mirrors these values exactly
(same hex codes, equivalent naming). React Native has no CSS custom
properties, so this file must be updated by hand if the web tokens change
— there is currently no shared package enforcing this; worth revisiting
if/when a monorepo split happens (see ARCHITECTURE.md §7).

## Verified responsive behavior

Screenshotted via Playwright at 390px (mobile), 820px (tablet), and
1440px (desktop) for both the public site and admin dashboard, including
interaction states (mobile nav panel open, admin sidebar slide-over open).
Mobile app shell verified via Expo's web target at a 390×844 viewport.
