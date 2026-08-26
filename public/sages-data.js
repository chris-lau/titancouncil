// TitanCouncil: Sages metadata, philosophies, avatars, bilingual labels, and Canadian TSE support
export const SAGES = [
  {
    id: "buffett",
    name: "Warren Buffett",
    nameZh: "沃伦·巴菲特",
    title: "The Oracle of Omaha",
    titleZh: "奥马哈先知",
    fallbackIcon: "👴🏼",
    category: "value",
    philosophy: "Wonderful companies at fair prices. Hold forever.",
    philosophyZh: "以合理价格买入卓越企业，并长期持有。",
    metrics: ["Circle of Competence", "Durable Moat (ROE > 15%)", "Owner Earnings & FCF", "Debt/Equity < 0.5", "Margin of Safety > 25%"],
    voiceTone: "Patient, folksy, common-sense wisdom."
  },
  {
    id: "munger",
    name: "Charlie Munger",
    nameZh: "查理·芒格",
    title: "The Architect of Mental Models",
    titleZh: "多元思维模型大师",
    fallbackIcon: "👓",
    category: "value",
    philosophy: "Invert, always invert. Wonderful businesses at fair prices.",
    philosophyZh: "反过来想，总是反过来想。寻找具备定价权的伟大企业。",
    metrics: ["Inversion (What kills it?)", "Lollapalooza Effects", "ROIC > 15%", "Pricing Power", "Management Integrity"],
    voiceTone: "Blunt, erudite, multi-disciplinary."
  },
  {
    id: "graham",
    name: "Benjamin Graham",
    nameZh: "本杰明·格雷厄姆",
    title: "The Godfather of Value Investing",
    titleZh: "价值投资之父",
    fallbackIcon: "📜",
    category: "value",
    philosophy: "Mr. Market is your servant, not master. Margin of safety above all.",
    philosophyZh: "市场先生是你的仆人而非向导。安全边际高于一切。",
    metrics: ["Graham Number", "NCAV / Net-Net", "P/E < 15", "Current Ratio > 2.0", "5-yr Consistent EPS"],
    voiceTone: "Analytical, academic, strict quantitative math."
  },
  {
    id: "lynch",
    name: "Peter Lynch",
    nameZh: "彼得·林奇",
    title: "The Ten-Bagger Hunter",
    titleZh: "十倍股猎手",
    fallbackIcon: "🎯",
    category: "growth",
    philosophy: "Invest in what you know. Look for the next ten-bagger.",
    philosophyZh: "投资你所熟悉的领域，寻找具备十倍潜力的成长股。",
    metrics: ["PEG Ratio < 1.0", "Business Category (Stalwart/Fast Grower)", "Simple Understandability", "Low Institutional Ownership"],
    voiceTone: "Enthusiastic, accessible, street-smart."
  },
  {
    id: "burry",
    name: "Michael Burry",
    nameZh: "迈克尔·贝瑞",
    title: "The Big Short Contrarian",
    titleZh: "大空头逆向投资者",
    fallbackIcon: "🔍",
    category: "value",
    philosophy: "Deep value in the rubble. When everyone hates it, look harder.",
    philosophyZh: "在废墟中寻找深度价值。当市场普遍厌恶时，深入挖掘数据。",
    metrics: ["FCF Yield > 10%", "EV/EBIT < 8.0", "Net Debt/Equity < 50%", "Contrarian Sentiment", "Insider Buying"],
    voiceTone: "Terse, data-obsessed, skeptical of hype."
  },
  {
    id: "wood",
    name: "Cathie Wood",
    nameZh: "凯茜·伍德",
    title: "The Innovation Disruptor",
    titleZh: "颠覆性创新先锋",
    fallbackIcon: "🚀",
    category: "growth",
    philosophy: "Disruptive innovation is the only moat. The future is now.",
    philosophyZh: "颠覆性创新是唯一的护城河，未来正在指数级展开。",
    metrics: ["Exponential TAM Expansion", "5-yr Revenue CAGR > 25%", "Platform & Network Effects", "Technology Convergence"],
    voiceTone: "Evangelical, futuristic, high conviction."
  },
  {
    id: "druckenmiller",
    name: "Stanley Druckenmiller",
    nameZh: "斯坦利·德鲁肯米勒",
    title: "The Macro Legend",
    titleZh: "全球宏观传奇",
    fallbackIcon: "🌊",
    category: "growth",
    philosophy: "Asymmetric macro opportunities. Bet big when the odds align.",
    philosophyZh: "非对称宏观机遇。当胜率与流动性极度有利时重拳出击。",
    metrics: ["Macro Tailwinds & Liquidity", "Earnings Revision Momentum", "Asymmetric Risk/Reward (3:1)", "Imminent Catalysts"],
    voiceTone: "Confident, sweeping macro view, aggressive sizing."
  },
  {
    id: "ackman",
    name: "Bill Ackman",
    nameZh: "比尔·阿克曼",
    title: "The Activist Investor",
    titleZh: "激进维权投资者",
    fallbackIcon: "⚡",
    category: "value",
    philosophy: "Simple, predictable, cash-flow machines with unlockable value.",
    philosophyZh: "商业模式简单、具有主导地位且能释放潜在价值的现金流机器。",
    metrics: ["Business Simplicity (1-sentence)", "Market Dominance (#1 or #2)", "Activist Catalyst / Unlock", "Predictable FCF"],
    voiceTone: "Direct, high-energy, catalyst-driven."
  },
  {
    id: "fisher",
    name: "Phil Fisher",
    nameZh: "菲利普·费雪",
    title: "The Scuttlebutt Researcher",
    titleZh: "草根调研先驱",
    fallbackIcon: "🔬",
    category: "growth",
    philosophy: "Own the best companies forever. Quality over cheapness always.",
    philosophyZh: "永远持有最顶尖的企业。重质不图廉，详尽草根调研。",
    metrics: ["15-Point Scuttlebutt Framework", "R&D Pipeline Efficiency", "Sales Organization Strength", "Executive Depth"],
    voiceTone: "Meticulous, qualitative, investigative."
  },
  {
    id: "taleb",
    name: "Nassim Taleb",
    nameZh: "纳西姆·塔勒布",
    title: "The Black Swan Analyst",
    titleZh: "黑天鹅与反脆弱导师",
    fallbackIcon: "🦢",
    category: "risk",
    philosophy: "Seek antifragility. Avoid the fragile. Skin in the game.",
    philosophyZh: "追求反脆弱性，避开隐藏脆弱性，管理层必须切身涉险（Skin in the game）。",
    metrics: ["Antifragility & Convexity", "Via Negativa (Eliminate Debt)", "Skin in the Game", "Lindy Durability", "Tail Risk"],
    voiceTone: "Uncompromising, philosophical, harsh on hidden fragility."
  },
  {
    id: "pabrai",
    name: "Mohnish Pabrai",
    nameZh: "莫尼什·帕伯莱",
    title: "The Dhandho Investor",
    titleZh: "低风险高收益(Dhandho)大师",
    fallbackIcon: "🎲",
    category: "value",
    philosophy: "Heads I win, tails I don't lose much. Low risk, high uncertainty.",
    philosophyZh: "正面我赢，反面我输不多。寻找低风险、高不确定性的极佳机会。",
    metrics: ["Downside Protection First", "Margin of Safety > 50%", "Low Capex / Asset Light", "Cloning Buffett/Munger"],
    voiceTone: "Humble, checklist-oriented, risk-averse."
  },
  {
    id: "damodaran",
    name: "Aswath Damodaran",
    nameZh: "阿斯沃斯·达莫达兰",
    title: "The Dean of Valuation",
    titleZh: "估值权威教授",
    fallbackIcon: "📊",
    category: "risk",
    philosophy: "Every asset has a fair value. Story + numbers = truth.",
    philosophyZh: "任何资产皆有公允价值。故事与数字交织方为估值真谛(DCF)。",
    metrics: ["DCF (Intrinsic Valuation)", "Sustainable Revenue CAGR", "Operating Margin & Reinvestment", "Cost of Capital (WACC)"],
    voiceTone: "Academic, rigorous, transparent about assumptions."
  },
  {
    id: "jhunjhunwala",
    name: "Rakesh Jhunjhunwala",
    nameZh: "拉凯什·金君瓦拉",
    title: "The Big Bull",
    titleZh: "印度多头之王",
    fallbackIcon: "🐂",
    category: "value",
    philosophy: "Be right, sit tight. Patient capital earns compounding returns.",
    philosophyZh: "看准趋势，坐稳拿住。长线耐心资本享受复利膨胀。",
    metrics: ["Margin of Safety > 30%", "ROCE > 20% Compounding", "Long-Term Conviction (5-10 yrs)", "Macro Sector Tailwind"],
    voiceTone: "Optimistic, bullish conviction, patient."
  }
];

export const PRESET_FILTERS = {
  all: {
    label: "All 13 Titans",
    labelZh: "全部 13 位巨头",
    icon: "⊞",
    ids: SAGES.map(s => s.id)
  },
  value: {
    label: "Value Council",
    labelZh: "价值派智囊",
    icon: "💲",
    ids: ["buffett", "munger", "graham", "pabrai", "burry"]
  },
  growth: {
    label: "Growth & Tech",
    labelZh: "成长与科技",
    icon: "📈",
    ids: ["lynch", "wood", "druckenmiller", "fisher"]
  },
  risk: {
    label: "Risk & Tail",
    labelZh: "风险与黑天鹅",
    icon: "📉",
    ids: ["taleb", "damodaran"]
  }
};

// Canadian Toronto Stock Exchange (TSE/TSX) Companies Database
export const CANADIAN_TSE_STOCKS = {
  'SHOP.TO': { name: 'Shopify Inc.', sector: 'Technology / E-commerce', currency: 'CAD' },
  'RY.TO': { name: 'Royal Bank of Canada', sector: 'Financials / Banking', currency: 'CAD' },
  'TD.TO': { name: 'Toronto-Dominion Bank', sector: 'Financials / Banking', currency: 'CAD' },
  'CNR.TO': { name: 'Canadian National Railway', sector: 'Industrials / Railroad', currency: 'CAD' },
  'ENB.TO': { name: 'Enbridge Inc.', sector: 'Energy / Pipelines', currency: 'CAD' },
  'CSU.TO': { name: 'Constellation Software Inc.', sector: 'Technology / Enterprise Software', currency: 'CAD' },
  'ATD.TO': { name: 'Alimentation Couche-Tard Inc.', sector: 'Consumer Staples / Convenience', currency: 'CAD' },
  'BMO.TO': { name: 'Bank of Montreal', sector: 'Financials / Banking', currency: 'CAD' },
  'BNS.TO': { name: 'Bank of Nova Scotia', sector: 'Financials / Banking', currency: 'CAD' },
  'SU.TO': { name: 'Suncor Energy Inc.', sector: 'Energy / Oil & Gas', currency: 'CAD' },
  'BAM.TO': { name: 'Brookfield Asset Management', sector: 'Alternative Asset Management', currency: 'CAD' },
  'CP.TO': { name: 'Canadian Pacific Kansas City', sector: 'Industrials / Railroad', currency: 'CAD' },
  'NTR.TO': { name: 'Nutrien Ltd.', sector: 'Materials / Agriculture & Potash', currency: 'CAD' }
};

// Common US & Global Stock Symbols
export const GLOBAL_STOCKS = {
  'NVDA': { name: 'NVIDIA Corporation', sector: 'Semiconductors / AI', currency: 'USD' },
  'AAPL': { name: 'Apple Inc.', sector: 'Consumer Tech', currency: 'USD' },
  'TSLA': { name: 'Tesla, Inc.', sector: 'Automotive & Clean Energy', currency: 'USD' },
  'MSFT': { name: 'Microsoft Corporation', sector: 'Software & Cloud', currency: 'USD' },
  'AMZN': { name: 'Amazon.com, Inc.', sector: 'E-commerce & Cloud', currency: 'USD' },
  'GOOGL': { name: 'Alphabet Inc.', sector: 'Internet & Search', currency: 'USD' },
  'META': { name: 'Meta Platforms, Inc.', sector: 'Social Media & VR', currency: 'USD' }
};

// Bilingual Interface Dictionary
export const I18N = {
  en: {
    brandSubtitle: "AI Stock Investment Boardroom",
    summonBtn: "Summon Council",
    searchPlaceholder: "Ticker ($NVDA, SHOP.TO, RY.TO)...",
    allSages: "All 13 Titans",
    valueCouncil: "Value Council",
    growthTech: "Growth & Tech",
    riskTail: "Risk & Tail Risk",
    compare: "Compare",
    popularLabel: "US & TSE:",
    pasteFinancials: "📊 Paste Financials",
    deliberatingText: "{n} Titans Deliberating",
    verdictCardsTitle: "Interactive Titan Verdict Cards",
    pmTitle: "Portfolio Manager Verdict",
    portfolioAlignment: "Portfolio Alignment",
    horizon: "Horizon",
    tradeHorizon: "Trade Horizon",
    entryZone: "Entry Zone:",
    stopLoss: "Stop Loss:",
    convictionScore: "Conviction Score",
    copyMarkdown: "📋 Copy Markdown",
    printPdf: "🖨️ Print / PDF",
    disclaimer: "⚠️ Educational purposes only. Not financial advice."
  },
  zh: {
    brandSubtitle: "顶尖大师投资决策智囊团",
    summonBtn: "召集智囊团",
    searchPlaceholder: "输入美股/加股代码 (如 NVDA, SHOP.TO, RY.TO)...",
    allSages: "全部 13 位巨头",
    valueCouncil: "价值派智囊",
    growthTech: "成长与科技",
    riskTail: "风险与黑天鹅",
    compare: "双股对比",
    popularLabel: "美股与加股:",
    pasteFinancials: "📊 补充财务数据",
    deliberatingText: "{n} 位大师正在研判",
    verdictCardsTitle: "投资巨头独立研判裁决卡",
    pmTitle: "投资总监最终裁决",
    portfolioAlignment: "风险投资偏好对齐",
    horizon: "投资期限",
    tradeHorizon: "交易与建仓区间",
    entryZone: "建议买点:",
    stopLoss: "风控止损:",
    convictionScore: "综合确信度",
    copyMarkdown: "📋 复制 Markdown",
    printPdf: "🖨️ 导出 PDF",
    disclaimer: "⚠️ 仅供研究与教育使用，不构成任何投资建议。"
  }
};
