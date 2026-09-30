import { randomUUID } from 'node:crypto';
import Stripe from 'stripe';
import { requireAdmin } from '../lib/admin-auth.js';
import { applyCors, handleOptionsRequest } from '../lib/cors.js';
import { logger, getRequestMeta } from '../lib/logger.js';
import { listPaidSessionsForEmail, listSessionProducts } from '../lib/stripe-purchases.js';
import { importPlaylist, parsePlaylistId, PlaylistImportError } from '../lib/youtube-playlist.js';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: '2023-10-16',
});

// --- action=alerts (admin-alerts) ---

const handleAlerts = async (req, res, requestMeta) => {
  applyCors(req, res, { methods: 'GET,OPTIONS' });
  if (handleOptionsRequest(req, res)) return;

  if (req.method !== 'GET') {
    logger.warn('admin_alerts_method_not_allowed', requestMeta);
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  try {
    const auth = await requireAdmin(req, res);
    if (!auth) return;
    const { supabaseAdmin } = auth;

    const since24h = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

    const [
      failedEmailsRes,
      pendingCartsRes,
      lastWebhookRes,
    ] = await Promise.all([
      supabaseAdmin
        .from('purchase_email_events')
        .select('session_id', { count: 'exact', head: true })
        .eq('status', 'failed')
        .gte('created_at', since24h),
      supabaseAdmin
        .from('lifecycle_followup_jobs')
        .select('id', { count: 'exact', head: true })
        .eq('status', 'pending')
        .gte('created_at', since24h),
      supabaseAdmin
        .from('stripe_webhook_events')
        .select('processed_at')
        .order('processed_at', { ascending: false })
        .limit(1),
    ]);

    if (failedEmailsRes.error) throw failedEmailsRes.error;
    if (pendingCartsRes.error) throw pendingCartsRes.error;
    if (lastWebhookRes.error) throw lastWebhookRes.error;

    const lastWebhookAt = lastWebhookRes.data?.[0]?.processed_at || null;

    res.status(200).json({
      windowHours: 24,
      failedPurchaseEmails: failedEmailsRes.count || 0,
      pendingAbandonedCarts: pendingCartsRes.count || 0,
      lastWebhookAt,
    });
  } catch (error) {
    logger.error('admin_alerts_failed', {
      ...requestMeta,
      errorMessage: error instanceof Error ? error.message : 'unknown_error',
    });
    res.status(500).json({ error: 'Internal server error' });
  }
};

// --- action=customer-lookup (admin-customer-lookup) ---

const normalizeEmail = (value) => {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim().toLowerCase();
  if (!trimmed) return null;
  if (trimmed.length > 254) return null;
  return trimmed;
};

const parseLimit = (value, fallback) => {
  const num = typeof value === 'string' ? Number.parseInt(value, 10) : NaN;
  if (!Number.isFinite(num)) return fallback;
  return Math.min(Math.max(num, 1), 50);
};

const safeString = (value, max = 500) => {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  return trimmed ? trimmed.slice(0, max) : null;
};

const handleCustomerLookup = async (req, res, requestMeta) => {
  applyCors(req, res, { methods: 'GET,OPTIONS' });
  if (handleOptionsRequest(req, res)) return;

  if (req.method !== 'GET') {
    logger.warn('admin_customer_lookup_method_not_allowed', requestMeta);
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  try {
    const auth = await requireAdmin(req, res);
    if (!auth) return;

    const email = normalizeEmail(req.query.email);
    if (!email) {
      res.status(400).json({ error: 'Missing or invalid email query parameter' });
      return;
    }
    const limit = parseLimit(req.query.limit, 10);

    const sessions = await listPaidSessionsForEmail(stripe, email);

    const paidSessions = sessions
      .sort((a, b) => (b.created || 0) - (a.created || 0))
      .slice(0, limit);

    const lookup = await Promise.all(
      paidSessions.map(async (sess) => {
        const products = await listSessionProducts(stripe, sess);

        const items = products.map((product) => ({
          name: product.title || 'Unknown Item',
          quantity: product.quantity,
          amount: Number(((product.amountCents || 0) / 100).toFixed(2)),
          currency: (sess.currency || 'brl').toUpperCase(),
          type: product.type,
          ebookId: safeString(product.ebookId, 128),
          courseId: safeString(product.courseId, 128),
        }));

        return {
          sessionId: sess.id,
          createdAt: new Date((sess.created || 0) * 1000).toISOString(),
          email: (sess.customer_details?.email || sess.customer_email || email || '').trim(),
          name: sess.customer_details?.name || null,
          currency: (sess.currency || 'brl').toUpperCase(),
          total: Number(((sess.amount_total || 0) / 100).toFixed(2)),
          items,
        };
      })
    );

    const ebookIds = Array.from(
      new Set(
        lookup.flatMap((s) => s.items.map((i) => i.ebookId).filter(Boolean))
      )
    );
    const ebookTitles = Array.from(
      new Set(
        lookup
          .flatMap((s) => s.items.map((i) => i.name).filter(Boolean))
          .map((title) => String(title).trim())
          .filter(Boolean)
      )
    );

    const ebookById = new Map();
    const ebookByTitle = new Map();
    if (ebookIds.length > 0) {
      const { data: ebooks, error } = await auth.supabaseAdmin
        .from('ebooks_metadata')
        .select('id,title,filename')
        .in('id', ebookIds);
      if (error) throw error;
      for (const ebook of ebooks || []) {
        ebookById.set(ebook.id, ebook);
      }
    }

    // Title fallback for older purchases where ebookId metadata was not included.
    if (ebookTitles.length > 0) {
      const { data: ebooks, error } = await auth.supabaseAdmin
        .from('ebooks_metadata')
        .select('id,title,filename')
        .in('title', ebookTitles);
      if (error) throw error;
      for (const ebook of ebooks || []) {
        if (ebook.title) {
          ebookByTitle.set(String(ebook.title).trim(), ebook);
        }
      }
    }

    const resolveEbook = (item) =>
      item.type === 'course'
        ? null
        : (item.ebookId ? ebookById.get(item.ebookId) : null) ||
          ebookByTitle.get(String(item.name || '').trim()) ||
          null;

    // Full PDFs live in the private ebook-pdfs bucket; admins get 1h signed links.
    const pdfPaths = Array.from(
      new Set(
        lookup
          .flatMap((s) => s.items.map((item) => resolveEbook(item)?.filename))
          .filter(Boolean)
          .map((filename) => `pdfs/${filename}`)
      )
    );
    const signedPdfUrls = new Map();
    if (pdfPaths.length > 0) {
      const { data: signed, error: signError } = await auth.supabaseAdmin.storage
        .from('ebook-pdfs')
        .createSignedUrls(pdfPaths, 3600);
      if (signError) throw signError;
      for (const entry of signed || []) {
        if (entry.path && entry.signedUrl) {
          signedPdfUrls.set(entry.path, entry.signedUrl);
        }
      }
    }

    const results = lookup.map((session) => {
      const enrichedItems = session.items.map((item) => {
        const ebook = resolveEbook(item);
        const filename = ebook?.filename || null;
        const title = ebook?.title || null;

        const pdfUrl = filename ? signedPdfUrls.get(`pdfs/${filename}`) || null : null;
        const coverUrl = filename
          ? auth.supabaseAdmin.storage.from('store-assets').getPublicUrl(`covers/${filename}`).data.publicUrl
          : null;

        return {
          ...item,
          ebookTitle: title,
          filename,
          pdfUrl,
          coverUrl,
        };
      });

      return { ...session, items: enrichedItems };
    });

    res.status(200).json({ email, sessions: results });
  } catch (error) {
    logger.error('admin_customer_lookup_failed', {
      ...requestMeta,
      errorMessage: error instanceof Error ? error.message : 'unknown_error',
    });
    res.status(500).json({ error: 'Internal server error' });
  }
};

// --- action=users (users) ---

const handleUsers = async (req, res, requestMeta) => {
  applyCors(req, res, { methods: 'GET,DELETE,OPTIONS' });
  if (handleOptionsRequest(req, res)) return;

  if (!['GET', 'DELETE'].includes(req.method)) {
    logger.warn('users_method_not_allowed', requestMeta);
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  try {
    const auth = await requireAdmin(req, res);
    if (!auth) {
      return;
    }
    const { supabaseAdmin } = auth;

    if (req.method === 'DELETE') {
      const uid = typeof req.query.uid === 'string' ? req.query.uid : '';
      if (!uid) {
        res.status(400).json({ error: 'Missing uid query parameter' });
        return;
      }

      const { error } = await supabaseAdmin.auth.admin.deleteUser(uid);
      if (error) {
        throw error;
      }

      res.status(200).json({ success: true, uid });
      return;
    }

    const {
      data: { users: supabaseUsers = [] },
      error,
    } = await supabaseAdmin.auth.admin.listUsers({
      page: 1,
      perPage: 1000,
    });

    if (error) {
      throw error;
    }

    const users = supabaseUsers.map((u) => {
      return {
        uid: u.id,
        displayName: u.user_metadata?.full_name || null,
        email: u.email,
        photoURL: u.user_metadata?.avatar_url || null,
      };
    });
    res.json({ users });
  } catch (error) {
    logger.error('users_failed', {
      ...requestMeta,
      errorMessage: error instanceof Error ? error.message : 'unknown_error',
    });
    res.status(500).json({ error: 'Internal server error' });
  }
};

// --- action=podcast-articles (podcast-articles) ---

const ARTICLE_EDITABLE_FIELDS = ['title_pt', 'body_pt', 'title_en', 'body_en', 'spotify_url', 'youtube_url'];

const handlePodcastArticles = async (req, res, requestMeta) => {
  applyCors(req, res, { methods: 'GET,PATCH,OPTIONS' });
  if (handleOptionsRequest(req, res)) return;

  if (!['GET', 'PATCH'].includes(req.method)) {
    logger.warn('podcast_articles_method_not_allowed', requestMeta);
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  try {
    const auth = await requireAdmin(req, res);
    if (!auth) return;
    const { supabaseAdmin } = auth;

    if (req.method === 'GET') {
      const { data, error } = await supabaseAdmin
        .from('podcast_articles')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      res.status(200).json({ articles: data || [] });
      return;
    }

    // PATCH: update fields and/or flip status (draft <-> published)
    const id = typeof req.query.id === 'string' ? req.query.id : '';
    if (!id) {
      res.status(400).json({ error: 'Missing id query parameter' });
      return;
    }

    const body = req.body || {};
    const updates = {};

    for (const field of ARTICLE_EDITABLE_FIELDS) {
      if (typeof body[field] === 'string') {
        updates[field] = body[field].trim();
      }
    }

    if (body.status === 'published' || body.status === 'draft') {
      updates.status = body.status;
      if (body.status === 'published') {
        updates.published_at = new Date().toISOString();
      }
    }

    if (Object.keys(updates).length === 0) {
      res.status(400).json({ error: 'No valid fields to update' });
      return;
    }

    updates.updated_at = new Date().toISOString();

    const { data, error } = await supabaseAdmin
      .from('podcast_articles')
      .update(updates)
      .eq('id', id)
      .select('*')
      .single();

    if (error) throw error;

    res.status(200).json({ article: data });
  } catch (error) {
    logger.error('podcast_articles_admin_failed', {
      ...requestMeta,
      errorMessage: error instanceof Error ? error.message : 'unknown_error',
    });
    res.status(500).json({ error: 'Internal server error' });
  }
};

// --- action=webhook-events (stripe-webhook-events) ---

const parseEventLimit = (value, fallback) => {
  const num = typeof value === 'string' ? Number.parseInt(value, 10) : NaN;
  if (!Number.isFinite(num)) return fallback;
  return Math.min(Math.max(num, 1), 200);
};

const handleWebhookEvents = async (req, res, requestMeta) => {
  applyCors(req, res, { methods: 'GET,OPTIONS' });
  if (handleOptionsRequest(req, res)) return;

  if (req.method !== 'GET') {
    logger.warn('stripe_webhook_events_method_not_allowed', requestMeta);
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  try {
    const auth = await requireAdmin(req, res);
    if (!auth) return;
    const { supabaseAdmin } = auth;

    const limit = parseEventLimit(req.query.limit, 50);

    const [webhookRes, emailRes] = await Promise.all([
      supabaseAdmin
        .from('stripe_webhook_events')
        .select('event_id,event_type,session_id,processed_at')
        .order('processed_at', { ascending: false })
        .limit(limit),
      supabaseAdmin
        .from('purchase_email_events')
        .select('session_id,customer_email,status,sent_at,last_error,created_at,updated_at')
        .order('created_at', { ascending: false })
        .limit(limit),
    ]);

    if (webhookRes.error) throw webhookRes.error;
    if (emailRes.error) throw emailRes.error;

    res.status(200).json({
      webhookEvents: webhookRes.data || [],
      purchaseEmailEvents: emailRes.data || [],
    });
  } catch (error) {
    logger.error('stripe_webhook_events_failed', {
      ...requestMeta,
      errorMessage: error instanceof Error ? error.message : 'unknown_error',
    });
    res.status(500).json({ error: 'Internal server error' });
  }
};

// --- course actions (admin only) ---

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const readCourseId = (value) => (typeof value === 'string' && UUID_RE.test(value.trim()) ? value.trim() : null);

const courseAdminGuard = async (req, res, methods) => {
  applyCors(req, res, { methods: `${methods.join(',')},OPTIONS` });
  if (handleOptionsRequest(req, res)) return null;
  if (!methods.includes(req.method)) {
    res.status(405).json({ error: 'Method not allowed' });
    return null;
  }
  return requireAdmin(req, res);
};

const sendCourseError = (res, requestMeta, event, error) => {
  if (error instanceof PlaylistImportError) {
    res.status(error.status).json({ error: error.message });
    return;
  }
  logger.error(event, {
    ...requestMeta,
    errorMessage: error instanceof Error ? error.message : 'unknown_error',
  });
  res.status(500).json({ error: 'Internal server error' });
};

const loadCourseLessons = async (supabaseAdmin, courseId) => {
  const { data, error } = await supabaseAdmin
    .from('course_lessons')
    .select('id, position, title, duration_seconds, youtube_video_id')
    .eq('course_id', courseId)
    .order('position', { ascending: true });
  if (error) throw error;
  return data || [];
};

/** Replace a course's lessons with the playlist order, keeping lesson ids stable per video. */
const syncCourseLessons = async (supabaseAdmin, courseId, playlistId) => {
  const { lessons, skipped, notEmbeddable } = await importPlaylist(playlistId);
  const existing = await loadCourseLessons(supabaseAdmin, courseId);
  const idByVideo = new Map(existing.map((lesson) => [lesson.youtube_video_id, lesson.id]));
  const keepVideos = new Set(lessons.map((lesson) => lesson.youtube_video_id));

  const removeIds = existing
    .filter((lesson) => !keepVideos.has(lesson.youtube_video_id))
    .map((lesson) => lesson.id);
  if (removeIds.length) {
    const { error } = await supabaseAdmin.from('course_lessons').delete().in('id', removeIds);
    if (error) throw error;
  }

  // Park kept lessons on negative positions so the new order can't collide with unique(course_id, position).
  const kept = existing.filter((lesson) => keepVideos.has(lesson.youtube_video_id));
  for (let index = 0; index < kept.length; index += 1) {
    const { error } = await supabaseAdmin
      .from('course_lessons')
      .update({ position: -(index + 1) })
      .eq('id', kept[index].id);
    if (error) throw error;
  }

  const rows = lessons.map((lesson) => {
    const id = idByVideo.get(lesson.youtube_video_id);
    return { ...(id ? { id } : {}), course_id: courseId, ...lesson };
  });
  const updates = rows.filter((row) => row.id);
  const inserts = rows.filter((row) => !row.id);
  if (updates.length) {
    const { error } = await supabaseAdmin.from('course_lessons').upsert(updates, { onConflict: 'id' });
    if (error) throw error;
  }
  if (inserts.length) {
    const { error } = await supabaseAdmin.from('course_lessons').insert(inserts);
    if (error) throw error;
  }

  const totalDuration = lessons.reduce((sum, lesson) => sum + lesson.duration_seconds, 0);
  const now = new Date().toISOString();
  const [courseUpdate, privateUpdate] = await Promise.all([
    supabaseAdmin
      .from('courses')
      .update({ lesson_count: lessons.length, total_duration_seconds: totalDuration })
      .eq('id', courseId),
    supabaseAdmin.from('course_private').update({ last_synced_at: now }).eq('course_id', courseId),
  ]);
  if (courseUpdate.error) throw courseUpdate.error;
  if (privateUpdate.error) throw privateUpdate.error;

  return {
    lessons: await loadCourseLessons(supabaseAdmin, courseId),
    skipped,
    notEmbeddable,
    lastSyncedAt: now,
  };
};

const handleCoursePrivate = async (req, res, requestMeta) => {
  try {
    const auth = await courseAdminGuard(req, res, ['GET']);
    if (!auth) return;
    const courseId = readCourseId(req.query.courseId);
    if (!courseId) {
      res.status(400).json({ error: 'courseId is required' });
      return;
    }
    const { data: priv, error } = await auth.supabaseAdmin
      .from('course_private')
      .select('youtube_playlist_url, youtube_playlist_id, last_synced_at')
      .eq('course_id', courseId)
      .maybeSingle();
    if (error) throw error;
    res.status(200).json({
      playlistUrl: priv?.youtube_playlist_url || '',
      playlistId: priv?.youtube_playlist_id || '',
      lastSyncedAt: priv?.last_synced_at || null,
      lessons: await loadCourseLessons(auth.supabaseAdmin, courseId),
    });
  } catch (error) {
    sendCourseError(res, requestMeta, 'admin_course_private_failed', error);
  }
};

const handleCourseSavePlaylist = async (req, res, requestMeta) => {
  try {
    const auth = await courseAdminGuard(req, res, ['POST']);
    if (!auth) return;
    const body = req.body || {};
    const courseId = readCourseId(body.courseId);
    const playlistUrl = typeof body.playlistUrl === 'string' ? body.playlistUrl.trim().slice(0, 500) : '';
    const playlistId = parsePlaylistId(playlistUrl);
    if (!courseId || !playlistId) {
      res.status(400).json({ error: 'A valid courseId and YouTube playlist URL (with list=) are required' });
      return;
    }

    const { data: course, error: courseError } = await auth.supabaseAdmin
      .from('courses')
      .select('id')
      .eq('id', courseId)
      .maybeSingle();
    if (courseError) throw courseError;
    if (!course) {
      res.status(404).json({ error: 'Course not found' });
      return;
    }

    const { error: saveError } = await auth.supabaseAdmin.from('course_private').upsert(
      { course_id: courseId, youtube_playlist_url: playlistUrl, youtube_playlist_id: playlistId },
      { onConflict: 'course_id' }
    );
    if (saveError) throw saveError;

    const result = await syncCourseLessons(auth.supabaseAdmin, courseId, playlistId);
    res.status(200).json({ playlistId, ...result });
  } catch (error) {
    sendCourseError(res, requestMeta, 'admin_course_save_playlist_failed', error);
  }
};

const handleCourseResync = async (req, res, requestMeta) => {
  try {
    const auth = await courseAdminGuard(req, res, ['POST']);
    if (!auth) return;
    const courseId = readCourseId((req.body || {}).courseId);
    if (!courseId) {
      res.status(400).json({ error: 'courseId is required' });
      return;
    }
    const { data: priv, error } = await auth.supabaseAdmin
      .from('course_private')
      .select('youtube_playlist_id')
      .eq('course_id', courseId)
      .maybeSingle();
    if (error) throw error;
    if (!priv?.youtube_playlist_id) {
      res.status(400).json({ error: 'Save a playlist URL for this course first' });
      return;
    }
    const result = await syncCourseLessons(auth.supabaseAdmin, courseId, priv.youtube_playlist_id);
    res.status(200).json(result);
  } catch (error) {
    sendCourseError(res, requestMeta, 'admin_course_resync_failed', error);
  }
};

const handleCourseGrant = async (req, res, requestMeta) => {
  try {
    const auth = await courseAdminGuard(req, res, ['POST']);
    if (!auth) return;
    const body = req.body || {};
    const courseId = readCourseId(body.courseId);
    const email = normalizeEmail(body.email);
    if (!courseId || !email || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
      res.status(400).json({ error: 'A valid courseId and email are required' });
      return;
    }

    const { data: course, error: courseError } = await auth.supabaseAdmin
      .from('courses')
      .select('id, title')
      .eq('id', courseId)
      .maybeSingle();
    if (courseError) throw courseError;
    if (!course) {
      res.status(404).json({ error: 'Course not found' });
      return;
    }

    const { data: existing, error: existingError } = await auth.supabaseAdmin
      .from('purchases')
      .select('id')
      .eq('product_type', 'course')
      .eq('product_id', courseId)
      .ilike('customer_email', email)
      .limit(1);
    if (existingError) throw existingError;
    if (existing?.length) {
      res.status(200).json({ granted: false, alreadyOwned: true });
      return;
    }

    const { error: insertError } = await auth.supabaseAdmin.from('purchases').insert({
      session_id: `manual:${randomUUID()}`,
      customer_email: email,
      customer_name: safeString(body.name, 200) || email,
      product_type: 'course',
      product_id: courseId,
      ebook_id: null,
      ebook_title: course.title,
      amount_cents: 0,
      currency: 'brl',
    });
    if (insertError) throw insertError;

    logger.info('admin_course_granted', { ...requestMeta, courseId, adminEmail: auth.user?.email || null });
    res.status(200).json({ granted: true });
  } catch (error) {
    sendCourseError(res, requestMeta, 'admin_course_grant_failed', error);
  }
};

const handleCourseAccessLog = async (req, res, requestMeta) => {
  try {
    const auth = await courseAdminGuard(req, res, ['GET']);
    if (!auth) return;
    const courseId = readCourseId(req.query.courseId);
    const limit = parseLimit(req.query.limit, 50);
    let query = auth.supabaseAdmin
      .from('course_access_log')
      .select('id, course_id, lesson_id, user_email, user_agent, created_at, course_lessons(title, position)')
      .order('created_at', { ascending: false })
      .limit(limit);
    if (courseId) query = query.eq('course_id', courseId);
    const { data, error } = await query;
    if (error) throw error;

    let buyersQuery = auth.supabaseAdmin
      .from('purchases')
      .select('customer_email, customer_name, product_id, session_id, created_at')
      .eq('product_type', 'course')
      .order('created_at', { ascending: false })
      .limit(200);
    if (courseId) buyersQuery = buyersQuery.eq('product_id', courseId);
    const { data: buyers, error: buyersError } = await buyersQuery;
    if (buyersError) throw buyersError;

    res.status(200).json({
      entries: (data || []).map((row) => ({
        id: row.id,
        courseId: row.course_id,
        lessonId: row.lesson_id,
        lessonTitle: row.course_lessons?.title || null,
        lessonPosition: row.course_lessons?.position ?? null,
        email: row.user_email,
        userAgent: row.user_agent,
        createdAt: row.created_at,
      })),
      buyers: (buyers || []).map((row) => ({
        email: row.customer_email,
        name: row.customer_name,
        courseId: row.product_id,
        manual: String(row.session_id || '').startsWith('manual:'),
        createdAt: row.created_at,
      })),
    });
  } catch (error) {
    sendCourseError(res, requestMeta, 'admin_course_access_log_failed', error);
  }
};

const handleCourseDelete = async (req, res, requestMeta) => {
  try {
    const auth = await courseAdminGuard(req, res, ['POST']);
    if (!auth) return;
    const courseId = readCourseId((req.body || {}).courseId);
    if (!courseId) {
      res.status(400).json({ error: 'courseId is required' });
      return;
    }

    const { count, error: countError } = await auth.supabaseAdmin
      .from('purchases')
      .select('id', { count: 'exact', head: true })
      .eq('product_type', 'course')
      .eq('product_id', courseId);
    if (countError) throw countError;
    if ((count || 0) > 0) {
      res.status(409).json({
        error: 'This course has buyers and cannot be deleted. Unpublish it instead.',
        purchases: count,
      });
      return;
    }

    const { data: course, error: courseError } = await auth.supabaseAdmin
      .from('courses')
      .select('id, cover_filename')
      .eq('id', courseId)
      .maybeSingle();
    if (courseError) throw courseError;
    if (!course) {
      res.status(404).json({ error: 'Course not found' });
      return;
    }

    const { error: deleteError } = await auth.supabaseAdmin.from('courses').delete().eq('id', courseId);
    if (deleteError) throw deleteError;

    if (course.cover_filename) {
      const { error: coverError } = await auth.supabaseAdmin.storage
        .from('store-assets')
        .remove([`course-covers/${course.cover_filename}`]);
      if (coverError) {
        logger.warn('admin_course_cover_remove_failed', { ...requestMeta, errorMessage: coverError.message });
      }
    }

    res.status(200).json({ deleted: true });
  } catch (error) {
    sendCourseError(res, requestMeta, 'admin_course_delete_failed', error);
  }
};

export default async function handler(req, res) {
  const requestMeta = getRequestMeta(req);
  const action = req.query?.action;

  switch (action) {
    case 'alerts':
      return handleAlerts(req, res, requestMeta);
    case 'webhook-events':
      return handleWebhookEvents(req, res, requestMeta);
    case 'customer-lookup':
      return handleCustomerLookup(req, res, requestMeta);
    case 'users':
      return handleUsers(req, res, requestMeta);
    case 'podcast-articles':
      return handlePodcastArticles(req, res, requestMeta);
    case 'course-private':
      return handleCoursePrivate(req, res, requestMeta);
    case 'course-save-playlist':
      return handleCourseSavePlaylist(req, res, requestMeta);
    case 'course-resync':
      return handleCourseResync(req, res, requestMeta);
    case 'course-grant':
      return handleCourseGrant(req, res, requestMeta);
    case 'course-access-log':
      return handleCourseAccessLog(req, res, requestMeta);
    case 'course-delete':
      return handleCourseDelete(req, res, requestMeta);
    default:
      res.status(404).json({ error: 'Unknown admin action' });
  }
}
