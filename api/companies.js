import { getSql, sendError } from './_db.js';

export default async function handler(req, res) {
  try {
    const sql = getSql();
    if (req.method === 'GET') {
      const q = String(req.query?.q || '').trim();
      const rows = q
        ? await sql`SELECT c.id,c.name,c.company_number,c.status,c.website,c.business_email,c.business_phone,c.dispatch_software,c.fleet_size_estimate,c.operating_24_7,c.source_confidence,c.last_verified_at,ci.name AS city FROM companies c LEFT JOIN cities ci ON ci.id=c.city_id WHERE c.name ILIKE ${'%' + q + '%'} OR coalesce(c.business_email,'') ILIKE ${'%' + q + '%'} OR coalesce(c.business_phone,'') ILIKE ${'%' + q + '%'} ORDER BY c.updated_at DESC LIMIT 100`
        : await sql`SELECT c.id,c.name,c.company_number,c.status,c.website,c.business_email,c.business_phone,c.dispatch_software,c.fleet_size_estimate,c.operating_24_7,c.source_confidence,c.last_verified_at,ci.name AS city FROM companies c LEFT JOIN cities ci ON ci.id=c.city_id ORDER BY c.updated_at DESC LIMIT 100`;
      return res.status(200).json({ ok: true, companies: rows });
    }

    if (req.method === 'POST') {
      const body = req.body || {};
      const name = String(body.name || '').trim();
      if (!name) return res.status(400).json({ ok: false, error: 'Company name is required' });
      const rows = await sql`INSERT INTO companies (name,legal_name,company_number,status,website,business_email,business_phone,dispatch_software,fleet_size_estimate,operating_24_7,source_confidence,last_verified_at) VALUES (${name},${body.legalName || null},${body.companyNumber || null},${body.status || 'prospect'},${body.website || null},${body.businessEmail || null},${body.businessPhone || null},${body.dispatchSoftware || null},${body.fleetSizeEstimate || null},${body.operating247 ?? null},${body.sourceConfidence || null},now()) RETURNING *`;
      return res.status(201).json({ ok: true, company: rows[0] });
    }

    return res.status(405).json({ ok: false, error: 'Method not allowed' });
  } catch (error) {
    sendError(res, error);
  }
}
