import { useState } from 'react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { CheckCircle } from 'lucide-react';

export function NewsletterForm() {
  const [email, setEmail] = useState('');
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    
    // Simulate API call
    setTimeout(() => {
      setIsLoading(false);
      setIsSubmitted(true);
      setEmail('');
    }, 1000);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 50 }}
      whileInView={{ opacity: 1, y: 0 }}
      transition={{ type: 'spring', stiffness: 300, bounce: 0.4 }}
      viewport={{ once: true }}
      className="bg-primary/5 rounded-lg p-6 md:p-8"
    >
      <h3 className="text-xl md:text-2xl font-heading font-semibold mb-2">
        Fique Atualizado
      </h3>
      <p className="text-muted-foreground mb-4">
        Assine para receber os últimos episódios, eBooks e conteúdos exclusivos.
      </p>
      
      {isSubmitted ? (
        <div className="bg-secondary/10 text-secondary rounded-md p-4 flex items-center gap-3 animate-in">
          <CheckCircle className="h-5 w-5" />
          <span>Obrigada por se inscrever! Verifique seu email para confirmar.</span>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="flex flex-col sm:flex-row gap-3">
            <motion.input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Seu endereço de email"
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
                {isLoading ? 'Inscrevendo...' : 'Inscreva-se'}
              </Button>
            </motion.div>
          </div>
          <p className="text-xs text-muted-foreground">
            Ao se inscrever, você concorda com nossa Política de Privacidade e concorda em receber atualizações da nossa empresa.
          </p>
        </form>
      )}
    </motion.div>
  );
}