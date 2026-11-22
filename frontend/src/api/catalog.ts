import { apiClient } from './client';
import { HomepageBlock, Product } from '../types/catalog';
import { Order } from '../types/order';

export const getHomepage = async () => {
  const { data } = await apiClient.get<{ blocks: HomepageBlock[] }>('/homepage');
  return data.blocks;
};

export const searchProducts = async (params: {
  q?: string;
  platform?: string;
  region?: string;
  min_price?: number;
  max_price?: number;
  sort?: string;
  limit?: number;
}) => {
  const { data } = await apiClient.get<{ products: Product[]; count: number }>('/products', { params });
  return data.products;
};

export const getProductBySlug = async (slug: string) => {
  const { data } = await apiClient.get<{ product: Product }>(`/products/${slug}`);
  return data.product;
};

export const checkoutOrder = async (items: { offer_id: string; quantity: number }[]) => {
  const { data } = await apiClient.post<{ order: Order }>('/checkout', { items });
  return data.order;
};

export const getUserOrders = async () => {
  const { data } = await apiClient.get<{ orders: Order[] }>('/orders');
  return data.orders;
};