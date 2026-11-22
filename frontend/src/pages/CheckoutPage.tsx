import React, { useState } from 'react';
import { Link, Navigate } from 'react-router-dom';
import {
  CreditCard,
  Wallet,
  ShieldCheck,
  Lock,
  CheckCircle2,
  Copy,
  Check,
  KeyRound,
  ArrowRight,
  AlertCircle,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';
import { checkoutOrder } from '../api/catalog';
import { Order } from '../types/order';

type PaymentMethod = 'card' | 'paypal' | 'wallet';

export const CheckoutPage: React.FC = () => {
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const { items, totalPriceCents, clearCart } = useCart();

  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('card');
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [completedOrder, setCompletedOrder] = useState<Order | null>(null);
  const [copiedKeyId, setCopiedKeyId] = useState<string | null>(null);

  if (authLoading) {
    return (
      <div className="min-h-screen bg-[#1F0A4D] flex items-center justify-center text-white font-bold">
        Loading checkout...
      </div>
    );
  }

  // Protect route: redirect unauthenticated users to login with ?redirect=/checkout
  if (!isAuthenticated) {
    return <Navigate to="/login?redirect=/checkout" replace />;
  }

  // Redirect to store if cart is empty and no order was just completed
  if (items.length === 0 && !completedOrder) {
    return <Navigate to="/store" replace />;
  }

  const handleCopyKey = (itemId: string, code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedKeyId(itemId);
    setTimeout(() => setCopiedKeyId(null), 2000);
  };

  const handlePayNow = async () => {
    setError(null);
    setIsProcessing(true);

    try {
      // Keep product metadata lookup before clearing cart
      const productLookup = new Map(items.map((i) => [i.product.id, i.product]));

      const payload = items.map((item) => ({
        offer_id: item.offer.id,
        quantity: item.quantity,
      }));

      const order = await checkoutOrder(payload);

      // Enrich returned order items with product title/platform/cover from cart state
      order.items = order.items.map((oi) => {
        const prod = productLookup.get(oi.product_id);
        return {
          ...oi,
          product_title: oi.product_title || prod?.title || 'Digital Game Key',
          product_platform: oi.product_platform || prod?.platform || 'Digital',
          product_region: oi.product_region || prod?.region || 'GLOBAL',
          cover_image_url: oi.cover_image_url || prod?.cover_image_url,
        };
      });

      setCompletedOrder(order);
      clearCart();
    } catch (err: any) {
      setError(
        err?.response?.data?.details ||
          err?.response?.data?.error ||
          'Payment processing failed. Please verify stock availability.'
      );
    } finally {
      setIsProcessing(false);
    }
  };

  // --- POST-PAYMENT DIGITAL KEY REVEAL VIEW ---
  if (completedOrder) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-[#4618AC]/35 to-[#1F0A4D] py-12 px-4">
        <div className="max-w-3xl mx-auto space-y-8">
          {/* Success Header */}
          <div className="p-8 rounded-2xl bg-[#2A1163] border-2 border-[#63E3C2] text-center space-y-3 shadow-2xl">
            <div className="w-16 h-16 rounded-full bg-[#63E3C2]/20 text-[#63E3C2] flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-10 h-10" />
            </div>
            <h1 className="text-3xl font-black text-white">Payment Successful!</h1>
            <p className="text-sm text-gray-300 max-w-lg mx-auto">
              Your digital activation keys are unlocked below and saved permanently in{' '}
              <span className="text-[#FAD318] font-bold">My Library & Keys</span>.
            </p>
            <div className="inline-block px-3 py-1 rounded-lg bg-[#1F0A4D] border border-[#3F1B85] text-xs text-gray-400 font-mono">
              Order Ref: {completedOrder.payment_reference || completedOrder.id.slice(0, 8)} • Paid €
              {(completedOrder.total_cents / 100).toFixed(2)}
            </div>
          </div>

          {/* Unlocked Keys List */}
          <div className="space-y-4">
            <h2 className="text-lg font-black text-white flex items-center gap-2">
              <KeyRound className="w-5 h-5 text-[#FAD318]" />
              Your Unlocked Digital Keys ({completedOrder.items.length})
            </h2>

            {completedOrder.items.map((item) => {
              const isCopied = copiedKeyId === item.id;
              return (
                <div
                  key={item.id}
                  className="p-5 rounded-2xl bg-[#2A1163] border border-[#3F1B85] flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-lg"
                >
                  <div className="flex items-center gap-4">
                    {item.cover_image_url && (
                      <img
                        src={item.cover_image_url}
                        alt={item.product_title}
                        className="w-20 h-14 object-cover rounded-lg border border-[#3F1B85] shrink-0"
                      />
                    )}
                    <div>
                      <h3 className="font-extrabold text-white text-base">{item.product_title}</h3>
                      <p className="text-xs font-bold text-[#63E3C2] mt-0.5">
                        {item.product_platform} • {item.product_region}
                      </p>
                    </div>
                  </div>

                  {/* Key Box + Copy Button */}
                  <div className="flex items-center gap-2 bg-[#1F0A4D] p-2 pl-4 rounded-xl border border-[#FAD318]/50">
                    <code className="font-mono text-sm sm:text-base font-black tracking-widest text-[#FAD318] select-all">
                      {item.digital_key}
                    </code>
                    <button
                      onClick={() => handleCopyKey(item.id, item.digital_key)}
                      className={`px-3.5 py-2 rounded-lg font-extrabold text-xs flex items-center gap-1.5 transition-colors cursor-pointer ${
                        isCopied
                          ? 'bg-[#63E3C2] text-[#1F0A4D]'
                          : 'bg-[#FAD318] hover:bg-[#E5BE0B] text-[#1F0A4D]'
                      }`}
                    >
                      {isCopied ? (
                        <>
                          <Check className="w-3.5 h-3.5 stroke-[2.5]" />
                          Copied
                        </>
                      ) : (
                        <>
                          <Copy className="w-3.5 h-3.5 stroke-[2.5]" />
                          Copy Key
                        </>
                      )}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="flex flex-wrap items-center justify-center gap-4 pt-2">
            <Link
              to="/orders"
              className="px-6 py-3 rounded-xl bg-[#FAD318] hover:bg-[#E5BE0B] text-[#1F0A4D] font-black text-sm inline-flex items-center gap-2"
            >
              Go to My Library & Keys
              <ArrowRight className="w-4 h-4 stroke-[2.5]" />
            </Link>
            <Link
              to="/store"
              className="px-6 py-3 rounded-xl bg-[#2A1163] hover:bg-[#3F1B85] text-white font-bold text-sm border border-[#3F1B85]"
            >
              Continue Shopping
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // --- CHECKOUT FORM VIEW ---
  return (
    <div className="min-h-screen bg-[#1F0A4D] py-10 px-4 sm:px-6 lg:px-8">
      <div className="max-w-5xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-black text-white tracking-tight">Secure Checkout</h1>
          <p className="text-sm text-gray-400 mt-1">
            Sandbox Test Mode — No real money will be charged
          </p>
        </div>

        {error && (
          <div className="mb-6 p-4 rounded-xl bg-[#FD5A20]/15 border border-[#FD5A20] flex items-center gap-3 text-sm font-bold text-[#FD5A20]">
            <AlertCircle className="w-5 h-5 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Left: Simulated Payment Method Selector (7 cols) */}
          <div className="lg:col-span-7 space-y-6">
            <div className="p-6 rounded-2xl bg-[#2A1163] border border-[#3F1B85] space-y-5">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-black text-white">Select Payment Method</h2>
                <span className="px-2.5 py-1 rounded-md bg-[#63E3C2]/15 text-[#63E3C2] text-[11px] font-black uppercase">
                  Test Sandbox
                </span>
              </div>

              <div className="space-y-3">
                {/* Option 1: Credit / Debit Card */}
                <label
                  onClick={() => setPaymentMethod('card')}
                  className={`flex items-center justify-between p-4 rounded-xl border-2 cursor-pointer transition-all ${
                    paymentMethod === 'card'
                      ? 'bg-[#1F0A4D] border-[#FAD318]'
                      : 'bg-[#1F0A4D]/60 border-[#3F1B85] hover:border-gray-500'
                  }`}
                >
                  <div className="flex items-center gap-3.5">
                    <div className="w-10 h-10 rounded-lg bg-[#4618AC] text-[#FAD318] flex items-center justify-center">
                      <CreditCard className="w-5 h-5" />
                    </div>
                    <div>
                      <p className="font-extrabold text-white text-sm">Credit / Debit Card (Test)</p>
                      <p className="text-xs text-gray-400">Visa •••• 4242 — Instant approval</p>
                    </div>
                  </div>
                  <input
                    type="radio"
                    name="payment_method"
                    checked={paymentMethod === 'card'}
                    onChange={() => setPaymentMethod('card')}
                    className="w-4 h-4 text-[#FAD318]"
                  />
                </label>

                {/* Option 2: PayPal Express */}
                <label
                  onClick={() => setPaymentMethod('paypal')}
                  className={`flex items-center justify-between p-4 rounded-xl border-2 cursor-pointer transition-all ${
                    paymentMethod === 'paypal'
                      ? 'bg-[#1F0A4D] border-[#FAD318]'
                      : 'bg-[#1F0A4D]/60 border-[#3F1B85] hover:border-gray-500'
                  }`}
                >
                  <div className="flex items-center gap-3.5">
                    <div className="w-10 h-10 rounded-lg bg-[#003087] text-white flex items-center justify-center font-black text-sm">
                      PP
                    </div>
                    <div>
                      <p className="font-extrabold text-white text-sm">PayPal Express (Simulated)</p>
                      <p className="text-xs text-gray-400">Zero processing fee in sandbox mode</p>
                    </div>
                  </div>
                  <input
                    type="radio"
                    name="payment_method"
                    checked={paymentMethod === 'paypal'}
                    onChange={() => setPaymentMethod('paypal')}
                    className="w-4 h-4 text-[#FAD318]"
                  />
                </label>

                {/* Option 3: Eneba Wallet */}
                <label
                  onClick={() => setPaymentMethod('wallet')}
                  className={`flex items-center justify-between p-4 rounded-xl border-2 cursor-pointer transition-all ${
                    paymentMethod === 'wallet'
                      ? 'bg-[#1F0A4D] border-[#FAD318]'
                      : 'bg-[#1F0A4D]/60 border-[#3F1B85] hover:border-gray-500'
                  }`}
                >
                  <div className="flex items-center gap-3.5">
                    <div className="w-10 h-10 rounded-lg bg-[#FAD318]/20 text-[#FAD318] flex items-center justify-center">
                      <Wallet className="w-5 h-5" />
                    </div>
                    <div>
                      <p className="font-extrabold text-white text-sm">GameKey Wallet Balance</p>
                      <p className="text-xs text-[#63E3C2] font-semibold">
                        Available Sandbox Credits: €500.00
                      </p>
                    </div>
                  </div>
                  <input
                    type="radio"
                    name="payment_method"
                    checked={paymentMethod === 'wallet'}
                    onChange={() => setPaymentMethod('wallet')}
                    className="w-4 h-4 text-[#FAD318]"
                  />
                </label>
              </div>
            </div>
          </div>

          {/* Right: Order Summary & Pay Now CTA (5 cols) */}
          <div className="lg:col-span-5">
            <div className="p-6 rounded-2xl bg-[#2A1163] border border-[#3F1B85] space-y-5 shadow-xl">
              <h2 className="text-lg font-black text-white border-b border-[#3F1B85] pb-3">
                Order Summary
              </h2>

              <div className="space-y-3 max-h-64 overflow-y-auto pr-1">
                {items.map((item) => (
                  <div key={item.offer.id} className="flex items-center justify-between gap-3 text-sm">
                    <div className="min-w-0">
                      <p className="font-bold text-white truncate">
                        {item.quantity}× {item.product.title}
                      </p>
                      <p className="text-[11px] text-gray-400">
                        {item.product.platform} • {item.offer.seller_username || 'Verified Seller'}
                      </p>
                    </div>
                    <span className="font-extrabold text-white shrink-0">
                      €{((item.offer.price_cents * item.quantity) / 100).toFixed(2)}
                    </span>
                  </div>
                ))}
              </div>

              <div className="pt-4 border-t border-[#3F1B85] space-y-2">
                <div className="flex justify-between text-xs text-gray-300">
                  <span>Service Fee (Sandbox)</span>
                  <span className="text-[#63E3C2] font-bold">€0.00</span>
                </div>
                <div className="flex justify-between items-baseline pt-2">
                  <span className="text-base font-black text-white">Total to Pay</span>
                  <span className="text-3xl font-black text-[#FAD318]">
                    €{(totalPriceCents / 100).toFixed(2)}
                  </span>
                </div>
              </div>

              <button
                onClick={handlePayNow}
                disabled={isProcessing}
                className="w-full py-4 px-6 rounded-xl bg-[#FAD318] hover:bg-[#E5BE0B] disabled:opacity-50 text-[#1F0A4D] font-black text-base shadow-lg shadow-[#FAD318]/25 flex items-center justify-center gap-2 transition-all hover:scale-[1.01] cursor-pointer"
              >
                <Lock className="w-4 h-4 stroke-[2.5]" />
                {isProcessing
                  ? 'Generating Digital Keys...'
                  : `Pay Now • €${(totalPriceCents / 100).toFixed(2)}`}
              </button>

              <p className="flex items-center justify-center gap-1.5 text-[11px] text-gray-400 text-center">
                <ShieldCheck className="w-4 h-4 text-[#63E3C2] shrink-0" />
                Protected by 256-bit SSL & Instant Key Delivery Guarantee
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};