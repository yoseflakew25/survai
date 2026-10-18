import type { Metadata, Viewport } from 'next';
import { ForceLightMode } from '@/components/themes/force-light-mode';

export const metadata: Metadata = {
  robots: {
    index: false,
    follow: false
  }
};

export const viewport: Viewport = {
  themeColor: '#f7f7f2',
  colorScheme: 'light'
};

export default function PublicCollectionLayout({
  children
}: {
  children: React.ReactNode;
}) {
  return <ForceLightMode>{children}</ForceLightMode>;
}
