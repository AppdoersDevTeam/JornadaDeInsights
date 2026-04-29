import { createClient } from '@supabase/supabase-js';
import { Resend } from 'resend';
import { logger, getRequestMeta } from './_lib/logger.js';
import { captureServerError } from './_lib/monitoring.js';

const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const resendApiKey = process.env.RESEND_API_KEY;
const frontendUrl = process.env.FRONTEND_URL || 'https://jornadadeinsights.com';

const cronSecret = process.env.CRON_SECRET;
const resend = resendApiKey ? new Resend(resendApiKey) : null;

export default async function handler(req, res) {
  const requestMeta = getRequestMeta(req);
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  if (!cronSecret || req.headers['x-cron-secret'] !== cronSecret) {
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
}
