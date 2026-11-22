import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

type Props = {
  kicker: string;
  title: ReactNode;
  body?: ReactNode;
  variant?: 'default' | 'about';
  className?: string;
  id?: string;
};

export function LandingSectionHead({
  kicker,
  title,
  body,
  variant = 'default',
  className,
  id
}: Props) {
  return (
    <div
      id={id}
      className={cn(
        'section-head cell-dark',
        variant === 'about' && 'section-head-about',
        className
      )}
    >
      <div className='section-head-main'>
        <p className='label section-kicker'>
          <i />
          {kicker}
        </p>
        {typeof title === 'string' ? (
          <h2 className='section-head-title'>{title}</h2>
        ) : (
          title
        )}
      </div>
      {body != null ? (
        typeof body === 'string' ? (
          <p className='section-head-body'>{body}</p>
        ) : (
          body
        )
      ) : null}
    </div>
  );
}