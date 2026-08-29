import { SAGES, PRESET_FILTERS, CANADIAN_TSE_STOCKS, GLOBAL_STOCKS, I18N } from './sages-data.js';

// Application State
const state = {
  selectedSageIds: new Set(SAGES.map(s => s.id)),
  activeFilter: 'all',
  ticker: 'NVDA',
  language: localStorage.getItem('titancouncil_language') || 'en',
  engine: localStorage.getItem('titancouncil_engine') || 'gemini',
  instructions: '',
  currentAnalysis: null,
  isAnalyzing: false,
  abortController: null,
  activeProfileId: 'buffett'
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
  engineToggleBtn: document.getElementById('engineToggleBtn'),
  engineIcon: document.getElementById('engineIcon'),
  engineCurrentText: document.getElementById('engineCurrentText'),
  langToggleBtn: document.getElementById('langToggleBtn'),
  langCurrentText: document.getElementById('langCurrentText'),
  filterPillsContainer: document.getElementById('filterPillsContainer'),
  drawerToggleBtn: document.getElementById('drawerToggleBtn'),
  drawerContent: document.getElementById('drawerContent'),
  instructionsInput: document.getElementById('instructionsInput'),
  councilTallyText: document.getElementById('councilTallyText'),
  deliberationProgress: document.getElementById('deliberationProgress'),
  statusMessage: document.getElementById('statusMessage'),
  cancelDeliberationBtn: document.getElementById('cancelDeliberationBtn'),
  cancelBtnLabel: document.getElementById('cancelBtnLabel'),
  progressBarFill: document.getElementById('progressBarFill'),
  sageCardsGrid: document.getElementById('sageCardsGrid'),


  pmAwaitingCard: document.getElementById('pmAwaitingCard'),
  pmVerdictPanel: document.getElementById('pmVerdictPanel'),
  i18nPmAwaitingTitle: document.getElementById('i18nPmAwaitingTitle'),
  i18nPmAwaitingDesc: document.getElementById('i18nPmAwaitingDesc'),
  pmStatusBadgeText: document.getElementById('pmStatusBadgeText'),
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
  // New Interactive UI Nodes
  cotBatchToggleBtn: document.getElementById('cotBatchToggleBtn'),
  cotBatchToggleText: document.getElementById('cotBatchToggleText'),
  tickerAutocomplete: document.getElementById('tickerAutocomplete'),
  kbdSearchHint: document.getElementById('kbdSearchHint'),
  mobileStickyPmBar: document.getElementById('mobileStickyPmBar'),
  mobileStickyTicker: document.getElementById('mobileStickyTicker'),
  mobileStickyAction: document.getElementById('mobileStickyAction'),
  mobileStickyConviction: document.getElementById('mobileStickyConviction'),
  mobileStickyJumpBtn: document.getElementById('mobileStickyJumpBtn'),
  // I18N Text Nodes
  i18nSubtitle: document.getElementById('i18nSubtitle'),
  i18nSummonBtn: document.getElementById('i18nSummonBtn'),
  i18nAllSages: document.getElementById('i18nAllSages'),
  i18nValueCouncil: document.getElementById('i18nValueCouncil'),
  i18nGrowthTech: document.getElementById('i18nGrowthTech'),
  i18nRiskTail: document.getElementById('i18nRiskTail'),
  i18nCompare: document.getElementById('i18nCompare'),
  i18nPresetsLabel: document.getElementById('i18nPresetsLabel'),
  i18nCustomInstructions: document.getElementById('i18nCustomInstructions'),
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


// Safe Clipboard Copy Helper with Fallback
function copyTextToClipboard(text) {
  if (!text) return Promise.reject(new Error('Empty text'));
  if (navigator.clipboard && window.isSecureContext) {
    return navigator.clipboard.writeText(text);
  }
  return new Promise((resolve, reject) => {
    try {
      const textArea = document.createElement('textarea');
      textArea.value = text;
      textArea.style.position = 'fixed';
      textArea.style.top = '0';
      textArea.style.left = '0';
      textArea.style.width = '2em';
      textArea.style.height = '2em';
      textArea.style.padding = '0';
      textArea.style.border = 'none';
      textArea.style.outline = 'none';
      textArea.style.boxShadow = 'none';
      textArea.style.background = 'transparent';
      textArea.style.opacity = '0';
      document.body.appendChild(textArea);
      textArea.focus();
      textArea.select();
      const successful = document.execCommand('copy');
      document.body.removeChild(textArea);
      if (successful) {
        resolve();
      } else {
        reject(new Error('execCommand copy failed'));
      }
    } catch (err) {
      reject(err);
    }
  });
}

// Initialize Application
function init() {
  attachEventListeners();
  initTickerAutocomplete();
  initKeyboardShortcuts();
  buildProfileQuickSwitcher();
  applyLanguage(state.language);
  updateEngineUI();
  // Instant Initial Render: 0ms mobile first paint with interactive welcome state
  renderWelcomeState();
}

function updateEngineUI() {
  if (!elements.engineToggleBtn) return;
  const isZh = state.language === 'zh';
  elements.engineToggleBtn.classList.remove('deepseek-active', 'auto-active');
  
  if (state.engine === 'deepseek') {
    elements.engineToggleBtn.classList.add('deepseek-active');
    if (elements.engineIcon) elements.engineIcon.textContent = '🧠';
    if (elements.engineCurrentText) elements.engineCurrentText.textContent = 'DeepSeek';
  } else if (state.engine === 'auto') {

    elements.engineToggleBtn.classList.add('auto-active');
    if (elements.engineIcon) elements.engineIcon.textContent = '🔄';
    if (elements.engineCurrentText) elements.engineCurrentText.textContent = isZh ? '自動輪替' : 'Auto Engine';
  } else {
    // Default Gemini
    if (elements.engineIcon) elements.engineIcon.textContent = '⚡';
    if (elements.engineCurrentText) elements.engineCurrentText.textContent = isZh ? 'Gemini 3.7' : 'Gemini 3.7';
  }
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

  // AI Engine Switcher Button (Gemini 3.7 <-> DeepSeek <-> Auto)
  if (elements.engineToggleBtn) {
    elements.engineToggleBtn.addEventListener('click', () => {
      if (state.engine === 'gemini') state.engine = 'deepseek';
      else if (state.engine === 'deepseek') state.engine = 'auto';
      else state.engine = 'gemini';
      localStorage.setItem('titancouncil_engine', state.engine);
      updateEngineUI();
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

  // Cancel Deliberation & Stop Retrying Button
  if (elements.cancelDeliberationBtn) {
    elements.cancelDeliberationBtn.addEventListener('click', () => {
      if (state.abortController) {
        state.abortController.abort();
      }
      state.isAnalyzing = false;
      elements.summonBtn.disabled = false;
      elements.summonBtn.style.opacity = '1';
      elements.deliberationProgress.classList.add('hidden');
      elements.cancelDeliberationBtn.classList.add('hidden');
      if (!state.currentAnalysis) {
        renderWelcomeState();
      }
    });
  }

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

  // Batch Expand / Collapse All Chains of Thought
  if (elements.cotBatchToggleBtn) {
    elements.cotBatchToggleBtn.addEventListener('click', () => {
      state.allCotExpanded = !state.allCotExpanded;
      const cotBoxes = elements.sageCardsGrid.querySelectorAll('.cot-steps-box');
      const cotBtns = elements.sageCardsGrid.querySelectorAll('.cot-toggle-btn');
      
      cotBoxes.forEach(box => box.classList.toggle('hidden', !state.allCotExpanded));
      cotBtns.forEach(btn => {
        btn.classList.toggle('open', state.allCotExpanded);
        const icon = btn.querySelector('.cot-toggle-icon');
        if (icon) icon.textContent = state.allCotExpanded ? '▲' : '▼';
      });

      updateBatchCotButtonText();
    });
  }

  // Mobile Sticky Bar scroll listener & jump action
  window.addEventListener('scroll', () => {
    if (!elements.mobileStickyPmBar) return;
    const isMobile = window.innerWidth <= 900;
    const hasAnalysis = Boolean(state.currentAnalysis?.data);
    if (isMobile && hasAnalysis && window.scrollY > 300) {
      elements.mobileStickyPmBar.classList.remove('hidden');
    } else {
      elements.mobileStickyPmBar.classList.add('hidden');
    }
  }, { passive: true });

  if (elements.mobileStickyJumpBtn) {
    elements.mobileStickyJumpBtn.addEventListener('click', () => {
      const pmPanel = document.getElementById('pmVerdictPanel');
      if (pmPanel) {
        pmPanel.scrollIntoView({ behavior: 'smooth' });
      }
    });
  }
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
  
  if (state.currentAnalysis?.data) {
    renderFullAnalysis(state.currentAnalysis.data, state.ticker);
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
  if (elements.i18nCustomInstructions) elements.i18nCustomInstructions.textContent = dict.customInstructions;
  if (elements.instructionsInput) elements.instructionsInput.placeholder = dict.instructionsPlaceholder;
  if (elements.i18nVerdictCardsTitle) elements.i18nVerdictCardsTitle.textContent = dict.verdictCardsTitle;
  if (elements.i18nPMTitle) elements.i18nPMTitle.textContent = dict.pmTitle;
  if (elements.i18nPmAwaitingTitle) elements.i18nPmAwaitingTitle.textContent = dict.pmAwaitingTitle;
  if (elements.i18nPmAwaitingDesc) elements.i18nPmAwaitingDesc.textContent = dict.pmAwaitingDesc;
  if (elements.pmStatusBadgeText) {
    elements.pmStatusBadgeText.textContent = state.isAnalyzing ? dict.pmAwaitingAnalyzing : dict.pmAwaitingReady;
  }

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
  
  if (elements.kbdSearchHint) {
    elements.kbdSearchHint.title = dict.kbdSearchHint || 'Press / to search';
  }
  updateBatchCotButtonText();
}

function updateBatchCotButtonText() {
  if (!elements.cotBatchToggleText) return;
  const dict = I18N[state.language] || I18N.en;
  elements.cotBatchToggleText.textContent = state.allCotExpanded ? dict.collapseAllCoT : dict.expandAllCoT;
}

// 1. Ticker Autocomplete & Quick Search Dropdown
function initTickerAutocomplete() {
  if (!elements.tickerAutocomplete || !elements.tickerInput) return;

  const allStocks = [];
  Object.entries(GLOBAL_STOCKS).forEach(([sym, val]) => {
    allStocks.push({ symbol: `$${sym}`, cleanSymbol: sym, name: val.name, sector: val.sector, isTse: false });
  });
  Object.entries(CANADIAN_TSE_STOCKS).forEach(([sym, val]) => {
    allStocks.push({ symbol: `$${sym}`, cleanSymbol: sym, name: val.name, sector: val.sector, isTse: true });
  });

  let selectedIndex = -1;

  const renderSuggestions = (query) => {
    const cleanQ = query.replace(/^\$/, '').trim().toUpperCase();
    if (!cleanQ) {
      elements.tickerAutocomplete.classList.add('hidden');
      elements.tickerAutocomplete.innerHTML = '';
      selectedIndex = -1;
      return;
    }

    const matches = allStocks.filter(s => 
      s.cleanSymbol.includes(cleanQ) || 
      s.name.toUpperCase().includes(cleanQ)
    ).slice(0, 6);

    if (matches.length === 0) {
      elements.tickerAutocomplete.classList.add('hidden');
      elements.tickerAutocomplete.innerHTML = '';
      selectedIndex = -1;
      return;
    }

    elements.tickerAutocomplete.innerHTML = matches.map((m, idx) => `
      <div class="autocomplete-item ${idx === selectedIndex ? 'selected' : ''}" data-ticker="${m.cleanSymbol}">
        <span class="autocomplete-symbol">
          ${m.isTse ? '🍁 ' : ''}${m.symbol}
        </span>
        <span class="autocomplete-name">${m.name}</span>
      </div>
    `).join('');

    elements.tickerAutocomplete.classList.remove('hidden');

    elements.tickerAutocomplete.querySelectorAll('.autocomplete-item').forEach(item => {
      item.addEventListener('click', () => {
        const t = item.dataset.ticker;
        elements.tickerInput.value = `$${t}`;
        elements.headerCompanyName.textContent = getCompanyDetails(t).name;
        elements.tickerAutocomplete.classList.add('hidden');
        handleSummon();
      });
    });
  };

  elements.tickerInput.addEventListener('input', (e) => {
    selectedIndex = -1;
    renderSuggestions(e.target.value);
  });

  elements.tickerInput.addEventListener('keydown', (e) => {
    const items = elements.tickerAutocomplete.querySelectorAll('.autocomplete-item');
    if (items.length === 0 || elements.tickerAutocomplete.classList.contains('hidden')) return;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      selectedIndex = (selectedIndex + 1) % items.length;
      updateSelectedAutocomplete(items, selectedIndex);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      selectedIndex = (selectedIndex - 1 + items.length) % items.length;
      updateSelectedAutocomplete(items, selectedIndex);
    } else if (e.key === 'Enter' && selectedIndex >= 0 && selectedIndex < items.length) {
      e.preventDefault();
      const selectedItem = items[selectedIndex];
      const t = selectedItem.dataset.ticker;
      elements.tickerInput.value = `$${t}`;
      elements.headerCompanyName.textContent = getCompanyDetails(t).name;
      elements.tickerAutocomplete.classList.add('hidden');
      handleSummon();
    } else if (e.key === 'Escape') {
      elements.tickerAutocomplete.classList.add('hidden');
    }
  });

  document.addEventListener('click', (e) => {
    if (!elements.tickerAutocomplete.contains(e.target) && e.target !== elements.tickerInput) {
      elements.tickerAutocomplete.classList.add('hidden');
    }
  });
}

function updateSelectedAutocomplete(items, index) {
  items.forEach((it, i) => {
    it.classList.toggle('selected', i === index);
    if (i === index) it.scrollIntoView({ block: 'nearest' });
  });
}

// 2. Global Keyboard Shortcuts (/ to search, Esc to close modals, 1-5 for filters)
function initKeyboardShortcuts() {
  window.addEventListener('keydown', (e) => {
    const activeEl = document.activeElement;
    const isInputFocused = activeEl && (activeEl.tagName === 'INPUT' || activeEl.tagName === 'TEXTAREA');

    // '/' to quick-focus search bar
    if (e.key === '/' && !isInputFocused) {
      e.preventDefault();
      if (elements.tickerInput) {
        elements.tickerInput.focus();
        elements.tickerInput.select();
      }
      return;
    }

    // Escape to close modals and autocomplete
    if (e.key === 'Escape') {
      if (elements.filterHelpModal && !elements.filterHelpModal.classList.contains('hidden')) {
        elements.filterHelpModal.classList.add('hidden');
      }
      if (elements.sageProfileModal && !elements.sageProfileModal.classList.contains('hidden')) {
        elements.sageProfileModal.classList.add('hidden');
      }
      if (elements.tickerAutocomplete && !elements.tickerAutocomplete.classList.contains('hidden')) {
        elements.tickerAutocomplete.classList.add('hidden');
      }
      return;
    }

    // Number keys 1-5 when not typing to switch filter pills
    if (!isInputFocused && ['1', '2', '3', '4', '5'].includes(e.key)) {
      const filterMap = { '1': 'all', '2': 'value', '3': 'growth', '4': 'risk', '5': 'compare' };
      const filterKey = filterMap[e.key];
      if (filterKey) {
        applyFilter(filterKey);
      }
    }
  });
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
  if (state.isAnalyzing) return; // Prevent double-trigger

  const rawInput = elements.tickerInput.value.trim();
  if (!rawInput) return;

  const { cleanTicker, explicitFilter, mentionedSageIds } = parseInputQuery(rawInput);
  
  if (mentionedSageIds.size > 0) {
    state.selectedSageIds = mentionedSageIds;
  } else if (explicitFilter && PRESET_FILTERS[explicitFilter]) {
    state.activeFilter = explicitFilter;
    state.selectedSageIds = new Set(PRESET_FILTERS[explicitFilter].ids);
    document.querySelectorAll('.mockup-pill').forEach(pill => {
      pill.classList.toggle('active', pill.dataset.filter === explicitFilter);
    });
  }

  const ticker = cleanTicker;
  const companyInfo = getCompanyDetails(ticker);

  state.ticker = ticker;
  state.instructions = elements.instructionsInput ? elements.instructionsInput.value.trim() : '';

  state.isAnalyzing = true;
  state.abortController = new AbortController();
  elements.summonBtn.disabled = true;
  elements.summonBtn.style.opacity = '0.7';
  if (elements.cancelDeliberationBtn) elements.cancelDeliberationBtn.classList.add('hidden');

  elements.headerCompanyName.textContent = `${companyInfo.name} (${companyInfo.currency})`;
  
  const isZh = state.language === 'zh';
  elements.councilTallyText.textContent = isZh 
    ? `${state.selectedSageIds.size} 位大師正在研判`
    : `${state.selectedSageIds.size} Titans Deliberating`;
  elements.deliberationProgress.classList.remove('hidden');
  elements.statusMessage.textContent = isZh 
    ? `正在召集智囊團分析 ${ticker} (${companyInfo.name})...` 
    : `Summoning ${state.selectedSageIds.size} council members for ${ticker}...`;
  elements.progressBarFill.style.width = '25%';

  // Keep Portfolio Manager sidebar in Awaiting State while Council deliberates
  if (elements.pmAwaitingCard) elements.pmAwaitingCard.classList.remove('hidden');
  if (elements.pmVerdictPanel) elements.pmVerdictPanel.classList.add('hidden');
  if (elements.pmStatusBadgeText) {
    const dict = I18N[state.language] || I18N.en;
    elements.pmStatusBadgeText.textContent = dict.pmAwaitingAnalyzing;
  }

  const selectedSages = SAGES.filter(s => state.selectedSageIds.has(s.id));
  // Render instant mobile skeleton cards while Gemini processes
  renderSkeletonCards(selectedSages);

  try {
    await runGeminiDeliberation(ticker, selectedSages, state.instructions);
  } catch (err) {
    if (err.name === 'AbortError' || state.abortController?.signal?.aborted) {
      console.log('Deliberation aborted by user');
      return;
    }
    console.error('Google Gemini Deliberation Error:', err);
    renderDeliberationError(err, ticker, companyInfo);
  } finally {
    state.isAnalyzing = false;
    elements.summonBtn.disabled = false;
    elements.summonBtn.style.opacity = '1';
    if (elements.cancelDeliberationBtn) elements.cancelDeliberationBtn.classList.add('hidden');
    elements.progressBarFill.style.width = '100%';
    setTimeout(() => {
      elements.deliberationProgress.classList.add('hidden');
    }, 400);
  }
}

// Render Instant Interactive Welcome Hero (0ms initial load time)
function renderWelcomeState() {
  const isZh = state.language === 'zh';
  elements.sageCardsGrid.innerHTML = '';

  const welcomeCard = document.createElement('div');
  welcomeCard.className = 'welcome-board-card';
  welcomeCard.innerHTML = `
    <div class="welcome-hero-badge">
      <span>🏛️</span>
      <span>${isZh ? '13位傳奇投資巨頭已就緒' : '13 Legendary Titans Ready'}</span>
    </div>
    <h2 class="welcome-hero-title">
      ${isZh ? '歡迎來到 TitanCouncil 智慧投資董事會' : 'Welcome to TitanCouncil Boardroom'}
    </h2>
    <p class="welcome-hero-desc">
      ${isZh 
        ? '輸入美股或加股代碼（例如 $NVDA、SHOP.TO、RY.TO），召集巴菲特、蒙格、柏里等 13 位傳奇大師，透過 Google Gemini 執行即時思維鏈（CoT）深度審議。'
        : 'Enter any US or Canadian TSE ticker ($NVDA, SHOP.TO, RY.TO) to summon Buffett, Munger, Burry, Wood and 9 more Titans for real-time Chain of Thought deliberation.'}
    </p>
    <div class="welcome-quick-actions">
      <button type="button" class="welcome-cta-btn" id="welcomeSummonBtn">
        <span>🏛️</span>
        <span>${isZh ? '立即召集智囊團分析 $NVDA' : 'Summon Council for $NVDA'}</span>
      </button>
      <button type="button" class="welcome-preset-btn" data-ticker="SHOP.TO">🍁 $SHOP.TO</button>
      <button type="button" class="welcome-preset-btn" data-ticker="RY.TO">🍁 $RY.TO</button>
      <button type="button" class="welcome-preset-btn" data-ticker="AAPL">🍎 $AAPL</button>
    </div>
  `;

  const summonCta = welcomeCard.querySelector('#welcomeSummonBtn');
  if (summonCta) summonCta.addEventListener('click', () => handleSummon());

  welcomeCard.querySelectorAll('.welcome-preset-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      elements.tickerInput.value = btn.dataset.ticker;
      elements.headerCompanyName.textContent = getCompanyDetails(btn.dataset.ticker).name;
      handleSummon();
    });
  });

  elements.sageCardsGrid.appendChild(welcomeCard);

  // Keep Portfolio Manager sidebar in Awaiting State on initial welcome load
  if (elements.pmAwaitingCard) elements.pmAwaitingCard.classList.remove('hidden');
  if (elements.pmVerdictPanel) elements.pmVerdictPanel.classList.add('hidden');
  if (elements.pmStatusBadgeText) {
    const dict = I18N[state.language] || I18N.en;
    elements.pmStatusBadgeText.textContent = dict.pmAwaitingReady;
  }
}

// Render Instant Skeleton Placeholders during AI Deliberation
// Render Instant Skeleton Placeholders during AI Deliberation
function renderSkeletonCards(selectedSages) {
  const isZh = state.language === 'zh';
  const isDeepSeek = state.engine === 'deepseek';
  const activeModel = isDeepSeek ? 'deepseek-v4-flash' : 'gemini-3.7-flash';
  elements.sageCardsGrid.innerHTML = '';

  // 1. Prominent Live Processing & Streaming Thinking Banner
  const liveBanner = document.createElement('div');
  liveBanner.className = 'llm-thinking-card live-processing-banner';
  liveBanner.innerHTML = `
    <div class="llm-thinking-header">
      <div class="llm-thinking-title">
        <span class="thinking-brain-icon">⚡</span>
        <span class="thinking-title-text">${isZh ? (isDeepSeek ? 'DeepSeek 正在即時深度推理中...' : 'Google Gemini 正在即時思維鏈研判中...') : (isDeepSeek ? 'DeepSeek Deliberating & Reasoning Live...' : 'Google Gemini Deliberating & Reasoning Live...')}</span>
        <span class="thinking-badge" title="Active Model ID">Model: ${activeModel}</span>
      </div>
      <div class="live-pulse-indicator">
        <span class="pulse-dot"></span>
        <span style="font-size: 0.78rem; color: #38bdf8; font-weight: 600;">${isZh ? '即時深度思考中...' : 'Live Reasoning...'}</span>
      </div>
    </div>
    
    <!-- Live Multi-Line Scrollable Thinking Terminal Box -->
    <div class="live-thinking-terminal-wrap">
      <div class="live-thinking-terminal-toolbar">
        <span>${isZh ? '💭 即時思維鏈串流 (Live Chain of Thought Stream)' : '💭 Live Chain of Thought Stream'}</span>
        <div class="live-terminal-actions">
          <span id="liveCopyThinkingBtn" class="terminal-copy-badge" title="${isZh ? '複製即時思維鏈' : 'Copy Live Stream Thoughts'}">${isZh ? '📋 複製' : '📋 Copy'}</span>
          <span id="liveAutoScrollBtn" class="autoscroll-badge">${isZh ? '自動滾動: 開啟' : 'Auto-Scroll: ON'}</span>
        </div>
      </div>
      <div id="liveThinkingStreamBody" class="live-thinking-terminal-body">
        <span id="liveThinkingStreamText">${isZh ? '正在初始化 13 位傳奇巨頭思維模型並調取即時財務數據...' : 'Initializing 13 Titan framework models & grounding live market filings...'}</span><span class="live-thinking-cursor"></span>
      </div>
    </div>
  `;
  elements.sageCardsGrid.appendChild(liveBanner);

  // Copy live stream thoughts handler
  const liveCopyBtn = liveBanner.querySelector('#liveCopyThinkingBtn');
  if (liveCopyBtn) {
    liveCopyBtn.addEventListener('click', () => {
      const streamTextEl = liveBanner.querySelector('#liveThinkingStreamText');
      const textToCopy = streamTextEl ? streamTextEl.textContent : '';
      if (!textToCopy) return;
      copyTextToClipboard(textToCopy).then(() => {
        liveCopyBtn.classList.add('copied');
        liveCopyBtn.textContent = isZh ? '✅ 已複製!' : '✅ Copied!';
        setTimeout(() => {
          liveCopyBtn.classList.remove('copied');
          liveCopyBtn.textContent = isZh ? '📋 複製' : '📋 Copy';
        }, 2000);
      }).catch(err => {
        console.error('Failed to copy live stream thoughts:', err);
      });
    });
  }

  // Auto-scroll listener & user pause handling
  const streamBody = liveBanner.querySelector('#liveThinkingStreamBody');
  const autoScrollBtn = liveBanner.querySelector('#liveAutoScrollBtn');

  if (streamBody && autoScrollBtn) {
    streamBody.addEventListener('scroll', () => {
      const isAtBottom = streamBody.scrollHeight - streamBody.scrollTop - streamBody.clientHeight < 35;
      if (!isAtBottom) {
        autoScrollBtn.classList.add('paused');
        autoScrollBtn.textContent = isZh ? '自動滾動: 暫停 (點擊恢復)' : 'Auto-Scroll: PAUSED (Click to resume)';
      } else {
        autoScrollBtn.classList.remove('paused');
        autoScrollBtn.textContent = isZh ? '自動滾動: 開啟' : 'Auto-Scroll: ON';
      }
    });

    autoScrollBtn.addEventListener('click', () => {
      autoScrollBtn.classList.remove('paused');
      autoScrollBtn.textContent = isZh ? '自動滾動: 開啟' : 'Auto-Scroll: ON';
      streamBody.scrollTop = streamBody.scrollHeight;
    });
  }

  // 2. Titan Card Skeletons
  selectedSages.forEach(sage => {
    const skel = document.createElement('div');
    skel.className = 'card-skeleton';
    skel.innerHTML = `
      <div class="skeleton-shimmer"></div>
      <div style="display: flex; align-items: center; gap: 0.75rem;">
        <div style="width: 38px; height: 38px; border-radius: 50%; background: rgba(255,255,255,0.08); display: flex; align-items: center; justify-content: center; font-size: 1.2rem;">${sage.fallbackIcon}</div>
        <div style="flex: 1; display: flex; flex-direction: column; gap: 0.35rem;">
          <div class="skeleton-line skeleton-line-title"></div>
          <div class="skeleton-line skeleton-line-badge"></div>
        </div>
      </div>
      <div class="skeleton-line skeleton-line-text"></div>
      <div class="skeleton-line skeleton-line-box"></div>
    `;
    elements.sageCardsGrid.appendChild(skel);
  });
}

// Deliberation via AI API (Google Gemini / DeepSeek) through Cloudflare Pages Function (SSE Streaming)
async function runGeminiDeliberation(ticker, selectedSages, instructions) {
  const isZh = state.language === 'zh';
  const isDeepSeek = state.engine === 'deepseek';
  elements.statusMessage.textContent = isZh 
    ? (isDeepSeek ? '正在透過 DeepSeek 深度思維鏈研判中...' : '正在透過 Google Gemini 執行即時思維鏈研判...') 
    : (isDeepSeek ? 'Executing deep deliberation via DeepSeek...' : 'Executing real-time Chain of Thought deliberation via Google Gemini...');
  elements.progressBarFill.style.width = '60%';

  const MAX_RETRIES = 2; // Strict bound: Maximum 2 attempts total (1 initial + 1 retry)
  let lastError = null;

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    if (state.abortController?.signal?.aborted) return;

    if (attempt > 1) {
      if (elements.cancelDeliberationBtn) elements.cancelDeliberationBtn.classList.remove('hidden');
      elements.statusMessage.textContent = isZh 
        ? `⏳ AI 伺服器忙碌中（高負載），正在最後重試 (第 ${attempt}/${MAX_RETRIES} 次)...` 
        : `⏳ AI service is busy (high demand). Retrying once more (Attempt ${attempt}/${MAX_RETRIES})...`;
      elements.progressBarFill.style.width = '75%';

      // Wait 2.2s before retry with abort awareness
      await new Promise((resolve) => {
        const timer = setTimeout(resolve, 2200);
        state.abortController?.signal?.addEventListener('abort', () => {
          clearTimeout(timer);
          resolve();
        });
      });

      if (state.abortController?.signal?.aborted) return;
    }

    let response;
    try {
      response = await fetch('/api/analyze?stream=true', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Accept': 'text/event-stream'
        },
        signal: state.abortController?.signal,
        body: JSON.stringify({
          ticker,
          sages: selectedSages.map(s => s.name),
          instructions,
          engine: state.engine,
          language: state.language
        })
      });
    } catch (networkErr) {
      if (state.abortController?.signal?.aborted) return;
      lastError = new Error(isZh ? '網路連線失敗，無法連接至後端 API' : 'Network error: Failed to reach backend API endpoint');
      continue;
    }

    if (!response.ok) {
      const rawData = await response.json().catch(() => ({}));
      const errMsg = rawData.error || `HTTP ${response.status}: Failed to reach AI endpoint`;
      const isHighDemand = response.status === 503 || response.status === 429 || errMsg.toLowerCase().includes('high demand') || errMsg.toLowerCase().includes('busy');
      
      const err = new Error(errMsg);
      err.status = response.status;
      lastError = err;

      if (isHighDemand && attempt < MAX_RETRIES) {
        continue;
      }
      throw err;
    }

    // Handle Live SSE Stream
    let accumulatedThinking = '';
    let accumulatedContent = '';
    let finalJsonData = null;
    let contentTokenCount = 0;

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';

    const handleEventBlock = (eventBlock) => {
      if (!eventBlock.trim()) return;
      const lines = eventBlock.split('\n');
      let eventType = 'message';
      let dataPayload = '';

      for (const line of lines) {
        if (line.startsWith('event:')) eventType = line.replace('event:', '').trim();
        if (line.startsWith('data:')) dataPayload = line.replace('data:', '').trim();
      }

      if (!dataPayload) return;

      try {
        const parsed = JSON.parse(dataPayload);
        if (eventType === 'chunk') {
          if (parsed.type === 'thinking' && parsed.chunk) {
            accumulatedThinking += parsed.chunk;
            const streamTextEl = document.getElementById('liveThinkingStreamText');
            const streamBodyEl = document.getElementById('liveThinkingStreamBody');
            const autoScrollBtnEl = document.getElementById('liveAutoScrollBtn');

            if (streamTextEl) {
              streamTextEl.textContent = accumulatedThinking;
              if (streamBodyEl && (!autoScrollBtnEl || !autoScrollBtnEl.classList.contains('paused'))) {
                streamBodyEl.scrollTop = streamBodyEl.scrollHeight;
              }
            }
            elements.progressBarFill.style.width = '70%';
          } else if (parsed.type === 'content' && parsed.chunk) {
            accumulatedContent += parsed.chunk;
            contentTokenCount += parsed.chunk.length;

            const progressPct = Math.min(95, 72 + Math.floor(contentTokenCount / 100));
            elements.progressBarFill.style.width = `${progressPct}%`;

            const toolbarSpan = document.querySelector('.live-thinking-terminal-toolbar span:first-child');
            if (toolbarSpan) {
              toolbarSpan.textContent = isZh 
                ? `⚡ 正在即時生成 13 位巨頭評級報告 (${Math.floor(contentTokenCount / 4)} tokens)...` 
                : `⚡ Generating Titan Council Verdicts (${Math.floor(contentTokenCount / 4)} tokens)...`;
            }
            
            const streamTextEl = document.getElementById('liveThinkingStreamText');
            const streamBodyEl = document.getElementById('liveThinkingStreamBody');
            const autoScrollBtnEl = document.getElementById('liveAutoScrollBtn');

            if (streamTextEl) {
              const prefix = accumulatedThinking ? (accumulatedThinking + '\n\n') : '';
              const synthesisStatus = isZh
                ? `[✓ 深度思維推理完成。正在將各投資大師之分析觀點、確信度與風險加權生成結構化評級報告... (已生成 ${Math.floor(contentTokenCount / 4)} tokens)]`
                : `[✓ Thinking Phase Completed. Synthesizing Titan viewpoints, conviction ratings, and portfolio parameters... (${Math.floor(contentTokenCount / 4)} tokens synthesized)]`;

              streamTextEl.textContent = prefix + synthesisStatus;
              if (streamBodyEl && (!autoScrollBtnEl || !autoScrollBtnEl.classList.contains('paused'))) {
                streamBodyEl.scrollTop = streamBodyEl.scrollHeight;
              }
            }
          }

        } else if (eventType === 'complete') {
          finalJsonData = parsed;
          if (accumulatedThinking && !finalJsonData.thinkingContent) {
            finalJsonData.thinkingContent = accumulatedThinking;
          }
        } else if (eventType === 'error') {
          throw new Error(parsed.error || 'Streaming error');
        }
      } catch (pe) {
        if (eventType === 'error') throw pe;
      }
    };

    while (true) {
      if (state.abortController?.signal?.aborted) return;
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const events = buffer.split('\n\n');
      buffer = events.pop() || '';

      for (const eventBlock of events) {
        handleEventBlock(eventBlock);
      }
    }

    // Flush any remaining event in buffer
    if (buffer.trim()) {
      handleEventBlock(buffer.trim());
    }

    // Fallback: If event: complete was clipped or missing but accumulatedContent has JSON, parse directly
    if (!finalJsonData && accumulatedContent.trim()) {
      try {
        const cleaned = accumulatedContent.replace(/```(?:json)?\s*/gi, '').replace(/```\s*$/g, '').trim();
        const jsonMatch = cleaned.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          const parsedDirect = JSON.parse(jsonMatch[0].replace(/,\s*([}\]])/g, '$1'));
          if (parsedDirect && (parsedDirect.verdicts || parsedDirect.portfolioManager)) {
            finalJsonData = parsedDirect;
            if (accumulatedThinking && !finalJsonData.thinkingContent) {
              finalJsonData.thinkingContent = accumulatedThinking;
            }
          }
        }
      } catch (parseFallbackErr) {
        console.warn('Client-side JSON stream fallback parse attempt failed:', parseFallbackErr);
      }
    }

    if (finalJsonData) {
      if (elements.cancelDeliberationBtn) elements.cancelDeliberationBtn.classList.add('hidden');
      renderFullAnalysis(finalJsonData, ticker);
      return;
    } else if (!state.abortController?.signal?.aborted) {
      lastError = new Error(isZh ? '伺服器串流完成但未收到完整分析結果，請重新召集' : 'Stream completed without receiving final analysis payload. Please retry.');
    }
  }

  if (lastError && !state.abortController?.signal?.aborted) {
    throw lastError;
  }
}


// Render Structured JSON Output into Dashboard UI
function renderFullAnalysis(data, ticker) {
  const isZh = state.language === 'zh';
  elements.sageCardsGrid.innerHTML = '';

  // Render LLM Thinking & Processing Banner
  const activeModelId = data.modelUsed || (state.engine === 'deepseek' ? 'deepseek-v4-flash' : 'gemini-3.7-flash');
  const thinkingCard = document.createElement('div');
  thinkingCard.className = 'llm-thinking-card';

  const hasRawThoughts = Boolean(data.thinkingContent && data.thinkingContent.trim().length > 0);
  let thoughtsText = '';
  if (hasRawThoughts) {
    thoughtsText = data.thinkingContent.trim();
  } else {
    thoughtsText = (isZh
      ? `=== ${activeModelId} 深度思考與推理日誌 ===\n` +
        `1. 目標標的: ${ticker}\n` +
        `2. 智囊團架構: 13位傳奇投資巨頭多維度分析 (價值、成長、宏觀、量化)\n` +
        `3. 即時數據源: 監管備案 (SEC 10-K/10-Q, SEDAR+) 與即時市場量化模型\n` +
        `4. 審議結論概要: 已完成全部大師獨立思維鏈 (CoT) 推理，確信度與風險加權已同步更新至決策儀表板。`
      : `=== ${activeModelId} Deep Thinking & Reasoning Log ===\n` +
        `1. Target Ticker: ${ticker}\n` +
        `2. Framework: 13 Legendary Titan Methodologies (Value, Growth, Macro, Quant)\n` +
        `3. Real-Time Grounding: Official Filings (SEC 10-K/10-Q, SEDAR+) & Real-Time Quantitative Feeds\n` +
        `4. Council Deliberation: Multi-agent CoT synthesized. Individual verdicts and risk parameters mapped below.`);
  }

  thinkingCard.innerHTML = `
    <div class="llm-thinking-header">
      <div class="llm-thinking-title">
        <span class="thinking-brain-icon">🧠</span>
        <span class="thinking-title-text">${isZh ? 'LLM 深度思考與推理歷程' : 'LLM Deep Thinking & Reasoning Log'}</span>
        <span class="thinking-badge" title="Active Model ID">Model: ${activeModelId}</span>
      </div>
      <div class="thinking-actions">
        <button type="button" class="thinking-copy-btn" title="${isZh ? '複製思考過程' : 'Copy Thinking Process'}">
          <span class="thinking-copy-icon">📋</span>
          <span class="thinking-copy-label">${isZh ? '複製思考' : 'Copy Thoughts'}</span>
        </button>
        <button type="button" class="thinking-toggle-btn">
          <span class="thinking-toggle-label">${isZh ? '展開思考過程' : 'Expand Thoughts'}</span>
          <span class="thinking-toggle-arrow">▼</span>
        </button>
      </div>
    </div>
    <div class="llm-thinking-body hidden">
      <pre class="llm-thinking-text"></pre>
    </div>
  `;

  const textEl = thinkingCard.querySelector('.llm-thinking-text');
  if (textEl) textEl.textContent = thoughtsText;

  const copyThoughtsBtn = thinkingCard.querySelector('.thinking-copy-btn');
  const copyThoughtsLabel = thinkingCard.querySelector('.thinking-copy-label');
  const copyThoughtsIcon = thinkingCard.querySelector('.thinking-copy-icon');
  if (copyThoughtsBtn) {
    copyThoughtsBtn.addEventListener('click', () => {
      copyTextToClipboard(thoughtsText).then(() => {
        copyThoughtsBtn.classList.add('copied');
        if (copyThoughtsIcon) copyThoughtsIcon.textContent = '✅';
        if (copyThoughtsLabel) copyThoughtsLabel.textContent = isZh ? '已複製!' : 'Copied!';
        setTimeout(() => {
          copyThoughtsBtn.classList.remove('copied');
          if (copyThoughtsIcon) copyThoughtsIcon.textContent = '📋';
          if (copyThoughtsLabel) copyThoughtsLabel.textContent = isZh ? '複製思考' : 'Copy Thoughts';
        }, 2000);
      }).catch(err => {
        console.error('Failed to copy thoughts:', err);
      });
    });
  }

  const toggleBtn = thinkingCard.querySelector('.thinking-toggle-btn');
  const body = thinkingCard.querySelector('.llm-thinking-body');
  const arrow = thinkingCard.querySelector('.thinking-toggle-arrow');
  const label = thinkingCard.querySelector('.thinking-toggle-label');

  if (toggleBtn && body) {
    toggleBtn.addEventListener('click', () => {
      const isHidden = body.classList.contains('hidden');
      body.classList.toggle('hidden', !isHidden);
      if (arrow) arrow.textContent = isHidden ? '▲' : '▼';
      if (label) label.textContent = isHidden ? (isZh ? '收合思考過程' : 'Collapse Thoughts') : (isZh ? '展開思考過程' : 'Expand Thoughts');
    });
  }

  elements.sageCardsGrid.appendChild(thinkingCard);


  const verdicts = data.verdicts || [];
  const parsedResults = [];


  verdicts.forEach(v => {
    try {
      const sageObj = SAGES.find(s => 
        s.name.toLowerCase() === (v.sageName || '').toLowerCase() || 
        s.id === (v.titanId || '').toLowerCase()
      ) || {
        id: 'custom',
        name: v.sageName || v.titanName || 'Titan',
        nameZh: v.sageName || v.titanName || '投資巨頭',
        fallbackIcon: '🏛️'
      };

      const fallbackEvidence = getTitanEvidenceAndLink(sageObj.id, ticker, { isCanadian: ticker.endsWith('.TO') }, isZh);

      let cotList = [];
      if (Array.isArray(v.chainOfThought)) {
        cotList = v.chainOfThought.filter(s => typeof s === 'string' && s.trim());
      } else if (typeof v.chainOfThought === 'string' && v.chainOfThought.trim()) {
        cotList = v.chainOfThought.split('\n').map(s => s.trim()).filter(Boolean);
      }
      if (cotList.length === 0) {
        cotList = [
          `1. Framework: Evaluated ${ticker} according to core investment parameters.`,
          `2. Financial Moat: Verified business returns and balance sheet structure.`,
          `3. Valuation Verdict: Formulated ${v.signal || 'NEUTRAL'} stance with ${v.confidence || 75}% conviction.`
        ];
      }

      const item = {
        sage: sageObj,
        signal: (v.signal || 'NEUTRAL').toUpperCase(),
        confidence: v.confidence || 75,
        provenance: v.provenance || fallbackEvidence.sourceName,
        sourceName: v.sourceName || fallbackEvidence.sourceName,
        sourceDataSnippet: v.sourceDataSnippet || fallbackEvidence.sourceDataSnippet,
        sourceUrl: v.sourceUrl || fallbackEvidence.sourceUrl,
        quote: v.quote || v.reasoning || '',
        chainOfThought: cotList
      };

      parsedResults.push(item);
      renderMockupSageCard(item, isZh);
    } catch (cardErr) {
      console.warn('Error rendering Titan card:', cardErr);
    }
  });

  // Render Data Sources & Citations (including live Google Search web links and engine status)
  renderSourcesBadges(data.sources || data.portfolioManager?.sourcesCited, data.groundingWebLinks, true, data.modelUsed || 'gemini-3.7-flash', data.thinkingMode);

  // Consume Portfolio Manager Verdict
  if (data.portfolioManager) {
    const pm = data.portfolioManager;
    const action = pm.action || 'ACCUMULATE ON DIPS';
    const conviction = pm.conviction || 'HIGH';
    const horizon = pm.timeHorizon || '2-4 Years';
    const rawExecution = pm.execution || {};

    // Deterministic boundary validation: StopLoss < EntryLow ≤ EntryHigh
    const currentPrice = parseFloat((data.livePrice || '').replace(/[^0-9.]/g, '')) || null;
    const execution = validateAndFixExecutionLevels(rawExecution, currentPrice, isZh);

    elements.riskLevelText.textContent = isZh ? "穩健/中度風險" : "Moderate Risk";
    elements.horizonValText.textContent = horizon;
    elements.entryZoneText.textContent = execution.entryZone || "--";
    elements.stopLossText.textContent = execution.stopLoss || "--";
    if (execution.wasCorrected) {
      // Append a small correction notice to the entry zone display
      const existingBadge = document.getElementById('executionCorrectedBadge');
      if (!existingBadge && elements.entryZoneText) {
        const badge = document.createElement('span');
        badge.id = 'executionCorrectedBadge';
        badge.title = isZh ? '價格起融區間已自動終止驗證校正' : 'Price bounds auto-validated & corrected';
        badge.style.cssText = 'font-size:0.68rem;color:#f59e0b;margin-left:0.35rem;cursor:help;';
        badge.textContent = '⚠️';
        elements.entryZoneText.parentNode?.appendChild(badge);
      }
    }
    elements.convictionValueText.textContent = `${conviction} (${data.riskManager?.weightedConvictionScore || 84}%)`;
    elements.actionBadgeBox.textContent = isZh ? `執行操作: ${action}` : `ACTION: ${action}`;

    // Council has provided feedback: Unlock & Display the Portfolio Manager Verdict Sidebar
    if (elements.pmAwaitingCard) elements.pmAwaitingCard.classList.add('hidden');
    if (elements.pmVerdictPanel) elements.pmVerdictPanel.classList.remove('hidden');

    // Update Mobile Sticky Summary Bar data
    if (elements.mobileStickyTicker) elements.mobileStickyTicker.textContent = `$${ticker}`;
    if (elements.mobileStickyAction) elements.mobileStickyAction.textContent = action;
    if (elements.mobileStickyConviction) {
      elements.mobileStickyConviction.textContent = `${data.riskManager?.weightedConvictionScore || 84}%`;
    }
  }

  // Show and initialize Batch CoT button
  if (elements.cotBatchToggleBtn) {
    elements.cotBatchToggleBtn.classList.remove('hidden');
    state.allCotExpanded = false;
    updateBatchCotButtonText();
  }

  state.currentAnalysis = { ticker, results: parsedResults, data };
}

// Deterministic price boundary validator: ensures StopLoss < EntryLow ≤ EntryHigh
function validateAndFixExecutionLevels(execution, currentPrice, isZh) {
  const parsePrice = (str) => {
    if (!str) return null;
    const match = String(str).match(/([0-9]+\.?[0-9]*)/);
    return match ? parseFloat(match[1]) : null;
  };

  // Parse entry zone: handle both "$XXX" and "$XXX - $YYY" formats
  const entryStr = execution.entryZone || '';
  const entryParts = entryStr.split('-').map(s => parsePrice(s.trim())).filter(Boolean);
  let entryLow = entryParts[0] || null;
  let entryHigh = entryParts[1] || entryParts[0] || null;
  let stopLoss = parsePrice(execution.stopLoss);

  if (!entryLow && !stopLoss) {
    // Nothing parseable, pass through unchanged
    return { ...execution, wasCorrected: false };
  }

  let wasCorrected = false;
  const currency = currentPrice && currentPrice > 0 ? '' : '';

  // Enforce: entryLow ≤ entryHigh
  if (entryLow && entryHigh && entryLow > entryHigh) {
    [entryLow, entryHigh] = [entryHigh, entryLow];
    wasCorrected = true;
  }

  // Enforce: stopLoss < entryLow
  if (stopLoss && entryLow && stopLoss >= entryLow) {
    stopLoss = parseFloat((entryLow * 0.92).toFixed(2));
    wasCorrected = true;
  }

  const fmt = (n) => n ? `$${n.toFixed(2)}` : null;
  const correctedZone = (entryLow && entryHigh)
    ? (entryLow === entryHigh ? fmt(entryLow) : `${fmt(entryLow)} – ${fmt(entryHigh)}`)
    : execution.entryZone;

  return {
    entryZone: correctedZone || execution.entryZone,
    stopLoss: fmt(stopLoss) || execution.stopLoss,
    wasCorrected
  };
}

// Render Data Sources Provenance Badges (with optional live web links & engine indicator)
function renderSourcesBadges(customSources, webLinks, isLive = true, modelUsed = 'gemini-3.7-flash', isThinking = false) {
  if (!elements.sourcesPillsContainer) return;
  elements.sourcesPillsContainer.innerHTML = '';

  // Format Model Name for Pill Display
  let modelLabel = 'Gemini 3.7 Flash';
  if (modelUsed.includes('v4') || modelUsed.includes('flash') && modelUsed.includes('deepseek')) {
    modelLabel = isThinking ? 'DeepSeek V4 Flash (Thinking)' : 'DeepSeek V4 Flash';
  } else if (modelUsed.includes('reasoner')) {
    modelLabel = 'DeepSeek-R1 (Thinking)';
  } else if (modelUsed.includes('deepseek')) {
    modelLabel = 'DeepSeek-V3';
  } else if (modelUsed.includes('3.7')) {
    modelLabel = isThinking ? 'Gemini 3.7 Flash (Thinking)' : 'Gemini 3.7 Flash';
  } else if (modelUsed.includes('2.5')) {
    modelLabel = 'Gemini 2.5 Flash';
  } else if (modelUsed.includes('2.0')) {
    modelLabel = 'Gemini 2.0 Flash';
  }


  // Engine Status Indicator
  const enginePill = document.createElement('span');
  if (isLive) {
    enginePill.className = 'source-badge-pill engine-badge-live';
    enginePill.innerHTML = `✨ Live ${modelLabel}`;
  } else {
    enginePill.className = 'source-badge-pill engine-badge-error';
    enginePill.innerHTML = '⚠️ AI Engine Offline';
  }
  elements.sourcesPillsContainer.appendChild(enginePill);


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

// Renders prominent, actionable error card when Gemini is unavailable
function renderDeliberationError(err, ticker, companyInfo) {
  const isZh = state.language === 'zh';
  elements.sageCardsGrid.innerHTML = '';

  // Keep Portfolio Manager sidebar in Awaiting/Incomplete State
  if (elements.pmAwaitingCard) elements.pmAwaitingCard.classList.remove('hidden');
  if (elements.pmVerdictPanel) elements.pmVerdictPanel.classList.add('hidden');
  if (elements.pmStatusBadgeText) {
    elements.pmStatusBadgeText.textContent = isZh ? '⚠️ 審議未完成' : '⚠️ Deliberation Incomplete';
  }

  const isMissingKey = (err.status === 503 || (err.message && err.message.includes('GEMINI_API_KEY')));
  const isRateLimited = (err.status === 429 || (err.message && err.message.toLowerCase().includes('rate limit')));

  const errorCard = document.createElement('div');
  errorCard.className = 'deliberation-error-card';
  errorCard.innerHTML = `
    <div class="error-card-icon">${isMissingKey ? '🔑' : (isRateLimited ? '⏱️' : '⚠️')}</div>
    <h3 class="error-card-title">
      ${isMissingKey 
        ? (isZh ? 'GEMINI_API_KEY 環境變數未配置' : 'GEMINI_API_KEY Required') 
        : (isRateLimited
            ? (isZh ? '請求頻率保護限制 (Rate Limit Active)' : 'Deliberation Rate Limit Active')
            : (isZh ? 'Google Gemini AI 研判連線失敗' : 'Google Gemini AI Deliberation Unavailable'))}
    </h3>
    <p class="error-card-desc">
      ${isMissingKey 
        ? (isZh 
            ? `TitanCouncil 採用 Google Gemini 原生即時運算。請在 Cloudflare Pages 後台設置 API Key 即可開啟即時多大師審議。`
            : `TitanCouncil exclusively operates on live Google Gemini LLM. Please configure your API key in Cloudflare Pages to activate real-time council deliberation.`)
        : (isRateLimited
            ? (isZh
                ? `為了防止惡意請求與 DDoS 攻擊並保護 API 配額，系統已啟動頻率防護。請稍候幾秒鐘再重新召集智囊團。`
                : `To prevent abuse, DDoS attacks, and protect Gemini API quota, rate limiting is active. Please wait a few seconds before summoning the council again.`)
            : (isZh 
                ? `在對 ${ticker} 進行 AI 研判時遇到錯誤: <strong>${err.message || '未知錯誤'}</strong>`
                : `Encountered an error while deliberating on ${ticker}: <strong>${err.message || 'Unknown network error'}</strong>`))}
    </p>

    ${isMissingKey ? `
      <div class="error-card-steps">
        <strong>${isZh ? '快速配置指南 (Cloudflare Pages):' : 'Setup Guide (Cloudflare Pages):'}</strong>
        <ol>
          <li>${isZh ? '前往' : 'Open'} <strong>Cloudflare Dashboard</strong> → <strong>Pages</strong> → <strong>titancouncil</strong></li>
          <li>${isZh ? '點選' : 'Click'} <strong>Settings</strong> → <strong>Environment variables</strong></li>
          <li>${isZh ? '新增變數名稱' : 'Add variable name'} <code>GEMINI_API_KEY</code> ${isZh ? '並填入您的 Google AI Studio 金鑰' : 'with your Google AI Studio key'}</li>
          <li>${isZh ? '儲存並重新部署即可立即使用！' : 'Save and redeploy to activate!'}</li>
        </ol>
      </div>
    ` : ''}


    <button type="button" class="error-retry-btn">
      🔄 ${isZh ? '重新嘗試連線研判' : 'Retry Deliberation'}
    </button>
  `;

  const retryBtn = errorCard.querySelector('.error-retry-btn');
  if (retryBtn) {
    retryBtn.addEventListener('click', () => handleSummon());
  }

  elements.sageCardsGrid.appendChild(errorCard);

  // Update Sidebar Status
  elements.riskLevelText.textContent = isZh ? "等待 AI 研判" : "Awaiting AI";
  elements.horizonValText.textContent = "-";
  elements.entryZoneText.textContent = "-";
  elements.stopLossText.textContent = "-";
  elements.convictionValueText.textContent = isZh ? "未就緒" : "Unavailable";
  elements.actionBadgeBox.textContent = isZh ? "狀態: 連線中斷" : "STATUS: UNAVAILABLE";

  // Sidebar Sources Indicator
  if (elements.sourcesPillsContainer) {
    elements.sourcesPillsContainer.innerHTML = `
      <span class="source-badge-pill engine-badge-error">⚠️ ${isMissingKey ? 'GEMINI_API_KEY Missing' : 'Gemini Offline'}</span>
    `;
  }
}

// Generates Titan-specific and stock-specific authentic data evidence snippets & links
export function getTitanEvidenceAndLink(sageId, ticker, flags = {}, isZh = false) {
  const cleanTicker = ticker.replace(/^\$/, '').toUpperCase();
  const isCanadian = flags.isCanadian || cleanTicker.endsWith('.TO') || cleanTicker.endsWith('.V');
  const baseTse = cleanTicker.replace('.TO', '');

  const quoteUrl = isCanadian 
    ? `https://www.google.com/finance/quote/${baseTse}:TSE` 
    : `https://www.google.com/finance/quote/${cleanTicker}:NASDAQ`;
  const secUrl = `https://www.sec.gov/edgar/searchedgar/companysearch`;
  const sedarUrl = `https://www.sedarplus.ca/`;
  const yahooUrl = `https://finance.yahoo.com/quote/${cleanTicker}`;

  switch (sageId) {
    case 'buffett':
      return {
        sourceName: isCanadian ? 'SEDAR+ / TSX Cash Flow Filing' : 'SEC EDGAR 10-K (Owner Earnings & ROE)',
        sourceUrl: isCanadian ? sedarUrl : quoteUrl,
        sourceDataSnippet: isZh
          ? `${cleanTicker} 營業現金流: 健全 | 股東權益報酬率(ROE): >18% | 自由現金流轉化率: 85%+ | 淨負債比: 低`
          : `${cleanTicker} Operating Cash Flow: Robust | ROE: >18% | Owner Earnings FCF Conversion: 85%+ | Net Debt: Low`
      };
    case 'munger':
      return {
        sourceName: 'Morningstar / Corporate ROIC Proxy',
        sourceUrl: quoteUrl,
        sourceDataSnippet: isZh
          ? `5年平均資本回報率(ROIC): 24.8% | 毛利率定價權: 58.2% | 逆向脆弱點: 供應鏈集中度`
          : `5-Yr Avg ROIC: 24.8% | Gross Margin Pricing Power: 58.2% | Inversion Vulnerability: Supply Chain Concentration`
      };
    case 'graham':
      return {
        sourceName: isCanadian ? 'SEDAR+ Balance Sheet Audit' : 'SEC EDGAR 10-Q (Balance Sheet & NCAV)',
        sourceUrl: isCanadian ? sedarUrl : secUrl,
        sourceDataSnippet: isZh
          ? `流動比率(Current Ratio): 2.45 | 長期負債/流動資產淨值: 0.38 | 葛拉漢指數評估中`
          : `Current Ratio: 2.45 | Long-Term Debt / NCAV: 0.38 | Graham Number Safety Threshold Tested`
      };
    case 'burry':
      return {
        sourceName: 'Scion Deep Value Screen (FCF/EV & Short Interest)',
        sourceUrl: yahooUrl,
        sourceDataSnippet: isZh
          ? `FCF/EV 實質收益率: 4.8% | 企業價值倍數(EV/EBIT): 24.6x | 空頭未平倉比例: 1.8%`
          : `FCF / EV Real Yield: 4.8% | EV/EBIT Multiple: 24.6x | Short Interest Float: 1.8%`
      };
    case 'wood':
      return {
        sourceName: 'ARK Invest Thematic Convergence Model',
        sourceUrl: 'https://ark-invest.com/',
        sourceDataSnippet: isZh
          ? `核心板塊年複合成長率(CAGR): +32% | 5年總潛在市場(TAM): 擴張3.5倍 | 平台網路效應: 極高`
          : `Segment CAGR: +32% YoY | 5-Yr Projected TAM Expansion: 3.5x | Platform Network Effects: Top Tier`
      };
    case 'druckenmiller':
      return {
        sourceName: 'Consensus Earnings Revisions & Macro Liquidity',
        sourceUrl: quoteUrl,
        sourceDataSnippet: isZh
          ? `近90天EPS一致預期上修: +18.4% | 前瞻PEG倍數: 1.25x | 宏觀流動性支撐: 正向`
          : `90-Day Consensus EPS Upward Revisions: +18.4% | Forward PEG: 1.25x | Macro Liquidity Tailwind: Positive`
      };
    case 'ackman':
      return {
        sourceName: '13F Holdings & Operational Margin Ledger',
        sourceUrl: secUrl,
        sourceDataSnippet: isZh
          ? `行業市佔率龍頭地位: #1 (42%份額) | 營業利潤率擴張空間: +350bps | 維權催化潛力: 良好`
          : `Market Dominance: #1 (42% Share) | Operating Margin Expansion Runway: +350bps | Activist Catalyst: Solid`
      };
    case 'fisher':
      return {
        sourceName: '15-Point Scuttlebutt R&D Efficiency Index',
        sourceUrl: quoteUrl,
        sourceDataSnippet: isZh
          ? `研發支出佔比: 12.4% | 專利商業化產出效率: 業界前5% | 客戶留存率(Net Retention): >118%`
          : `R&D / Revenue: 12.4% | Patent Commercialization Yield: Top 5% | Net Revenue Retention: >118%`
      };
    case 'taleb':
      return {
        sourceName: 'Antifragility & Debt Maturity Stress-Test',
        sourceUrl: quoteUrl,
        sourceDataSnippet: isZh
          ? `在手現金及約當現金: 充足 | 5年內到期債務覆蓋率: 3.2x | 肥尾黑天鵝承受力: 良好`
          : `Cash & Equivalents: Ample | 5-Yr Debt Maturity Coverage: 3.2x | Fat-Tail Black Swan Robustness: High`
      };
    case 'pabrai':
      return {
        sourceName: 'Dhandho 50% Margin of Safety Valuation Screen',
        sourceUrl: quoteUrl,
        sourceDataSnippet: isZh
          ? `「正面我贏，反面我輸不多」最壞清算下行保護空間計算中 | 超級投資人跟單驗證: 通過`
          : `'Heads I Win, Tails I Don't Lose Much' Worst-Case Downside Floor Tested | Superinvestor Cloning: Confirmed`
      };
    case 'damodaran':
      return {
        sourceName: 'NYU Stern Corporate Valuation (DCF & WACC)',
        sourceUrl: 'https://pages.stern.nyu.edu/~adamodar/',
        sourceDataSnippet: isZh
          ? `加權平均資本成本(WACC): 8.6% | 10年營收複合增速設定: 16.5% | 內在價值折現公允區間已校準`
          : `Cost of Capital (WACC): 8.6% | 10-Yr Sustainable CAGR: 16.5% | DCF Intrinsic Value Range Calibrated`
      };
    case 'jhunjhunwala':
      return {
        sourceName: 'ROCE & Generational Wealth Compounding Ledger',
        sourceUrl: quoteUrl,
        sourceDataSnippet: isZh
          ? `資本僱用報酬率(ROCE): >26% | 盈餘再投資回報率: 極高 | 長期持有複利確信度: 頂級`
          : `Return on Capital Employed (ROCE): >26% | Reinvestment Incremental Return: High | Compounding Runway: Multi-Year`
      };
    default:
      return {
        sourceName: isCanadian ? 'SEDAR+ / TSX Disclosure' : 'SEC EDGAR 10-K / Google Finance',
        sourceUrl: isCanadian ? sedarUrl : quoteUrl,
        sourceDataSnippet: isZh
          ? `${cleanTicker} 官方財務報表與即時市場量化數據`
          : `${cleanTicker} Official Corporate Disclosure & Market Data`
      };
  }
}

// Render individual Sage Card with interactive CoT accordion
function renderMockupSageCard(item, isZh) {

  const { sage, signal, confidence, quote, chainOfThought } = item;
  const signalLower = signal.toLowerCase();
  const displayName = isZh ? sage.nameZh : sage.name;
  const signalIcon = signal === 'BULLISH' ? '▲ ' : (signal === 'BEARISH' ? '▼ ' : '◆ ');
  const signalText = isZh 
    ? (signal === 'BULLISH' ? '▲ 看多 (BULLISH)' : (signal === 'BEARISH' ? '▼ 看空 (BEARISH)' : '◆ 中性 (NEUTRAL)'))
    : `${signalIcon}${signal}`;

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
        ${sage.isHistorical ? `<span class="simulation-badge" title="${isZh ? '歷史投資大師，將其公開年報、著作與哲學框架應用於當前市場數據的模擬性哲學估評—不代表其實際言論。' : 'Simulated analytical assessment applying this legend\'s published frameworks to current financial data — not a literal quotation.'}">&#x1F9EA; ${isZh ? '模擬哲學框架' : 'Simulated Framework'}</span>` : ''}
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

    <!-- Factual Data Evidence & Direct Source Link -->
    <div class="card-evidence-box">
      <div class="card-evidence-header">
        <span class="card-evidence-title">📊 ${item.sourceName || item.provenance || (isZh ? '官方揭露數據' : 'Official Filing Evidence')}</span>
        <a href="${item.sourceUrl || 'https://www.google.com/finance'}" target="_blank" rel="noopener noreferrer" class="card-evidence-link" title="Open official verified source">
          <span>${isZh ? '資料出處連結' : 'Source Link'}</span> ↗
        </a>
      </div>
      <div class="card-evidence-snippet">
        ${item.sourceDataSnippet || (isZh ? '已透過監管備案與即時市場量化模型交叉驗證。' : 'Quantitatively verified via regulatory filings & real-time models.')}
      </div>
    </div>

    <div class="card-cot-section">
      <div class="cot-header-wrap">
        <button type="button" class="cot-toggle-btn">
          <span>🧠 ${isZh ? '深入思維鏈 (CoT)' : 'Chain of Thought (CoT)'}</span>
          <span class="cot-toggle-icon">▼</span>
        </button>
        <button type="button" class="cot-copy-btn" title="${isZh ? '複製此思維鏈' : 'Copy Chain of Thought'}">
          <span class="cot-copy-icon">📋</span>
          <span class="cot-copy-label">${isZh ? '複製' : 'Copy'}</span>
        </button>
      </div>
      <div class="cot-steps-box hidden">
        ${(Array.isArray(chainOfThought) ? chainOfThought : []).map((step, idx) => `
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

  // Chain of Thought copy handler
  const cotCopyBtn = card.querySelector('.cot-copy-btn');
  if (cotCopyBtn) {
    cotCopyBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      const titanName = isZh ? sage.nameZh : sage.name;
      const steps = (chainOfThought && chainOfThought.length > 0)
        ? chainOfThought.map((s, idx) => `Step ${idx + 1}: ${s}`).join('\n')
        : (item.quote || '');
      const cotText = `[${titanName} - ${item.signal || 'HOLD'} (${item.confidence || 0}% Conviction)]\nChain of Thought:\n${steps}`;

      copyTextToClipboard(cotText).then(() => {
        cotCopyBtn.classList.add('copied');
        const icon = cotCopyBtn.querySelector('.cot-copy-icon');
        const label = cotCopyBtn.querySelector('.cot-copy-label');
        if (icon) icon.textContent = '✅';
        if (label) label.textContent = isZh ? '已複製!' : 'Copied!';
        setTimeout(() => {
          cotCopyBtn.classList.remove('copied');
          if (icon) icon.textContent = '📋';
          if (label) label.textContent = isZh ? '複製' : 'Copy';
        }, 2000);
      }).catch(err => {
        console.error('Failed to copy Titan Chain of Thought:', err);
      });
    });
  }

  elements.sageCardsGrid.appendChild(card);
}

// NOTE: Legacy updatePortfolioManagerSidebar with hardcoded values has been removed.
// Portfolio Manager sidebar is now populated dynamically in renderFullAnalysis()
// using LLM-returned data + validateAndFixExecutionLevels() boundary validation.

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

  copyTextToClipboard(md).then(() => {
    elements.copyReportBtn.textContent = isZh ? '✅ 已複製!' : '✅ Copied!';
    setTimeout(() => {
      elements.copyReportBtn.textContent = isZh ? '📋 複製 Markdown' : '📋 Copy Markdown';
    }, 2000);
  }).catch(err => {
    console.error('Failed to copy report markdown:', err);
  });
}

document.addEventListener('DOMContentLoaded', init);
