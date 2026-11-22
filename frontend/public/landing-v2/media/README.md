# Hero media (landing)

Two **different** assets for the hero grid:

| Slot | Default file | Env |
|------|----------------|-----|
| Top right | `hero-top.svg` | `NEXT_PUBLIC_LANDING_HERO_TOP`, `NEXT_PUBLIC_LANDING_HERO_TOP_KIND` (`image` \| `video`) |
| Bottom left | `hero-bottom.svg` | `NEXT_PUBLIC_LANDING_HERO_BOTTOM`, `NEXT_PUBLIC_LANDING_HERO_BOTTOM_KIND` |

Replace the SVGs with `.webp`, `.jpg`, `.webm`, or `.mp4`. For video, set `*_KIND=video` and put files under `videos/` (see `videos/README.md`).

If a file fails to load, that cell falls back to halftone (bottom cell uses the “big” pattern).