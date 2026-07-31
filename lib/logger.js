const LOG_LEVELS = {
  debug: 10,
  info: 20,
  warn: 30,
  error: 40,
};

const configuredLevel = String(process.env.LOG_LEVEL || 'info').toLowerCase();
const activeLevel = LOG_LEVELS[configuredLevel] || LOG_LEVELS.info;

const safeString = (value, maxLength = 300) => {
  if (typeof value !== 'string') return value;
  if (value.length <= maxLength) return value;
  return `${value.slice(0, maxLength)}...`;
};

const sanitizeMeta = (meta = {}) => {
  const sanitized = {};
  Object.entries(meta).forEach(([key, value]) => {
    const keyLower = key.toLowerCase();
    if (
      keyLower.includes('authorization') ||
      keyLower.includes('token') ||
      keyLower.includes('secret') ||
      keyLower.includes('password') ||
      keyLower.includes('cookie') ||
      keyLower.includes('apikey') ||
      keyLower.includes('api_key')
    ) {
      sanitized[key] = '[REDACTED]';
      return;
    }

    if (typeof value === 'string') {
      sanitized[key] = safeString(value);
      return;
    }

    if (value && typeof value === 'object') {
      sanitized[key] = '[OBJECT]';
      return;
    }

    sanitized[key] = value;
  });
  return sanitized;
};

const log = (level, message, meta = {}) => {
  if ((LOG_LEVELS[level] || LOG_LEVELS.info) < activeLevel) return;
  const entry = {
    level,
    message,
    timestamp: new Date().toISOString(),
    ...sanitizeMeta(meta),
  };

  if (level === 'error') {
    console.error(JSON.stringify(entry));
    return;
  }
  if (level === 'warn') {
    console.warn(JSON.stringify(entry));
    return;
  }
  console.log(JSON.stringify(entry));
};

export const logger = {
  debug: (message, meta) => log('debug', message, meta),
  info: (message, meta) => log('info', message, meta),
  warn: (message, meta) => log('warn', message, meta),
  error: (message, meta) => log('error', message, meta),
};

export const getRequestMeta = (req) => ({
  method: req.method,
  path: req.url,
  requestId: req.headers['x-request-id'] || null,
});
