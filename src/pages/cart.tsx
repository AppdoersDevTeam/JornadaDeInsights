import { Link, useNavigate, useLocation } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { ShoppingCart, X, Plus, Minus } from 'lucide-react';
import { useCart } from '@/context/cart-context';
import { loadStripe } from '@stripe/stripe-js';
import { toast } from 'react-hot-toast';
import { supabase } from '@/lib/supabase';
import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogFooter, DialogTitle, DialogDescription, DialogClose } from '@/components/ui/dialog';
import { LazyImage } from '@/components/shop/lazy-image';
import { trackLifecycleEvent } from '@/lib/lifecycle';
import { useLanguage } from '@/context/language-context';

// Initialize Stripe
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
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [recommendedEbooks, setRecommendedEbooks] = useState<Ebook[]>([]);
  const { state: { items }, totalCount, totalPrice, clearCart, addItem, removeItem, decrementItem } = useCart();

  // Check authentication status
  useEffect(() => {
    const { data: authListener } = supabase.auth.onAuthStateChange((_event, session) => {
      const user = session?.user;
      setIsAuthenticated(!!user);
      // If user just signed in and we have saved cart state, restore it
      if (user) {
        const savedCart = sessionStorage.getItem('cartState');
        if (savedCart) {
          try {
            const parsedCart = JSON.parse(savedCart) as CartItem[];
            // Clear current cart and restore saved items
            clearCart();
            parsedCart.forEach((item) => {
              // Ensure required fields are present
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
            // Close auth modal if open
            setShowAuthModal(false);
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
  }, [items]);

  const formatPrice = (value: number) =>
    new Intl.NumberFormat(language === 'en' ? 'en' : 'pt-BR', { style: 'currency', currency: 'BRL' }).format(value);

  const handleCheckout = async () => {
    // If not authenticated, show auth modal and redirect to sign in
    if (!isAuthenticated) {
      // Store current cart state in sessionStorage
      sessionStorage.setItem('cartState', JSON.stringify(items));
      // Navigate to sign in with return path
      navigate('/signin', { 
        state: { 
          from: location.pathname,
          returnTo: '/cart'
        } 
      });
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

      // Create checkout session
      const response = await fetch(`${API_BASE_URL}/api/create-checkout-session`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          customerEmail: user?.email ?? undefined,
          items: items.map(item => {
            // Ensure image URL is absolute and uses HTTPS
            let imageUrl = item.cover_url;
            if (imageUrl) {
              try {
                // Parse the URL to handle it properly
                const url = new URL(imageUrl, window.location.origin);
                
                // Remove any query parameters or fragments
                url.search = '';
                url.hash = '';
                
                // Ensure HTTPS
                url.protocol = 'https:';
                
                // Get the final URL
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
              price: Math.round(item.price * 100), // Convert to cents
              quantity: item.quantity,
              image: imageUrl || undefined, // Use formatted image URL
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

      // Redirect to Stripe Checkout
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

  const handleAuthRedirect = () => {
    // Store current cart state in sessionStorage
    sessionStorage.setItem('cartState', JSON.stringify(items));
    // Navigate to sign in with return path
    navigate('/signin', { 
      state: { 
        from: location.pathname,
        returnTo: '/cart'
      } 
    });
  };

  return (
    <>
      {/* Hero Section */}
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
                  <p className="text-2xl font-bold">{formatPrice(totalPrice)}</p>
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
                          >
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

      {/* Auth required modal */}
      <Dialog open={showAuthModal} onOpenChange={setShowAuthModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('cart.auth.title', 'Attention')}</DialogTitle>
            <DialogDescription>
              {t('cart.auth.body', 'You need to be signed in to complete checkout. Continue?')}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAuthModal(false)}>{t('cart.auth.cancel', 'Cancel')}</Button>
            <Button onClick={handleAuthRedirect}>
              {t('cart.auth.continue', 'Continue')}
            </Button>
          </DialogFooter>
          <DialogClose />
        </DialogContent>
      </Dialog>
    </>
  );
} 