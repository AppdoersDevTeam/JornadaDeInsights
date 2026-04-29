import { createClient } from '@supabase/supabase-js';
import { Resend } from 'resend';
import { applyCors, handleOptionsRequest } from './_lib/cors.js';
import { logger, getRequestMeta } from './_lib/logger.js';
import { captureServerError } from './_lib/monitoring.js';

const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const resendApiKey = process.env.RESEND_API_KEY;
const frontendUrl = process.env.FRONTEND_URL || 'https://jornadadeinsights.com';
const resend = resendApiKey ? new Resend(resendApiKey) : null;

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default async function handler(req, res) {
  const requestMeta = getRequestMeta(req);
  applyCors(req, res, { methods: 'POST,OPTIONS' });

  if (handleOptionsRequest(req, res)) {
    return;
  }

  if (req.method !== 'POST') {
    logger.warn('lead_capture_method_not_allowed', requestMeta);
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  if (!supabaseUrl || !supabaseServiceRoleKey) {
    logger.error('lead_capture_missing_supabase_config', requestMeta);
    res.status(500).json({ error: 'Missing Supabase configuration' });
    return;
  }

  try {
    const { email, consentMarketing, source } = req.body || {};
    const normalizedEmail = typeof email === 'string' ? email.trim().toLowerCase() : '';

    if (!EMAIL_REGEX.test(normalizedEmail)) {
      res.status(400).json({ error: 'Invalid email' });
      return;
    }

    if (consentMarketing !== true) {
      res.status(400).json({ error: 'Marketing consent is required' });
      return;
    }

    const supabase = createClient(supabaseUrl, supabaseServiceRoleKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    const payload = {
      email: normalizedEmail,
      source: typeof source === 'string' ? source.slice(0, 64) : 'website_newsletter',
      consent_marketing: true,
      consent_timestamp: new Date().toISOString(),
    };

    const { error } = await supabase
      .from('lead_captures')
      .upsert(payload, { onConflict: 'email' });

    if (error) throw error;

    await supabase.from('lifecycle_events').insert({
      event_name: 'lead_captured',
      page_path: '/newsletter',
      metadata: {
        source: payload.source,
      },
    });

    if (resend) {
      await resend.emails.send({
        from: 'Suporte Jornada de Insights <suporte@jornadadeinsights.com>',
        to: normalizedEmail,
        subject: 'Bem-vinda(o) a Jornada de Insights',
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h1 style="color: #333;">Que alegria ter voce com a gente!</h1>
            <p style="color: #666; line-height: 1.6;">
              Obrigada por se inscrever. Em breve voce recebera reflexoes, novidades e recursos para fortalecer sua jornada.
            </p>
            <p style="color: #666; line-height: 1.6;">
              Enquanto isso, voce pode explorar nossos eBooks e episodios.
            </p>
            <a href="${frontendUrl}/shop" style="display:inline-block;padding:12px 20px;background:#007bff;color:#fff;text-decoration:none;border-radius:6px;">
              Ver eBooks
            </a>
          </div>
        `,
      });
    }

    logger.info('lead_capture_saved', requestMeta);
    res.status(201).json({ ok: true });
  } catch (error) {
    captureServerError(error, { route: 'lead-capture' });
    logger.error('lead_capture_failed', {
      ...requestMeta,
      errorMessage: error instanceof Error ? error.message : 'unknown_error',
    });
    res.status(500).json({ error: 'Failed to save lead' });
  }
}
