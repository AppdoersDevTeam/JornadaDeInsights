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
 * Returns [{ type, productId, ebookId, courseId, title, amountCents, quantity }].
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
    const type = metadata.type === 'course' ? 'course' : 'ebook';
    const ebookId = type === 'ebook' ? metadata.ebookId || null : null;
    const courseId = type === 'course' ? metadata.courseId || null : null;
    return {
      type,
      productId: ebookId || courseId,
      ebookId,
      courseId,
      title: lineItem.description || product?.name || (type === 'course' ? 'Course' : 'eBook'),
      amountCents: lineItem.amount_total ?? lineItem.price?.unit_amount ?? 0,
      quantity: lineItem.quantity ?? 1,
    };
  });

  // A single ebook line item with a single metadata id is unambiguous; anything else is not.
  const metaIds = metadataEbookIds(session);
  if (
    products.length === 1 &&
    metaIds.length === 1 &&
    products[0].type === 'ebook' &&
    !products[0].ebookId
  ) {
    products[0].ebookId = metaIds[0];
    products[0].productId = metaIds[0];
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

/** A paid one-off product checkout: not a donation, not a subscription, not unpaid/failed. */
export const isProductSale = (session) =>
  session?.status === 'complete' &&
  session.payment_status === 'paid' &&
  session.mode === 'payment' &&
  session.metadata?.type !== 'donation';

/**
 * Every product sale across the full account history (or since `createdGte`, unix seconds).
 * This is the single definition of "a sale" for admin counts, lists and rankings.
 */
export const listProductSaleSessions = async (stripe, { createdGte } = {}) => {
  const sessions = await stripe.checkout.sessions
    .list({
      status: 'complete',
      limit: 100,
      ...(createdGte ? { created: { gte: createdGte } } : {}),
    })
    .autoPagingToArray({ limit: 10000 });
  return sessions.filter(isProductSale);
};

/** Fill missing ebookIds by exact (case-insensitive) title match. Ebooks only. */
export const resolveEbookIdsByTitle = async (supabaseAdmin, products) => {
  if (products.every((product) => product.type !== 'ebook' || product.ebookId)) return products;

  const { data, error } = await supabaseAdmin.from('ebooks_metadata').select('id, title');
  if (error || !Array.isArray(data)) return products;

  const byTitle = new Map(
    data.filter((row) => row.title).map((row) => [row.title.trim().toLowerCase(), row.id])
  );

  return products.map((product) => {
    if (product.type !== 'ebook' || product.ebookId) return product;
    const ebookId = byTitle.get((product.title || '').trim().toLowerCase()) || null;
    return { ...product, ebookId, productId: ebookId };
  });
};

export const buildPurchaseRows = (session, products) => {
  const customerEmail = sessionEmail(session);
  const customerName = session.customer_details?.name || customerEmail;
  const currency = (session.currency || 'brl').toLowerCase();

  return products
    .filter((product) => product.productId)
    .map((product) => ({
      session_id: session.id,
      customer_email: customerEmail,
      customer_name: customerName,
      product_type: product.type,
      product_id: product.productId,
      ebook_id: product.type === 'ebook' ? product.ebookId : null,
      ebook_title: product.title,
      amount_cents: product.amountCents,
      currency,
      // The sale time, not the time this row happened to be written (webhook or backfill).
      created_at: new Date((session.created ?? 0) * 1000).toISOString(),
    }));
};

/**
 * Upsert purchase rows; returns the first error (if any) so callers can log it.
 * Ebook rows keep the original (session_id, ebook_id) key; course rows use the product key.
 */
export const persistPurchaseRows = async (supabaseAdmin, rows) => {
  const groups = [
    { rows: rows.filter((row) => row.product_type === 'ebook'), onConflict: 'session_id,ebook_id' },
    {
      rows: rows.filter((row) => row.product_type === 'course'),
      onConflict: 'session_id,product_type,product_id',
    },
  ];

  for (const group of groups) {
    if (!group.rows.length) continue;
    const { error } = await supabaseAdmin.from('purchases').upsert(group.rows, {
      onConflict: group.onConflict,
      ignoreDuplicates: true,
    });
    if (error) return error;
  }
  return null;
};

const RECONCILE_CHUNK = 100;
const MISDATED_TOLERANCE_MS = 60 * 60 * 1000;

/**
 * Make `purchases` match Stripe for the given sale sessions: insert rows that were never
 * written (e.g. the webhook could not resolve the product) and restore the sale date on rows
 * stamped with the backfill time. `productsBySession` maps session id -> resolved products.
 */
export const reconcilePurchaseRows = async (supabaseAdmin, sessions, productsBySession) => {
  const result = { inserted: 0, redated: 0, unmatchedSessions: [], error: null };

  for (let i = 0; i < sessions.length; i += RECONCILE_CHUNK) {
    const chunk = sessions.slice(i, i + RECONCILE_CHUNK);
    const { data: existingRows, error: readError } = await supabaseAdmin
      .from('purchases')
      .select('id, session_id, created_at')
      .in(
        'session_id',
        chunk.map((session) => session.id)
      );
    if (readError) {
      result.error = readError;
      return result;
    }

    const rowsBySession = new Map();
    for (const row of existingRows || []) {
      const rows = rowsBySession.get(row.session_id) || [];
      rows.push(row);
      rowsBySession.set(row.session_id, rows);
    }

    for (const session of chunk) {
      const products = productsBySession.get(session.id) || [];
      const expectedRows = buildPurchaseRows(session, products);
      const existing = rowsBySession.get(session.id) || [];

      if (expectedRows.length < products.length) {
        result.unmatchedSessions.push(session.id);
      }

      if (existing.length < expectedRows.length) {
        const insertError = await persistPurchaseRows(supabaseAdmin, expectedRows);
        if (insertError) {
          result.error = insertError;
          return result;
        }
        result.inserted += expectedRows.length - existing.length;
      }

      const saleTime = (session.created ?? 0) * 1000;
      const misdatedIds = existing
        .filter(
          (row) => Math.abs(new Date(row.created_at).getTime() - saleTime) > MISDATED_TOLERANCE_MS
        )
        .map((row) => row.id);
      if (misdatedIds.length) {
        const { error: updateError } = await supabaseAdmin
          .from('purchases')
          .update({ created_at: new Date(saleTime).toISOString() })
          .in('id', misdatedIds);
        if (updateError) {
          result.error = updateError;
          return result;
        }
        result.redated += misdatedIds.length;
      }
    }
  }

  return result;
};

/**
 * Does this email own the product? Checks persisted purchases first, then the buyer's
 * full Stripe history (self-healing the purchases row when found there).
 */
export const emailOwnsProduct = async ({ stripe, supabaseAdmin, email, type, productId, onHealError }) => {
  const target = normalizeEmail(email);
  if (!target || !productId) return false;

  const column = type === 'course' ? 'product_id' : 'ebook_id';
  let query = supabaseAdmin
    .from('purchases')
    .select('id')
    .ilike('customer_email', target)
    .eq(column, productId)
    .limit(1);
  if (type === 'course') {
    query = query.eq('product_type', 'course');
  }
  const { data, error } = await query;
  if (!error && data?.length) {
    return true;
  }

  const sessions = await listPaidSessionsForEmail(stripe, target);
  for (const session of sessions) {
    const products = await resolveEbookIdsByTitle(
      supabaseAdmin,
      await listSessionProducts(stripe, session)
    );
    if (products.some((product) => product.type === type && product.productId === productId)) {
      const healError = await persistPurchaseRows(supabaseAdmin, buildPurchaseRows(session, products));
      if (healError && onHealError) {
        onHealError(session.id, healError);
      }
      return true;
    }
  }

  return false;
};
