import { SAGES, PRESET_FILTERS, CANADIAN_TSE_STOCKS, GLOBAL_STOCKS, I18N } from './sages-data.js';

// Application State
const state = {
  selectedSageIds: new Set(SAGES.map(s => s.id)),
  activeFilter: 'all',
  ticker: 'NVDA',
  language: localStorage.getItem('titancouncil_language') || 'en',
  financials: '',
  settings: {
    provider: localStorage.getItem('titancouncil_provider') || 'demo',
    apiKey: localStorage.getItem('titancouncil_api_key') || ''
  },
  currentAnalysis: null,
  isAnalyzing: false
};

// DOM Elements
const elements = {
  tickerInput: document.getElementById('tickerInput'),
  headerCompanyName: document.getElementById('headerCompanyName'),
  summonBtn: document.getElementById('summonBtn'),
  filterHelpBtn: document.getElementById('filterHelpBtn'),
  filterHelpModal: document.getElementById('filterHelpModal'),
  closeFilterHelpBtn: document.getElementById('closeFilterHelpBtn'),
  gotItBtn: document.getElementById('gotItBtn'),
  langToggleBtn: document.getElementById('langToggleBtn'),
  langCurrentText: document.getElementById('langCurrentText'),
  settingsBtn: document.getElementById('settingsBtn'),
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
  copyReportBtn: document.getElementById('copyReportBtn'),
  printReportBtn: document.getElementById('printReportBtn'),
  settingsModal: document.getElementById('settingsModal'),
  closeSettingsBtn: document.getElementById('closeSettingsBtn'),
  saveSettingsBtn: document.getElementById('saveSettingsBtn'),
  providerSelect: document.getElementById('providerSelect'),
  apiKeyInput: document.getElementById('apiKeyInput'),
  languageSelect: document.getElementById('languageSelect'),
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
  i18nCopyMarkdown: document.getElementById('i18nCopyMarkdown'),
  i18nPrintPdf: document.getElementById('i18nPrintPdf'),
  i18nDisclaimer: document.getElementById('i18nDisclaimer')
};

// Initialize Application
function init() {
  attachEventListeners();
  loadStoredSettings();
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

  // Titan Profile Modal
  const sageProfileModal = document.getElementById('sageProfileModal');
  const closeProfileBtn = document.getElementById('closeProfileBtn');
  const closeProfileFooterBtn = document.getElementById('closeProfileFooterBtn');
  if (closeProfileBtn) closeProfileBtn.addEventListener('click', () => sageProfileModal.classList.add('hidden'));
  if (closeProfileFooterBtn) closeProfileFooterBtn.addEventListener('click', () => sageProfileModal.classList.add('hidden'));
  if (sageProfileModal) {
    sageProfileModal.addEventListener('click', e => {
      if (e.target === sageProfileModal) sageProfileModal.classList.add('hidden');
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

  // Settings Modal
  elements.settingsBtn.addEventListener('click', () => elements.settingsModal.classList.remove('hidden'));
  elements.closeSettingsBtn.addEventListener('click', () => elements.settingsModal.classList.add('hidden'));
  elements.saveSettingsBtn.addEventListener('click', saveSettings);
  elements.settingsModal.addEventListener('click', e => {
    if (e.target === elements.settingsModal) elements.settingsModal.classList.add('hidden');
  });

  // Export Buttons
  elements.copyReportBtn.addEventListener('click', copyMarkdownReport);
  elements.printReportBtn.addEventListener('click', () => window.print());
}

function setLanguage(lang) {
  state.language = lang;
  localStorage.setItem('titancouncil_language', lang);
  elements.languageSelect.value = lang;
  applyLanguage(lang);
  handleSummon();
}

function applyLanguage(lang) {
  const dict = I18N[lang] || I18N.en;
  const isZh = lang === 'zh';

  elements.langCurrentText.textContent = isZh ? 'English' : '中文';
  elements.i18nSubtitle.textContent = dict.brandSubtitle;
  elements.i18nSummonBtn.textContent = dict.summonBtn;
  elements.tickerInput.placeholder = dict.searchPlaceholder;
  elements.i18nAllSages.textContent = dict.allSages;
  elements.i18nValueCouncil.textContent = dict.valueCouncil;
  elements.i18nGrowthTech.textContent = dict.growthTech;
  elements.i18nRiskTail.textContent = dict.riskTail;
  elements.i18nCompare.textContent = dict.compare;
  elements.i18nPresetsLabel.textContent = dict.popularLabel;
  elements.i18nPasteFinancials.textContent = dict.pasteFinancials;
  elements.i18nVerdictCardsTitle.textContent = dict.verdictCardsTitle;
  elements.i18nPMTitle.textContent = dict.pmTitle;
  elements.i18nPortfolioAlignment.textContent = dict.portfolioAlignment;
  elements.i18nHorizon.textContent = dict.horizon;
  elements.i18nTradeHorizon.textContent = dict.tradeHorizon;
  elements.i18nEntryZone.textContent = dict.entryZone;
  elements.i18nStopLoss.textContent = dict.stopLoss;
  elements.i18nConvictionScore.textContent = dict.convictionScore;
  elements.i18nCopyMarkdown.textContent = dict.copyMarkdown;
  elements.i18nPrintPdf.textContent = dict.printPdf;
  elements.i18nDisclaimer.textContent = dict.disclaimer;
}

// Parses both simple tickers and typed filter commands (e.g. "NVDA --value", "SHOP.TO @buffett @taleb", "/council AAPL")
function parseInputQuery(rawInput) {
  let text = (rawInput || '').trim();
  text = text.replace(/^\/council\s*/i, ''); // Strip leading /council if typed

  let explicitFilter = null;
  const mentionedSageIds = new Set();

  // Check typed command flags: --value, --growth, --risk, --all, or compare
  if (/\s+--value\b/i.test(text)) {
    explicitFilter = 'value';
    text = text.replace(/\s+--value\b/gi, '');
  } else if (/\s+--growth\b/i.test(text)) {
    explicitFilter = 'growth';
    text = text.replace(/\s+--growth\b/gi, '');
  } else if (/\s+--risk\b/i.test(text)) {
    explicitFilter = 'risk';
    text = text.replace(/\s+--risk\b/gi, '');
  } else if (/\s+--all\b/i.test(text)) {
    explicitFilter = 'all';
    text = text.replace(/\s+--all\b/gi, '');
  }

  // Check typed @mentions: e.g. @buffett, @munger, @taleb, @burry, @wood
  const atMatches = text.match(/@([a-zA-Z]+)/g);
  if (atMatches) {
    atMatches.forEach(m => {
      const nameKey = m.replace('@', '').toLowerCase();
      const matchSage = SAGES.find(s => s.id.includes(nameKey) || s.name.toLowerCase().includes(nameKey));
      if (matchSage) mentionedSageIds.add(matchSage.id);
    });
    text = text.replace(/@[a-zA-Z]+/g, '');
  }

  let cleanTicker = text.replace('$', '').trim().toUpperCase();
  if (cleanTicker.startsWith('TSE:') || cleanTicker.startsWith('TSX:')) {
    cleanTicker = cleanTicker.replace(/^(TSE|TSX):/, '') + '.TO';
  }
  if (!cleanTicker) cleanTicker = 'NVDA';

  return { cleanTicker, explicitFilter, mentionedSageIds };
}

function normalizeTicker(input) {
  return parseInputQuery(input).cleanTicker;
}

function getCompanyDetails(ticker) {
  const clean = normalizeTicker(ticker);
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
    elements.headerCompanyName.textContent = state.language === 'zh' ? '双股对比模式' : 'Side-by-Side Comparison';
  } else if (PRESET_FILTERS[filterKey]) {
    state.selectedSageIds = new Set(PRESET_FILTERS[filterKey].ids);
  }

  document.querySelectorAll('.mockup-pill').forEach(pill => {
    pill.classList.toggle('active', pill.dataset.filter === filterKey);
  });

  handleSummon();
}

function loadStoredSettings() {
  elements.providerSelect.value = state.settings.provider;
  elements.apiKeyInput.value = state.settings.apiKey;
  elements.languageSelect.value = state.language;
}

function saveSettings() {
  state.settings.provider = elements.providerSelect.value;
  state.settings.apiKey = elements.apiKeyInput.value.trim();
  const selectedLang = elements.languageSelect.value;

  localStorage.setItem('titancouncil_provider', state.settings.provider);
  localStorage.setItem('titancouncil_api_key', state.settings.apiKey);

  if (selectedLang !== state.language) {
    setLanguage(selectedLang);
  }

  elements.settingsModal.classList.add('hidden');
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
    ? `${state.selectedSageIds.size} 位大师正在研判`
    : `${state.selectedSageIds.size} Titans Deliberating`;

  elements.deliberationProgress.classList.remove('hidden');
  elements.statusMessage.textContent = isZh 
    ? `正在召集智囊团分析 ${ticker} (${companyInfo.name})...` 
    : `Summoning ${state.selectedSageIds.size} council members for ${ticker}...`;
  elements.progressBarFill.style.width = '20%';

  try {
    const selectedSages = SAGES.filter(s => state.selectedSageIds.has(s.id));

    if (state.settings.provider !== 'demo') {
      await runCloudflareDeliberation(ticker, selectedSages, state.financials);
    } else {
      await runSimulatedDeliberation(ticker, selectedSages, state.financials, companyInfo);
    }
  } catch (err) {
    console.error('API deliberation error, using simulation engine:', err);
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

// Consumes JSON Response from Cloudflare Serverless Function
async function runCloudflareDeliberation(ticker, selectedSages, financials) {
  const isZh = state.language === 'zh';
  elements.statusMessage.textContent = isZh ? '正在通过 Cloudflare Edge 执行研判...' : 'Processing deliberation via Cloudflare Worker...';
  elements.progressBarFill.style.width = '50%';

  const response = await fetch('/api/analyze', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      ticker,
      sages: selectedSages.map(s => s.name),
      financials,
      language: state.language,
      provider: state.settings.provider,
      apiKey: state.settings.apiKey
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
      nameZh: v.sageName || v.titanName || '投资大师',
      fallbackIcon: '🏛️'
    };

    const item = {
      sage: sageObj,
      signal: (v.signal || 'NEUTRAL').toUpperCase(),
      confidence: v.confidence || 75,
      quote: v.reasoning || v.quote || ''
    };

    parsedResults.push(item);
    renderMockupSageCard(item, isZh);
  });

  // Consume Risk Manager & Portfolio Manager JSON sections
  if (data.portfolioManager) {
    const pm = data.portfolioManager;
    const action = pm.action || 'WATCH';
    const conviction = pm.conviction || 'HIGH';
    const horizon = pm.timeHorizon || '3-5 Years';
    const execution = pm.execution || {};

    elements.riskLevelText.textContent = isZh ? "穩健/中度風險" : "Moderate Risk";
    elements.horizonValText.textContent = horizon;
    elements.entryZoneText.textContent = execution.entryZone || "$780 - $810";
    elements.stopLossText.textContent = execution.stopLoss || "$715";
    elements.convictionValueText.textContent = `${conviction} (${data.riskManager?.weightedConvictionScore || 84}%)`;
    elements.actionBadgeBox.textContent = isZh ? `执行操作: ${action}` : `ACTION: ${action}`;
  }

  state.currentAnalysis = { ticker, results: parsedResults, data };
}

// Built-in Intelligent Simulation Engine (Fallback & Instant Demo)
async function runSimulatedDeliberation(ticker, selectedSages, financials, companyInfo) {
  const isZh = state.language === 'zh';
  const isNvda = ticker.includes('NVDA');
  const isShop = ticker.includes('SHOP');
  const isRy = ticker.includes('RY');
  const isEnb = ticker.includes('ENB');
  const isCsu = ticker.includes('CSU');
  const isCanadian = companyInfo.isCanadian;

  let step = 0;
  const total = selectedSages.length;
  const sageResults = [];

  for (const sage of selectedSages) {
    step++;
    elements.statusMessage.textContent = isZh ? `正在諮詢 ${sage.nameZh}...` : `Consulting ${sage.name}...`;
    elements.progressBarFill.style.width = `${Math.floor((step / total) * 90)}%`;

    await new Promise(r => setTimeout(r, 60));

    const verdict = generateSageVerdict(sage, ticker, { isNvda, isShop, isRy, isEnb, isCsu, isCanadian }, isZh);
    sageResults.push(verdict);
    renderMockupSageCard(verdict, isZh);
  }

  updatePortfolioManagerSidebar(sageResults, ticker, { isNvda, isShop, isRy, isEnb, isCsu, isCanadian }, isZh);
}

function generateSageVerdict(sage, ticker, flags, isZh) {
  let signal = "NEUTRAL";
  let confidence = 75;
  let quote = "";

  switch (sage.id) {
    case 'buffett':
      if (flags.isRy || flags.isCsu) {
        signal = "BULLISH"; confidence = 92;
        quote = isZh 
          ? "加拿大銀行業寡頭壟斷護城河極深，ROE 穩定在 15%+，分紅複利超過百年，極具確定性。"
          : "Oligopoly banking moat in Canada with consistent 15%+ ROE and over a century of reliable dividend compounding.";
      } else if (flags.isNvda) {
        signal = "BULLISH"; confidence = 90;
        quote = isZh 
          ? "價格是你付出的，價值是你得到的。輝達在 AI 時代的硬體生態壁壘極其寬廣。"
          : "Price is what you pay. Value is what you get. NVIDIA's wide moat justifies the valuation for long-term holders.";
      } else if (flags.isShop) {
        signal = "NEUTRAL"; confidence = 70;
        quote = isZh 
          ? "商家電商生態極為出色，但自由現金流估值乘數目前未提供充足的安全邊際。"
          : "Excellent merchant e-commerce ecosystem, but current valuation multiples leave limited margin of safety.";
      } else {
        signal = "NEUTRAL"; confidence = 68;
        quote = isZh 
          ? "嚴守能力圈原則，要求企業具備清晰的特許經營權與不低於 25% 的安全邊際。"
          : "Strict circle of competence: requiring clear franchise moats and at least 25% margin of safety.";
      }
      break;

    case 'munger':
      if (flags.isCsu) {
        signal = "BULLISH"; confidence = 94;
        quote = isZh 
          ? "Constellation Software 是絕佳的多元思維模型範例：極高資本回報率加上精準的垂直軟體併購複利。"
          : "Constellation Software is a textbook mental model winner: exceptional ROIC with programmatic VMS compounding.";
      } else if (flags.isNvda) {
        signal = "NEUTRAL"; confidence = 81;
        quote = isZh 
          ? "反過來想：什麼會殺死這家公司？硬體週期的波動不可忽視。偉大企業亦需合理價格。"
          : "Invert: what kills this company? Hardware cycle concentration. A wonderful business, but priced for perfection.";
      } else {
        signal = "NEUTRAL"; confidence = 72;
        quote = isZh 
          ? "避免盲目從眾。尋找具備不可替代品牌與強大定價權的超級企業。"
          : "Avoid crowd mania. Look for irreplaceable franchises with strong pricing power.";
      }
      break;

    case 'burry':
      if (flags.isEnb || flags.isRy) {
        signal = "BULLISH"; confidence = 84;
        quote = isZh 
          ? "能源管網與加拿大銀行提供 6%-7% 的硬現金流收益率，EV/EBIT 處在合理區間，具備堅實防禦性。"
          : "Canadian pipeline/banking infrastructure offers 6-7% real cash yields with protected volume franchises.";
      } else if (flags.isNvda || flags.isShop) {
        signal = "BEARISH"; confidence = 88;
        quote = isZh 
          ? "估值乘數處於歷史高位，市場集中度過高隱藏了未來的需求懸崖，必須警惕下行風險。"
          : "Unprecedented concentration and market mania reminiscent of previous bubbles. Proceed with extreme caution.";
      } else {
        signal = "BEARISH"; confidence = 78;
        quote = isZh 
          ? "在廢墟中尋找自由現金流收益率 >10% 的錯價資產，拒絕追逐高溢價動量股。"
          : "Looking for mispriced assets with FCF yield > 10%. Refuse to pay premiums for momentum hype.";
      }
      break;

    case 'wood':
      if (flags.isShop || flags.isNvda) {
        signal = "BULLISH"; confidence = 95;
        quote = isZh 
          ? "Shopify 與輝達處於全球數位化商業與算力革命的核心，TAM（總潛在市場）呈指數級爆發。"
          : "Shopify and NVIDIA are at the epicenter of exponential commerce and compute convergence. TAM expansion is massive.";
      } else if (flags.isRy || flags.isEnb) {
        signal = "NEUTRAL"; confidence = 60;
        quote = isZh 
          ? "傳統金融與基礎設施面臨金融科技與綠色轉型的長期顛覆，成長斜率相對平緩。"
          : "Legacy infrastructure and banking face fintech and energy transition disruption headwinds.";
      } else {
        signal = "NEUTRAL"; confidence = 65;
        quote = isZh 
          ? "評估研發支出是否能催生贏家通吃的平台網路效應。"
          : "Evaluating whether R&D creates winner-take-most platform network effects.";
      }
      break;

    case 'taleb':
      if (flags.isRy || flags.isCsu) {
        signal = "BULLISH"; confidence = 82;
        quote = isZh 
          ? "林迪效應（Lindy Effect）明顯：歷經百年危機洗禮依然穩健，具備極高的反脆弱性與下行防守力。"
          : "Strong Lindy effect: proven resilience across century-scale crises with robust antifragility.";
      } else if (flags.isNvda || flags.isShop) {
        signal = "BEARISH"; confidence = 79;
        quote = isZh 
          ? "系統存在隱形脆弱性：單點供應鏈與客戶集中度隱藏肥尾風險（Fat Tails），不可將平靜誤以為無風險。"
          : "Fragility in the system is ignored. The distribution of returns has fat tails. High risk of negative black swan.";
      } else {
        signal = "NEUTRAL"; confidence = 70;
        quote = isZh 
          ? "透過「否定法」剔除高槓桿與無切身利益關聯（No skin in the game）的企業。"
          : "Apply via negativa: avoid excessive leverage and firms without insider skin in the game.";
      }
      break;

    case 'graham':
      if (flags.isRy || flags.isEnb) {
        signal = "BULLISH"; confidence = 80;
        quote = isZh 
          ? "P/E 位於 10-12x 區間，股息率 >6%，具備防禦型投資者的安全邊際。"
          : "P/E in 10-12x range with >6% dividend yield meets defensive investor criteria.";
      } else {
        signal = "BEARISH"; confidence = 89;
        quote = isZh 
          ? "股價顯著高於葛拉漢指數（Graham Number），缺乏傳統清算與淨流動資產（Net-Net）保護。"
          : "Price trades significantly above Graham Number and liquidation value. Margin of safety is missing.";
      }
      break;

    case 'lynch':
      signal = (flags.isShop || flags.isNvda || flags.isCsu) ? "BULLISH" : "NEUTRAL";
      confidence = 85;
      quote = isZh 
        ? "典型的快速成長股或穩健型支柱企業，商業邏輯簡單明瞭，各行各業都離不開它的服務。"
        : "Fast grower or stalwart category. Everyday understandability with multi-year organic growth runway.";
      break;

    case 'druckenmiller':
      signal = "BULLISH"; confidence = 84;
      quote = isZh 
        ? "宏觀流動性與盈利預期持續上修，非對稱回報比顯著，順勢而為。"
        : "Secular liquidity and uninterrupted upward estimate revisions create compelling asymmetric momentum.";
      break;

    case 'ackman':
      signal = "BULLISH"; confidence = 78;
      quote = isZh 
        ? "行業龍頭地位不可動搖，現金流極為充沛且具有對抗通膨的強大調價能力。"
        : "Dominant market leadership with predictable cash generation and strong inflation-hedging pricing power.";
      break;

    case 'fisher':
      signal = "BULLISH"; confidence = 82;
      quote = isZh 
        ? "草根調研（Scuttlebutt）確認其客戶黏性極高，研發管線產出比卓越，管理層深具遠見。"
        : "Scuttlebutt research confirms extraordinary R&D pipeline and unmatched customer stickiness.";
      break;

    case 'pabrai':
      if (flags.isRy || flags.isEnb) {
        signal = "BULLISH"; confidence = 82;
        quote = isZh 
          ? "符合低風險原則（Dhandho）：下行空間極其有限，股息收益確鑿。"
          : "Passes Dhandho test: limited downside risk with reliable cash yield stream.";
      } else {
        signal = "BEARISH"; confidence = 85;
        quote = isZh 
          ? "當前估值未能提供 50% 的安全邊際，耐心等待市場因短期不確定性產生錯殺。"
          : "Fails the Dhandho rule: 'Heads I win, tails I lose a lot' at elevated multiples.";
      }
      break;

    case 'damodaran':
      signal = "NEUTRAL"; confidence = 78;
      quote = isZh 
        ? "現金流折現（DCF）模型要求未來十年維持高速複合增長才能支撐當前市值，故事需與數字謹慎校準。"
        : "DCF valuation narrative requires sustained CAGR to justify market cap. Story must align with rigorous numbers.";
      break;

    case 'jhunjhunwala':
      signal = "BULLISH"; confidence = 85;
      quote = isZh 
        ? "资本回报率（ROCE）维持在 20%+ 的财富复利机器。看准大势，坐稳拿住。"
        : "Generational wealth compounding machine with ROCE > 20%. Be right and sit tight.";
      break;
  }

  return { sage, signal, confidence, quote };
}

function renderMockupSageCard(item, isZh) {
  const { sage, signal, confidence, quote } = item;
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
  `;

  const openAction = () => openSageProfile(sage.id);
  const avatar = card.querySelector('.mockup-avatar-circle');
  const nameEl = card.querySelector('.card-sage-name');
  const btn = card.querySelector('.card-profile-action-btn');
  if (avatar) avatar.addEventListener('click', openAction);
  if (nameEl) nameEl.addEventListener('click', openAction);
  if (btn) btn.addEventListener('click', openAction);

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
    elements.actionBadgeBox.textContent = isZh ? "執行操作: 定投或突破跟進" : "ACTION: DCA & GROWTH HOLD";
  } else if (flags.isRy || flags.isEnb || flags.isCsu) {
    elements.riskLevelText.textContent = isZh ? "低風險 / 高股息防禦" : "Low Risk (Defensive)";
    elements.horizonValText.textContent = isZh ? "長期持有 (3-5年以上)" : "Long Term (3-5Y+)";
    elements.entryZoneText.textContent = isZh ? "現價區間定投" : "Current Support";
    elements.stopLossText.textContent = "-12% Stop";
    elements.convictionValueText.textContent = isZh ? "極高 (88%)" : "Very High (88%)";
    elements.actionBadgeBox.textContent = isZh ? "執行操作: 買入並長期複利持有" : "ACTION: BUY & COMPOUND";
  } else if (bullish > bearish) {
    elements.riskLevelText.textContent = isZh ? "中低風險" : "Low-Mod Risk";
    elements.horizonValText.textContent = isZh ? "長期 (3-5年)" : "Long Term";
    elements.entryZoneText.textContent = "Support Basis";
    elements.stopLossText.textContent = "-15% Stop";
    elements.convictionValueText.textContent = isZh ? "高 (85%)" : "High (85%)";
    elements.actionBadgeBox.textContent = isZh ? "執行操作: 買入持有" : "ACTION: BUY & HOLD";
  } else {
    elements.riskLevelText.textContent = isZh ? "謹慎 / 波動較高" : "Elevated Risk";
    elements.horizonValText.textContent = isZh ? "觀察期" : "Watch Period";
    elements.entryZoneText.textContent = "Wait Pullback";
    elements.stopLossText.textContent = "-10% Stop";
    elements.convictionValueText.textContent = isZh ? "中性 (55%)" : "Neutral (55%)";
    elements.actionBadgeBox.textContent = isZh ? "執行操作: 保持觀望" : "ACTION: WATCH & WAIT";
  }

  state.currentAnalysis = { ticker, results };
}

function copyMarkdownReport() {
  if (!state.currentAnalysis) return;
  const { ticker, results } = state.currentAnalysis;
  const isZh = state.language === 'zh';

  let md = isZh ? `# 🏛️ TitanCouncil 智囊團研判報告: ${ticker}\n\n` : `# 🏛️ TitanCouncil Boardroom Report: ${ticker}\n\n`;
  results.forEach(r => {
    const sName = isZh ? r.sage.nameZh : r.sage.name;
    md += `### ${sName} — ${r.signal} (${r.confidence}%)\n`;
    md += `> "${r.quote}"\n\n`;
  });
  md += isZh ? `## 投資總監最終裁決\n` : `## Portfolio Manager Verdict\n`;
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


export function openSageProfile(sageId) {
  const sage = SAGES.find(s => s.id === sageId);
  if (!sage) return;

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
