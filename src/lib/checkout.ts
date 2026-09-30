import { loadStripe } from '@stripe/stripe-js';
import { supabase } from '@/lib/supabase';
import type { CartItem } from '@/context/cart-context';

const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY);

const API_BASE_URL = import.meta.env.VITE_SERVER_URL || window.location.origin;

export type CheckoutErrorCode = 'already_owned' | 'auth_required' | 'failed';

export class CheckoutError extends Error {
  code: CheckoutErrorCode;
  constructor(message: string, code: CheckoutErrorCode) {
    super(message);
    this.code = code;
  }
}

const normalizeImageUrl = (value?: string): string | undefined => {
  if (!value) return undefined;
  try {
    const url = new URL(value, window.location.origin);
    url.search = '';
    url.hash = '';
    url.protocol = 'https:';
    return url.toString();
  } catch {
    return undefined;
  }
};

/** Prices are resolved server-side; the client only sends type, id and quantity. */
const toCheckoutItems = (items: CartItem[]) =>
  items.map((item) => ({
    type: item.type,
    id: item.id,
    name: item.title,
    quantity: item.type === 'course' ? 1 : item.quantity,
    image: normalizeImageUrl(item.cover_url),
  }));

/** Creates a Stripe Checkout session and redirects. Throws CheckoutError on failure. */
export async function startCheckout(items: CartItem[], locale: string): Promise<void> {
  const [stripe, sessionResult] = await Promise.all([stripePromise, supabase.auth.getSession()]);
  if (!stripe) throw new CheckoutError('Stripe failed to initialize', 'failed');

  const session = sessionResult.data.session;
  const response = await fetch(`${API_BASE_URL}/api/create-checkout-session`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {}),
    },
    body: JSON.stringify({
      customerEmail: session?.user?.email ?? undefined,
      locale,
      items: toCheckoutItems(items),
    }),
  });

  if (!response.ok) {
    const body = (await response.json().catch(() => ({}))) as { error?: string; code?: string };
    const code: CheckoutErrorCode =
      body.code === 'already_owned' || body.code === 'auth_required' ? body.code : 'failed';
    throw new CheckoutError(body.error || 'Failed to create checkout session', code);
  }

  const { sessionId } = (await response.json()) as { sessionId: string };
  try {
    sessionStorage.setItem(
      'jdi_last_checkout',
      JSON.stringify(items.map((item) => ({ type: item.type, id: item.id, slug: item.slug, title: item.title })))
    );
  } catch {
    // Success page falls back to the cart itself.
  }

  const result = await stripe.redirectToCheckout({ sessionId });
  if (result.error) {
    throw new CheckoutError(result.error.message || 'Redirect failed', 'failed');
  }
}
