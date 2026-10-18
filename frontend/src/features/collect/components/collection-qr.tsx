'use client';

import { useCallback, useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Icons } from '@/components/icons';
import { toast } from '@/lib/toast';
import { cn } from '@/lib/utils';

interface CollectionQrProps {
  url: string;
  className?: string;
}

function qrImageUrl(url: string, size: number) {
  return `https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&margin=16&ecc=M&data=${encodeURIComponent(url)}`;
}

export function CollectionQr({ url, className }: CollectionQrProps) {
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
      toast.success('QR downloaded', {
        description: 'Print or share the PNG with respondents.'
      });
    } catch {
      toast.error('Download failed', {
        description: 'Could not download the QR code. Try again.'
      });
    } finally {
      setIsDownloading(false);
    }
  }, [url, isDownloading]);

  return (
    <div
      className={cn(
        'flex flex-col gap-5 sm:flex-row sm:items-center',
        className
      )}
    >
      <div className='mx-auto shrink-0 rounded-2xl border border-[color-mix(in_srgb,var(--brand)_70%,var(--foreground))] bg-brand p-2.5 shadow-[0_1px_0_color-mix(in_srgb,var(--foreground)_18%,transparent)] sm:mx-0'>
        <div className='overflow-hidden rounded-xl bg-white p-2'>
          <img
            src={previewSrc}
            alt='QR code for survey collection link'
            width={140}
            height={140}
            className='size-[140px]'
          />
        </div>
      </div>

      <div className='min-w-0 flex-1 space-y-3 text-center sm:text-left'>
        <div className='space-y-1'>
          <p className='text-sm font-semibold tracking-tight text-foreground'>
            Scan to open the survey
          </p>
          <p className='text-muted-foreground text-xs leading-relaxed'>
            Print on paper forms, posters, or handouts. Opens the same collection
            link on any phone.
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
          Download QR Code
        </Button>
      </div>
    </div>
  );
}
