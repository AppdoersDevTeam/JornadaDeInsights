export default async function handler(_req, res) {
  const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;

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

  const warnings = [];
  if (!process.env.STRIPE_WEBHOOK_SECRET) {
    warnings.push('STRIPE_WEBHOOK_SECRET');
  }
  if (!process.env.FRONTEND_URL) {
    warnings.push('FRONTEND_URL');
  }

  const healthy = missing.length === 0;

  res.status(healthy ? 200 : 503).json({
    ok: healthy,
    timestamp: new Date().toISOString(),
    missingEnv: missing,
    warnings,
  });
}
