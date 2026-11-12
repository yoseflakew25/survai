'use client';

import Link from 'next/link';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useParams, useRouter } from 'next/navigation';
import { useEffect, useMemo, useState, type ReactNode } from 'react';

import { Icons } from '@/components/icons';
import PageContainer from '@/components/layout/page-container';
import {
  SurvaiPanel,
  SurvaiPanelBody,
  SurvaiPanelHeader
} from '@/components/survai-panel';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle
} from '@/components/ui/alert-dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import {
  adminKeys,
  adminOrgInspectQueryOptions
} from '@/features/admin/api/queries';
import {
  patchAdminOrg,
  patchOrgFeatureFlags,
  startImpersonation
} from '@/features/admin/api/service';
import type { AdminOrgInspect } from '@/features/admin/api/types';
import {
  ADMIN_FEATURE_FLAG_GROUPS,
  ADMIN_FEATURE_FLAG_LABELS
} from '@/features/admin/components/orgs/feature-flags';
import { relativeTime } from '@/features/admin/components/overview/format';
import { setApiAccessToken, setApiRefreshToken } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';
import { toast } from '@/lib/toast';
import { cn } from '@/lib/utils';

function roleLabel(role: string) {
  switch (role) {
    case 'organization':
      return 'Owner';
    case 'system_admin':
      return 'System admin';
    case 'researcher':
      return 'Researcher';
    case 'viewer':
      return 'Viewer';
    default:
      return role.replace(/_/g, ' ');
  }
}

function surveyStatusClass(status: string) {
  switch (status) {
    case 'published':
      return 'border-[color-mix(in_srgb,var(--brand)_55%,var(--border))] bg-brand-soft text-foreground';
    case 'draft':
      return 'border-border bg-muted/70 text-muted-foreground';
    case 'closed':
      return 'border-border bg-card text-foreground';
    case 'archived':
      return 'border-[color-mix(in_srgb,var(--gold)_40%,var(--border))] bg-[color-mix(in_srgb,var(--gold)_16%,var(--card))] text-foreground';
    default:
      return 'border-border bg-muted/50 text-muted-foreground';
  }
}

function OrgDetailSkeleton() {
  return (
    <div className='space-y-6'>
      <Skeleton className='h-28 w-full rounded-[1.125rem]' />
      <div className='grid gap-4 xl:grid-cols-3'>
        <Skeleton className='h-80 rounded-[1.125rem] xl:col-span-2' />
        <Skeleton className='h-80 rounded-[1.125rem]' />
      </div>
    </div>
  );
}

function MetaDot() {
  return (
    <span className='select-none text-brand-foreground/35' aria-hidden>
      ·
    </span>
  );
}

function MetaText({
  label,
  value,
  valueClassName
}: {
  label: string;
  value: string;
  valueClassName?: string;
}) {
  return (
    <span className='inline-flex items-baseline gap-1.5 whitespace-nowrap'>
      <span className='font-sans text-[10px] font-semibold tracking-wide text-brand-foreground/55 uppercase'>
        {label}
      </span>
      <span
        className={cn(
          'font-mono text-[11px] text-brand-foreground tabular-nums',
          valueClassName
        )}
      >
        {value}
      </span>
    </span>
  );
}

const brandToolbarButtonClass =
  'h-9 min-h-9 min-w-0 gap-2 rounded-xl border border-[color-mix(in_srgb,var(--brand-foreground)_22%,transparent)] bg-card px-3.5 text-sm font-semibold text-primary shadow-[0_1px_0_color-mix(in_srgb,var(--foreground)_10%,transparent)] hover:bg-[color-mix(in_srgb,var(--card)_88%,white)]';

const brandToolbarDangerClass =
  'h-9 min-h-9 min-w-0 gap-2 rounded-xl border border-[color-mix(in_srgb,var(--destructive)_45%,transparent)] bg-card px-3.5 text-sm font-semibold text-destructive shadow-[0_1px_0_color-mix(in_srgb,var(--destructive)_12%,transparent)] hover:bg-[color-mix(in_srgb,var(--destructive)_8%,var(--card))]';

function OrgSummaryBand({
  org,
  data,
  flagsOn,
  flagsTotal,
  headerActions
}: {
  org: AdminOrgInspect['organization'];
  data: AdminOrgInspect;
  flagsOn: number;
  flagsTotal: number;
  headerActions: ReactNode;
}) {
  const activeMembers = data.members.filter((m) => m.is_active).length;

  return (
    <div className='overflow-hidden rounded-[1.125rem] border border-[color-mix(in_srgb,var(--brand)_40%,var(--border))] bg-card'>
      <div className='border-b border-[color-mix(in_srgb,var(--brand)_70%,var(--foreground))] bg-brand px-3 py-3 sm:px-4'>
        <div className='flex flex-wrap items-center gap-x-2 gap-y-2 sm:gap-x-3'>
          <Link
            href='/admin/orgs'
            className='inline-flex shrink-0 items-center gap-1 text-xs font-semibold text-brand-foreground/85 transition-colors hover:text-brand-foreground'
          >
            <Icons.chevronLeft className='size-3.5' />
            Orgs
          </Link>
          <div className='flex min-w-0 flex-1 items-center gap-2'>
            
            <h1 className='font-display truncate text-base font-extrabold tracking-tight text-brand-foreground sm:text-2xl'>
              {org.name}
            </h1>
          </div>
          <div className='flex w-full flex-wrap items-center gap-1.5 sm:ml-auto sm:w-auto sm:justify-end'>
            {headerActions}
          </div>
        </div>
        <div className=' flex flex-wrap items-center gap-x-2 gap-y-1 sm:gap-x-2.5'>
          <MetaText
            label='Status'
            value={org.is_active ? 'Active' : 'Suspended'}
            valueClassName={cn(
              'font-sans text-xs font-bold tracking-wide uppercase',
              org.is_active ? 'text-brand-foreground' : 'text-destructive'
            )}
          />
          <MetaDot />
          <MetaText label='Created' value={relativeTime(org.created_at)} />
          <MetaDot />
          <MetaText label='Updated' value={relativeTime(org.updated_at)} />
          {!org.is_active && org.suspended_at ? (
            <>
              <MetaDot />
              <MetaText
                label='Suspended'
                value={relativeTime(org.suspended_at)}
                valueClassName='text-destructive'
              />
            </>
          ) : null}
          <MetaDot />
          <MetaText
            label='ID'
            value={org.id.slice(0, 8).toUpperCase()}
            valueClassName='uppercase'
          />
          {org.website ? (
            <>
              <MetaDot />
              <a
                href={
                  org.website.startsWith('http') ? org.website : `https://${org.website}`
                }
                target='_blank'
                rel='noopener noreferrer'
                className='inline-flex items-center gap-1 font-mono text-[11px] text-brand-foreground underline-offset-2 hover:underline'
              >
                {org.website.replace(/^https?:\/\//, '')}
                <Icons.externalLink className='size-3 opacity-80' />
              </a>
            </>
          ) : null}
        </div>
      </div>

      <div className='grid grid-cols-1 gap-px bg-[color-mix(in_srgb,var(--brand)_25%,var(--border))] sm:grid-cols-3'>
        {(
          [
            ['Members', `${data.members.length}`, `${activeMembers} active`],
            ['Surveys', `${data.surveys.length}`, 'In workspace'],
            ['Features on', `${flagsOn}/${flagsTotal}`, 'Kill switches']
          ] as const
        ).map(([label, value, hint]) => (
          <div key={label} className='bg-card/95 px-4 py-3 sm:px-5'>
            <p className='text-[11px] font-medium text-muted-foreground'>{label}</p>
            <p className='font-display text-2xl font-extrabold tracking-tight tabular-nums text-primary'>
              {value}
            </p>
            <p className='mt-0.5 font-mono text-[9px] uppercase tracking-wide text-muted-foreground'>
              {hint}
            </p>
          </div>
        ))}
      </div>

      {org.suspended_reason ? (
        <p className='border-t border-[color-mix(in_srgb,var(--brand)_30%,var(--border))] bg-destructive/5 px-4 py-2.5 text-sm text-destructive sm:px-5'>
          {org.suspended_reason}
        </p>
      ) : null}
      {org.description ? (
        <p className='border-t border-[color-mix(in_srgb,var(--brand)_30%,var(--border))] px-4 py-3 text-sm leading-relaxed text-muted-foreground sm:px-5'>
          {org.description}
        </p>
      ) : null}
    </div>
  );
}

function enabledFlagCount(flags: Record<string, boolean>) {
  return Object.values(flags).filter(Boolean).length;
}

export default function AdminOrgDetailPage() {
  const params = useParams<{ orgId: string }>();
  const orgId = params.orgId;
  const queryClient = useQueryClient();
  const { setUserFromApi } = useAuth();
  const router = useRouter();

  const { data, isLoading, error, refetch, isFetching } = useQuery(
    adminOrgInspectQueryOptions(orgId)
  );

  const [notesDraft, setNotesDraft] = useState<string | null>(null);
  const [suspendOpen, setSuspendOpen] = useState(false);
  const [impersonating, setImpersonating] = useState(false);

  const org = data?.organization;
  const notesValue = notesDraft ?? org?.notes ?? '';

  useEffect(() => {
    setNotesDraft(null);
  }, [org?.notes, orgId]);

  const flagsOn = org ? enabledFlagCount(org.feature_flags) : 0;
  const flagsTotal = org ? Object.keys(org.feature_flags).length : 0;

  const saveNotes = useMutation({
    mutationFn: () => patchAdminOrg(orgId, { notes: notesValue.trim() || null }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: adminKeys.orgInspect(orgId) });
      void queryClient.invalidateQueries({ queryKey: adminKeys.orgs() });
      toast.success('Admin notes saved');
      setNotesDraft(null);
    },
    onError: (err: Error) => toast.error(err.message)
  });

  const flagsMut = useMutation({
    mutationFn: (flags: Record<string, boolean>) =>
      patchOrgFeatureFlags(orgId, flags),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: adminKeys.orgInspect(orgId) });
      toast.success('Feature flags updated');
    },
    onError: (err: Error) => toast.error(err.message)
  });

  const suspendMut = useMutation({
    mutationFn: (is_active: boolean) =>
      patchAdminOrg(orgId, {
        is_active,
        suspended_reason: is_active ? null : 'Suspended by platform admin'
      }),
    onSuccess: (_data, is_active) => {
      void queryClient.invalidateQueries({ queryKey: adminKeys.orgInspect(orgId) });
      void queryClient.invalidateQueries({ queryKey: adminKeys.orgs() });
      toast.success(is_active ? 'Organization reactivated' : 'Organization suspended');
      setSuspendOpen(false);
    },
    onError: (err: Error) => toast.error(err.message)
  });

  const notesDirty = useMemo(() => {
    if (!org) return false;
    return (notesDraft ?? org.notes ?? '') !== (org.notes ?? '');
  }, [notesDraft, org]);

  async function impersonate() {
    if (!org?.is_active) return;
    setImpersonating(true);
    try {
      const result = await startImpersonation(orgId);
      setApiAccessToken(result.access_token);
      setApiRefreshToken(result.refresh_token);
      setUserFromApi({
        ...result.user,
        impersonation: true,
        impersonator_id: result.impersonator_id
      } as never);
      toast.success(`Impersonating ${result.organization_name}`);
      router.push('/dashboard/overview');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Impersonation failed');
    } finally {
      setImpersonating(false);
    }
  }

  const headerActions = (
    <>
      <Button
        type='button'
        variant='ghost'
        size='default'
        className={brandToolbarButtonClass}
        onClick={() => void refetch()}
        disabled={isFetching}
      >
        <Icons.spinner
          className={cn('size-3.5', isFetching && 'animate-spin')}
        />
        Refresh
      </Button>
      <Button
        type='button'
        variant='ghost'
        size='default'
        className={brandToolbarButtonClass}
        disabled={!org?.is_active || impersonating}
        onClick={() => void impersonate()}
      >
        {impersonating ? '…' : 'Impersonate'}
      </Button>
      {org ? (
        <Button
          type='button'
          variant='ghost'
          size='default'
          className={
            org.is_active ? brandToolbarDangerClass : brandToolbarButtonClass
          }
          disabled={suspendMut.isPending}
          onClick={() => {
            if (org.is_active) setSuspendOpen(true);
            else suspendMut.mutate(true);
          }}
        >
          {org.is_active ? 'Suspend' : 'Reactivate'}
        </Button>
      ) : null}
    </>
  );

  return (
    <PageContainer>
      {isLoading ? <OrgDetailSkeleton /> : null}

      {error ? (
        <div className='rounded-[1.125rem] border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive'>
          {error instanceof Error ? error.message : 'Failed to load organization'}
        </div>
      ) : null}

      {data && org ? (
        <div className='space-y-6'>
          <OrgSummaryBand
            org={org}
            data={data}
            flagsOn={flagsOn}
            flagsTotal={flagsTotal}
            headerActions={headerActions}
          />

          <div className='grid items-start gap-4 xl:grid-cols-3'>
            <div className='space-y-4 xl:col-span-2'>
              <MembersPanel data={data} />
              <SurveysPanel data={data} />
            </div>

            <div className='space-y-4'>
              <FeatureFlagsPanel
                flags={org.feature_flags}
                pending={flagsMut.isPending}
                onToggle={(key, enabled) => flagsMut.mutate({ [key]: enabled })}
              />
              <NotesPanel
                value={notesValue}
                onChange={setNotesDraft}
                dirty={notesDirty}
                saving={saveNotes.isPending}
                onSave={() => saveNotes.mutate()}
              />
            </div>
          </div>
        </div>
      ) : null}

      <AlertDialog open={suspendOpen} onOpenChange={setSuspendOpen}>
        <AlertDialogContent className='sm:max-w-md'>
          <AlertDialogHeader>
            <AlertDialogTitle>Suspend {org?.name}?</AlertDialogTitle>
            <AlertDialogDescription>
              Members lose access until you reactivate. Data is retained; publishing
              and collection stop for this workspace.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={suspendMut.isPending}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className='bg-destructive text-destructive-foreground hover:bg-destructive/90'
              disabled={suspendMut.isPending}
              onClick={() => suspendMut.mutate(false)}
            >
              {suspendMut.isPending ? 'Suspending…' : 'Suspend organization'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </PageContainer>
  );
}

function MembersPanel({ data }: { data: AdminOrgInspect }) {
  return (
    <SurvaiPanel className='flex flex-col'>
      <SurvaiPanelHeader
        icon={<Icons.users className='size-3.5' />}
        title='Members'
        subtitle={`${data.members.length} seat${data.members.length === 1 ? '' : 's'} in this workspace`}
      />
      <SurvaiPanelBody className='min-h-0 p-0'>
        {data.members.length === 0 ? (
          <p className='px-5 py-10 text-center text-sm text-muted-foreground'>
            No users in this organization.
          </p>
        ) : (
          <div className='scrollbar-thin scrollbar-gutter-stable max-h-72 divide-y divide-border overflow-y-auto overscroll-contain'>
            {data.members.map((m) => (
              <div
                key={m.id}
                className='flex items-start justify-between gap-3 px-4 py-3 sm:px-5'
              >
                <div className='min-w-0'>
                  <p className='text-sm font-semibold text-foreground'>{m.full_name}</p>
                  <p className='truncate text-xs text-muted-foreground'>{m.email}</p>
                </div>
                <div className='flex shrink-0 flex-col items-end gap-1'>
                  <Badge variant='outline' className='rounded-full text-[10px] uppercase'>
                    {roleLabel(m.role)}
                  </Badge>
                  {!m.is_active ? (
                    <span className='text-[10px] text-destructive'>Inactive</span>
                  ) : null}
                </div>
              </div>
            ))}
          </div>
        )}
      </SurvaiPanelBody>
    </SurvaiPanel>
  );
}

function SurveysPanel({ data }: { data: AdminOrgInspect }) {
  return (
    <SurvaiPanel className='flex flex-col'>
      <SurvaiPanelHeader
        icon={<Icons.survey className='size-3.5' />}
        title='Surveys'
        subtitle='Newest updates first · completed response counts'
      />
      <SurvaiPanelBody className='min-h-0 p-0'>
        {data.surveys.length === 0 ? (
          <p className='px-5 py-10 text-center text-sm text-muted-foreground'>
            No surveys in this workspace yet.
          </p>
        ) : (
          <ul className='scrollbar-thin scrollbar-gutter-stable max-h-80 divide-y divide-border overflow-y-auto overscroll-contain'>
            {data.surveys.map((s) => (
              <li
                key={s.id}
                className='flex flex-wrap items-center justify-between gap-2 px-4 py-3 sm:px-5'
              >
                <p className='min-w-0 flex-1 text-sm font-semibold text-foreground'>
                  {s.title}
                </p>
                <div className='flex flex-wrap items-center gap-2'>
                  <Badge
                    variant='outline'
                    className={cn(
                      'rounded-full text-[10px] capitalize',
                      surveyStatusClass(s.status)
                    )}
                  >
                    {s.status}
                  </Badge>
                  <span className='font-mono text-[10px] tabular-nums text-muted-foreground'>
                    {s.response_count} completed · {relativeTime(s.updated_at)}
                  </span>
                </div>
              </li>
            ))}
          </ul>
        )}
      </SurvaiPanelBody>
    </SurvaiPanel>
  );
}

function FeatureFlagsPanel({
  flags,
  pending,
  onToggle
}: {
  flags: Record<string, boolean>;
  pending: boolean;
  onToggle: (key: string, enabled: boolean) => void;
}) {
  return (
    <SurvaiPanel>
      <SurvaiPanelHeader
        icon={<Icons.sparkles className='size-3.5' />}
        title='Feature flags'
        subtitle='Kill switches — off disables for this org'
      />
      <SurvaiPanelBody className='space-y-5'>
        {ADMIN_FEATURE_FLAG_GROUPS.map((group) => (
          <div key={group.title}>
            <p className='mb-2 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground'>
              {group.title}
            </p>
            <ul className='space-y-2'>
              {group.keys.map((key) => {
                const enabled = flags[key] ?? true;
                return (
                  <li
                    key={key}
                    className='flex items-center justify-between gap-3 rounded-xl border border-border bg-card px-3 py-2.5'
                  >
                    <div className='min-w-0'>
                      <p className='text-sm font-medium text-foreground'>
                        {ADMIN_FEATURE_FLAG_LABELS[key] ?? key}
                      </p>
                      <p className='font-mono text-[10px] text-muted-foreground'>{key}</p>
                    </div>
                    <Switch
                      checked={enabled}
                      disabled={pending}
                      onCheckedChange={(checked) => onToggle(key, checked)}
                      aria-label={ADMIN_FEATURE_FLAG_LABELS[key] ?? key}
                    />
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </SurvaiPanelBody>
    </SurvaiPanel>
  );
}

function NotesPanel({
  value,
  onChange,
  dirty,
  saving,
  onSave
}: {
  value: string;
  onChange: (v: string) => void;
  dirty: boolean;
  saving: boolean;
  onSave: () => void;
}) {
  return (
    <SurvaiPanel>
      <SurvaiPanelHeader
        icon={<Icons.edit className='size-3.5' />}
        title='Admin notes'
        subtitle='Internal only — not visible to the org'
      />
      <SurvaiPanelBody className='space-y-3'>
        <Textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          rows={5}
          placeholder='Support context, billing notes, escalation history…'
          className='min-h-[120px] resize-y rounded-xl border-border bg-card text-sm'
        />
        <Button
          type='button'
          size='sm'
          disabled={!dirty || saving}
          onClick={onSave}
          className='w-full sm:w-auto'
        >
          {saving ? 'Saving…' : 'Save notes'}
        </Button>
      </SurvaiPanelBody>
    </SurvaiPanel>
  );
}
