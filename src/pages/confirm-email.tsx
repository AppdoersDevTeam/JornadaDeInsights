import { useEffect, useState } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { auth } from '@/lib/firebase';
import { applyActionCode } from 'firebase/auth';
import { CheckCircle, XCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';

export function ConfirmEmailPage() {
  const [searchParams] = useSearchParams();
  const code = searchParams.get('oobCode');
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');

  useEffect(() => {
    if (!code) {
      setStatus('error');
      return;
    }
    applyActionCode(auth, code)
      .then(() => {
        setStatus('success');
      })
      .catch((error) => {
        console.error('Error verifying email:', error);
        setStatus('error');
      });
  }, [code]);

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
                Email confirmado com sucesso!
              </h1>
              <p className="text-lg text-muted-foreground mb-8">
                Seu email foi verificado. Agora você pode acessar seu painel.
              </p>
              <Button asChild size="lg">
                <Link to="/user-dashboard">Ir para Dashboard</Link>
              </Button>
            </>
          ) : (
            <>
              <XCircle className="mx-auto mb-6 h-16 w-16 text-destructive" />
              <h1 className="text-3xl md:text-4xl font-heading font-bold mb-4">
                Falha na confirmação
              </h1>
              <p className="text-lg text-muted-foreground mb-8">
                Não foi possível confirmar seu email. O link pode ter expirado ou ser inválido.
              </p>
              <Button asChild size="lg">
                <Link to="/signin">Voltar para Entrar</Link>
              </Button>
            </>
          )}
        </div>
      </div>
    </section>
  );
} 