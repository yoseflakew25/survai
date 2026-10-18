# Design system — Launchpot-derived world

Pinned visual authority: [launchpot.space/board](https://launchpot.space/board). First surface: `/` board landing (`frontend/src/features/board/`).

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
| brand | `#c6f432` | `#c6f432` |
| brand-soft | `#f1fccf` | `#232b0f` |
| brand-strong | `#3d7a00` | `#c6f432` |
| gold | `#f5b300` | `#ffc53d` |
| radius | `0.875rem` | same |

## Type

- UI / body: Geist
- Display / headlines / amounts: Bricolage Grotesque (extrabold, tracking ≈ `-0.035em`)
- Data / stats pills: Geist Mono

## Signature motifs

- Lime marker highlight (`.hl`) — gradient band under emphasized words
- Pill segmented controls (secondary track + white active chip + soft shadow)
- Brand CTA (`.btn-back`) — lime fill, 1px mixed border, hover ring
- Board list — white card `1.125rem` radius, gold `#1` rank badge, hover Back reveal
- Dot-grid hero wash, pulsing live-dot

## Implementation

Scoped under `.lp` in `frontend/src/features/board/styles.css` so `/dashboard/*` stays on the Vercel theme until the system is rolled through the app.
