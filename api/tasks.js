import { getSql, sendError } from './_db.js';

export default async function handler(req, res) {
  try {
    const sql = getSql();
    if (req.method === 'GET') {
      const rows = await sql`SELECT t.id,t.title,t.description,t.task_type,t.priority,t.status,t.due_at,t.completed_at,t.created_at,c.name AS company FROM tasks t LEFT JOIN companies c ON c.id=t.company_id ORDER BY CASE WHEN t.status='open' THEN 0 ELSE 1 END, t.due_at NULLS LAST, t.created_at DESC LIMIT 100`;
      return res.status(200).json({ ok: true, tasks: rows });
    }
    if (req.method === 'POST') {
      const body = req.body || {};
      const title = String(body.title || '').trim();
      if (!title) return res.status(400).json({ ok: false, error: 'Task title is required' });
      const rows = await sql`INSERT INTO tasks (company_id,contact_id,opportunity_id,assigned_user_id,title,description,task_type,priority,status,due_at) VALUES (${body.companyId || null},${body.contactId || null},${body.opportunityId || null},${body.assignedUserId || null},${title},${body.description || null},${body.taskType || 'follow_up'},${body.priority || 'normal'},'open',${body.dueAt || null}) RETURNING *`;
      return res.status(201).json({ ok: true, task: rows[0] });
    }
    if (req.method === 'PATCH') {
      const id = String(req.query?.id || req.body?.id || '').trim();
      if (!id) return res.status(400).json({ ok: false, error: 'Task id is required' });
      const status = req.body?.status === 'completed' ? 'completed' : 'open';
      const rows = await sql`UPDATE tasks SET status=${status}, completed_at=${status === 'completed' ? new Date().toISOString() : null}, updated_at=now() WHERE id=${id} RETURNING *`;
      return res.status(200).json({ ok: true, task: rows[0] || null });
    }
    return res.status(405).json({ ok: false, error: 'Method not allowed' });
  } catch (error) {
    sendError(res, error);
  }
}
