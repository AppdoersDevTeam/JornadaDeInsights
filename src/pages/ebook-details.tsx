import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { ShoppingCart, ArrowLeft } from 'lucide-react';
import { useCart } from '@/context/cart-context';
import { LazyImage } from '@/components/shop/lazy-image';
import { motion } from 'framer-motion';
import { getEbookById } from '@/lib/supabase';
import type { Ebook } from '@/components/shop/ebook-card';

export function EbookDetailsPage() {
  const { id } = useParams<{ id: string }>();
  const { addItem } = useCart();
  const [ebook, setEbook] = useState<Ebook | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchEbook = async () => {
      try {
        setIsLoading(true);
        if (!id) throw new Error('No ebook ID provided');
        
        const data = await getEbookById(id);
        setEbook(data);
      } catch (err) {
        setError('Failed to load ebook details. Please try again later.');
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
          <h2 className="text-2xl font-semibold text-red-500 mb-4">Erro</h2>
          <p className="text-gray-600">{error || 'Ebook not found'}</p>
          <Button asChild className="mt-4">
            <Link to="/shop">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Shop
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
      <div className="container mx-auto px-6 sm:px-8 lg:px-10">
        <Button asChild variant="ghost" className="mb-8">
          <Link to="/shop">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Shop
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
              {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(ebook.price)}
            </p>
            <p className="text-lg text-muted-foreground mb-8 whitespace-pre-line">{ebook.description}</p>
            
            <div className="flex flex-col sm:flex-row gap-4">
              <Button 
                size="lg" 
                onClick={() => addItem(ebook)}
                className="flex-1"
              >
                <ShoppingCart className="mr-2 h-5 w-5" />
                Add to Cart
              </Button>
            </div>
          </motion.div>
        </div>
      </div>
    </motion.section>
  );
} 