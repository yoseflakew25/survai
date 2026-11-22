export const LANDING_SECTIONS = [
  'lifecycle',
  'about',
  'trust',
  'principles',
  'collect',
  'audience',
  'faq'
] as const;

export type LandingSectionId = (typeof LANDING_SECTIONS)[number];

export type LandingNavItem = {
  id: LandingSectionId;
  href: `#${LandingSectionId}`;
};

export const LANDING_NAV: LandingNavItem[] = LANDING_SECTIONS.map((id) => ({
  id,
  href: `#${id}`
}));

/** Primary header links (wider breakpoints). Full list lives in mobile menu + footer. */
export const LANDING_HEADER_NAV: LandingSectionId[] = [
  'lifecycle',
  'about',
  'trust',
  'principles',
  'faq'
];