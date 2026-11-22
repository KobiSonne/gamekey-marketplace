//import { User } from './auth'; // or define inline

export interface OrderItem {
  id: string;
  order_id: string;
  offer_id: string;
  product_id: string;
  unit_price_cents: number;
  digital_key: string;
  is_revealed: boolean;
  created_at: string;
  product_title?: string;
  product_platform?: string;
  product_region?: string;
  cover_image_url?: string;
}

export interface Order {
  id: string;
  user_id: string;
  status: 'PENDING' | 'PAID' | 'FULFILLED' | 'FAILED' | 'REFUNDED';
  total_cents: number;
  currency: string;
  payment_reference?: string;
  created_at: string;
  updated_at: string;
  items: OrderItem[];
}