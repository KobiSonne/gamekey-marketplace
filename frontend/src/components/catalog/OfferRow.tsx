import React from 'react';
import { ShieldCheck, ShoppingCart, Award, CheckCircle2 } from 'lucide-react';
import { Offer } from '../../types/catalog';

interface OfferRowProps {
  offer: Offer;
  isCheapest?: boolean;
  onAddToCart: (offer: Offer) => void;
}

export const OfferRow: React.FC<OfferRowProps> = ({ offer, isCheapest = false, onAddToCart }) => {
  const ratingPercent = Math.round((offer.seller_rating / 5) * 100);
  const hasDiscount =
    offer.original_price_cents !== undefined && offer.original_price_cents > offer.price_cents;
  const discountPercent = hasDiscount
    ? Math.round(((offer.original_price_cents! - offer.price_cents) / offer.original_price_cents!) * 100)
    : 0;

  return (
    <div
      className={`flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 sm:p-5 rounded-xl border transition-all ${
        isCheapest
          ? 'bg-[#2A1163] border-[#FAD318]/60 shadow-lg shadow-[#4618AC]/30'
          : 'bg-[#2A1163]/80 hover:bg-[#2A1163] border-[#3F1B85]'
      }`}
    >
      {/* Left: Seller Identity & Reputation */}
      <div className="flex items-center gap-3.5">
        <div className="w-11 h-11 rounded-xl bg-[#1F0A4D] border border-[#3F1B85] flex items-center justify-center text-[#FAD318] font-black text-base shrink-0">
          {(offer.seller_username || 'S').charAt(0).toUpperCase()}
        </div>

        <div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-extrabold text-white text-base">
              {offer.seller_username || 'Verified Seller'}
            </span>
            {isCheapest && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-[#FAD318]/15 border border-[#FAD318]/40 text-[#FAD318] text-[10px] font-black uppercase tracking-wider">
                <Award className="w-3 h-3" />
                Best Price
              </span>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-3 mt-1 text-xs">
            <span className="inline-flex items-center gap-1 font-bold text-[#63E3C2]">
              <ShieldCheck className="w-3.5 h-3.5" />
              {ratingPercent}% positive rating
            </span>
            {offer.seller_sales_count !== undefined && (
              <span className="text-gray-400">
                ({offer.seller_sales_count.toLocaleString()} sales)
              </span>
            )}
            <span className="inline-flex items-center gap-1 text-emerald-400 font-semibold">
              <CheckCircle2 className="w-3.5 h-3.5" />
              {offer.stock_count > 10 ? 'In Stock • Instant Delivery' : `Only ${offer.stock_count} left`}
            </span>
          </div>
        </div>
      </div>

      {/* Right: Price & Add to Cart Action */}
      <div className="flex items-center justify-between sm:justify-end gap-5 pt-3 sm:pt-0 border-t sm:border-t-0 border-[#3F1B85]">
        <div className="text-left sm:text-right">
          {hasDiscount && (
            <div className="flex items-center sm:justify-end gap-1.5 mb-0.5">
              <span className="text-xs text-gray-400 line-through">
                €{(offer.original_price_cents! / 100).toFixed(2)}
              </span>
              <span className="px-1.5 py-0.5 rounded bg-[#FD5A20] text-white text-[10px] font-black">
                -{discountPercent}%
              </span>
            </div>
          )}
          <div className="text-2xl font-black text-white tracking-tight">
            €{(offer.price_cents / 100).toFixed(2)}
          </div>
        </div>

        <button
          onClick={() => onAddToCart(offer)}
          disabled={offer.stock_count <= 0}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#4618AC] hover:bg-[#FAD318] text-white hover:text-[#1F0A4D] disabled:opacity-40 disabled:cursor-not-allowed font-extrabold text-sm border border-[#6129DB] hover:border-[#FAD318] transition-all cursor-pointer shrink-0"
        >
          <ShoppingCart className="w-4 h-4 stroke-[2.5]" />
          Add to Cart
        </button>
      </div>
    </div>
  );
};