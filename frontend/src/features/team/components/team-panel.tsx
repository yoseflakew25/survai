'use client';

import { useCallback, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';

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

function roleLabel(role: string): string {
  if (role === 'organization') return 'Owner';
  if (role === 'researcher') return 'Researcher';
  if (role === 'viewer') return 'Viewer';
  return role;
}

export function TeamPanel() {
  const { user } = useAuth();
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
      toast.success('Member removed', {
        description: `${memberToRemove.fullName} no longer has access.`
      });
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : 'Could not remove member'
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
      toast.success('Invite revoked', {
        description: `${inviteToRevoke.email} can no longer accept this invite.`
      });
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : 'Could not revoke invite'
      );
    } finally {
      setRevoking(false);
    }
  }

  if (!owner) {
    return (
      <SurvaiPanel>
        <SurvaiPanelHeader title='Team' subtitle='Organization seats' />
        <SurvaiPanelBody>
          <p className='text-muted-foreground text-sm'>
            Only the organization owner can manage invites. Your role:{' '}
            <Badge variant='secondary' className='ml-1'>
              {user?.role === 'researcher' ? 'Researcher' : 'Viewer'}
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
        title='Team'
        subtitle='Invite researchers and viewers to your organization'
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
                  toast.success('Invite created (dev link)', {
                    description: result.devInviteUrl
                  });
                } else {
                  toast.success('Invite sent', {
                    description: `Invitation emailed to ${result.invite.email}`
                  });
                }
              } catch (err) {
                toast.error(
                  err instanceof Error ? err.message : 'Could not invite'
                );
              } finally {
                setSending(false);
              }
            })();
          }}
        >
          <div className='min-w-0 flex-1 space-y-1.5'>
            <Label htmlFor='invite-email'>Email</Label>
            <Input
              id='invite-email'
              type='email'
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder='colleague@org.org'
              required
            />
          </div>
          <div className='space-y-1.5'>
            <Label htmlFor='invite-role'>Role</Label>
            <select
              id='invite-role'
              className='border-input bg-background h-9 w-full rounded-md border px-3 text-sm sm:w-40'
              value={role}
              onChange={(e) => setRole(e.target.value as InviteRole)}
            >
              <option value='researcher'>Researcher</option>
              <option value='viewer'>Viewer</option>
            </select>
          </div>
          <Button type='submit' disabled={sending || !email.trim()}>
            {sending ? (
              <Icons.spinner className='size-4 animate-spin' />
            ) : (
              'Invite'
            )}
          </Button>
        </form>

        <div className='space-y-2'>
          <p className='text-xs font-semibold tracking-wide text-muted-foreground uppercase'>
            Members
          </p>
          <ul className='divide-y divide-border rounded-xl border border-border'>
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
                      Remove
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
                Remove team member?
              </AlertDialogTitle>
            </AlertDialogHeader>
            <AlertDialogDescription className='text-pretty px-5 py-4'>
              {memberToRemove ? (
                <>
                  <span className='text-foreground font-medium'>
                    {memberToRemove.fullName}
                  </span>{' '}
                  ({memberToRemove.email}) will lose access to this organization
                  as a {roleLabel(memberToRemove.role)}. You can invite them
                  again later if needed.
                </>
              ) : null}
            </AlertDialogDescription>

            <AlertDialogFooter className='mx-0 mb-0 rounded-none border-t bg-brand-soft/70 px-5 py-4'>
              <AlertDialogCancel disabled={removing} className='rounded-xl'>
                Cancel
              </AlertDialogCancel>
              <AlertDialogAction
                className='rounded-xl bg-destructive text-white shadow-none hover:bg-destructive/90'
                disabled={removing}
                onClick={(e) => {
                  e.preventDefault();
                  void confirmRemoveMember();
                }}
              >
                {removing ? (
                  <>
                    <Icons.spinner className='mr-2 size-4 animate-spin' />
                    Removing…
                  </>
                ) : (
                  'Remove member'
                )}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {invites.length > 0 ? (
          <div className='space-y-2'>
            <p className='text-xs font-semibold tracking-wide text-muted-foreground uppercase'>
              Pending invites
            </p>
            <ul className='divide-y divide-border rounded-xl border border-border'>
              {invites.map((i) => (
                <li
                  key={i.id}
                  className='flex items-center justify-between gap-3 px-3 py-2.5 text-sm'
                >
                  <div className='min-w-0'>
                    <p className='truncate font-medium'>{i.email}</p>
                    <p className='text-muted-foreground text-xs capitalize'>
                      {i.role} · expires{' '}
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
                    Revoke
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
                Revoke invite?
              </AlertDialogTitle>
            </AlertDialogHeader>
            <AlertDialogDescription className='text-pretty px-5 py-4'>
              {inviteToRevoke ? (
                <>
                  The pending{' '}
                  <span className='text-foreground font-medium'>
                    {roleLabel(inviteToRevoke.role)}
                  </span>{' '}
                  invite for{' '}
                  <span className='text-foreground font-medium'>
                    {inviteToRevoke.email}
                  </span>{' '}
                  will stop working. You can send a new invite later if needed.
                </>
              ) : null}
            </AlertDialogDescription>

            <AlertDialogFooter className='mx-0 mb-0 rounded-none border-t bg-brand-soft/70 px-5 py-4'>
              <AlertDialogCancel disabled={revoking} className='rounded-xl'>
                Cancel
              </AlertDialogCancel>
              <AlertDialogAction
                className='rounded-xl bg-destructive text-white shadow-none hover:bg-destructive/90'
                disabled={revoking}
                onClick={(e) => {
                  e.preventDefault();
                  void confirmRevokeInvite();
                }}
              >
                {revoking ? (
                  <>
                    <Icons.spinner className='mr-2 size-4 animate-spin' />
                    Revoking…
                  </>
                ) : (
                  'Revoke invite'
                )}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </SurvaiPanelBody>
    </SurvaiPanel>
  );
}
