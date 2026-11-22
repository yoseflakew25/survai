import Providers from '@/components/layout/providers';
import { Toaster } from '@/components/ui/toaster';
import { fontVariables } from '@/components/themes/font.config';
import { DEFAULT_THEME, THEMES } from '@/components/themes/theme.config';
import ThemeProvider from '@/components/themes/theme-provider';
import { THEME_BOOTSTRAP_SCRIPT } from '@/components/themes/theme-bootstrap';
import type { Metadata, Viewport } from 'next';
import { NextIntlClientProvider } from 'next-intl';
import { getLocale, getMessages } from 'next-intl/server';
import { cookies } from 'next/headers';
import Script from 'next/script';
import NextTopLoader from 'nextjs-toploader';
import { NuqsAdapter } from 'nuqs/adapters/next/app';
import '../styles/globals.css';

const META_THEME_COLORS = {
  light: '#ffffff',
  dark: '#232323'
};

export const metadata: Metadata = {
  ...(process.env.NEXT_PUBLIC_APP_URL
    ? { metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL) }
    : {}),
  title: {
    default: 'Survai',
    template: '%s | Survai'
  },
  description:
    'Design smarter surveys. Generate better insights. Make better decisions — from research goal to actionable report.',
  openGraph: {
    title: 'Survai',
    description:
      'Design smarter surveys. Generate better insights. Make better decisions — from research goal to actionable report.',
    siteName: 'Survai',
    type: 'website'
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Survai',
    description:
      'Design smarter surveys. Generate better insights. Make better decisions — from research goal to actionable report.'
  }
};

export const viewport: Viewport = {
  themeColor: META_THEME_COLORS.light
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const cookieStore = await cookies();
  const activeThemeValue = cookieStore.get('active_theme')?.value;
  const isValidTheme = THEMES.some((t) => t.value === activeThemeValue);
  const themeToApply = isValidTheme ? activeThemeValue! : DEFAULT_THEME;
  const locale = await getLocale();
  const messages = await getMessages();

  return (
    <html
      lang={locale}
      suppressHydrationWarning
      data-theme={themeToApply}
      data-locale={locale}
      className={fontVariables}
    >
      <body className='app-v2-root bg-background overflow-x-hidden overscroll-none font-sans antialiased'>
        <Script
          id='theme-bootstrap'
          strategy='beforeInteractive'
          dangerouslySetInnerHTML={{ __html: THEME_BOOTSTRAP_SCRIPT }}
        />
        <NextTopLoader color='var(--primary)' showSpinner={false} />
        <NextIntlClientProvider locale={locale} messages={messages}>
          <NuqsAdapter>
            <ThemeProvider defaultTheme='light' enableSystem>
              <Providers activeThemeValue={themeToApply}>
                <Toaster />
                {children}
              </Providers>
            </ThemeProvider>
          </NuqsAdapter>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
