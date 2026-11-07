import { Suspense } from 'react';
import SecurityViewPage from '@/features/profile/components/security-view-page';

export const metadata = {
  title: 'Dashboard : Security'
};

export default async function Page() {
  return (
    <Suspense fallback={null}>
      <SecurityViewPage />
    </Suspense>
  );
}
