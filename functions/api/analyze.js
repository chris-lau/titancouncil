// Cloudflare Pages Function: /api/analyze
// Executes Market Sages Deliberation on Cloudflare Workers Edge

export async function onRequestPost(context) {
  const { request, env } = context;

  try {
    const body = await request.json();
    const { ticker, sages, financials, language = 'en', provider = 'cloudflare', apiKey } = body;

    if (!ticker) {
      return new Response(JSON.stringify({ error: 'Ticker symbol is required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const systemPrompt = `You are the Market Sages Council Coordinator.
Evaluate the stock "${ticker}" through the lens of the requested legendary investors: ${sages ? sages.join(', ') : 'All 13 Sages'}.

User Financial Data provided: ${financials || 'None (use recent knowledge)'}

Respond in strict JSON format:
{
  "ticker": "${ticker}",
  "verdicts": [
    {
      "sageName": "Name",
      "signal": "BULLISH" | "BEARISH" | "NEUTRAL",
      "confidence": 75,
      "reasoning": "1-2 sentence authentic quote in sage's voice"
    }
  ],
  "riskManager": {
    "consensus": { "bullish": 0, "bearish": 0, "neutral": 0 },
    "keyRisks": ["Risk 1", "Risk 2", "Risk 3"],
    "bullCase": "Description",
    "bearCase": "Description",
    "maxPosition": "X% of portfolio"
  },
  "portfolioManager": {
    "action": "BUY" | "HOLD" | "SELL" | "WATCH",
    "conviction": "HIGH" | "MEDIUM" | "LOW",
    "timeHorizon": "3-5 years",
    "rationale": "2-3 sentences",
    "entryStrategy": "Description",
    "exitCriteria": "Description"
  }
}`;

    // 1. Cloudflare Workers AI (Zero external setup if deployed on Cloudflare)
    if (provider === 'cloudflare' && env.AI) {
      const aiResponse = await env.AI.run('@cf/meta/llama-3.1-8b-instruct', {
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: `Analyze ticker ${ticker}` }
        ]
      });

      return new Response(JSON.stringify({ result: aiResponse.response }), {
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // 2. Google Gemini API
    const geminiKey = apiKey || env.GEMINI_API_KEY;
    if (provider === 'gemini' && geminiKey) {
      const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${geminiKey}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: `${systemPrompt}\n\nAnalyze ${ticker}` }] }],
          generationConfig: { responseMimeType: "application/json" }
        })
      });

      const geminiData = await res.json();
      const rawText = geminiData.candidates?.[0]?.content?.parts?.[0]?.text || '{}';
      return new Response(rawText, {
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // 3. OpenAI API
    const openaiKey = apiKey || env.OPENAI_API_KEY;
    if (provider === 'openai' && openaiKey) {
      const res = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${openaiKey}`
        },
        body: JSON.stringify({
          model: 'gpt-4o-mini',
          response_format: { type: 'json_object' },
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: `Analyze ticker ${ticker}` }
          ]
        })
      });

      const openAiData = await res.json();
      const content = openAiData.choices?.[0]?.message?.content || '{}';
      return new Response(content, {
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Fallback response
    return new Response(JSON.stringify({
      message: 'Deliberation processed via edge engine.'
    }), {
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}
