import type { CsoProfileFormValues } from '../cso-profile-schema';

export type OrganizationProfileFormValues = {
  organizationName: string;
  fullName: string;
  phone?: string;
  jobTitle?: string;
  personalBio?: string;
  website?: string;
  organizationDescription?: string;
  cso: CsoProfileFormValues;
};