import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { CheckCircle } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { trackLifecycleEvent } from '@/lib/lifecycle';
import { useLanguage } from '@/context/language-context';
import { useCart } from '@/context/cart-context';
import { EbookCard, type Ebook } from '@/components/shop/ebook-card';
import { getEbooks } from '@/lib/supabase';

interface PurchasedCourse {
  id: string;
  slug?: string;
}

/** Read what was bought before the cart is cleared: the checkout snapshot, else the cart itself. */
const readPurchasedCourses = (cartItems: Array<{ type: string; id: string; slug?: string }>): PurchasedCourse[] => {
  let source: Array<{ type?: string; id?: string; slug?: string }> = cartItems;
  try {
    const raw = sessionStorage.getItem('jdi_last_checkout');
    if (raw) source = JSON.parse(raw) as typeof source;
  } catch {
    // fall back to the cart
  }
  return source
    .filter((item) => item.type === 'course' && typeof item.id === 'string')
    .map((item) => ({ id: item.id as string, slug: item.slug }));
};

export function SuccessPage() {
  const { t, language } = useLanguage();
  const {
    state: { items: cartItems },
    clearCart,
  } = useCart();
  const [searchParams] = useSearchParams();
  const [purchasedCourses] = useState(() => readPurchasedCourses(cartItems));
  const courseLink =
    purchasedCourses.length === 1 && purchasedCourses[0].slug
      ? `/user-dashboard/courses/${purchasedCourses[0].slug}`
      : '/user-dashboard?tab=courses';
  const [isLoading, setIsLoading] = useState(true);
  const [recommendations, setRecommendations] = useState<Ebook[]>([]);
  const sessionId = searchParams.get('session_id');
  const isDonation = searchParams.get('type') === 'donation';

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
    if (sessionId && !sessionStorage.getItem(`toast_shown_${sessionId}`)) {
      toast.success(
        isDonation
          ? t('success.donation.toast', 'Thank you for your donation!')
          : t('success.toast', 'Payment completed successfully!'),
        {
          duration: 4000,
          position: 'top-right',
        },
      );
      sessionStorage.setItem(`toast_shown_${sessionId}`, 'true');
      if (!isDonation) {
        clearCart();
        sessionStorage.removeItem('cartState');
        sessionStorage.removeItem('jdi_last_checkout');
        void trackLifecycleEvent('purchase_completed', { sessionId });
      }
    }
  }, [sessionId, isDonation, clearCart, t]);

  useEffect(() => {
    if (isDonation) return;
    let cancelled = false;
    const load = async () => {
      try {
        const ebooks = await getEbooks({ locale: language });
        if (!cancelled) {
          setRecommendations(ebooks.slice(0, 3));
        }
      } catch {
        if (!cancelled) setRecommendations([]);
      }
    };
    void load();
    return () => {
      cancelled = true;
    };
  }, [language, isDonation]);

  return (
    <section className="pt-24 pb-12 bg-gradient-to-br from-primary/10 to-background min-h-screen">
      <div className="container mx-auto px-6 sm:px-8 lg:px-10">
        <div className="max-w-2xl mx-auto text-center">
          <CheckCircle className="mx-auto mb-6 h-16 w-16 text-primary" />
          <h1 className="text-3xl md:text-4xl font-heading font-bold mb-4">
            {isDonation
              ? t('success.donation.title', 'Thank you for your support!')
              : t('success.title', 'Thank you for your purchase!')}
          </h1>
          <p className="text-lg text-muted-foreground mb-8">
            {isLoading
              ? t('success.processing', 'Processing your purchase...')
              : isDonation
                ? t(
                    'success.donation.body',
                    'Your donation was received. Thank you for helping this ministry continue.',
                  )
                : t(
                    'success.body',
                    'Your payment was successful. You can access your eBooks in your dashboard. A confirmation email is sent automatically.',
                  )}
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            {!isDonation && purchasedCourses.length > 0 && (
              <Button asChild size="lg">
                <Link to={courseLink}>{t('success.cta.course', 'Go to your course')}</Link>
              </Button>
            )}
            {!isDonation && (
              <Button asChild size="lg" variant={purchasedCourses.length > 0 ? 'outline' : 'default'}>
                <Link to="/user-dashboard?tab=ebooks">
                  {t('success.cta.ebooks', 'Go to my eBooks')}
                </Link>
              </Button>
            )}
            <Button variant={isDonation ? 'default' : 'outline'} asChild size="lg">
              <Link to="/shop">{t('common.continueShopping', 'Continue shopping')}</Link>
            </Button>
            {isDonation && (
              <Button variant="outline" asChild size="lg">
                <Link to="/">{t('nav.home', 'Home')}</Link>
              </Button>
            )}
          </div>
          <p className="text-sm text-muted-foreground mt-6">
            {t('common.needHelp', 'Need help?')}{' '}
            <Link to="/contact" className="text-primary hover:underline">
              {t('common.contactUs', 'Contact us')}
            </Link>
          </p>
        </div>

        {!isDonation && recommendations.length > 0 && (
          <div className="max-w-5xl mx-auto mt-16">
            <h2 className="text-2xl font-heading font-semibold text-center mb-2">
              {t('success.upsell.title', 'Continue your journey')}
            </h2>
            <p className="text-muted-foreground text-center mb-8">
              {t('success.upsell.body', 'Explore more eBooks from our collection.')}
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {recommendations.map((book) => (
                <EbookCard key={book.id} book={book} />
              ))}
            </div>
            <div className="text-center mt-8">
              <Button variant="outline" asChild>
                <Link to="/shop">{t('common.viewAll', 'View all')}</Link>
              </Button>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
