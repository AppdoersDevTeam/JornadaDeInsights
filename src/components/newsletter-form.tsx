import { useState } from 'react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { CheckCircle, AlertCircle } from 'lucide-react';
import { trackLifecycleEvent } from '@/lib/lifecycle';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useLanguage } from '@/context/language-context';

export function NewsletterForm() {
  const { t } = useLanguage();
  const API_BASE_URL = import.meta.env.VITE_SERVER_URL || window.location.origin;
  const [email, setEmail] = useState('');
  const [consentMarketing, setConsentMarketing] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [showComingSoon, setShowComingSoon] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!consentMarketing) {
      setShowComingSoon(true);
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch(`${API_BASE_URL}/api/lead-capture`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email,
          consentMarketing: true,
          source: 'homepage_newsletter',
        }),
      });

      if (!response.ok) {
        throw new Error(t('newsletter.errorSend', 'Falha ao enviar email'));
      }

      await trackLifecycleEvent('lead_captured', { source: 'homepage_newsletter' });
      setIsSubmitted(true);
      setEmail('');
      setConsentMarketing(false);
    } catch {
      setShowComingSoon(true);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <motion.div
        initial={{ opacity: 0, y: 50 }}
        whileInView={{ opacity: 1, y: 0 }}
        transition={{ type: 'spring', stiffness: 300, bounce: 0.4 }}
        viewport={{ once: true }}
        className="bg-primary/5 rounded-lg p-6 md:p-8"
      >
        <h3 className="text-xl md:text-2xl font-heading font-semibold mb-2">{t('newsletter.title', '')}</h3>
        <p className="text-muted-foreground mb-4">{t('newsletter.blurb', '')}</p>
        
        {isSubmitted ? (
          <div className="bg-secondary/10 text-secondary rounded-md p-4 flex items-center gap-3 animate-in">
            <CheckCircle className="h-5 w-5" />
            <span>{t('newsletter.success', '')}</span>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="flex flex-col sm:flex-row gap-3">
              <motion.input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder={t('newsletter.emailPlaceholder', '')}
                className="flex-1 px-4 py-2 rounded-md border border-input bg-background"
                required
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4 }}
                viewport={{ once: true }}
              />
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: 0.2 }}
                viewport={{ once: true }}
              >
                <Button type="submit" disabled={isLoading}>
                  {isLoading ? t('newsletter.submitting', '') : t('newsletter.submit', '')}
                </Button>
              </motion.div>
            </div>
            <p className="text-xs text-muted-foreground">{t('newsletter.legal', '')}</p>
            <label className="flex items-start gap-2 text-xs text-muted-foreground">
              <input
                type="checkbox"
                checked={consentMarketing}
                onChange={(e) => setConsentMarketing(e.target.checked)}
                className="mt-0.5"
                required
              />
              {t('newsletter.consent', '')}
            </label>
          </form>
        )}
      </motion.div>

      <Dialog open={showComingSoon} onOpenChange={setShowComingSoon}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-primary" />
              {t('newsletter.dialog.errorTitle', '')}
            </DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <p className="text-muted-foreground">{t('newsletter.dialog.errorBody', '')}</p>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}