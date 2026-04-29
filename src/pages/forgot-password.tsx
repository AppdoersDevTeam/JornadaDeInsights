import { FormEvent, useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';

export function ForgotPasswordPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const isRecoveryMode = useMemo(
    () => window.location.hash.includes('type=recovery'),
    []
  );

  useEffect(() => {
    if (!isRecoveryMode) {
      return;
    }

    // If recovery session is already active, no action needed.
    void supabase.auth.getSession();
  }, [isRecoveryMode]);

  const handleEmailReset = async (event: FormEvent) => {
    event.preventDefault();
    setIsSubmitting(true);
    try {
      if (!email) {
        throw new Error('Informe seu email para recuperar a senha.');
      }

      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/forgot-password`,
      });
      if (error) throw error;

      toast.success('Email de recuperação enviado.');
      setEmail('');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Falha ao enviar recuperação.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handlePasswordUpdate = async (event: FormEvent) => {
    event.preventDefault();
    setIsSubmitting(true);
    try {
      if (!password || password.length < 8) {
        throw new Error('A nova senha deve ter pelo menos 8 caracteres.');
      }
      if (password !== confirmPassword) {
        throw new Error('As senhas não coincidem.');
      }

      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;

      toast.success('Senha atualizada com sucesso.');
      navigate('/signin');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Falha ao atualizar senha.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <section className="min-h-[calc(100vh-4rem)] flex items-center justify-center bg-gradient-to-br from-primary/10 to-background py-16 mt-16">
      <div className="container mx-auto px-6 sm:px-8 lg:px-10 max-w-xl">
        <div className="bg-card p-8 rounded-lg border border-border/50 shadow-md">
          <h1 className="text-2xl font-heading font-bold mb-2">
            {isRecoveryMode ? 'Definir nova senha' : 'Esqueceu sua senha?'}
          </h1>
          <p className="text-sm text-muted-foreground mb-6">
            {isRecoveryMode
              ? 'Escolha uma nova senha para continuar.'
              : 'Enviaremos um link de recuperação para o seu email.'}
          </p>

          {!isRecoveryMode ? (
            <form className="space-y-4" onSubmit={handleEmailReset}>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Seu email"
                className="w-full px-4 py-2 rounded-md border border-input bg-background focus:outline-none focus:ring-2 focus:ring-primary"
                required
              />
              <Button type="submit" className="w-full" disabled={isSubmitting}>
                {isSubmitting ? 'Enviando...' : 'Enviar link de recuperação'}
              </Button>
            </form>
          ) : (
            <form className="space-y-4" onSubmit={handlePasswordUpdate}>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Nova senha"
                className="w-full px-4 py-2 rounded-md border border-input bg-background focus:outline-none focus:ring-2 focus:ring-primary"
                required
              />
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Confirmar nova senha"
                className="w-full px-4 py-2 rounded-md border border-input bg-background focus:outline-none focus:ring-2 focus:ring-primary"
                required
              />
              <Button type="submit" className="w-full" disabled={isSubmitting}>
                {isSubmitting ? 'Salvando...' : 'Atualizar senha'}
              </Button>
            </form>
          )}

          <div className="mt-6 text-center">
            <Link to="/signin" className="text-primary hover:underline text-sm">
              Voltar para login
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
