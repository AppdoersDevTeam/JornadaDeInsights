import { Link, useNavigate, useLocation } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { ShoppingCart, X, Plus, Minus, ShieldCheck, CreditCard } from 'lucide-react';
import { useCart } from '@/context/cart-context';
import { loadStripe } from '@stripe/stripe-js';
import { toast } from 'react-hot-toast';
import { supabase } from '@/lib/supabase';
import { useState, useEffect } from 'react';
import { LazyImage } from '@/components/shop/lazy-image';
import { trackLifecycleEvent } from '@/lib/lifecycle';
import { useLanguage } from '@/context/language-context';
import { Label } from '@/components/ui/label';

const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY);

const API_BASE_URL = import.meta.env.VITE_SERVER_URL || window.location.origin;

interface CartItem {
  id: string;
  title: string;
  price: number;
  quantity: number;
  cover_url?: string;
  description?: string;
  filename?: string;
  created_at: string;
}

interface Ebook {
  id: string;
  title: string;
  description: string;
  price: number;
  filename: string;
  cover_url?: string;
  created_at: string;
}

export function CartPage() {
  const { t, language } = useLanguage();
  const navigate = useNavigate();
  const location = useLocation();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [showAuthGate, setShowAuthGate] = useState(false);
  const [recommendedEbooks, setRecommendedEbooks] = useState<Ebook[]>([]);
  const [displayCurrency, setDisplayCurrency] = useState<'BRL' | 'USD' | 'EUR' | 'GBP'>('BRL');
  const [fxRate, setFxRate] = useState<number | null>(null);
  const [fxLoading, setFxLoading] = useState(false);
  const { state: { items }, totalCount, totalPrice, clearCart, addItem, removeItem, decrementItem } = useCart();

  useEffect(() => {
    const { data: authListener } = supabase.auth.onAuthStateChange((_event, session) => {
      const user = session?.user;
      setIsAuthenticated(!!user);
      if (user) {
        setShowAuthGate(false);
        const savedCart = sessionStorage.getItem('cartState');
        if (savedCart) {
          try {
            const parsedCart = JSON.parse(savedCart) as CartItem[];
            clearCart();
            parsedCart.forEach((item) => {
              const ebookItem: Ebook = {
                id: item.id,
                title: item.title,
                description: item.description || '',
                price: item.price,
                filename: item.filename || item.id,
                cover_url: item.cover_url,
                created_at: item.created_at
              };
              addItem(ebookItem);
            });
            sessionStorage.removeItem('cartState');
          } catch (error) {
            console.error('Error restoring cart state:', error);
          }
        }
      }
    });

    return () => authListener.subscription.unsubscribe();
  }, [clearCart, addItem]);

  useEffect(() => {
    const loadRecommendations = async () => {
      try {
        const { data, error } = await supabase
          .from('ebooks_metadata')
          .select('*')
          .eq('content_locale', language)
          .order('created_at', { ascending: false })
          .limit(6);

        if (error) throw error;

        const cartIds = new Set(items.map((item) => item.id));
        const suggestions = (data || [])
          .filter((ebook) => !cartIds.has(ebook.id))
          .slice(0, 3)
          .map((ebook) => ({
            ...ebook,
            cover_url: ebook.filename
              ? supabase.storage.from('store-assets').getPublicUrl(`covers/${ebook.filename}`).data.publicUrl
              : undefined,
          }));

        setRecommendedEbooks(suggestions);
      } catch (error) {
        console.error('Failed to load recommendations:', error);
      }
    };

    if (items.length > 0) {
      loadRecommendations();
    } else {
      setRecommendedEbooks([]);
    }
  }, [items, language]);

  const formatPrice = (value: number) =>
    new Intl.NumberFormat(language === 'en' ? 'en' : 'pt-BR', { style: 'currency', currency: 'BRL' }).format(value);

  const formatDisplayTotal = () => {
    if (displayCurrency === 'BRL' || !fxRate) return formatPrice(totalPrice);
    return new Intl.NumberFormat(language === 'en' ? 'en' : 'pt-BR', {
      style: 'currency',
      currency: displayCurrency,
    }).format(totalPrice * fxRate);
  };

  useEffect(() => {
    const loadFx = async () => {
      if (displayCurrency === 'BRL') {
        setFxRate(null);
        return;
      }
      try {
        setFxLoading(true);
        const res = await fetch(`/api/fx-rate?target=${displayCurrency}`);
        if (!res.ok) throw new Error('FX failed');
        const data = await res.json();
        const rate = Number(data?.rate);
        setFxRate(Number.isFinite(rate) ? rate : null);
      } catch {
        setFxRate(null);
      } finally {
        setFxLoading(false);
      }
    };
    void loadFx();
  }, [displayCurrency]);

  const persistCartForAuth = () => {
    sessionStorage.setItem('cartState', JSON.stringify(items));
  };

  const goToSignIn = () => {
    persistCartForAuth();
    navigate('/signin', {
      state: {
        from: location.pathname,
        returnTo: '/cart',
      },
    });
  };

  const goToSignUp = () => {
    persistCartForAuth();
    navigate('/signup', {
      state: {
        from: location.pathname,
        returnTo: '/cart',
      },
    });
  };

  const handleCheckout = async () => {
    if (!isAuthenticated) {
      void trackLifecycleEvent('checkout_started', {
        itemCount: items.length,
        total: Number(totalPrice.toFixed(2)),
        userEmail: null,
      });
      persistCartForAuth();
      setShowAuthGate(true);
      return;
    }

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      await trackLifecycleEvent('checkout_started', {
        itemCount: items.length,
        total: Number(totalPrice.toFixed(2)),
        userEmail: user?.email ?? null,
      });
      const stripe = await stripePromise;
      if (!stripe) throw new Error('Stripe failed to initialize');

      const response = await fetch(`${API_BASE_URL}/api/create-checkout-session`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          customerEmail: user?.email ?? undefined,
          items: items.map(item => {
            let imageUrl = item.cover_url;
            if (imageUrl) {
              try {
                const url = new URL(imageUrl, window.location.origin);
                url.search = '';
                url.hash = '';
                url.protocol = 'https:';
                imageUrl = url.toString();
              } catch (error) {
                console.error('Error processing image URL:', error);
                imageUrl = undefined;
              }
            }

            return {
              id: item.id,
              name: item.title,
              description: `Digital eBook${item.description ? ` - ${item.description}` : ''}`,
              price: Math.round(item.price * 100),
              quantity: item.quantity,
              image: imageUrl || undefined,
              metadata: {
                type: 'ebook',
                layout: 'preppy',
                displayStyle: 'large_cover'
              }
            };
          }),
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to create checkout session');
      }

      const { sessionId } = await response.json();

      const result = await stripe.redirectToCheckout({
        sessionId,
      });

      if (result.error) {
        throw new Error(result.error.message);
      }
    } catch (error) {
      console.error('Erro ao iniciar o processo de checkout:', error);
      toast.error(t('cart.toast.checkoutFail', 'Could not start checkout. Please try again.'));
    }
  };

  return (
    <>
      <section className="pt-24 pb-12 bg-gradient-to-br from-primary/10 to-background">
        <div className="container mx-auto px-6 sm:px-8 lg:px-10">
          <div className="max-w-3xl mx-auto">
            <ShoppingCart className="mx-auto mb-4 h-12 w-12 text-primary" />
            <h1 className="text-3xl md:text-5xl font-heading font-bold mb-4 text-center">{t('cart.title', 'Your cart')}</h1>

            {totalCount === 0 ? (
              <div className="text-center">
                <p className="text-lg text-muted-foreground mb-6">{t('cart.empty', 'Your cart is empty.')}</p>
                <Button asChild size="lg">
                  <Link to="/shop">{t('cart.continue', 'Continue shopping')}</Link>
                </Button>
              </div>
            ) : (
              <div className="space-y-6">
                <div className="space-y-4">
                  {items.map(item => (
                    <div key={item.id} className="bg-card rounded-lg p-4 flex justify-between items-center">
                      <div className="flex items-center space-x-4">
                        <LazyImage
                          src={item.cover_url || ''}
                          alt={item.title}
                          className="w-20 h-20 object-cover rounded"
                        />
                        <div>
                          <h3 className="font-semibold">{item.title}</h3>
                          <p className="text-muted-foreground">{formatPrice(item.price)}</p>
                        </div>
                      </div>
                      <div className="flex items-center space-x-4">
                        <div className="flex items-center space-x-2">
                          <button
                            onClick={() => decrementItem(item.id)}
                            className="p-1 rounded border hover:bg-muted"
                            disabled={item.quantity <= 1}
                          >
                            <Minus className="h-4 w-4" />
                          </button>
                          <span>{item.quantity}</span>
                          <button
                            onClick={() => addItem(item)}
                            className="p-1 rounded border hover:bg-muted"
                          >
                            <Plus className="h-4 w-4" />
                          </button>
                        </div>
                        <button
                          onClick={() => removeItem(item.id)}
                          className="p-1 rounded border border-destructive text-destructive hover:bg-destructive/10"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="flex justify-between items-center mt-8">
                  <p className="text-xl font-semibold">{t('ud.cart.total', 'Total:')}</p>
                  <p className="text-2xl font-bold">{formatDisplayTotal()}</p>
                </div>
                <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
                  <div className="space-y-2">
                    <Label htmlFor="cart-display-currency">{t('cart.currency.label', 'Display currency')}</Label>
                    <select
                      id="cart-display-currency"
                      value={displayCurrency}
                      onChange={(e) => setDisplayCurrency(e.target.value as typeof displayCurrency)}
                      className="border px-3 py-2 rounded bg-background"
                    >
                      <option value="BRL">BRL</option>
                      <option value="USD">USD</option>
                      <option value="EUR">EUR</option>
                      <option value="GBP">GBP</option>
                    </select>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {fxLoading
                      ? t('cart.currency.loading', 'Loading exchange rate...')
                      : displayCurrency === 'BRL'
                        ? t('cart.currency.chargedInBrl', 'Charged in BRL at checkout.')
                        : fxRate
                          ? t('cart.currency.estimate', 'Estimate only. Charged in BRL at checkout.')
                          : t('cart.currency.unavailable', 'Exchange rate unavailable. Charged in BRL.')}
                  </p>
                </div>

                {showAuthGate && !isAuthenticated && (
                  <div className="rounded-lg border border-primary/30 bg-primary/5 p-5 space-y-4">
                    <h3 className="font-heading text-lg font-semibold">
                      {t('cart.authGate.title', 'Create a free account to get your PDFs')}
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      {t(
                        'cart.authGate.body',
                        'Sign in or create a free account so we can deliver your eBooks to your dashboard right after payment.',
                      )}
                    </p>
                    <div className="flex flex-col sm:flex-row gap-3">
                      <Button onClick={goToSignUp} className="flex-1">
                        {t('cart.authGate.signup', 'Create free account')}
                      </Button>
                      <Button variant="outline" onClick={goToSignIn} className="flex-1">
                        {t('cart.authGate.signin', 'Sign in')}
                      </Button>
                    </div>
                  </div>
                )}

                <div className="rounded-lg border border-border/60 bg-card/60 p-4 space-y-2">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <ShieldCheck className="h-4 w-4 text-primary flex-shrink-0" />
                    {t('cart.trust.stripe', 'Secure checkout powered by Stripe.')}
                  </div>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <CreditCard className="h-4 w-4 text-primary flex-shrink-0" />
                    {t('cart.trust.cards', 'Visa, Mastercard, and other cards accepted.')}
                  </div>
                </div>

                <div className="flex justify-center gap-4 mt-6">
                  <Button variant="outline" onClick={clearCart}>{t('cart.clear', 'Clear cart')}</Button>
                  <Button onClick={handleCheckout}>{t('cart.checkout', 'Checkout')}</Button>
                </div>

                {recommendedEbooks.length > 0 && (
                  <div className="pt-8 border-t">
                    <h3 className="text-lg font-semibold mb-3">{t('cart.crossSell.title', 'Add these complements')}</h3>
                    <p className="text-sm text-muted-foreground mb-4">
                      {t('cart.crossSell.subtitle', 'Suggested items to enrich your journey.')}
                    </p>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                      {recommendedEbooks.map((ebook) => (
                        <div key={ebook.id} className="border rounded-lg p-3">
                          <div className="flex items-center gap-3">
                            <LazyImage
                              src={ebook.cover_url || ''}
                              alt={ebook.title}
                              className="w-14 h-14 object-cover rounded"
                            />
                            <div className="flex-1">
                              <p className="font-medium line-clamp-1">{ebook.title}</p>
                              <p className="text-sm text-muted-foreground">{formatPrice(ebook.price)}</p>
                            </div>
                          </div>
                          <Button
                            variant="outline"
                            className="w-full mt-3"
                            onClick={() => addItem(ebook)}
                            aria-label={t('cart.crossSell.add', 'Add to cart')}
                          >
                            <ShoppingCart className="h-4 w-4 mr-2" />
                            {t('cart.crossSell.add', 'Add to cart')}
                          </Button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </section>
    </>
  );
}
