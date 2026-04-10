import './style.css';
import { 
  createIcons, Fuel, Droplet, Moon, Sun, Search, HelpCircle, X, 
  Calculator, Cog, History, Plus, Save, Share2, Info, Trash2, Play,
  AlertTriangle, AlertCircle
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
}

interface Equipment {
  id: number;
  name: string;
  ratio: number;
}

// Inicializar ícones
const icons = { Fuel, Droplet, Moon, Sun, Search, HelpCircle, X, Calculator, Cog, History, Plus, Save, Share2, Info, Trash2, Play, AlertTriangle, AlertCircle };
createIcons({ icons });

// Registro Manual do Service Worker
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js')
      .then(reg => {
        console.log('SW pronto!', reg);
        reg.onupdatefound = () => {
          const newWorker = reg.installing;
          if (newWorker) {
            newWorker.onstatechange = () => {
              if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                window.location.reload();
              }
            };
          }
        };
      })
      .catch(err => console.log('Erro no SW:', err));
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

// --- ELEMENTOS ---
const app = document.body;
const ratioSlider = document.getElementById('ratio-slider') as HTMLInputElement;
const ratioDisplay = document.getElementById('ratio-display') as HTMLElement;
const brandSearch = document.getElementById('brand-search') as HTMLInputElement;
const searchResults = document.getElementById('search-results') as HTMLElement;
const fuelInput = document.getElementById('fuel-input') as HTMLInputElement;
const oilInput = document.getElementById('oil-input') as HTMLInputElement;
const resultNum = document.getElementById('result-num') as HTMLElement;
const resultUnit = document.getElementById('result-unit') as HTMLElement;
const resultLabelText = document.getElementById('result-label-text') as HTMLElement;
const brandIndicator = document.getElementById('brand-indicator') as HTMLElement;
const costInputs = document.getElementById('cost-inputs') as HTMLElement;
const priceFuelInput = document.getElementById('price-fuel') as HTMLInputElement;
const priceOilInput = document.getElementById('price-oil') as HTMLInputElement;
const costResult = document.getElementById('cost-result') as HTMLElement;
const totalCostVal = document.getElementById('total-cost-val') as HTMLElement;
const safetyBadge = document.getElementById('safety-badge') as HTMLElement;
const safetyText = document.getElementById('safety-text') as HTMLElement;

// Novos Elementos de Modo
const modeDirect = document.getElementById('mode-direct') as HTMLButtonElement;
const modeInverse = document.getElementById('mode-inverse') as HTMLButtonElement;
const mainInputLabel = document.getElementById('main-input-label') as HTMLElement;
const mainInputSuffix = document.getElementById('main-input-suffix') as HTMLElement;
const shortcutsFuel = document.getElementById('shortcuts-fuel') as HTMLElement;
const shortcutsOil = document.getElementById('shortcuts-oil') as HTMLElement;

// --- LÓGICA DE MODO ---
function setMode(mode: 'direct' | 'inverse') {
  isInverseMode = mode === 'inverse';
  
  // Atualizar UI dos botões
  modeDirect.classList.toggle('active', !isInverseMode);
  modeInverse.classList.toggle('active', isInverseMode);
  
  // Trocar Labels e Inputs
  if (!isInverseMode) {
    mainInputLabel.textContent = "Quantidade de Gasolina";
    mainInputSuffix.textContent = "LITROS";
    fuelInput.style.display = "block";
    oilInput.style.display = "none";
    shortcutsFuel.style.display = "flex";
    shortcutsOil.style.display = "none";
    resultLabelText.textContent = "ÓLEO NECESSÁRIO";
    resultUnit.textContent = "ml";
  } else {
    mainInputLabel.textContent = "Quantidade de Óleo";
    mainInputSuffix.textContent = "ML";
    fuelInput.style.display = "none";
    oilInput.style.display = "block";
    shortcutsFuel.style.display = "none";
    shortcutsOil.style.display = "flex";
    resultLabelText.textContent = "GASOLINA NECESSÁRIA";
    resultUnit.textContent = "L";
  }
  
  calculate();
}

modeDirect.onclick = () => setMode('direct');
modeInverse.onclick = () => setMode('inverse');

// --- CÁLCULO CORE ---
function calculate() {
  const ratio = parseInt(ratioSlider.value);
  currentRatio = ratio;
  ratioDisplay.textContent = `${ratio}:1`;
  
  updateSafetyBadge(ratio);

  let totalCost = 0;

  if (!isInverseMode) {
    const fuel = parseFloat(fuelInput.value) || 0;
    const oilNeeded = (fuel * 1000) / ratio;
    
    // Formatação inteligente
    if (oilNeeded >= 1000) {
      resultNum.textContent = (oilNeeded / 1000).toFixed(2);
      resultUnit.textContent = "L";
    } else {
      resultNum.textContent = Math.round(oilNeeded).toString();
      resultUnit.textContent = "ml";
    }
    
    if (isCostEnabled) {
      const pF = parseFloat(priceFuelInput.value) || 0;
      const pO = parseFloat(priceOilInput.value) || 0;
      totalCost = (fuel * pF) + ((oilNeeded / 1000) * pO);
    }
  } else {
    const oil = parseFloat(oilInput.value) || 0;
    const fuelNeeded = (oil * ratio) / 1000;
    resultNum.textContent = fuelNeeded.toFixed(2);
    resultUnit.textContent = "L";
    
    if (isCostEnabled) {
      const pF = parseFloat(priceFuelInput.value) || 0;
      const pO = parseFloat(priceOilInput.value) || 0;
      totalCost = (fuelNeeded * pF) + ((oil / 1000) * pO);
    }
  }

  if (isCostEnabled && totalCost > 0) {
    costResult.style.display = 'block';
    totalCostVal.textContent = totalCost.toFixed(2);
  } else {
    costResult.style.display = 'none';
  }
}

function updateSafetyBadge(ratio: number) {
  safetyBadge.classList.add('active');
  safetyBadge.className = 'status-badge active'; // Reset classes
  
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
  await set('mix_history', history.slice(0, 20));
  renderHistory();
}

async function renderHistory() {
  const history = (await get('mix_history')) || [];
  const list = document.getElementById('history-list')!;
  list.innerHTML = history.length ? '' : '<div class="empty-state">Seu histórico está vazio</div>';
  
  history.forEach((h: MixRecord) => {
    const div = document.createElement('div');
    div.className = 'list-item';
    div.innerHTML = `
      <div class="item-info">
        <h4>${h.fuel}L @ ${h.ratio}:1</h4>
        <p>${new Date(h.date).toLocaleDateString()} • ${h.oil}ml óleo</p>
      </div>
      <div style="font-weight: 700; color: var(--primary)">${h.cost ? 'R$ '+h.cost : ''}</div>
    `;
    list.appendChild(div);
  });
}

async function saveEquipment(equip: Equipment) {
  const equips = (await get('user_equip')) || [];
  equips.push(equip);
  await set('user_equip', equips);
  renderEquipments();
}

async function renderEquipments() {
  const equips = (await get('user_equip')) || [];
  const list = document.getElementById('equip-list')!;
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
        <button class="header-btn use-equip" data-ratio="${e.ratio}" style="background: var(--primary); color: #000;"><i data-lucide="play" style="width: 14px;"></i></button>
        <button class="header-btn delete-equip" data-id="${e.id}" style="color: var(--danger);"><i data-lucide="trash-2" style="width: 14px;"></i></button>
      </div>
    `;
    
    div.querySelector('.use-equip')?.addEventListener('click', () => {
      ratioSlider.value = e.ratio.toString();
      calculate();
      switchTab('view-calc');
    });

    div.querySelector('.delete-equip')?.addEventListener('click', async () => {
      const filtered = equips.filter((item: Equipment) => item.id !== e.id);
      await set('user_equip', filtered);
      renderEquipments();
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

// Event Listeners
document.querySelectorAll('.nav-btn').forEach(btn => btn.addEventListener('click', () => switchTab(btn.getAttribute('data-tab') || 'view-calc')));

document.querySelectorAll('.vol-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    const val = btn.getAttribute('data-val');
    if (!isInverseMode) {
      fuelInput.value = val || '';
    } else {
      oilInput.value = val || '';
    }
    calculate();
  });
});

// Busca Marcas
brandSearch.addEventListener('input', (e) => {
  const term = (e.target as HTMLInputElement).value.toLowerCase();
  const filtered = brands.filter(b => b.name.toLowerCase().includes(term) || b.model?.toLowerCase().includes(term));
  
  searchResults.innerHTML = '';
  if (term && term.length > 1 && filtered.length) {
    filtered.forEach(b => {
      const item = document.createElement('div');
      item.className = 'search-item';
      item.innerHTML = `<strong>${b.name}</strong> <small>(${b.ratio}:1)</small>`;
      item.onclick = () => {
        ratioSlider.value = b.ratio.toString();
        brandIndicator.textContent = `Perfil: ${b.name}`;
        brandIndicator.style.color = 'var(--primary)';
        brandSearch.value = '';
        searchResults.classList.remove('active');
        calculate();
      };
      searchResults.appendChild(item);
    });
    searchResults.classList.add('active');
  } else {
    searchResults.classList.remove('active');
  }
});

// Tema e Modais
document.getElementById('theme-toggle')?.addEventListener('click', () => {
  const isDark = app.getAttribute('data-theme') === 'dark';
  app.setAttribute('data-theme', isDark ? 'light' : 'dark');
  const icon = document.getElementById('theme-icon');
  icon?.setAttribute('data-lucide', isDark ? 'sun' : 'moon');
  createIcons({ icons });
});

document.getElementById('help-btn')?.addEventListener('click', () => (document.getElementById('help-modal') as HTMLElement).classList.add('active'));
document.getElementById('close-modal')?.addEventListener('click', () => (document.getElementById('help-modal') as HTMLElement).classList.remove('active'));
document.getElementById('add-equip-btn')?.addEventListener('click', () => (document.getElementById('equip-modal') as HTMLElement).classList.add('active'));
document.getElementById('close-equip-modal')?.addEventListener('click', () => (document.getElementById('equip-modal') as HTMLElement).classList.remove('active'));

document.getElementById('toggle-costs')?.addEventListener('click', () => {
  isCostEnabled = !isCostEnabled;
  costInputs.style.display = isCostEnabled ? 'flex' : 'none';
  calculate();
});

document.getElementById('save-new-equip')?.addEventListener('click', () => {
  const name = (document.getElementById('new-equip-name') as HTMLInputElement).value;
  const ratio = parseInt((document.getElementById('new-equip-ratio') as HTMLInputElement).value);
  if (name && ratio) {
    saveEquipment({ id: Date.now(), name, ratio });
    (document.getElementById('equip-modal') as HTMLElement).classList.remove('active');
    (document.getElementById('new-equip-name') as HTMLInputElement).value = '';
  }
});

document.getElementById('save-mix')?.addEventListener('click', () => {
  const fuel = parseFloat(fuelInput.value) || 0;
  if (fuel <= 0 && !isInverseMode) return;
  
  const oilLabel = resultNum.textContent || '0';
  const oil = resultUnit.textContent === 'L' ? parseFloat(oilLabel) * 1000 : parseFloat(oilLabel);
  
  saveHistory({
    id: Date.now(),
    date: new Date().toISOString(),
    fuel: isInverseMode ? parseFloat(resultNum.textContent || '0') : fuel,
    oil,
    ratio: currentRatio,
    cost: isCostEnabled ? parseFloat(totalCostVal.textContent || '0') : undefined
  });
  alert('Mistura salva!');
});

document.getElementById('share-btn')?.addEventListener('click', () => {
  const msg = `Mix2T Calc: Mistura de ${resultNum.textContent}${resultUnit.textContent} em ${isInverseMode ? oilInput.value+'ml de óleo' : fuelInput.value+'L de gasolina'} (${currentRatio}:1).`;
  window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(msg)}`);
});

// Listener Global de Inputs
[fuelInput, oilInput, ratioSlider, priceFuelInput, priceOilInput].forEach(el => {
  el.addEventListener('input', () => {
    if (el === ratioSlider) ratioDisplay.textContent = `${ratioSlider.value}:1`;
    calculate();
  });
});

document.querySelectorAll('.brand-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    ratioSlider.value = btn.getAttribute('data-ratio') || '50';
    document.querySelectorAll('.brand-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    calculate();
  });
});

// Inicialização
renderEquipments();
renderHistory();
setMode('direct');
