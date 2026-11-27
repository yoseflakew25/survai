'use client';

import Image from 'next/image';
import { useCallback, useEffect, useState } from 'react';
import { cn } from '@/lib/utils';
import type { HeroMediaKind } from '@/features/landing-v2/hero-media';

const SLIDE_INTERVAL_MS = 2500;

type HeroMediaCellProps = {
  kind: HeroMediaKind;
  srcs: string[];
  label: string;
  toneBig?: boolean;
  className?: string;
};

export function HeroMediaCell({
  kind,
  srcs,
  label,
  toneBig = false,
  className
}: HeroMediaCellProps) {
  const [useHalftoneOnly, setUseHalftoneOnly] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);

  const onMediaError = useCallback(() => {
    setUseHalftoneOnly(true);
  }, []);

  useEffect(() => {
    if (srcs.length < 2) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    const id = window.setInterval(() => {
      setActiveIndex((current) => (current + 1) % srcs.length);
    }, SLIDE_INTERVAL_MS);

    return () => window.clearInterval(id);
  }, [srcs.length]);

  const src = srcs[Math.min(activeIndex, srcs.length - 1)] ?? '';
  const mp4Src = src.replace(/\.webm$/i, '.mp4');
  const isSvg = src.endsWith('.svg');
  const isGif = src.endsWith('.gif');
  const showRaster = !useHalftoneOnly && kind === 'image' && !isSvg;
  const showSvg = !useHalftoneOnly && kind === 'image' && isSvg;
  const showVideo = !useHalftoneOnly && kind === 'video';

  return (
    <div className={cn('hero-media-cell', showRaster && 'is-raster', className)}>
      {showRaster ? null : (
        <canvas
          className='tone hero-media-tone-under'
          data-tone='scene'
          data-big={toneBig ? '1' : undefined}
          aria-hidden
        />
      )}
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
        <div className='hero-laptop'>
          <div className='hero-laptop-lid'>
            <span className='hero-laptop-cam' aria-hidden='true' />
            <span className='hero-laptop-mic' aria-hidden='true' />
            <div className='hero-laptop-screen'>
              {isGif ? (
                <Image
                  src={src}
                  alt=''
                  fill
                  unoptimized
                  className='hero-media-img is-gif'
                  sizes='50vw'
                  priority
                  onError={onMediaError}
                />
              ) : (
                srcs.map((slide, index) => (
                  <Image
                    key={slide}
                    src={slide}
                    alt=''
                    fill
                    className={cn(
                      'hero-media-img',
                      'hero-media-slide',
                      index === activeIndex && 'is-active'
                    )}
                    sizes='50vw'
                    priority={index === 0}
                    onError={index === activeIndex ? onMediaError : undefined}
                  />
                ))
              )}
            </div>
            <span className='hero-laptop-chin' aria-hidden='true'>
              <i />
            </span>
          </div>
          <div className='hero-laptop-base' aria-hidden='true' />
        </div>
      ) : null}
    </div>
  );
}
