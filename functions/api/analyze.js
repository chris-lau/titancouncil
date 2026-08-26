// Cloudflare Pages Function: /api/analyze
// Executes TitanCouncil Deliberation powered exclusively by Google Gemini

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
Orchestrate the council of legendary investors to conduct a rigorous, multi-perspective stock deliberation on: "${ticker}".

Sages to consult: ${sages ? sages.join(', ') : 'All 13 Sages (Warren Buffett, Charlie Munger, Benjamin Graham, Peter Lynch, Michael Burry, Cathie Wood, Stanley Druckenmiller, Bill Ackman, Phil Fisher, Nassim Taleb, Mohnish Pabrai, Aswath Damodaran, Rakesh Jhunjhunwala)'}.

User-Provided Financial Context: ${financials || 'None provided. Use corporate filings (10-K/10-Q), SEDAR+ (for Canadian TSE/TSX tickers ending in .TO), and financial data models.'}.
Output Language: ${isZh ? 'Traditional Chinese (繁體中文)' : 'English'}.

SAGE PHILOSOPHIES & MANDATORY CHAIN-OF-THOUGHT (CoT) EVALUATION RULES:
1. Warren Buffett: Circle of Competence -> Durable Moat & Pricing Power -> Capital Allocation (ROE > 15%, Owner Earnings) -> Margin of Safety (> 25%).
2. Charlie Munger: Inversion (What kills it?) -> Lollapalooza Multidisciplinary Effects -> ROIC Consistency (> 15%) -> Management Trust.
3. Benjamin Graham: Balance Sheet Defense (Current Ratio > 2.0, Debt vs NCAV) -> Graham Number √(22.5*EPS*BVPS) -> Margin of Safety vs Book Value.
4. Peter Lynch: Understandable Business -> PEG Ratio (< 1.0) & Earnings Growth Runway -> Balance Sheet Health -> Category (Fast Grower/Stalwart/Turnaround).
5. Michael Burry: Free Cash Flow Yield (> 10% on EV) -> EV/EBIT (< 8x) & Debt Solvency -> Contrarian/Distressed Sentiment -> Downside Moat.
6. Cathie Wood: Exponential TAM Expansion -> 5-Yr Revenue CAGR (> 25%) -> Technology Convergence & Platform Network Effects.
7. Stanley Druckenmiller: Macro Liquidity & Sector Tailwinds -> Upward Earnings Revisions -> 3:1 Asymmetric Risk/Reward Setup -> Near-Term Catalysts.
8. Bill Ackman: Simple Predictable Cash Engine -> Dominant Market Share (#1 or #2) -> Operational/Activist Value Levers -> Downside Protection.
9. Phil Fisher: 15-Point Scuttlebutt Research -> R&D Commercialization Efficiency -> Sales/Distribution Dominance -> Management Depth.
10. Nassim Taleb: Antifragility vs Systemic Fragility -> Via Negativa (Remove Debt/Concentration Risks) -> Skin in the Game -> Lindy Effect Durability -> Fat-Tail/Black Swan Risks.
11. Mohnish Pabrai: "Heads I win, tails I don't lose much" (Dhandho) -> Downside Protection First -> 50% Margin of Safety -> Asset-Light Economics.
12. Aswath Damodaran: Narrative to Numbers Bridge -> 10-Yr Revenue CAGR & Operating Margin Trajectory -> Reinvestment & WACC -> Intrinsic DCF Fair Value Range.
13. Rakesh Jhunjhunwala: Secular Growth Tailwinds -> ROCE > 20% Compounding Engine -> Holding Conviction Through Volatility.

Respond ONLY with valid JSON matching this schema:
{
  "ticker": "${ticker}",
  "sources": [
    "SEC 10-K / 10-Q Filings & Earnings Calls",
    "SEDAR+ Canadian Regulatory Filings (if TSE listing)",
    "Financial Multiples & Consensus Balance Sheet",
    "TitanCouncil Codified Investment Frameworks"
  ],
  "verdicts": [
    {
      "titanId": "buffett",
      "sageName": "Warren Buffett",
      "signal": "BULLISH" | "BEARISH" | "NEUTRAL",
      "confidence": 85,
      "quote": "1-2 sentence high-impact quote in authentic voice",
      "chainOfThought": [
        "1. Competence & Franchise: [1 sentence analysis]",
        "2. Moat & Returns: [1 sentence analysis with ROE/ROIC focus]",
        "3. Margin of Safety: [1 sentence valuation and margin of safety check]"
      ]
    }
  ],
  "riskManager": {
    "consensus": { "bullish": 0, "bearish": 0, "neutral": 0 },
    "weightedConvictionScore": 82,
    "keyRisks": ["Primary risk 1", "Tail risk 2", "Competitive risk 3"],
    "bullCase": "Concise summary of upside thesis",
    "bearCase": "Concise summary of downside breakdown",
    "maxPosition": "5% - 8% allocation limit"
  },
  "portfolioManager": {
    "action": "ACCUMULATE ON PULLBACKS" | "STRONG BUY" | "HOLD / WATCH" | "TRIM / AVOID",
    "conviction": "HIGH" | "MODERATE" | "LOW",
    "timeHorizon": "2-4 Years (Medium to Long Term)",
    "execution": {
      "entryZone": "$XXX - $YYY",
      "stopLoss": "$ZZZ"
    },
    "rationale": "Portfolio manager synthesis of the council's opposing views and macro positioning",
    "sourcesCited": [
      "SEC Annual / Quarterly Filings",
      "DCF Intrinsic Valuation Model",
      "Titan Consensus Scorecard"
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

    // Call Google Gemini API (gemini-2.0-flash / gemini-1.5-flash)
    const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${geminiKey}`;

    const geminiPayload = {
      contents: [
        {
          role: "user",
          parts: [
            { text: `${systemPrompt}\n\nExecute detailed deliberation for ticker: ${ticker}` }
          ]
        }
      ],
      generationConfig: {
        responseMimeType: "application/json",
        temperature: 0.2
      }
    };

    const res = await fetch(geminiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(geminiPayload)
    });

    if (!res.ok) {
      const errBody = await res.text();
      throw new Error(`Gemini API error [${res.status}]: ${errBody}`);
    }

    const geminiData = await res.json();
    const rawText = geminiData.candidates?.[0]?.content?.parts?.[0]?.text || '{}';

    return new Response(rawText, {
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
