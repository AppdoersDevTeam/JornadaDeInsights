const ALLOWED_ORIGINS = (process.env.ALLOWED_ORIGINS || '')
  .split(',')
  .map((value) => value.trim())
  .filter(Boolean);

const DEFAULT_ALLOWED_ORIGINS = [
  'https://jornadadeinsights.com',
  'https://www.jornadadeinsights.com',
  'http://localhost:5173',
];

const DEFAULT_ALLOWED_HEADERS = 'Content-Type, Authorization, X-Requested-With';

const getAllowedOrigin = (origin) => {
  const allowed = ALLOWED_ORIGINS.length > 0 ? ALLOWED_ORIGINS : DEFAULT_ALLOWED_ORIGINS;
  if (origin && allowed.includes(origin)) return origin;
  return allowed[0];
};

export const applyCors = (req, res, options = {}) => {
  const {
    methods = 'GET,POST,OPTIONS',
    headers = DEFAULT_ALLOWED_HEADERS,
    credentials = true,
    cacheControl,
  } = options;

  if (credentials) {
    res.setHeader('Access-Control-Allow-Credentials', 'true');
  }
  res.setHeader('Access-Control-Allow-Origin', getAllowedOrigin(req.headers.origin));
  res.setHeader('Access-Control-Allow-Methods', methods);
  res.setHeader('Access-Control-Allow-Headers', headers);
  res.setHeader('Content-Type', 'application/json');
  if (cacheControl) {
    res.setHeader('Cache-Control', cacheControl);
  }
};

export const handleOptionsRequest = (req, res) => {
  if (req.method === 'OPTIONS') {
    res.status(204).end();
    return true;
  }
  return false;
};
