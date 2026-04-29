import { useEffect, useState } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { CheckCircle, XCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { supabase } from '@/lib/supabase';

export function ConfirmEmailPage() {
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
        console.error('Erro ao verificar o email:', error);
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
                Email confirmado com sucesso!
              </h1>
              <p className="text-lg text-muted-foreground mb-8">
                Seu email foi verificado. Agora você pode acessar seu painel.
              </p>
              <Button asChild size="lg">
                <Link to="/user-dashboard">Ir para o painel</Link>
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