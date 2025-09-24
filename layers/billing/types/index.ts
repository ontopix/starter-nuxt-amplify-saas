import type Stripe from 'stripe'

export interface SubscriptionPlan {
  id: string;                 // "free" | "pro" | "enterprise" | ...
  name: string;
  description: string;
  badge?: "popular" | "new" | "best_value";
  stripeProductId?: string;   // prod_xxx (opcional; normalmente no en Free)
  isDeprecated?: boolean;
  requiresContact?: boolean;  // true para planes "Contact sales"
  features: string[];         // visible en UI/marketing

  // Key-Value flexible para límites/capacidades cuantitativas.
  // Convención recomendada: "limit.*" (e.g., "limit.users", "limit.storage.gb").
  entitlements: Record<string, number | boolean | string>;

  // Variantes de cobro (mensual/anual/monedas), con tipos inline
  prices: Array<{
    id: string;               // ej: "pro-eur-monthly"
    stripePriceId: string;    // price_xxx
    currency: string;         // "EUR", "USD", ...
    unitAmount: number;       // minor units (centimos)
    type: "recurring" | "one_time";
    interval?: "month" | "year"; // requerido si type = "recurring"
    trialDays?: number;
    metadata?: Record<string, number | boolean | string>;
  }>;

  // Metadatos libres (opcionales)
  metadata?: Record<string, number | boolean | string>;
}


export interface BillingPortalSession {
  url: string
}

export interface BillingResponse<T = any> {
  success: boolean
  error?: string
  data?: T
}