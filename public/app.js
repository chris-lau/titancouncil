import { SAGES, PRESET_FILTERS, CANADIAN_TSE_STOCKS, GLOBAL_STOCKS, I18N } from './sages-data.js';

// Application State
const state = {
  selectedSageIds: new Set(SAGES.map(s => s.id)),
  activeFilter: 'all',
  ticker: 'NVDA',
  language: localStorage.getItem('sages_language') || 'en',
  financials: '',
  settings: {
    provider: localStorage.getItem('sages_provider') || 'demo',
    apiKey: localStorage.getItem('sages_api_key') || ''
  },
  currentAnalysis: null,
  isAnalyzing: false
};

// DOM Elements
const elements = {
  tickerInput: document.getElementById('tickerInput'),
  headerCompanyName: document.getElementById('headerCompanyName'),
  summonBtn: document.getElementById('summonBtn'),
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
    const cleanTicker = normalizeTicker(e.target.value);
    elements.headerCompanyName.textContent = getCompanyDetails(cleanTicker).name;
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
  localStorage.setItem('sages_language', lang);
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

function normalizeTicker(input) {
  let clean = input.replace('$', '').trim().toUpperCase();
  // Handle TSE prefix variations (e.g. TSE:SHOP -> SHOP.TO, TSX:RY -> RY.TO)
  if (clean.startsWith('TSE:') || clean.startsWith('TSX:')) {
    clean = clean.replace(/^(TSE|TSX):/, '') + '.TO';
  }
  return clean;
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

  localStorage.setItem('sages_provider', state.settings.provider);
  localStorage.setItem('sages_api_key', state.settings.apiKey);

  if (selectedLang !== state.language) {
    setLanguage(selectedLang);
  }

  elements.settingsModal.classList.add('hidden');
}

// Main Deliberation Trigger
async function handleSummon() {
  let rawTicker = elements.tickerInput.value.trim();
  if (!rawTicker) rawTicker = '$NVDA';
  const ticker = normalizeTicker(rawTicker);
  const companyInfo = getCompanyDetails(ticker);

  state.ticker = ticker;
  state.financials = elements.financialsInput.value.trim();
  state.isAnalyzing = true;

  elements.headerCompanyName.textContent = `${companyInfo.name} (${companyInfo.currency})`;
  elements.sageCardsGrid.innerHTML = '';
  
  const isZh = state.language === 'zh';
  elements.councilTallyText.textContent = isZh 
    ? `${state.selectedSageIds.size} 位大师正在研判`
    : `${state.selectedSageIds.size} Sages Deliberating`;

  elements.deliberationProgress.classList.remove('hidden');
  elements.statusMessage.textContent = isZh 
    ? `正在召集智囊团分析 ${ticker} (${companyInfo.name})...` 
    : `Summoning ${state.selectedSageIds.size} council members for ${ticker}...`;
  elements.progressBarFill.style.width = '20%';

  try {
    const selectedSages = SAGES.filter(s => state.selectedSageIds.has(s.id));

    if (state.settings.provider !== 'demo' && state.settings.apiKey) {
      await runCloudflareDeliberation(ticker, selectedSages, state.financials);
    } else {
      await runSimulatedDeliberation(ticker, selectedSages, state.financials, companyInfo);
    }
  } catch (err) {
    console.error('Deliberation error:', err);
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

  if (!response.ok) throw new Error('API failed');
  const data = await response.json();
  renderFullAnalysis(data);
}

// Built-in Intelligent Sages Engine with Full Canadian TSE + US Support
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
    elements.statusMessage.textContent = isZh ? `正在咨询 ${sage.nameZh}...` : `Consulting ${sage.name}...`;
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
          ? "加拿大银行业寡头垄断护城河极深，ROE 稳定在 15%+，分红复利超过百年，极具确定性。"
          : "Oligopoly banking moat in Canada with consistent 15%+ ROE and over a century of reliable dividend compounding.";
      } else if (flags.isNvda) {
        signal = "BULLISH"; confidence = 90;
        quote = isZh 
          ? "价格是你付出的，价值是你得到的。英伟达在 AI 时代的硬件生态壁垒极其宽广。"
          : "Price is what you pay. Value is what you get. NVIDIA's wide moat justifies the valuation for long-term holders.";
      } else if (flags.isShop) {
        signal = "NEUTRAL"; confidence = 70;
        quote = isZh 
          ? "商家电商生态极为出色，但自由现金流估值乘数目前未提供充足的安全边际。"
          : "Excellent merchant e-commerce ecosystem, but current valuation multiples leave limited margin of safety.";
      } else {
        signal = "NEUTRAL"; confidence = 68;
        quote = isZh 
          ? "严守能力圈原则，要求企业具备清晰的特许经营权与不低于 25% 的安全边际。"
          : "Strict circle of competence: requiring clear franchise moats and at least 25% margin of safety.";
      }
      break;

    case 'munger':
      if (flags.isCsu) {
        signal = "BULLISH"; confidence = 94;
        quote = isZh 
          ? "Constellation Software 是绝佳的多元思维模型范例：极高资本回报率加上精准的垂直软件并购复利。"
          : "Constellation Software is a textbook mental model winner: exceptional ROIC with programmatic VMS compounding.";
      } else if (flags.isNvda) {
        signal = "NEUTRAL"; confidence = 81;
        quote = isZh 
          ? "反过来想：什么会杀死这家公司？硬件周期的波动不可忽视。伟大企业亦需合理价格。"
          : "Invert: what kills this company? Hardware cycle concentration. A wonderful business, but priced for perfection.";
      } else {
        signal = "NEUTRAL"; confidence = 72;
        quote = isZh 
          ? "避免盲目从众。寻找具备不可替代品牌与强大定价权的超级企业。"
          : "Avoid crowd mania. Look for irreplaceable franchises with strong pricing power.";
      }
      break;

    case 'burry':
      if (flags.isEnb || flags.isRy) {
        signal = "BULLISH"; confidence = 84;
        quote = isZh 
          ? "能源管网与加拿大银行提供 6%-7% 的硬现金流收益率，EV/EBIT 处在合理区间，具备坚实防御性。"
          : "Canadian pipeline/banking infrastructure offers 6-7% real cash yields with protected volume franchises.";
      } else if (flags.isNvda || flags.isShop) {
        signal = "BEARISH"; confidence = 88;
        quote = isZh 
          ? "估值乘数处于历史高位，市场集中度过高隐藏了未来的需求悬崖，必须警惕下行风险。"
          : "Unprecedented concentration and market mania reminiscent of previous bubbles. Proceed with extreme caution.";
      } else {
        signal = "BEARISH"; confidence = 78;
        quote = isZh 
          ? "在废墟中寻找自由现金流收益率 >10% 的错价资产，拒绝追逐高溢价动量股。"
          : "Looking for mispriced assets with FCF yield > 10%. Refuse to pay premiums for momentum hype.";
      }
      break;

    case 'wood':
      if (flags.isShop || flags.isNvda) {
        signal = "BULLISH"; confidence = 95;
        quote = isZh 
          ? "Shopify 与英伟达处于全球数字化商业与算力革命的核心，TAM（总潜在市场）呈指数级爆发。"
          : "Shopify and NVIDIA are at the epicenter of exponential commerce and compute convergence. TAM expansion is massive.";
      } else if (flags.isRy || flags.isEnb) {
        signal = "NEUTRAL"; confidence = 60;
        quote = isZh 
          ? "传统金融与基础设施面临金融科技与绿色转型的长期颠覆，成长斜率相对平缓。"
          : "Legacy infrastructure and banking face fintech and energy transition disruption headwinds.";
      } else {
        signal = "NEUTRAL"; confidence = 65;
        quote = isZh 
          ? "评估研发支出是否能催生赢家通吃的平台网络效应。"
          : "Evaluating whether R&D creates winner-take-most platform network effects.";
      }
      break;

    case 'taleb':
      if (flags.isRy || flags.isCsu) {
        signal = "BULLISH"; confidence = 82;
        quote = isZh 
          ? "林迪效应（Lindy Effect）明显：历经百年危机洗礼依然稳健，具备极高的反脆弱性与下行防守力。"
          : "Strong Lindy effect: proven resilience across century-scale crises with robust antifragility.";
      } else if (flags.isNvda || flags.isShop) {
        signal = "BEARISH"; confidence = 79;
        quote = isZh 
          ? "系统存在隐形脆弱性：单点供应链与客户集中度隐藏肥尾风险（Fat Tails），不可将平静误以为无风险。"
          : "Fragility in the system is ignored. The distribution of returns has fat tails. High risk of negative black swan.";
      } else {
        signal = "NEUTRAL"; confidence = 70;
        quote = isZh 
          ? "透过‘否定法’剔除高杠杆与无切身利益关联（No skin in the game）的企业。"
          : "Apply via negativa: avoid excessive leverage and firms without insider skin in the game.";
      }
      break;

    case 'graham':
      if (flags.isRy || flags.isEnb) {
        signal = "BULLISH"; confidence = 80;
        quote = isZh 
          ? "P/E 位于 10-12x 区间，股息率 >6%，具备防御型投资者的安全边际。"
          : "P/E in 10-12x range with >6% dividend yield meets defensive investor criteria.";
      } else {
        signal = "BEARISH"; confidence = 89;
        quote = isZh 
          ? "股价显著高于格雷厄姆指数（Graham Number），缺乏传统清算与净流动资产（Net-Net）保护。"
          : "Price trades significantly above Graham Number and liquidation value. Margin of safety is missing.";
      }
      break;

    case 'lynch':
      signal = (flags.isShop || flags.isNvda || flags.isCsu) ? "BULLISH" : "NEUTRAL";
      confidence = 85;
      quote = isZh 
        ? "典型的快速成长股或稳健型支柱企业，商业逻辑简单明了，各行各业都离不开它的服务。"
        : "Fast grower or stalwart category. Everyday understandability with multi-year organic growth runway.";
      break;

    case 'druckenmiller':
      signal = "BULLISH"; confidence = 84;
      quote = isZh 
        ? "宏观流动性与盈利预期持续上修，非对称回报比显著，顺势而为。"
        : "Secular liquidity and uninterrupted upward estimate revisions create compelling asymmetric momentum.";
      break;

    case 'ackman':
      signal = "BULLISH"; confidence = 78;
      quote = isZh 
        ? "行业龙头地位不可动摇，现金流极为充沛且具有对抗通胀的强大调价能力。"
        : "Dominant market leadership with predictable cash generation and strong inflation-hedging pricing power.";
      break;

    case 'fisher':
      signal = "BULLISH"; confidence = 82;
      quote = isZh 
        ? "草根调研（Scuttlebutt）确认其客户粘性极高，研发管线产出比卓越，管理层深具远见。"
        : "Scuttlebutt research confirms extraordinary R&D pipeline and unmatched customer stickiness.";
      break;

    case 'pabrai':
      if (flags.isRy || flags.isEnb) {
        signal = "BULLISH"; confidence = 82;
        quote = isZh 
          ? "符合低风险原则（Dhandho）：下行空间极其有限，股息收益确凿。"
          : "Passes Dhandho test: limited downside risk with reliable cash yield stream.";
      } else {
        signal = "BEARISH"; confidence = 85;
        quote = isZh 
          ? "当前估值未能提供 50% 的安全边际，耐心等待市场因短期不确定性产生错杀。"
          : "Fails the Dhandho rule: 'Heads I win, tails I lose a lot' at elevated multiples.";
      }
      break;

    case 'damodaran':
      signal = "NEUTRAL"; confidence = 78;
      quote = isZh 
        ? "现金流折现（DCF）模型要求未来十年维持高速复合增长才能支撑当前市值，故事需与数字谨慎校准。"
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
      <div class="mockup-avatar-circle avatar-halo-${signalLower}">
        ${sage.fallbackIcon}
      </div>
      <div class="card-sage-info">
        <h4 class="card-sage-name">${displayName}</h4>
        <span class="mockup-badge-pill badge-${signalLower}">${signalText}</span>
      </div>
    </div>

    <div class="card-confidence-wrap">
      <div class="confidence-text">${confidence}% ${isZh ? '确信度' : 'Confidence'}</div>
      <div class="confidence-line-bg">
        <div class="confidence-line-fill ${signalLower}" style="width: ${confidence}%"></div>
      </div>
    </div>

    <p class="card-quote-text">"${quote}"</p>
  `;

  elements.sageCardsGrid.appendChild(card);
}

function updatePortfolioManagerSidebar(results, ticker, flags, isZh) {
  const bullish = results.filter(r => r.signal === 'BULLISH').length;
  const bearish = results.filter(r => r.signal === 'BEARISH').length;

  const isCanadian = flags.isCanadian;
  const currencySymbol = isCanadian ? 'C$' : '$';

  if (flags.isNvda) {
    elements.riskLevelText.textContent = isZh ? "中度风险 / 稳健偏好" : "Moderate Risk";
    elements.horizonValText.textContent = isZh ? "中期 (1-3年)" : "Medium Term";
    elements.entryZoneText.textContent = `${currencySymbol}780 - ${currencySymbol}810`;
    elements.stopLossText.textContent = `${currencySymbol}715`;
    elements.convictionValueText.textContent = isZh ? "高 (84%)" : "High (84%)";
    elements.actionBadgeBox.textContent = isZh ? "执行操作: 逢回调分批建仓" : "ACTION: ACCUMULATE ON DIPS";
  } else if (flags.isShop) {
    elements.riskLevelText.textContent = isZh ? "中高成长 / 科技动量" : "Growth Risk";
    elements.horizonValText.textContent = isZh ? "中长期 (2-4年)" : "Med-Long Term";
    elements.entryZoneText.textContent = `${currencySymbol}90 - ${currencySymbol}98`;
    elements.stopLossText.textContent = `${currencySymbol}82`;
    elements.convictionValueText.textContent = isZh ? "良好 (78%)" : "Good (78%)";
    elements.actionBadgeBox.textContent = isZh ? "执行操作: 定投或突破跟进" : "ACTION: DCA & GROWTH HOLD";
  } else if (flags.isRy || flags.isEnb || flags.isCsu) {
    elements.riskLevelText.textContent = isZh ? "低风险 / 高股息防御" : "Low Risk (Defensive)";
    elements.horizonValText.textContent = isZh ? "长期持有 (3-5年以上)" : "Long Term (3-5Y+)";
    elements.entryZoneText.textContent = isZh ? "现价区间定投" : "Current Support";
    elements.stopLossText.textContent = "-12% Stop";
    elements.convictionValueText.textContent = isZh ? "极高 (88%)" : "Very High (88%)";
    elements.actionBadgeBox.textContent = isZh ? "执行操作: 买入并长期复利持有" : "ACTION: BUY & COMPOUND";
  } else if (bullish > bearish) {
    elements.riskLevelText.textContent = isZh ? "中低风险" : "Low-Mod Risk";
    elements.horizonValText.textContent = isZh ? "长期 (3-5年)" : "Long Term";
    elements.entryZoneText.textContent = "Support Basis";
    elements.stopLossText.textContent = "-15% Stop";
    elements.convictionValueText.textContent = isZh ? "高 (85%)" : "High (85%)";
    elements.actionBadgeBox.textContent = isZh ? "执行操作: 买入持有" : "ACTION: BUY & HOLD";
  } else {
    elements.riskLevelText.textContent = isZh ? "谨慎 / 波动较高" : "Elevated Risk";
    elements.horizonValText.textContent = isZh ? "观察期" : "Watch Period";
    elements.entryZoneText.textContent = "Wait Pullback";
    elements.stopLossText.textContent = "-10% Stop";
    elements.convictionValueText.textContent = isZh ? "中性 (55%)" : "Neutral (55%)";
    elements.actionBadgeBox.textContent = isZh ? "执行操作: 保持观望" : "ACTION: WATCH & WAIT";
  }

  state.currentAnalysis = { ticker, results };
}

function copyMarkdownReport() {
  if (!state.currentAnalysis) return;
  const { ticker, results } = state.currentAnalysis;
  const isZh = state.language === 'zh';

  let md = isZh ? `# 🧙 Market Sages 智囊团研判报告: ${ticker}\n\n` : `# 🧙 Market Sages Council: ${ticker}\n\n`;
  results.forEach(r => {
    const sName = isZh ? r.sage.nameZh : r.sage.name;
    md += `### ${sName} — ${r.signal} (${r.confidence}%)\n`;
    md += `> "${r.quote}"\n\n`;
  });
  md += isZh ? `## 投资总监最终裁决\n` : `## Portfolio Manager Verdict\n`;
  md += `- **Action**: ${elements.actionBadgeBox.textContent}\n`;
  md += `- **Conviction**: ${elements.convictionValueText.textContent}\n`;
  md += `- **Entry**: ${elements.entryZoneText.textContent} | **Stop Loss**: ${elements.stopLossText.textContent}\n`;

  navigator.clipboard.writeText(md).then(() => {
    elements.copyReportBtn.textContent = isZh ? '✅ 已复制!' : '✅ Copied!';
    setTimeout(() => {
      elements.copyReportBtn.textContent = isZh ? '📋 复制 Markdown' : '📋 Copy Markdown';
    }, 2000);
  });
}

document.addEventListener('DOMContentLoaded', init);
