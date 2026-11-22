'use client';

import Image from 'next/image';
import { useCallback, useState } from 'react';
import { cn } from '@/lib/utils';
import type { HeroMediaKind } from '@/features/landing-v2/hero-media';

type HeroMediaCellProps = {
  kind: HeroMediaKind;
  src: string;
  label: string;
  toneBig?: boolean;
  className?: string;
};

export function HeroMediaCell({
  kind,
  src,
  label,
  toneBig = false,
  className
}: HeroMediaCellProps) {
  const [useHalftoneOnly, setUseHalftoneOnly] = useState(false);

  const onMediaError = useCallback(() => {
    setUseHalftoneOnly(true);
  }, []);

  const mp4Src = src.replace(/\.webm$/i, '.mp4');
  const isSvg = src.endsWith('.svg');
  const showRaster = !useHalftoneOnly && kind === 'image' && !isSvg;
  const showSvg = !useHalftoneOnly && kind === 'image' && isSvg;
  const showVideo = !useHalftoneOnly && kind === 'video';

  return (
    <div className={cn('hero-media-cell', className)}>
      <canvas
        className={cn('tone', (showSvg || showRaster || showVideo) && 'hero-media-tone-under')}
        data-tone='scene'
        data-big={toneBig ? '1' : undefined}
        aria-hidden
      />
      {showVideo ? (
        <video
          className='hero-media-video'
          autoPlay
          muted
          loop
          playsInline
          preload='metadata'
          aria-label={label}
          onError={onMediaError}
        >
          <source src={src} type='video/webm' />
          {mp4Src !== src ? <source src={mp4Src} type='video/mp4' /> : null}
        </video>
      ) : null}
      {showSvg ? (
        <img
          src={src}
          alt=''
          className='hero-media-img'
          onError={onMediaError}
        />
      ) : null}
      {showRaster ? (
        <Image
          src={src}
          alt=''
          fill
          className='hero-media-img'
          sizes='50vw'
          priority
          onError={onMediaError}
        />
      ) : null}
    </div>
  );
}