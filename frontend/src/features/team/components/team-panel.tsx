'use client';

import { useCallback, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';

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
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  SurvaiPanel,
  SurvaiPanelBody,
  SurvaiPanelHeader
} from '@/components/survai-panel';
import { Icons } from '@/components/icons';
import { isOrgOwner, useAuth } from '@/lib/auth-context';
import { toast } from '@/lib/toast';

import {
  createInvite,
  fetchTeam,
  removeMember,
  revokeInvite,
  type InviteRole,
  type OrgInvite,
  type OrgMember
} from '../api/service';

export function TeamPanel() {
  const tTeam = useTranslations('team');
  const tCommon = useTranslations('common');
  const { user } = useAuth();

  function roleLabel(role: string): string {
    if (role === 'organization') return tTeam('roleOwner');
    if (role === 'researcher') return tTeam('roleResearcher');
    if (role === 'viewer') return tTeam('roleViewer');
    return role;
  }
  const owner = isOrgOwner(user?.role);
  const queryClient = useQueryClient();
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<InviteRole>('researcher');
  const [sending, setSending] = useState(false);
  const [memberToRemove, setMemberToRemove] = useState<OrgMember | null>(null);
  const [removing, setRemoving] = useState(false);
  const [inviteToRevoke, setInviteToRevoke] = useState<OrgInvite | null>(null);
  const [revoking, setRevoking] = useState(false);

  const teamQuery = useQuery({
    queryKey: ['org-team'],
    queryFn: fetchTeam,
    enabled: owner
  });

  const refresh = useCallback(async () => {
    await queryClient.invalidateQueries({ queryKey: ['org-team'] });
  }, [queryClient]);

  async function confirmRemoveMember() {
    if (!memberToRemove || removing) return;
    setRemoving(true);
    try {
      await removeMember(memberToRemove.id);
      setMemberToRemove(null);
      await refresh();
      toast.success(tTeam('memberRemoved'), {
        description: tTeam('memberRemovedDesc', {
          name: memberToRemove.fullName
        })
      });
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : tTeam('couldNotRemoveMember')
      );
    } finally {
      setRemoving(false);
    }
  }

  async function confirmRevokeInvite() {
    if (!inviteToRevoke || revoking) return;
    setRevoking(true);
    try {
      await revokeInvite(inviteToRevoke.id);
      setInviteToRevoke(null);
      await refresh();
      toast.success(tTeam('inviteRevoked'), {
        description: tTeam('inviteRevokedDesc', {
          email: inviteToRevoke.email
        })
      });
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : tTeam('couldNotRevokeInvite')
      );
    } finally {
      setRevoking(false);
    }
  }

  if (!owner) {
    return (
      <SurvaiPanel>
        <SurvaiPanelHeader
          tone='brand'
          title={tTeam('title')}
          subtitle={tTeam('orgSeatsSubtitle')}
        />
        <SurvaiPanelBody>
          <p className='text-muted-foreground text-sm'>
            {tTeam('ownerOnlyHint')}{' '}
            <Badge variant='secondary' className='ml-1'>
              {user?.role === 'researcher'
                ? tTeam('roleResearcher')
                : tTeam('roleViewer')}
            </Badge>
          </p>
        </SurvaiPanelBody>
      </SurvaiPanel>
    );
  }

  const members = teamQuery.data?.members ?? [];
  const invites = teamQuery.data?.invites ?? [];

  return (
    <SurvaiPanel>
      <SurvaiPanelHeader
        tone='brand'
        title={tTeam('title')}
        subtitle={tTeam('inviteSubtitle')}
      />
      <SurvaiPanelBody className='space-y-6'>
        <form
          className='flex flex-col gap-3 sm:flex-row sm:items-end'
          onSubmit={(e) => {
            e.preventDefault();
            void (async () => {
              if (!email.trim() || sending) return;
              setSending(true);
              try {
                const result = await createInvite(email.trim(), role);
                setEmail('');
                await refresh();
                if (result.devInviteUrl) {
                  toast.success(tTeam('inviteCreatedDev'), {
                    description: result.devInviteUrl
                  });
                } else {
                  toast.success(tTeam('invited'), {
                    description: tTeam('inviteSentDesc', {
                      email: result.invite.email
                    })
                  });
                }
              } catch (err) {
                toast.error(
                  err instanceof Error ? err.message : tTeam('couldNotInvite')
                );
              } finally {
                setSending(false);
              }
            })();
          }}
        >
          <div className='min-w-0 flex-1 space-y-1.5'>
            <Label htmlFor='invite-email'>{tTeam('email')}</Label>
            <Input
              id='invite-email'
              type='email'
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder={tTeam('emailPlaceholder')}
              required
            />
          </div>
          <div className='space-y-1.5'>
            <Label htmlFor='invite-role'>{tTeam('role')}</Label>
            <select
              id='invite-role'
              className='border-input bg-background h-9 w-full rounded-md border px-3 text-sm sm:w-40'
              value={role}
              onChange={(e) => setRole(e.target.value as InviteRole)}
            >
              <option value='researcher'>{tTeam('roleResearcher')}</option>
              <option value='viewer'>{tTeam('roleViewer')}</option>
            </select>
          </div>
          <Button type='submit' disabled={sending || !email.trim()}>
            {sending ? (
              <Icons.spinner className='size-4 animate-spin' />
            ) : (
              tTeam('invite')
            )}
          </Button>
        </form>

        <div className='space-y-2'>
          <p className='text-xs font-semibold tracking-wide text-muted-foreground uppercase'>
            {tTeam('members')}
          </p>
          <ul className='divide-y divide-border rounded-none border border-border'>
            {members.map((m) => (
              <li
                key={m.id}
                className='flex items-center justify-between gap-3 px-3 py-2.5 text-sm'
              >
                <div className='min-w-0'>
                  <p className='truncate font-medium'>{m.fullName}</p>
                  <p className='text-muted-foreground truncate text-xs'>
                    {m.email}
                  </p>
                </div>
                <div className='flex shrink-0 items-center gap-2'>
                  <Badge variant='secondary' className='capitalize'>
                    {roleLabel(m.role)}
                  </Badge>
                  {m.role !== 'organization' && m.id !== user?.id ? (
                    <Button
                      type='button'
                      variant='ghost'
                      size='sm'
                      className='text-destructive h-8'
                      onClick={() => setMemberToRemove(m)}
                    >
                      {tTeam('remove')}
                    </Button>
                  ) : null}
                </div>
              </li>
            ))}
          </ul>
        </div>

        <AlertDialog
          open={memberToRemove !== null}
          onOpenChange={(open) => {
            if (!open && !removing) setMemberToRemove(null);
          }}
        >
          <AlertDialogContent className='gap-0 overflow-hidden p-0 sm:max-w-md'>
            <AlertDialogHeader className='gap-0 border-b border-border bg-brand-soft px-5 py-4 text-left sm:place-items-start sm:text-left'>
              <AlertDialogTitle className='text-base font-semibold tracking-tight'>
                {tTeam('removeMemberTitle')}
              </AlertDialogTitle>
            </AlertDialogHeader>
            <AlertDialogDescription className='text-pretty px-5 py-4'>
              {memberToRemove
                ? tTeam('removeMemberDesc', {
                    name: memberToRemove.fullName,
                    email: memberToRemove.email,
                    role: roleLabel(memberToRemove.role)
                  })
                : null}
            </AlertDialogDescription>

            <AlertDialogFooter className='mx-0 mb-0 rounded-none border-t bg-brand-soft/70 px-5 py-4'>
              <AlertDialogCancel disabled={removing} className='rounded-none'>
                {tCommon('cancel')}
              </AlertDialogCancel>
              <AlertDialogAction
                className='rounded-none bg-destructive text-destructive-foreground shadow-none hover:bg-destructive/90'
                disabled={removing}
                onClick={(e) => {
                  e.preventDefault();
                  void confirmRemoveMember();
                }}
              >
                {removing ? (
                  <>
                    <Icons.spinner className='mr-2 size-4 animate-spin' />
                    {tTeam('removing')}
                  </>
                ) : (
                  tTeam('removeMember')
                )}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {invites.length > 0 ? (
          <div className='space-y-2'>
            <p className='text-xs font-semibold tracking-wide text-muted-foreground uppercase'>
              {tTeam('pending')}
            </p>
            <ul className='divide-y divide-border rounded-none border border-border'>
              {invites.map((i) => (
                <li
                  key={i.id}
                  className='flex items-center justify-between gap-3 px-3 py-2.5 text-sm'
                >
                  <div className='min-w-0'>
                    <p className='truncate font-medium'>{i.email}</p>
                    <p className='text-muted-foreground text-xs capitalize'>
                      {i.role} · {tTeam('expires')}{' '}
                      {new Date(i.expiresAt).toLocaleDateString()}
                    </p>
                  </div>
                  <Button
                    type='button'
                    variant='ghost'
                    size='sm'
                    className='text-destructive h-8'
                    onClick={() => setInviteToRevoke(i)}
                  >
                    {tTeam('revoke')}
                  </Button>
                </li>
              ))}
            </ul>
          </div>
        ) : null}

        <AlertDialog
          open={inviteToRevoke !== null}
          onOpenChange={(open) => {
            if (!open && !revoking) setInviteToRevoke(null);
          }}
        >
          <AlertDialogContent className='gap-0 overflow-hidden p-0 sm:max-w-md'>
            <AlertDialogHeader className='gap-0 border-b border-border bg-brand-soft px-5 py-4 text-left sm:place-items-start sm:text-left'>
              <AlertDialogTitle className='text-base font-semibold tracking-tight'>
                {tTeam('revokeInviteTitle')}
              </AlertDialogTitle>
            </AlertDialogHeader>
            <AlertDialogDescription className='text-pretty px-5 py-4'>
              {inviteToRevoke
                ? tTeam('revokeInviteDesc', {
                    role: roleLabel(inviteToRevoke.role),
                    email: inviteToRevoke.email
                  })
                : null}
            </AlertDialogDescription>

            <AlertDialogFooter className='mx-0 mb-0 rounded-none border-t bg-brand-soft/70 px-5 py-4'>
              <AlertDialogCancel disabled={revoking} className='rounded-none'>
                {tCommon('cancel')}
              </AlertDialogCancel>
              <AlertDialogAction
                className='rounded-none bg-destructive text-destructive-foreground shadow-none hover:bg-destructive/90'
                disabled={revoking}
                onClick={(e) => {
                  e.preventDefault();
                  void confirmRevokeInvite();
                }}
              >
                {revoking ? (
                  <>
                    <Icons.spinner className='mr-2 size-4 animate-spin' />
                    {tTeam('revoking')}
                  </>
                ) : (
                  tTeam('revokeInvite')
                )}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </SurvaiPanelBody>
    </SurvaiPanel>
  );
}
