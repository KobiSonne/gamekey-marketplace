import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Search, ShoppingCart, User as UserIcon, LogOut, Package, Gamepad2, ShieldCheck } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useCart } from '../../context/CartContext';
import { useDebounce } from '../../hooks/useDebounce';
import { searchProducts } from '../../api/catalog';
import { Product } from '../../types/catalog';

export const Navbar: React.FC<{ onOpenAuth: () => void }> = ({ onOpenAuth }) => {
  const { user, isAuthenticated, logout } = useAuth();
  const { totalItems, setIsCartOpen } = useCart();
  const navigate = useNavigate();

  const [searchQuery, setSearchQuery] = useState('');
  const [suggestions, setSuggestions] = useState<Product[]>([]);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);

  const debouncedSearch = useDebounce(searchQuery, 300);
  const searchRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const fetchSuggestions = async () => {
      if (debouncedSearch.trim().length >= 2) {
        try {
          const results = await searchProducts({ q: debouncedSearch, limit: 5 });
          setSuggestions(results);
          setIsDropdownOpen(true);
        } catch (err) {
          console.error('Failed to fetch search suggestions:', err);
        }
      } else {
        setSuggestions([]);
        setIsDropdownOpen(false);
      }
    };
    fetchSuggestions();
  }, [debouncedSearch]);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      setIsDropdownOpen(false);
      navigate(`/store?q=${encodeURIComponent(searchQuery.trim())}`);
    }
  };

  return (
    <header className="sticky top-0 z-50 bg-[#1F0A4D]/95 backdrop-blur-md border-b border-[#3F1B85]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between gap-4">
        
        {/* Brand Logo */}
        <Link to="/" className="flex items-center gap-2 group">
          <div className="w-10 h-10 rounded-xl bg-[#FAD318] flex items-center justify-center text-[#1F0A4D] shadow-lg shadow-[#FAD318]/20 group-hover:scale-105 transition-transform">
            <Gamepad2 className="w-6 h-6 stroke-[2.5]" />
          </div>
          <div className="flex flex-col">
            <span className="text-xl font-extrabold tracking-wider text-white uppercase">
              Game<span className="text-[#FAD318]">Key</span>
            </span>
            <span className="text-[10px] text-gray-400 font-medium tracking-widest uppercase -mt-1">
              Digital Marketplace
            </span>
          </div>
        </Link>

        {/* Browse Store Link */}
        <Link 
          to="/store" 
          className="hidden md:flex items-center gap-2 px-4 py-2 rounded-xl bg-[#2A1163] hover:bg-[#3F1B85] text-sm font-semibold text-white transition-colors border border-[#3F1B85]"
        >
          Browse Store
        </Link>

        {/* Global Live Search Bar */}
        <div className="flex-1 max-w-xl relative" ref={searchRef}>
          <form onSubmit={handleSearchSubmit} className="relative">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search 1,000+ games, DLCs, gift cards..."
              className="w-full bg-[#2A1163] border border-[#3F1B85] rounded-xl px-4 py-3 pl-11 pr-10 text-sm text-white placeholder-gray-400 focus:outline-none focus:border-[#FAD318] transition-colors shadow-inner"
            />
            <Search className="w-5 h-5 text-gray-400 absolute left-3.5 top-3.5 pointer-events-none" />
            {searchQuery && (
              <button
                type="button"
                onClick={() => { setSearchQuery(''); setSuggestions([]); }}
                className="absolute right-3 top-3 text-xs text-gray-400 hover:text-white px-1.5 py-0.5 rounded bg-[#3F1B85]"
              >
                Clear
              </button>
            )}
          </form>

          {/* Autocomplete Dropdown */}
          {isDropdownOpen && suggestions.length > 0 && (
            <div className="absolute left-0 right-0 mt-2 bg-[#2A1163] border border-[#3F1B85] rounded-xl shadow-2xl overflow-hidden z-50">
              <div className="p-2 text-xs font-semibold text-gray-400 uppercase tracking-wider border-b border-[#3F1B85]">
                Matching Games
              </div>
              <div className="divide-y divide-[#3F1B85]">
                {suggestions.map((product) => (
                  <div
                    key={product.id}
                    onClick={() => {
                      setIsDropdownOpen(false);
                      setSearchQuery('');
                      navigate(`/products/${product.slug}`);
                    }}
                    className="p-3 flex items-center gap-3 hover:bg-[#3F1B85]/50 cursor-pointer transition-colors"
                  >
                    <img 
                      src={product.cover_image_url} 
                      alt={product.title} 
                      className="w-12 h-14 object-cover rounded-lg border border-[#3F1B85]" 
                    />
                    <div className="flex-1 min-w-0">
                      <h4 className="text-sm font-bold text-white truncate">{product.title}</h4>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-[#1F0A4D] text-gray-300 font-medium">
                          {product.platform}
                        </span>
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-[#1F0A4D] text-[#63E3C2] font-medium">
                          {product.region}
                        </span>
                      </div>
                    </div>
                    {product.lowest_price_cents && (
                      <div className="text-right">
                        <span className="text-sm font-extrabold text-[#FAD318]">
                          €{(product.lowest_price_cents / 100).toFixed(2)}
                        </span>
                      </div>
                    )}
                  </div>
                ))}
              </div>
              <div 
                onClick={handleSearchSubmit}
                className="p-3 bg-[#1F0A4D] text-center text-xs font-bold text-[#FAD318] hover:underline cursor-pointer"
              >
                View all results for "{searchQuery}" →
              </div>
            </div>
          )}
        </div>

        {/* Right Actions: Cart & User Menu */}
        <div className="flex items-center gap-3">
          
          {/* Cart Drawer Button */}
          <button
            onClick={() => setIsCartOpen(true)}
            className="relative p-3 rounded-xl bg-[#2A1163] hover:bg-[#3F1B85] border border-[#3F1B85] text-white transition-colors flex items-center justify-center"
            aria-label="Shopping Cart"
          >
            <ShoppingCart className="w-5 h-5" />
            {totalItems > 0 && (
              <span className="absolute -top-1.5 -right-1.5 bg-[#FD5A20] text-white text-[11px] font-extrabold w-5 h-5 rounded-full flex items-center justify-center shadow-md animate-pulse">
                {totalItems}
              </span>
            )}
          </button>

          {/* User Account Menu / Auth Button */}
          {isAuthenticated && user ? (
            <div className="relative">
              <button
                onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
                className="flex items-center gap-2 px-3 py-2 rounded-xl bg-[#2A1163] hover:bg-[#3F1B85] border border-[#3F1B85] text-white transition-colors"
              >
                <div className="w-7 h-7 rounded-lg bg-[#4618AC] flex items-center justify-center text-[#FAD318] font-bold text-xs">
                  {user.username.charAt(0).toUpperCase()}
                </div>
                <span className="text-sm font-semibold max-w-[100px] truncate hidden sm:inline">
                  {user.username}
                </span>
              </button>

              {/* User Dropdown */}
              {isUserMenuOpen && (
                <div className="absolute right-0 mt-2 w-56 bg-[#2A1163] border border-[#3F1B85] rounded-xl shadow-2xl py-2 z-50">
                  <div className="px-4 py-2 border-b border-[#3F1B85]">
                    <p className="text-xs text-gray-400">Signed in as</p>
                    <p className="text-sm font-bold text-white truncate">{user.email}</p>
                    <span className="inline-block mt-1 text-[10px] px-2 py-0.5 rounded-full bg-[#FAD318]/10 text-[#FAD318] font-bold uppercase">
                      {user.role}
                    </span>
                  </div>

                  <Link
                    to="/orders"
                    onClick={() => setIsUserMenuOpen(false)}
                    className="flex items-center gap-3 px-4 py-2.5 text-sm text-gray-200 hover:bg-[#3F1B85] transition-colors"
                  >
                    <Package className="w-4 h-4 text-[#63E3C2]" />
                    My Keys & Orders
                  </Link>

                  {user.role === 'seller' && (
                    <div className="px-4 py-2 text-xs text-gray-400 border-t border-[#3F1B85] flex items-center justify-between">
                      <span>Seller Rating:</span>
                      <span className="font-bold text-[#FAD318]">★ {user.seller_rating.toFixed(2)}</span>
                    </div>
                  )}

                  <div className="border-t border-[#3F1B85] mt-1 pt-1">
                    <button
                      onClick={() => {
                        setIsUserMenuOpen(false);
                        logout();
                        navigate('/');
                      }}
                      className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-red-400 hover:bg-[#3F1B85] transition-colors text-left"
                    >
                      <LogOut className="w-4 h-4" />
                      Sign Out
                    </button>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <button
              onClick={onOpenAuth}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#FAD318] hover:bg-[#E5BE0B] text-[#1F0A4D] font-extrabold text-sm shadow-lg shadow-[#FAD318]/20 transition-all hover:scale-105"
            >
              <UserIcon className="w-4 h-4 stroke-[2.5]" />
              Sign In
            </button>
          )}

        </div>

      </div>
    </header>
  );
};