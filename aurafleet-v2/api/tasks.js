import { getSql, sendError } from './_db.js';

export default async function handler(req, res) {
  try {
    const sql = getSql();

    if (req.method === 'GET') {
      const rows = await sql`SELECT t.id,t.title,t.description,t.task_type,t.priority,t.status,t.due_at,t.completed_at,c.name AS company_name,ct.full_name AS contact_name FROM tasks t LEFT JOIN companies c ON c.id=t.company_id LEFT JOIN contacts ct ON ct.id=t.contact_id ORDER BY CASE WHEN t.status='open' THEN 0 ELSE 1 END, t.due_at NULLS LAST, t.created_at DESC LIMIT 100`;
      return res.status(200).json({ ok: true, tasks: rows });
    }

    if (req.method === 'POST') {
      const body = req.body || {};
      const title = String(body.title || '').trim();
      if (!title) return res.status(400).json({ ok: false, error: 'Task title is required' });
      const rows = await sql`INSERT INTO tasks (company_id,contact_id,opportunity_id,title,description,task_type,priority,status,due_at) VALUES (${body.companyId || null},${body.contactId || null},${body.opportunityId || null},${title},${body.description || null},${body.taskType || 'follow_up'},${body.priority || 'normal'},'open',${body.dueAt || null}) RETURNING *`;
      return res.status(201).json({ ok: true, task: rows[0] });
    }

    if (req.method === 'PATCH') {
      const body = req.body || {};
      if (!body.id) return res.status(400).json({ ok: false, error: 'Task id is required' });
      const rows = body.status === 'completed'
        ? await sql`UPDATE tasks SET status='completed',completed_at=now(),updated_at=now() WHERE id=${body.id} RETURNING *`
        : await sql`UPDATE tasks SET status=${body.status || 'open'},priority=coalesce(${body.priority || null},priority),due_at=coalesce(${body.dueAt || null},due_at),updated_at=now() WHERE id=${body.id} RETURNING *`;
      if (!rows[0]) return res.status(404).json({ ok: false, error: 'Task not found' });
      return res.status(200).json({ ok: true, task: rows[0] });
    }

    return res.status(405).json({ ok: false, error: 'Method not allowed' });
  } catch (error) {
    sendError(res, error);
  }
}
