'use client';

import { usePathname } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useMemo } from 'react';

type BreadcrumbItem = {
  title: string;
  link: string;
};

/** Path segment → `nav` message key (falls back to title-case segment). */
const SEGMENT_KEYS: Record<string, string> = {
  dashboard: 'dashboard',
  overview: 'overview',
  surveys: 'surveys',
  plans: 'plans',
  assistant: 'assistant',
  profile: 'account',
  settings: 'account',
  security: 'security',
  account: 'account',
  collect: 'collect',
  respondents: 'respondents',
  analytics: 'analytics',
  report: 'report',
  review: 'review',
  billing: 'billing',
  team: 'team',
  new: 'new',
  edit: 'edit',
  notifications: 'notifications'
};

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function useBreadcrumbs() {
  const pathname = usePathname();
  const t = useTranslations('nav');

  const breadcrumbs = useMemo(() => {
    const labelFor = (segment: string): string => {
      if (UUID_RE.test(segment) || /^\d+$/.test(segment)) {
        return segment.length > 8 ? `${segment.slice(0, 8)}…` : segment;
      }
      const key = SEGMENT_KEYS[segment];
      if (key) {
        try {
          return t(key as 'dashboard');
        } catch {
          /* fall through */
        }
      }
      return segment.charAt(0).toUpperCase() + segment.slice(1);
    };

    const segments = pathname.split('/').filter(Boolean);
    return segments.map((segment, index) => {
      const path = `/${segments.slice(0, index + 1).join('/')}`;
      return {
        title: labelFor(segment),
        link: path
      } satisfies BreadcrumbItem;
    });
  }, [pathname, t]);

  return breadcrumbs;
}
