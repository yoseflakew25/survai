# Design system — Survai (teal primary + green accent)

Layout motifs from Launchpot board density; brand system matches the landing palette.

## Palette

| Token | Light | Dark |
| --- | --- | --- |
| background | `#ffffff` | `#0a1419` |
| foreground | `#000000` | `#f4f8fa` |
| card | `#ffffff` | `#102029` |
| secondary | `#eef3f5` | `#152833` |
| muted | `#f3f6f7` | `#12222b` |
| muted-foreground | `#4a5c66` | `#9bb0ba` |
| border | `#d7e0e4` | `#1e3540` |
| primary | `#103344` | `#22f187` |
| primary-foreground | `#ffffff` | `#0a1419` |
| brand / gold | `#22f187` | `#22f187` |
| brand-soft | `#e8fcf2` | `#123028` |
| brand-strong | `#12c46a` | `#4dffab` |
| brand-foreground | `#103344` | `#0a1419` |
| success | `#16a34a` | `#4ade80` |
| radius | `0.875rem` | same |

## Roles

- **Primary (`#103344`)** — chrome, headers, dark shells, primary operate buttons (light mode)
- **Brand / secondary green (`#22f187`)** — bold marketing fills, accents, success-adjacent CTAs
- **White ground + black text** — default reading surface

## Type

- UI / body: Geist
- Display / headlines / amounts: Bricolage Grotesque (extrabold, tracking ≈ `-0.035em`)
- Data / stats pills: Geist Mono

## Signature motifs

- Green marker highlight (`.hl`) — gradient band under emphasized words
- Pill segmented controls (primary or secondary track + green active chip)
- Brand CTA (`.btn-back`) — green fill, teal label, hover ring
- Board list — white card, green rank accents
- Dot-grid wash, pulsing live-dot
- Primary shells with green accents (trust, audience, collect, lifecycle)

## Implementation

- App-wide Operate / dashboard / public `/s`: `frontend/src/styles/themes/vercel.css` (`data-theme='vercel'`)
- Landing + AuthShell: scoped under `.lp` in `frontend/src/features/board/styles.css` (same tokens)
