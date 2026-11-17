'use client';

import Image from 'next/image';
import { useCallback, useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Icons } from '@/components/icons';
import { toast } from '@/lib/toast';
import { cn } from '@/lib/utils';
import { useTranslations } from 'next-intl';

interface CollectionQrProps {
  url: string;
  className?: string;
}

function qrImageUrl(url: string, size: number) {
  return `https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&margin=16&ecc=M&data=${encodeURIComponent(url)}`;
}

export function CollectionQr({ url, className }: CollectionQrProps) {
  const t = useTranslations('collect');
  const [isDownloading, setIsDownloading] = useState(false);
  const previewSrc = useMemo(() => qrImageUrl(url, 280), [url]);

  const handleDownload = useCallback(async () => {
    if (isDownloading) return;
    setIsDownloading(true);
    try {
      const res = await fetch(qrImageUrl(url, 512));
      if (!res.ok) throw new Error('QR fetch failed');
      const blob = await res.blob();
      const objectUrl = URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = objectUrl;
      anchor.download = 'survai-collection-qr.png';
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      URL.revokeObjectURL(objectUrl);
      toast.success(t('qrDownloaded'), {
        description: t('qrDownloadedDesc')
      });
    } catch {
      toast.error(t('downloadFailed'), {
        description: t('downloadFailedDesc')
      });
    } finally {
      setIsDownloading(false);
    }
  }, [url, isDownloading, t]);

  return (
    <div
      className={cn(
        'flex flex-col gap-5 sm:flex-row sm:items-center',
        className
      )}
    >
      <div className='mx-auto shrink-0 rounded-2xl border border-[color-mix(in_srgb,var(--brand)_70%,var(--foreground))] bg-brand p-2.5 shadow-[0_1px_0_color-mix(in_srgb,var(--foreground)_18%,transparent)] sm:mx-0'>
        <div className='overflow-hidden rounded-xl bg-white p-2'>
          <Image
            src={previewSrc}
            alt={t('qrImageAlt')}
            width={140}
            height={140}
            unoptimized
            className='size-[140px]'
          />
        </div>
      </div>

      <div className='min-w-0 flex-1 space-y-3 text-center sm:text-left'>
        <div className='space-y-1'>
          <p className='text-sm font-semibold tracking-tight text-foreground'>
            {t('scanToOpen')}
          </p>
          <p className='text-muted-foreground text-xs leading-relaxed'>
            {t('scanHint')}
          </p>
        </div>
        <Button
          type='button'
          variant='outline'
          onClick={() => void handleDownload()}
          disabled={isDownloading}
          className='h-10 rounded-xl border-border'
        >
          {isDownloading ? (
            <Icons.spinner className='mr-2 size-4 animate-spin' />
          ) : (
            <Icons.upload className='mr-2 size-4' />
          )}
          {t('downloadQr')}
        </Button>
      </div>
    </div>
  );
}
