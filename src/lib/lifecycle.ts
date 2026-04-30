// Lifecycle tracking should hit the same origin as the frontend so it works on
// Vercel (where `/api/*` lives alongside the SPA) and with local proxies.
const API_BASE_URL = window.location.origin;

const getOrCreateId = (storage: Storage, key: string) => {
  const existing = storage.getItem(key);
  if (existing) return existing;
  const generated =
    typeof crypto !== 'undefined' && 'randomUUID' in crypto
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  storage.setItem(key, generated);
  return generated;
};

export const trackLifecycleEvent = async (
  eventName: 'checkout_started' | 'purchase_completed' | 'donation_started' | 'lead_captured',
  metadata?: Record<string, unknown>
) => {
  try {
    const visitorId = getOrCreateId(localStorage, 'jdi_visitor_id');
    const sessionId = getOrCreateId(sessionStorage, 'jdi_session_id');

    await fetch(`${API_BASE_URL}/api/lifecycle-event-track`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      keepalive: true,
      body: JSON.stringify({
        eventName,
        visitorId,
        sessionId,
        pagePath: window.location.pathname,
        metadata: metadata || {},
      }),
    });
  } catch {
    // Intentionally swallow lifecycle tracking failures.
  }
};
