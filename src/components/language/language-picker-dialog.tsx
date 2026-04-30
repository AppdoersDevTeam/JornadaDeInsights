import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useLanguage } from '@/context/language-context';

export function LanguagePickerDialog() {
  const {
    isLanguagePromptOpen,
    closeLanguagePrompt,
    setLanguage,
    recommendedLanguage,
    t,
  } = useLanguage();

  return (
    <Dialog
      open={isLanguagePromptOpen}
      onOpenChange={(open) => {
        if (!open) closeLanguagePrompt();
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t('lang.title', 'Escolha seu idioma')}</DialogTitle>
          <DialogDescription>{t('lang.description', 'Você pode trocar a qualquer momento.')}</DialogDescription>
        </DialogHeader>
        <div className="grid grid-cols-1 gap-3 py-2">
          <Button variant="outline" onClick={() => setLanguage('pt-BR')}>
            {t('lang.portuguese', 'Português (Brasil)')}
          </Button>
          <Button variant="outline" onClick={() => setLanguage('en')}>
            {t('lang.english', 'English')}
          </Button>
        </div>
        <DialogFooter>
          <Button onClick={() => setLanguage(recommendedLanguage)}>
            {t('lang.useRecommended', 'Usar recomendado')}: {recommendedLanguage === 'en' ? 'English' : 'Português (Brasil)'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
