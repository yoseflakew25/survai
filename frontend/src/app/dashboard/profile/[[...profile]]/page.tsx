import { Suspense } from 'react';
import ProfileViewPage from '@/features/profile/components/profile-view-page';

export const metadata = {
  title: 'Dashboard : Account'
};

export default async function Page() {
  return (
    <Suspense fallback={null}>
      <ProfileViewPage />
    </Suspense>
  );
}
