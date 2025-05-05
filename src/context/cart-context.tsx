import React, { createContext, useContext, useReducer, ReactNode } from 'react';
import type { Ebook } from '@/components/shop/ebook-card';
import { toast } from 'react-hot-toast';

interface CartItem extends Ebook {
  quantity: number;
}

interface CartState {
  items: CartItem[];
}

type CartAction =
  | { type: 'ADD_ITEM'; payload: Ebook }
  | { type: 'REMOVE_ITEM'; payload: string }
  | { type: 'DECREMENT_ITEM'; payload: string }
  | { type: 'CLEAR_CART' };

const CartContext = createContext<{
  state: CartState;
  addItem: (item: Ebook) => void;
  removeItem: (id: string) => void;
  decrementItem: (id: string) => void;
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

function cartReducer(state: CartState, action: CartAction): CartState {
  switch (action.type) {
    case 'ADD_ITEM': {
      const existing = state.items.find(item => item.id === action.payload.id);
      if (existing) {
        return {
          items: state.items.map(item =>
            item.id === action.payload.id
              ? { ...item, quantity: item.quantity + 1 }
              : item
          ),
        };
      }
      return { items: [...state.items, { ...action.payload, quantity: 1 }] };
    }
    case 'REMOVE_ITEM':
      return { items: state.items.filter(item => item.id !== action.payload) };
    case 'DECREMENT_ITEM':
      return {
        items: state.items.reduce<CartItem[]>((acc, item) => {
          if (item.id === action.payload) {
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
  const [state, dispatch] = useReducer(cartReducer, { items: [] });
  const addItem = (item: Ebook) => {
    dispatch({ type: 'ADD_ITEM', payload: item });
    toast.success(`${item.title} adicionado ao carrinho!`);
  };
  const removeItem = (id: string) => dispatch({ type: 'REMOVE_ITEM', payload: id });
  const decrementItem = (id: string) => dispatch({ type: 'DECREMENT_ITEM', payload: id });
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