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
import { trackLifecycleEvent } from '@/lib/lifecycle';
import { useLanguage } from '@/context/language-context';

const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY);
const API_BASE_URL = import.meta.env.VITE_SERVER_URL || window.location.origin;

const PRESET_AMOUNTS = [25, 50, 100, 250, 500];

export function DonationPage() {
  const { t, language } = useLanguage();
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
    return new Intl.NumberFormat(language === 'en' ? 'en' : 'pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };

  const handleDonate = async () => {
    const finalAmount = getFinalAmount();
    
    if (finalAmount <= 0) {
      toast.error(t('donation.toast.invalid', 'Please select or enter a valid amount'));
      return;
    }

    if (finalAmount < 5) {
      toast.error(t('donation.toast.min', 'The minimum donation is R$5.00'));
      return;
    }

    setIsProcessing(true);

    try {
      await trackLifecycleEvent('donation_started', {
        amount: Number(finalAmount.toFixed(2)),
        recurring: isRecurring,
      });
      // Create donation checkout session
      const response = await fetch(`${API_BASE_URL}/api/create-donation-session`, {
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
        throw new Error(error.error || t('donation.error.generic', 'Something went wrong processing your donation. Please try again.'));
      }

      const { sessionId } = await response.json();

      // Redirect to Stripe Checkout
      const stripe = await stripePromise;
      if (!stripe) {
        throw new Error(t('common.error', 'Error'));
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
          : t('donation.error.generic', 'Something went wrong processing your donation. Please try again.')
      );
      setIsProcessing(false);
    }
  };

  const finalAmount = getFinalAmount();

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/10 to-background pt-24 pb-16">
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
              <CardTitle className="text-3xl font-heading">{t('donation.title', 'Support this ministry')}</CardTitle>
              <CardDescription className="text-lg mt-2">
                {t('donation.subtitle', 'Your generosity helps me keep sharing God’s Word and creating life-changing content.')}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Amount Selection */}
              <div>
                <Label className="text-base font-medium mb-3 block">
                  {t('donation.amountLabel', 'Choose an amount')}
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
                      <div className="text-sm font-medium">{formatPrice(presetAmount)}</div>
                    </motion.button>
                  ))}
                </div>
                <div className="relative">
                  <Input
                    type="number"
                    placeholder={t('donation.customPlaceholder', 'Or enter a custom amount')}
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
                    {t('donation.selected', 'Selected amount:')}{' '}
                    <span className="font-semibold text-primary">{formatPrice(finalAmount)}</span>
                  </motion.p>
                )}
              </div>

              {/* Recurring Donation Toggle */}
              <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
                <div className="flex-1">
                  <Label htmlFor="recurring" className="text-base font-medium cursor-pointer">
                    {t('donation.recurring.label', 'Make this donation recurring')}
                  </Label>
                  <p className="text-sm text-muted-foreground mt-1">
                    {t('donation.recurring.hint', 'Your gift will be charged each month')}
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
                  {t('donation.note.label', 'Add a message (optional)')}
                </Label>
                <Textarea
                  id="note"
                  placeholder={t('donation.note.placeholder', 'Share an encouragement or why you are giving...')}
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  rows={4}
                  maxLength={500}
                  className="resize-none"
                />
                <p className="text-xs text-muted-foreground mt-1 text-right">
                  {note.length}/500 {t('donation.note.counter', 'characters')}
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
                    <span className="text-muted-foreground">{t('donation.summary.amount', 'Donation amount:')}</span>
                    <span className="font-semibold text-lg">{formatPrice(finalAmount)}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground">{t('donation.summary.freq', 'Frequency:')}</span>
                    <span className="font-medium">
                      {isRecurring ? t('donation.freq.monthly', 'Monthly') : t('donation.freq.once', 'One-time')}
                    </span>
                  </div>
                  {isRecurring && (
                    <p className="text-xs text-muted-foreground mt-2">
                      {t('donation.recurring.charge', 'You will be charged {amount} each month until you cancel').replace('{amount}', formatPrice(finalAmount))}
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
                    {t('common.processing', 'Processing...')}
                  </>
                ) : (
                  <>
                    {t('donation.cta', 'Complete donation')} <ArrowRight className="ml-2 h-4 w-4" />
                  </>
                )}
              </Button>

              <p className="text-xs text-center text-muted-foreground">
                {t('donation.footer', 'Payments are secure via Stripe. You can cancel a recurring donation at any time.')}
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
              {t('donation.thanks', 'Thank you for considering a gift—every contribution matters.')}
            </p>
          </motion.div>
        </motion.div>
      </div>
    </div>
  );
}

