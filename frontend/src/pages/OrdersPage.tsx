import React, { useEffect, useState } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { KeyRound, Copy, Check, Eye, EyeOff, Package, ShoppingBag, Calendar } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { getUserOrders } from '../api/catalog';
import { Order } from '../types/order';

export const OrdersPage: React.FC = () => {
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const [orders, setOrders] = useState<Order[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [revealedKeys, setRevealedKeys] = useState<Record<string, boolean>>({});
  const [copiedId, setCopiedId] = useState<string | null>(null);

  useEffect(() => {
    if (!isAuthenticated) return;

    let isMounted = true;
    const fetchOrders = async () => {
      try {
        setIsLoading(true);
        const data = await getUserOrders();
        if (isMounted) {
          setOrders(data || []);
        }
      } catch (err) {
        console.error('Failed to load orders:', err);
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    fetchOrders();
    return () => {
      isMounted = false;
    };
  }, [isAuthenticated]);

  if (authLoading) {
    return (
      <div className="min-h-screen bg-[#1F0A4D] flex items-center justify-center text-white font-bold">
        Loading your library...
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login?redirect=/orders" replace />;
  }

  const toggleReveal = (itemId: string) => {
    setRevealedKeys((prev) => ({ ...prev, [itemId]: !prev[itemId] }));
  };

  const handleCopy = (itemId: string, keyCode: string) => {
    navigator.clipboard.writeText(keyCode);
    setRevealedKeys((prev) => ({ ...prev, [itemId]: true }));
    setCopiedId(itemId);
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <div className="min-h-screen bg-[#1F0A4D] py-10 px-4 sm:px-6 lg:px-8">
      <div className="max-w-5xl mx-auto space-y-8">
        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-black text-white tracking-tight flex items-center gap-3">
              <KeyRound className="w-8 h-8 text-[#FAD318]" />
              My Library & Keys
            </h1>
            <p className="text-sm text-gray-400 mt-1">
              View your purchase history and copy your digital activation keys anytime
            </p>
          </div>

          <Link
            to="/store"
            className="px-4 py-2.5 rounded-xl bg-[#2A1163] hover:bg-[#3F1B85] border border-[#3F1B85] text-sm font-extrabold text-white transition-colors"
          >
            Browse More Games
          </Link>
        </div>

        {/* Orders Content */}
        {isLoading ? (
          <div className="space-y-4">
            {[...Array(3)].map((_, idx) => (
              <div
                key={idx}
                className="h-44 rounded-2xl bg-[#2A1163] animate-pulse border border-[#3F1B85]"
              />
            ))}
          </div>
        ) : orders.length === 0 ? (
          <div className="p-14 rounded-2xl bg-[#2A1163] border border-[#3F1B85] text-center space-y-4">
            <ShoppingBag className="w-12 h-12 text-[#FAD318] mx-auto" />
            <h2 className="text-xl font-black text-white">No games in your library yet</h2>
            <p className="text-sm text-gray-300 max-w-md mx-auto">
              Once you complete an order, all of your digital activation codes will appear here.
            </p>
            <Link
              to="/store"
              className="inline-block px-6 py-3 rounded-xl bg-[#FAD318] hover:bg-[#E5BE0B] text-[#1F0A4D] font-black text-sm"
            >
              Explore Store Deals
            </Link>
          </div>
        ) : (
          <div className="space-y-6">
            {orders.map((order) => (
              <div
                key={order.id}
                className="rounded-2xl bg-[#2A1163] border border-[#3F1B85] overflow-hidden shadow-xl"
              >
                {/* Order Meta Header */}
                <div className="px-6 py-4 bg-[#1F0A4D]/70 border-b border-[#3F1B85] flex flex-wrap items-center justify-between gap-4 text-xs">
                  <div className="flex flex-wrap items-center gap-4">
                    <span className="inline-flex items-center gap-1.5 font-bold text-gray-300">
                      <Package className="w-4 h-4 text-[#FAD318]" />
                      Order #{order.payment_reference || order.id.slice(0, 8)}
                    </span>
                    <span className="inline-flex items-center gap-1.5 text-gray-400">
                      <Calendar className="w-3.5 h-3.5" />
                      {new Date(order.created_at).toLocaleString()}
                    </span>
                  </div>

                  <div className="flex items-center gap-3">
                    <span className="px-2.5 py-0.5 rounded-full bg-[#63E3C2]/15 text-[#63E3C2] font-extrabold uppercase">
                      {order.status}
                    </span>
                    <span className="text-sm font-black text-white">
                      Total: €{(order.total_cents / 100).toFixed(2)}
                    </span>
                  </div>
                </div>

                {/* Purchased Keys in Order */}
                <div className="divide-y divide-[#3F1B85]">
                  {(order.items || []).map((item) => {
                    const isVisible = !!revealedKeys[item.id];
                    const isCopied = copiedId === item.id;

                    return (
                      <div
                        key={item.id}
                        className="p-5 flex flex-col md:flex-row md:items-center justify-between gap-4"
                      >
                        <div className="flex items-center gap-4">
                          {item.cover_image_url && (
                            <img
                              src={item.cover_image_url}
                              alt={item.product_title}
                              className="w-24 h-14 object-cover rounded-lg border border-[#3F1B85] shrink-0"
                            />
                          )}
                          <div>
                            <h3 className="font-extrabold text-white text-base">
                              {item.product_title || 'Digital Game Key'}
                            </h3>
                            <div className="flex items-center gap-2 mt-1 text-xs">
                              <span className="px-2 py-0.5 rounded bg-[#4618AC] text-white font-bold">
                                {item.product_platform}
                              </span>
                              <span className="text-[#63E3C2] font-bold">
                                {item.product_region}
                              </span>
                              <span className="text-gray-400">
                                • Paid €{(item.unit_price_cents / 100).toFixed(2)}
                              </span>
                            </div>
                          </div>
                        </div>

                        {/* Key Reveal & Copy Controls */}
                        <div className="flex items-center gap-2 bg-[#1F0A4D] p-2 pl-3.5 rounded-xl border border-[#3F1B85]">
                          <code className="font-mono text-sm font-black tracking-wider text-[#FAD318]">
                            {isVisible ? item.digital_key : '•••••-•••••-•••••'}
                          </code>

                          <button
                            onClick={() => toggleReveal(item.id)}
                            title={isVisible ? 'Hide Key' : 'Reveal Key'}
                            className="p-2 rounded-lg bg-[#2A1163] hover:bg-[#3F1B85] text-gray-300 hover:text-white transition-colors cursor-pointer"
                          >
                            {isVisible ? (
                              <EyeOff className="w-4 h-4" />
                            ) : (
                              <Eye className="w-4 h-4" />
                            )}
                          </button>

                          <button
                            onClick={() => handleCopy(item.id, item.digital_key)}
                            className={`px-3 py-2 rounded-lg font-extrabold text-xs flex items-center gap-1.5 transition-colors cursor-pointer ${
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
                                Copy
                              </>
                            )}
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};