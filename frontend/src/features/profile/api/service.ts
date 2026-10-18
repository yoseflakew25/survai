import { apiErrorMessage, apiFetch, type ApiUser } from '@/lib/api';

export type ProfileUpdatePayload = {
  full_name?: string;
  phone?: string | null;
  job_title?: string | null;
  bio?: string | null;
  organization_name?: string;
  organization_description?: string | null;
  organization_website?: string | null;
};

export async function fetchMe(): Promise<ApiUser> {
  const res = await apiFetch('/users/me');
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(apiErrorMessage(data, 'Failed to load profile'));
  return data as ApiUser;
}

export async function updateMe(payload: ProfileUpdatePayload): Promise<ApiUser> {
  const res = await apiFetch('/users/me', {
    method: 'PATCH',
    body: JSON.stringify(payload)
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(apiErrorMessage(data, 'Failed to save profile'));
  return data as ApiUser;
}

export async function changePassword(input: {
  currentPassword: string;
  newPassword: string;
}): Promise<void> {
  const res = await apiFetch('/users/me/password', {
    method: 'POST',
    body: JSON.stringify({
      current_password: input.currentPassword,
      new_password: input.newPassword
    })
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(apiErrorMessage(data, 'Failed to update password'));
  }
}

export async function deleteMyAccount(): Promise<void> {
  const res = await apiFetch('/users/me', { method: 'DELETE' });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(apiErrorMessage(data, 'Failed to delete account'));
  }
}
