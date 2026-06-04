export interface PixelConfig {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  pixel_id: string;
  capi_access_token: string | null;
  test_event_code: string | null;
  is_active: boolean;
  /** Khi true → Pixel fire trên mọi pathname (bỏ qua landing_page_pixels binding). */
  apply_to_all_pages: boolean;
  custom_events: Record<string, { event_name: string; value?: number; currency?: string }>;
  notes: string | null;
  created_by: string | null;
  updated_by: string | null;
  created_at: string;
  updated_at: string;
}

/** Public-safe shape (no access token) — what the client receives. */
export type PixelConfigPublic = Pick<
  PixelConfig,
  "id" | "slug" | "name" | "pixel_id" | "is_active" | "apply_to_all_pages" | "custom_events"
> & { has_capi: boolean; has_test_code: boolean };

export interface PixelEventLog {
  id: string;
  config_id: string | null;
  slug: string;
  event_name: string;
  event_id: string;
  source: "pixel" | "capi" | "both";
  user_data: Record<string, unknown>;
  custom_data: Record<string, unknown>;
  fb_response: Record<string, unknown> | null;
  success: boolean;
  error_message: string | null;
  created_at: string;
}

/** 17 Meta Pixel Standard Events (camelCase format dùng trong fbq). */
export const META_STANDARD_EVENTS = [
  "AddPaymentInfo",
  "AddToCart",
  "AddToWishlist",
  "CompleteRegistration",
  "Contact",
  "CustomizeProduct",
  "Donate",
  "FindLocation",
  "InitiateCheckout",
  "Lead",
  "Purchase",
  "Schedule",
  "Search",
  "StartTrial",
  "SubmitApplication",
  "Subscribe",
  "ViewContent",
] as const;
export type MetaStandardEvent = (typeof META_STANDARD_EVENTS)[number];

export interface LandingPage {
  id: string;
  pathname: string;
  name: string;
  description: string | null;
  is_active: boolean;
  /** Fire khi user mở trang (ngoài PageView mặc định). */
  page_event: MetaStandardEvent | null;
  /** Fire khi user submit BẤT KỲ form nào trên page. */
  form_submit_event: MetaStandardEvent | null;
  event_value: number | null;
  event_currency: string | null;
  event_content_name: string | null;
  notes: string | null;
  created_by: string | null;
  updated_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface LandingPageWithPixels extends LandingPage {
  pixels: PixelConfig[];
}
