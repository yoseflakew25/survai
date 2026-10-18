import { redirect } from 'next/navigation';

/** Settings merged into Account — keep this route as a redirect. */
export default function SettingsPage() {
  redirect('/dashboard/profile');
}
