export interface Offer {
  id: string;
  product_id: string;
  seller_id: string;
  price_cents: number;
  original_price_cents?: number;
  currency: string;
  seller_rating: number;
  stock_count: number;
  is_active: boolean;
  seller_username?: string;
  seller_sales_count?: number;
}

export interface Product {
  id: string;
  slug: string;
  title: string;
  description: string;
  platform: string; // 'Steam', 'PlayStation', 'Xbox', 'Nintendo'
  region: string;   // 'GLOBAL', 'EUROPE', 'US'
  product_type: string;
  cover_image_url: string;
  banner_image_url?: string;
  genres: string[];
  release_date?: string;
  lowest_price_cents?: number;
  original_price_cents?: number;
  discount_percent?: number;
  offer_count?: number;
  offers?: Offer[];
}

export interface HomepageBlock {
  id: string;
  block_type: string; // 'hero_banner', 'best_sellers', 'flash_deals', 'platform_spotlight'
  title: string;
  subtitle?: string;
  sort_order: number;
  is_active: boolean;
  config: any;
  products?: Product[];
}