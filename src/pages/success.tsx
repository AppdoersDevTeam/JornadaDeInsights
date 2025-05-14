import { useEffect, useState, useRef } from 'react';
import { Link, useSearchParams, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { CheckCircle } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { auth } from '@/lib/firebase';

// Server URL
const SERVER_URL = import.meta.env.VITE_SERVER_URL || 'http://localhost:3000';
console.log('Using server URL:', SERVER_URL);

export function SuccessPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(true);
  const sessionId = searchParams.get('session_id');

  useEffect(() => {
    console.log('SuccessPage mounted, sessionId:', sessionId);
    
    const handleSuccessfulPurchase = async () => {
      if (!sessionId) {
        console.log('No sessionId, skipping email');
        setIsLoading(false);
        return;
      }

      // Check if email was already sent for this session
      const emailSentKey = `email_sent_${sessionId}`;
      const emailSentData = sessionStorage.getItem(emailSentKey);
      
      if (emailSentData) {
        const { timestamp } = JSON.parse(emailSentData);
        // If email was sent less than 5 seconds ago, consider it a duplicate
        if (Date.now() - timestamp < 5000) {
          console.log('Email already sent for session:', sessionId);
          setIsLoading(false);
          return;
        }
      }

      try {
        console.log('Starting email send process for session:', sessionId);
        
        // Wait for auth state to be ready
        await new Promise((resolve) => {
          const unsubscribe = auth.onAuthStateChanged((user) => {
            unsubscribe();
            resolve(user);
          });
        });

        const user = auth.currentUser;
        if (!user) {
          console.error('No authenticated user found');
          toast.error('Por favor, faça login para receber o e-mail de confirmação da compra');
          setIsLoading(false);
          return;
        }

        // Send purchase confirmation email
        const response = await fetch(`${SERVER_URL}/send-purchase-email`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            sessionId,
            customerEmail: user.email,
            customerName: user.displayName || user.email,
          }),
        });

        const data = await response.json();

        if (!response.ok) {
          console.error('Email sending failed:', data);
          throw new Error(data.error || 'Failed to send confirmation email');
        }

        // Mark this session as having sent the email with timestamp
        sessionStorage.setItem(emailSentKey, JSON.stringify({
          sent: true,
          timestamp: Date.now()
        }));
        
        console.log('Email sent successfully for session:', sessionId);
        toast.success('E-mail de confirmação de compra enviado!');
      } catch (error: any) {
        console.error('Erro ao enviar e-mail de confirmação de compra:', error);
        const errorMessage = error.message || 'Falha ao enviar e-mail de confirmação de compra';
        toast.error(
          <div>
            <p>{errorMessage}</p>
            <p className="text-sm mt-1">Você ainda pode acessar seus eBooks no seu painel.</p>
          </div>,
          { duration: 5000 }
        );
      } finally {
        setIsLoading(false);
      }
    };

    handleSuccessfulPurchase();

    // Cleanup function to prevent memory leaks
    return () => {
      console.log('SuccessPage cleanup');
    };
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
              'Seu pagamento foi realizado com sucesso. Você pode acessar seus eBooks no seu painel. Um e-mail de confirmação foi enviado com mais detalhes.'
            )}
          </p>
          <div className="space-y-4">
            <Button asChild size="lg">
              <Link to="/user-dashboard?tab=ebooks">Ir para meus eBooks</Link>
            </Button>
            <Button variant="outline" asChild size="lg">
              <Link to="/shop">Continuar comprando</Link>
            </Button>
            <p className="text-sm text-muted-foreground">
              Precisa de ajuda? <Link to="/contact" className="text-primary hover:underline">Contate-nos</Link>
            </p>
          </div>
        </div>
      </div>
    </section>
  );
} 