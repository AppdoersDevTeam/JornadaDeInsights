// Shared Stripe → purchase helpers.
// Stripe only returns product metadata on line items when data.price.product is expanded;
// without it every lookup would fall back to guessing by position.

const normalizeEmail = (value) => (value || '').trim().toLowerCase();

export const sessionEmail = (session) =>
  normalizeEmail(session?.customer_details?.email || session?.customer_email || '');

const metadataEbookIds = (session) =>
  (session?.metadata?.ebook_ids || '')
    .split(',')
    .map((value) => value.trim())
    .filter(Boolean);

/**
 * Line items for a session with product metadata resolved.
 * Returns [{ title, ebookId, amountCents, quantity }].
 */
export const listSessionProducts = async (stripe, session) => {
  const lineItems = await stripe.checkout.sessions.listLineItems(session.id, {
    limit: 100,
    expand: ['data.price.product'],
  });

  const products = lineItems.data.map((lineItem) => {
    const product =
      lineItem.price && typeof lineItem.price.product === 'object' ? lineItem.price.product : null;
    const metadata = product?.metadata || {};
    return {
      title: lineItem.description || product?.name || 'eBook',
      ebookId: metadata.ebookId || null,
      amountCents: lineItem.amount_total ?? lineItem.price?.unit_amount ?? 0,
      quantity: lineItem.quantity ?? 1,
    };
  });

  // A single line item with a single metadata id is unambiguous; anything else is not.
  const metaIds = metadataEbookIds(session);
  if (products.length === 1 && metaIds.length === 1 && !products[0].ebookId) {
    products[0].ebookId = metaIds[0];
  }

  return products;
};

/** All paid checkout sessions for an email, across the full account history. */
export const listPaidSessionsForEmail = async (stripe, email) => {
  const target = normalizeEmail(email);
  if (!target) return [];

  const candidates = new Set([target, (email || '').trim()]);
  const sessionsById = new Map();

  for (const candidate of candidates) {
    if (!candidate) continue;
    for await (const session of stripe.checkout.sessions.list({
      customer_details: { email: candidate },
      status: 'complete',
      limit: 100,
    })) {
      if (session.payment_status === 'paid' && sessionEmail(session) === target) {
        sessionsById.set(session.id, session);
      }
    }
  }

  return Array.from(sessionsById.values());
};

/** Fill missing ebookIds by exact (case-insensitive) title match against the catalog. */
export const resolveEbookIdsByTitle = async (supabaseAdmin, products) => {
  if (products.every((product) => product.ebookId)) return products;

  const { data, error } = await supabaseAdmin.from('ebooks_metadata').select('id, title');
  if (error || !Array.isArray(data)) return products;

  const byTitle = new Map(
    data.filter((row) => row.title).map((row) => [row.title.trim().toLowerCase(), row.id])
  );

  return products.map((product) =>
    product.ebookId
      ? product
      : { ...product, ebookId: byTitle.get((product.title || '').trim().toLowerCase()) || null }
  );
};

export const buildPurchaseRows = (session, products) => {
  const customerEmail = sessionEmail(session);
  const customerName = session.customer_details?.name || customerEmail;
  const currency = (session.currency || 'brl').toLowerCase();

  return products
    .filter((product) => product.ebookId)
    .map((product) => ({
      session_id: session.id,
      customer_email: customerEmail,
      customer_name: customerName,
      ebook_id: product.ebookId,
      ebook_title: product.title,
      amount_cents: product.amountCents,
      currency,
    }));
};

/** Upsert purchase rows; returns the error (if any) so callers can log it. */
export const persistPurchaseRows = async (supabaseAdmin, rows) => {
  if (!rows.length) return null;
  const { error } = await supabaseAdmin.from('purchases').upsert(rows, {
    onConflict: 'session_id,ebook_id',
    ignoreDuplicates: true,
  });
  return error || null;
};
