'use client';

import { useState, type ComponentProps } from 'react';
import { useTranslations } from 'next-intl';

import { Icons } from '@/components/icons';
import { cn } from '@/lib/utils';

type PasswordInputProps = Omit<ComponentProps<'input'>, 'type'> & {
  toggleLabelShow?: string;
  toggleLabelHide?: string;
};

export function PasswordInput({
  className,
  disabled,
  toggleLabelShow,
  toggleLabelHide,
  ...props
}: PasswordInputProps) {
  const t = useTranslations('auth');
  const showLabel = toggleLabelShow ?? t('showPassword');
  const hideLabel = toggleLabelHide ?? t('hidePassword');
  const [visible, setVisible] = useState(false);

  return (
    <div className='auth-password'>
      <input
        {...props}
        disabled={disabled}
        type={visible ? 'text' : 'password'}
        className={cn('auth-input', className)}
      />
      <button
        type='button'
        tabIndex={-1}
        disabled={disabled}
        aria-label={visible ? hideLabel : showLabel}
        aria-pressed={visible}
        onClick={() => setVisible((v) => !v)}
        className='auth-password-toggle'
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
