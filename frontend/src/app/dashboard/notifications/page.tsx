import { redirect } from 'next/navigation';

/** Notifications live in the header drawer — keep this route as a redirect. */
export default function NotificationsPage() {
  redirect('/dashboard/overview');
}
