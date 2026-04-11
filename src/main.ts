import './style.css';
import { 
  createIcons, Fuel, Droplet, Moon, Sun, Search, HelpCircle, X, 
  Calculator, Cog, History, Plus, Save, Share2, Info, Trash2, Play,
  AlertTriangle, AlertCircle, ChevronRight, RotateCcw, Edit3, CheckCircle
} from 'lucide';
import { brands } from './data/brands';
import { get, set } from 'idb-keyval';

// --- INTERFACES ---
interface MixRecord {
  id: number;
  date: string;
  fuel: number;
  oil: number;
  ratio: number;
  cost?: number;
  equipmentName?: string;
}

interface Equipment {
  id: number;
  name: string;
  ratio: number;
}

// Inicializar ícones
const icons = { 
  Fuel, Droplet, Moon, Sun, Search, HelpCircle, X, Calculator, Cog, History, 
  Plus, Save, Share2, Info, Trash2, Play, AlertTriangle, AlertCircle, 
  ChevronRight, RotateCcw, Edit3, CheckCircle 
};
createIcons({ icons });

// Registro Manual do Service Worker
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js')
      .then(reg => {
        console.log('Mix2T: Service Worker registrado com sucesso!');
        reg.onupdatefound = () => {
          const newWorker = reg.installing;
          if (newWorker) {
            newWorker.onstatechange = () => {
              if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                console.log('Mix2T: Nova versão disponível! Recarregando...');
                window.location.reload();
              }
            };
          }
        };
      })
      .catch(err => console.error('Mix2T: Erro no SW:', err));
  });

  let refreshing = false;
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (!refreshing) {
      refreshing = true;
      window.location.reload();
    }
  });
}

// --- ESTADO ---
let currentRatio = 50;
let isInverseMode = false;
let isCostEnabled = false;
let editingEquipId: number | null = null;
let activeEquipName: string | null = null;
let pendingHistorySave = false;

// Estado de Filtro de Histórico
let historySearchTerm = '';
let historySortBy = 'date'; // 'date', 'name', 'ratio'

// --- ELEMENTOS (Safe Selection) ---
const getEl = <T extends HTMLElement>(id: string) => document.getElementById(id) as T | null;

const app = document.body;
const ratioSlider = getEl<HTMLInputElement>('ratio-slider');
const ratioDisplay = getEl<HTMLElement>('ratio-display');
const brandSearch = getEl<HTMLInputElement>('brand-search');
const fuelInput = getEl<HTMLInputElement>('fuel-input');
const oilInput = getEl<HTMLInputElement>('oil-input');
const resultNum = getEl<HTMLElement>('result-num');
const resultUnit = getEl<HTMLElement>('result-unit');
const resultLabelText = getEl<HTMLElement>('result-label-text');
const brandIndicator = getEl<HTMLElement>('brand-indicator');
const costInputs = getEl<HTMLElement>('cost-inputs');
const priceFuelInput = getEl<HTMLInputElement>('price-fuel');
const priceOilInput = getEl<HTMLInputElement>('price-oil');
const costResult = getEl<HTMLElement>('cost-result');
const totalCostVal = getEl<HTMLElement>('total-cost-val');
const safetyBadge = getEl<HTMLElement>('safety-badge');
const safetyText = getEl<HTMLElement>('safety-text');

// Novos Elementos de Modo
const modeDirect = getEl<HTMLButtonElement>('mode-direct');
const modeInverse = getEl<HTMLButtonElement>('mode-inverse');
const mainInputLabel = getEl<HTMLElement>('main-input-label');
const mainInputSuffix = getEl<HTMLElement>('main-input-suffix');
const shortcutsFuel = getEl<HTMLElement>('shortcuts-fuel');
const shortcutsOil = getEl<HTMLElement>('shortcuts-oil');

// Elementos de Modais
const alertModal = getEl<HTMLElement>('alert-modal');
const confirmModal = getEl<HTMLElement>('confirm-modal');
const searchModal = getEl<HTMLElement>('search-modal');
const equipModal = getEl<HTMLElement>('equip-modal');
const modalTitle = getEl<HTMLElement>('equip-modal-title');
const modalBrandSearch = getEl<HTMLInputElement>('modal-brand-search');
const modalSearchResults = getEl<HTMLElement>('modal-search-results');

const execConfirmBtn = getEl<HTMLButtonElement>('exec-confirm');
const cancelConfirmBtn = getEl<HTMLButtonElement>('cancel-confirm');

// Elementos de Histórico (Novos)
const historySearchInput = getEl<HTMLInputElement>('history-search');
const historySortSelect = getEl<HTMLSelectElement>('history-sort');

// --- SISTEMA DE MODAIS CUSTOMIZADOS ---
function showAlert(title: string, message: string, icon = 'info') {
  const t = getEl<HTMLElement>('alert-title');
  const m = getEl<HTMLElement>('alert-message');
  const box = getEl<HTMLElement>('alert-icon');
  if (t) t.textContent = title;
  if (m) m.textContent = message;
  if (box) box.innerHTML = `<i data-lucide="${icon}" style="width: 48px; height: 48px;"></i>`;
  alertModal?.classList.add('active');
  createIcons({ icons });
}

function showConfirm(options: { 
  title: string, 
  message: string, 
  confirmText?: string, 
  cancelText?: string, 
  onConfirm: () => void,
  onCancel?: () => void 
}) {
  const t = getEl<HTMLElement>('confirm-title');
  const m = getEl<HTMLElement>('confirm-message');
  if (t) t.textContent = options.title;
  if (m) m.textContent = options.message;
  
  if (execConfirmBtn) execConfirmBtn.textContent = options.confirmText || "Confirmar";
  if (cancelConfirmBtn) cancelConfirmBtn.textContent = options.cancelText || "Cancelar";
  
  confirmModal?.classList.add('active');
  
  const cleanUp = () => {
    confirmModal?.classList.remove('active');
    if (execConfirmBtn) execConfirmBtn.onclick = null;
    if (cancelConfirmBtn) cancelConfirmBtn.onclick = null;
  };

  if (execConfirmBtn) execConfirmBtn.onclick = () => { options.onConfirm(); cleanUp(); };
  if (cancelConfirmBtn) cancelConfirmBtn.onclick = () => { if (options.onCancel) options.onCancel(); cleanUp(); };
}

getEl<HTMLElement>('close-alert')?.addEventListener('click', () => alertModal?.classList.remove('active'));

// --- SINCRONIZAÇÃO DE UI ---
function updateRatioUI(ratio: number, name: string | null = null) {
  if (ratioSlider) ratioSlider.value = ratio.toString();
  if (ratioDisplay) ratioDisplay.textContent = `${ratio}:1`;
  
  // Destacar botão de atalho correspondente
  document.querySelectorAll('.brand-btn').forEach(btn => {
    const btnRatio = btn.getAttribute('data-ratio');
    btn.classList.toggle('active', btnRatio === ratio.toString());
  });

  activeEquipName = name;
  if (brandIndicator) {
    if (name) {
      brandIndicator.textContent = `Perfil: ${name}`;
      brandIndicator.style.color = 'var(--primary)';
    } else {
      brandIndicator.textContent = "Ajuste Manual";
      brandIndicator.style.color = "var(--text-muted)";
    }
  }
  
  calculate();
}

// --- LÓGICA DE MODO ---
function setMode(mode: 'direct' | 'inverse') {
  isInverseMode = mode === 'inverse';
  
  if (fuelInput) fuelInput.value = '';
  if (oilInput) oilInput.value = '';
  activeEquipName = null;
  if (brandIndicator) {
    brandIndicator.textContent = "Pronto para misturar";
    brandIndicator.style.color = "var(--text-muted)";
  }
  
  modeDirect?.classList.toggle('active', !isInverseMode);
  modeInverse?.classList.toggle('active', isInverseMode);
  
  if (!isInverseMode) {
    if (mainInputLabel) mainInputLabel.textContent = "Quantidade de Gasolina";
    if (mainInputSuffix) mainInputSuffix.textContent = "LITROS";
    if (fuelInput) fuelInput.style.display = "block";
    if (oilInput) oilInput.style.display = "none";
    if (shortcutsFuel) shortcutsFuel.style.display = "flex";
    if (shortcutsOil) shortcutsOil.style.display = "none";
    if (resultLabelText) resultLabelText.textContent = "ÓLEO NECESSÁRIO";
    if (resultUnit) resultUnit.textContent = "ml";
  } else {
    if (mainInputLabel) mainInputLabel.textContent = "Quantidade de Óleo";
    if (mainInputSuffix) mainInputSuffix.textContent = "ML";
    if (fuelInput) fuelInput.style.display = "none";
    if (oilInput) oilInput.style.display = "block";
    if (shortcutsFuel) shortcutsFuel.style.display = "none";
    if (shortcutsOil) shortcutsOil.style.display = "flex";
    if (resultLabelText) resultLabelText.textContent = "GASOLINA NECESSÁRIA";
    if (resultUnit) resultUnit.textContent = "L";
  }
  
  calculate();
}

modeDirect?.addEventListener('click', () => setMode('direct'));
modeInverse?.addEventListener('click', () => setMode('inverse'));

// --- CÁLCULO CORE ---
function calculate() {
  if (!ratioSlider || !resultNum || !resultUnit) return;

  const ratio = parseInt(ratioSlider.value);
  currentRatio = ratio;
  if (ratioDisplay) ratioDisplay.textContent = `${ratio}:1`;
  
  updateSafetyBadge(ratio);

  let totalCost = 0;

  if (!isInverseMode) {
    const fuel = parseFloat(fuelInput?.value.replace(',', '.') || '0') || 0;
    const oilNeeded = (fuel * 1000) / ratio;
    
    if (oilNeeded >= 1000) {
      resultNum.textContent = (oilNeeded / 1000).toFixed(2);
      resultUnit.textContent = "L";
    } else {
      resultNum.textContent = Math.round(oilNeeded).toString();
      resultUnit.textContent = "ml";
    }
    
    if (isCostEnabled) {
      const pF = parseFloat(priceFuelInput?.value.replace(',', '.') || '0') || 0;
      const pO = parseFloat(priceOilInput?.value.replace(',', '.') || '0') || 0;
      totalCost = (fuel * pF) + ((oilNeeded / 1000) * pO);
    }
  } else {
    const oil = parseFloat(oilInput?.value.replace(',', '.') || '0') || 0;
    const fuelNeeded = (oil * ratio) / 1000;
    resultNum.textContent = fuelNeeded.toFixed(2);
    resultUnit.textContent = "L";
    
    if (isCostEnabled) {
      const pF = parseFloat(priceFuelInput?.value.replace(',', '.') || '0') || 0;
      const pO = parseFloat(priceOilInput?.value.replace(',', '.') || '0') || 0;
      totalCost = (fuelNeeded * pF) + ((oil / 1000) * pO);
    }
  }

  if (isCostEnabled && totalCost > 0) {
    if (costResult) costResult.style.display = 'block';
    if (totalCostVal) totalCostVal.textContent = totalCost.toFixed(2);
  } else {
    if (costResult) costResult.style.display = 'none';
  }
}

function updateSafetyBadge(ratio: number) {
  if (!safetyBadge || !safetyText) return;
  safetyBadge.classList.add('active');
  safetyBadge.className = 'status-badge active';
  
  if (ratio >= 25 && ratio <= 50) {
    safetyBadge.classList.add('status-safe');
    safetyText.textContent = "Mistura Ideal";
    safetyBadge.querySelector('i')?.setAttribute('data-lucide', 'info');
  } else if (ratio < 25) {
    safetyBadge.classList.add('status-warning');
    safetyText.textContent = "Mistura Rica (Fumaça)";
    safetyBadge.querySelector('i')?.setAttribute('data-lucide', 'alert-triangle');
  } else {
    safetyBadge.classList.add('status-unsafe');
    safetyText.textContent = "Risco de Dano (Pobre)";
    safetyBadge.querySelector('i')?.setAttribute('data-lucide', 'alert-circle');
  }
  createIcons({ icons });
}

// --- PERSISTÊNCIA ---
async function saveHistory(record: MixRecord) {
  const history = (await get('mix_history')) || [];
  history.unshift(record);
  await set('mix_history', history);
  renderHistory();
}

async function renderHistory() {
  let history = (await get('mix_history')) || [];
  const list = getEl<HTMLElement>('history-list');
  if (!list) return;

  // Filtro
  const term = historySearchTerm.toLowerCase();
  if (term) {
    history = history.filter((h: MixRecord) => 
      (h.equipmentName?.toLowerCase().includes(term)) ||
      (h.ratio.toString().includes(term)) ||
      (h.fuel.toString().includes(term)) ||
      (h.oil.toString().includes(term))
    );
  }

  // Ordenação
  history.sort((a: MixRecord, b: MixRecord) => {
    if (historySortBy === 'date') return b.id - a.id;
    if (historySortBy === 'name') {
      const nameA = a.equipmentName || "Personalizado";
      const nameB = b.equipmentName || "Personalizado";
      return nameA.localeCompare(nameB);
    }
    if (historySortBy === 'ratio') return a.ratio - b.ratio;
    return 0;
  });

  list.innerHTML = history.length ? '' : '<div class="empty-state">Nenhum registro encontrado</div>';
  
  history.forEach((h: MixRecord) => {
    const div = document.createElement('div');
    div.className = 'list-item';
    div.innerHTML = `
      <div class="item-info">
        <h4>${h.equipmentName ? h.equipmentName : (h.fuel + 'L @ ' + h.ratio + ':1')}</h4>
        <p>${new Date(h.date).toLocaleDateString()} • ${h.oil}ml óleo ${h.equipmentName ? '('+h.ratio+':1)' : ''}</p>
      </div>
      <div style="font-weight: 700; color: var(--primary)">${h.cost ? 'R$ '+h.cost : ''}</div>
    `;
    list.appendChild(div);
  });
}

async function saveEquipment(equip: Equipment) {
  let equips = (await get('user_equip')) || [];
  if (editingEquipId) {
    equips = equips.map((e: Equipment) => e.id === editingEquipId ? equip : e);
  } else {
    equips.push(equip);
  }
  await set('user_equip', equips);
  editingEquipId = null;
  renderEquipments();
}

async function renderEquipments() {
  const equips = (await get('user_equip')) || [];
  const list = getEl<HTMLElement>('equip-list');
  if (!list) return;

  list.innerHTML = equips.length ? '' : '<div class="empty-state">Nenhum equipamento salvo</div>';
  
  equips.forEach((e: Equipment) => {
    const div = document.createElement('div');
    div.className = 'list-item';
    div.innerHTML = `
      <div class="item-info">
        <h4>${e.name}</h4>
        <p>Proporção ${e.ratio}:1</p>
      </div>
      <div style="display: flex; gap: 8px;">
        <button class="header-btn use-equip" data-name="${e.name}" data-ratio="${e.ratio}" style="background: var(--primary); color: #000;"><i data-lucide="play" style="width: 14px;"></i></button>
        <button class="header-btn edit-equip" data-id="${e.id}" style="color: var(--text-muted);"><i data-lucide="edit-3" style="width: 14px;"></i></button>
        <button class="header-btn delete-equip" data-id="${e.id}" style="color: var(--danger);"><i data-lucide="trash-2" style="width: 14px;"></i></button>
      </div>
    `;
    
    div.querySelector('.use-equip')?.addEventListener('click', () => {
      updateRatioUI(e.ratio, e.name);
      switchTab('view-calc');
    });

    div.querySelector('.edit-equip')?.addEventListener('click', () => {
      editingEquipId = e.id;
      if (modalTitle) modalTitle.textContent = "Editar Perfil";
      const nameIn = getEl<HTMLInputElement>('new-equip-name');
      const ratioIn = getEl<HTMLInputElement>('new-equip-ratio');
      if (nameIn) nameIn.value = e.name;
      if (ratioIn) ratioIn.value = e.ratio.toString();
      equipModal?.classList.add('active');
    });

    div.querySelector('.delete-equip')?.addEventListener('click', () => {
      showConfirm({
        title: "Excluir?",
        message: `Deseja remover ${e.name}?`,
        confirmText: "Sim, Excluir",
        onConfirm: async () => {
          const filtered = equips.filter((item: Equipment) => item.id !== e.id);
          await set('user_equip', filtered);
          renderEquipments();
        }
      });
    });

    list.appendChild(div);
  });
  createIcons({ icons });
}

// --- INTERAÇÕES ---
function switchTab(tabId: string) {
  document.querySelectorAll('.tab-view').forEach(v => (v as HTMLElement).style.display = v.id === tabId ? 'flex' : 'none');
  document.querySelectorAll('.nav-btn').forEach(b => b.classList.toggle('active', b.getAttribute('data-tab') === tabId));
  if (tabId === 'view-history') renderHistory();
  if (tabId === 'view-equip') renderEquipments();
}

// Busca Avançada no Modal
brandSearch?.addEventListener('click', () => {
  searchModal?.classList.add('active');
  modalBrandSearch?.focus();
});

modalBrandSearch?.addEventListener('input', (e) => {
  const term = (e.target as HTMLInputElement).value.toLowerCase();
  const filtered = brands.filter(b => b.name.toLowerCase().includes(term) || b.model?.toLowerCase().includes(term));
  
  if (modalSearchResults) {
    modalSearchResults.innerHTML = '';
    if (term && term.length > 1 && filtered.length) {
      filtered.forEach(b => {
        const item = document.createElement('div');
        item.className = 'list-item';
        item.style.cursor = 'pointer';
        item.innerHTML = `
          <div class="item-info">
            <h4>${b.name}</h4>
            <p>${b.model || ''} (${b.ratio}:1)</p>
          </div>
          <i data-lucide="chevron-right" style="color: var(--primary)"></i>
        `;
        item.onclick = () => {
          updateRatioUI(b.ratio, b.name);
          searchModal?.classList.remove('active');
          if (modalBrandSearch) modalBrandSearch.value = '';
        };
        modalSearchResults.appendChild(item);
      });
      createIcons({ icons });
    } else if (term.length > 1) {
      modalSearchResults.innerHTML = '<div class="empty-state">Nenhum resultado encontrado</div>';
    }
  }
});

getEl<HTMLElement>('close-search-modal')?.addEventListener('click', () => searchModal?.classList.remove('active'));

// Event Listeners Globais
document.querySelectorAll('.nav-btn').forEach(btn => btn.addEventListener('click', () => switchTab(btn.getAttribute('data-tab') || 'view-calc')));

document.querySelectorAll('.vol-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    const val = btn.getAttribute('data-val');
    if (!isInverseMode) {
      if (fuelInput) fuelInput.value = val || '';
    } else {
      if (oilInput) oilInput.value = val || '';
    }
    calculate();
  });
});

getEl<HTMLElement>('clear-inputs')?.addEventListener('click', () => {
  if (fuelInput) fuelInput.value = '';
  if (oilInput) oilInput.value = '';
  activeEquipName = null;
  if (brandIndicator) {
    brandIndicator.textContent = 'Pronto para misturar';
    brandIndicator.style.color = 'var(--text-muted)';
  }
  calculate();
});

// Tema e Modais
getEl<HTMLElement>('theme-toggle')?.addEventListener('click', () => {
  const currentTheme = app.getAttribute('data-theme');
  const isDark = currentTheme === 'dark';
  app.setAttribute('data-theme', isDark ? 'light' : 'dark');
  const icon = getEl<HTMLElement>('theme-icon');
  icon?.setAttribute('data-lucide', isDark ? 'sun' : 'moon');
  createIcons({ icons });
});

getEl<HTMLElement>('help-btn')?.addEventListener('click', () => getEl<HTMLElement>('help-modal')?.classList.add('active'));
getEl<HTMLElement>('close-modal')?.addEventListener('click', () => getEl<HTMLElement>('help-modal')?.classList.remove('active'));

const openEquipModal = (ratio?: number) => {
  editingEquipId = null;
  if (modalTitle) modalTitle.textContent = "Novo Perfil";
  const nameIn = getEl<HTMLInputElement>('new-equip-name');
  const ratioIn = getEl<HTMLInputElement>('new-equip-ratio');
  if (nameIn) nameIn.value = '';
  if (ratio && ratioIn) ratioIn.value = ratio.toString();
  equipModal?.classList.add('active');
};

getEl<HTMLElement>('add-equip-btn')?.addEventListener('click', () => openEquipModal());
getEl<HTMLElement>('close-equip-modal')?.addEventListener('click', () => {
  equipModal?.classList.remove('active');
  pendingHistorySave = false;
});

getEl<HTMLElement>('toggle-costs')?.addEventListener('click', () => {
  isCostEnabled = !isCostEnabled;
  if (costInputs) costInputs.style.display = isCostEnabled ? 'flex' : 'none';
  calculate();
});

getEl<HTMLElement>('save-new-equip')?.addEventListener('click', () => {
  const name = (getEl<HTMLInputElement>('new-equip-name'))?.value;
  const ratioStr = (getEl<HTMLInputElement>('new-equip-ratio'))?.value;
  const ratio = parseInt(ratioStr || '50');
  
  if (name && ratio) {
    saveEquipment({ id: editingEquipId || Date.now(), name, ratio });
    equipModal?.classList.remove('active');
    
    if (pendingHistorySave) {
      activeEquipName = name;
      executeHistorySave();
      pendingHistorySave = false;
    } else {
      showAlert("Sucesso", editingEquipId ? "Perfil atualizado!" : "Equipamento salvo!", "check-circle");
    }
  }
});

function executeHistorySave() {
  const fuel = parseFloat(fuelInput?.value.replace(',', '.') || '0') || 0;
  const resultNumVal = parseFloat(resultNum?.textContent || '0') || 0;
  
  const oilLabel = resultNum?.textContent || '0';
  const oil = resultUnit?.textContent === 'L' ? parseFloat(oilLabel) * 1000 : parseFloat(oilLabel);
  
  saveHistory({
    id: Date.now(),
    date: new Date().toISOString(),
    fuel: isInverseMode ? resultNumVal : fuel,
    oil,
    ratio: currentRatio,
    cost: isCostEnabled ? parseFloat(totalCostVal?.textContent || '0') : undefined,
    equipmentName: activeEquipName || undefined
  });
  
  showAlert("Salvo", "Mistura registrada no histórico!", "check-circle");
}

getEl<HTMLElement>('save-mix')?.addEventListener('click', () => {
  const fuel = parseFloat(fuelInput?.value.replace(',', '.') || '0') || 0;
  const resultNumVal = parseFloat(resultNum?.textContent || '0') || 0;
  
  if (!isInverseMode && fuel <= 0) {
    showAlert("Opa!", "Insira a quantidade de gasolina primeiro.", "alert-triangle");
    return;
  }
  if (resultNumVal <= 0) {
    showAlert("Opa!", "O cálculo resultou em zero.", "alert-triangle");
    return;
  }

  if (!activeEquipName) {
    showConfirm({
      title: "Salvar Histórico",
      message: "Como deseja salvar este registro?",
      confirmText: "Salvar Avulso",
      cancelText: "Cadastrar Item",
      onConfirm: () => {
        activeEquipName = null;
        executeHistorySave();
      },
      onCancel: () => {
        pendingHistorySave = true;
        openEquipModal(currentRatio);
      }
    });
  } else {
    executeHistorySave();
  }
});

getEl<HTMLElement>('clear-history')?.addEventListener('click', () => {
  showConfirm({
    title: "Limpar Histórico?",
    message: "Tem certeza que deseja apagar todos os registros?",
    confirmText: "Sim, Limpar",
    onConfirm: async () => {
      await set('mix_history', []);
      renderHistory();
    }
  });
});

getEl<HTMLElement>('share-btn')?.addEventListener('click', () => {
  const msg = `Mix2T Calc: Mistura de ${resultNum?.textContent}${resultUnit?.textContent} em ${isInverseMode ? oilInput?.value+'ml de óleo' : fuelInput?.value+'L de gasolina'} (${currentRatio}:1).`;
  window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(msg)}`);
});

// listeners de histórico
historySearchInput?.addEventListener('input', (e) => {
  historySearchTerm = (e.target as HTMLInputElement).value;
  renderHistory();
});

historySortSelect?.addEventListener('change', (e) => {
  historySortBy = (e.target as HTMLSelectElement).value;
  renderHistory();
});

[fuelInput, oilInput, ratioSlider, priceFuelInput, priceOilInput].forEach(el => {
  el?.addEventListener('input', () => {
    if (el === ratioSlider) {
      if (ratioDisplay) ratioDisplay.textContent = `${ratioSlider.value}:1`;
      activeEquipName = null;
      if (brandIndicator) {
        brandIndicator.textContent = "Ajuste Manual";
        brandIndicator.style.color = "var(--text-muted)";
      }
      // Tirar destaque dos botões se não bater
      document.querySelectorAll('.brand-btn').forEach(btn => {
        const btnRatio = btn.getAttribute('data-ratio');
        btn.classList.toggle('active', btnRatio === ratioSlider.value);
      });
    }
    calculate();
  });
});

document.querySelectorAll('.brand-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    const ratio = btn.getAttribute('data-ratio') || '50';
    updateRatioUI(parseInt(ratio));
  });
});

// Inicialização
renderEquipments();
renderHistory();
setMode('direct');
