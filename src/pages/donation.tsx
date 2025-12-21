import { useState } from 'react';
import { loadStripe } from '@stripe/stripe-js';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { motion } from 'framer-motion';
import { Heart, ArrowRight } from 'lucide-react';
import toast from 'react-hot-toast';

const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY);

const PRESET_AMOUNTS = [25, 50, 100, 250, 500];

export function DonationPage() {
  const [amount, setAmount] = useState<number | ''>('');
  const [customAmount, setCustomAmount] = useState('');
  const [note, setNote] = useState('');
  const [isRecurring, setIsRecurring] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);

  const handleAmountSelect = (value: number) => {
    setAmount(value);
    setCustomAmount('');
  };

  const handleCustomAmountChange = (value: string) => {
    setCustomAmount(value);
    setAmount('');
  };

  const getFinalAmount = (): number => {
    if (customAmount) {
      const parsed = parseFloat(customAmount);
      return isNaN(parsed) || parsed <= 0 ? 0 : parsed;
    }
    return typeof amount === 'number' ? amount : 0;
  };

  const formatPrice = (value: number): string => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };

  const handleDonate = async () => {
    const finalAmount = getFinalAmount();
    
    if (finalAmount <= 0) {
      toast.error('Por favor, selecione ou insira um valor válido');
      return;
    }

    if (finalAmount < 5) {
      toast.error('O valor mínimo da doação é R$ 5,00');
      return;
    }

    setIsProcessing(true);

    try {
      const apiUrl = import.meta.env.PROD
        ? 'https://jornadadeinsights.com'
        : process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';

      // Create donation checkout session
      const response = await fetch(`${apiUrl}/api/create-donation-session`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          amount: Math.round(finalAmount * 100), // Convert to cents
          note: note.trim() || undefined,
          isRecurring,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Falha ao criar sessão de pagamento');
      }

      const { sessionId } = await response.json();

      // Redirect to Stripe Checkout
      const stripe = await stripePromise;
      if (!stripe) {
        throw new Error('Stripe não foi carregado corretamente');
      }

      const result = await stripe.redirectToCheckout({
        sessionId,
      });

      if (result.error) {
        throw new Error(result.error.message);
      }
    } catch (error) {
      console.error('Error processing donation:', error);
      toast.error(
        error instanceof Error 
          ? error.message 
          : 'Ocorreu um erro ao processar sua doação. Por favor, tente novamente.'
      );
      setIsProcessing(false);
    }
  };

  const finalAmount = getFinalAmount();

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/10 to-background py-16">
      <div className="container mx-auto px-6 sm:px-8 lg:px-10">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="max-w-2xl mx-auto"
        >
          <Card className="shadow-lg">
            <CardHeader className="text-center">
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.2, type: 'spring' }}
                className="mx-auto mb-4 w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center"
              >
                <Heart className="h-8 w-8 text-primary" fill="currentColor" />
              </motion.div>
              <CardTitle className="text-3xl font-heading">Apoie Meu Trabalho</CardTitle>
              <CardDescription className="text-lg mt-2">
                Sua generosidade permite que eu continue compartilhando a Palavra de Deus e criando conteúdo que transforma vidas.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Amount Selection */}
              <div>
                <Label className="text-base font-medium mb-3 block">
                  Selecione o valor da doação
                </Label>
                <div className="grid grid-cols-3 sm:grid-cols-5 gap-3 mb-4">
                  {PRESET_AMOUNTS.map((presetAmount) => (
                    <motion.button
                      key={presetAmount}
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => handleAmountSelect(presetAmount)}
                      className={`p-3 rounded-lg border-2 transition-all ${
                        amount === presetAmount
                          ? 'border-primary bg-primary/10 text-primary font-semibold'
                          : 'border-border hover:border-primary/50'
                      }`}
                    >
                      <div className="text-sm font-medium">
                        R$ {presetAmount}
                      </div>
                    </motion.button>
                  ))}
                </div>
                <div className="relative">
                  <Input
                    type="number"
                    placeholder="Ou insira um valor personalizado"
                    value={customAmount}
                    onChange={(e) => handleCustomAmountChange(e.target.value)}
                    min="5"
                    step="0.01"
                    className="pr-8"
                  />
                  {customAmount && (
                    <div className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">
                      BRL
                    </div>
                  )}
                </div>
                {finalAmount > 0 && (
                  <motion.p
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="mt-2 text-sm text-muted-foreground"
                  >
                    Valor selecionado: <span className="font-semibold text-primary">{formatPrice(finalAmount)}</span>
                  </motion.p>
                )}
              </div>

              {/* Recurring Donation Toggle */}
              <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
                <div className="flex-1">
                  <Label htmlFor="recurring" className="text-base font-medium cursor-pointer">
                    Tornar esta doação recorrente
                  </Label>
                  <p className="text-sm text-muted-foreground mt-1">
                    Sua doação será cobrada mensalmente
                  </p>
                </div>
                <Switch
                  id="recurring"
                  checked={isRecurring}
                  onCheckedChange={setIsRecurring}
                />
              </div>

              {/* Note Field */}
              <div>
                <Label htmlFor="note" className="text-base font-medium mb-2 block">
                  Adicione uma mensagem (opcional)
                </Label>
                <Textarea
                  id="note"
                  placeholder="Deixe uma mensagem de encorajamento ou motivo da sua doação..."
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  rows={4}
                  maxLength={500}
                  className="resize-none"
                />
                <p className="text-xs text-muted-foreground mt-1 text-right">
                  {note.length}/500 caracteres
                </p>
              </div>

              {/* Summary */}
              {finalAmount > 0 && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="p-4 bg-primary/5 rounded-lg border border-primary/20"
                >
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-muted-foreground">Valor da doação:</span>
                    <span className="font-semibold text-lg">{formatPrice(finalAmount)}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground">Frequência:</span>
                    <span className="font-medium">
                      {isRecurring ? 'Mensal' : 'Única'}
                    </span>
                  </div>
                  {isRecurring && (
                    <p className="text-xs text-muted-foreground mt-2">
                      Você será cobrado {formatPrice(finalAmount)} todos os meses até cancelar
                    </p>
                  )}
                </motion.div>
              )}

              {/* Donate Button */}
              <Button
                size="lg"
                className="w-full"
                onClick={handleDonate}
                disabled={finalAmount <= 0 || isProcessing}
              >
                {isProcessing ? (
                  <>
                    Processando...
                  </>
                ) : (
                  <>
                    Finalizar Doação <ArrowRight className="ml-2 h-4 w-4" />
                  </>
                )}
              </Button>

              <p className="text-xs text-center text-muted-foreground">
                Seu pagamento é seguro e processado pela Stripe. Você pode cancelar sua doação recorrente a qualquer momento.
              </p>
            </CardContent>
          </Card>

          {/* Additional Info */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.4 }}
            className="mt-8 text-center"
          >
            <p className="text-sm text-muted-foreground">
              Obrigado por considerar apoiar este ministério. Cada contribuição faz a diferença!
            </p>
          </motion.div>
        </motion.div>
      </div>
    </div>
  );
}

