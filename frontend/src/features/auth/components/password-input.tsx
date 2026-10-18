'use client';

import { useState, type ComponentProps } from 'react';

import { Icons } from '@/components/icons';
import { cn } from '@/lib/utils';

type PasswordInputProps = Omit<ComponentProps<'input'>, 'type'> & {
  toggleLabelShow?: string;
  toggleLabelHide?: string;
};

export function PasswordInput({
  className,
  disabled,
  toggleLabelShow = 'Show password',
  toggleLabelHide = 'Hide password',
  ...props
}: PasswordInputProps) {
  const [visible, setVisible] = useState(false);

  return (
    <div className='relative'>
      <input
        {...props}
        disabled={disabled}
        type={visible ? 'text' : 'password'}
        className={cn('pr-11', className)}
      />
      <button
        type='button'
        tabIndex={-1}
        disabled={disabled}
        aria-label={visible ? toggleLabelHide : toggleLabelShow}
        aria-pressed={visible}
        onClick={() => setVisible((v) => !v)}
        className='text-muted-foreground hover:text-foreground absolute top-1/2 right-2.5 flex size-8 -translate-y-1/2 items-center justify-center rounded-md transition-colors disabled:pointer-events-none disabled:opacity-50'
      >
        {visible ? (
          <Icons.eyeOff className='size-4 shrink-0' strokeWidth={1.75} />
        ) : (
          <Icons.eye className='size-4 shrink-0' strokeWidth={1.75} />
        )}
      </button>
    </div>
  );
}
