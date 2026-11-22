export type UserRole = 'buyer' | 'seller' | 'admin';

export interface User {
  id: string;
  email: string;
  username: string;
  role: UserRole;
  seller_rating: number;
  seller_sales_count: number;
  created_at: string;
}

export interface AuthResponse {
  token: string;
  user: User;
}