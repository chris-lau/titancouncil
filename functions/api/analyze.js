// Cloudflare Pages Function: /api/analyze
// Executes TitanCouncil Deliberation powered by Google Gemini with Live Google Search Grounding

export async function onRequestPost(context) {
  const { request, env } = context;

  try {
    const body = await request.json();
    const { ticker, sages, financials, language = 'en' } = body;

    if (!ticker) {
      return new Response(JSON.stringify({ error: 'Ticker symbol is required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const isZh = language === 'zh' || language === 'zh-CN' || language === 'zh-TW';

    const systemPrompt = `You are the TitanCouncil Coordinator.
Conduct a rigorous multi-perspective stock deliberation on: "${ticker}".
Use live Google Search to retrieve the latest real-time stock price, recent quarterly earnings, revenue growth, operating margin, and balance sheet data.

Sages to consult: ${sages ? sages.join(', ') : 'All 13 Sages (Warren Buffett, Charlie Munger, Benjamin Graham, Peter Lynch, Michael Burry, Cathie Wood, Stanley Druckenmiller, Bill Ackman, Phil Fisher, Nassim Taleb, Mohnish Pabrai, Aswath Damodaran, Rakesh Jhunjhunwala)'}.

User-Provided Financial Notes: ${financials || 'None. Ground your deliberation on live Google Search results, SEC EDGAR 10-K/10-Q filings, and SEDAR+ (for Canadian TSE .TO tickers).'}.
Output Language: ${isZh ? 'Traditional Chinese (繁體中文)' : 'English'}.

SAGE PHILOSOPHIES & MANDATORY CHAIN-OF-THOUGHT (CoT) RULES:
1. Warren Buffett: Circle of Competence -> Durable Moat & Pricing Power -> ROE > 15% & Owner Earnings -> Margin of Safety (> 25%).
2. Charlie Munger: Inversion (What kills it?) -> Lollapalooza Mental Models -> ROIC > 15% -> Management Integrity.
3. Benjamin Graham: Balance Sheet Defense (Current Ratio > 2.0, Debt vs NCAV) -> Graham Number -> Margin of Safety vs Book Value.
4. Peter Lynch: Understandable Business -> PEG Ratio (< 1.0) & Growth Runway -> Category (Fast Grower/Stalwart/Turnaround).
5. Michael Burry: FCF Yield (> 10% on EV) -> EV/EBIT (< 8x) -> Contrarian/Distressed Sentiment -> Downside Moat.
6. Cathie Wood: Exponential TAM Expansion -> 5-Yr Revenue CAGR (> 25%) -> Technology Convergence & Platform Network Effects.
7. Stanley Druckenmiller: Macro Liquidity & Sector Tailwinds -> Upward Earnings Revisions -> 3:1 Asymmetric Risk/Reward Setup.
8. Bill Ackman: Simple Predictable Cash Engine -> Dominant Market Share (#1 or #2) -> Operational Levers -> Downside Protection.
9. Phil Fisher: 15-Point Scuttlebutt Research -> R&D Commercialization Efficiency -> Sales/Distribution Dominance -> Management Depth.
10. Nassim Taleb: Antifragility vs Systemic Fragility -> Via Negativa (Debt/Concentration) -> Skin in the Game -> Lindy Effect -> Fat-Tail Risks.
11. Mohnish Pabrai: Dhandho Framework ("Heads I win, tails I don't lose much") -> Downside Protection First -> 50% Margin of Safety.
12. Aswath Damodaran: Narrative to Numbers Bridge -> 10-Yr Revenue CAGR & Operating Margins -> Reinvestment & WACC -> Intrinsic DCF Fair Value.
13. Rakesh Jhunjhunwala: Secular Growth Tailwinds -> ROCE > 20% Compounding Engine -> Holding Conviction.

Respond ONLY in valid JSON matching this schema:
{
  "ticker": "${ticker}",
  "livePrice": "$XXX.XX",
  "provenanceSummary": "Live Google Search & SEC/SEDAR+ Grounded Analysis",
  "sources": [
    "Google Finance (Real-Time Price & Multiples)",
    "SEC EDGAR 10-K / 10-Q Quarterly Filings",
    "SEDAR+ Regulatory Filings (Canada TSX)",
    "TitanCouncil Codified Valuation Models"
  ],
  "verdicts": [
    {
      "titanId": "buffett",
      "sageName": "Warren Buffett",
      "signal": "BULLISH" | "BEARISH" | "NEUTRAL",
      "confidence": 85,
      "provenance": "SEC 10-K & Live Web Data",
      "quote": "1-2 sentence core verdict in authentic voice",
      "chainOfThought": [
        "1. Competence & Franchise: [1 sentence analysis]",
        "2. Moat & Returns: [1 sentence analysis with ROE/ROIC]",
        "3. Margin of Safety: [1 sentence valuation and margin of safety check]"
      ]
    }
  ],
  "riskManager": {
    "consensus": { "bullish": 0, "bearish": 0, "neutral": 0 },
    "weightedConvictionScore": 84,
    "keyRisks": ["Primary risk 1", "Tail risk 2", "Competitive risk 3"],
    "bullCase": "Summary of upside thesis",
    "bearCase": "Summary of downside breakdown",
    "maxPosition": "5% - 8% allocation"
  },
  "portfolioManager": {
    "action": "ACCUMULATE ON PULLBACKS" | "STRONG BUY" | "HOLD / WATCH" | "TRIM / AVOID",
    "conviction": "HIGH" | "MODERATE" | "LOW",
    "timeHorizon": "2-4 Years (Medium to Long Term)",
    "execution": {
      "entryZone": "$XXX - $YYY",
      "stopLoss": "$ZZZ"
    },
    "rationale": "Portfolio manager synthesis of council views and macro positioning",
    "sourcesCited": [
      "SEC 10-K / 10-Q Disclosures",
      "SEDAR+ Filings",
      "DCF Valuation Model"
    ]
  }
}`;

    const geminiKey = env.GEMINI_API_KEY || (typeof GEMINI_API_KEY !== 'undefined' ? GEMINI_API_KEY : null);

    if (!geminiKey) {
      return new Response(JSON.stringify({
        error: 'GEMINI_API_KEY environment variable is not configured. Please set GEMINI_API_KEY in Cloudflare Pages Environment Variables.'
      }), {
        status: 503,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${geminiKey}`;

    // Payload with Google Search Grounding Tool
    const geminiPayload = {
      contents: [
        {
          role: "user",
          parts: [
            { text: `${systemPrompt}\n\nExecute live Google search for ${ticker} current financial stats and perform full deliberation. Return strict JSON.` }
          ]
        }
      ],
      tools: [
        { googleSearch: {} }
      ]
    };

    let res = await fetch(geminiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(geminiPayload)
    });

    // Fallback if googleSearch tool format is rejected by specific model version
    if (!res.ok) {
      const fallbackPayload = {
        contents: [
          {
            role: "user",
            parts: [
              { text: `${systemPrompt}\n\nExecute detailed deliberation for ${ticker}. Return strict JSON.` }
            ]
          }
        ],
        generationConfig: {
          responseMimeType: "application/json",
          temperature: 0.2
        }
      };

      res = await fetch(geminiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(fallbackPayload)
      });

      if (!res.ok) {
        const errBody = await res.text();
        throw new Error(`Gemini API error [${res.status}]: ${errBody}`);
      }
    }

    const geminiData = await res.json();
    const rawText = geminiData.candidates?.[0]?.content?.parts?.[0]?.text || '{}';
    
    // Extract JSON object from potential markdown fences
    let parsedJson = {};
    try {
      const cleanedText = rawText.replace(/```json\s*/i, '').replace(/```\s*$/, '').trim();
      parsedJson = JSON.parse(cleanedText);
    } catch {
      const firstBrace = rawText.indexOf('{');
      const lastBrace = rawText.lastIndexOf('}');
      if (firstBrace !== -1 && lastBrace !== -1) {
        parsedJson = JSON.parse(rawText.substring(firstBrace, lastBrace + 1));
      } else {
        parsedJson = { error: 'Failed to parse structured JSON from Gemini' };
      }
    }

    // Extract live web search grounding citations if available
    const groundingChunks = geminiData.candidates?.[0]?.groundingMetadata?.groundingChunks || [];
    const webLinks = [];
    groundingChunks.forEach(chunk => {
      if (chunk.web?.title && chunk.web?.uri) {
        webLinks.push({
          title: chunk.web.title,
          url: chunk.web.uri
        });
      }
    });

    if (webLinks.length > 0) {
      parsedJson.groundingWebLinks = webLinks;
    }

    return new Response(JSON.stringify(parsedJson), {
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-store'
      }
    });

  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}
