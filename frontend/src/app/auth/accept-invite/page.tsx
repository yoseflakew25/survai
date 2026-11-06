'use client';

import { Suspense, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { PasswordInput } from '@/features/auth/components/password-input';
import { acceptInvite } from '@/features/team/api/service';
import { useAuth } from '@/lib/auth-context';
import { toast } from '@/lib/toast';

function AcceptInviteForm() {
  const params = useSearchParams();
  const token = params.get('token') || '';
  const router = useRouter();
  const { setUserFromApi } = useAuth();
  const [fullName, setFullName] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);

  if (!token) {
    return (
      <p className='text-sm text-destructive'>
        Missing invite token. Open the link from your email.
      </p>
    );
  }

  return (
    <form
      className='space-y-4'
      onSubmit={(e) => {
        e.preventDefault();
        void (async () => {
          setBusy(true);
          try {
            const tokens = await acceptInvite({ token, fullName, password });
            setUserFromApi(tokens.user);
            toast.success('Welcome to the team');
            router.replace('/dashboard');
          } catch (err) {
            toast.error(
              err instanceof Error ? err.message : 'Could not accept invite'
            );
          } finally {
            setBusy(false);
          }
        })();
      }}
    >
      <div className='space-y-1.5'>
        <Label htmlFor='full-name'>Your name</Label>
        <Input
          id='full-name'
          value={fullName}
          onChange={(e) => setFullName(e.target.value)}
          required
          minLength={2}
        />
      </div>
      <div className='space-y-1.5'>
        <Label htmlFor='password'>Choose a password</Label>
        <PasswordInput
          id='password'
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          minLength={8}
        />
      </div>
      <Button type='submit' className='w-full' disabled={busy}>
        {busy ? 'Joining…' : 'Join organization'}
      </Button>
      <p className='text-muted-foreground text-center text-xs'>
        Already have an account?{' '}
        <Link href='/auth/sign-in' className='underline'>
          Sign in
        </Link>
      </p>
    </form>
  );
}

export default function AcceptInvitePage() {
  return (
    <div className='mx-auto w-full max-w-md space-y-6 py-8'>
      <div className='space-y-1 text-center'>
        <h1 className='text-2xl font-semibold tracking-tight'>Accept invite</h1>
        <p className='text-muted-foreground text-sm'>
          Create your password to join the organization on SurvAI.
        </p>
      </div>
      <Suspense fallback={<p className='text-sm'>Loading…</p>}>
        <AcceptInviteForm />
      </Suspense>
    </div>
  );
}
