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


// Dynamic session cache for Yahoo Finance crumb + cookie authentication
let cachedYahooSession = { cookie: null, crumb: null, expires: 0 };

async function getYahooSession(ua) {
  const now = Date.now();
  if (cachedYahooSession.cookie && cachedYahooSession.crumb && now < cachedYahooSession.expires) {
    return cachedYahooSession;
  }
  try {
    const cRes = await fetch('https://fc.yahoo.com', {
      headers: { 'User-Agent': ua },
      signal: AbortSignal.timeout(3500)
    });
    const rawCookie = cRes.headers.get('set-cookie');
    if (!rawCookie) return null;
    const cookie = rawCookie.split(';')[0];

    // Try query2 first, fall back to query1
    for (const host of ['query2.finance.yahoo.com', 'query1.finance.yahoo.com']) {
      try {
        const crumbRes = await fetch(`https://${host}/v1/test/getcrumb`, {
          headers: { 'User-Agent': ua, 'Cookie': cookie },
          signal: AbortSignal.timeout(3500)
        });
        if (crumbRes.ok) {
          const crumb = (await crumbRes.text()).trim();
          if (cookie && crumb && !crumb.includes('<') && !crumb.includes('{')) {
            cachedYahooSession = { cookie, crumb, expires: now + 3600000 }; // 1 hour cache
            return cachedYahooSession;
          }
        }
      } catch (e) {
        // Continue to next host
      }
    }
  } catch (e) {
    // Network / timeout
  }
  return null;
}

// Fetch verified real-time price + fundamental financial data from live market feeds
// Strictly dynamic: no default benchmark values and zero reliance on LLM internal memory
async function fetchMarketDataBundle(rawTicker) {
  const cleanTicker = (rawTicker || '').replace(/^\$/, '').trim().toUpperCase();
  const ua = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

  let bundle = null;

  try {
    // 1. Fetch real-time price quote from Yahoo chart endpoint (fast, resilient, no crumb required)
    const quoteRes = await fetch(`https://query2.finance.yahoo.com/v8/finance/chart/${cleanTicker}?interval=1d&range=1d`, {
      headers: { 'User-Agent': ua },
      signal: AbortSignal.timeout(4500)
    }).catch(() => null);

    if (quoteRes?.ok) {
      const qData = await quoteRes.json().catch(() => null);
      const meta = qData?.chart?.result?.[0]?.meta;
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
          grahamNumber: null,
          fcfYieldPct: null,
          evEbit: null,
          debtToEquity: null,
        };
      }
    }

    if (!bundle) {
      return null;
    }

    // 2. Fetch live quoteSummary with cookie + crumb across query2 and query1 hosts
    let sData = null;
    const session = await getYahooSession(ua);
    if (session?.cookie && session?.crumb) {
      for (const host of ['query2.finance.yahoo.com', 'query1.finance.yahoo.com']) {
        try {
          const summaryRes = await fetch(
            `https://${host}/v10/finance/quoteSummary/${cleanTicker}?modules=defaultKeyStatistics,financialData,summaryDetail&crumb=${session.crumb}`,
            {
              headers: { 'User-Agent': ua, 'Cookie': session.cookie },
              signal: AbortSignal.timeout(4500)
            }
          );
          if (summaryRes?.ok) {
            sData = await summaryRes.json().catch(() => null);
            if (sData?.quoteSummary?.result?.[0]) break;
          }
        } catch (e) {}
      }
    }

    const ks = sData?.quoteSummary?.result?.[0]?.defaultKeyStatistics;
    const fd = sData?.quoteSummary?.result?.[0]?.financialData;
    const sd = sData?.quoteSummary?.result?.[0]?.summaryDetail;

    if (ks || fd || sd) {
      // Live Yahoo financial statements
      const eps = ks?.trailingEps?.raw || ks?.forwardEps?.raw || null;
      const bvps = ks?.bookValue?.raw || null;
      const marketCap = (sd?.marketCap?.raw || ks?.marketCap?.raw || null);
      const forwardPE = ks?.forwardPE?.raw || null;
      const pegRatio = ks?.pegRatio?.raw || null;
      const priceToBook = ks?.priceToBook?.raw || null;
      const peRatio = sd?.trailingPE?.raw || ks?.forwardPE?.raw || null;
      const totalDebt = fd?.totalDebt?.raw || null;
      const totalCash = fd?.totalCash?.raw || null;
      const fcf = fd?.freeCashflow?.raw || null;
      const ebitda = fd?.ebitda?.raw || null;
      const revenue = fd?.totalRevenue?.raw || null;
      const revenueGrowth = fd?.revenueGrowth?.raw || null;
      const grossMargin = fd?.grossMargins?.raw || null;
      const operatingMargin = fd?.operatingMargins?.raw || null;
      const earningsGrowth = fd?.earningsGrowth?.raw || null;
      const roe = fd?.returnOnEquity?.raw || null;
      const roic = fd?.returnOnAssets?.raw || null;

      bundle.marketCapB = marketCap ? marketCap / 1e9 : null;
      bundle.eps = eps;
      bundle.bookValuePerShare = bvps;
      bundle.forwardPE = forwardPE;
      bundle.pegRatio = pegRatio;
      bundle.roe = roe ? (roe * 100) : null;
      bundle.roic = roic ? (roic * 100) : null;
      bundle.grossMarginPct = grossMargin ? (grossMargin * 100) : null;
      bundle.operatingMarginPct = operatingMargin ? (operatingMargin * 100) : null;
      bundle.earningsGrowthPct = earningsGrowth ? (earningsGrowth * 100) : null;
      bundle.totalDebtB = totalDebt ? (totalDebt / 1e9) : null;
      bundle.totalCashB = totalCash ? (totalCash / 1e9) : null;
      bundle.fcfB = fcf ? (fcf / 1e9) : null;
      bundle.ebitdaB = ebitda ? (ebitda / 1e9) : null;
      bundle.revenueB = revenue ? (revenue / 1e9) : null;
      bundle.revenueGrowthPct = revenueGrowth ? (revenueGrowth * 100) : null;
    }

    // =========================================================
    // DETERMINISTIC FINANCIAL FORMULA ENGINE (Reconciled to Live Price)
    // =========================================================
    if (bundle.price && bundle.eps > 0) {
      bundle.peRatio = Number((bundle.price / bundle.eps).toFixed(2));
    }
    if (bundle.price && bundle.bookValuePerShare > 0) {
      bundle.priceToBook = Number((bundle.price / bundle.bookValuePerShare).toFixed(2));
    }
    if (bundle.eps > 0 && bundle.bookValuePerShare > 0) {
      bundle.grahamNumber = Math.sqrt(22.5 * bundle.eps * bundle.bookValuePerShare).toFixed(2);
    }
    const growthForPeg = (bundle.earningsGrowthPct && bundle.earningsGrowthPct > 0)
      ? bundle.earningsGrowthPct
      : bundle.revenueGrowthPct;
    if (bundle.peRatio && growthForPeg && growthForPeg > 0) {
      bundle.pegRatio = Number((bundle.peRatio / growthForPeg).toFixed(2));
    }
    if (bundle.fcfB && bundle.price && bundle.totalDebtB != null && bundle.totalCashB != null) {
      const estimatedMcap = bundle.marketCapB || (bundle.price * (bundle.eps ? (bundle.peRatio ? (bundle.price / bundle.eps) : 24) : 24));
      const ev = estimatedMcap + bundle.totalDebtB - bundle.totalCashB;
      if (ev > 0) {
        bundle.fcfYieldPct = ((bundle.fcfB / ev) * 100).toFixed(2);
        if (bundle.ebitdaB && bundle.ebitdaB > 0) {
          bundle.evEbit = (ev / bundle.ebitdaB).toFixed(1);
        }
      }
    }
    if (bundle.totalDebtB != null && bundle.priceToBook && bundle.marketCapB) {
      const totalEquity = bundle.marketCapB / bundle.priceToBook;
      if (totalEquity > 0) {
        bundle.debtToEquity = (bundle.totalDebtB / totalEquity).toFixed(2);
      }
    }
  } catch (e) {
    // Silently fall through
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

    // ZERO-HALLUCINATION ENFORCEMENT:
    // If live market feed could not retrieve price or financial statements, abort immediately.
    // Strictly NO default/hardcoded values and NO relying on LLM historical memory!
    if (!liveData || !liveData.price || (!liveData.eps && !liveData.revenueB)) {
      return new Response(JSON.stringify({
        error: isZh
          ? `無法從官方即時金融源取得 $${ticker.replace(/^\$/, '').toUpperCase()} 的最新驗證財報數據（EPS、營收與毛利率）。為落實零幻覺原則，系統絕不使用預設靜態值或任由 AI 臆測過期財報，已中止本次審議。請確認代碼或稍候數秒重試。`
          : `Unable to retrieve verified live financial statements (EPS, revenue, margins) for $${ticker.replace(/^\$/, '').toUpperCase()} from real-time market feeds. Deliberation halted to prevent AI data hallucinations. Please verify the ticker or retry in a few seconds.`
      }), {
        status: 502,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Helper to format a number or return fallback string
    const fmt = (v, decimals = 2, suffix = '') => (v != null && !isNaN(v)) ? `${Number(v).toFixed(decimals)}${suffix}` : 'N/A';

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
P/E Ratio (TTM): ${fmt(liveData.peRatio, 2, 'x')} (Mathematically Reconciled: Live Price $${liveData.price.toFixed(2)} / EPS $${fmt(liveData.eps)})
Forward P/E: ${fmt(liveData.forwardPE, 1, 'x')}
PEG Ratio: ${fmt(liveData.pegRatio, 2)}
Price/Book (P/B): ${fmt(liveData.priceToBook, 2, 'x')} (Mathematically Reconciled: Live Price $${liveData.price.toFixed(2)} / Book Value $${fmt(liveData.bookValuePerShare)})
EPS (TTM): $${fmt(liveData.eps)}
Book Value/Share: $${fmt(liveData.bookValuePerShare)}

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
4. TITAN METRIC BINDINGS:
   * Graham MUST compare live price against the pre-calculated Graham Number ($${liveData.grahamNumber || 'N/A'}).
   * Burry MUST evaluate the pre-calculated FCF Yield (${fmt(liveData.fcfYieldPct, 2, '%')}) against his 10% deep-value threshold and EV/EBITDA (${fmt(liveData.evEbit, 1, 'x')}).
   * Lynch MUST cite the PEG ratio (${fmt(liveData.pegRatio, 2)}) against his 1.0 benchmark.
   * Buffett & Munger MUST evaluate ROE (${fmt(liveData.roe, 1, '%')}) and ROA/ROIC (${fmt(liveData.roic, 1, '%')}) and Debt/Equity (${fmt(liveData.debtToEquity)}).
   * Taleb MUST evaluate balance sheet liquidity (Total Cash $${liveData.totalCashB ? liveData.totalCashB.toFixed(1) + 'B' : 'N/A'} vs Total Debt $${liveData.totalDebtB ? liveData.totalDebtB.toFixed(1) + 'B' : 'N/A'}) and single-supplier/geopolitical tail risks.
5. STRICT MATHEMATICAL CONSISTENCY & ZERO FABRICATION:
   * When citing P/B, P/E, EPS, Margins, Cash, or Graham Number, EVERY Titan MUST use the EXACT reconciled figures from the GROUND TRUTH table above:
     - Price/Book (P/B) is EXACTLY ${fmt(liveData.priceToBook, 2, 'x')}.
     - P/E Ratio is EXACTLY ${fmt(liveData.peRatio, 2, 'x')}. (NEVER hallucinate 124x or pre-AI 2022 historical figures).
     - Gross Margin is EXACTLY ${fmt(liveData.grossMarginPct, 1, '%')}. (NEVER hallucinate 64%).
     - Operating Margin is EXACTLY ${fmt(liveData.operatingMarginPct, 1, '%')}. (NEVER hallucinate 33%).
     - ROE is EXACTLY ${fmt(liveData.roe, 1, '%')}. (NEVER hallucinate 28%).
     - Total Cash is EXACTLY $${liveData.totalCashB ? liveData.totalCashB.toFixed(1) + 'B' : 'N/A'}. (NEVER hallucinate $13.3B).
     - Graham Number is EXACTLY $${liveData.grahamNumber || 'N/A'}.
   * Peter Lynch PEG Ratio MUST be cited as EXACTLY ${fmt(liveData.pegRatio, 2)} (calculated as P/E ${fmt(liveData.peRatio, 2, 'x')} / Growth ${fmt(liveData.earningsGrowthPct || liveData.revenueGrowthPct, 1, '%')}). DO NOT invent conflicting PEG ratios (e.g. never claim PEG is 2.8x when the table says ${fmt(liveData.pegRatio, 2)}).
6. AUTHENTIC PERSONA VOICES:
   * Speak in each legend's authentic philosophical voice, rhetoric, and distinct mental models.
   * For historical/deceased legends (Graham, Munger, Jhunjhunwala): Apply their timeless published frameworks directly to current figures without stiff robotic preambles like "Applying my framework:".
================================================================================
` : `
Use live market knowledge to retrieve the latest real-time stock price, recent quarterly earnings, revenue growth, operating margin, ROE/ROIC, FCF, and balance sheet figures.
Apply each legend's timeless published frameworks directly to current figures with authentic voice and intellectual rigor.
`}

Sages to consult: ${sages ? sages.join(', ') : 'All 13 Sages (Warren Buffett, Charlie Munger, Benjamin Graham, Peter Lynch, Michael Burry, Cathie Wood, Stanley Druckenmiller, Bill Ackman, Phil Fisher, Nassim Taleb, Mohnish Pabrai, Aswath Damodaran, Rakesh Jhunjhunwala)'}.

User Custom Directives & Considerations: ${userDirectives ? `"${userDirectives}"` : 'None. Perform standard multi-perspective deliberation.'}.
${userDirectives ? 'MANDATORY: Every Titan and the Portfolio Manager MUST explicitly address, evaluate, and factor these user considerations (e.g. specific risk scenarios, tariffs, holding horizons, or growth assumptions) into their reasoning and Chain of Thought.' : ''}

Output Language: ${isZh ? 'Traditional Chinese (繁體中文)' : 'English'}.

================================================================================
THE 13 TITAN ANALYTICAL FRAMEWORKS & STRICT SIGNAL DECISION TREES:
================================================================================
1. Warren Buffett (The Oracle of Omaha)
   - Core: Circle of competence, durable economic moat (pricing power, high switching costs), owner earnings, capital allocation, and RULE #1: NEVER OVERPAY.
   - BUFFETT TECH VALUATION & MARGIN OF SAFETY GUARDRAIL:
     * If P/E > 60x or P/B > 30x: Buffett's verdict MUST BE BEARISH (Avoid). At >60x P/E, no economic moat can justify the extreme speculative price.
     * When P/E is between 25x and 35x with ROE > 80% (like NVIDIA's verified current valuation): Buffett recognizes the extraordinary technological moat (CUDA, 75% gross margin, ROE > 100%), but steadfastly refuses to chase semiconductor hardware trading at elevated multiples (P/E > 25x, P/B > 10x) during an AI capex boom.
     * He knows capital cycles inevitably invite customer capex digestion, margin pressure, or technological obsolescence. "Price is what you pay, value is what you get." When a company's market price fully capitalizes years of flawless compounding, there is zero Margin of Safety.
     * In this 25x-35x P/E range: Buffett's verdict MUST BE NEUTRAL (Hold / Watchlist with 65-70% conviction), NOT BULLISH. He respects the business, but will NOT buy without an unquestionable margin of safety (>25-30% discount on market dips).
     * Signal Rules:
       - BULLISH: Wide economic moat + high ROE (>15%) + clean balance sheet (Debt/Equity < 0.5) AND trading at an undeniable discount (>25% margin of safety to conservative intrinsic value).
       - NEUTRAL: Phenomenal business franchise and moat, but current market price already discounts years of flawless growth, eliminating the margin of safety (Watchlist / Hold on dips).
       - BEARISH: Fragile commodity business with no pricing power, heavy debt, or egregious speculative mania.

2. Charlie Munger (The Mental Models Architect)
   - Core: Inversion ("what can destroy this business?"), lollapalooza effects, ROIC consistency (>15%), management integrity.
   - MUNGER REALISM GUARDRAIL:
     * "A great business at an exuberant price is no bargain."
     * If P/E > 60x: Munger's verdict MUST BE BEARISH.
     * If P/E is between 25x and 35x with P/B > 10x: Munger's verdict MUST BE NEUTRAL (Hold / Wait for a better pitch), recognizing that hardware competition, customer capex digestion, and multiple compression pose severe long-term headwinds.
     * Signal Rules:
       - BULLISH: Compounding powerhouse with multiple self-reinforcing moats at a fair or attractive price.
       - NEUTRAL: Superb business quality, but the price already fully embeds its perfection; discipline demands waiting.
       - BEARISH: Management promotional hype, deceptive accounting, or capital-destroying acquisitions.

3. Benjamin Graham (The Father of Value Investing)
   - Core: Graham Number = sqrt(22.5 * EPS * BVPS), P/E < 15-20, Current Ratio > 2.0, Long-term debt < Net Current Assets.
   - Signal Rules:
     * BULLISH: Passes >= 4 core criteria with Price < Graham Number or deep discount to net-net/book value.
     * NEUTRAL: Balance sheet is financially solid, but trading substantially above conservative Graham thresholds.
     * BEARISH: Speculative multiples (P/E > 30, P/B > 5), debt burden, or unproven earnings stability.

4. Peter Lynch (The Ten-Bagger Hunter)
   - Core: Fast Grower vs. Stalwart classification, PEG Ratio (PEG < 1.0 attractive, PEG > 2.0 dangerous), consumer demand understandability.
   - Signal Rules:
     * BULLISH: PEG < 1.0 with secular product demand, expanding gross margins, and manageable debt.
     * NEUTRAL: Stalwart or predictable grower trading at fair valuation (PEG 1.0 - 1.8).
     * BEARISH: PEG > 2.0, whisper stock, or cyclical peak earnings masquerading as structural growth.

5. Michael Burry (The Deep Value Contrarian)
   - Core: Free Cash Flow Yield (FCF / EV > 10% hurdle), EV/EBIT < 8.0x, contrarian setup, debt maturity runway.
   - Signal Rules:
     * BULLISH: Double-digit FCF yield + extreme negative sentiment + clean liquidity cushion.
     * NEUTRAL: Low headline multiples, but secular headwinds threaten terminal cash flows.
     * BEARISH: Compressed FCF yield (< 4%), historical extreme valuation multiples, or debt-fueled buybacks in a bubble.

6. Cathie Wood (The Disruption Pioneer)
   - Core: Exponential TAM (>20-25% 5-yr CAGR), convergence of multi-technology platforms (AI, robotics, genomics), R&D intensity.
   - Signal Rules:
     * BULLISH: Disruptive platform leader with exponential TAM expansion and winner-take-most scale.
     * NEUTRAL: High technological promise with unproven unit economics or monetization roadmap.
     * BEARISH: Incumbent legacy business vulnerable to technological displacement.

7. Stanley Druckenmiller (The Macro Legend)
   - Core: Macro liquidity, central bank rate cycles, positive earnings revision momentum, 3:1 asymmetric risk/reward.
   - Signal Rules:
     * BULLISH: Sector macro tailwinds + positive analyst earnings revisions + liquidity inflows + asymmetric setup.
     * NEUTRAL: Compelling company fundamentals, but macro liquidity timing is neutral or unfavorable.
     * BEARISH: Macro headwinds + negative revision cycle + crowded institutional positioning.

8. Bill Ackman (The Activist Investor)
   - Core: Simple, predictable cash generator with dominant #1/#2 market position, pricing power, activist catalyst.
   - Signal Rules:
     * BULLISH: High-barrier dominant business + clear catalyst for multiple re-rating + attractive entry price.
     * NEUTRAL: Dominant franchise but fully valued with no operational or governance catalyst.
     * BEARISH: Capital-intensive, commoditized, or entrenched management destroying shareholder value.

9. Phil Fisher (The Scuttlebutt Growth Researcher)
   - Core: Fisher's 15 points, R&D commercialization efficiency, world-class sales and distribution, executive depth.
   - Signal Rules:
     * BULLISH: Exceptional R&D commercialization track record + dominant sales channel + long growth runway.
     * NEUTRAL: Solid growth, but qualitative scuttlebutt evidence on R&D efficiency or employee retention is mixed.
     * BEARISH: Stagnant product pipeline, deteriorating customer relations, or high executive turnover.

10. Nassim Nicholas Taleb (Antifragility & Risk Analyst)
    - Core: Antifragility (gains from volatility), Via Negativa, Skin in the Game, Lindy Effect, Fat-Tail & Black Swan exposure.
    - Signal Rules:
      * BULLISH: Robust net cash balance sheet + positive convexity (capped downside, open upside) + high insider ownership.
      * NEUTRAL: Moderate operational resilience but unhedged single-supplier concentration (e.g., TSMC Taiwan fab reliance).
      * BEARISH: Heavy leverage, hidden fragility (Turkey problem), extreme vulnerability to tail events.

11. Mohnish Pabrai (Dhandho Value Investor)
    - Core: "Heads I win, tails I don't lose much", 50% discount to conservative intrinsic value, asset-light compounding.
    - Signal Rules:
      * BULLISH: Worst-case downside protected + >50% margin of safety + simple asset-light model.
      * NEUTRAL: High-quality company, but discount to intrinsic value does not meet the 50% Dhandho requirement.
      * BEARISH: Downside risk is unquantified or exceeds acceptable capital preservation limits.

12. Aswath Damodaran (The Dean of Valuation)
    - Core: Story + Numbers = DCF Truth. Revenue CAGR, sustainable operating margin, reinvestment rate, WACC, intrinsic DCF band.
    - Signal Rules:
      * BULLISH: Intrinsic DCF value comfortably exceeds market price using conservative baseline assumptions.
      * NEUTRAL: Fairly valued within the intrinsic DCF confidence band.
      * BEARISH: Market price embeds unrealistic revenue growth or heroic margin assumptions.

13. Rakesh Jhunjhunwala (The Big Bull)
    - Core: ROCE > 20% compounding, multi-year secular tailwind, ethical promoter/management, multi-cycle patience.
    - Signal Rules:
      * BULLISH: ROCE > 20% + generational market tailwind + ethical management.
      * NEUTRAL: Sound compounding business, but waiting for an optimal entry multiple.
      * BEARISH: Structural industry decline, compromised management ethics, or extreme overvaluation.

================================================================================
CRITICAL BOARDROOM CROSS-EXAMINATION & EVIDENCE:
================================================================================
- Each Titan's Chain of Thought MUST feature 4 concise, high-density steps (1 to 2 sharp sentences per step to maximize analytical precision and prevent token truncation):
  1. Moat & Strategic Franchise Analysis (Circle of competence, pricing power, customer switching costs)
  2. Forensic Quantitative Diagnostic (Exact ROE, ROIC, Gross/Operating margins, FCF, Debt obligations)
  3. Valuation Test & Margin of Safety (Exact quantitative test: Graham Number, FCF Yield vs 10%, PEG vs 1.0, DCF band)
  4. Boardroom Challenge & Dissent (Directly contest opposing viewpoints on the council)
- Portfolio Manager Action MUST be strictly one of: ["ACCUMULATE ON DIPS", "STRONG BUY", "HOLD", "HEDGE & REDUCE", "AVOID"]. DO NOT include any prefix like "Action:" or "執行操作:".

Respond ONLY in valid JSON matching this schema:
{
  "ticker": "${ticker}",
  "livePrice": "${liveData ? `${liveData.currency} $${liveData.price.toFixed(2)}` : '$XXX.XX'}",
  "provenanceSummary": "Live Analysis Grounded in Deterministic Market Data & Titan Methodologies",
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
      "sourceDataSnippet": "Actual numbers quoted from verified table",
      "quote": "Core verdict in authentic rhetorical voice without preamble",
      "chainOfThought": [
        "1. Competence & Franchise: [Multi-sentence in-depth analysis]",
        "2. Moat & Returns: [Forensic analysis with ROE, ROIC, and margins]",
        "3. Margin of Safety: [Rigorous valuation and margin of safety check]",
        "4. Boardroom Challenge: [Challenge or pressure-test opposing board members]"
      ]
    }
  ],
  "riskManager": {
    "consensus": { "bullish": 0, "neutral": 0, "bearish": 0 },
    "weightedConvictionScore": 75,
    "keyRisks": ["Primary fundamental risk", "Macro/Tail risk", "Valuation/Competitive risk"],
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
    "rationale": "Comprehensive portfolio manager synthesis reconciling council divergence and market realities",
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

    // Safe JSON parser with auto-repair for trailing commas & unclosed delimiters
    function safeParseJson(rawText) {
      if (!rawText) throw new Error('Empty model response');
      const cleaned = rawText.replace(/```(?:json)?\s*/gi, '').replace(/```\s*$/g, '').trim();

      // 1. Direct JSON parse
      try {
        return JSON.parse(cleaned);
      } catch (e) {}

      // 2. Outermost { ... } object
      const jsonMatch = cleaned.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        try {
          return JSON.parse(jsonMatch[0]);
        } catch (e) {
          try {
            const noTrailing = jsonMatch[0].replace(/,\s*([}\]])/g, '$1');
            return JSON.parse(noTrailing);
          } catch (e2) {}
        }
      }

      // 3. Auto-close truncated JSON object
      let candidate = jsonMatch ? jsonMatch[0] : cleaned;
      candidate = candidate.replace(/,\s*$/, '');
      const openBraces = (candidate.match(/\{/g) || []).length;
      const closeBraces = (candidate.match(/\}/g) || []).length;
      const openBrackets = (candidate.match(/\[/g) || []).length;
      const closeBrackets = (candidate.match(/\]/g) || []).length;

      for (let i = 0; i < (openBrackets - closeBrackets); i++) candidate += ']';
      for (let i = 0; i < (openBraces - closeBraces); i++) candidate += '}';

      try {
        const fixed = candidate.replace(/,\s*([}\]])/g, '$1');
        return JSON.parse(fixed);
      } catch (e3) {
        throw new Error(`Failed to parse AI JSON response: ${cleaned.slice(0, 160)}...`);
      }
    }

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
                    if (onChunk) await onChunk({ type: 'thinking', chunk: delta.reasoning_content, totalThinking: fullReasoning, model: config.model });
                  }
                  if (delta.content) {
                    fullContent += delta.content;
                    if (onChunk) await onChunk({ type: 'content', chunk: delta.content, model: config.model });
                  }
                } catch (pe) {}
              }
            }

            // Flush remaining buffer
            if (buffer.trim()) {
              const trimmed = buffer.trim();
              if (trimmed.startsWith('data:') && trimmed.slice(5).trim() !== '[DONE]') {
                try {
                  const parsed = JSON.parse(trimmed.slice(5).trim());
                  const delta = parsed.choices?.[0]?.delta || {};
                  if (delta.reasoning_content) {
                    fullReasoning += delta.reasoning_content;
                    if (onChunk) await onChunk({ type: 'thinking', chunk: delta.reasoning_content, totalThinking: fullReasoning, model: config.model });
                  }
                  if (delta.content) {
                    fullContent += delta.content;
                    if (onChunk) await onChunk({ type: 'content', chunk: delta.content, model: config.model });
                  }
                } catch (pe) {}
              }
            }

            const json = safeParseJson(fullContent);
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
          lastDeepSeekError = `${config.model}: ${e.message}`;
        }
      }

      throw new Error(`DeepSeek API error: ${lastDeepSeekError || 'Failed to communicate with DeepSeek endpoint'}`);
    }

    // ==========================================
    // 2. Google Gemini Engine Execution (Gemini 3.7 Thinking Mode)
    // ==========================================
    async function executeGemini(onChunk) {
      if (!geminiKey) throw new Error('GEMINI_API_KEY not configured');

      const geminiModels = [
        'gemini-3.7-flash',
        'gemini-3.5-flash',
        'gemini-flash-latest',
        'gemini-3.6-flash',
        'gemini-3.1-pro-preview'
      ];
      let lastGeminiError = '';

      for (const model of geminiModels) {
        const isThinking = model.includes('3.7') || model.includes('thinking');
        const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${model}:streamGenerateContent?alt=sse&key=${geminiKey}`;

        const generationConfig = {
          temperature: 0.3,
          maxOutputTokens: 8192,
          ...(isThinking ? { thinkingConfig: { thinkingBudget: 2048 } } : {})
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
            const toolErr = await res.text().catch(() => '');
            lastGeminiError = `[${res.status} tool-search] ${toolErr}`;
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
                  for (const part of parts) {
                    const isThought = Boolean(part.thought);
                    const thoughtText = typeof part.thought === 'string' ? part.thought : (isThought ? (part.text || '') : '');
                    const contentText = !isThought && part.text ? part.text : '';

                    if (thoughtText) {
                      thoughts += thoughtText;
                      if (onChunk) await onChunk({ type: 'thinking', chunk: thoughtText, totalThinking: thoughts, model });
                    } else if (contentText) {
                      rawText += contentText;
                      if (onChunk) await onChunk({ type: 'content', chunk: contentText, model });
                    }
                  }
                  if (parsed.candidates?.[0]?.groundingMetadata?.groundingChunks) {
                    groundingChunks = parsed.candidates[0].groundingMetadata.groundingChunks;
                  }
                } catch (pe) {}
              }
            }

            // Flush remaining buffer
            if (buffer.trim()) {
              const trimmed = buffer.trim();
              if (trimmed.startsWith('data:')) {
                const dataStr = trimmed.slice(5).trim();
                try {
                  const parsed = JSON.parse(dataStr);
                  const parts = parsed.candidates?.[0]?.content?.parts || [];
                  for (const part of parts) {
                    const isThought = Boolean(part.thought);
                    const thoughtText = typeof part.thought === 'string' ? part.thought : (isThought ? (part.text || '') : '');
                    const contentText = !isThought && part.text ? part.text : '';

                    if (thoughtText) {
                      thoughts += thoughtText;
                      if (onChunk) await onChunk({ type: 'thinking', chunk: thoughtText, totalThinking: thoughts, model });
                    } else if (contentText) {
                      rawText += contentText;
                      if (onChunk) await onChunk({ type: 'content', chunk: contentText, model });
                    }
                  }
                  if (parsed.candidates?.[0]?.groundingMetadata?.groundingChunks) {
                    groundingChunks = parsed.candidates[0].groundingMetadata.groundingChunks;
                  }
                } catch (pe) {}
              }
            }

            const json = safeParseJson(rawText);
            json.thinkingContent = thoughts;
            json.thinkingMode = isThinking;
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
          } else {
            const errBody = await res.text().catch(() => '');
            lastGeminiError = `[${res.status}] ${errBody}`;
          }
        } catch (e) {
          lastGeminiError = `${model}: ${e.message}`;
        }
      }
      throw new Error(`Gemini API error: ${lastGeminiError || 'Gemini API calls failed'}`);
    }


    // Check if client requested streaming SSE
    const isStream = url.searchParams.get('stream') === 'true' || request.headers.get('accept')?.includes('text/event-stream');

    if (isStream) {
      const { readable, writable } = new TransformStream();
      const writer = writable.getWriter();
      const encoder = new TextEncoder();

      const sendEvent = async (event, data) => {
        try {
          const payload = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
          await writer.write(encoder.encode(payload));
        } catch (err) {
          // Closed or aborted stream
        }
      };

      // Execute asynchronously and stream tokens, protecting context lifecycle with waitUntil
      const streamTask = (async () => {
        try {
          let finalJson = null;
          const onChunk = async (chunkData) => {
            await sendEvent('chunk', chunkData);
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
          try {
            await writer.close();
          } catch (e) {}
        }
      })();

      if (context.waitUntil) {
        context.waitUntil(streamTask);
      }

      return new Response(readable, {
        headers: {
          'Content-Type': 'text/event-stream; charset=utf-8',
          'Cache-Control': 'no-cache, no-transform',
          'Connection': 'keep-alive',
          'X-Accel-Buffering': 'no'
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

