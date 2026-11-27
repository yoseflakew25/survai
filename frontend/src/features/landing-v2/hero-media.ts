export type HeroMediaKind = 'image' | 'video';

/** Top-right hero cell — product demo played inside the laptop screen. */
export const heroMediaTop = {
  kind: 'image' as HeroMediaKind,
  srcs: [process.env.NEXT_PUBLIC_LANDING_HERO_TOP ?? '/landing-v2/media/hero-demo.gif'],
  /** Halftone fallback when media fails (top = standard scene). */
  toneBig: false as const
};

/** @deprecated Use heroMediaTop — kept for env paths that still point at webm. */
export const heroVideoTopRight =
  process.env.NEXT_PUBLIC_LANDING_HERO_VIDEO_TOP ??
  '/landing-v2/videos/hero-workspace.webm';

/** @deprecated Use heroMediaBottom */
export const heroVideoBottomLeft =
  process.env.NEXT_PUBLIC_LANDING_HERO_VIDEO_BOTTOM ??
  '/landing-v2/videos/hero-lifecycle.webm';
