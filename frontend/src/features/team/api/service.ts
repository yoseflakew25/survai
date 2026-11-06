import {
  apiErrorMessage,
  apiFetch,
  toUserFacingError,
  type TokenPairResponse
} from '@/lib/api';

export type InviteRole = 'researcher' | 'viewer';

export type OrgMember = {
  id: string;
  email: string;
  fullName: string;
  role: string;
  isActive: boolean;
  createdAt: string;
};

export type OrgInvite = {
  id: string;
  email: string;
  role: string;
  expiresAt: string;
  acceptedAt: string | null;
  createdAt: string;
};

async function readError(res: Response, fallback: string): Promise<never> {
  const data = await res.json().catch(() => ({}));
  throw new Error(
    toUserFacingError(new Error(apiErrorMessage(data, fallback)), fallback)
  );
}

export async function fetchTeam(): Promise<{
  members: OrgMember[];
  invites: OrgInvite[];
}> {
  const res = await apiFetch('/org/team');
  if (!res.ok) await readError(res, 'Could not load team');
  const data = (await res.json()) as {
    members: Array<{
      id: string;
      email: string;
      full_name: string;
      role: string;
      is_active: boolean;
      created_at: string;
    }>;
    invites: Array<{
      id: string;
      email: string;
      role: string;
      expires_at: string;
      accepted_at: string | null;
      created_at: string;
    }>;
  };
  return {
    members: data.members.map((m) => ({
      id: m.id,
      email: m.email,
      fullName: m.full_name,
      role: m.role,
      isActive: m.is_active,
      createdAt: m.created_at
    })),
    invites: data.invites.map((i) => ({
      id: i.id,
      email: i.email,
      role: i.role,
      expiresAt: i.expires_at,
      acceptedAt: i.accepted_at,
      createdAt: i.created_at
    }))
  };
}

export async function createInvite(
  email: string,
  role: InviteRole
): Promise<{ invite: OrgInvite; devInviteUrl: string | null }> {
  const res = await apiFetch('/org/invites', {
    method: 'POST',
    body: JSON.stringify({ email, role })
  });
  if (!res.ok) await readError(res, 'Could not send invite');
  const data = (await res.json()) as {
    invite: {
      id: string;
      email: string;
      role: string;
      expires_at: string;
      accepted_at: string | null;
      created_at: string;
    };
    dev_invite_url?: string | null;
  };
  return {
    invite: {
      id: data.invite.id,
      email: data.invite.email,
      role: data.invite.role,
      expiresAt: data.invite.expires_at,
      acceptedAt: data.invite.accepted_at,
      createdAt: data.invite.created_at
    },
    devInviteUrl: data.dev_invite_url ?? null
  };
}

export async function revokeInvite(inviteId: string): Promise<void> {
  const res = await apiFetch(`/org/invites/${inviteId}`, { method: 'DELETE' });
  if (!res.ok) await readError(res, 'Could not revoke invite');
}

export async function removeMember(memberId: string): Promise<void> {
  const res = await apiFetch(`/org/members/${memberId}`, { method: 'DELETE' });
  if (!res.ok) await readError(res, 'Could not remove member');
}

export async function acceptInvite(payload: {
  token: string;
  fullName: string;
  password: string;
}): Promise<TokenPairResponse> {
  const res = await apiFetch('/auth/accept-invite', {
    method: 'POST',
    body: JSON.stringify({
      token: payload.token,
      full_name: payload.fullName,
      password: payload.password
    })
  });
  if (!res.ok) await readError(res, 'Could not accept invite');
  return (await res.json()) as TokenPairResponse;
}
