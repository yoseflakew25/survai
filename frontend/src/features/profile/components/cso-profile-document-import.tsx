'use client';

import { FileUploader } from '@/components/file-uploader';
import { Icons } from '@/components/icons';
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
import {
  SurvaiPanel,
  SurvaiPanelBody,
  SurvaiPanelHeader
} from '@/components/survai-panel';
import {
  extractOrganizationProfileFromDocument,
  type CsoProfileExtractResponse
} from '@/features/profile/api/service';
import type { OrganizationProfileFormValues } from '@/features/profile/components/organization-profile-form-types';
import {
  csoProfileFromApi,
  mergeCsoProfileForm,
  type CsoProfileFormValues
} from '@/features/profile/cso-profile-schema';
import { useTranslations } from 'next-intl';
import { useState } from 'react';
import { toast } from '@/lib/toast';

const DOC_ACCEPT = {
  'application/pdf': ['.pdf'],
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': [
    '.docx'
  ],
  'text/plain': ['.txt'],
  'text/markdown': ['.md', '.markdown']
};

export type CsoDocumentApplyPayload = {
  organizationName?: string | null;
  organizationDescription?: string | null;
  cso: CsoProfileFormValues;
};

type Props = {
  currentCso: CsoProfileFormValues;
  onApply: (payload: CsoDocumentApplyPayload, mode: 'empty' | 'all') => void;
};

export function CsoProfileDocumentImport({ currentCso, onApply }: Props) {
  const t = useTranslations('account.cso.documentImport');
  const [isExtracting, setIsExtracting] = useState(false);
  const [pending, setPending] = useState<CsoProfileExtractResponse | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  const handleUpload = async (files: File[]) => {
    const file = files[0];
    if (!file) return;
    setIsExtracting(true);
    try {
      const result = await extractOrganizationProfileFromDocument(file);
      setPending(result);
      setDialogOpen(true);
    } catch (err) {
      toast.error(t('extractFailed'), {
        description: err instanceof Error ? err.message : t('tryAgain')
      });
    } finally {
      setIsExtracting(false);
    }
  };

  const apply = (mode: 'empty' | 'all') => {
    if (!pending) return;
    const extractedCso = csoProfileFromApi(pending.organization_cso_profile);
    onApply(
      {
        organizationName: pending.organization_name,
        organizationDescription: pending.organization_description,
        cso: mergeCsoProfileForm(currentCso, extractedCso, mode)
      },
      mode
    );
    setDialogOpen(false);
    setPending(null);
    toast.success(t('applied'), { description: t('appliedHint') });
  };

  return (
    <>
      <SurvaiPanel>
        <SurvaiPanelHeader
          title={t('title')}
          subtitle={t('subtitle')}
          icon={<Icons.fileTypeDoc className='size-4' aria-hidden />}
        />
        <SurvaiPanelBody className='space-y-3'>
          <p className='text-muted-foreground text-sm'>{t('hint')}</p>
          <FileUploader
            accept={DOC_ACCEPT}
            maxSize={1024 * 1024 * 5}
            maxFiles={1}
            disabled={isExtracting}
            onUpload={handleUpload}
            className='h-40'
          />
          {isExtracting ? (
            <p className='text-muted-foreground flex items-center gap-2 text-sm'>
              <Icons.spinner className='size-4 animate-spin' />
              {t('extracting')}
            </p>
          ) : null}
        </SurvaiPanelBody>
      </SurvaiPanel>

      <AlertDialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('reviewTitle')}</AlertDialogTitle>
            <AlertDialogDescription>
              {pending
                ? t('reviewDescription', {
                    name: pending.source_filename,
                    chars: pending.characters_extracted
                  })
                : null}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className='flex-col gap-2 sm:flex-row sm:justify-end'>
            <AlertDialogCancel variant='outline'>{t('cancel')}</AlertDialogCancel>
            <AlertDialogAction
              variant='secondary'
              onClick={() => apply('empty')}
            >
              {t('fillEmpty')}
            </AlertDialogAction>
            <AlertDialogAction onClick={() => apply('all')}>
              {t('replaceAll')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}