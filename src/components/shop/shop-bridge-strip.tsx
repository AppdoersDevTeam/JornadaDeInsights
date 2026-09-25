import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { EbookCard, type Ebook } from '@/components/shop/ebook-card';
import { getEbooks } from '@/lib/supabase';
import { useLanguage } from '@/context/language-context';

/**
 * Compact shop upsell strip for content pages (podcast, curiosidades, about).
 */
export function ShopBridgeStrip({ className = '' }: { className?: string }) {
  const { t, language } = useLanguage();
  const [ebooks, setEbooks] = useState<Ebook[]>([]);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const data = await getEbooks({ locale: language });
        if (!cancelled) setEbooks(data.slice(0, 3));
      } catch {
        if (!cancelled) setEbooks([]);
      }
    };
    void load();
    return () => {
      cancelled = true;
    };
  }, [language]);

  if (ebooks.length === 0) return null;

  return (
    <section className={`py-16 bg-muted/30 ${className}`}>
      <div className="container mx-auto px-6 sm:px-8 lg:px-10">
        <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 mb-8">
          <div>
            <h2 className="text-2xl md:text-3xl font-heading font-semibold mb-2">
              {t('shop.bridge.title', 'Continue with our eBooks')}
            </h2>
            <p className="text-muted-foreground max-w-xl">
              {t(
                'shop.bridge.body',
                'Deepen what you just learned with practical digital guides.',
              )}
            </p>
          </div>
          <Button variant="outline" asChild>
            <Link to="/shop">
              {t('shop.bridge.cta', 'View all eBooks')}
              <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </Button>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {ebooks.map((book) => (
            <EbookCard key={book.id} book={book} />
          ))}
        </div>
      </div>
    </section>
  );
}
