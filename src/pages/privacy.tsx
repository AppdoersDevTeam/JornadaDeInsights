import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { motion } from 'framer-motion';
import { ArrowLeft } from 'lucide-react';
import { useLanguage } from '@/context/language-context';

export function PrivacyPage() {
  const { t } = useLanguage();

  return (
    <main className="min-h-screen bg-background">
      <div className="container mx-auto px-6 sm:px-8 lg:px-10 py-12 pt-24">
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5 }}
          className="mb-8"
        >
          <Button variant="ghost" asChild className="gap-2">
            <Link to="/">
              <ArrowLeft className="h-4 w-4" />
              {t('common.backHome', 'Voltar para Home')}
            </Link>
          </Button>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="mb-12"
        >
          <h1 className="text-4xl font-heading font-bold mb-4 text-foreground">{t('privacy.title', '')}</h1>
          <p className="text-muted-foreground">{t('privacy.effectiveDate', '')}</p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="prose prose-lg dark:prose-invert max-w-none"
        >
          <section className="mb-8">
            <h2 className="text-2xl font-heading font-semibold mb-4 text-foreground">{t('privacy.s1.h', '')}</h2>
            <p className="text-muted-foreground mb-4">{t('privacy.s1.p', '')}</p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-heading font-semibold mb-4 text-foreground">{t('privacy.s2.h', '')}</h2>
            <p className="text-muted-foreground mb-4">{t('privacy.s2.intro', '')}</p>
            <ul className="list-disc pl-6 text-muted-foreground mb-4">
              <li>{t('privacy.s2.li1', '')}</li>
              <li>{t('privacy.s2.li2', '')}</li>
              <li>{t('privacy.s2.li3', '')}</li>
              <li>{t('privacy.s2.li4', '')}</li>
              <li>{t('privacy.s2.li5', '')}</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-heading font-semibold mb-4 text-foreground">{t('privacy.s3.h', '')}</h2>
            <p className="text-muted-foreground mb-4">{t('privacy.s3.intro', '')}</p>
            <ul className="list-disc pl-6 text-muted-foreground mb-4">
              <li>{t('privacy.s3.li1', '')}</li>
              <li>{t('privacy.s3.li2', '')}</li>
              <li>{t('privacy.s3.li3', '')}</li>
              <li>{t('privacy.s3.li4', '')}</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-heading font-semibold mb-4 text-foreground">{t('privacy.s4.h', '')}</h2>
            <p className="text-muted-foreground mb-4">{t('privacy.s4.p', '')}</p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-heading font-semibold mb-4 text-foreground">{t('privacy.s5.h', '')}</h2>
            <p className="text-muted-foreground mb-4">{t('privacy.s5.p', '')}</p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-heading font-semibold mb-4 text-foreground">{t('privacy.s6.h', '')}</h2>
            <p className="text-muted-foreground mb-4">{t('privacy.s6.p', '')}</p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-heading font-semibold mb-4 text-foreground">{t('privacy.s7.h', '')}</h2>
            <p className="text-muted-foreground mb-4">{t('privacy.s7.p', '')}</p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-heading font-semibold mb-4 text-foreground">{t('privacy.s8.h', '')}</h2>
            <p className="text-muted-foreground mb-4">{t('privacy.s8.p', '')}</p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-heading font-semibold mb-4 text-foreground">{t('privacy.contact.h', '')}</h2>
            <p className="text-muted-foreground mb-4">{t('privacy.contact.intro', '')}</p>
            <div className="bg-muted/30 p-6 rounded-lg">
              <p className="text-muted-foreground mb-2">{t('privacy.contact.org', '')}</p>
              <p className="text-muted-foreground mb-2">
                {t('privacy.contact.emailLabel', '')} suporte@jornadadeinsights.com
              </p>
              <p className="text-muted-foreground">
                {t('privacy.contact.phoneLabel', '')} +64 9 123 4567
              </p>
            </div>
          </section>
        </motion.div>
      </div>
    </main>
  );
}
