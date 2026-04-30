import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { XCircle } from 'lucide-react';
import { useLanguage } from '@/context/language-context';

export function CancelPage() {
  const { t } = useLanguage();
  return (
    <section className="pt-24 pb-12 bg-gradient-to-br from-primary/10 to-background min-h-screen">
      <div className="container mx-auto px-6 sm:px-8 lg:px-10">
        <div className="max-w-2xl mx-auto text-center">
          <XCircle className="mx-auto mb-6 h-16 w-16 text-destructive" />
          <h1 className="text-3xl md:text-4xl font-heading font-bold mb-4">
            {t('cancel.title', 'Checkout cancelled')}
          </h1>
          <p className="text-lg text-muted-foreground mb-8">
            {t('cancel.body', 'Your checkout was cancelled. You were not charged. Feel free to try again when you are ready.')}
          </p>
          <div className="space-y-4">
            <Button asChild size="lg">
              <Link to="/cart">{t('cancel.cta', 'Return to cart')}</Link>
            </Button>
            <p className="text-sm text-muted-foreground">
              {t('common.needHelp', 'Need help?')}{' '}
              <Link to="/contact" className="text-primary hover:underline">{t('common.contactUs', 'Contact us')}</Link>
            </p>
          </div>
        </div>
      </div>
    </section>
  );
} 