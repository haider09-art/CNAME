import { getSql, sendError } from './_db.js';

function extractText(data) {
  if (typeof data?.output_text === 'string') return data.output_text;
  const chunks = [];
  for (const item of data?.output || []) {
    for (const part of item?.content || []) {
      if (part?.type === 'output_text' && part?.text) chunks.push(part.text);
    }
  }
  return chunks.join('\n').trim();
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ ok: false, error: 'Method not allowed' });
  try {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) return res.status(503).json({ ok: false, error: 'OpenAI is not configured' });

    const body = req.body || {};
    const action = String(body.action || 'copilot');
    const context = body.context || {};
    const instructions = `You are AuraFleet AI, the B2B sales intelligence assistant for NextAura Solutions, which provides outsourced booking, dispatch and customer-support services to UK taxi/private-hire operators. Be concise, commercially useful and factual. Never invent private contact data or claim a source was checked when it was not. If information is missing, state that clearly.`;
    const prompts = {
      copilot: 'Analyze the supplied CRM context and give 3 practical next-best actions.',
      outreach: 'Write a short personalized B2B outreach email for this taxi operator. Avoid spammy language and unsupported claims.',
      callCoach: 'Create a concise call opening, 3 discovery questions, 3 likely objections with responses, and one next step.',
      opportunity: 'Score the sales opportunity from 0-100 using only supplied facts, explain the score, and suggest the next action.',
      review: 'Summarize the supplied public review data, identify operational pain themes, and suggest ethical outreach angles.'
    };

    const response = await fetch('https://api.openai.com/v1/responses', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'gpt-5.6-luna',
        instructions,
        input: `${prompts[action] || prompts.copilot}\n\nCRM context:\n${JSON.stringify(context, null, 2)}`,
        reasoning: { effort: 'low' },
        max_output_tokens: 1200
      })
    });

    const data = await response.json();
    if (!response.ok) {
      console.error('OpenAI error', data);
      return res.status(response.status).json({ ok: false, error: data?.error?.message || 'OpenAI request failed' });
    }
    const text = extractText(data) || 'No response text returned.';

    if (process.env.DATABASE_URL && body.saveInsight !== false) {
      try {
        const sql = getSql();
        await sql`INSERT INTO ai_insights (company_id,contact_id,opportunity_id,insight_type,model,title,summary,payload,confidence) VALUES (${body.companyId || null},${body.contactId || null},${body.opportunityId || null},${action},${'gpt-5.6-luna'},${'AuraFleet AI'},${text},${JSON.stringify({ context })}::jsonb,${null})`;
      } catch (e) {
        console.error('Could not save AI insight', e);
      }
    }

    return res.status(200).json({ ok: true, text, responseId: data.id });
  } catch (error) {
    sendError(res, error);
  }
}
