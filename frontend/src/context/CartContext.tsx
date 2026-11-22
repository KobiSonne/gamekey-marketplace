import React, { createContext, useContext, useState, useEffect } from 'react';
import { Offer, Product } from '../types/catalog';

export interface CartItem {
  id: string; // offer id
  offer: Offer;
  product: Product;
  quantity: number;
}

interface CartContextType {
  items: CartItem[];
  addItem: (product: Product, offer: Offer, quantity?: number) => void;
  removeItem: (offerId: string) => void;
  updateQuantity: (offerId: string, quantity: number) => void;
  clearCart: () => void;
  totalItems: number;
  totalPriceCents: number;
  isCartOpen: boolean;
  setIsCartOpen: (open: boolean) => void;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

export const CartProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [items, setItems] = useState<CartItem[]>(() => {
    const saved = localStorage.getItem('eneba_cart');
    return saved ? JSON.parse(saved) : [];
  });
  const [isCartOpen, setIsCartOpen] = useState(false);

  useEffect(() => {
    localStorage.setItem('eneba_cart', JSON.stringify(items));
  }, [items]);

  const addItem = (product: Product, offer: Offer, quantity = 1) => {
    setItems((prev) => {
      const existingIndex = prev.findIndex((i) => i.offer.id === offer.id);
      if (existingIndex > -1) {
        const updated = [...prev];
        const newQty = updated[existingIndex].quantity + quantity;
        if (newQty <= offer.stock_count) {
          updated[existingIndex].quantity = newQty;
        }
        return updated;
      }
      return [...prev, { id: offer.id, offer, product, quantity: Math.min(quantity, offer.stock_count) }];
    });
    setIsCartOpen(true);
  };

  const removeItem = (offerId: string) => {
    setItems((prev) => prev.filter((i) => i.offer.id !== offerId));
  };

  const updateQuantity = (offerId: string, quantity: number) => {
    if (quantity <= 0) {
      removeItem(offerId);
      return;
    }
    setItems((prev) =>
      prev.map((item) => {
        if (item.offer.id === offerId) {
          return { ...item, quantity: Math.min(quantity, item.offer.stock_count) };
        }
        return item;
      })
    );
  };

  const clearCart = () => setItems([]);

  const totalItems = items.reduce((acc, item) => acc + item.quantity, 0);
  const totalPriceCents = items.reduce((acc, item) => acc + item.offer.price_cents * item.quantity, 0);

  return (
    <CartContext.Provider
      value={{
        items,
        addItem,
        removeItem,
        updateQuantity,
        clearCart,
        totalItems,
        totalPriceCents,
        isCartOpen,
        setIsCartOpen,
      }}
    >
      {children}
    </CartContext.Provider>
  );
};

export const useCart = () => {
  const context = useContext(CartContext);
  if (!context) throw new Error('useCart must be used within a CartProvider');
  return context;
};