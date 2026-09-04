import { getSql } from './_db.js';

function extractText(data) {
  if (data.output_text) return data.output_text;
  const parts = [];
  for (const item of data.output || []) {
    for (const content of item.content || []) {
      if (content.type === 'output_text' && content.text) parts.push(content.text);
    }
  }
  return parts.join('\n').trim();
}

const ACTIONS = {
  outreach: 'Write a concise, professional UK B2B taxi-outsourcing outreach message. Avoid spammy language and unsupported claims. Focus on booking overflow, out-of-hours support, dispatch relief, ETA updates and customer service.',
  research: 'Analyze the supplied public business information for a UK taxi/private-hire operator. Identify likely operational pain points, evidence, confidence, and the next ethical sales action. Do not invent private contact data.',
  score: 'Score this UK taxi outsourcing opportunity from 0-100 using only supplied facts. Explain the score, evidence, uncertainties and recommended next step.',
  followup: 'Create a concise professional follow-up based only on the supplied CRM context. Avoid fabricated urgency or claims.'
};

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ ok: false, error: 'Method not allowed' });
  if (!process.env.OPENAI_API_KEY) return res.status(503).json({ ok: false, error: 'OPENAI_API_KEY is not configured' });

  const body = req.body || {};
  const action = ACTIONS[body.action] ? body.action : 'research';
  const instruction = ACTIONS[action];
  const context = typeof body.context === 'string' ? body.context : JSON.stringify(body.context || {}, null, 2);

  try {
    const response = await fetch('https://api.openai.com/v1/responses', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: process.env.OPENAI_MODEL || 'gpt-5-mini',
        input: [
          { role: 'system', content: [{ type: 'input_text', text: 'You are AuraFleet Intelligence for NextAura Solutions. Be factual, commercially useful, privacy-aware, and concise. Clearly separate known facts from inference.' }] },
          { role: 'user', content: [{ type: 'input_text', text: `${instruction}\n\nCRM CONTEXT:\n${context}` }] }
        ],
        max_output_tokens: 700
      })
    });

    const data = await response.json();
    if (!response.ok) return res.status(response.status).json({ ok: false, error: data.error?.message || 'OpenAI request failed' });
    const text = extractText(data);

    if (process.env.DATABASE_URL && body.companyId) {
      try {
        const sql = getSql();
        await sql`INSERT INTO ai_insights (company_id,insight_type,model,title,summary,payload,confidence) VALUES (${body.companyId},${action},${process.env.OPENAI_MODEL || 'gpt-5-mini'},${`AuraFleet ${action}`},${text},${JSON.stringify({ request: body.context || null })}::jsonb,null)`;
      } catch (logError) {
        console.error('AI insight logging failed', logError);
      }
    }

    res.status(200).json({ ok: true, action, text });
  } catch (error) {
    console.error(error);
    res.status(500).json({ ok: false, error: 'AI request failed' });
  }
}
