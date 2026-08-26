// Cloudflare Pages Function: /api/analyze
// Executes TitanCouncil Deliberation powered by Google Gemini with Live Google Search Grounding & Titan-Specific Source Citations

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
    const isCanadian = ticker.toUpperCase().endsWith('.TO') || ticker.toUpperCase().endsWith('.V');

    const systemPrompt = `You are the TitanCouncil Coordinator.
Conduct a rigorous multi-perspective stock deliberation on: "${ticker}".
Use live Google Search to retrieve the latest real-time stock price, recent quarterly earnings, revenue growth, operating margin, ROE/ROIC, FCF, and balance sheet figures.

Sages to consult: ${sages ? sages.join(', ') : 'All 13 Sages (Warren Buffett, Charlie Munger, Benjamin Graham, Peter Lynch, Michael Burry, Cathie Wood, Stanley Druckenmiller, Bill Ackman, Phil Fisher, Nassim Taleb, Mohnish Pabrai, Aswath Damodaran, Rakesh Jhunjhunwala)'}.

User-Provided Financial Notes: ${financials || 'None. Ground your deliberation on live Google Search results, SEC EDGAR 10-K/10-Q filings, and SEDAR+ (for Canadian TSE .TO tickers).'}.
Output Language: ${isZh ? 'Traditional Chinese (繁體中文)' : 'English'}.

CRITICAL REQUIREMENTS FOR TITAN-SPECIFIC EVIDENCE & SOURCES:
- Each Titan MUST cite their own distinct, authentic data source and concrete quantitative data snippet relevant to their methodology.
  Examples:
  * Buffett: SEC 10-K Owner Earnings & ROE Breakdown (e.g., "TTM Net Income $X, FCF $Y, ROE Z%, Debt/Equity D")
  * Munger: ROIC & Capital Allocation Proxy (e.g., "5-yr avg ROIC X%, Pricing Power Gross Margin Y%")
  * Graham: Balance Sheet Liquidation & Current Ratio (e.g., "Current Ratio X, Net Current Assets vs Debt Y, Graham Number $Z")
  * Burry: FCF Yield & Short Interest / EV Multiples (e.g., "FCF/EV Yield X%, EV/EBIT Yx, Short Interest Z%")
  * Wood: 5-Yr Exponential TAM & Innovation R&D (e.g., "AI/Cloud TAM $X Trillion, 5-yr Revenue CAGR Y%, R&D spend $Z")
  * Druckenmiller: Macro Liquidity & Earnings Revisions (e.g., "Forward EPS revisions +X% over last 90 days, Liquidity tailwinds")
  * Ackman: 13F Dominant Franchise & Margin Levers (e.g., "Market share #1 at X%, Operating Margin Y%, Catalyst potential")
  * Fisher: Scuttlebutt & R&D Commercialization (e.g., "R&D as % of Sales X%, Customer retention rate Y%")
  * Taleb: Debt Maturity & Antifragility Solvency (e.g., "Total Debt $X vs Cash $Y, Single-supplier concentration risk Z")
  * Pabrai: Dhandho 50% Margin of Safety Screen (e.g., "Downside worst-case floor $X vs current market price $Y")
  * Damodaran: NYU Stern DCF Valuation & Cost of Capital (e.g., "WACC X%, 10-yr CAGR Y%, Intrinsic DCF value band $Z")
  * Jhunjhunwala: ROCE & Long-Term Compounding (e.g., "ROCE X%, Domestic market penetration growth Y%")
  * Canadian (.TO) stocks: Cite SEDAR+ Official Disclosures and TSX Financial Data.

Respond ONLY in valid JSON matching this schema:
{
  "ticker": "${ticker}",
  "livePrice": "$XXX.XX",
  "provenanceSummary": "Live Google Search & SEC EDGAR / SEDAR+ Grounded Analysis",
  "sources": [
    "Google Finance (Real-Time Price & Multiples)",
    "SEC EDGAR 10-K / 10-Q Filings",
    "SEDAR+ Regulatory Disclosures (Canada TSX)",
    "NYU Stern Corporate Valuation Database"
  ],
  "verdicts": [
    {
      "titanId": "buffett",
      "sageName": "Warren Buffett",
      "signal": "BULLISH" | "BEARISH" | "NEUTRAL",
      "confidence": 85,
      "sourceName": "SEC EDGAR 10-K (Owner Earnings & ROE)",
      "sourceDataSnippet": "Actual numbers quoted (e.g. 2024 Revenue $96.3B, ROE 115%, FCF $53.8B, Cash $34.8B)",
      "sourceUrl": "https://www.google.com/finance/quote/${ticker.replace('.TO', '')}",
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
            { text: `${systemPrompt}\n\nExecute live Google search for ${ticker} actual financial figures and execute deliberation with explicit data snippets and source links. Return strict JSON.` }
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

    // Fallback if googleSearch tool is unavailable
    if (!res.ok) {
      const fallbackPayload = {
        contents: [
          {
            role: "user",
            parts: [
              { text: `${systemPrompt}\n\nExecute detailed deliberation for ${ticker} with actual data snippets and source links. Return strict JSON.` }
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
