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

export async function onRequestPost(context) {
  const { request, env } = context;

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

    const systemPrompt = `You are the TitanCouncil Coordinator.
Conduct a rigorous multi-perspective stock deliberation on: "${ticker}".
Use live market knowledge to retrieve the latest real-time stock price, recent quarterly earnings, revenue growth, operating margin, ROE/ROIC, FCF, and balance sheet figures.

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
        // 1. DeepSeek V4 Flash (with streaming)
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
            max_tokens: 4096
          }
        },
        // 2. DeepSeek Reasoner (R1 Thinking Model: streaming)
        {
          model: 'deepseek-reasoner',
          body: {
            model: 'deepseek-reasoner',
            messages: [
              { role: 'system', content: systemPrompt },
              { role: 'user', content: `Execute deep thinking and rigorous investment deliberation for ${ticker}. Respond ONLY in valid JSON matching schema.` }
            ],
            stream: true,
            max_tokens: 8192
          }
        },
        // 3. DeepSeek Chat (V3 Standard: streaming)
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
            temperature: 0.7,
            max_tokens: 4096
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
            const json = JSON.parse(cleaned);
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
          temperature: 0.7,
          ...(is37 ? { thinkingConfig: { thinkingBudget: 2048 } } : {})
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
            const json = JSON.parse(cleaned);
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

