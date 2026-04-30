import { useEffect, useState } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { CheckCircle, XCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { supabase } from '@/lib/supabase';
import { useLanguage } from '@/context/language-context';

export function ConfirmEmailPage() {
  const { t } = useLanguage();
  const [searchParams] = useSearchParams();
  const tokenHash = searchParams.get('token_hash');
  const type = searchParams.get('type');
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');

  useEffect(() => {
    if (!tokenHash || !type) {
      setStatus('error');
      return;
    }
    supabase.auth.verifyOtp({
      token_hash: tokenHash,
      type: type as 'email'
    })
      .then(() => {
        setStatus('success');
      })
      .catch((error) => {
        console.error('Error verifying email:', error);
        setStatus('error');
      });
  }, [tokenHash, type]);

  if (status === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <section className="pt-24 pb-12 bg-gradient-to-br from-primary/10 to-background min-h-screen">
      <div className="container mx-auto px-6 sm:px-8 lg:px-10">
        <div className="max-w-2xl mx-auto text-center">
          {status === 'success' ? (
            <>
              <CheckCircle className="mx-auto mb-6 h-16 w-16 text-primary" />
              <h1 className="text-3xl md:text-4xl font-heading font-bold mb-4">
                {t('confirm.successTitle', 'Email confirmed!')}
              </h1>
              <p className="text-lg text-muted-foreground mb-8">
                {t('confirm.successBody', 'Your email is verified. You can open your dashboard.')}
              </p>
              <Button asChild size="lg">
                <Link to="/user-dashboard">{t('confirm.cta', 'Go to dashboard')}</Link>
              </Button>
            </>
          ) : (
            <>
              <XCircle className="mx-auto mb-6 h-16 w-16 text-destructive" />
              <h1 className="text-3xl md:text-4xl font-heading font-bold mb-4">
                {t('confirm.failTitle', 'Confirmation failed')}
              </h1>
              <p className="text-lg text-muted-foreground mb-8">
                {t('confirm.failBody', 'We could not confirm your email. The link may have expired.')}
              </p>
              <Button asChild size="lg">
                <Link to="/signin">{t('confirm.retry', 'Back to sign in')}</Link>
              </Button>
            </>
          )}
        </div>
      </div>
    </section>
  );
} 