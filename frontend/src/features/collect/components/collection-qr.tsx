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
        'grid grid-cols-[auto_minmax(0,1fr)] items-start gap-3 sm:gap-4',
        className
      )}
    >
      <div className='shrink-0 rounded-none border border-foreground/15 bg-background p-1.5'>
        <Image
          src={previewSrc}
          alt={t('qrImageAlt')}
          width={112}
          height={112}
          unoptimized
          className='size-28'
        />
      </div>

      <div className='min-w-0 space-y-2 pt-0.5'>
        <div>
          <p className='text-sm font-semibold tracking-tight text-foreground'>
            {t('scanToOpen')}
          </p>
          <p className='text-muted-foreground mt-0.5 text-xs leading-snug'>
            {t('scanHint')}
          </p>
        </div>
        <Button
          type='button'
          variant='outline'
          size='sm'
          onClick={() => void handleDownload()}
          disabled={isDownloading}
          className='h-9 rounded-none'
        >
          {isDownloading ? (
            <Icons.spinner className='mr-1.5 size-3.5 animate-spin' />
          ) : (
            <Icons.upload className='mr-1.5 size-3.5' />
          )}
          {t('downloadQr')}
        </Button>
      </div>
    </div>
  );
}
