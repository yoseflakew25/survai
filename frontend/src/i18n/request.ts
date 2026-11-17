import { cookies } from 'next/headers';
import { getRequestConfig } from 'next-intl/server';

import { LOCALE_COOKIE, defaultLocale, resolveLocale } from './config';

export default getRequestConfig(async () => {
  const store = await cookies();
  const locale = resolveLocale(store.get(LOCALE_COOKIE)?.value ?? defaultLocale);

  return {
    locale,
    messages: (await import(`../../messages/${locale}.json`)).default
  };
});
