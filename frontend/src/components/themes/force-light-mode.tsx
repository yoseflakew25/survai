'use client';

import { useLayoutEffect, type ReactNode } from 'react';

/**
 * Public collection pages always render in light mode so respondents
 * don't inherit the author's dashboard theme preference.
 */
export function ForceLightMode({ children }: { children: ReactNode }) {
  useLayoutEffect(() => {
    const root = document.documentElement;
    const hadDark = root.classList.contains('dark');
    const previousScheme = root.style.colorScheme;

    const applyLight = () => {
      root.classList.remove('dark');
      root.classList.add('light');
      root.style.colorScheme = 'light';
    };

    applyLight();

    // next-themes may re-apply `.dark` from system/storage — keep light pinned.
    const observer = new MutationObserver(() => {
      if (root.classList.contains('dark')) {
        applyLight();
      }
    });
    observer.observe(root, { attributes: true, attributeFilter: ['class'] });

    return () => {
      observer.disconnect();
      root.classList.remove('light');
      if (hadDark) {
        root.classList.add('dark');
      }
      root.style.colorScheme = previousScheme;
    };
  }, []);

  return <>{children}</>;
}
