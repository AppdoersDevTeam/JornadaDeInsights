import { Resend } from 'resend';
import { applyCors, handleOptionsRequest } from '../lib/cors.js';
import { logger, getRequestMeta } from '../lib/logger.js';
import { captureServerError } from '../lib/monitoring.js';

const resendApiKey = process.env.RESEND_API_KEY;
const resend = resendApiKey ? new Resend(resendApiKey) : null;
const CONTACT_TO = process.env.CONTACT_INBOX_EMAIL || 'suporte@jornadadeinsights.com';
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const escapeHtml = (value) =>
  String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

export default async function handler(req, res) {
  const requestMeta = getRequestMeta(req);
  applyCors(req, res, { methods: 'POST,OPTIONS' });

  if (handleOptionsRequest(req, res)) {
    return;
  }

  if (req.method !== 'POST') {
    logger.warn('contact_method_not_allowed', requestMeta);
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  if (!resend) {
    logger.error('contact_missing_resend_key', requestMeta);
    res.status(500).json({ error: 'Email service not configured' });
    return;
  }

  try {
    const { name, email, subject, message } = req.body || {};
    const trimmedName = typeof name === 'string' ? name.trim().slice(0, 120) : '';
    const trimmedEmail = typeof email === 'string' ? email.trim().toLowerCase() : '';
    const trimmedSubject = typeof subject === 'string' ? subject.trim().slice(0, 200) : '';
    const trimmedMessage = typeof message === 'string' ? message.trim().slice(0, 5000) : '';

    if (!trimmedName || !EMAIL_REGEX.test(trimmedEmail) || !trimmedSubject || !trimmedMessage) {
      res.status(400).json({ error: 'Invalid contact payload' });
      return;
    }

    const { error } = await resend.emails.send({
      from: 'Suporte Jornada de Insights <suporte@jornadadeinsights.com>',
      to: CONTACT_TO,
      reply_to: trimmedEmail,
      subject: `[Contact] ${trimmedSubject}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2>New contact form message</h2>
          <p><strong>Name:</strong> ${escapeHtml(trimmedName)}</p>
          <p><strong>Email:</strong> ${escapeHtml(trimmedEmail)}</p>
          <p><strong>Subject:</strong> ${escapeHtml(trimmedSubject)}</p>
          <p><strong>Message:</strong></p>
          <p style="white-space: pre-wrap;">${escapeHtml(trimmedMessage)}</p>
        </div>
      `,
    });

    if (error) {
      throw new Error(error.message || 'Failed to send contact email');
    }

    logger.info('contact_email_sent', { ...requestMeta, hasEmail: true });
    res.status(200).json({ ok: true });
  } catch (error) {
    captureServerError(error, { route: 'contact' });
    logger.error('contact_failed', {
      ...requestMeta,
      errorMessage: error instanceof Error ? error.message : 'unknown_error',
    });
    res.status(500).json({ error: 'Failed to send message' });
  }
}
