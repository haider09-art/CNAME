import { neon } from '@neondatabase/serverless';

export function getSql() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error('DATABASE_URL is not configured');
  return neon(url);
}

export function sendError(res, error, status = 500) {
  console.error(error);
  res.status(status).json({ ok: false, error: status >= 500 ? 'Server error' : error.message });
}
