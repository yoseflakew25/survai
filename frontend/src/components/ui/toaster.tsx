'use client';

import { Toaster as HotToaster } from 'react-hot-toast';

export function Toaster() {
  return (
    <HotToaster
      position='top-center'
      gutter={8}
      toastOptions={{
        style: {
          background: 'var(--popover)',
          color: 'var(--popover-foreground)',
          borderRadius: 'var(--radius)',
          // Matches the popover treatment: ring-1 ring-foreground/10 + shadow-md
          boxShadow:
            '0 0 0 1px color-mix(in oklab, var(--foreground) 10%, transparent), var(--shadow-md)',
          padding: '0.625rem 0.75rem',
          fontSize: '0.875rem',
          lineHeight: '1.25rem',
          maxWidth: '380px'
        },
        success: {
          iconTheme: {
            primary: 'var(--primary)',
            secondary: 'var(--popover)'
          }
        },
        error: {
          iconTheme: {
            primary: 'var(--destructive)',
            secondary: 'var(--popover)'
          }
        }
      }}
    />
  );
}