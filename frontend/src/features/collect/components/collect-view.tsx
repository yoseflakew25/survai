'use client';

import { useState, useCallback } from 'react';
import { useSuspenseQuery, useQueryClient } from '@tanstack/react-query';
import { surveyByIdOptions, surveyKeys } from '@/features/builder/api/queries';
import { updateCollectionSettings } from '@/features/builder/api/service';
import { collectStatsOptions } from '../api/queries';
import { notFound } from 'next/navigation';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import {
  SurvaiBrandCard,
  SurvaiPanel,
  SurvaiPanelBody,
  SurvaiPanelFooter,
  SurvaiPanelHeader,
  brandCtaClass
} from '@/components/survai-panel';
import { Icons } from '@/components/icons';
import { toast } from '@/lib/toast';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import { canEditOrg, useAuth } from '@/lib/auth-context';
import { closeSurvey, publishSurvey } from '../api/service';
import { collectStatsKeys } from '../api/queries';
import { CollectionQr } from './collection-qr';
import { useSurveyActivity } from '@/features/surveys/components/survey-activity-provider';
import { AuthQueryBoundary } from '@/components/layout/auth-query-boundary';
import { SurveyActivityFallback } from '@/features/surveys/components/survey-activity-fallback';
import { useLocale, useTranslations } from 'next-intl';

interface CollectViewProps {
  surveyId: string;
}

function toDatetimeLocalValue(iso: string | null): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function CollectView({ surveyId }: CollectViewProps) {
  return (
    <AuthQueryBoundary
      fallback={<SurveyActivityFallback activity='fetch-collect' />}
    >
      <CollectViewContent surveyId={surveyId} />
    </AuthQueryBoundary>
  );
}

function CollectViewContent({ surveyId }: CollectViewProps) {
  const { data: survey } = useSuspenseQuery(surveyByIdOptions(surveyId));
  const { data: stats } = useSuspenseQuery(collectStatsOptions(surveyId));
  const queryClient = useQueryClient();
  const { run, activeId } = useSurveyActivity();
  const { user } = useAuth();
  const canEdit = canEditOrg(user?.role);
  const t = useTranslations('collect');
  const tCommon = useTranslations('common');
  const locale = useLocale();

  const isPublishing = activeId === 'publish-survey';
  const [isClosing, setIsClosing] = useState(false);
  const [copied, setCopied] = useState(false);
  const [quotaDraft, setQuotaDraft] = useState(
    () => (survey?.responseQuota != null ? String(survey.responseQuota) : '')
  );
  const [closesAtDraft, setClosesAtDraft] = useState(() =>
    toDatetimeLocalValue(survey?.closesAt ?? null)
  );
  const [savingSettings, setSavingSettings] = useState(false);

  if (!survey) {
    notFound();
  }

  const isPublished = survey.status === 'published';
  const isClosed = survey.status === 'closed';
  const isLive = isPublished || isClosed;
  const hasLiveForm = Boolean(
    stats.currentVersionId ?? survey.currentVersionId
  );
  // Canonical share link is always the survey id (resolves to current version).
  const collectionPath =
    stats.collectionPath ??
    (hasLiveForm ? `/s/${surveyId}` : null);
  const collectionUrl =
    collectionPath && typeof window !== 'undefined'
      ? `${window.location.origin}${collectionPath}`
      : collectionPath
        ? collectionPath
        : '';

  const handlePublish = useCallback(async () => {
    if (isPublishing) return;
    try {
      const result = await run('publish-survey', async () => {
        const published = await publishSurvey(surveyId);
        await queryClient.invalidateQueries({
          queryKey: surveyKeys.detail(surveyId)
        });
        await queryClient.invalidateQueries({
          queryKey: collectStatsKeys.stats(surveyId)
        });
        return published;
      });
      toast.success(t('publishedToast'), {
        description: t('publishedDesc', { path: result.collectionPath })
      });
    } catch (err) {
      toast.error(t('publishFailed'), {
        description:
          err instanceof Error && err.message
            ? err.message
            : t('publishFailedDesc')
      });
    }
  }, [surveyId, queryClient, isPublishing, run, t]);

  const handleClose = useCallback(async () => {
    if (isClosing || !isPublished) return;
    setIsClosing(true);
    try {
      await closeSurvey(surveyId);
      await queryClient.invalidateQueries({
        queryKey: surveyKeys.detail(surveyId)
      });
      await queryClient.invalidateQueries({
        queryKey: collectStatsKeys.stats(surveyId)
      });
      toast.success(t('closedToast'), {
        description: t('closedDesc')
      });
    } catch (err) {
      toast.error(t('closeFailed'), {
        description:
          err instanceof Error && err.message
            ? err.message
            : t('closeFailedDesc')
      });
    } finally {
      setIsClosing(false);
    }
  }, [surveyId, queryClient, isClosing, isPublished, t]);

  const handleCopyLink = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(collectionUrl);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
      toast.success(t('linkCopied'), {
        description: t('linkCopiedDesc')
      });
    } catch {
      toast.error(t('copyFailed'), {
        description: t('copyFailedDesc')
      });
    }
  }, [collectionUrl, t]);

  const handleSaveSettings = useCallback(async () => {
    if (!canEdit || savingSettings) return;
    setSavingSettings(true);
    try {
      const trimmed = quotaDraft.trim();
      const quota =
        trimmed === ''
          ? null
          : Number.parseInt(trimmed, 10);
      if (trimmed !== '' && (!Number.isFinite(quota) || quota! < 1)) {
        toast.error(t('invalidQuota'), {
          description: t('invalidQuotaDesc')
        });
        return;
      }
      const closesAt =
        closesAtDraft.trim() === ''
          ? null
          : new Date(closesAtDraft).toISOString();
      if (closesAtDraft.trim() && Number.isNaN(new Date(closesAtDraft).getTime())) {
        toast.error(t('invalidCloseDate'));
        return;
      }
      await updateCollectionSettings(surveyId, {
        responseQuota: quota,
        closesAt
      });
      await queryClient.invalidateQueries({
        queryKey: surveyKeys.detail(surveyId)
      });
      await queryClient.invalidateQueries({
        queryKey: collectStatsKeys.stats(surveyId)
      });
      toast.success(t('settingsSaved'));
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : t('settingsSaveFailed')
      );
    } finally {
      setSavingSettings(false);
    }
  }, [
    canEdit,
    savingSettings,
    quotaDraft,
    closesAtDraft,
    surveyId,
    queryClient,
    t
  ]);

  const handlePrintShareSheet = useCallback(() => {
    if (!collectionUrl) return;
    const printWindow = window.open('', '_blank', 'noopener,noreferrer');
    if (!printWindow) {
      toast.error(t('popupBlocked'), {
        description: t('popupBlockedDesc')
      });
      return;
    }
    const qrSrc = `https://api.qrserver.com/v1/create-qr-code/?size=320x320&margin=12&ecc=M&data=${encodeURIComponent(collectionUrl)}`;
    const shareSuffix = t('printShareSuffix');
    const qrAlt = t('qrCodeAlt');
    printWindow.document.write(`<!doctype html><html><head><title>${survey.title} — ${shareSuffix}</title>
<style>
  body{font-family:system-ui,sans-serif;padding:2rem;text-align:center;color:#111}
  h1{font-size:1.5rem;margin:0 0 .5rem}
  p{font-size:.95rem;word-break:break-all;margin:.75rem 0 1.5rem}
  img{width:220px;height:220px}
  @media print{body{padding:0}}
</style></head><body>
<h1>${survey.title.replace(/</g, '&lt;')}</h1>
<p>${collectionUrl.replace(/</g, '&lt;')}</p>
<img src="${qrSrc}" alt="${qrAlt}" />
<script>window.onload=()=>{window.print();}</script>
</body></html>`);
    printWindow.document.close();
  }, [collectionUrl, survey.title, t]);

  const responseQuota = stats.responseQuota ?? survey.responseQuota;
  const quotaLabel =
    responseQuota != null
      ? t('quotaProgress', {
          count: stats.responseCount,
          quota: responseQuota
        })
      : t('responseCount', { count: stats.responseCount });

  return (
    <div className='space-y-4'>
      <div className='grid gap-6 lg:grid-cols-3'>
        <div className='space-y-6 lg:col-span-2'>
          <SurvaiPanel>
            <SurvaiPanelHeader
              tone='brand'
              title={
                <div className='min-w-0'>
                  <h3 className='font-display text-2xl font-extrabold tracking-tight text-brand-foreground sm:text-2xl'>
                    {t('heading')}
                  </h3>
                  <p className='text-sm leading-snug text-brand-foreground/70'>
                    {isLive ? t('linkAndQr') : t('publishToUnlock')}
                  </p>
                </div>
              }
              badge={
                <Badge
                  className={cn(
                    'rounded-full border border-[color-mix(in_srgb,var(--brand-foreground)_22%,transparent)] bg-[color-mix(in_srgb,var(--brand-foreground)_10%,transparent)] text-[10px] font-semibold text-brand-foreground',
                    isPublished &&
                      'border-transparent bg-[var(--brand-foreground)] text-brand'
                  )}
                >
                  {isPublished ? t('live') : isClosed ? t('closed') : t('notPublished')}
                </Badge>
              }
            />
            <SurvaiPanelBody className='space-y-5'>
              {(responseQuota != null || stats.closesAt || survey.closesAt) && (
                <div className='rounded-xl border border-border bg-muted/20 px-3.5 py-3 text-sm'>
                  <p className='font-semibold tabular-nums'>{quotaLabel}</p>
                  {(stats.closesAt || survey.closesAt) && (
                    <p className='text-muted-foreground  text-xs'>
                      {t('closesOn', {
                        date: new Date(
                          stats.closesAt ?? survey.closesAt!
                        ).toLocaleString(locale === 'am' ? 'am-ET' : undefined)
                      })}
                    </p>
                  )}
                </div>
              )}

              {!isLive ? (
                <div className='space-y-4'>
                  <div className='rounded-2xl border border-dashed border-border bg-muted/20 px-6 py-10 text-center'>
                    <div className='mx-auto mb-3 flex size-12 items-center justify-center rounded-xl border border-border bg-muted text-muted-foreground'>
                      <Icons.collect className='size-5' />
                    </div>
                    <p className='mb-1 text-sm font-semibold tracking-tight'>
                      {t('readyTitle')}
                    </p>
                    <p className='text-muted-foreground mx-auto max-w-sm text-xs leading-relaxed'>
                      {t('readyHint')}
                    </p>
                  </div>
                  {canEdit ? (
                    <Button
                      onClick={() => void handlePublish()}
                      disabled={isPublishing}
                      size='lg'
                      className={cn(brandCtaClass, 'h-11 w-full')}
                    >
                      {isPublishing ? (
                        <>
                          <Icons.spinner className='mr-2 size-4 animate-spin' />
                          {t('publishing')}
                        </>
                      ) : (
                        <>
                          <Icons.sparkles className='mr-2 size-4' />
                          {t('publishCta')}
                        </>
                      )}
                    </Button>
                  ) : (
                    <p className='text-muted-foreground text-center text-xs'>
                      {t('viewersCannotPublish')}
                    </p>
                  )}
                </div>
              ) : (
                <>
                  <div
                    className={cn(
                      'flex items-start gap-3 rounded-xl border p-3.5',
                      isPublished
                        ? 'border-border bg-muted/40'
                        : 'border-border bg-muted/40'
                    )}
                  >
                    <span
                      className={cn(
                        ' flex size-8 shrink-0 items-center justify-center rounded-lg',
                        isPublished
                          ? 'border border-border bg-foreground text-background'
                          : 'border border-border bg-card text-muted-foreground'
                      )}
                    >
                      <Icons.circleCheck className='size-4' />
                    </span>
                    <div className='min-w-0 flex-1'>
                      <p className='text-sm font-semibold tracking-tight text-foreground'>
                        {isPublished ? t('surveyIsLive') : t('surveyIsClosed')}
                      </p>
                      <p className='text-muted-foreground  text-xs leading-relaxed'>
                        {isPublished ? t('shareHint') : t('closedHint')}
                      </p>
                    </div>
                  </div>

                  {collectionUrl ? (
                    <div className='space-y-2'>
                      <label
                        htmlFor='collection-link'
                        className='text-[11px] font-semibold tracking-wide text-muted-foreground uppercase'
                      >
                        {t('collectionLink')}
                      </label>
                      <div className='flex flex-col gap-2 sm:flex-row'>
                        <Input
                          id='collection-link'
                          value={collectionUrl}
                          readOnly
                          className='h-11 rounded-xl border-border bg-muted/20 font-mono text-xs sm:text-sm'
                        />
                        <Button
                          type='button'
                          onClick={() => void handleCopyLink()}
                          disabled={!collectionUrl}
                          className={cn(
                            'h-11 shrink-0 rounded-xl font-semibold sm:min-w-[7.5rem]',
                            copied
                              ? 'border border-border bg-foreground text-background hover:bg-foreground/90'
                              : 'border border-border bg-card text-foreground hover:bg-muted/50'
                          )}
                        >
                          {copied ? (
                            <>
                              <Icons.check className='mr-1.5 size-4' />
                              {tCommon('copied')}
                            </>
                          ) : (
                            <>
                              <Icons.share className='mr-1.5 size-4' />
                              {tCommon('copy')}
                            </>
                          )}
                        </Button>
                      </div>
                    </div>
                  ) : null}

                  {collectionUrl ? (
                    <>
                      <div className='border-border border-t border-dashed' />
                      <div className='space-y-2'>
                        <div className='flex flex-wrap items-center justify-between gap-2'>
                          <p className='text-[11px] font-semibold tracking-wide text-muted-foreground uppercase'>
                            {t('sharePack')}
                          </p>
                          <Button
                            type='button'
                            variant='outline'
                            size='sm'
                            className='h-8 rounded-lg text-xs'
                            onClick={handlePrintShareSheet}
                          >
                            <Icons.page className='mr-1.5 size-3.5' />
                            {t('printShareSheet')}
                          </Button>
                        </div>
                        <CollectionQr url={collectionUrl} />
                      </div>
                    </>
                  ) : null}
                </>
              )}
            </SurvaiPanelBody>

            {isPublished ? (
              <SurvaiPanelFooter>
                <p className='text-muted-foreground text-xs leading-relaxed'>
                  {t('lockedHint')}
                </p>
              </SurvaiPanelFooter>
            ) : null}
          </SurvaiPanel>

          {canEdit ? (
            <SurvaiPanel>
              <SurvaiPanelHeader
                title={t('settingsTitle')}
                subtitle={t('settingsSubtitle')}
              />
              <SurvaiPanelBody className='space-y-4'>
                <div className='space-y-1.5'>
                  <Label htmlFor='response-quota'>{t('quota')}</Label>
                  <Input
                    id='response-quota'
                    type='number'
                    min={1}
                    inputMode='numeric'
                    placeholder={tCommon('unlimited')}
                    value={quotaDraft}
                    onChange={(e) => setQuotaDraft(e.target.value)}
                    className='h-10 rounded-xl'
                  />
                </div>
                <div className='space-y-1.5'>
                  <Label htmlFor='closes-at'>{t('closeDateTime')}</Label>
                  <Input
                    id='closes-at'
                    type='datetime-local'
                    value={closesAtDraft}
                    onChange={(e) => setClosesAtDraft(e.target.value)}
                    className='h-10 rounded-xl'
                  />
                </div>
                <Button
                  type='button'
                  onClick={() => void handleSaveSettings()}
                  disabled={savingSettings}
                  className='h-10 w-full rounded-xl'
                >
                  {savingSettings ? (
                    <Icons.spinner className='mr-2 size-4 animate-spin' />
                  ) : null}
                  {t('saveSettings')}
                </Button>
              </SurvaiPanelBody>
            </SurvaiPanel>
          ) : null}
        </div>

        <div className='sticky top-[4.5rem] self-start space-y-6'>
          <SurvaiBrandCard
            title={t('viewResults')}
            description={
              isLive
                ? t('collectingResponses', { quota: quotaLabel })
                : t('publishToStart')
            }
          >
            <Link
              href={`/dashboard/surveys/${surveyId}/respondents`}
              className={cn(
                'block w-full',
                !isLive && 'pointer-events-none opacity-50'
              )}
            >
              <Button
                className='h-11 w-full rounded-xl border border-foreground/15 bg-foreground font-semibold text-background hover:bg-foreground/90'
                size='lg'
                disabled={!isLive}
              >
                {t('viewRespondents')}
                <Icons.arrowRight className='ml-2 size-4' />
              </Button>
            </Link>
          </SurvaiBrandCard>

          <Separator />

          <SurvaiPanel>
            <SurvaiPanelBody className='flex flex-col gap-2'>
              {collectionPath ? (
                <a
                  href={collectionPath}
                  target='_blank'
                  rel='noopener noreferrer'
                  className='block'
                >
                  <Button className='h-auto w-full justify-start rounded-xl px-3 py-2.5 text-sm'>
                    <Icons.openInNew className='mr-2 size-3.5' />
                    {t('previewSurvey')}
                  </Button>
                </a>
              ) : null}
              {isPublished && canEdit ? (
                <Button
                  variant='outline'
                  className='w-full justify-start rounded-xl text-destructive hover:text-destructive'
                  onClick={() => void handleClose()}
                  disabled={isClosing}
                >
                  {isClosing ? (
                    <Icons.spinner className='mr-2 size-4 animate-spin' />
                  ) : (
                    <Icons.close className='mr-2 size-4' />
                  )}
                  {t('closeSurvey')}
                </Button>
              ) : null}
            </SurvaiPanelBody>
          </SurvaiPanel>
        </div>
      </div>
    </div>
  );
}
