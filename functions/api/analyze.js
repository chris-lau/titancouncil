// Cloudflare Pages Function: /api/analyze
// Executes TitanCouncil Deliberation on Cloudflare Workers Edge

export async function onRequestPost(context) {
  const { request, env } = context;

  try {
    const body = await request.json();
    const { ticker, sages, financials, language = 'en', provider = 'auto', apiKey } = body;

    if (!ticker) {
      return new Response(JSON.stringify({ error: 'Ticker symbol is required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const isZh = language === 'zh' || language === 'zh-CN';

    const systemPrompt = `You are the TitanCouncil Coordinator.
Orchestrate the council of legendary investors to analyze the stock: "${ticker}".

Sages to consult: ${sages ? sages.join(', ') : 'All 13 Sages (Warren Buffett, Charlie Munger, Benjamin Graham, Peter Lynch, Michael Burry, Cathie Wood, Stanley Druckenmiller, Bill Ackman, Phil Fisher, Nassim Taleb, Mohnish Pabrai, Aswath Damodaran, Rakesh Jhunjhunwala)'}.

User-provided Financials: ${financials || 'None (use recent knowledge / estimates)'}.
Output Language: ${isZh ? 'Chinese (Simplified/Traditional 中文)' : 'English'}.

SAGE PHILOSOPHIES & RULES TO APPLY STRICTLY:
1. Warren Buffett: Moats, ROE > 15%, low capex, owner earnings, margin of safety > 25%.
2. Charlie Munger: Invert always, lollapalooza effects, ROIC > 15%, pricing power, management integrity.
3. Benjamin Graham: Net-Net/NCAV, Graham Number √(22.5*EPS*BVPS), P/E < 15, current ratio > 2.0.
4. Peter Lynch: PEG < 1.0, understandability, category (Fast Grower/Stalwart/Turnaround).
5. Michael Burry: FCF Yield > 10%, EV/EBIT < 8.0, net debt/equity < 50%, contrarian sentiment.
6. Cathie Wood: Exponential TAM growth, 5-yr CAGR > 25%, platform & network disruption.
7. Stanley Druckenmiller: Macro tailwinds, earnings revision momentum, asymmetric payoff (3:1).
8. Bill Ackman: Simple business, market dominance (#1 or #2), activist catalyst, strong FCF.
9. Phil Fisher: 15-point scuttlebutt, R&D effectiveness, sales organization, management depth.
10. Nassim Taleb: Antifragility, convexity, via negativa (avoid debt), skin in the game, Lindy effect, fat tail risk.
11. Mohnish Pabrai: Downside protection first (Dhandho), margin of safety > 50%, cloning Buffett/Munger.
12. Aswath Damodaran: Story + numbers, DCF intrinsic value, sustainable CAGR & operating margins, WACC.
13. Rakesh Jhunjhunwala: Multi-year compounding, ROCE > 20%, patient conviction.

Respond in strict JSON format:
{
  "ticker": "${ticker}",
  "verdicts": [
    {
      "sageName": "Sage Name",
      "signal": "BULLISH" | "BEARISH" | "NEUTRAL",
      "confidence": 85,
      "reasoning": "1-2 sentence quote in authentic sage voice"
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
    "rationale": "Synthesis summary",
    "entryStrategy": "Entry guidelines",
    "exitCriteria": "Exit conditions"
  }
}`;

    // Priority 1: Google Gemini API (via GEMINI_API_KEY environment variable or client key)
    const geminiKey = apiKey || env.GEMINI_API_KEY;
    if ((provider === 'gemini' || provider === 'auto') && geminiKey) {
      const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${geminiKey}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: `${systemPrompt}\n\nAnalyze ${ticker}` }] }],
          generationConfig: { responseMimeType: "application/json" }
        })
      });

      if (res.ok) {
        const geminiData = await res.json();
        const rawText = geminiData.candidates?.[0]?.content?.parts?.[0]?.text || '{}';
        return new Response(rawText, {
          headers: { 'Content-Type': 'application/json' }
        });
      }
    }

    // Priority 2: OpenAI API (via OPENAI_API_KEY environment variable or client key)
    const openaiKey = apiKey || env.OPENAI_API_KEY;
    if ((provider === 'openai' || provider === 'auto') && openaiKey) {
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

      if (res.ok) {
        const openAiData = await res.json();
        const content = openAiData.choices?.[0]?.message?.content || '{}';
        return new Response(content, {
          headers: { 'Content-Type': 'application/json' }
        });
      }
    }

    // Priority 3: Anthropic Claude API (via ANTHROPIC_API_KEY environment variable or client key)
    const anthropicKey = apiKey || env.ANTHROPIC_API_KEY;
    if ((provider === 'anthropic' || provider === 'auto') && anthropicKey) {
      const res = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': anthropicKey,
          'anthropic-version': '2023-06-01'
        },
        body: JSON.stringify({
          model: 'claude-3-5-haiku-latest',
          max_tokens: 2000,
          system: systemPrompt,
          messages: [
            { role: 'user', content: `Analyze ticker ${ticker}. Respond ONLY with the requested JSON.` }
          ]
        })
      });

      if (res.ok) {
        const claudeData = await res.json();
        const content = claudeData.content?.[0]?.text || '{}';
        return new Response(content, {
          headers: { 'Content-Type': 'application/json' }
        });
      }
    }

    // Priority 4: Cloudflare Workers AI (@cf/meta/llama-3.1-8b-instruct)
    if (env.AI) {
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

    // Fallback message
    return new Response(JSON.stringify({
      error: 'No AI key or Cloudflare Workers AI binding detected. Please configure GEMINI_API_KEY, OPENAI_API_KEY, or ANTHROPIC_API_KEY in Cloudflare Environment Variables.'
    }), {
      status: 503,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}
