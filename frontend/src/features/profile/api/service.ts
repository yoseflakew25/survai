import { apiErrorMessage, apiFetch, type ApiUser } from '@/lib/api';
import { serviceMsg } from '@/lib/service-messages';

export type ProfileUpdatePayload = {
  full_name?: string;
  phone?: string | null;
  job_title?: string | null;
  bio?: string | null;
  organization_name?: string;
  organization_description?: string | null;
  organization_website?: string | null;
  organization_cso_profile?: Record<string, unknown> | null;
};

export async function fetchMe(): Promise<ApiUser> {
  const res = await apiFetch('/users/me');
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(apiErrorMessage(data, serviceMsg('account', 'loadFailed')));
  }
  return data as ApiUser;
}

export async function updateMe(payload: ProfileUpdatePayload): Promise<ApiUser> {
  const res = await apiFetch('/users/me', {
    method: 'PATCH',
    body: JSON.stringify(payload)
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(apiErrorMessage(data, serviceMsg('account', 'saveFailed')));
  }
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
    throw new Error(apiErrorMessage(data, serviceMsg('account', 'passwordFailed')));
  }
}

export type CsoProfileExtractResponse = {
  organization_name: string | null;
  organization_description: string | null;
  organization_cso_profile: Record<string, unknown>;
  source_filename: string;
  characters_extracted: number;
};

export async function extractOrganizationProfileFromDocument(
  file: File
): Promise<CsoProfileExtractResponse> {
  const form = new FormData();
  form.append('file', file);
  const res = await apiFetch('/users/me/organization-profile/from-document', {
    method: 'POST',
    body: form
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(
      apiErrorMessage(data, serviceMsg('account', 'csoDocumentExtractFailed'))
    );
  }
  return data as CsoProfileExtractResponse;
}

export async function deleteMyAccount(): Promise<void> {
  const res = await apiFetch('/users/me', { method: 'DELETE' });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(
      apiErrorMessage(data, serviceMsg('account', 'couldNotDeleteAccount'))
    );
  }
}
