import { Button } from '@/components/ui/button';
import { ShoppingCart } from 'lucide-react';
import { useCart } from '@/context/cart-context';
import { LazyImage } from './lazy-image';
import { Link } from 'react-router-dom';

export interface Ebook {
  id: string;
  title: string;
  description: string;
  price: number;
  filename: string;
  cover_url?: string;
  created_at?: string;
}

interface EbookCardProps {
  book: Ebook;
}

export function EbookCard({ book }: EbookCardProps) {
  const { addItem } = useCart();

  const handleAddToCart = (e: React.MouseEvent) => {
    e.preventDefault(); // Prevent navigation when clicking the button
    addItem(book);
  };

  return (
    <Link to={`/shop/ebook/${book.id}`} className="block">
      <div className="bg-card rounded-lg shadow-md overflow-hidden border border-border/50 h-full flex flex-col transition-all duration-300 hover:shadow-lg hover:border-primary/20 group">
        <div className="aspect-[3/4] relative w-full overflow-hidden">
          <LazyImage
            src={book.cover_url || ''}
            alt={book.title}
            className="absolute inset-0 w-full h-full object-cover object-center transition-transform duration-500 group-hover:scale-105"
          />
        </div>
        <div className="p-4 flex flex-col flex-grow">
          <h3 className="font-heading font-medium text-lg mb-1 line-clamp-2 group-hover:text-primary transition-colors">{book.title}</h3>
          <p className="text-sm text-muted-foreground mb-4 line-clamp-2 flex-grow">{book.description}</p>
          <div className="flex items-center justify-between mt-auto">
            <p className="font-medium group-hover:text-primary transition-colors">${book.price.toFixed(2)}</p>
            <Button 
              size="sm" 
              onClick={handleAddToCart}
              className="transition-all duration-300 hover:scale-105 hover:shadow-md"
            >
              <ShoppingCart className="mr-2 h-4 w-4" /> Adicionar ao carrinho
            </Button>
          </div>
        </div>
      </div>
    </Link>
  );
}