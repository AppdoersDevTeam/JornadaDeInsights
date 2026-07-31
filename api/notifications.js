import { createClient } from '@supabase/supabase-js';
import { requireUser } from '../lib/admin-auth.js';
import { applyCors, handleOptionsRequest } from '../lib/cors.js';
import { logger, getRequestMeta } from '../lib/logger.js';

const LIST_LIMIT = 50;

// --- action=list ---

const handleList = async (req, res, requestMeta) => {
  applyCors(req, res, { methods: 'GET,OPTIONS' });
  if (handleOptionsRequest(req, res)) return;

  if (req.method !== 'GET') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  try {
    const auth = await requireUser(req, res);
    if (!auth) return;
    const { user, supabaseAdmin, isAdmin } = auth;

    const audiences = isAdmin ? ['user', 'admin'] : ['user'];

    const [eventsRes, readsRes, prefsRes] = await Promise.all([
      supabaseAdmin
        .from('notification_events')
        .select('id, type, audience, title, body, link, source_id, metadata, created_at')
        .in('audience', audiences)
        .order('created_at', { ascending: false })
        .limit(LIST_LIMIT),
      supabaseAdmin
        .from('notification_reads')
        .select('notification_id')
        .eq('user_id', user.id),
      supabaseAdmin
        .from('notification_preferences')
        .select('type, enabled')
        .eq('user_id', user.id)
        .eq('enabled', false),
    ]);

    if (eventsRes.error) throw eventsRes.error;
    if (readsRes.error) throw readsRes.error;
    if (prefsRes.error) throw prefsRes.error;

    const readIds = new Set((readsRes.data || []).map((row) => row.notification_id));
    const disabledTypes = new Set((prefsRes.data || []).map((row) => row.type));

    const notifications = (eventsRes.data || [])
      .filter((event) => !disabledTypes.has(event.type))
      .map((event) => ({
        id: event.id,
        type: event.type,
        audience: event.audience,
        title: event.title,
        body: event.body,
        link: event.link,
        sourceId: event.source_id,
        metadata: event.metadata,
        createdAt: event.created_at,
        read: readIds.has(event.id),
      }));

    const unreadCount = notifications.filter((n) => !n.read).length;

    res.status(200).json({ notifications, unreadCount });
  } catch (error) {
    logger.error('notifications_list_failed', {
      ...requestMeta,
      errorMessage: error instanceof Error ? error.message : 'unknown_error',
    });
    res.status(500).json({ error: 'Internal server error' });
  }
};

// --- action=mark-read ---

const handleMarkRead = async (req, res, requestMeta) => {
  applyCors(req, res, { methods: 'POST,OPTIONS' });
  if (handleOptionsRequest(req, res)) return;

  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  try {
    const auth = await requireUser(req, res);
    if (!auth) return;
    const { user, supabaseAdmin, isAdmin } = auth;

    const { notificationId, all } = req.body || {};

    if (all) {
      const audiences = isAdmin ? ['user', 'admin'] : ['user'];
      const [{ data: events, error: eventsError }, { data: disabledPrefs, error: prefsError }] =
        await Promise.all([
          supabaseAdmin
            .from('notification_events')
            .select('id, type')
            .in('audience', audiences)
            .limit(LIST_LIMIT),
          supabaseAdmin
            .from('notification_preferences')
            .select('type')
            .eq('user_id', user.id)
            .eq('enabled', false),
        ]);
      if (eventsError) throw eventsError;
      if (prefsError) throw prefsError;

      const disabledTypes = new Set((disabledPrefs || []).map((row) => row.type));
      const rows = (events || [])
        .filter((event) => !disabledTypes.has(event.type))
        .map((event) => ({
          user_id: user.id,
          notification_id: event.id,
        }));
      if (rows.length > 0) {
        const { error: upsertError } = await supabaseAdmin
          .from('notification_reads')
          .upsert(rows, { onConflict: 'user_id,notification_id', ignoreDuplicates: true });
        if (upsertError) throw upsertError;
      }
      res.status(200).json({ success: true });
      return;
    }

    if (!notificationId) {
      res.status(400).json({ error: 'notificationId or all is required' });
      return;
    }

    const { error } = await supabaseAdmin
      .from('notification_reads')
      .upsert(
        { user_id: user.id, notification_id: notificationId },
        { onConflict: 'user_id,notification_id', ignoreDuplicates: true }
      );
    if (error) throw error;

    res.status(200).json({ success: true });
  } catch (error) {
    logger.error('notifications_mark_read_failed', {
      ...requestMeta,
      errorMessage: error instanceof Error ? error.message : 'unknown_error',
    });
    res.status(500).json({ error: 'Internal server error' });
  }
};

// --- action=cron-check (Vercel Cron entry point) ---

const getServiceRoleClient = () => {
  const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !supabaseServiceRoleKey) return null;
  return createClient(supabaseUrl, supabaseServiceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
};

const checkNewPodcastEpisodes = async (supabaseAdmin, requestMeta) => {
  const apiKey = process.env.YOUTUBE_API_KEY || process.env.VITE_YOUTUBE_API_KEY;
  const channelId = process.env.YOUTUBE_CHANNEL_ID || process.env.VITE_YOUTUBE_CHANNEL_ID;
  if (!apiKey || !channelId) {
    logger.warn('notifications_cron_youtube_config_missing', requestMeta);
    return;
  }

  const url = `https://youtube.googleapis.com/youtube/v3/search?key=${apiKey}&channelId=${channelId}&part=snippet,id&type=video&order=date&maxResults=10`;
  const response = await fetch(url);
  if (!response.ok) {
    logger.warn('notifications_cron_youtube_fetch_failed', {
      ...requestMeta,
      status: response.status,
    });
    return;
  }

  const data = await response.json();
  const items = Array.isArray(data.items) ? data.items : [];

  const rows = items
    .filter((item) => item.id?.videoId)
    .map((item) => ({
      type: 'new_podcast_episode',
      audience: 'user',
      title: item.snippet?.title || 'New episode',
      body: item.snippet?.description?.slice(0, 300) || null,
      link: '/podcast',
      source_id: item.id.videoId,
      metadata: { videoId: item.id.videoId, publishedAt: item.snippet?.publishedAt || null },
    }));

  if (rows.length === 0) return;

  const { error } = await supabaseAdmin
    .from('notification_events')
    .upsert(rows, { onConflict: 'type,source_id', ignoreDuplicates: true });
  if (error) {
    logger.error('notifications_cron_youtube_insert_failed', {
      ...requestMeta,
      errorMessage: error.message,
    });
  }
};

const checkAdminAlerts = async (supabaseAdmin, requestMeta) => {
  const now = new Date();
  const today = now.toISOString().slice(0, 10);
  const since24h = new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString();
  const since7d = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();
  const since2h = new Date(now.getTime() - 2 * 60 * 60 * 1000).toISOString();
  const todayStart = new Date(now.getTime());
  todayStart.setUTCHours(0, 0, 0, 0);

  const [failedEmailsRes, pendingCartsRes, lastWebhookRes, todayViewsRes, weekViewsRes] =
    await Promise.all([
      supabaseAdmin
        .from('purchase_email_events')
        .select('id', { count: 'exact', head: true })
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
      supabaseAdmin
        .from('site_page_views')
        .select('id', { count: 'exact', head: true })
        .gte('created_at', todayStart.toISOString()),
      supabaseAdmin
        .from('site_page_views')
        .select('id', { count: 'exact', head: true })
        .gte('created_at', since7d)
        .lt('created_at', todayStart.toISOString()),
    ]);

  const events = [];

  if (!failedEmailsRes.error && (failedEmailsRes.count || 0) > 0) {
    events.push({
      type: 'admin_failed_emails',
      audience: 'admin',
      title: 'Failed purchase emails',
      body: `${failedEmailsRes.count} purchase email(s) failed to send in the last 24h.`,
      link: '/dashboard?tab=overview',
      source_id: `admin_failed_emails:${today}`,
      metadata: { count: failedEmailsRes.count },
    });
  }

  if (!pendingCartsRes.error && (pendingCartsRes.count || 0) > 0) {
    events.push({
      type: 'admin_abandoned_carts',
      audience: 'admin',
      title: 'Pending abandoned carts',
      body: `${pendingCartsRes.count} abandoned cart follow-up(s) pending in the last 24h.`,
      link: '/dashboard?tab=overview',
      source_id: `admin_abandoned_carts:${today}`,
      metadata: { count: pendingCartsRes.count },
    });
  }

  const lastWebhookAt = lastWebhookRes.data?.[0]?.processed_at || null;
  if (!lastWebhookRes.error && lastWebhookAt && lastWebhookAt < since2h) {
    events.push({
      type: 'admin_webhook_lag',
      audience: 'admin',
      title: 'Stripe webhook lag',
      body: `Last webhook processed at ${lastWebhookAt}, more than 2h ago.`,
      link: '/dashboard?tab=overview',
      source_id: `admin_webhook_lag:${today}`,
      metadata: { lastWebhookAt },
    });
  }

  if (!todayViewsRes.error && !weekViewsRes.error) {
    const todayCount = todayViewsRes.count || 0;
    const weekAvg = (weekViewsRes.count || 0) / 7;
    if (weekAvg > 0 && todayCount > weekAvg * 1.5 && todayCount >= 10) {
      events.push({
        type: 'admin_traffic_spike',
        audience: 'admin',
        title: 'Traffic spike detected',
        body: `${todayCount} page views today vs. a 7-day average of ${weekAvg.toFixed(1)}.`,
        link: '/dashboard?tab=analytics',
        source_id: `admin_traffic_spike:${today}`,
        metadata: { todayCount, weekAvg },
      });
    }
  }

  if (events.length === 0) return;

  const { error } = await supabaseAdmin
    .from('notification_events')
    .upsert(events, { onConflict: 'type,source_id', ignoreDuplicates: true });
  if (error) {
    logger.error('notifications_cron_alerts_insert_failed', {
      ...requestMeta,
      errorMessage: error.message,
    });
  }
};

const handleCronCheck = async (req, res, requestMeta) => {
  const cronSecret = process.env.CRON_SECRET;
  const authHeader = req.headers.authorization || '';

  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    logger.warn('notifications_cron_unauthorized', requestMeta);
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }

  const supabaseAdmin = getServiceRoleClient();
  if (!supabaseAdmin) {
    res.status(500).json({ error: 'Missing Supabase auth configuration' });
    return;
  }

  try {
    await Promise.all([
      checkNewPodcastEpisodes(supabaseAdmin, requestMeta),
      checkAdminAlerts(supabaseAdmin, requestMeta),
    ]);
    res.status(200).json({ success: true });
  } catch (error) {
    logger.error('notifications_cron_failed', {
      ...requestMeta,
      errorMessage: error instanceof Error ? error.message : 'unknown_error',
    });
    res.status(500).json({ error: 'Internal server error' });
  }
};

export default async function handler(req, res) {
  const requestMeta = getRequestMeta(req);
  const action = req.query?.action;

  switch (action) {
    case 'list':
      return handleList(req, res, requestMeta);
    case 'mark-read':
      return handleMarkRead(req, res, requestMeta);
    case 'cron-check':
      return handleCronCheck(req, res, requestMeta);
    default:
      res.status(404).json({ error: 'Unknown notifications action' });
  }
}
