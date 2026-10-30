'use client';

import { useEffect, useEffectEvent, useRef, useState } from 'react';

import { Icons } from '@/components/icons';
import { useAuth } from '@/lib/auth-context';
import { cn } from '@/lib/utils';

const GIS_SCRIPT_SRC = 'https://accounts.google.com/gsi/client';
const CLIENT_ID = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID ?? '';

type GoogleCredentialResponse = {
  credential?: string;
  select_by?: string;
};

type GoogleAccountsId = {
  initialize: (config: {
    client_id: string;
    callback: (response: GoogleCredentialResponse) => void;
    auto_select?: boolean;
    cancel_on_tap_outside?: boolean;
    context?: string;
  }) => void;
  renderButton: (
    parent: HTMLElement,
    options: {
      theme?: 'outline' | 'filled_blue' | 'filled_black';
      size?: 'large' | 'medium' | 'small';
      text?: 'signin_with' | 'signup_with' | 'continue_with' | 'signin';
      shape?: 'rectangular' | 'pill' | 'circle' | 'square';
      logo_alignment?: 'left' | 'center';
      width?: number;
    }
  ) => void;
};

declare global {
  interface Window {
    google?: { accounts: { id: GoogleAccountsId } };
  }
}

function loadGisScript(): Promise<void> {
  if (typeof window === 'undefined') return Promise.resolve();
  if (window.google?.accounts?.id) return Promise.resolve();

  const existing = document.querySelector<HTMLScriptElement>(
    `script[src="${GIS_SCRIPT_SRC}"]`
  );
  if (existing) {
    return new Promise((resolve, reject) => {
      existing.addEventListener('load', () => resolve(), { once: true });
      existing.addEventListener(
        'error',
        () => reject(new Error('Could not load Google Identity')),
        { once: true }
      );
    });
  }

  return new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = GIS_SCRIPT_SRC;
    script.async = true;
    script.defer = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error('Could not load Google Identity'));
    document.head.appendChild(script);
  });
}

type GoogleSignInButtonProps = {
  mode?: 'signin' | 'signup';
  className?: string;
  onError?: (message: string) => void;
  onSuccess?: () => void;
};

export function GoogleSignInButton({
  mode = 'signin',
  className,
  onError,
  onSuccess
}: GoogleSignInButtonProps) {
  const { loginWithGoogle } = useAuth();
  const hostRef = useRef<HTMLDivElement>(null);
  const [ready, setReady] = useState(false);
  const [busy, setBusy] = useState(false);
  const [unavailable, setUnavailable] = useState(!CLIENT_ID);

  const handleCredential = useEffectEvent(
    async (response: GoogleCredentialResponse) => {
      const credential = response.credential?.trim();
      if (!credential) {
        onError?.('Google did not return a credential. Try again.');
        return;
      }
      setBusy(true);
      try {
        await loginWithGoogle(credential);
        onSuccess?.();
      } catch (err) {
        const message =
          err instanceof Error
            ? err.message
            : 'Google sign-in failed. Please try again.';
        onError?.(message);
      } finally {
        setBusy(false);
      }
    }
  );

  useEffect(() => {
    if (!CLIENT_ID || !hostRef.current) {
      setUnavailable(true);
      return;
    }

    let cancelled = false;

    void (async () => {
      try {
        await loadGisScript();
        if (cancelled || !hostRef.current || !window.google?.accounts?.id) {
          return;
        }

        window.google.accounts.id.initialize({
          client_id: CLIENT_ID,
          callback: (response) => {
            void handleCredential(response);
          },
          auto_select: false,
          cancel_on_tap_outside: true,
          context: mode === 'signup' ? 'signup' : 'signin'
        });

        hostRef.current.innerHTML = '';
        const width = Math.min(
          400,
          Math.max(280, Math.floor(hostRef.current.clientWidth || 320))
        );
        window.google.accounts.id.renderButton(hostRef.current, {
          theme: 'outline',
          size: 'large',
          text: mode === 'signup' ? 'signup_with' : 'signin_with',
          shape: 'rectangular',
          logo_alignment: 'left',
          width
        });
        if (!cancelled) setReady(true);
      } catch {
        if (!cancelled) {
          setUnavailable(true);
          onError?.('Google sign-in is unavailable right now.');
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [mode, onError]);

  if (unavailable) {
    return null;
  }

  return (
    <div className={cn('relative w-full', className)}>
      {!ready || busy ? (
        <div className='border-border bg-card text-muted-foreground flex h-11 w-full items-center justify-center gap-2 rounded-xl border text-sm'>
          <Icons.spinner className='size-4 animate-spin' />
          {busy ? 'Signing in with Google…' : 'Loading Google…'}
        </div>
      ) : null}
      <div
        ref={hostRef}
        className={cn(
          'flex w-full justify-center overflow-hidden rounded-xl',
          (!ready || busy) && 'pointer-events-none absolute inset-0 opacity-0'
        )}
        aria-hidden={!ready || busy}
      />
    </div>
  );
}

export function AuthDivider({ label = 'or' }: { label?: string }) {
  return (
    <div className='relative py-1'>
      <div className='absolute inset-0 flex items-center' aria-hidden>
        <div className='border-border w-full border-t' />
      </div>
      <div className='relative flex justify-center text-[12px]'>
        <span className='text-muted-foreground bg-background px-2'>{label}</span>
      </div>
    </div>
  );
}
