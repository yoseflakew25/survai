import type {
  ActivityStage,
  SurveyActivityId,
  SurveyActivityScript
} from '@/features/surveys/lib/activity-scripts';

type Translate = ((
  key: string,
  values?: Record<string, string | number>
) => string) & {
  has?: (key: string) => boolean;
};

const FETCH_DETAIL_BY_STAGE: Record<string, string> = {
  connect: 'shared.connectDetail',
  load: 'shared.loadDetail',
  assemble: 'shared.assembleDetail',
  ready: 'shared.readyDetail'
};

/**
 * Overlay next-intl `activity` catalog strings onto a timing script.
 * Stage progress / afterMs stay from the English script definition.
 */
export function localizeActivityScript(
  id: SurveyActivityId,
  script: SurveyActivityScript,
  t: Translate
): SurveyActivityScript {
  const prefix = id;
  const stages: ActivityStage[] = script.stages.map((stage) => {
    const label = t(`${prefix}.stages.${stage.id}.label`);
    const fetchDetailKey = FETCH_DETAIL_BY_STAGE[stage.id];
    const detail =
      fetchDetailKey && id.startsWith('fetch-')
        ? t(fetchDetailKey)
        : t(`${prefix}.stages.${stage.id}.detail`);
    return { ...stage, label, detail };
  });

  const title = t(`${prefix}.title`);
  const intro = t(`${prefix}.intro`);
  const footer = script.footer ? t(`${prefix}.footer`) : undefined;
  let previewLabel: string | undefined;
  if (script.previewLabel) {
    const key = `${prefix}.previewLabel`;
    previewLabel =
      t.has?.(key) === false ? t('shared.previewLabel') : t(key);
  }

  return {
    title,
    intro,
    footer,
    previewLabel,
    stages
  };
}

export function localizeActivityEyebrow(
  id: SurveyActivityId,
  t: Translate
): string {
  if (id.startsWith('fetch-')) {
    const page = id.replace('fetch-', '');
    return t('shared.eyebrowFetch', { page });
  }
  if (id.includes('report')) return t('shared.eyebrowReport');
  if (id.includes('review')) return t('shared.eyebrowReview');
  if (id.includes('publish')) return t('shared.eyebrowCollect');
  if (id.includes('plan')) return t('shared.eyebrowPlan');
  if (id.includes('survey')) return t('shared.eyebrowInstrument');
  return t('shared.eyebrowWorkspace');
}
