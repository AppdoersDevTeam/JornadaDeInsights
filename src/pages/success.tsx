import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { CheckCircle } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { trackLifecycleEvent } from '@/lib/lifecycle';

export function SuccessPage() {
  const [searchParams] = useSearchParams();
  const [isLoading, setIsLoading] = useState(true);
  const sessionId = searchParams.get('session_id');

  useEffect(() => {
    if (!sessionId) {
      setIsLoading(false);
      return;
    }

    const timer = window.setTimeout(() => {
      setIsLoading(false);
    }, 1200);

    return () => window.clearTimeout(timer);
  }, [sessionId]);

  useEffect(() => {
    // Only show toast if we have a session ID and haven't shown it before
    if (sessionId && !sessionStorage.getItem(`toast_shown_${sessionId}`)) {
      toast.success('Pagamento realizado com sucesso!', {
        duration: 4000,
        position: 'top-right',
      });
      // Mark this session as having shown the toast
      sessionStorage.setItem(`toast_shown_${sessionId}`, 'true');
      void trackLifecycleEvent('purchase_completed', { sessionId });
    }
  }, [sessionId]);

  return (
    <section className="pt-24 pb-12 bg-gradient-to-br from-primary/10 to-background min-h-screen">
      <div className="container mx-auto px-6 sm:px-8 lg:px-10">
        <div className="max-w-2xl mx-auto text-center">
          <CheckCircle className="mx-auto mb-6 h-16 w-16 text-primary" />
          <h1 className="text-3xl md:text-4xl font-heading font-bold mb-4">
            Obrigado pela sua compra!
          </h1>
          <p className="text-lg text-muted-foreground mb-8">
            {isLoading ? (
              'Processando sua compra...'
            ) : (
              'Seu pagamento foi realizado com sucesso. Você pode acessar seus eBooks no seu painel. O email de confirmacao e enviado automaticamente.'
            )}
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button asChild size="lg">
              <Link to="/user-dashboard?tab=ebooks">Ir para meus eBooks</Link>
            </Button>
            <Button variant="outline" asChild size="lg">
              <Link to="/shop">Continuar comprando</Link>
            </Button>
          </div>
          <p className="text-sm text-muted-foreground mt-6">
            Precisa de ajuda? <Link to="/contact" className="text-primary hover:underline">Contate-nos</Link>
          </p>
        </div>
      </div>
    </section>
  );
} 