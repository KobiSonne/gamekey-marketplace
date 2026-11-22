import React from 'react';
import { Link } from 'react-router-dom';
import { ShieldCheck, Layers } from 'lucide-react';
import { Product } from '../../types/catalog';

interface ProductCardProps {
  product: Product;
}

const getPlatformBadgeStyle = (platform: string) => {
  switch (platform.toLowerCase()) {
    case 'steam':
      return 'bg-[#1b2838] text-[#66c0f4] border-[#66c0f4]/30';
    case 'playstation':
      return 'bg-[#003791] text-white border-[#0070d1]/40';
    case 'xbox':
      return 'bg-[#107c10] text-white border-[#52b043]/40';
    case 'nintendo':
      return 'bg-[#e60012] text-white border-[#ff4d5a]/40';
    default:
      return 'bg-[#1F0A4D] text-gray-200 border-[#3F1B85]';
  }
};

export const ProductCard: React.FC<ProductCardProps> = ({ product }) => {
  const hasDiscount =
    product.discount_percent !== undefined &&
    product.discount_percent > 0 &&
    product.original_price_cents !== undefined &&
    product.lowest_price_cents !== undefined;

  return (
    <Link
      to={`/products/${product.slug}`}
      className="group relative flex flex-col bg-[#2A1163] hover:bg-[#321575] border border-[#3F1B85] hover:border-[#FAD318]/60 rounded-xl overflow-hidden transition-all duration-200 hover:-translate-y-1 shadow-lg hover:shadow-2xl hover:shadow-[#4618AC]/40"
    >
      {/* Cover Image Wrapper */}
      <div className="relative aspect-[16/9] w-full overflow-hidden bg-[#1F0A4D]">
        <img
          src={product.cover_image_url}
          alt={product.title}
          loading="lazy"
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
        />

        {/* Platform Pill Overlay */}
        <span
          className={`absolute top-2.5 left-2.5 px-2.5 py-1 rounded-md text-[11px] font-extrabold uppercase tracking-wider border backdrop-blur-md shadow-sm ${getPlatformBadgeStyle(
            product.platform
          )}`}
        >
          {product.platform}
        </span>

        {/* Discount Tag Overlay */}
        {hasDiscount && (
          <span className="absolute top-2.5 right-2.5 px-2 py-1 rounded-md bg-[#FD5A20] text-white text-xs font-black tracking-tight shadow-md">
            -{product.discount_percent}%
          </span>
        )}
      </div>

      {/* Card Body */}
      <div className="flex flex-col flex-1 p-4">
        {/* Title */}
        <h3 className="text-sm font-bold text-white line-clamp-2 group-hover:text-[#FAD318] transition-colors min-h-[2.5rem]">
          {product.title}
        </h3>

        {/* Region & Offer Count Row */}
        <div className="mt-2 flex items-center justify-between gap-2">
          <span className="inline-flex items-center gap-1 text-[11px] font-extrabold uppercase tracking-wider text-[#63E3C2]">
            <ShieldCheck className="w-3.5 h-3.5 shrink-0" />
            {product.region}
          </span>

          {product.offer_count !== undefined && product.offer_count > 0 && (
            <span className="inline-flex items-center gap-1 text-[11px] text-gray-400 font-medium">
              <Layers className="w-3 h-3" />
              {product.offer_count} {product.offer_count === 1 ? 'offer' : 'offers'}
            </span>
          )}
        </div>

        {/* Pricing Footer */}
        <div className="mt-auto pt-3 border-t border-[#3F1B85]/70 flex items-end justify-between">
          <div>
            <span className="block text-[10px] uppercase tracking-wider text-gray-400 font-semibold">
              From
            </span>
            {product.lowest_price_cents !== undefined ? (
              <div className="flex items-baseline gap-2">
                <span className="text-xl font-black text-white tracking-tight">
                  €{(product.lowest_price_cents / 100).toFixed(2)}
                </span>
                {hasDiscount && product.original_price_cents && (
                  <span className="text-xs text-gray-400 line-through font-medium">
                    €{(product.original_price_cents / 100).toFixed(2)}
                  </span>
                )}
              </div>
            ) : (
              <span className="text-sm font-bold text-gray-400">Out of stock</span>
            )}
          </div>

          <span className="px-2.5 py-1 rounded-lg bg-[#1F0A4D] group-hover:bg-[#FAD318] text-gray-300 group-hover:text-[#1F0A4D] text-xs font-extrabold transition-colors">
            View
          </span>
        </div>
      </div>
    </Link>
  );
};