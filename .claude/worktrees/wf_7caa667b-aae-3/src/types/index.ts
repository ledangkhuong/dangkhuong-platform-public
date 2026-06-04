/**
 * Shared type definitions used across the platform.
 * Import from "@/types" in any file that needs these interfaces.
 */

// ─── User / Profile ─────────────────────────────────────────────

export interface Profile {
  id: string;
  full_name: string | null;
  avatar_url: string | null;
  phone: string | null;
  role: string;
  tier: string;
  xp: number;
  level: number;
  streak: number;
  created_at: string;
}

// ─── Course / Product ───────────────────────────────────────────

export interface Course {
  id: string;
  title: string;
  slug: string;
  description: string | null;
  thumbnail: string | null;
  price: number;
  status: string;
  created_at: string;
}

// ─── Order ──────────────────────────────────────────────────────

export interface Order {
  id: string;
  user_id: string;
  product_id: string;
  amount: number;
  status: string;
  order_code: string;
  payment_method: string | null;
  created_at: string;
}

// ─── API Response Generics ──────────────────────────────────────

/** Standard API response wrapper */
export interface ApiResponse<T> {
  data?: T;
  error?: string;
  message?: string;
}

/** Paginated API response */
export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}
