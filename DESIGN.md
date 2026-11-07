# Design system — Survai (Claude-inspired orange)

Layout motifs originally from Launchpot board density; brand accent is Claude-like coral orange.

## Palette

| Token | Light | Dark |
| --- | --- | --- |
| background | `#f7f7f2` | `#0d0e0b` |
| foreground | `#111210` | `#f4f5ef` |
| card | `#ffffff` | `#171814` |
| secondary | `#efefe8` | `#24261f` |
| muted | `#f1f1eb` | `#1c1d18` |
| muted-foreground | `#62655e` | `#a3a69b` |
| border | `#e6e6de` | `#2a2c24` |
| brand / primary | `#d97757` | `#d97757` |
| brand-soft | `#fceedf` | `#2a1a14` |
| brand-strong | `#9a4b2e` | `#e89272` |
| brand-foreground | `#fffaf7` | `#fffaf7` |
| gold | `#f5b300` | `#ffc53d` |
| success | `#16a34a` | `#4ade80` |
| radius | `0.875rem` | same |

## Type

- UI / body: Geist
- Display / headlines / amounts: Bricolage Grotesque (extrabold, tracking ≈ `-0.035em`)
- Data / stats pills: Geist Mono

## Signature motifs

- Orange marker highlight (`.hl`) — gradient band under emphasized words
- Pill segmented controls (secondary track + white active chip + soft shadow)
- Brand CTA (`.btn-back`) — orange fill, 1px mixed border, hover ring
- Board list — white card `1.125rem` radius, gold `#1` rank badge, hover Back reveal
- Dot-grid hero wash, pulsing live-dot

## Implementation

- Dashboard / Operate: `frontend/src/styles/themes/vercel.css` (`data-theme='vercel'`)
- Landing board: scoped under `.lp` in `frontend/src/features/board/styles.css`
