import { createContext, useContext, useEffect, useReducer, ReactNode } from 'react';
import type { Ebook } from '@/components/shop/ebook-card';
import { toast } from 'react-hot-toast';
import { localeMessages, type AppLocale } from '@/locales/messages';

export type CartProductType = 'ebook' | 'course';

/** Anything sellable. Courses reuse the ebook shape (filename is empty) plus a slug. */
export type CartProduct = Ebook & {
  type?: CartProductType;
  slug?: string;
};

export interface CartItem extends CartProduct {
  type: CartProductType;
  quantity: number;
}

interface CartState {
  items: CartItem[];
}

type CartAction =
  | { type: 'ADD_ITEM'; payload: CartProduct }
  | { type: 'REMOVE_ITEM'; payload: { id: string; productType: CartProductType } }
  | { type: 'DECREMENT_ITEM'; payload: { id: string; productType: CartProductType } }
  | { type: 'CLEAR_CART' };

const CartContext = createContext<{
  state: CartState;
  addItem: (item: CartProduct) => void;
  removeItem: (id: string, productType?: CartProductType) => void;
  decrementItem: (id: string, productType?: CartProductType) => void;
  clearCart: () => void;
  totalCount: number;
  totalPrice: number;
}>({
  state: { items: [] },
  addItem: () => {},
  removeItem: () => {},
  decrementItem: () => {},
  clearCart: () => {},
  totalCount: 0,
  totalPrice: 0,
});

const CART_STORAGE_KEY = 'jdi_cart_v1';
const LANGUAGE_STORAGE_KEY = 'jdi_language_preference';

export const productTypeOf = (item: { type?: string }): CartProductType =>
  item.type === 'course' ? 'course' : 'ebook';

const sameProduct = (item: CartItem, id: string, productType: CartProductType) =>
  item.id === id && item.type === productType;

function resolveLocale(): AppLocale {
  try {
    const stored = window.localStorage.getItem(LANGUAGE_STORAGE_KEY);
    if (stored === 'en' || stored === 'pt-BR') return stored;
  } catch {
    // ignore
  }
  return 'pt-BR';
}

function cartMessage(key: 'cart.toast.added' | 'cart.toast.courseAlreadyInCart', title: string): string {
  const locale = resolveLocale();
  const template = localeMessages[locale][key] || localeMessages['pt-BR'][key] || '{title}';
  return template.replace('{title}', title);
}

function loadInitialCartState(): CartState {
  if (typeof window === 'undefined') return { items: [] };
  try {
    const raw = window.localStorage.getItem(CART_STORAGE_KEY);
    if (!raw) return { items: [] };
    const parsed = JSON.parse(raw) as unknown;
    if (
      !parsed ||
      typeof parsed !== 'object' ||
      !('items' in (parsed as Record<string, unknown>)) ||
      !Array.isArray((parsed as { items: unknown }).items)
    ) {
      return { items: [] };
    }
    // Carts saved before courses existed have no type: they are ebooks.
    const items = (parsed as { items: Array<Partial<CartItem>> }).items
      .filter((item): item is CartItem => Boolean(item && typeof item.id === 'string'))
      .map((item) => {
        const type = productTypeOf(item);
        return { ...item, type, quantity: type === 'course' ? 1 : Math.max(1, item.quantity || 1) };
      });
    return { items };
  } catch {
    return { items: [] };
  }
}

function cartReducer(state: CartState, action: CartAction): CartState {
  switch (action.type) {
    case 'ADD_ITEM': {
      const productType = productTypeOf(action.payload);
      const existing = state.items.find(item => sameProduct(item, action.payload.id, productType));
      if (existing) {
        if (productType === 'course') return state;
        return {
          items: state.items.map(item =>
            sameProduct(item, action.payload.id, productType)
              ? { ...item, quantity: item.quantity + 1 }
              : item
          ),
        };
      }
      return { items: [...state.items, { ...action.payload, type: productType, quantity: 1 }] };
    }
    case 'REMOVE_ITEM':
      return {
        items: state.items.filter(item => !sameProduct(item, action.payload.id, action.payload.productType)),
      };
    case 'DECREMENT_ITEM':
      return {
        items: state.items.reduce<CartItem[]>((acc, item) => {
          if (sameProduct(item, action.payload.id, action.payload.productType)) {
            const newQty = item.quantity - 1;
            if (newQty > 0) {
              acc.push({ ...item, quantity: newQty });
            }
          } else {
            acc.push(item);
          }
          return acc;
        }, []),
      };
    case 'CLEAR_CART':
      return { items: [] };
    default:
      return state;
  }
}

export function CartProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(cartReducer, undefined, loadInitialCartState);

  useEffect(() => {
    try {
      window.localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(state));
    } catch {
      // If storage is unavailable/quota exceeded, keep cart in memory only.
    }
  }, [state]);

  const addItem = (item: CartProduct) => {
    const productType = productTypeOf(item);
    const alreadyInCart =
      productType === 'course' && state.items.some(existing => sameProduct(existing, item.id, productType));
    dispatch({ type: 'ADD_ITEM', payload: item });
    const toastId = `add-to-cart-${productType}-${item.id}`;
    if (alreadyInCart) {
      toast(cartMessage('cart.toast.courseAlreadyInCart', item.title), { id: toastId, duration: 2000, position: 'top-right' });
      return;
    }
    toast.success(cartMessage('cart.toast.added', item.title), {
      id: toastId,
      duration: 2000,
      position: 'top-right',
    });
  };

  const removeItem = (id: string, productType: CartProductType = 'ebook') =>
    dispatch({ type: 'REMOVE_ITEM', payload: { id, productType } });
  const decrementItem = (id: string, productType: CartProductType = 'ebook') =>
    dispatch({ type: 'DECREMENT_ITEM', payload: { id, productType } });
  const clearCart = () => dispatch({ type: 'CLEAR_CART' });
  const totalCount = state.items.reduce((sum, item) => sum + item.quantity, 0);
  const totalPrice = state.items.reduce((sum, item) => sum + item.quantity * item.price, 0);

  return (
    <CartContext.Provider value={{ state, addItem, removeItem, decrementItem, clearCart, totalCount, totalPrice }}>
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  return useContext(CartContext);
}

const SIGN_IN_CART_KEY = 'cartState';

/** Save the cart across the sign-in redirect. */
export function saveCartForSignIn(items: CartItem[]): void {
  try {
    sessionStorage.setItem(SIGN_IN_CART_KEY, JSON.stringify(items));
  } catch {
    // Cart still lives in localStorage.
  }
}

/** Restore a cart saved by saveCartForSignIn, keeping each item's type. */
export function restoreCartAfterSignIn(
  clearCart: () => void,
  addItem: (item: CartProduct) => void
): void {
  let raw: string | null = null;
  try {
    raw = sessionStorage.getItem(SIGN_IN_CART_KEY);
  } catch {
    return;
  }
  if (!raw) return;

  try {
    const saved = JSON.parse(raw) as Array<Partial<CartItem>>;
    clearCart();
    saved.forEach((item) => {
      if (!item.id || !item.title || typeof item.price !== 'number') return;
      const type = productTypeOf(item);
      const quantity = type === 'course' ? 1 : Math.max(1, item.quantity || 1);
      for (let count = 0; count < quantity; count += 1) {
        addItem({
          id: item.id,
          type,
          slug: item.slug,
          title: item.title,
          description: item.description || '',
          price: item.price,
          filename: item.filename || '',
          cover_url: item.cover_url,
          created_at: item.created_at,
        });
      }
    });
  } catch (error) {
    console.error('Error restoring cart state:', error);
  }
  try {
    sessionStorage.removeItem(SIGN_IN_CART_KEY);
  } catch {
    // ignore
  }
}
