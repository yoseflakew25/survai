import { redirect } from 'next/navigation';

/** Legacy mock users route — platform admin lives under /admin/users. */
export default function UsersRedirectPage() {
  redirect('/admin/users');
}
