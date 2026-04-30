import { applyCors, handleOptionsRequest } from './_lib/cors.js';
import { logger, getRequestMeta } from './_lib/logger.js';

const CACHE_TTL_MS = 6 * 60 * 60 * 1000;
let cache = {
  fetchedAt: 0,
  base: 'BRL',
  rates: {},
};

const isSupported = (code) => ['BRL', 'USD', 'EUR', 'GBP'].includes(code);

export default async function handler(req, res) {
  const requestMeta = getRequestMeta(req);
  applyCors(req, res, { methods: 'GET,OPTIONS' });

  if (handleOptionsRequest(req, res)) {
    return;
  }

  if (req.method !== 'GET') {
    logger.warn('fx_rate_method_not_allowed', requestMeta);
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  const base = 'BRL';
  const target = typeof req.query.target === 'string' ? req.query.target.toUpperCase() : 'USD';
  if (!isSupported(target)) {
    res.status(400).json({ error: 'Unsupported currency' });
    return;
  }

  try {
    const now = Date.now();
    const isFresh = cache.fetchedAt && now - cache.fetchedAt < CACHE_TTL_MS;

    if (!isFresh) {
      const resp = await fetch(`https://open.er-api.com/v6/latest/${base}`);
      if (!resp.ok) {
        throw new Error(`FX provider error (${resp.status})`);
      }
      const json = await resp.json();
      const rates = json?.rates && typeof json.rates === 'object' ? json.rates : {};
      cache = {
        fetchedAt: now,
        base,
        rates,
      };
    }

    const rate = Number(cache.rates?.[target]);
    if (!Number.isFinite(rate) || rate <= 0) {
      res.status(502).json({ error: 'FX rate unavailable' });
      return;
    }

    res.status(200).json({
      base,
      target,
      rate,
      fetchedAt: new Date(cache.fetchedAt).toISOString(),
    });
  } catch (error) {
    logger.error('fx_rate_failed', {
      ...requestMeta,
      errorMessage: error instanceof Error ? error.message : 'unknown_error',
    });
    res.status(500).json({ error: 'Internal server error' });
  }
}

