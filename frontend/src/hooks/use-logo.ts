'use client';

import { useTheme } from '@/components/themes/theme-provider';
import { useClientMounted } from '@/hooks/use-client-mounted';

export function useLogo(collapsed: boolean = false) {
  const { resolvedTheme } = useTheme();
  const mounted = useClientMounted();

  const isDark = mounted && resolvedTheme === 'dark';

  const logo = collapsed
    ? isDark
      ? '/images/logo/logo-icon-only-dark-mode.svg'
      : '/images/logo/logo-icon-only-light-mode.svg'
    : isDark
      ? '/images/logo/logo-full-dark-mode.svg'
      : '/images/logo/logo-full-light-mode.svg';

  const alt = 'Survai';

  return { logo, alt, isDark };
}
