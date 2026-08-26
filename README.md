# 🏛️ TitanCouncil — The AI Stock Investment Boardroom

> **Summon 13 legendary investors to analyze any US or Canadian TSE stock — in a sleek, institutional glassmorphic web dashboard deployed on Cloudflare Pages.**

---

## ✨ Features

- **🏛️ The Council of 13 Titans**: Warren Buffett, Charlie Munger, Benjamin Graham, Peter Lynch, Michael Burry, Cathie Wood, Stanley Druckenmiller, Bill Ackman, Phil Fisher, Nassim Taleb, Mohnish Pabrai, Aswath Damodaran, and Rakesh Jhunjhunwala.
- **🍁 Canadian TSE / TSX Market Intelligence**: Native support for Toronto Stock Exchange tickers (`$SHOP.TO`, `$RY.TO`, `$TD.TO`, `$CNR.TO`, `$ENB.TO`, `$CSU.TO`, `$BAM.TO`, etc.) with CAD currency calculations, banking oligopoly moats, and software/energy valuation frameworks.
- **🌐 Instant Bilingual Toggle**: One-click English ↔ 简体/繁體中文 switcher across all UI labels, frameworks, and quotes.
- **🎯 Dual Filter Control**:
  - **Visual 1-Click Pills**: `⊞ All 13 Titans`, `💲 Value Council`, `📈 Growth & Tech`, `📉 Risk & Tail Risk`, `⇄ Compare`.
  - **Typed Search Commands**: Type flags like `NVDA --value`, `SHOP.TO --growth`, `RY.TO @buffett @taleb`, or `/council AAPL --all` directly into the search capsule.
  - **Interactive Guide (💡)**: Built-in command cheat sheet modal.
- **📊 Institutional Glassmorphic Dashboard**:
  - Dual speedometer arc gauges for **Portfolio Risk Alignment** and **Trade Horizon**.
  - Animated halo rings around titan avatars with glowing status badges (`BULLISH`, `NEUTRAL`, `BEARISH`).
  - Conviction score box, trade entry/exit zones, stop loss, and one-click Markdown & PDF export.
  - Collapsible **Financials Drawer** to paste raw earnings, 10-K snippets, and multiples.
- **📱 100% Mobile & Tablet Responsive**: Touch-friendly horizontal swipe trays and responsive grid layouts.
- **☁️ Cloudflare Pages Serverless Edge Worker**: Structured JSON engine with zero backend infrastructure.

---

## 👥 The 13 Titans & Core Philosophies

| Titan | Persona / Specialty | Key Framework & Metrics |
|---|---|---|
| **Warren Buffett** | The Oracle of Omaha | Circle of competence, durable moat, ROE > 15%, low debt, margin of safety > 25%. |
| **Charlie Munger** | Mental Models Architect | Inversion ("what kills it?"), lollapalooza effects, ROIC > 15%, pricing power. |
| **Benjamin Graham** | Father of Value Investing | Graham Number, Net-Net / NCAV, P/E < 15, current ratio > 2.0, liquidation margin. |
| **Peter Lynch** | Ten-Bagger Hunter | PEG < 1.0, business understandability, category (Fast Grower/Stalwart), low debt. |
| **Michael Burry** | Deep Value Contrarian | FCF yield > 10%, EV/EBIT < 8.0, net debt/equity < 50%, contrarian sentiment. |
| **Cathie Wood** | Disruption Pioneer | Exponential TAM growth, 5-yr CAGR > 25%, platform & network effects. |
| **Stanley Druckenmiller** | Global Macro Legend | Macro tailwinds, earnings revision momentum, asymmetric payoff (3:1). |
| **Bill Ackman** | Activist Value Investor | Simple business (#1 or #2 player), activist catalyst, strong predictable FCF. |
| **Phil Fisher** | Scuttlebutt Growth | 15-point scuttlebutt, R&D effectiveness, sales organization, management depth. |
| **Nassim Taleb** | Antifragility & Fat Tails | Antifragility, convexity, via negativa (avoid leverage), skin in the game, Lindy effect. |
| **Mohnish Pabrai** | Dhandho Value Investor | Downside protection first, margin of safety > 50%, asset-light, cloning winners. |
| **Aswath Damodaran** | Dean of Valuation | Story + Numbers = DCF Truth, revenue CAGR, sustainable margins, WACC. |
| **Rakesh Jhunjhunwala** | The Big Bull | Multi-year compounding, ROCE > 20%, secular macro tailwinds, patient conviction. |

---

## 🔍 Search Commands & Filter Syntax

You can summon specific sub-councils or individual titans directly via the search capsule:

```bash
# Preset Council Filters
NVDA --value               # Consults Value Council (Buffett, Munger, Graham, Pabrai, Burry)
SHOP.TO --growth           # Consults Growth & Tech (Lynch, Wood, Druckenmiller, Fisher)
RY.TO --risk               # Consults Risk & Valuation (Taleb, Damodaran)
AAPL --all                 # Consults all 13 Titans

# Specific @Mentions
NVDA @buffett @taleb       # Consults only Warren Buffett and Nassim Taleb
CSU.TO @munger @burry @wood# Consults only Munger, Burry, and Cathie Wood

# Comparison Mode
compare NVDA SHOP.TO       # Side-by-side comparative deliberation
```

---

## 🚀 Quick Start (Local Preview)

Run immediately with zero build tools:

```bash
cd titancouncil
python3 -m http.server 3000 --directory public
```

Open **`http://localhost:3000`** in your browser.

---

## ☁️ Deploy to Cloudflare Pages in 2 Minutes

### Method 1: Cloudflare Dashboard (Recommended)

1. Push this repository to **GitHub**.
2. Log into [Cloudflare Dashboard](https://dash.cloudflare.com/) → **Workers & Pages** → **Create application** → **Pages** → **Connect to Git**.
3. Select your repository.
4. Set build settings:
   - **Framework preset**: `None`
   - **Build command**: *(Leave blank)*
   - **Build output directory**: `public`
   - **Root directory**: `/` *(or leave blank)*
5. Configure Environment Variables under **Settings** → **Environment variables**:
   - `GEMINI_API_KEY` (Google Gemini API — Recommended)
   - `OPENAI_API_KEY` (OpenAI GPT-4o / GPT-4o-mini)
   - `ANTHROPIC_API_KEY` (Anthropic Claude 3.5)
6. Click **Save and Deploy**.

*(Note: If no API key is configured, the serverless edge worker seamlessly uses Cloudflare Workers AI or client Demo Mode).*

---

### Method 2: Deploy via Wrangler CLI

```bash
# 1. Login to Cloudflare
npx wrangler login

# 2. Deploy to Cloudflare Pages (bundles public/ and functions/ automatically)
npx wrangler pages deploy public --project-name=titancouncil

# 3. (Optional) Set your API key secret
npx wrangler pages secret put GEMINI_API_KEY --project-name=titancouncil
```

---

## 📁 Repository Structure

```
titancouncil/
├── public/
│   ├── index.html        # Semantic HTML5 dashboard with filter guide modal
│   ├── app.css           # Institutional Navy Slate & Sapphire Design System
│   ├── app.js            # Reactive application logic, command parser & simulation
│   └── sages-data.js     # 13 Titans metadata, bilingual text & TSE stock database
├── functions/
│   └── api/
│       └── analyze.js    # Cloudflare Pages serverless edge worker (JSON schema)
├── skill.md              # Master investor evaluation rules & JSON prompt specification
├── wrangler.toml         # Cloudflare Workers / Pages configuration
├── package.json          # Preview & deployment scripts
├── .gitignore            # Clean git ignore rules
├── LICENSE               # MIT License
└── README.md             # Project documentation
```

---

## ⚖️ Disclaimer

*TitanCouncil is for educational and research purposes only. It does not constitute financial or investment advice. Always perform your own due diligence.*
