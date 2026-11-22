import React from 'react';
import { Link } from 'react-router-dom';
import { Flame, ArrowRight, Clock } from 'lucide-react';
import { HomepageBlock } from '../../types/catalog';
import { ProductCard } from '../catalog/ProductCard';

export const ProductCarouselBlock: React.FC<{ block: HomepageBlock; isFlashDeal?: boolean }> = ({
  block,
  isFlashDeal = false,
}) => {
  const products = block.products || [];
  if (products.length === 0) return null;

  const isHorizontalRow = isFlashDeal || block.config?.layout === 'horizontal_row';
  const endsInHours = block.config?.ends_in_hours;

  return (
    <section className="space-y-5">
      {/* Header driven completely by backend block metadata */}
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            {isFlashDeal && (
              <span className="inline-flex items-center justify-center w-8 h-8 rounded-lg bg-[#FD5A20] text-white shadow-md">
                <Flame className="w-5 h-5" />
              </span>
            )}
            <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
              {block.title}
            </h2>
            {isFlashDeal && endsInHours && (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#FD5A20]/20 border border-[#FD5A20] text-[#FD5A20] text-xs font-extrabold">
                <Clock className="w-3.5 h-3.5" />
                Ends in {endsInHours}h
              </span>
            )}
          </div>
          {block.subtitle && <p className="mt-1 text-sm text-gray-300">{block.subtitle}</p>}
        </div>

        <Link
          to="/store"
          className="inline-flex items-center gap-1.5 text-sm font-extrabold text-[#FAD318] hover:underline"
        >
          See all deals
          <ArrowRight className="w-4 h-4" />
        </Link>
      </div>

      {/* Layout Grid vs Horizontal Row */}
      {isHorizontalRow ? (
        <div className="grid grid-flow-col auto-cols-[240px] sm:auto-cols-[265px] gap-5 overflow-x-auto pb-4 snap-x">
          {products.map((product) => (
            <div key={product.id} className="snap-start">
              <ProductCard product={product} />
            </div>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {products.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      )}
    </section>
  );
};