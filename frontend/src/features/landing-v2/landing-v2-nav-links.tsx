'use client';

import Link from 'next/link';
import { useTranslations } from 'next-intl';
import type { LandingNavItem } from '@/features/landing-v2/landing-v2-nav';

type Props = {
  items: LandingNavItem[];
  onNavigate?: () => void;
  variant: 'header' | 'mobile' | 'footer';
};

function navLabelKey(id: LandingNavItem['id']) {
  return `nav.${id}` as const;
}

function HeaderLink({
  item,
  onNavigate,
  label
}: {
  item: LandingNavItem;
  onNavigate?: () => void;
  label: string;
}) {
  return (
    <a href={item.href} onClick={onNavigate}>
      <span className='roll'>
        <span>{label}</span>
        <span>{label}</span>
      </span>
    </a>
  );
}

export function LandingNavLinks({ items, onNavigate, variant }: Props) {
  const t = useTranslations('landing');

  if (variant === 'mobile') {
    return (
      <>
        {items.map((item) => (
          <a key={item.id} href={item.href} onClick={onNavigate}>
            {t(navLabelKey(item.id))}
          </a>
        ))}
      </>
    );
  }

  if (variant === 'footer') {
    return (
      <>
        {items.map((item) => (
          <a key={item.id} href={item.href}>
            <span className='roll'>
              <span>{t(navLabelKey(item.id))}</span>
              <span>{t(navLabelKey(item.id))}</span>
            </span>
          </a>
        ))}
        <Link href='/auth/sign-in'>
          <span className='roll'>
            <span>{t('nav.signIn')}</span>
            <span>{t('nav.signIn')}</span>
          </span>
        </Link>
      </>
    );
  }

  return (
    <>
      {items.map((item) => (
        <HeaderLink
          key={item.id}
          item={item}
          onNavigate={onNavigate}
          label={t(navLabelKey(item.id))}
        />
      ))}
    </>
  );
}