export type HeroMediaKind = 'image' | 'video';

function kindFromEnv(value: string | undefined, fallback: HeroMediaKind): HeroMediaKind {
  return value === 'video' || value === 'image' ? value : fallback;
}

/** Top-right hero cell — defaults to image until you add clips under `public/landing-v2/`. */
export const heroMediaTop = {
  kind: kindFromEnv(process.env.NEXT_PUBLIC_LANDING_HERO_TOP_KIND, 'image'),
  src:
    process.env.NEXT_PUBLIC_LANDING_HERO_TOP ??
    '/landing-v2/media/hero-top.svg',
  /** Halftone fallback when media fails (top = standard scene). */
  toneBig: false as const
};

/** Bottom-left hero cell. */
export const heroMediaBottom = {
  kind: kindFromEnv(process.env.NEXT_PUBLIC_LANDING_HERO_BOTTOM_KIND, 'image'),
  src:
    process.env.NEXT_PUBLIC_LANDING_HERO_BOTTOM ??
    '/landing-v2/media/hero-bottom.svg',
  toneBig: true as const
};

/** @deprecated Use heroMediaTop — kept for env paths that still point at webm. */
export const heroVideoTopRight =
  process.env.NEXT_PUBLIC_LANDING_HERO_VIDEO_TOP ??
  '/landing-v2/videos/hero-workspace.webm';

/** @deprecated Use heroMediaBottom */
export const heroVideoBottomLeft =
  process.env.NEXT_PUBLIC_LANDING_HERO_VIDEO_BOTTOM ??
  '/landing-v2/videos/hero-lifecycle.webm';