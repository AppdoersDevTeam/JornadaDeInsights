import { FormEvent, useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { useLanguage } from '@/context/language-context';

export function ForgotPasswordPage() {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const isRecoveryMode = useMemo(
    () => window.location.hash.includes('type=recovery'),
    []
  );

  useEffect(() => {
    if (!isRecoveryMode) {
      return;
    }

    void supabase.auth.getSession();
  }, [isRecoveryMode]);

  const handleEmailReset = async (event: FormEvent) => {
    event.preventDefault();
    setIsSubmitting(true);
    try {
      if (!email) {
        throw new Error(t('forgot.needEmail', 'Enter your email to reset your password.'));
      }

      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/forgot-password`,
      });
      if (error) throw error;

      toast.success(t('forgot.sent', 'Password reset email sent.'));
      setEmail('');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t('forgot.sendFail', 'Could not send reset email.'));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handlePasswordUpdate = async (event: FormEvent) => {
    event.preventDefault();
    setIsSubmitting(true);
    try {
      if (!password || password.length < 8) {
        throw new Error(t('forgot.passwordShort', 'New password must be at least 8 characters.'));
      }
      if (password !== confirmPassword) {
        throw new Error(t('forgot.passwordMismatch', 'Passwords do not match.'));
      }

      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;

      toast.success(t('forgot.updated', 'Password updated successfully.'));
      navigate('/signin');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t('forgot.updateFail', 'Could not update password.'));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <section className="min-h-[calc(100vh-4rem)] flex items-center justify-center bg-gradient-to-br from-primary/10 to-background py-16 mt-16">
      <div className="container mx-auto px-6 sm:px-8 lg:px-10 max-w-xl">
        <div className="bg-card p-8 rounded-lg border border-border/50 shadow-md">
          <h1 className="text-2xl font-heading font-bold mb-2">
            {isRecoveryMode
              ? t('forgot.page.resetTitle', 'Set new password')
              : t('forgot.page.forgotTitle', 'Forgot your password?')}
          </h1>
          <p className="text-sm text-muted-foreground mb-6">
            {isRecoveryMode
              ? t('forgot.page.resetDesc', 'Choose a new password to continue.')
              : t('forgot.page.forgotDesc', 'We will send a recovery link to your email.')}
          </p>

          {!isRecoveryMode ? (
            <form className="space-y-4" onSubmit={handleEmailReset}>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder={t('forgot.page.emailPlaceholder', 'Your email')}
                className="w-full px-4 py-2 rounded-md border border-input bg-background focus:outline-none focus:ring-2 focus:ring-primary"
                required
              />
              <Button type="submit" className="w-full" disabled={isSubmitting}>
                {isSubmitting
                  ? t('forgot.page.sendingReset', 'Sending...')
                  : t('forgot.page.sendReset', 'Send recovery link')}
              </Button>
            </form>
          ) : (
            <form className="space-y-4" onSubmit={handlePasswordUpdate}>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder={t('forgot.page.newPassword', 'New password')}
                className="w-full px-4 py-2 rounded-md border border-input bg-background focus:outline-none focus:ring-2 focus:ring-primary"
                required
              />
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder={t('forgot.page.confirmPassword', 'Confirm new password')}
                className="w-full px-4 py-2 rounded-md border border-input bg-background focus:outline-none focus:ring-2 focus:ring-primary"
                required
              />
              <Button type="submit" className="w-full" disabled={isSubmitting}>
                {isSubmitting
                  ? t('forgot.page.saving', 'Saving...')
                  : t('forgot.page.update', 'Update password')}
              </Button>
            </form>
          )}

          <div className="mt-6 text-center">
            <Link to="/signin" className="text-primary hover:underline text-sm">
              {t('forgot.page.backToLogin', 'Back to sign in')}
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
