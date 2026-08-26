# 🏛️ TitanCouncil — AI Stock Investment Boardroom

> **Summon 13 legendary investors to analyze any US or Canadian TSE stock — in a sleek, institutional glassmorphic web dashboard with zero setup.**

---

## ✨ Features

- **🏛️ The Council of 13 Titans**: Warren Buffett, Charlie Munger, Benjamin Graham, Peter Lynch, Michael Burry, Cathie Wood, Stanley Druckenmiller, Bill Ackman, Phil Fisher, Nassim Taleb, Mohnish Pabrai, Aswath Damodaran, and Rakesh Jhunjhunwala.
- **🌐 Instant Bilingual Toggle**: One-click English ↔ 简体/繁體中文 switcher across all UI labels, frameworks, and quotes.
- **🍁 Canadian TSE / TSX Support**: Native recognition for Canadian tickers (`$SHOP.TO`, `$RY.TO`, `$TD.TO`, `$CNR.TO`, `$ENB.TO`, `$CSU.TO`, etc.) with CAD currency valuation context.
- **📊 Zero-Command Visual UI**:
  - One-click council filter pills (`All 13 Titans`, `Value Council`, `Growth & Tech`, `Risk & Tail Risk`, `Compare`).
  - Interactive investor avatar halo rings with `BULLISH` (Emerald), `NEUTRAL` (Amber), and `BEARISH` (Crimson) status badges.
  - Speedometer arc gauges for portfolio risk alignment and trade horizon.
  - Conviction score box, trade entry/exit zones, and one-click Markdown / PDF export.
- **📱 100% Mobile & Tablet Optimized**: Fluid touch scrolling trays, responsive single-to-dual column grid, and edge-to-edge display support.
- **☁️ Cloudflare Edge Ready**: Deployable to **Cloudflare Pages** and **Cloudflare Workers AI** with zero backend infrastructure.

---

## 🚀 Quick Start (Local Preview)

Run immediately with zero installation:

```bash
python3 -m http.server 3000 --directory public
```

Open **`http://localhost:3000`** in your browser.

---

## ☁️ Deploy to Cloudflare Pages in 2 Minutes

### Method 1: Cloudflare Dashboard (Recommended)
1. Push this repository to **GitHub**.
2. Log into [Cloudflare Dashboard](https://dash.cloudflare.com/) → **Workers & Pages** → **Create application** → **Pages** → **Connect to Git**.
3. Select this repository.
4. Set build settings:
   - **Framework preset**: `None`
   - **Build output directory**: `public`
5. Click **Save and Deploy**.

*(Optional)* Under **Settings** → **Environment variables**, set `GEMINI_API_KEY`, `OPENAI_API_KEY`, or connect Cloudflare Workers AI (`env.AI`).

---

### Method 2: Deploy via Wrangler CLI

```bash
# 1. Login to your Cloudflare account
npx wrangler login

# 2. Deploy to Cloudflare Pages
npx wrangler pages deploy public --project-name=titancouncil
```

---

## 📁 Repository Structure

```
titancouncil/
├── public/
│   ├── index.html        # Semantic HTML5 dashboard
│   ├── app.css           # Institutional Navy Slate & Sapphire Design System
│   ├── app.js            # Reactive application logic & simulation engine
│   └── sages-data.js     # 13 Sages metadata, bilingual text, & TSE stock database
├── functions/
│   └── api/
│       └── analyze.js    # Cloudflare Pages serverless edge deliberation function
├── skill.md              # Master investor frameworks reference
├── wrangler.toml         # Cloudflare Workers / Pages configuration
├── package.json          # Preview & deployment scripts
└── README.md             # Project documentation
```

---

## ⚖️ Disclaimer

*TitanCouncil is for educational and research purposes only. It does not constitute financial or investment advice. Always perform your own due diligence.*
