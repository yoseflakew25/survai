'use client';

import { navGroups } from '@/config/nav-config';
import {
  KBarAnimator,
  KBarPortal,
  KBarPositioner,
  KBarProvider,
  KBarSearch
} from 'kbar';
import { Kbd } from '@/components/ui/kbd';
import { useRouter } from 'next/navigation';
import { useMemo } from 'react';
import { useTranslations } from 'next-intl';
import RenderResults from './render-result';
import useThemeSwitching from './use-theme-switching';
import { useFilteredNavGroups } from '@/hooks/use-nav';

export default function KBar({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const filteredGroups = useFilteredNavGroups(navGroups);
  const tNav = useTranslations('nav');
  const tKbar = useTranslations('kbar');

  const actions = useMemo(() => {
    const navigateTo = (url: string) => {
      router.push(url);
    };

    const allItems = filteredGroups.flatMap((group) => group.items);

    return allItems.flatMap((navItem) => {
      const title = tNav(navItem.title as 'dashboard');
      const baseAction =
        navItem.url !== '#'
          ? {
              id: `${navItem.title.toLowerCase()}Action`,
              name: title,
              shortcut: navItem.shortcut,
              keywords: `${navItem.title} ${title}`.toLowerCase(),
              section: tKbar('navigation'),
              subtitle: tKbar('goTo', { page: title }),
              perform: () => navigateTo(navItem.url)
            }
          : null;

      const childActions =
        navItem.items?.map((childItem) => {
          const childTitle = tNav(childItem.title as 'dashboard');
          return {
            id: `${childItem.title.toLowerCase()}Action`,
            name: childTitle,
            shortcut: childItem.shortcut,
            keywords: `${childItem.title} ${childTitle}`.toLowerCase(),
            section: title,
            subtitle: tKbar('goTo', { page: childTitle }),
            perform: () => navigateTo(childItem.url)
          };
        }) ?? [];

      return baseAction ? [baseAction, ...childActions] : childActions;
    });
  }, [router, filteredGroups, tNav, tKbar]);

  return (
    <KBarProvider actions={actions}>
      <KBarComponent>{children}</KBarComponent>
    </KBarProvider>
  );
}

const KBarComponent = ({ children }: { children: React.ReactNode }) => {
  useThemeSwitching();
  const t = useTranslations('kbar');
  const tCommon = useTranslations('common');

  return (
    <>
      <KBarPortal>
        <KBarPositioner className='bg-black/10 supports-backdrop-filter:backdrop-blur-xs fixed inset-0 z-99999 flex items-start! justify-center p-4! pt-[14vh]!'>
          <KBarAnimator className='bg-popover text-popover-foreground ring-foreground/10 relative mx-auto w-full max-w-[600px] overflow-hidden rounded-xl shadow-lg ring-1'>
            <div className='bg-popover sticky top-0 z-10 border-b'>
              <KBarSearch
                defaultPlaceholder={tCommon('searchEllipsis')}
                className='placeholder:text-muted-foreground w-full border-none bg-transparent px-4 py-3.5 text-sm outline-hidden focus:ring-0 focus:outline-hidden'
              />
            </div>
            <div className='h-[400px]'>
              <RenderResults />
            </div>
            <div className='text-muted-foreground flex items-center gap-3 border-t px-3 py-2 text-xs'>
              <span className='flex items-center gap-1'>
                <Kbd>↑</Kbd>
                <Kbd>↓</Kbd> {t('navigate')}
              </span>
              <span className='flex items-center gap-1'>
                <Kbd>↵</Kbd> {t('open')}
              </span>
              <span className='flex items-center gap-1'>
                <Kbd>esc</Kbd> {t('close')}
              </span>
            </div>
          </KBarAnimator>
        </KBarPositioner>
      </KBarPortal>
      {children}
    </>
  );
};
