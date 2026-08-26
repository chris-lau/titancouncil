// Cloudflare Pages Function: /api/analyze
// Executes TitanCouncil Deliberation powered by Google Gemini with Live Google Search Grounding & Titan-Specific Source Citations

// In-Memory IP Throttling Store for Edge DDoS Protection & Rate Limiting
const ipRequestHistory = new Map();
const RATE_LIMIT_WINDOW_MS = 60 * 1000; // 1 minute window
const MAX_REQUESTS_PER_MINUTE = 8;     // Max 8 deep deliberations per minute per IP
const MIN_BURST_INTERVAL_MS = 2000;     // Min 2 seconds between consecutive requests

function checkRateLimit(clientIp) {
  const now = Date.now();
  
  // Cleanup stale IP entries (> 5 minutes old) to prevent memory leak
  if (ipRequestHistory.size > 10000) {
    for (const [ip, data] of ipRequestHistory.entries()) {
      if (now - data.lastRequest > 300000) {
        ipRequestHistory.delete(ip);
      }
    }
  }

  const record = ipRequestHistory.get(clientIp) || { timestamps: [], lastRequest: 0 };
  
  // 1. Burst protection (minimum gap between calls)
  if (now - record.lastRequest < MIN_BURST_INTERVAL_MS) {
    const waitSecs = Math.ceil((MIN_BURST_INTERVAL_MS - (now - record.lastRequest)) / 1000);
    return { allowed: false, retryAfter: Math.max(waitSecs, 2), reason: 'burst' };
  }

  // 2. Sliding window rate limit
  record.timestamps = record.timestamps.filter(ts => now - ts < RATE_LIMIT_WINDOW_MS);

  if (record.timestamps.length >= MAX_REQUESTS_PER_MINUTE) {
    const oldest = record.timestamps[0];
    const resetTime = oldest + RATE_LIMIT_WINDOW_MS;
    const retryAfter = Math.ceil((resetTime - now) / 1000);
    return { allowed: false, retryAfter: Math.max(retryAfter, 5), reason: 'window' };
  }

  // Record valid request
  record.timestamps.push(now);
  record.lastRequest = now;
  ipRequestHistory.set(clientIp, record);

  const remaining = MAX_REQUESTS_PER_MINUTE - record.timestamps.length;
  return { allowed: true, remaining };
}


// Fetch verified real-time price + fundamental financial data from market feeds
// Returns a comprehensive bundle of real-time and computed financial metrics
async function fetchMarketDataBundle(rawTicker) {
  const cleanTicker = (rawTicker || '').replace(/^\$/, '').trim().toUpperCase();
  const headers = { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' };

  // Fetch price quote and fundamental data in parallel (5s timeout to avoid Worker stall)
  const [quoteRes, summaryRes] = await Promise.allSettled([
    fetch(`https://query2.finance.yahoo.com/v8/finance/chart/${cleanTicker}?interval=1d&range=1d`, { headers, signal: AbortSignal.timeout(5000) }),
    fetch(`https://query2.finance.yahoo.com/v10/finance/quoteSummary/${cleanTicker}?modules=defaultKeyStatistics,financialData,summaryDetail`, { headers, signal: AbortSignal.timeout(5000) })
  ]);

  let bundle = null;

  try {
    // Parse real-time price quote
    if (quoteRes.status === 'fulfilled' && quoteRes.value.ok) {
      const qData = await quoteRes.value.json();
      const meta = qData.chart?.result?.[0]?.meta;
      if (meta?.regularMarketPrice) {
        bundle = {
          symbol: meta.symbol || cleanTicker,
          name: meta.longName || meta.shortName || cleanTicker,
          price: meta.regularMarketPrice,
          currency: meta.currency || 'USD',
          dayLow: meta.regularMarketDayLow || meta.regularMarketPrice,
          dayHigh: meta.regularMarketDayHigh || meta.regularMarketPrice,
          fiftyTwoWeekLow: meta.fiftyTwoWeekLow || null,
          fiftyTwoWeekHigh: meta.fiftyTwoWeekHigh || null,
          exchange: meta.fullExchangeName || meta.exchangeName || 'Market',
          // Fundamentals (filled in below if available)
          marketCapB: null,
          eps: null,
          bookValuePerShare: null,
          peRatio: null,
          forwardPE: null,
          pegRatio: null,
          priceToBook: null,
          roe: null,
          roic: null,
          grossMarginPct: null,
          operatingMarginPct: null,
          totalDebtB: null,
          totalCashB: null,
          fcfB: null,
          ebitdaB: null,
          revenueB: null,
          revenueGrowthPct: null,
          // Computed deterministic valuation metrics
          grahamNumber: null,
          fcfYieldPct: null,
          evEbit: null,
          debtToEquity: null,
        };
      }
    }

    // Parse fundamental summary data
    if (bundle && summaryRes.status === 'fulfilled' && summaryRes.value.ok) {
      const sData = await summaryRes.value.json();
      const ks = sData.quoteSummary?.result?.[0]?.defaultKeyStatistics || {};
      const fd = sData.quoteSummary?.result?.[0]?.financialData || {};
      const sd = sData.quoteSummary?.result?.[0]?.summaryDetail || {};

      // Extract raw fundamental values (raw property from Yahoo Finance API)
      const eps = ks.trailingEps?.raw || ks.forwardEps?.raw || null;
      const bvps = ks.bookValue?.raw || null;
      const marketCap = (sd.marketCap?.raw || ks.marketCap?.raw || null);
      const marketCapB = marketCap ? marketCap / 1e9 : null;
      const peRatio = sd.trailingPE?.raw || ks.forwardPE?.raw || null;
      const forwardPE = ks.forwardPE?.raw || null;
      const pegRatio = ks.pegRatio?.raw || null;
      const priceToBook = ks.priceToBook?.raw || null;
      const totalDebt = fd.totalDebt?.raw || null;
      const totalCash = fd.totalCash?.raw || null;
      const fcf = fd.freeCashflow?.raw || null;
      const ebitda = fd.ebitda?.raw || null;
      const revenue = fd.totalRevenue?.raw || null;
      const revenueGrowth = fd.revenueGrowth?.raw || null;
      const grossMargin = fd.grossMargins?.raw || null;
      const operatingMargin = fd.operatingMargins?.raw || null;
      const roe = fd.returnOnEquity?.raw || null;
      const roic = fd.returnOnAssets?.raw || null; // Approximate; ROIC not directly in Yahoo

      bundle.marketCapB = marketCapB;
      bundle.eps = eps;
      bundle.bookValuePerShare = bvps;
      bundle.peRatio = peRatio;
      bundle.forwardPE = forwardPE;
      bundle.pegRatio = pegRatio;
      bundle.priceToBook = priceToBook;
      bundle.roe = roe ? (roe * 100) : null;
      bundle.roic = roic ? (roic * 100) : null;
      bundle.grossMarginPct = grossMargin ? (grossMargin * 100) : null;
      bundle.operatingMarginPct = operatingMargin ? (operatingMargin * 100) : null;
      bundle.totalDebtB = totalDebt ? (totalDebt / 1e9) : null;
      bundle.totalCashB = totalCash ? (totalCash / 1e9) : null;
      bundle.fcfB = fcf ? (fcf / 1e9) : null;
      bundle.ebitdaB = ebitda ? (ebitda / 1e9) : null;
      bundle.revenueB = revenue ? (revenue / 1e9) : null;
      bundle.revenueGrowthPct = revenueGrowth ? (revenueGrowth * 100) : null;

      // =========================================================
      // DETERMINISTIC FINANCIAL FORMULA ENGINE (no LLM arithmetic)
      // =========================================================

      // Graham Number = sqrt(22.5 × EPS × Book Value Per Share)
      if (eps > 0 && bvps > 0) {
        bundle.grahamNumber = Math.sqrt(22.5 * eps * bvps).toFixed(2);
      }

      // FCF Yield = TTM FCF / Enterprise Value × 100
      if (fcf && marketCap && totalDebt && totalCash) {
        const enterpriseValue = marketCap + totalDebt - totalCash;
        if (enterpriseValue > 0) {
          bundle.fcfYieldPct = ((fcf / enterpriseValue) * 100).toFixed(2);
          // EV/EBIT — approximate using EBITDA as proxy if EBIT not directly available
          if (ebitda > 0) {
            bundle.evEbit = (enterpriseValue / ebitda).toFixed(1);
          }
        }
      }

      // Debt/Equity = Total Debt / Total Shareholder Equity
      // Equity ≈ Market Cap / Price-to-Book (i.e. book value of equity)
      if (totalDebt && marketCap && priceToBook && priceToBook > 0) {
        const totalEquity = marketCap / priceToBook;
        bundle.debtToEquity = (totalDebt / totalEquity).toFixed(2);
      }
    }
  } catch (e) {
    // Silently fall through; bundle will have whatever was parsed
  }

  return bundle;
}


export async function onRequestPost(context) {
  const { request, env } = context;
  const url = new URL(request.url);

  // DDoS Mitigation: Verify Client IP & Rate Limit
  const clientIp = request.headers.get('cf-connecting-ip') || 
                   request.headers.get('x-real-ip') || 
                   request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 
                   'global';

  const rateCheck = checkRateLimit(clientIp);
  if (!rateCheck.allowed) {
    return new Response(JSON.stringify({ 
      error: `Rate limit reached. To prevent abuse and protect Gemini API quota, please wait ${rateCheck.retryAfter}s before summoning again.`,
      retryAfter: rateCheck.retryAfter,
      reason: rateCheck.reason
    }), {
      status: 429,
      headers: {
        'Content-Type': 'application/json',
        'Retry-After': String(rateCheck.retryAfter),
        'X-RateLimit-Limit': String(MAX_REQUESTS_PER_MINUTE),
        'X-RateLimit-Remaining': '0',
        'X-RateLimit-Reset': String(rateCheck.retryAfter)
      }
    });
  }

  try {
    // Body size guard: Reject payloads larger than 32KB to prevent payload flooding
    const contentLength = parseInt(request.headers.get('content-length') || '0', 10);
    if (contentLength > 32768) {
      return new Response(JSON.stringify({ error: 'Payload too large (Max 32KB)' }), {
        status: 413,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const body = await request.json();
    const { ticker, sages, instructions, financials, language = 'en', engine = 'auto' } = body;
    const userDirectives = instructions || financials || '';

    if (!ticker || typeof ticker !== 'string' || ticker.trim().length > 20) {
      return new Response(JSON.stringify({ error: 'Valid ticker symbol is required (max 20 characters)' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const isZh = language === 'zh' || language === 'zh-CN' || language === 'zh-TW';

    // Fetch verified live market price + fundamental financial data (Ground Truth)
    const liveData = await fetchMarketDataBundle(ticker);

    // Helper to format a number or return fallback string
    const fmt = (v, decimals = 2, suffix = '') => (v != null && !isNaN(v)) ? `${Number(v).toFixed(decimals)}${suffix}` : 'N/A (use web search)';

    const systemPrompt = `You are the TitanCouncil Coordinator.
Conduct a rigorous multi-perspective stock deliberation on: "${ticker}".
${liveData ? `
================================================================================
VERIFIED FINANCIAL DATA (GROUND TRUTH — DO NOT DEVIATE OR RE-ESTIMATE)
Pre-fetched deterministically from live market APIs before this prompt.
================================================================================
Company: ${liveData.name} (${liveData.symbol})
Exchange / Currency: ${liveData.exchange} / ${liveData.currency}

== PRICE & MARKET ==
Live Price (exact): ${liveData.currency} $${liveData.price.toFixed(2)}
Today's Range: $${liveData.dayLow?.toFixed(2)} – $${liveData.dayHigh?.toFixed(2)}
52-Week Range: ${liveData.fiftyTwoWeekLow ? `$${liveData.fiftyTwoWeekLow.toFixed(2)}` : 'N/A'} – ${liveData.fiftyTwoWeekHigh ? `$${liveData.fiftyTwoWeekHigh.toFixed(2)}` : 'N/A'}
Market Cap: ${liveData.marketCapB ? `$${liveData.marketCapB.toFixed(1)}B` : 'N/A'}

== INCOME & GROWTH ==
TTM Revenue: ${liveData.revenueB ? `$${liveData.revenueB.toFixed(2)}B` : 'N/A'}
Revenue Growth (YoY): ${fmt(liveData.revenueGrowthPct, 1, '%')}
Gross Margin: ${fmt(liveData.grossMarginPct, 1, '%')}
Operating Margin: ${fmt(liveData.operatingMarginPct, 1, '%')}
TTM FCF: ${liveData.fcfB ? `$${liveData.fcfB.toFixed(2)}B` : 'N/A'}
EBITDA: ${liveData.ebitdaB ? `$${liveData.ebitdaB.toFixed(2)}B` : 'N/A'}

== VALUATION MULTIPLES ==
P/E Ratio (TTM): ${fmt(liveData.peRatio, 1, 'x')}
Forward P/E: ${fmt(liveData.forwardPE, 1, 'x')}
PEG Ratio: ${fmt(liveData.pegRatio, 2)}
Price/Book: ${fmt(liveData.priceToBook, 2, 'x')}
EPS (TTM): ${fmt(liveData.eps)}
Book Value/Share: ${fmt(liveData.bookValuePerShare)}

== BALANCE SHEET ==
Total Cash: ${liveData.totalCashB ? `$${liveData.totalCashB.toFixed(2)}B` : 'N/A'}
Total Debt: ${liveData.totalDebtB ? `$${liveData.totalDebtB.toFixed(2)}B` : 'N/A'}
Debt/Equity: ${fmt(liveData.debtToEquity)}

== RETURNS ==
ROE: ${fmt(liveData.roe, 1, '%')}
ROA (Proxy for ROIC): ${fmt(liveData.roic, 1, '%')}

== DETERMINISTIC COMPUTED METRICS (calculated in code — not LLM estimates) ==
Graham Number: ${liveData.grahamNumber ? `$${liveData.grahamNumber}` : 'N/A (negative EPS or BVPS)'}
FCF Yield (EV basis): ${fmt(liveData.fcfYieldPct, 2, '%')}
EV/EBITDA: ${fmt(liveData.evEbit, 1, 'x')}

================================================================================
MANDATORY REQUIREMENTS:
1. Set "livePrice": "${liveData.currency} $${liveData.price.toFixed(2)}" in your JSON output.
2. You MUST use the exact price of ${liveData.currency} $${liveData.price.toFixed(2)} for all valuation calculations (Entry Zone, Stop Loss, DCF, Margin of Safety). DO NOT invent or estimate a different price.
3. For each Titan, cite specific figures from the GROUND TRUTH table above in their sourceDataSnippet.
4. HISTORICAL/DECEASED PERSONA GUARDRAIL — For Benjamin Graham (deceased 1976), Charlie Munger (deceased 2023), and Rakesh Jhunjhunwala (deceased 2022): Generate a SIMULATED analytical assessment applying their documented, published investment philosophies and frameworks to the current financial data above. Do NOT present synthetic text as literal historical statements. Prefix their "quote" field with: "Applying [Name]'s framework:"
================================================================================
` : `
Use live market knowledge to retrieve the latest real-time stock price, recent quarterly earnings, revenue growth, operating margin, ROE/ROIC, FCF, and balance sheet figures.
HISTORICAL/DECEASED PERSONA GUARDRAIL — For Benjamin Graham, Charlie Munger, and Rakesh Jhunjhunwala: Generate a simulated analytical assessment applying their published frameworks. Prefix their quote with "Applying [Name]'s framework:".
`}


Sages to consult: ${sages ? sages.join(', ') : 'All 13 Sages (Warren Buffett, Charlie Munger, Benjamin Graham, Peter Lynch, Michael Burry, Cathie Wood, Stanley Druckenmiller, Bill Ackman, Phil Fisher, Nassim Taleb, Mohnish Pabrai, Aswath Damodaran, Rakesh Jhunjhunwala)'}.

User Custom Directives & Considerations: ${userDirectives ? `"${userDirectives}"` : 'None. Perform standard multi-perspective deliberation.'}.
${userDirectives ? 'MANDATORY: Every Titan and the Portfolio Manager MUST explicitly address, evaluate, and factor these user considerations (e.g. specific risk scenarios, tariffs, holding horizons, or growth assumptions) into their reasoning and Chain of Thought.' : ''}

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
  "provenanceSummary": "Live Analysis Grounded in Financial Data",
  "sources": [
    "Market Data Feeds",
    "SEC EDGAR 10-K / 10-Q Filings",
    "SEDAR+ Regulatory Disclosures",
    "NYU Stern Corporate Valuation Database"
  ],
  "verdicts": [
    {
      "titanId": "buffett",
      "sageName": "Warren Buffett",
      "signal": "BULLISH" | "BEARISH" | "NEUTRAL",
      "confidence": 85,
      "sourceName": "SEC EDGAR 10-K (Owner Earnings & ROE)",
      "sourceDataSnippet": "Actual numbers quoted",
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
    "action": "ACCUMULATE ON DIPS" | "STRONG BUY" | "HOLD" | "HEDGE & REDUCE" | "AVOID",
    "conviction": "HIGH" | "MEDIUM" | "LOW",
    "timeHorizon": "2-4 Years",
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
    const deepseekKey = env.DEEPSEEK_API_KEY || (typeof DEEPSEEK_API_KEY !== 'undefined' ? DEEPSEEK_API_KEY : null);

    if (!geminiKey && !deepseekKey) {
      return new Response(JSON.stringify({
        error: 'No AI API Key configured. Please set GEMINI_API_KEY or DEEPSEEK_API_KEY in Cloudflare Pages Environment Variables.'
      }), {
        status: 503,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    let parsedJson = null;

    // ==========================================
    // 1. DeepSeek Engine Execution (Streaming Thinking Mode)
    // ==========================================
    async function executeDeepSeek(onChunk) {
      if (!deepseekKey) throw new Error('DEEPSEEK_API_KEY not configured in Cloudflare Environment Variables.');
      
      const candidateConfigs = [
        // 1. DeepSeek V4 Flash (with streaming & 8192 token window)
        {
          model: 'deepseek-v4-flash',
          body: {
            model: 'deepseek-v4-flash',
            messages: [
              { role: 'system', content: systemPrompt },
              { role: 'user', content: `Execute deep thinking and rigorous investment deliberation for ${ticker}. Respond ONLY in valid JSON matching schema.` }
            ],
            response_format: { type: 'json_object' },
            stream: true,
            temperature: 0.3,
            max_tokens: 8192
          }
        },
        // 2. DeepSeek Reasoner (R1 Thinking Model: streaming & 8192 token window)
        // Note: R1 uses its own CoT temperature internally; temperature param here is advisory
        {
          model: 'deepseek-reasoner',
          body: {
            model: 'deepseek-reasoner',
            messages: [
              { role: 'system', content: systemPrompt },
              { role: 'user', content: `Execute deep thinking and rigorous investment deliberation for ${ticker}. Respond ONLY in valid JSON matching schema.` }
            ],
            response_format: { type: 'json_object' },
            stream: true,
            temperature: 0.3,
            max_tokens: 8192
          }
        },
        // 3. DeepSeek Chat (V3 Standard: streaming & 8192 token window)
        {
          model: 'deepseek-chat',
          body: {
            model: 'deepseek-chat',
            messages: [
              { role: 'system', content: systemPrompt },
              { role: 'user', content: `Execute detailed investment deliberation for ${ticker}. Respond ONLY in valid JSON matching schema.` }
            ],
            response_format: { type: 'json_object' },
            stream: true,
            temperature: 0.3,
            max_tokens: 8192
          }
        }
      ];


      let lastDeepSeekError = '';

      for (const config of candidateConfigs) {
        try {
          const res = await fetch('https://api.deepseek.com/chat/completions', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${deepseekKey}`
            },
            body: JSON.stringify(config.body)
          });

          if (res.ok) {
            let fullContent = '';
            let fullReasoning = '';
            const reader = res.body.getReader();
            const decoder = new TextDecoder();
            let buffer = '';

            while (true) {
              const { done, value } = await reader.read();
              if (done) break;
              buffer += decoder.decode(value, { stream: true });
              const lines = buffer.split('\n');
              buffer = lines.pop() || '';

              for (const line of lines) {
                const trimmed = line.trim();
                if (!trimmed || !trimmed.startsWith('data:')) continue;
                const dataStr = trimmed.slice(5).trim();
                if (dataStr === '[DONE]') continue;
                try {
                  const parsed = JSON.parse(dataStr);
                  const delta = parsed.choices?.[0]?.delta || {};
                  if (delta.reasoning_content) {
                    fullReasoning += delta.reasoning_content;
                    if (onChunk) onChunk({ type: 'thinking', chunk: delta.reasoning_content, totalThinking: fullReasoning, model: config.model });
                  }
                  if (delta.content) {
                    fullContent += delta.content;
                    if (onChunk) onChunk({ type: 'content', chunk: delta.content, model: config.model });
                  }
                } catch (pe) {}
              }
            }

            const cleaned = fullContent.replace(/```json\s*/i, '').replace(/```\s*$/, '').trim();
            // Resilient JSON extraction: find outermost { ... } object
            const jsonMatch = cleaned.match(/\{[\s\S]*\}/);
            if (!jsonMatch) throw new Error('No valid JSON object found in DeepSeek response');
            const json = JSON.parse(jsonMatch[0]);
            json.thinkingContent = fullReasoning;
            json.thinkingMode = Boolean(fullReasoning) || (config.model === 'deepseek-reasoner');
            json.modelUsed = config.model;
            json.engine = 'deepseek';
            return json;
          } else {
            const errText = await res.text();
            lastDeepSeekError = `[${res.status}] ${errText}`;
          }
        } catch (e) {
          lastDeepSeekError = e.message;
        }
      }

      throw new Error(`DeepSeek API error: ${lastDeepSeekError || 'Failed to communicate with DeepSeek endpoint'}`);
    }

    // ==========================================
    // 2. Google Gemini Engine Execution (Gemini 3.7 Thinking Mode)
    // ==========================================
    async function executeGemini(onChunk) {
      if (!geminiKey) throw new Error('GEMINI_API_KEY not configured');

      const geminiModels = ['gemini-3.7-flash', 'gemini-2.5-flash', 'gemini-2.0-flash'];
      for (const model of geminiModels) {
        const is37 = model.includes('3.7');
        const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${model}:streamGenerateContent?alt=sse&key=${geminiKey}`;

        const generationConfig = {
          temperature: 0.3,
          maxOutputTokens: 8192,
          ...(is37 ? { thinkingConfig: { thinkingBudget: 4096 } } : {})
        };

        try {
          // A. With Search Grounding + Stream
          let res = await fetch(geminiUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              contents: [{ role: "user", parts: [{ text: `${systemPrompt}\n\nExecute deep thinking and live Google search for ${ticker} actual financial figures. Execute deliberation with explicit data snippets and source links. Return strict JSON.` }] }],
              tools: [{ googleSearch: {} }],
              generationConfig
            })
          });

          // B. Fallback to standard stream without search if tool error
          if (!res.ok) {
            res = await fetch(geminiUrl, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                contents: [{ role: "user", parts: [{ text: `${systemPrompt}\n\nExecute deep thinking and detailed deliberation for ${ticker} with actual data snippets and source links. Return strict JSON.` }] }],
                generationConfig: {
                  ...generationConfig,
                  responseMimeType: "application/json"
                }
              })
            });
          }

          if (res.ok) {
            let rawText = '';
            let thoughts = '';
            const reader = res.body.getReader();
            const decoder = new TextDecoder();
            let buffer = '';
            let groundingChunks = [];

            while (true) {
              const { done, value } = await reader.read();
              if (done) break;
              buffer += decoder.decode(value, { stream: true });
              const lines = buffer.split('\n');
              buffer = lines.pop() || '';

              for (const line of lines) {
                const trimmed = line.trim();
                if (!trimmed || !trimmed.startsWith('data:')) continue;
                const dataStr = trimmed.slice(5).trim();
                try {
                  const parsed = JSON.parse(dataStr);
                  const parts = parsed.candidates?.[0]?.content?.parts || [];
                  parts.forEach(part => {
                    if (part.thought) {
                      thoughts += (part.text || '');
                      if (onChunk) onChunk({ type: 'thinking', chunk: part.text, totalThinking: thoughts, model });
                    } else if (part.text) {
                      rawText += part.text;
                      if (onChunk) onChunk({ type: 'content', chunk: part.text, model });
                    }
                  });
                  if (parsed.candidates?.[0]?.groundingMetadata?.groundingChunks) {
                    groundingChunks = parsed.candidates[0].groundingMetadata.groundingChunks;
                  }
                } catch (pe) {}
              }
            }

            const cleaned = rawText.replace(/```json\s*/i, '').replace(/```\s*$/, '').trim();
            // Resilient JSON extraction: find outermost { ... } object
            const jsonMatch = cleaned.match(/\{[\s\S]*\}/);
            if (!jsonMatch) throw new Error('No valid JSON object found in Gemini response');
            const json = JSON.parse(jsonMatch[0]);
            json.thinkingContent = thoughts;
            json.thinkingMode = is37;
            json.modelUsed = model;
            json.engine = 'gemini';

            const webLinks = [];
            groundingChunks.forEach(chunk => {
              if (chunk.web?.title && chunk.web?.uri) {
                webLinks.push({ title: chunk.web.title, url: chunk.web.uri });
              }
            });
            if (webLinks.length > 0) json.groundingWebLinks = webLinks;
            return json;
          }
        } catch (e) {
          // Continue to next candidate model
        }
      }
      throw new Error('Gemini API calls failed');
    }


    // Check if client requested streaming SSE
    const isStream = url.searchParams.get('stream') === 'true' || request.headers.get('accept')?.includes('text/event-stream');

    if (isStream) {
      const { readable, writable } = new TransformStream();
      const writer = writable.getWriter();
      const encoder = new TextEncoder();

      const sendEvent = (event, data) => {
        const payload = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
        return writer.write(encoder.encode(payload));
      };

      // Execute asynchronously and stream tokens
      (async () => {
        try {
          let finalJson = null;
          const onChunk = (chunkData) => {
            sendEvent('chunk', chunkData);
          };

          if (engine === 'deepseek') {
            finalJson = await executeDeepSeek(onChunk);
          } else if (engine === 'gemini') {
            finalJson = await executeGemini(onChunk);
          } else {
            if (geminiKey) {
              try {
                finalJson = await executeGemini(onChunk);
              } catch (gErr) {
                if (deepseekKey) finalJson = await executeDeepSeek(onChunk);
                else throw gErr;
              }
            } else if (deepseekKey) {
              finalJson = await executeDeepSeek(onChunk);
            }
          }

          if (finalJson) {
            finalJson.isLive = true;
            await sendEvent('complete', finalJson);
          } else {
            await sendEvent('error', { error: 'Deliberation failed' });
          }
        } catch (streamErr) {
          await sendEvent('error', { error: streamErr.message });
        } finally {
          await writer.close();
        }
      })();

      return new Response(readable, {
        headers: {
          'Content-Type': 'text/event-stream',
          'Cache-Control': 'no-cache, no-transform',
          'Connection': 'keep-alive'
        }
      });
    }

    // Non-streaming fallback
    if (engine === 'deepseek') {
      parsedJson = await executeDeepSeek();
    } else if (engine === 'gemini') {
      parsedJson = await executeGemini();
    } else {
      if (geminiKey) {
        try {
          parsedJson = await executeGemini();
        } catch (geminiErr) {
          if (deepseekKey) parsedJson = await executeDeepSeek();
          else throw geminiErr;
        }
      } else if (deepseekKey) {
        parsedJson = await executeDeepSeek();
      }
    }

    if (!parsedJson) {
      return new Response(JSON.stringify({ 
        error: 'AI Deliberation failed across active engines. Please check API keys or retry.' 
      }), {
        status: 503,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    parsedJson.isLive = true;

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

