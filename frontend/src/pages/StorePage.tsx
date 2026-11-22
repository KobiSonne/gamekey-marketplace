import React, { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { SlidersHorizontal, RotateCcw, SearchX, ArrowUpDown } from 'lucide-react';
import { apiClient } from '../api/client';
import { Product } from '../types/catalog';
import { ProductCard } from '../components/catalog/ProductCard';

const PLATFORMS = ['Steam', 'PlayStation', 'Xbox', 'Nintendo'];
const REGIONS = ['GLOBAL', 'EUROPE', 'US'];
const SORT_OPTIONS = [
  { value: 'popularity', label: 'Best Match' },
  { value: 'price_asc', label: 'Price: Low to High' },
  { value: 'price_desc', label: 'Price: High to Low' },
  { value: 'newest', label: 'Newest Releases' },
];

export const StorePage: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();

  // Read filters from URL query parameters
  const q = searchParams.get('q') || '';
  const selectedPlatform = searchParams.get('platform') || '';
  const selectedRegion = searchParams.get('region') || '';
  const minPriceParam = searchParams.get('min_price') || '';
  const maxPriceParam = searchParams.get('max_price') || '';
  const sort = searchParams.get('sort') || 'popularity';

  // Local controlled inputs for EUR price fields before applying
  const [minPriceInput, setMinPriceInput] = useState(minPriceParam);
  const [maxPriceInput, setMaxPriceInput] = useState(maxPriceParam);

  const [products, setProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    setMinPriceInput(minPriceParam);
    setMaxPriceInput(maxPriceParam);
  }, [minPriceParam, maxPriceParam]);

  useEffect(() => {
    let isMounted = true;
    const fetchCatalog = async () => {
      setIsLoading(true);
      try {
        const params: Record<string, string | number> = {
          sort,
          limit: 40,
        };
        if (q) params.q = q;
        if (selectedPlatform) params.platform = selectedPlatform;
        if (selectedRegion) params.region = selectedRegion;
        // Convert EUR input to cents for backend API
        if (minPriceParam && !isNaN(Number(minPriceParam))) {
          params.min_price = Math.round(Number(minPriceParam) * 100);
        }
        if (maxPriceParam && !isNaN(Number(maxPriceParam))) {
          params.max_price = Math.round(Number(maxPriceParam) * 100);
        }

        const { data } = await apiClient.get<{ products: Product[] }>('/products', { params });
        if (isMounted) {
          setProducts(data.products || []);
        }
      } catch (err) {
        console.error('Error loading catalog:', err);
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    fetchCatalog();
    return () => {
      isMounted = false;
    };
  }, [q, selectedPlatform, selectedRegion, minPriceParam, maxPriceParam, sort]);

  const updateParam = (key: string, value: string) => {
    const next = new URLSearchParams(searchParams);
    if (value) {
      next.set(key, value);
    } else {
      next.delete(key);
    }
    setSearchParams(next);
  };

  const toggleCheckboxParam = (key: string, value: string, current: string) => {
    updateParam(key, current === value ? '' : value);
  };

  const handlePriceApply = (e: React.FormEvent) => {
    e.preventDefault();
    const next = new URLSearchParams(searchParams);
    if (minPriceInput.trim()) next.set('min_price', minPriceInput.trim());
    else next.delete('min_price');

    if (maxPriceInput.trim()) next.set('max_price', maxPriceInput.trim());
    else next.delete('max_price');

    setSearchParams(next);
  };

  const handleResetFilters = () => {
    setMinPriceInput('');
    setMaxPriceInput('');
    setSearchParams({});
  };

  const hasActiveFilters = Boolean(
    q || selectedPlatform || selectedRegion || minPriceParam || maxPriceParam
  );

  return (
    <div className="min-h-screen bg-[#1F0A4D] py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Page Title & Active Search Banner */}
        <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
              {q ? `Search results for "${q}"` : 'Browse Digital Game Keys'}
            </h1>
            <p className="text-sm text-gray-400 mt-1">
              {isLoading ? 'Searching catalog...' : `${products.length} games found`}
            </p>
          </div>

          {/* Sort Bar */}
          <div className="flex items-center gap-3 bg-[#2A1163] px-4 py-2.5 rounded-xl border border-[#3F1B85]">
            <ArrowUpDown className="w-4 h-4 text-[#FAD318]" />
            <label htmlFor="sort-select" className="text-xs font-bold uppercase tracking-wider text-gray-300">
              Sort by:
            </label>
            <select
              id="sort-select"
              value={sort}
              onChange={(e) => updateParam('sort', e.target.value)}
              className="bg-transparent text-sm font-extrabold text-white focus:outline-none cursor-pointer"
            >
              {SORT_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value} className="bg-[#1F0A4D] text-white">
                  {opt.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="flex flex-col lg:flex-row gap-8">
          {/* Sidebar Filter Panel */}
          <aside className="w-full lg:w-64 shrink-0 space-y-6">
            <div className="bg-[#2A1163] border border-[#3F1B85] rounded-2xl p-5 space-y-6 shadow-xl">
              <div className="flex items-center justify-between border-b border-[#3F1B85] pb-3">
                <div className="flex items-center gap-2 font-black text-white text-sm uppercase tracking-wider">
                  <SlidersHorizontal className="w-4 h-4 text-[#FAD318]" />
                  Filters
                </div>
                {hasActiveFilters && (
                  <button
                    onClick={handleResetFilters}
                    className="inline-flex items-center gap-1 text-xs font-bold text-[#FD5A20] hover:underline"
                  >
                    <RotateCcw className="w-3 h-3" />
                    Reset
                  </button>
                )}
              </div>

              {/* Platform Checkboxes */}
              <div className="space-y-3">
                <h3 className="text-xs font-extrabold uppercase tracking-wider text-gray-300">
                  Platform
                </h3>
                <div className="space-y-2">
                  {PLATFORMS.map((platform) => {
                    const checked = selectedPlatform === platform;
                    return (
                      <label
                        key={platform}
                        className="flex items-center gap-3 cursor-pointer group select-none"
                      >
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() =>
                            toggleCheckboxParam('platform', platform, selectedPlatform)
                          }
                          className="w-4 h-4 rounded border-[#3F1B85] bg-[#1F0A4D] text-[#FAD318] focus:ring-[#FAD318]"
                        />
                        <span
                          className={`text-sm font-semibold transition-colors ${
                            checked ? 'text-[#FAD318]' : 'text-gray-300 group-hover:text-white'
                          }`}
                        >
                          {platform}
                        </span>
                      </label>
                    );
                  })}
                </div>
              </div>

              {/* Region Checkboxes */}
              <div className="space-y-3 pt-4 border-t border-[#3F1B85]">
                <h3 className="text-xs font-extrabold uppercase tracking-wider text-gray-300">
                  Activation Region
                </h3>
                <div className="space-y-2">
                  {REGIONS.map((region) => {
                    const checked = selectedRegion === region;
                    return (
                      <label
                        key={region}
                        className="flex items-center gap-3 cursor-pointer group select-none"
                      >
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() => toggleCheckboxParam('region', region, selectedRegion)}
                          className="w-4 h-4 rounded border-[#3F1B85] bg-[#1F0A4D] text-[#FAD318] focus:ring-[#FAD318]"
                        />
                        <span
                          className={`text-sm font-semibold transition-colors ${
                            checked ? 'text-[#63E3C2]' : 'text-gray-300 group-hover:text-white'
                          }`}
                        >
                          {region}
                        </span>
                      </label>
                    );
                  })}
                </div>
              </div>

              {/* Price Range Inputs */}
              <form onSubmit={handlePriceApply} className="space-y-3 pt-4 border-t border-[#3F1B85]">
                <h3 className="text-xs font-extrabold uppercase tracking-wider text-gray-300">
                  Price Range (EUR)
                </h3>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    placeholder="Min €"
                    value={minPriceInput}
                    onChange={(e) => setMinPriceInput(e.target.value)}
                    className="w-full bg-[#1F0A4D] border border-[#3F1B85] rounded-lg px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-[#FAD318]"
                  />
                  <span className="text-gray-400 font-bold">-</span>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    placeholder="Max €"
                    value={maxPriceInput}
                    onChange={(e) => setMaxPriceInput(e.target.value)}
                    className="w-full bg-[#1F0A4D] border border-[#3F1B85] rounded-lg px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-[#FAD318]"
                  />
                </div>
                <button
                  type="submit"
                  className="w-full py-2 rounded-lg bg-[#4618AC] hover:bg-[#5722CC] text-white text-xs font-extrabold uppercase tracking-wider transition-colors"
                >
                  Apply Price
                </button>
              </form>
            </div>
          </aside>

          {/* Main Product Grid */}
          <div className="flex-1">
            {isLoading ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-5">
                {[...Array(6)].map((_, idx) => (
                  <div
                    key={idx}
                    className="h-72 rounded-xl bg-[#2A1163] animate-pulse border border-[#3F1B85]"
                  />
                ))}
              </div>
            ) : products.length === 0 ? (
              <div className="bg-[#2A1163] border border-[#3F1B85] rounded-2xl p-12 text-center space-y-4">
                <SearchX className="w-12 h-12 text-[#FAD318] mx-auto" />
                <h2 className="text-xl font-black text-white">No matching keys found</h2>
                <p className="text-sm text-gray-300 max-w-md mx-auto">
                  Try clearing some filters or adjusting your price range to see more digital keys.
                </p>
                <button
                  onClick={handleResetFilters}
                  className="px-5 py-2.5 rounded-xl bg-[#FAD318] hover:bg-[#E5BE0B] text-[#1F0A4D] font-extrabold text-sm transition-colors"
                >
                  Clear All Filters
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-5">
                {products.map((product) => (
                  <ProductCard key={product.id} product={product} />
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};