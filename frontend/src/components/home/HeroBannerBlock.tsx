import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { ChevronLeft, ChevronRight, Sparkles, ArrowRight } from 'lucide-react';
import { HomepageBlock } from '../../types/catalog';

interface HeroSlideConfig {
  product_slug: string;
  badge?: string;
  headline?: string;
  cta_text?: string;
  accent_color?: string;
}

export const HeroBannerBlock: React.FC<{ block: HomepageBlock }> = ({ block }) => {
  const [activeIndex, setActiveIndex] = useState(0);
  const slides: HeroSlideConfig[] = block.config?.slides || [];
  const products = block.products || [];

  if (slides.length === 0 || products.length === 0) return null;

  const currentSlide = slides[activeIndex % slides.length];
  const matchedProduct =
    products.find((p) => p.slug === currentSlide.product_slug) || products[activeIndex % products.length];

  const handlePrev = () => {
    setActiveIndex((prev) => (prev === 0 ? slides.length - 1 : prev - 1));
  };

  const handleNext = () => {
    setActiveIndex((prev) => (prev + 1) % slides.length);
  };

  return (
    <section className="relative rounded-2xl overflow-hidden border border-[#3F1B85] bg-[#2A1163] shadow-2xl">
      {/* Background Banner Image + Gradient Overlay */}
      <div className="relative h-[380px] sm:h-[440px] w-full">
        <img
          src={matchedProduct.banner_image_url || matchedProduct.cover_image_url}
          alt={matchedProduct.title}
          className="w-full h-full object-cover object-center transition-all duration-500"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-[#1F0A4D] via-[#1F0A4D]/85 to-transparent" />
        <div className="absolute inset-0 bg-gradient-to-t from-[#1F0A4D] via-transparent to-transparent" />

        {/* Foreground Content */}
        <div className="absolute inset-0 flex flex-col justify-center px-6 sm:px-12 max-w-2xl">
          {currentSlide.badge && (
            <div className="inline-flex items-center gap-1.5 self-start px-3 py-1 rounded-full bg-[#FD5A20] text-white text-xs font-black uppercase tracking-wider mb-4 shadow-md">
              <Sparkles className="w-3.5 h-3.5" />
              {currentSlide.badge}
            </div>
          )}

          <h1 className="text-3xl sm:text-5xl font-black text-white leading-tight tracking-tight">
            {currentSlide.headline || matchedProduct.title}
          </h1>

          <p className="mt-3 text-sm sm:text-base text-gray-300 line-clamp-2 max-w-xl">
            {matchedProduct.description}
          </p>

          {/* Price & CTA */}
          <div className="mt-6 flex flex-wrap items-center gap-4">
            <Link
              to={`/products/${matchedProduct.slug}`}
              className="inline-flex items-center gap-2 px-6 py-3.5 rounded-xl bg-[#FAD318] hover:bg-[#E5BE0B] text-[#1F0A4D] font-black text-sm sm:text-base shadow-lg shadow-[#FAD318]/25 transition-all hover:scale-105"
            >
              {currentSlide.cta_text || 'Buy Now'}
              <ArrowRight className="w-4 h-4 stroke-[2.5]" />
            </Link>

            {matchedProduct.lowest_price_cents !== undefined && (
              <div className="px-4 py-2 rounded-xl bg-[#1F0A4D]/90 border border-[#3F1B85] backdrop-blur-md">
                <span className="block text-[10px] uppercase tracking-wider text-gray-400 font-bold">
                  Starting at
                </span>
                <div className="flex items-baseline gap-2">
                  <span className="text-2xl font-black text-[#FAD318]">
                    €{(matchedProduct.lowest_price_cents / 100).toFixed(2)}
                  </span>
                  {matchedProduct.original_price_cents && (
                    <span className="text-xs text-gray-400 line-through">
                      €{(matchedProduct.original_price_cents / 100).toFixed(2)}
                    </span>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Carousel Navigation Controls */}
        {slides.length > 1 && (
          <>
            <button
              onClick={handlePrev}
              aria-label="Previous slide"
              className="absolute left-3 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-[#1F0A4D]/80 hover:bg-[#FAD318] text-white hover:text-[#1F0A4D] border border-[#3F1B85] flex items-center justify-center transition-colors"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <button
              onClick={handleNext}
              aria-label="Next slide"
              className="absolute right-3 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-[#1F0A4D]/80 hover:bg-[#FAD318] text-white hover:text-[#1F0A4D] border border-[#3F1B85] flex items-center justify-center transition-colors"
            >
              <ChevronRight className="w-5 h-5" />
            </button>

            {/* Dots */}
            <div className="absolute bottom-4 right-6 flex items-center gap-2">
              {slides.map((_, idx) => (
                <button
                  key={idx}
                  onClick={() => setActiveIndex(idx)}
                  aria-label={`Slide ${idx + 1}`}
                  className={`h-2 rounded-full transition-all ${
                    idx === activeIndex ? 'w-8 bg-[#FAD318]' : 'w-2 bg-white/40 hover:bg-white/70'
                  }`}
                />
              ))}
            </div>
          </>
        )}
      </div>
    </section>
  );
};