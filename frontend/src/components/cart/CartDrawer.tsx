import React from 'react';
import { useNavigate } from 'react-router-dom';
import { X, ShoppingCart, Trash2, Plus, Minus, ArrowRight, ShieldCheck } from 'lucide-react';
import { useCart } from '../../context/CartContext';
import { useAuth } from '../../context/AuthContext';

export const CartDrawer: React.FC = () => {
  const {
    items,
    isCartOpen,
    setIsCartOpen,
    updateQuantity,
    removeItem,
    totalItems,
    totalPriceCents,
  } = useCart();
  const { isAuthenticated } = useAuth();
  const navigate = useNavigate();

  if (!isCartOpen) return null;

  const handleProceedToCheckout = () => {
    setIsCartOpen(false);
    if (isAuthenticated) {
      navigate('/checkout');
    } else {
      navigate('/login?redirect=/checkout');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      {/* Backdrop */}
      <div
        onClick={() => setIsCartOpen(false)}
        className="fixed inset-0 bg-black/70 backdrop-blur-sm transition-opacity"
      />

      {/* Drawer Panel */}
      <aside className="relative w-full max-w-md bg-[#1F0A4D] border-l border-[#3F1B85] h-full flex flex-col shadow-2xl z-10">
        {/* Header */}
        <div className="px-6 py-5 bg-[#2A1163] border-b border-[#3F1B85] flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <ShoppingCart className="w-5 h-5 text-[#FAD318]" />
            <h2 className="text-lg font-black text-white">
              Your Cart <span className="text-sm text-gray-400 font-bold">({totalItems})</span>
            </h2>
          </div>
          <button
            onClick={() => setIsCartOpen(false)}
            className="p-2 rounded-lg bg-[#1F0A4D] hover:bg-[#3F1B85] text-gray-300 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Cart Items List */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {items.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center space-y-3 py-12">
              <div className="w-16 h-16 rounded-2xl bg-[#2A1163] border border-[#3F1B85] flex items-center justify-center text-gray-400">
                <ShoppingCart className="w-8 h-8" />
              </div>
              <p className="text-lg font-black text-white">Your cart is empty</p>
              <p className="text-xs text-gray-400 max-w-xs">
                Explore thousands of Steam, PlayStation, Xbox, and Nintendo keys at unbeatable prices.
              </p>
            </div>
          ) : (
            items.map((item) => (
              <div
                key={item.offer.id}
                className="p-4 rounded-xl bg-[#2A1163] border border-[#3F1B85] flex gap-3.5"
              >
                <img
                  src={item.product.cover_image_url}
                  alt={item.product.title}
                  className="w-20 h-24 object-cover rounded-lg border border-[#3F1B85] shrink-0"
                />

                <div className="flex-1 min-w-0 flex flex-col justify-between">
                  <div>
                    <div className="flex items-start justify-between gap-2">
                      <h3 className="text-sm font-bold text-white line-clamp-1">
                        {item.product.title}
                      </h3>
                      <button
                        onClick={() => removeItem(item.offer.id)}
                        className="text-gray-400 hover:text-[#FD5A20] transition-colors"
                        aria-label="Remove item"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                    <p className="text-[11px] text-[#63E3C2] font-bold mt-0.5">
                      {item.product.platform} • {item.product.region}
                    </p>
                    <p className="text-[11px] text-gray-400">
                      Seller: {item.offer.seller_username || 'Verified Seller'}
                    </p>
                  </div>

                  <div className="flex items-center justify-between mt-3 pt-2 border-t border-[#3F1B85]/70">
                    {/* Quantity Stepper */}
                    <div className="inline-flex items-center rounded-lg bg-[#1F0A4D] border border-[#3F1B85]">
                      <button
                        onClick={() => updateQuantity(item.offer.id, item.quantity - 1)}
                        className="p-1.5 text-gray-300 hover:text-white"
                      >
                        <Minus className="w-3.5 h-3.5" />
                      </button>
                      <span className="px-2.5 text-xs font-extrabold text-white">
                        {item.quantity}
                      </span>
                      <button
                        onClick={() => updateQuantity(item.offer.id, item.quantity + 1)}
                        disabled={item.quantity >= item.offer.stock_count}
                        className="p-1.5 text-gray-300 hover:text-white disabled:opacity-30"
                      >
                        <Plus className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    <span className="text-base font-black text-[#FAD318]">
                      €{((item.offer.price_cents * item.quantity) / 100).toFixed(2)}
                    </span>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Footer / Subtotal */}
        {items.length > 0 && (
          <div className="p-6 bg-[#2A1163] border-t border-[#3F1B85] space-y-4">
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-xs text-gray-300">
                <span>Digital Delivery</span>
                <span className="text-[#63E3C2] font-bold">FREE (Instant)</span>
              </div>
              <div className="flex items-center justify-between text-lg font-black text-white pt-2 border-t border-[#3F1B85]">
                <span>Subtotal</span>
                <span className="text-2xl text-[#FAD318]">
                  €{(totalPriceCents / 100).toFixed(2)}
                </span>
              </div>
            </div>

            <button
              onClick={handleProceedToCheckout}
              className="w-full py-3.5 px-5 rounded-xl bg-[#FAD318] hover:bg-[#E5BE0B] text-[#1F0A4D] font-black text-sm shadow-lg shadow-[#FAD318]/25 flex items-center justify-center gap-2 transition-all hover:scale-[1.01] cursor-pointer"
            >
              {isAuthenticated ? 'Proceed to Checkout' : 'Sign In to Checkout'}
              <ArrowRight className="w-4 h-4 stroke-[2.5]" />
            </button>

            <p className="flex items-center justify-center gap-1.5 text-[11px] text-gray-400">
              <ShieldCheck className="w-3.5 h-3.5 text-[#63E3C2]" />
              100% Verified Keys • Instant Activation
            </p>
          </div>
        )}
      </aside>
    </div>
  );
};