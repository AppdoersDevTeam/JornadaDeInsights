import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { ShoppingCart, ArrowLeft, ShieldCheck, Clock3, BadgeCheck } from 'lucide-react';
import { useCart } from '@/context/cart-context';
import { LazyImage } from '@/components/shop/lazy-image';
import { motion } from 'framer-motion';
import { getEbookById } from '@/lib/supabase';
import type { Ebook } from '@/components/shop/ebook-card';
import { StructuredData } from '@/components/seo/structured-data';
import { useLanguage } from '@/context/language-context';

export function EbookDetailsPage() {
  const { t, language } = useLanguage();
  const { id } = useParams<{ id: string }>();
  const { addItem } = useCart();
  const [ebook, setEbook] = useState<Ebook | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchEbook = async () => {
      try {
        setIsLoading(true);
        if (!id) throw new Error(t('ebook.loadError', 'Could not load this eBook. Please try again later.'));
        
        const data = await getEbookById(id);
        setEbook(data);
      } catch (err) {
        setError(t('ebook.loadError', 'Could not load this eBook. Please try again later.'));
        console.error(err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchEbook();
  }, [id]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (error || !ebook) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-semibold text-red-500 mb-4">{t('common.error', 'Error')}</h2>
          <p className="text-gray-600">{error || t('ebook.notFound', 'eBook not found')}</p>
          <Button asChild className="mt-4">
            <Link to="/shop">
              <ArrowLeft className="mr-2 h-4 w-4" />
              {t('common.backToShop', 'Back to the store')}
            </Link>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <motion.section 
      className="pt-24 pb-12 bg-gradient-to-br from-primary/10 to-background min-h-screen"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
    >
      <StructuredData
        id={`product-${ebook.id}`}
        data={{
          '@context': 'https://schema.org',
          '@type': 'Product',
          name: ebook.title,
          description: ebook.description,
          image: ebook.cover_url || undefined,
          sku: ebook.id,
          brand: {
            '@type': 'Brand',
            name: 'Jornada de Insights',
          },
          offers: {
            '@type': 'Offer',
            url: `https://jornadadeinsights.com/shop/ebook/${ebook.id}`,
            priceCurrency: 'BRL',
            price: Number(ebook.price).toFixed(2),
            availability: 'https://schema.org/InStock',
            itemCondition: 'https://schema.org/NewCondition',
          },
        }}
      />
      <div className="container mx-auto px-6 sm:px-8 lg:px-10">
        <Button asChild variant="ghost" className="mb-8">
          <Link to="/shop">
            <ArrowLeft className="mr-2 h-4 w-4" />
            {t('common.backToShop', 'Back to the store')}
          </Link>
        </Button>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
          {/* Cover Image */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="relative aspect-[3/4] overflow-hidden rounded-lg shadow-xl"
          >
            <LazyImage
              src={ebook.cover_url || ''}
              alt={ebook.title}
              className="w-full h-full object-cover"
            />
          </motion.div>

          {/* Details */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5, delay: 0.4 }}
            className="flex flex-col justify-center"
          >
            <h1 className="text-3xl md:text-4xl font-heading font-bold mb-4">{ebook.title}</h1>
            <p className="text-xl text-primary font-medium mb-6">
              {new Intl.NumberFormat(language === 'en' ? 'en' : 'pt-BR', { style: 'currency', currency: 'BRL' }).format(ebook.price)}
            </p>
            <p className="text-lg text-muted-foreground mb-8 whitespace-pre-line">{ebook.description}</p>
            
            <div className="flex flex-col sm:flex-row gap-4">
              <Button 
                size="lg" 
                onClick={() => addItem(ebook)}
                className="flex-1"
              >
                <ShoppingCart className="mr-2 h-5 w-5" />
                {t('ebook.addToCart', 'Add to cart')}
              </Button>
              <Button variant="outline" size="lg" asChild className="flex-1">
                <Link to="/cart">{t('ebook.goToCart', 'Go to cart')}</Link>
              </Button>
            </div>

            <div className="mt-8 rounded-lg border border-border/60 bg-card/60 p-4 space-y-3">
              <div className="flex items-center gap-3 text-sm text-muted-foreground">
                <ShieldCheck className="h-4 w-4 text-primary" />
                {t('ebook.trust.stripe', 'Secure payment processed by Stripe.')}
              </div>
              <div className="flex items-center gap-3 text-sm text-muted-foreground">
                <Clock3 className="h-4 w-4 text-primary" />
                {t('ebook.trust.access', 'Immediate digital access after purchase confirmation.')}
              </div>
              <div className="flex items-center gap-3 text-sm text-muted-foreground">
                <BadgeCheck className="h-4 w-4 text-primary" />
                {t('ebook.trust.support', 'Email support for access and download questions.')}
              </div>
            </div>
          </motion.div>
        </div>

        <div className="mt-12 rounded-lg border border-border/60 bg-card p-6">
          <h2 className="text-xl font-semibold mb-4">{t('ebook.faq.title', 'Purchase FAQ')}</h2>
          <div className="space-y-4 text-sm text-muted-foreground">
            <p>
              <span className="font-medium text-foreground">{t('ebook.faq.receive.q', 'How do I receive my eBook?')}</span><br />
              {t('ebook.faq.receive.a', 'After payment is approved, the file is available in your dashboard.')}
            </p>
            <p>
              <span className="font-medium text-foreground">{t('ebook.faq.format.q', 'What file format?')}</span><br />
              {t('ebook.faq.format.a', 'All eBooks are delivered as PDFs for phone, tablet, or desktop.')}
            </p>
            <p>
              <span className="font-medium text-foreground">{t('ebook.faq.refund.q', 'Can I request a refund?')}</span><br />
              {t('ebook.faq.refund.a', 'If you have a technical access issue, contact us through the form and we will help.')}
            </p>
          </div>
        </div>
      </div>
    </motion.section>
  );
} 