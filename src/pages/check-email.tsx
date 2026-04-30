import { CheckCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';
import { useLanguage } from '@/context/language-context';

export function CheckEmailPage() {
  const { t } = useLanguage();
  return (
    <section className="pt-24 pb-12 bg-gradient-to-br from-primary/10 to-background min-h-screen">
      <div className="container mx-auto px-6 sm:px-8 lg:px-10">
        <div className="max-w-2xl mx-auto text-center">
          <CheckCircle className="mx-auto mb-6 h-16 w-16 text-primary" />
          <h1 className="text-3xl md:text-4xl font-heading font-bold mb-4">
            {t('check.title', 'Check your email')}
          </h1>
          <p className="text-lg text-muted-foreground mb-8">
            {t('check.body', 'We sent a confirmation link. Please open your inbox and click the link to verify your email.')}
          </p>
          <Button asChild size="lg">
            <Link to="/signin">{t('check.back', 'Back to sign in')}</Link>
          </Button>
        </div>
      </div>
    </section>
  );
} 