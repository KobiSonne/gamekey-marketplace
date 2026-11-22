import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  ShieldCheck,
  Globe,
  KeyRound,
  Zap,
  ShoppingCart,
  ArrowLeft,
  Tag,
  Calendar,
  Award,
  AlertCircle,
} from 'lucide-react';
import { getProductBySlug } from '../api/catalog';
import { Product, Offer } from '../types/catalog';
import { useCart } from '../context/CartContext';
import { OfferRow } from '../components/catalog/OfferRow';

export const ProductDetailPage: React.FC = () => {
  const { slug } = useParams<{ slug: string }>();
  const { addItem, setIsCartOpen } = useCart();

  const [product, setProduct] = useState<Product | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;
    const loadProduct = async () => {
      if (!slug) return;
      try {
        setIsLoading(true);
        setError(null);
        const data = await getProductBySlug(slug);
        if (isMounted) {
          setProduct(data);
        }
      } catch (err: any) {
        if (isMounted) {
          setError(err?.response?.data?.error || 'Product not found.');
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    loadProduct();
    return () => {
      isMounted = false;
    };
  }, [slug]);

  const handleAddToCart = (offer: Offer) => {
    if (!product) return;
    addItem(product, offer, 1);
  };

  const handleBuyNow = (offer: Offer) => {
    if (!product) return;
    addItem(product, offer, 1);
    setIsCartOpen(true);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#1F0A4D] py-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
          <div className="h-8 w-40 rounded-lg bg-[#2A1163] animate-pulse" />
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            <div className="lg:col-span-4 h-72 rounded-2xl bg-[#2A1163] animate-pulse border border-[#3F1B85]" />
            <div className="lg:col-span-4 h-72 rounded-2xl bg-[#2A1163] animate-pulse border border-[#3F1B85]" />
            <div className="lg:col-span-4 h-72 rounded-2xl bg-[#2A1163] animate-pulse border border-[#3F1B85]" />
          </div>
        </div>
      </div>
    );
  }

  if (error || !product) {
    return (
      <div className="min-h-screen bg-[#1F0A4D] py-20 px-4 text-center">
        <div className="max-w-md mx-auto p-8 rounded-2xl bg-[#2A1163] border border-[#FD5A20] space-y-4">
          <AlertCircle className="w-12 h-12 text-[#FD5A20] mx-auto" />
          <h1 className="text-2xl font-black text-white">Game Not Found</h1>
          <p className="text-sm text-gray-300">{error || 'This product may have been removed.'}</p>
          <Link
            to="/store"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#FAD318] text-[#1F0A4D] font-extrabold text-sm"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Store
          </Link>
        </div>
      </div>
    );
  }

  // Offers are already sorted by price ascending from GET /api/products/:slug
  const offers = product.offers || [];
  const featuredOffer = offers.length > 0 ? offers[0] : null;
  const featuredRatingPercent = featuredOffer
    ? Math.round((featuredOffer.seller_rating / 5) * 100)
    : 100;
  const featuredDiscountPercent =
    featuredOffer &&
    featuredOffer.original_price_cents &&
    featuredOffer.original_price_cents > featuredOffer.price_cents
      ? Math.round(
          ((featuredOffer.original_price_cents - featuredOffer.price_cents) /
            featuredOffer.original_price_cents) *
            100
        )
      : 0;

  return (
    <div className="min-h-screen bg-[#1F0A4D] pb-20">
      {/* Blurred Hero Backdrop */}
      <div className="relative overflow-hidden border-b border-[#3F1B85] bg-gradient-to-b from-[#4618AC]/40 to-[#1F0A4D]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6 pb-12">
          {/* Breadcrumb */}
          <Link
            to="/store"
            className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-gray-300 hover:text-[#FAD318] transition-colors mb-6"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Store
          </Link>

          {/* Top Section: 3-Column Eneba Layout (Cover | Metadata & Activation | Featured Offer) */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            {/* Column 1: Cover Art & Genres (4 cols) */}
            <div className="lg:col-span-4 space-y-4">
              <div className="rounded-2xl overflow-hidden border-2 border-[#3F1B85] bg-[#2A1163] shadow-2xl">
                <img
                  src={product.cover_image_url}
                  alt={product.title}
                  className="w-full aspect-[16/9] object-cover"
                />
              </div>

              {/* Genre Tags */}
              {product.genres && product.genres.length > 0 && (
                <div className="flex flex-wrap items-center gap-2">
                  <Tag className="w-3.5 h-3.5 text-gray-400 mr-1" />
                  {product.genres.map((genre) => (
                    <span
                      key={genre}
                      className="px-2.5 py-1 rounded-lg bg-[#2A1163] border border-[#3F1B85] text-xs font-semibold text-gray-200"
                    >
                      {genre}
                    </span>
                  ))}
                </div>
              )}
            </div>

            {/* Column 2: Title, Activation Notice & Description (4 cols) */}
            <div className="lg:col-span-4 space-y-5">
              <div>
                <div className="flex flex-wrap items-center gap-2 mb-2">
                  <span className="px-2.5 py-1 rounded-md bg-[#4618AC] text-white text-xs font-black uppercase tracking-wider">
                    {product.platform}
                  </span>
                  <span className="px-2.5 py-1 rounded-md bg-[#63E3C2]/15 border border-[#63E3C2]/40 text-[#63E3C2] text-xs font-black uppercase tracking-wider">
                    {product.region}
                  </span>
                </div>

                <h1 className="text-2xl sm:text-3xl font-black text-white leading-tight">
                  {product.title}
                </h1>
              </div>

              {/* Activation Notice Box */}
              <div className="p-4 rounded-xl bg-[#2A1163] border border-[#3F1B85] space-y-3">
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-lg bg-[#63E3C2]/15 text-[#63E3C2] flex items-center justify-center shrink-0 mt-0.5">
                    <Globe className="w-4 h-4" />
                  </div>
                  <div>
                    <p className="text-sm font-extrabold text-white">
                      Digital key • Valid in {product.region}
                    </p>
                    <p className="text-xs text-gray-300 mt-0.5">
                      Can be activated on <span className="font-bold text-white">{product.platform}</span> in your selected region.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3 pt-2 border-t border-[#3F1B85]">
                  <div className="w-8 h-8 rounded-lg bg-[#FAD318]/15 text-[#FAD318] flex items-center justify-center shrink-0 mt-0.5">
                    <KeyRound className="w-4 h-4" />
                  </div>
                  <div>
                    <p className="text-sm font-extrabold text-white">Instant Digital Delivery</p>
                    <p className="text-xs text-gray-300 mt-0.5">
                      Receive your activation code immediately after checkout.
                    </p>
                  </div>
                </div>
              </div>

              {/* Description */}
              <div className="space-y-2">
                <h2 className="text-xs font-extrabold uppercase tracking-wider text-gray-400">
                  About This Game
                </h2>
                <p className="text-sm text-gray-200 leading-relaxed">{product.description}</p>
                {product.release_date && (
                  <p className="inline-flex items-center gap-1.5 text-xs text-gray-400 pt-1">
                    <Calendar className="w-3.5 h-3.5" />
                    Released: {new Date(product.release_date).toLocaleDateString()}
                  </p>
                )}
              </div>
            </div>

            {/* Column 3: Highlighted Featured Offer Card (4 cols) */}
            <div className="lg:col-span-4">
              {featuredOffer ? (
                <div className="p-6 rounded-2xl bg-[#2A1163] border-2 border-[#FAD318] shadow-2xl shadow-[#4618AC]/40 space-y-5">
                  <div className="flex items-center justify-between">
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#FAD318] text-[#1F0A4D] text-xs font-black uppercase tracking-wider">
                      <Award className="w-3.5 h-3.5 stroke-[2.5]" />
                      Featured Offer
                    </span>
                    {featuredDiscountPercent > 0 && (
                      <span className="px-2.5 py-1 rounded-md bg-[#FD5A20] text-white text-xs font-black">
                        SAVE {featuredDiscountPercent}%
                      </span>
                    )}
                  </div>

                  {/* Seller Info */}
                  <div className="p-3 rounded-xl bg-[#1F0A4D] border border-[#3F1B85] flex items-center justify-between">
                    <div>
                      <span className="block text-[10px] uppercase tracking-wider text-gray-400 font-bold">
                        Sold by
                      </span>
                      <span className="text-sm font-extrabold text-white">
                        {featuredOffer.seller_username || 'Verified Seller'}
                      </span>
                    </div>
                    <div className="text-right">
                      <span className="inline-flex items-center gap-1 text-xs font-bold text-[#63E3C2]">
                        <ShieldCheck className="w-3.5 h-3.5" />
                        {featuredRatingPercent}% rating
                      </span>
                      <span className="block text-[11px] text-gray-400">
                        {featuredOffer.stock_count} keys available
                      </span>
                    </div>
                  </div>

                  {/* Price Display */}
                  <div>
                    <span className="text-xs text-gray-400 font-semibold">Final Price</span>
                    <div className="flex items-baseline gap-3 mt-0.5">
                      <span className="text-4xl font-black text-white tracking-tight">
                        €{(featuredOffer.price_cents / 100).toFixed(2)}
                      </span>
                      {featuredOffer.original_price_cents &&
                        featuredOffer.original_price_cents > featuredOffer.price_cents && (
                          <span className="text-base text-gray-400 line-through font-semibold">
                            €{(featuredOffer.original_price_cents / 100).toFixed(2)}
                          </span>
                        )}
                    </div>
                  </div>

                  {/* Primary Yellow CTAs */}
                  <div className="space-y-3 pt-1">
                    <button
                      onClick={() => handleBuyNow(featuredOffer)}
                      className="w-full py-3.5 px-5 rounded-xl bg-[#FAD318] hover:bg-[#E5BE0B] text-[#1F0A4D] font-black text-base shadow-lg shadow-[#FAD318]/25 flex items-center justify-center gap-2 transition-all hover:scale-[1.02] cursor-pointer"
                    >
                      <Zap className="w-5 h-5 fill-current" />
                      Buy Now
                    </button>

                    <button
                      onClick={() => handleAddToCart(featuredOffer)}
                      className="w-full py-3 px-5 rounded-xl bg-[#4618AC] hover:bg-[#5722CC] text-white font-extrabold text-sm border border-[#6129DB] flex items-center justify-center gap-2 transition-colors cursor-pointer"
                    >
                      <ShoppingCart className="w-4 h-4 stroke-[2.5]" />
                      Add to Cart
                    </button>
                  </div>
                </div>
              ) : (
                <div className="p-6 rounded-2xl bg-[#2A1163] border border-[#3F1B85] text-center space-y-2">
                  <p className="text-lg font-black text-white">Out of Stock</p>
                  <p className="text-xs text-gray-400">
                    All seller keys for this title are currently sold out.
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Section: All Competing Seller Offers */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-10 space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight">
              {offers.length > 1
                ? `Compare All ${offers.length} Seller Offers`
                : 'Available Marketplace Offers'}
            </h2>
            <p className="text-xs sm:text-sm text-gray-400 mt-0.5">
              Sorted by lowest price first • All keys are verified for instant digital activation
            </p>
          </div>
        </div>

        {offers.length > 0 ? (
          <div className="space-y-3">
            {offers.map((offer, index) => (
              <OfferRow
                key={offer.id}
                offer={offer}
                isCheapest={index === 0}
                onAddToCart={handleAddToCart}
              />
            ))}
          </div>
        ) : (
          <div className="p-8 rounded-2xl bg-[#2A1163] border border-[#3F1B85] text-center text-sm text-gray-400">
            No active offers available right now.
          </div>
        )}
      </section>
    </div>
  );
};