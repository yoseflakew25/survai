'use client';

import { useState, type ComponentProps } from 'react';
import { useTranslations } from 'next-intl';

import { Icons } from '@/components/icons';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

type PasswordInputProps = Omit<ComponentProps<'input'>, 'type'> & {
  toggleLabelShow?: string;
  toggleLabelHide?: string;
  /** 'auth' uses auth-v2.css classes inside AuthShell; 'app' uses dashboard Input chrome. */
  variant?: 'auth' | 'app';
};

export function PasswordInput({
  className,
  disabled,
  toggleLabelShow,
  toggleLabelHide,
  variant = 'auth',
  ...props
}: PasswordInputProps) {
  const t = useTranslations('auth');
  const showLabel = toggleLabelShow ?? t('showPassword');
  const hideLabel = toggleLabelHide ?? t('hidePassword');
  const [visible, setVisible] = useState(false);
  const isApp = variant === 'app';

  return (
    <div className={isApp ? 'relative' : 'auth-password'}>
      {isApp ? (
        <Input
          {...props}
          disabled={disabled}
          type={visible ? 'text' : 'password'}
          className={cn(
            'h-10 rounded-none border-border bg-background pr-10 text-sm font-medium text-foreground shadow-none placeholder:text-muted-foreground/70 focus-visible:border-foreground/40 focus-visible:ring-1 focus-visible:ring-ring/35',
            className
          )}
        />
      ) : (
        <input
          {...props}
          disabled={disabled}
          type={visible ? 'text' : 'password'}
          className={cn('auth-input', className)}
        />
      )}
      <button
        type='button'
        tabIndex={-1}
        disabled={disabled}
        aria-label={visible ? hideLabel : showLabel}
        aria-pressed={visible}
        onClick={() => setVisible((v) => !v)}
        className={
          isApp
            ? 'absolute top-1/2 right-1.5 flex size-7 -translate-y-1/2 items-center justify-center rounded-none text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none disabled:pointer-events-none disabled:opacity-40'
            : 'auth-password-toggle'
        }
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
