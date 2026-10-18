import { Metadata } from 'next';
import ForgotPasswordViewPage from '@/features/auth/components/forgot-password-view';

export const metadata: Metadata = {
  title: 'Authentication | Forgot Password',
  description: 'Request a password reset link for your SurvAI organization account.'
};

export default function Page() {
  return <ForgotPasswordViewPage />;
}
