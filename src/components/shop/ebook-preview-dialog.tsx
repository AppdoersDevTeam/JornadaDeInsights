import { useEffect, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { ShoppingCart } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import type { Ebook } from './ebook-card';
import { useCart } from '@/context/cart-context';
import { useLanguage } from '@/context/language-context';
import { getEbookPreviewUrls } from '@/lib/supabase';
import { trackLifecycleEvent } from '@/lib/lifecycle';

interface EbookPreviewDialogProps {
  ebook: Ebook;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function EbookPreviewDialog({ ebook, open, onOpenChange }: EbookPreviewDialogProps) {
  const { t } = useLanguage();
  const { addItem } = useCart();
  const navigate = useNavigate();
  const pageUrls = useMemo(() => getEbookPreviewUrls(ebook), [ebook]);
  const trackedForId = useRef<string | null>(null);

  useEffect(() => {
    if (!open) {
      trackedForId.current = null;
      return;
    }
    if (trackedForId.current === ebook.id) return;
    trackedForId.current = ebook.id;
    void trackLifecycleEvent('preview_open', {
      ebookId: ebook.id,
      title: ebook.title,
      price: ebook.price,
      pages: pageUrls.length,
    });
  }, [open, ebook.id, ebook.title, ebook.price, pageUrls.length]);

  const handleBuyNow = () => {
    addItem(ebook);
    void trackLifecycleEvent('add_to_cart', {
      ebookId: ebook.id,
      title: ebook.title,
      price: ebook.price,
      source: 'buy_now',
      from: 'preview',
    });
    onOpenChange(false);
    navigate('/cart');
  };

  const handleAddToCart = () => {
    addItem(ebook);
    void trackLifecycleEvent('add_to_cart', {
      ebookId: ebook.id,
      title: ebook.title,
      price: ebook.price,
      from: 'preview',
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[90vh] max-w-3xl flex-col gap-0 p-0 overflow-hidden">
        <DialogHeader className="border-b px-4 py-3 pr-12 text-left sm:px-6">
          <DialogTitle className="line-clamp-1">
            {t('ebook.preview.title', 'Free sample')}: {ebook.title}
          </DialogTitle>
          <DialogDescription className="sr-only">
            {t('ebook.preview.open', 'Read the first pages free')}
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto bg-muted/40 px-3 py-4 sm:px-6">
          <div className="mx-auto flex max-w-2xl flex-col gap-4">
            {pageUrls.map((url, index) => (
              <div
                key={url}
                className="min-h-[240px] overflow-hidden rounded-md bg-white shadow-sm select-none"
                onContextMenu={(e) => e.preventDefault()}
              >
                <img
                  src={url}
                  alt={`${ebook.title} — ${t('ebook.preview.page', 'page')} ${index + 1}`}
                  loading={index === 0 ? 'eager' : 'lazy'}
                  decoding="async"
                  draggable={false}
                  className="block h-auto w-full"
                />
              </div>
            ))}

            <div className="rounded-lg border border-primary/20 bg-card p-5 text-center shadow-sm">
              <h3 className="font-heading text-lg font-semibold">
                {t('ebook.preview.ctaTitle', 'Enjoyed it? Keep reading')}
              </h3>
              <p className="mt-1 text-sm text-muted-foreground">
                {t('ebook.preview.ctaBody', 'Get the full eBook and start reading right after purchase.')}
              </p>
              <div className="mt-4 flex flex-col gap-2 sm:flex-row">
                <Button className="flex-1" onClick={handleBuyNow} aria-label={t('ebook.buyNow', 'Comprar agora')}>
                  {t('ebook.buyNow', 'Comprar agora')}
                </Button>
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={handleAddToCart}
                  aria-label={t('ebook.addToCart', 'Add to cart')}
                >
                  <ShoppingCart className="mr-2 h-4 w-4" />
                  {t('ebook.addToCart', 'Add to cart')}
                </Button>
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
