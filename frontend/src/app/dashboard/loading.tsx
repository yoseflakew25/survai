import { getTranslations } from 'next-intl/server';

import { SurvaiLoadingScreen } from '@/components/hippie-loading-screen';

export default async function Loading() {
  const t = await getTranslations('common');
  return <SurvaiLoadingScreen message={t('loadingWorkspace')} />;
}