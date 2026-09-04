import { getSql, sendError } from './_db.js';

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ ok: false, error: 'Method not allowed' });
  try {
    const sql = getSql();
    const [companies, opportunities, emails, calls, meetings, pipeline, tasks, activity] = await Promise.all([
      sql`SELECT count(*)::int AS value FROM companies`,
      sql`SELECT count(*)::int AS value FROM opportunities WHERE stage NOT IN ('won','lost')`,
      sql`SELECT count(*)::int AS value FROM email_messages WHERE direction='outbound' AND status IN ('sent','delivered','opened','replied')`,
      sql`SELECT count(*)::int AS value FROM call_logs`,
      sql`SELECT count(*)::int AS value FROM activities WHERE activity_type IN ('meeting','calendar_event')`,
      sql`SELECT coalesce(sum(value_gbp),0)::numeric AS value FROM opportunities WHERE stage NOT IN ('lost')`,
      sql`SELECT count(*)::int AS value FROM tasks WHERE status='open'`,
      sql`SELECT id, activity_type, title, details, occurred_at FROM activities ORDER BY occurred_at DESC LIMIT 8`
    ]);

    res.status(200).json({
      ok: true,
      metrics: {
        companies: companies[0]?.value ?? 0,
        opportunities: opportunities[0]?.value ?? 0,
        emails: emails[0]?.value ?? 0,
        calls: calls[0]?.value ?? 0,
        meetings: meetings[0]?.value ?? 0,
        pipelineValue: Number(pipeline[0]?.value ?? 0),
        openTasks: tasks[0]?.value ?? 0
      },
      recentActivity: activity
    });
  } catch (error) {
    sendError(res, error);
  }
}
