import { getSql } from './_db.js';

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ ok: false, error: 'Method not allowed' });

  const configured = {
    database: Boolean(process.env.DATABASE_URL),
    openai: Boolean(process.env.OPENAI_API_KEY),
    hostingerMail: Boolean(process.env.HOSTINGER_SMTP_HOST && process.env.HOSTINGER_SMTP_USER && process.env.HOSTINGER_SMTP_PASS),
    googleCalendar: Boolean(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET),
    callProvider: Boolean(process.env.CALL_PROVIDER_URL && process.env.CALL_PROVIDER_TOKEN)
  };

  let databaseReachable = false;
  let databaseError = null;
  if (configured.database) {
    try {
      const sql = getSql();
      await sql`SELECT 1 AS ok`;
      databaseReachable = true;
    } catch (error) {
      databaseError = error.message;
    }
  }

  res.status(200).json({
    ok: true,
    service: 'AuraFleet CRM',
    configured,
    reachable: { database: databaseReachable },
    databaseError,
    checkedAt: new Date().toISOString()
  });
}
