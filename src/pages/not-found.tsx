import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { useLanguage } from '@/context/language-context';

export function NotFoundPage() {
  const { t } = useLanguage();

  return (
    <section className="min-h-[60vh] flex items-center justify-center py-24 px-4">
      <div className="max-w-md text-center space-y-6">
        <h1 className="text-4xl font-heading font-bold">404</h1>
        <p className="text-muted-foreground">
          {t('notFound.body', 'This page could not be found.')}
        </p>
        <Button asChild>
          <Link to="/">{t('common.backHome', 'Back to home')}</Link>
        </Button>
      </div>
    </section>
  );
}
