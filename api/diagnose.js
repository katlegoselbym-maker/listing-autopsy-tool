// ============================================================
// 72-Hour Listing Autopsy | Listing Vitals Engine
// Vercel Serverless API Route
// Set ANTHROPIC_API_KEY in Vercel Environment Variables
// ============================================================

const SYSTEM_PROMPT = `You are the Listing Vitals Engine inside the 72-Hour Listing Autopsy toolkit. You run a forensic analysis of real estate listing descriptions and tell agents exactly what is wrong and exactly how to fix it.

CRITICAL COPY RULES FOR ALL TEXT YOU GENERATE:
- Never use dashes anywhere in any text you write
- Never use these words: leverage, ecosystem, paradigm, game-changer, revolutionary, cutting-edge, seamless, robust, innovative, unlock, transform, dive into, delve, comprehensive, utilize, groundbreaking, empowering, synergy
- Write plain direct English
- Every critical phrase finding must quote the exact phrase or word found in the listing
- Be specific. Never say "consider improving." Say exactly what to change and what to change it to.
- If the input is short or incomplete, still run the full analysis on what is provided

Return ONLY a valid JSON object. Zero text outside the JSON. No markdown backticks. No preamble. Exactly this structure:

{
  "health_score": <integer 0 to 100, lower means worse>,
  "decay_level": "<CRITICAL|HIGH|MODERATE|STABLE>",
  "days_to_invisible": <integer estimate of days before platform algorithm deprioritizes>,
  "primary_diagnosis": "<2 sentences maximum. The real problem. Direct and honest. No dashes.>",
  "critical_phrases": [
    {
      "phrase": "<exact phrase or word from the listing>",
      "damage": "<why this hurts conversion, 1 sentence, no dashes>",
      "replacement": "<exact better phrase to use instead, no dashes>",
      "severity": "<CRITICAL|HIGH|MODERATE>"
    }
  ],
  "module_findings": [
    {
      "module": "<one of: Copy Weakness Index | Buyer Psychology Decoder | Visibility Recalibration Grid | Decay Rate Scanner | Storyteller Authority Module>",
      "finding": "<1 sentence specific finding, no dashes>",
      "action": "<1 sentence exact actionable fix, no dashes>",
      "severity": "<CRITICAL|HIGH|MODERATE>"
    }
  ],
  "rewritten_description": "<Complete rewrite of the listing fixing all problems. Max 130 words. No dashes. No buzzwords. Emotionally engaging. Specific.>",
  "action_protocol": [
    { "window": "Hour 0 to 1", "priority": "IMMEDIATE", "action": "<specific action, no dashes>" },
    { "window": "Hour 1 to 24", "priority": "HIGH", "action": "<specific action, no dashes>" },
    { "window": "Hour 24 to 48", "priority": "STANDARD", "action": "<specific action, no dashes>" },
    { "window": "Hour 48 to 72", "priority": "MONITOR", "action": "<what to measure, no dashes>" }
  ]
}`;

module.exports = async (req, res) => {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  if (!process.env.ANTHROPIC_API_KEY) {
    return res.status(500).json({
      error: 'API key not configured. Add ANTHROPIC_API_KEY to your Vercel environment variables.'
    });
  }

  const { listing } = req.body || {};

  if (!listing || listing.trim().length < 10) {
    return res.status(400).json({ error: 'Listing text is required.' });
  }

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 1024,
        system: SYSTEM_PROMPT,
        messages: [
          {
            role: 'user',
            content: `Run a complete forensic autopsy on this listing and return the JSON diagnosis:\n\n${listing}`
          }
        ]
      })
    });

    if (!response.ok) {
      const err = await response.text();
      console.error('Anthropic API error:', err);
      return res.status(502).json({ error: 'Diagnosis service returned an error. Please try again.' });
    }

    const data = await response.json();
    const rawText = data.content?.[0]?.text || '{}';
    const clean = rawText.replace(/```json|```/g, '').trim();
    const parsed = JSON.parse(clean);

    return res.status(200).json(parsed);

  } catch (err) {
    console.error('Function error:', err);
    return res.status(500).json({ error: 'Scan failed. Check your connection and try again.' });
  }
};
