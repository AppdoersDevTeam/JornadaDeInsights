import { useNavigate, Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ShoppingCart } from 'lucide-react';
import { useCart } from '@/context/cart-context';
import { LazyImage } from './lazy-image';
import { useLanguage } from '@/context/language-context';
import type { EbookContentLocale } from '@/lib/ebook-locale';
import { trackLifecycleEvent } from '@/lib/lifecycle';

export interface Ebook {
  id: string;
  title: string;
  description: string;
  price: number;
  filename: string;
  cover_url?: string;
  created_at?: string;
  category_id?: string;
  category?: {
    id: string;
    name: string;
  } | null;
  content_locale?: EbookContentLocale;
}

interface EbookCardProps {
  book: Ebook;
}

export function EbookCard({ book }: EbookCardProps) {
  const { t, language } = useLanguage();
  const { addItem } = useCart();
  const navigate = useNavigate();

  const handleAddToCart = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    addItem(book);
    void trackLifecycleEvent('add_to_cart', {
      ebookId: book.id,
      title: book.title,
      price: book.price,
    });
  };

  const handleBuyNow = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    addItem(book);
    void trackLifecycleEvent('add_to_cart', {
      ebookId: book.id,
      title: book.title,
      price: book.price,
      source: 'buy_now',
    });
    navigate('/cart');
  };

  return (
    <div className="bg-card rounded-lg shadow-md overflow-hidden border border-border/50 h-full flex flex-col transition-all duration-300 hover:shadow-lg hover:border-primary/20 group">
      <Link to={`/shop/ebook/${book.id}`} className="block">
        <div className="relative w-full overflow-hidden flex items-center justify-center bg-muted/30">
          <LazyImage
            src={book.cover_url || ''}
            alt={book.title}
            className="w-full h-auto transition-transform duration-500 group-hover:scale-105"
          />
        </div>
        <div className="p-4 flex flex-col flex-grow">
          {book.category && (
            <Badge variant="secondary" className="w-fit mb-2">
              {book.category.name}
            </Badge>
          )}
          <h3 className="font-heading font-medium text-lg mb-1 line-clamp-2 group-hover:text-primary transition-colors">{book.title}</h3>
          <p className="text-sm text-muted-foreground mb-4 line-clamp-2 flex-grow">{book.description}</p>
        </div>
      </Link>
      <div className="p-4 pt-0 mt-auto space-y-2">
        <p className="font-medium group-hover:text-primary transition-colors">
          {new Intl.NumberFormat(language === 'en' ? 'en' : 'pt-BR', { style: 'currency', currency: 'BRL' }).format(book.price)}
        </p>
        <div className="flex gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={handleAddToCart}
            className="flex-1 transition-all duration-300"
            aria-label={t('shop.featured.add', 'Adicionar ao carrinho')}
            title={t('shop.featured.add', 'Adicionar ao carrinho')}
          >
            <ShoppingCart className="h-4 w-4 mr-1.5" />
            <span className="text-xs sm:text-sm">{t('shop.featured.addShort', 'Carrinho')}</span>
          </Button>
          <Button
            size="sm"
            onClick={handleBuyNow}
            className="flex-1 transition-all duration-300"
            aria-label={t('ebook.buyNow', 'Comprar agora')}
          >
            <span className="text-xs sm:text-sm">{t('ebook.buyNow', 'Comprar agora')}</span>
          </Button>
        </div>
      </div>
    </div>
  );
}
