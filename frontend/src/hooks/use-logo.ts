'use client';

import { useTheme } from 'next-themes';
import { useEffect, useState } from 'react';

export function useLogo(collapsed: boolean = false) {
  const { resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

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
