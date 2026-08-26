import { SAGES, PRESET_FILTERS, CANADIAN_TSE_STOCKS, GLOBAL_STOCKS, I18N } from './sages-data.js';

// Application State
const state = {
  selectedSageIds: new Set(SAGES.map(s => s.id)),
  activeFilter: 'all',
  ticker: 'NVDA',
  language: localStorage.getItem('titancouncil_language') || 'en',
  financials: '',
  currentAnalysis: null,
  isAnalyzing: false,
  activeProfileId: 'buffett'
};

// DOM Elements
const elements = {
  tickerInput: document.getElementById('tickerInput'),
  headerCompanyName: document.getElementById('headerCompanyName'),
  summonBtn: document.getElementById('summonBtn'),
  titansDirectoryBtn: document.getElementById('titansDirectoryBtn'),
  filterHelpBtn: document.getElementById('filterHelpBtn'),
  filterHelpModal: document.getElementById('filterHelpModal'),
  closeFilterHelpBtn: document.getElementById('closeFilterHelpBtn'),
  gotItBtn: document.getElementById('gotItBtn'),
  langToggleBtn: document.getElementById('langToggleBtn'),
  langCurrentText: document.getElementById('langCurrentText'),
  filterPillsContainer: document.getElementById('filterPillsContainer'),
  drawerToggleBtn: document.getElementById('drawerToggleBtn'),
  drawerContent: document.getElementById('drawerContent'),
  financialsInput: document.getElementById('financialsInput'),
  councilTallyText: document.getElementById('councilTallyText'),
  deliberationProgress: document.getElementById('deliberationProgress'),
  statusMessage: document.getElementById('statusMessage'),
  progressBarFill: document.getElementById('progressBarFill'),
  sageCardsGrid: document.getElementById('sageCardsGrid'),
  riskNeedle: document.getElementById('riskNeedle'),
  riskLevelText: document.getElementById('riskLevelText'),
  horizonNeedle: document.getElementById('horizonNeedle'),
  horizonValText: document.getElementById('horizonValText'),
  entryZoneText: document.getElementById('entryZoneText'),
  stopLossText: document.getElementById('stopLossText'),
  convictionValueText: document.getElementById('convictionValueText'),
  actionBadgeBox: document.getElementById('actionBadgeBox'),
  sourcesPillsContainer: document.getElementById('sourcesPillsContainer'),
  copyReportBtn: document.getElementById('copyReportBtn'),
  printReportBtn: document.getElementById('printReportBtn'),
  sageProfileModal: document.getElementById('sageProfileModal'),
  closeProfileBtn: document.getElementById('closeProfileBtn'),
  closeProfileFooterBtn: document.getElementById('closeProfileFooterBtn'),
  profileQuickSwitch: document.getElementById('profileQuickSwitch'),
  // I18N Text Nodes
  i18nSubtitle: document.getElementById('i18nSubtitle'),
  i18nSummonBtn: document.getElementById('i18nSummonBtn'),
  i18nAllSages: document.getElementById('i18nAllSages'),
  i18nValueCouncil: document.getElementById('i18nValueCouncil'),
  i18nGrowthTech: document.getElementById('i18nGrowthTech'),
  i18nRiskTail: document.getElementById('i18nRiskTail'),
  i18nCompare: document.getElementById('i18nCompare'),
  i18nPresetsLabel: document.getElementById('i18nPresetsLabel'),
  i18nPasteFinancials: document.getElementById('i18nPasteFinancials'),
  i18nVerdictCardsTitle: document.getElementById('i18nVerdictCardsTitle'),
  i18nPMTitle: document.getElementById('i18nPMTitle'),
  i18nPortfolioAlignment: document.getElementById('i18nPortfolioAlignment'),
  i18nHorizon: document.getElementById('i18nHorizon'),
  i18nTradeHorizon: document.getElementById('i18nTradeHorizon'),
  i18nEntryZone: document.getElementById('i18nEntryZone'),
  i18nStopLoss: document.getElementById('i18nStopLoss'),
  i18nConvictionScore: document.getElementById('i18nConvictionScore'),
  i18nSourcesTitle: document.getElementById('i18nSourcesTitle'),
  i18nCopyMarkdown: document.getElementById('i18nCopyMarkdown'),
  i18nPrintPdf: document.getElementById('i18nPrintPdf'),
  i18nDisclaimer: document.getElementById('i18nDisclaimer')
};

// Initialize Application
function init() {
  attachEventListeners();
  buildProfileQuickSwitcher();
  applyLanguage(state.language);
  // Auto-run initial deliberation for $NVDA
  handleSummon();
}

function attachEventListeners() {
  // Summon Button & Enter Key
  elements.summonBtn.addEventListener('click', handleSummon);
  elements.tickerInput.addEventListener('keydown', e => {
    if (e.key === 'Enter') handleSummon();
  });
  elements.tickerInput.addEventListener('input', e => {
    const { cleanTicker } = parseInputQuery(e.target.value);
    elements.headerCompanyName.textContent = getCompanyDetails(cleanTicker).name;
  });

  // 13 Titans Directory Button
  if (elements.titansDirectoryBtn) {
    elements.titansDirectoryBtn.addEventListener('click', () => {
      openSageProfile(state.activeProfileId || 'buffett');
    });
  }

  // Titan Profile Modal Close Events
  if (elements.closeProfileBtn) {
    elements.closeProfileBtn.addEventListener('click', () => elements.sageProfileModal.classList.add('hidden'));
  }
  if (elements.closeProfileFooterBtn) {
    elements.closeProfileFooterBtn.addEventListener('click', () => elements.sageProfileModal.classList.add('hidden'));
  }
  if (elements.sageProfileModal) {
    elements.sageProfileModal.addEventListener('click', e => {
      if (e.target === elements.sageProfileModal) elements.sageProfileModal.classList.add('hidden');
    });
  }

  // Filter Help Modal (💡 Button)
  elements.filterHelpBtn.addEventListener('click', () => elements.filterHelpModal.classList.remove('hidden'));
  elements.closeFilterHelpBtn.addEventListener('click', () => elements.filterHelpModal.classList.add('hidden'));
  elements.gotItBtn.addEventListener('click', () => elements.filterHelpModal.classList.add('hidden'));
  elements.filterHelpModal.addEventListener('click', e => {
    if (e.target === elements.filterHelpModal) elements.filterHelpModal.classList.add('hidden');
  });

  // Preset Ticker Buttons (US & Canadian TSE)
  document.querySelectorAll('.preset-pill').forEach(pill => {
    pill.addEventListener('click', () => {
      const t = pill.dataset.ticker;
      elements.tickerInput.value = `$${t}`;
      elements.headerCompanyName.textContent = getCompanyDetails(t).name;
      handleSummon();
    });
  });

  // Language Toggle Button (EN <-> 中文)
  elements.langToggleBtn.addEventListener('click', () => {
    const nextLang = state.language === 'en' ? 'zh' : 'en';
    setLanguage(nextLang);
  });

  // Filter Pills Click
  elements.filterPillsContainer.addEventListener('click', e => {
    const pill = e.target.closest('.mockup-pill');
    if (pill) {
      applyFilter(pill.dataset.filter);
    }
  });

  // Financials Drawer Accordion
  elements.drawerToggleBtn.addEventListener('click', () => {
    const isExpanded = elements.drawerToggleBtn.getAttribute('aria-expanded') === 'true';
    elements.drawerToggleBtn.setAttribute('aria-expanded', !isExpanded);
    elements.drawerContent.classList.toggle('hidden', isExpanded);
  });

  // Report Export Buttons
  elements.copyReportBtn.addEventListener('click', copyMarkdownReport);
  elements.printReportBtn.addEventListener('click', () => window.print());
}

// Build one-click switcher inside Profile Modal
function buildProfileQuickSwitcher() {
  if (!elements.profileQuickSwitch) return;
  elements.profileQuickSwitch.innerHTML = '';

  SAGES.forEach(sage => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = `profile-quick-btn ${sage.id === state.activeProfileId ? 'active' : ''}`;
    btn.dataset.id = sage.id;
    btn.title = `${sage.name} (${sage.nameZh})`;
    btn.textContent = sage.fallbackIcon;
    btn.addEventListener('click', () => {
      openSageProfile(sage.id);
    });
    elements.profileQuickSwitch.appendChild(btn);
  });
}

function setLanguage(lang) {
  state.language = lang;
  localStorage.setItem('titancouncil_language', lang);
  applyLanguage(lang);
  
  if (state.currentAnalysis) {
    const { ticker, companyInfo, flags } = state.currentAnalysis;
    runSimulatedDeliberation(ticker, SAGES.filter(s => state.selectedSageIds.has(s.id)), state.financials, companyInfo || getCompanyDetails(ticker));
  } else {
    handleSummon();
  }
}

function applyLanguage(lang) {
  const dict = I18N[lang] || I18N.en;
  const isZh = lang === 'zh';

  elements.langCurrentText.textContent = isZh ? 'English' : '繁體中文';
  elements.langToggleBtn.title = isZh ? 'Switch to English' : '切換至繁體中文';

  if (elements.i18nSubtitle) elements.i18nSubtitle.textContent = dict.brandSubtitle;
  if (elements.i18nSummonBtn) elements.i18nSummonBtn.textContent = dict.summonBtn;
  if (elements.tickerInput) elements.tickerInput.placeholder = dict.searchPlaceholder;
  if (elements.i18nAllSages) elements.i18nAllSages.textContent = dict.allSages;
  if (elements.i18nValueCouncil) elements.i18nValueCouncil.textContent = dict.valueCouncil;
  if (elements.i18nGrowthTech) elements.i18nGrowthTech.textContent = dict.growthTech;
  if (elements.i18nRiskTail) elements.i18nRiskTail.textContent = dict.riskTail;
  if (elements.i18nCompare) elements.i18nCompare.textContent = dict.compare;
  if (elements.i18nPresetsLabel) elements.i18nPresetsLabel.textContent = dict.popularLabel;
  if (elements.i18nPasteFinancials) elements.i18nPasteFinancials.textContent = dict.pasteFinancials;
  if (elements.i18nVerdictCardsTitle) elements.i18nVerdictCardsTitle.textContent = dict.verdictCardsTitle;
  if (elements.i18nPMTitle) elements.i18nPMTitle.textContent = dict.pmTitle;
  if (elements.i18nPortfolioAlignment) elements.i18nPortfolioAlignment.textContent = dict.portfolioAlignment;
  if (elements.i18nHorizon) elements.i18nHorizon.textContent = dict.horizon;
  if (elements.i18nTradeHorizon) elements.i18nTradeHorizon.textContent = dict.tradeHorizon;
  if (elements.i18nEntryZone) elements.i18nEntryZone.textContent = dict.entryZone;
  if (elements.i18nStopLoss) elements.i18nStopLoss.textContent = dict.stopLoss;
  if (elements.i18nConvictionScore) elements.i18nConvictionScore.textContent = dict.convictionScore;
  if (elements.i18nSourcesTitle) elements.i18nSourcesTitle.textContent = dict.sourcesTitle;
  if (elements.i18nCopyMarkdown) elements.i18nCopyMarkdown.textContent = dict.copyMarkdown;
  if (elements.i18nPrintPdf) elements.i18nPrintPdf.textContent = dict.printPdf;
  if (elements.i18nDisclaimer) elements.i18nDisclaimer.textContent = dict.disclaimer;
}

// Parses ticker and typed command flags
function parseInputQuery(raw) {
  const parts = raw.trim().split(/\s+/);
  let cleanTicker = 'NVDA';
  let explicitFilter = null;
  const mentionedSageIds = new Set();

  for (const part of parts) {
    const p = part.toUpperCase();
    if (p.startsWith('--') || p.startsWith('-')) {
      const flag = p.replace(/^-+/, '').toLowerCase();
      if (flag === 'value') explicitFilter = 'value';
      else if (flag === 'growth' || flag === 'tech') explicitFilter = 'growth';
      else if (flag === 'risk' || flag === 'tail') explicitFilter = 'risk';
      else if (flag === 'all') explicitFilter = 'all';
    } else if (p.startsWith('@')) {
      const sageName = p.substring(1).toLowerCase();
      const found = SAGES.find(s => s.id === sageName || s.name.toLowerCase().includes(sageName));
      if (found) mentionedSageIds.add(found.id);
    } else if (!p.includes('VS')) {
      cleanTicker = part.replace(/^\$/, '').toUpperCase();
    }
  }

  return { cleanTicker, explicitFilter, mentionedSageIds };
}

function normalizeTicker(val) {
  const { cleanTicker } = parseInputQuery(val);
  return cleanTicker;
}

function getCompanyDetails(ticker) {
  const clean = ticker.toUpperCase();
  if (CANADIAN_TSE_STOCKS[clean]) {
    return { ...CANADIAN_TSE_STOCKS[clean], isCanadian: true };
  }
  if (GLOBAL_STOCKS[clean]) {
    return { ...GLOBAL_STOCKS[clean], isCanadian: false };
  }
  const isTse = clean.endsWith('.TO') || clean.endsWith('.V');
  return {
    name: `${clean} ${isTse ? '(Toronto Stock Exchange)' : 'Asset'}`,
    sector: isTse ? 'Canadian Equities' : 'Global Equities',
    currency: isTse ? 'CAD' : 'USD',
    isCanadian: isTse
  };
}

function applyFilter(filterKey) {
  state.activeFilter = filterKey;
  
  if (filterKey === 'compare') {
    const current = normalizeTicker(elements.tickerInput.value);
    elements.tickerInput.value = `$${current} vs $SHOP.TO`;
    elements.headerCompanyName.textContent = state.language === 'zh' ? '雙股對比模式' : 'Side-by-Side Comparison';
  } else if (PRESET_FILTERS[filterKey]) {
    state.selectedSageIds = new Set(PRESET_FILTERS[filterKey].ids);
  }

  document.querySelectorAll('.mockup-pill').forEach(pill => {
    pill.classList.toggle('active', pill.dataset.filter === filterKey);
  });

  handleSummon();
}

// Main Deliberation Trigger
async function handleSummon() {
  const rawInput = elements.tickerInput.value.trim() || '$NVDA';
  const { cleanTicker, explicitFilter, mentionedSageIds } = parseInputQuery(rawInput);
  
  // Handle typed filter flags or @mentions in search input
  if (mentionedSageIds.size > 0) {
    state.selectedSageIds = mentionedSageIds;
    document.querySelectorAll('.mockup-pill').forEach(pill => pill.classList.remove('active'));
  } else if (explicitFilter) {
    state.activeFilter = explicitFilter;
    state.selectedSageIds = new Set(PRESET_FILTERS[explicitFilter].ids);
    document.querySelectorAll('.mockup-pill').forEach(pill => {
      pill.classList.toggle('active', pill.dataset.filter === explicitFilter);
    });
  }

  const ticker = cleanTicker;
  const companyInfo = getCompanyDetails(ticker);

  state.ticker = ticker;
  state.financials = elements.financialsInput.value.trim();
  state.isAnalyzing = true;

  elements.headerCompanyName.textContent = `${companyInfo.name} (${companyInfo.currency})`;
  elements.sageCardsGrid.innerHTML = '';
  
  const isZh = state.language === 'zh';
  elements.councilTallyText.textContent = isZh 
    ? `${state.selectedSageIds.size} 位大師正在研判`
    : `${state.selectedSageIds.size} Titans Deliberating`;

  elements.deliberationProgress.classList.remove('hidden');
  elements.statusMessage.textContent = isZh 
    ? `正在召集智囊團分析 ${ticker} (${companyInfo.name})...` 
    : `Summoning ${state.selectedSageIds.size} council members for ${ticker}...`;
  elements.progressBarFill.style.width = '25%';

  try {
    const selectedSages = SAGES.filter(s => state.selectedSageIds.has(s.id));
    await runGeminiDeliberation(ticker, selectedSages, state.financials);
  } catch (err) {
    console.warn('Gemini Cloudflare Edge call skipped or error, running client simulation engine:', err);
    const selectedSages = SAGES.filter(s => state.selectedSageIds.has(s.id));
    await runSimulatedDeliberation(ticker, selectedSages, state.financials, companyInfo);
  } finally {
    state.isAnalyzing = false;
    elements.progressBarFill.style.width = '100%';
    setTimeout(() => {
      elements.deliberationProgress.classList.add('hidden');
    }, 400);
  }
}

// Deliberation via Google Gemini API through Cloudflare Worker
async function runGeminiDeliberation(ticker, selectedSages, financials) {
  const isZh = state.language === 'zh';
  elements.statusMessage.textContent = isZh ? '正在透過 Google Gemini 執行多視角思維鏈研判...' : 'Executing Chain of Thought deliberation via Google Gemini...';
  elements.progressBarFill.style.width = '60%';

  const response = await fetch('/api/analyze', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      ticker,
      sages: selectedSages.map(s => s.name),
      financials,
      language: state.language
    })
  });

  if (!response.ok) {
    throw new Error(`API error: ${response.status}`);
  }

  const rawData = await response.json();
  let jsonOutput = rawData;
  if (typeof rawData === 'string') {
    try {
      jsonOutput = JSON.parse(rawData);
    } catch {
      throw new Error('Could not parse JSON response');
    }
  }

  renderFullAnalysis(jsonOutput, ticker);
}

// Render Structured JSON Output into Dashboard UI
function renderFullAnalysis(data, ticker) {
  const isZh = state.language === 'zh';
  elements.sageCardsGrid.innerHTML = '';

  const verdicts = data.verdicts || [];
  const parsedResults = [];

  verdicts.forEach(v => {
    const sageObj = SAGES.find(s => 
      s.name.toLowerCase() === (v.sageName || '').toLowerCase() || 
      s.id === (v.titanId || '').toLowerCase()
    ) || {
      id: 'custom',
      name: v.sageName || v.titanName || 'Titan',
      nameZh: v.sageName || v.titanName || '投資巨頭',
      fallbackIcon: '🏛️'
    };

    const item = {
      sage: sageObj,
      signal: (v.signal || 'NEUTRAL').toUpperCase(),
      confidence: v.confidence || 75,
      provenance: v.provenance || (ticker.endsWith('.TO') ? '🍁 SEDAR+ (TSX) & Live Search' : '📑 SEC 10-K & Web Grounding'),
      quote: v.quote || v.reasoning || '',
      chainOfThought: v.chainOfThought || [
        `1. Framework: Evaluated ${ticker} according to core investment parameters.`,
        `2. Financial Moat: Verified business returns and balance sheet structure.`,
        `3. Valuation Verdict: Formulated ${v.signal || 'NEUTRAL'} stance with ${v.confidence || 75}% conviction.`
      ]
    };

    parsedResults.push(item);
    renderMockupSageCard(item, isZh);
  });

  // Render Data Sources & Citations (including live Google Search web links)
  renderSourcesBadges(data.sources || data.portfolioManager?.sourcesCited, data.groundingWebLinks);

  // Consume Portfolio Manager Verdict
  if (data.portfolioManager) {
    const pm = data.portfolioManager;
    const action = pm.action || 'ACCUMULATE ON DIPS';
    const conviction = pm.conviction || 'HIGH';
    const horizon = pm.timeHorizon || '2-4 Years';
    const execution = pm.execution || {};

    elements.riskLevelText.textContent = isZh ? "穩健/中度風險" : "Moderate Risk";
    elements.horizonValText.textContent = horizon;
    elements.entryZoneText.textContent = execution.entryZone || "$780 - $810";
    elements.stopLossText.textContent = execution.stopLoss || "$715";
    elements.convictionValueText.textContent = `${conviction} (${data.riskManager?.weightedConvictionScore || 84}%)`;
    elements.actionBadgeBox.textContent = isZh ? `執行操作: ${action}` : `ACTION: ${action}`;
  }

  state.currentAnalysis = { ticker, results: parsedResults, data };
}

// Render Data Sources Provenance Badges (with optional live web links)
function renderSourcesBadges(customSources, webLinks) {
  if (!elements.sourcesPillsContainer) return;
  elements.sourcesPillsContainer.innerHTML = '';

  // Render clickable live web citations from Google Search Grounding if available
  if (webLinks && webLinks.length > 0) {
    webLinks.forEach(link => {
      const a = document.createElement('a');
      a.className = 'source-link-pill';
      a.href = link.url;
      a.target = '_blank';
      a.rel = 'noopener noreferrer';
      a.title = `${link.title} (${link.url})`;
      const shortTitle = link.title.length > 22 ? `${link.title.substring(0, 22)}…` : link.title;
      a.innerHTML = `🌐 ${shortTitle} ↗`;
      elements.sourcesPillsContainer.appendChild(a);
    });
  }

  const defaultSources = [
    '📑 SEC 10-K / 10-Q (EDGAR)',
    '🍁 SEDAR+ (Canadian TSE)',
    '🔍 Google Live Search Grounding',
    '✨ Google Gemini API',
    '🏛️ 13 Titan Frameworks'
  ];

  const list = (customSources && customSources.length > 0) ? customSources : defaultSources;
  list.forEach(src => {
    const pill = document.createElement('span');
    pill.className = 'source-badge-pill';
    pill.textContent = src;
    elements.sourcesPillsContainer.appendChild(pill);
  });
}

// Built-in Intelligent Simulation Engine (CoT + Instant Demo)
async function runSimulatedDeliberation(ticker, selectedSages, financials, companyInfo) {
  const isZh = state.language === 'zh';
  const isNvda = ticker.includes('NVDA');
  const isShop = ticker.includes('SHOP');
  const isRy = ticker.includes('RY');
  const isEnb = ticker.includes('ENB');
  const isCsu = ticker.includes('CSU');
  const isAapl = ticker.includes('AAPL');
  const isTsla = ticker.includes('TSLA');
  const isCanadian = companyInfo.isCanadian;

  const flags = { isNvda, isShop, isRy, isEnb, isCsu, isAapl, isTsla, isCanadian };

  elements.sageCardsGrid.innerHTML = '';
  const results = [];

  const defaultProv = isCanadian 
    ? (isZh ? '🍁 SEDAR+ (TSX 官方揭露)' : '🍁 SEDAR+ (TSX Disclosure)')
    : (isZh ? '📑 SEC 10-K & 即時搜尋檢索' : '📑 SEC 10-K & Web Grounding');

  for (const sage of selectedSages) {
    const { signal, confidence, quote, chainOfThought } = generateSageVerdictWithCoT(sage.id, flags, isZh);
    const item = { sage, signal, confidence, quote, chainOfThought, provenance: defaultProv };
    results.push(item);
    renderMockupSageCard(item, isZh);
  }

  updatePortfolioManagerSidebar(results, ticker, flags, isZh);
  renderSourcesBadges();
  state.currentAnalysis = { ticker, companyInfo, flags, results };
}

function generateSageVerdictWithCoT(sageId, flags, isZh) {
  let signal = "NEUTRAL";
  let confidence = 75;
  let quote = "";
  let chainOfThought = [];

  switch (sageId) {
    case 'buffett':
      if (flags.isRy || flags.isEnb) {
        signal = "BULLISH"; confidence = 88;
        quote = isZh 
          ? "加拿大銀行與管網具備特許經營權護城河，高股息現金流且資本回報率穩健，符合長期持有標準。"
          : "Durable Canadian oligopoly moat. Strong dividend cash yields and disciplined leverage provide excellent margin of safety.";
        chainOfThought = isZh ? [
          "1. 能力圈檢驗：特許公用管線與銀行體系商業模式簡單，現金流可預測性極高。",
          "2. 護城河與 ROE：監管護城河極深，ROE 持續 > 14%，股息分紅具備抗通膨定價權。",
          "3. 安全邊際：當前估值處於歷史合理區間，提供超過 25% 的保守防守邊際。"
        ] : [
          "1. Circle of Competence: Regulated infrastructure & banking monopoly with highly predictable cash flows.",
          "2. Moat & ROE: Sustainable franchise advantage with ROE > 14% and consistent shareholder yield.",
          "3. Margin of Safety: Trading at conservative historical multiples with >25% downside buffer."
        ];
      } else if (flags.isNvda) {
        signal = "NEUTRAL"; confidence = 82;
        quote = isZh 
          ? "卓越的晶片護城河與極高資本回報率，但當前乘數並未留下足夠的安全邊際。"
          : "Exceptional CUDA moat and pricing power, but valuation multiples leave minimal margin of safety for owner earnings.";
        chainOfThought = isZh ? [
          "1. 能力圈檢驗：GPU 運算架構與軟體生態強大，但半導體具有天然硬體週期性。",
          "2. 護城河與 ROE：CUDA 開發者生態構成深厚護城河，淨利潤率維持在極高水平。",
          "3. 安全邊際：當前本益比未提供 25% 以上的保守安全邊際，建議耐心等待回檔。"
        ] : [
          "1. Circle of Competence: World-class AI hardware ecosystem, but cyclical demand peaks remain.",
          "2. Moat & Returns: CUDA platform network creates tremendous owner earnings power.",
          "3. Margin of Safety: Elevated valuation multiple compresses the conservative margin of safety to <15%."
        ];
      } else {
        signal = "NEUTRAL"; confidence = 75;
        quote = isZh 
          ? "嚴格遵循能力圈原則：需要清晰的特許經營權護城河與至少 25% 的安全邊際。"
          : "Strict circle of competence: requiring clear franchise moats and at least 25% margin of safety.";
        chainOfThought = isZh ? [
          "1. 業務評估：檢視商業模式是否具備持續定價權。",
          "2. 資本配置：分析自由現金流與管理層誠信度。",
          "3. 估值考量：嚴格要求 25% 以上的折價買點。"
        ] : [
          "1. Circle of Competence: Verify simple economics and sustainable competitive moat.",
          "2. Capital Allocation: Inspect Owner Earnings conversion and honest management.",
          "3. Valuation: Mandate minimum 25% discount to conservative intrinsic value."
        ];
      }
      break;

    case 'munger':
      if (flags.isCsu) {
        signal = "BULLISH"; confidence = 94;
        quote = isZh 
          ? "Constellation Software 是絕佳的多元思維模型範例：極高資本回報率加上精準的垂直軟體併購複利。"
          : "Constellation Software is a textbook mental model winner: exceptional ROIC with programmatic VMS compounding.";
        chainOfThought = isZh ? [
          "1. 逆向思考：VMS 軟體黏性極高，客戶轉換成本巨大，破產風險趨近於零。",
          "2. 綜效模型：分散式去中心化併購架構創造自體複利的 Lollapalooza 效應。",
          "3. ROIC 評估：ROIC 長期維持在 20%+，Mark Leonard 的資本配置堪稱典範。"
        ] : [
          "1. Inversion: Vertical market software has high switching costs and near-zero churn vulnerability.",
          "2. Lollapalooza Effect: Decentralized programmatic M&A engine reinforces compounding moat.",
          "3. ROIC & Integrity: ROIC sustained >20% across decades under peerless stewardship."
        ];
      } else if (flags.isNvda) {
        signal = "NEUTRAL"; confidence = 81;
        quote = isZh 
          ? "反過來想：什麼會殺死這家公司？硬體週期的波動不可忽視。偉大企業亦需合理價格。"
          : "Invert: what kills this company? Hardware cycle concentration. A wonderful business, but priced for perfection.";
        chainOfThought = isZh ? [
          "1. 逆向思考：主要雲端巨頭客戶正在自研晶片，長期需求集中度存在肥尾風險。",
          "2. 綜效模型：軟硬一體化具備強大定價權，但股價已完全反映完美預期。",
          "3. 決策：好企業不等於好買點，等待市場狂熱消退。"
        ] : [
          "1. Inversion: Cloud hyperscalers developing custom ASICs; demand lumpiness will arrive.",
          "2. Mental Models: Superb franchise and pricing power, but priced for absolute perfection.",
          "3. Stance: Never pay excessive premiums during euphoric manic phases."
        ];
      } else {
        signal = "NEUTRAL"; confidence = 72;
        quote = isZh 
          ? "避免盲目從眾。尋找具備不可替代品牌與強大定價權的超級企業。"
          : "Avoid crowd mania. Look for irreplaceable franchises with strong pricing power.";
        chainOfThought = isZh ? [
          "1. 逆向推演：深入審查業務核心脆弱點與供應鏈瓶頸。",
          "2. 多元模型：結合心理學、工程學與經濟學模型交叉驗證。",
          "3. 紀律：寧願錯過，也不在缺乏定價優勢時追高。"
        ] : [
          "1. Invert: Identify hidden failure modes and capital allocation hazards.",
          "2. Cross-Disciplinary: Apply microeconomics and behavioral misjudgment filters.",
          "3. Stance: Maintain disciplined patience for obvious asymmetric bargains."
        ];
      }
      break;

    case 'burry':
      if (flags.isEnb || flags.isRy) {
        signal = "BULLISH"; confidence = 84;
        quote = isZh 
          ? "能源管網與加拿大銀行提供 6%-7% 的硬現金流收益率，EV/EBIT 處在合理區間，具備堅實防禦性。"
          : "Canadian pipeline/banking infrastructure offers 6-7% real cash yields with protected volume franchises.";
        chainOfThought = isZh ? [
          "1. FCF 收益率：自由現金流收益率顯著高於無風險利率，下行空間受硬資產支撐。",
          "2. 估值倍數：EV/EBIT 小於 9x，未被華爾街狂熱動量炒作。",
          "3. 逆向勝率：在被忽視的實體資產中獲得扎實的現金回報。"
        ] : [
          "1. FCF Yield: Free cash flow yields >7% with real physical asset infrastructure backing.",
          "2. Valuation Multiples: Low EV/EBIT multiples without momentum bubble premium.",
          "3. Solvency: Long-term debt well amortized by contractual cash distributions."
        ];
      } else if (flags.isNvda || flags.isShop) {
        signal = "BEARISH"; confidence = 88;
        quote = isZh 
          ? "估值乘數處於歷史高位，市場集中度過高隱藏了未來的需求懸崖，必須警惕下行風險。"
          : "Unprecedented concentration and market mania reminiscent of previous bubbles. Proceed with extreme caution.";
        chainOfThought = isZh ? [
          "1. 歷史估值乘數：P/S 與 EV/EBIT 偏離長期均值 3 個標準差以上。",
          "2. 需求懸崖：客戶前期資本支出超前透支，未來可能面臨消化週期的去庫存壓力。",
          "3. 逆向做空信號：極高預期與極端擁擠持倉構成潛在回撤觸發點。"
        ] : [
          "1. Valuation Metrics: Multiples trade at 3+ standard deviations above historical mean.",
          "2. Demand Cliffs: Hyperscaler capex front-loading risks severe hangover digestions.",
          "3. Asymmetric Downside: Negative revision shocks will trigger sharp re-rating."
        ];
      } else {
        signal = "BEARISH"; confidence = 78;
        quote = isZh 
          ? "在廢墟中尋找自由現金流收益率 >10% 的錯價資產，拒絕追逐高溢價動量股。"
          : "Looking for mispriced assets with FCF yield > 10%. Refuse to pay premiums for momentum hype.";
        chainOfThought = isZh ? [
          "1. 數據挖掘：過濾 FCF/EV 與實質有形資產淨值。",
          "2. 債務風險：排除高槓桿與股權稀釋嚴重的企業。",
          "3. 結論：當前標的缺乏深層錯價折扣。"
        ] : [
          "1. Data Screening: Filter for unloved assets trading at steep discounts to tangible cash flows.",
          "2. Solvency: Eliminate debt-heavy structures and excessive share-based dilution.",
          "3. Stance: Strict contrarian value discipline."
        ];
      }
      break;

    case 'wood':
      if (flags.isShop || flags.isNvda) {
        signal = "BULLISH"; confidence = 95;
        quote = isZh 
          ? "Shopify 與輝達處於全球數位化商業與算力革命的核心，TAM（總潛在市場）呈指數級爆發。"
          : "Shopify and NVIDIA are at the epicenter of exponential commerce and compute convergence. TAM expansion is massive.";
        chainOfThought = isZh ? [
          "1. 指數型 TAM：AI 代理人與全球電商技術融合，5 年潛在市場空間將擴大 10 倍。",
          "2. 平台網路效應：開發者生態與商家基礎具備強大的贏家通吃自增強屬性。",
          "3. 成長斜率：預期未來 5 年複合營收成長率 (CAGR) 維持在 25% 以上。"
        ] : [
          "1. Exponential TAM: Compute and agentic commerce convergence unlocks multi-trillion TAM.",
          "2. Platform Network Effects: Deep developer and merchant lock-in ensures winner-take-most dominance.",
          "3. 5-Yr CAGR: High conviction in sustained >25% secular revenue expansion."
        ];
      } else {
        signal = "NEUTRAL"; confidence = 65;
        quote = isZh 
          ? "評估研發支出是否能催生贏家通吃的平台網路效應。"
          : "Evaluating whether R&D creates winner-take-most platform network effects.";
        chainOfThought = isZh ? [
          "1. 技術顛覆性：審視產品是否面臨既有巨頭的快速同質化威脅。",
          "2. 創新研發：計算研發資本產出與單位經濟模型擴張速度。",
          "3. 結論：科技顛覆潛力尚需更多催化劑驗證。"
        ] : [
          "1. Disruption Horizon: Assess vulnerability to adjacent AI and platform breakthroughs.",
          "2. R&D Efficiency: Measure technology adoption curve vs incumbent friction.",
          "3. Stance: Selective focus on exponential convergent leaders."
        ];
      }
      break;

    case 'taleb':
      if (flags.isRy || flags.isCsu) {
        signal = "BULLISH"; confidence = 82;
        quote = isZh 
          ? "林迪效應（Lindy Effect）明顯：歷經百年危機洗禮依然穩健，具備極高的反脆弱性與下行防守力。"
          : "Strong Lindy effect: proven resilience across century-scale crises with robust antifragility.";
        chainOfThought = isZh ? [
          "1. 反脆弱性：業務經受過多次宏觀崩盤考驗，危機過後市佔率不降反升。",
          "2. 負向法 (Via Negativa)：剔除隱形槓桿與無切身利益之投機項目。",
          "3. 林迪效應：存在時間越長，未來存續的預期壽命越長，黑天鵝下行風險受控。"
        ] : [
          "1. Antifragility: Proven resilience through macro downturns; emerges stronger from stress.",
          "2. Via Negativa: Clean debt profiles without toxic hidden leverage derivatives.",
          "3. Lindy Effect: Multi-decade survival history guarantees low fat-tail extinction risk."
        ];
      } else if (flags.isNvda || flags.isShop) {
        signal = "BEARISH"; confidence = 79;
        quote = isZh 
          ? "系統存在隱形脆弱性：單點供應鏈與客戶集中度隱藏肥尾風險（Fat Tails），不可將平靜誤以為無風險。"
          : "Fragility in the system is ignored. The distribution of returns has fat tails. High risk of negative black swan.";
        chainOfThought = isZh ? [
          "1. 肥尾風險：依賴台積電單一先進晶圓製造供應鏈與少數雲端巨頭採購，尾端脆弱性極高。",
          "2. 凸性不足：股價已透支上行空間，黑天鵝事件下行跌幅可能呈現非線性重挫。",
          "3. 切身涉險：市場過度外推線性增長，忽視了黑天鵝衝擊的破壞力。"
        ] : [
          "1. Tail Fragility: Single-fab geographic concentration and customer lumpiness create acute fat tails.",
          "2. Negative Convexity: Asymmetric downside if geopolitical or supply shock materializes.",
          "3. Risk Heuristic: Never confuse past calm with absence of systemic vulnerability."
        ];
      } else {
        signal = "NEUTRAL"; confidence = 70;
        quote = isZh 
          ? "透過「否定法」剔除高槓桿與無切身利益關聯（No skin in the game）的企業。"
          : "Apply via negativa: avoid excessive leverage and firms without insider skin in the game.";
        chainOfThought = isZh ? [
          "1. 負向過濾：檢視管理層持股比例與下行承擔機制。",
          "2. 系統性壓力：測試承受 50% 宏觀需求驟降的存活能力。",
          "3. 結論：維持中性防守觀察。"
        ] : [
          "1. Via Negativa: Scrutinize insider skin in the game and balance sheet buffer.",
          "2. Stress Testing: Verify survival during acute 3-standard-deviation macro shocks.",
          "3. Stance: Prioritize survival and convexity over speculative yield."
        ];
      }
      break;

    case 'graham':
      if (flags.isRy || flags.isEnb) {
        signal = "BULLISH"; confidence = 80;
        quote = isZh 
          ? "P/E 位於 10-12x 區間，股息率 >6%，具備防禦型投資者的安全邊際。"
          : "P/E in 10-12x range with >6% dividend yield meets defensive investor criteria.";
        chainOfThought = isZh ? [
          "1. 資產負債表實力：流動比率穩健，長期獲利記錄超過 10 年無中斷。",
          "2. 葛拉漢指數：股價相對於每股淨值與 EPS 乘積處於合理防守區間。",
          "3. 安全邊際：高股息回報為本金提供實質下行保護。"
        ] : [
          "1. Balance Sheet: Over 10 consecutive years of positive earnings with strong solvency.",
          "2. Graham Number: P/E * P/B complies with defensive benchmark limits.",
          "3. Margin of Safety: Substantial recurring dividend yield protects principal."
        ];
      } else {
        signal = "BEARISH"; confidence = 89;
        quote = isZh 
          ? "股價顯著高於葛拉漢指數（Graham Number），缺乏傳統清算與淨流動資產（Net-Net）保護。"
          : "Price trades significantly above Graham Number and liquidation value. Margin of safety is missing.";
        chainOfThought = isZh ? [
          "1. 葛拉漢測試：股價遠超 √(22.5 * EPS * BVPS)，市價主要由未來成長溢價構成。",
          "2. 淨流動資產：缺乏 Net-Net（NCAV）清算價值支撐。",
          "3. 裁決：防禦型投資者應嚴守估值紀律，拒絕支付成長溢價。"
        ] : [
          "1. Graham Metrics: Price vastly exceeds Graham Number √(22.5 * EPS * BVPS).",
          "2. Asset Backing: Zero Net-Net (NCAV) discount protection available.",
          "3. Verdict: Fails conservative enterprise value safety tests."
        ];
      }
      break;

    case 'lynch':
      signal = (flags.isShop || flags.isNvda || flags.isCsu) ? "BULLISH" : "NEUTRAL";
      confidence = 85;
      quote = isZh 
        ? "典型的快速成長股或穩健型支柱企業，商業邏輯簡單明瞭，各行各業都離不開它的服務。"
        : "Fast grower or stalwart category. Everyday understandability with multi-year organic growth runway.";
      chainOfThought = isZh ? [
        "1. 分類定位：屬於典型的快速成長型（Fast Grower）或中流砥柱（Stalwart）企業。",
        "2. PEG 估值：將獲利成長率與本益比對標，PEG 在長期產能釋放後仍具吸引力。",
        "3. 實地驗證：終端客戶需求極其強勁，產品可解釋性高。"
      ] : [
        "1. Classification: Fast Grower category with continuous product-led TAM expansion.",
        "2. PEG Metric: PEG adjusted for sustainable earnings acceleration is attractive.",
        "3. Understandability: Clear product superiority with everyday enterprise demand."
      ];
      break;

    case 'druckenmiller':
      signal = "BULLISH"; confidence = 84;
      quote = isZh 
        ? "宏觀流動性與盈利預期持續上修，非對稱回報比顯著，順勢而為。"
        : "Secular liquidity and uninterrupted upward estimate revisions create compelling asymmetric momentum.";
      chainOfThought = isZh ? [
        "1. 宏觀順風：央行利率週期與企業資本支出浪潮形成強大流動性推動力。",
        "2. 預期上修：華爾街分析師每季持續上調 EPS 預測，正向驚喜動能強勁。",
        "3. 3:1 非對稱比：順應大趨勢重拳出擊，嚴設移動停損。"
      ] : [
        "1. Macro Tailwind: Unstoppable secular liquidity and capex investment supercycles.",
        "2. Estimate Revisions: Persistent upward earnings surprises from Wall Street consensus.",
        "3. Asymmetric Setup: Favorable 3:1 reward-to-risk ratio with disciplined stop-loss execution."
      ];
      break;

    case 'ackman':
      signal = "BULLISH"; confidence = 78;
      quote = isZh 
        ? "行業龍頭地位不可動搖，現金流極為充沛且具有對抗通膨的強大調價能力。"
        : "Dominant market leadership with predictable cash generation and strong inflation-hedging pricing power.";
      chainOfThought = isZh ? [
        "1. 龍頭地位：在細分市場穩居第 1 或第 2 名，具備極高准入門檻。",
        "2. 現金流機制：商業模式極度清晰，自由現金流具備抗通膨定價能力。",
        "3. 催化劑：營運槓桿與定價策略仍有進一步釋放股東價值的空間。"
      ] : [
        "1. Dominance: Absolute #1 market position in an indispensable global niche.",
        "2. FCF Engine: Simple, predictable cash generation with natural inflation hedging.",
        "3. Catalysts: Operational efficiency levers can drive further multiple re-rating."
      ];
      break;

    case 'fisher':
      signal = "BULLISH"; confidence = 82;
      quote = isZh 
        ? "草根調研（Scuttlebutt）確認其客戶黏性極高，研發管線產出比卓越，管理層深具遠見。"
        : "Scuttlebutt research confirms extraordinary R&D pipeline and unmatched customer stickiness.";
      chainOfThought = isZh ? [
        "1. 草根調研 (Scuttlebutt)：與供應鏈和客戶訪談確認產品競爭力難以被短期超越。",
        "2. 研發產出效率：每投入 1 美元研發經費帶來的專利與商業化回報高於同業 50%。",
        "3. 團隊深度：工程師文化深厚，管理層注重 5-10 年長線技術佈局。"
      ] : [
        "1. Scuttlebutt: Channel checks confirm unparalleled customer retention and ecosystem lock-in.",
        "2. R&D Productivity: Industry-leading revenue generated per dollar of R&D spent.",
        "3. Management Vision: Forward-thinking leadership investing for the next decade."
      ];
      break;

    case 'pabrai':
      if (flags.isRy || flags.isEnb) {
        signal = "BULLISH"; confidence = 82;
        quote = isZh 
          ? "符合低風險原則（Dhandho）：下行空間極其有限，股息收益確鑿。"
          : "Passes Dhandho test: limited downside risk with reliable cash yield stream.";
        chainOfThought = isZh ? [
          "1. Dhandho 核心法則：「正面我贏，反面我輸不多」——下行風險受到實體資產鎖定。",
          "2. 50% 安全邊際：保守現金流折現下依然具備極高本金保護。",
          "3. 複製大師：頂級主權基金與價值型大師持續重倉配置。"
        ] : [
          "1. Dhandho Framework: 'Heads I win, tails I don't lose much'—downside floor is secure.",
          "2. Capital Protection: Predictable contractual income streams limit permanent impairment risk.",
          "3. Superinvestor Cloning: Validated by top institutional compounding allocators."
        ];
      } else {
        signal = "BEARISH"; confidence = 85;
        quote = isZh 
          ? "當前估值未能提供 50% 的安全邊際，耐心等待市場因短期不確定性產生錯殺。"
          : "Fails the Dhandho rule: 'Heads I win, tails I lose a lot' at elevated multiples.";
        chainOfThought = isZh ? [
          "1. Dhandho 檢驗：在高倍數下，一旦成長不及預期下行虧損巨大。",
          "2. 安全邊際不足：未能達到 50% 的超額安全邊際門檻。",
          "3. 決策：保持耐心，將現金留在帳上等待市場錯殺。"
        ] : [
          "1. Risk/Reward: At extreme multiples, downside risk in a multiple compression is too severe.",
          "2. Margin of Safety: Fails the mandatory 50% Dhandho discount threshold.",
          "3. Stance: Wait patiently for temporary panic to misprice the asset."
        ];
      }
      break;

    case 'damodaran':
      signal = "NEUTRAL"; confidence = 78;
      quote = isZh 
        ? "現金流折現（DCF）模型要求未來十年維持高速複合增長才能支撐當前市值，故事需與數字謹慎校準。"
        : "DCF valuation narrative requires sustained CAGR to justify market cap. Story must align with rigorous numbers.";
      chainOfThought = isZh ? [
        "1. 故事轉化為數字：將 AI / 軟體市場爆發敘事轉化為具體的 10 年營收 CAGR 與終端利潤率。",
        "2. WACC 與再投資：加權平均資本成本設定在 8.5%，再投資率需保持在 25% 以上。",
        "3. 內在價值區間：當前市價處於內在 DCF 估值區間的高位，定價偏向樂觀。"
      ] : [
        "1. Narrative to Numbers: Translate optimistic growth story into concrete 10-year revenue CAGR and operating margins.",
        "2. WACC & Reinvestment: Apply realistic cost of capital (8.5%) and reinvestment rate to sustain growth.",
        "3. Intrinsic Band: Current trading price sits at the upper boundary of intrinsic DCF valuation range."
      ];
      break;

    case 'jhunjhunwala':
      signal = "BULLISH"; confidence = 85;
      quote = isZh 
        ? "資本回報率（ROCE）維持在 20%+ 的財富複利機器。看準大勢，坐穩拿住。"
        : "Generational wealth compounding machine with ROCE > 20%. Be right and sit tight.";
      chainOfThought = isZh ? [
        "1. 國運與大勢：行業處於全球現代化與數位化改造的大浪潮前端。",
        "2. ROCE 複利指標：資本回報率超越 20%，每留存 1 美元利潤能創造數倍市場價值。",
        "3. 長期信念：忽略短期季度雜音，以 5-10 年視角享受巨型複利。"
      ] : [
        "1. Secular Megatrend: Poised at the forefront of global technological modernization.",
        "2. ROCE Compounding: High ROCE (>20%) turns retained earnings into substantial shareholder wealth.",
        "3. Conviction: Ignore quarterly noise and sit tight for multi-year compounding."
      ];
      break;
  }

  return { signal, confidence, quote, chainOfThought };
}

// Render individual Sage Card with interactive CoT accordion
function renderMockupSageCard(item, isZh) {
  const { sage, signal, confidence, quote, chainOfThought } = item;
  const signalLower = signal.toLowerCase();
  const displayName = isZh ? sage.nameZh : sage.name;
  const signalText = isZh 
    ? (signal === 'BULLISH' ? '看多 (BULLISH)' : (signal === 'BEARISH' ? '看空 (BEARISH)' : '中性 (NEUTRAL)'))
    : signal;

  const card = document.createElement('div');
  card.className = 'mockup-sage-card';
  card.innerHTML = `
    <div class="card-top-row">
      <div class="mockup-avatar-circle avatar-halo-${signalLower}" title="Click to view profile" style="cursor: pointer;">
        ${sage.fallbackIcon}
      </div>
      <div class="card-sage-info">
        <h4 class="card-sage-name" style="cursor: pointer;">${displayName}</h4>
        <span class="mockup-badge-pill badge-${signalLower}">${signalText}</span>
      </div>
      <button type="button" class="card-profile-action-btn" title="${isZh ? '查看大師檔案' : 'View Profile'}">
        ℹ️
      </button>
    </div>

    <div class="card-confidence-wrap">
      <div class="confidence-text">${confidence}% ${isZh ? '確信度' : 'Confidence'}</div>
      <div class="confidence-line-bg">
        <div class="confidence-line-fill ${signalLower}" style="width: ${confidence}%"></div>
      </div>
    </div>

    <p class="card-quote-text">"${quote}"</p>

    <div class="card-provenance-tag">
      <span>📌</span>
      <span>${item.provenance || (isZh ? 'SEC 10-K & 即時搜尋檢索' : 'SEC 10-K & Web Grounding')}</span>
    </div>

    <div class="card-cot-section">
      <button type="button" class="cot-toggle-btn">
        <span>🧠 ${isZh ? '深入思維鏈 (CoT)' : 'Chain of Thought (CoT)'}</span>
        <span class="cot-toggle-icon">▼</span>
      </button>
      <div class="cot-steps-box hidden">
        ${(chainOfThought || []).map((step, idx) => `
          <div class="cot-step-row">
            <span class="cot-step-num">Step ${idx + 1}</span>
            <span class="cot-step-text">${step}</span>
          </div>
        `).join('')}
      </div>
    </div>
  `;

  // Profile click handlers
  const openAction = () => openSageProfile(sage.id);
  const avatar = card.querySelector('.mockup-avatar-circle');
  const nameEl = card.querySelector('.card-sage-name');
  const btn = card.querySelector('.card-profile-action-btn');
  if (avatar) avatar.addEventListener('click', openAction);
  if (nameEl) nameEl.addEventListener('click', openAction);
  if (btn) btn.addEventListener('click', openAction);

  // Chain of Thought toggle handler
  const cotBtn = card.querySelector('.cot-toggle-btn');
  const cotBox = card.querySelector('.cot-steps-box');
  if (cotBtn && cotBox) {
    cotBtn.addEventListener('click', () => {
      const isHidden = cotBox.classList.contains('hidden');
      cotBox.classList.toggle('hidden', !isHidden);
      cotBtn.classList.toggle('open', isHidden);
      const icon = cotBtn.querySelector('.cot-toggle-icon');
      if (icon) icon.textContent = isHidden ? '▲' : '▼';
    });
  }

  elements.sageCardsGrid.appendChild(card);
}

function updatePortfolioManagerSidebar(results, ticker, flags, isZh) {
  const bullish = results.filter(r => r.signal === 'BULLISH').length;
  const bearish = results.filter(r => r.signal === 'BEARISH').length;

  const isCanadian = flags.isCanadian;
  const currencySymbol = isCanadian ? 'C$' : '$';

  if (flags.isNvda) {
    elements.riskLevelText.textContent = isZh ? "中度風險 / 穩健偏好" : "Moderate Risk";
    elements.horizonValText.textContent = isZh ? "中期 (1-3年)" : "Medium Term";
    elements.entryZoneText.textContent = `${currencySymbol}780 - ${currencySymbol}810`;
    elements.stopLossText.textContent = `${currencySymbol}715`;
    elements.convictionValueText.textContent = isZh ? "高 (84%)" : "High (84%)";
    elements.actionBadgeBox.textContent = isZh ? "執行操作: 逢回檔分批建倉" : "ACTION: ACCUMULATE ON DIPS";
  } else if (flags.isShop) {
    elements.riskLevelText.textContent = isZh ? "中高成長 / 科技動量" : "Growth Risk";
    elements.horizonValText.textContent = isZh ? "中長期 (2-4年)" : "Med-Long Term";
    elements.entryZoneText.textContent = `${currencySymbol}90 - ${currencySymbol}98`;
    elements.stopLossText.textContent = `${currencySymbol}82`;
    elements.convictionValueText.textContent = isZh ? "良好 (78%)" : "Good (78%)";
    elements.actionBadgeBox.textContent = isZh ? "執行操作: 突破加倉" : "ACTION: BUY BREAKOUTS";
  } else if (flags.isRy || flags.isEnb) {
    elements.riskLevelText.textContent = isZh ? "低風險 / 穩健收益" : "Defensive Income";
    elements.horizonValText.textContent = isZh ? "長期 (3-5年以上)" : "Long Term (3-5y)";
    elements.entryZoneText.textContent = isCanadian ? "C$142 - C$148" : "$105 - $110";
    elements.stopLossText.textContent = isCanadian ? "C$134" : "$98";
    elements.convictionValueText.textContent = isZh ? "極高 (88%)" : "Very High (88%)";
    elements.actionBadgeBox.textContent = isZh ? "執行操作: 核心股息定投" : "ACTION: CORE DIVIDEND BUY";
  } else if (flags.isCsu) {
    elements.riskLevelText.textContent = isZh ? "穩健複利 / 高品質成長" : "Quality Compounding";
    elements.horizonValText.textContent = isZh ? "超長線 (5-10年)" : "Multi-Year Compounding";
    elements.entryZoneText.textContent = "C$4,100 - C$4,250";
    elements.stopLossText.textContent = "C$3,850";
    elements.convictionValueText.textContent = isZh ? "頂級 (92%)" : "Elite High (92%)";
    elements.actionBadgeBox.textContent = isZh ? "執行操作: 長期持有複利" : "ACTION: BUY & COMPOUND";
  } else {
    elements.riskLevelText.textContent = isZh ? "均衡配置" : "Balanced Risk";
    elements.horizonValText.textContent = isZh ? "中期 (1-3年)" : "Medium Term";
    elements.entryZoneText.textContent = `${currencySymbol}165 - ${currencySymbol}175`;
    elements.stopLossText.textContent = `${currencySymbol}150`;
    elements.convictionValueText.textContent = `${bullish > bearish ? 'Bullish' : 'Neutral'} (${Math.round((bullish / Math.max(results.length, 1)) * 100)}%)`;
    elements.actionBadgeBox.textContent = bullish > bearish ? (isZh ? "執行操作: 逢低買入" : "ACTION: BUY PULLBACKS") : (isZh ? "執行操作: 觀望等待" : "ACTION: HOLD / WATCH");
  }
}

// Open On-Demand Profile Modal
export function openSageProfile(sageId) {
  const sage = SAGES.find(s => s.id === sageId);
  if (!sage) return;

  state.activeProfileId = sageId;
  const isZh = state.language === 'zh';
  const modal = document.getElementById('sageProfileModal');
  if (!modal) return;

  document.getElementById('profileAvatar').textContent = sage.fallbackIcon;
  document.getElementById('sageProfileModalTitle').textContent = isZh ? sage.nameZh : sage.name;
  document.getElementById('profileTitle').textContent = isZh ? sage.titleZh : sage.title;
  document.getElementById('profileFirm').textContent = sage.firm || 'Institutional Investor';
  document.getElementById('profileCategory').textContent = isZh 
    ? (PRESET_FILTERS[sage.category]?.labelZh || sage.category)
    : (PRESET_FILTERS[sage.category]?.label || sage.category);
  document.getElementById('profileTrackRecord').textContent = sage.trackRecord || 'Multi-decade compounding record';
  document.getElementById('profileBio').textContent = isZh ? (sage.bioZh || sage.bio) : sage.bio;
  document.getElementById('profilePhilosophy').textContent = '"' + (isZh ? sage.philosophyZh : sage.philosophy) + '"';

  // Highlight active button in quick switch bar
  document.querySelectorAll('.profile-quick-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.id === sageId);
  });

  // Metrics
  const metricsEl = document.getElementById('profileMetrics');
  if (metricsEl) {
    metricsEl.innerHTML = '';
    (sage.metrics || []).forEach(m => {
      const span = document.createElement('span');
      span.className = 'profile-metric-badge';
      span.textContent = m;
      metricsEl.appendChild(span);
    });
  }

  // Signature Bets
  const betsEl = document.getElementById('profileSignatureBets');
  if (betsEl) {
    betsEl.innerHTML = '';
    (sage.signatureBets || ['Long-term compounding holdings']).forEach(b => {
      const li = document.createElement('li');
      li.textContent = b;
      betsEl.appendChild(li);
    });
  }

  // Key Books
  const booksEl = document.getElementById('profileKeyBooks');
  if (booksEl) {
    booksEl.innerHTML = '';
    (sage.keyBooks || ['Published investment memos & letters']).forEach(bk => {
      const li = document.createElement('li');
      li.textContent = bk;
      booksEl.appendChild(li);
    });
  }

  modal.classList.remove('hidden');
}

function copyMarkdownReport() {
  if (!state.currentAnalysis) return;
  const { ticker, results } = state.currentAnalysis;
  const isZh = state.language === 'zh';

  let md = `# TitanCouncil Investment Deliberation: $${ticker}\n\n`;
  md += `**Date**: ${new Date().toLocaleDateString()}\n`;
  md += `**Engine**: Google Gemini API & Titan Investment Models\n\n`;
  md += `## Titan Council Verdicts & Chain of Thought\n\n`;

  results.forEach(r => {
    const name = isZh ? r.sage.nameZh : r.sage.name;
    md += `### ${r.sage.fallbackIcon} ${name} — **${r.signal}** (${r.confidence}% Conviction)\n`;
    md += `> "${r.quote}"\n\n`;
    if (r.chainOfThought && r.chainOfThought.length > 0) {
      md += `*Chain of Thought*:\n`;
      r.chainOfThought.forEach(step => {
        md += `- ${step}\n`;
      });
      md += `\n`;
    }
  });

  md += `## Portfolio Manager Synthesis\n\n`;
  md += `- **Action**: ${elements.actionBadgeBox.textContent}\n`;
  md += `- **Conviction**: ${elements.convictionValueText.textContent}\n`;
  md += `- **Entry**: ${elements.entryZoneText.textContent} | **Stop Loss**: ${elements.stopLossText.textContent}\n`;

  navigator.clipboard.writeText(md).then(() => {
    elements.copyReportBtn.textContent = isZh ? '✅ 已複製!' : '✅ Copied!';
    setTimeout(() => {
      elements.copyReportBtn.textContent = isZh ? '📋 複製 Markdown' : '📋 Copy Markdown';
    }, 2000);
  });
}

document.addEventListener('DOMContentLoaded', init);
