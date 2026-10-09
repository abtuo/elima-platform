import { redirect } from 'next/navigation';

// Reuse the central WhatsApp reset UI already deployed in Mobile, not legacy OTP login.
export default function ResetPasswordPage() {
  const origin = (process.env.ELIMA_MOBILE_APP_URL || 'https://app.elima.ci').replace(/\/$/, '');
  redirect(`${origin}/auth/mot-de-passe-oublie`);
}
