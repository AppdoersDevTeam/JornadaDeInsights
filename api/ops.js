import { createClient } from '@supabase/supabase-js';
import { Resend } from 'resend';
import { logger, getRequestMeta } from '../lib/logger.js';
import { captureServerError } from '../lib/monitoring.js';

const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const resendApiKey = process.env.RESEND_API_KEY;
const frontendUrl = process.env.FRONTEND_URL || 'https://jornadadeinsights.com';

const cronSecret = process.env.CRON_SECRET;
const resend = resendApiKey ? new Resend(resendApiKey) : null;

const CRON_STALE_AFTER_MS = 36 * 60 * 60 * 1000;

const handleHealth = async (req, res) => {
  const missing = [];
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    missing.push('SUPABASE_SERVICE_ROLE_KEY');
  }
  if (!supabaseUrl) {
    missing.push('SUPABASE_URL (or VITE_SUPABASE_URL)');
  }
  if (!process.env.STRIPE_SECRET_KEY) {
    missing.push('STRIPE_SECRET_KEY');
  }
  if (!process.env.RESEND_API_KEY) {
    missing.push('RESEND_API_KEY');
  }
  if (!cronSecret) {
    missing.push('CRON_SECRET');
  }

  const warnings = [];
  if (!process.env.STRIPE_WEBHOOK_SECRET) {
    warnings.push('STRIPE_WEBHOOK_SECRET');
  }
  if (!process.env.FRONTEND_URL) {
    warnings.push('FRONTEND_URL');
  }

  const detailAuth =
    (req.headers.authorization || '') === `Bearer ${cronSecret}` && Boolean(cronSecret);

  // Public response: no env name disclosure. Detail only with CRON_SECRET bearer.
  if (!detailAuth) {
    res.status(200).json({
      ok: missing.length === 0,
      warningCount: warnings.length,
    });
    return;
  }

  let notificationsCron = { lastRunAt: null, stale: true };
  if (supabaseUrl && supabaseServiceRoleKey) {
    try {
      const supabase = createClient(supabaseUrl, supabaseServiceRoleKey, {
        auth: { persistSession: false, autoRefreshToken: false },
      });
      const { data } = await supabase
        .from('app_metadata')
        .select('value')
        .eq('key', 'last_cron_run:notifications')
        .maybeSingle();
      const lastRunAt = data?.value || null;
      const stale = !lastRunAt || Date.now() - new Date(lastRunAt).getTime() > CRON_STALE_AFTER_MS;
      notificationsCron = { lastRunAt, stale };
      if (stale) {
        warnings.push('notifications_cron_stale');
      }
    } catch {
      warnings.push('notifications_cron_status_unavailable');
    }
  }

  const healthy = missing.length === 0;

  res.status(healthy ? 200 : 503).json({
    ok: healthy,
    timestamp: new Date().toISOString(),
    missingEnv: missing,
    warnings,
    notificationsCron,
  });
};

const handleFollowupRunner = async (req, res, requestMeta) => {
  if (req.method !== 'POST' && req.method !== 'GET') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  const authHeader = req.headers.authorization || '';
  const headerSecret = req.headers['x-cron-secret'];
  const authorized =
    Boolean(cronSecret) &&
    (authHeader === `Bearer ${cronSecret}` || headerSecret === cronSecret);

  if (!authorized) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }

  if (!supabaseUrl || !supabaseServiceRoleKey || !resend) {
    res.status(500).json({ error: 'Missing configuration' });
    return;
  }

  try {
    const supabase = createClient(supabaseUrl, supabaseServiceRoleKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    const nowIso = new Date().toISOString();
    const { data: jobs, error } = await supabase
      .from('lifecycle_followup_jobs')
      .select('*')
      .eq('status', 'pending')
      .eq('job_type', 'abandoned_cart_reminder')
      .lte('scheduled_for', nowIso)
      .limit(50);

    if (error) throw error;
    const pendingJobs = jobs || [];

    for (const job of pendingJobs) {
      if (!job.user_email) {
        await supabase
          .from('lifecycle_followup_jobs')
          .update({ status: 'cancelled', updated_at: new Date().toISOString() })
          .eq('id', job.id);
        continue;
      }

      const sendResult = await resend.emails.send({
        from: 'Suporte Jornada de Insights <suporte@jornadadeinsights.com>',
        to: job.user_email,
        subject: 'Seu carrinho ainda esta te esperando',
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color:#333;">Voce quase concluiu sua compra</h2>
            <p style="color:#666; line-height:1.6;">
              Seus itens ainda estao no carrinho. Quando quiser, finalize com seguranca em poucos cliques.
            </p>
            <a href="${frontendUrl}/cart" style="display:inline-block;padding:12px 20px;background:#007bff;color:#fff;text-decoration:none;border-radius:6px;">
              Voltar ao carrinho
            </a>
          </div>
        `,
      });

      if (sendResult.error) {
        await supabase
          .from('lifecycle_followup_jobs')
          .update({
            status: 'failed',
            updated_at: new Date().toISOString(),
            payload: {
              ...(job.payload || {}),
              lastError: sendResult.error.message || 'send_failed',
            },
          })
          .eq('id', job.id);
      } else {
        await supabase
          .from('lifecycle_followup_jobs')
          .update({
            status: 'sent',
            sent_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          })
          .eq('id', job.id);
      }
    }

    logger.info('lifecycle_followup_runner_completed', {
      ...requestMeta,
      processed: pendingJobs.length,
    });
    res.status(200).json({ ok: true, processed: pendingJobs.length });
  } catch (error) {
    captureServerError(error, { route: 'lifecycle-followup-runner' });
    res.status(500).json({ error: 'Runner failed' });
  }
};

export default async function handler(req, res) {
  const requestMeta = getRequestMeta(req);
  const action = req.query?.action;

  switch (action) {
    case 'health':
      return handleHealth(req, res, requestMeta);
    case 'followup-runner':
      return handleFollowupRunner(req, res, requestMeta);
    default:
      res.status(404).json({ error: 'Unknown ops action' });
  }
}
