import './style.css';
import { 
  createIcons, Fuel, Droplet, Moon, Sun, Search, HelpCircle, X, 
  Calculator, Cog, History, Plus, Save, Share2, Info, Trash2, Play
} from 'lucide';
import { brands } from './data/brands';
import type { BrandProfile } from './data/brands';
import { get, set } from 'idb-keyval';

// Inicializar ícones
const icons = { Fuel, Droplet, Moon, Sun, Search, HelpCircle, X, Calculator, Cog, History, Plus, Save, Share2, Info, Trash2, Play };
createIcons({ icons });

// Registro Manual do Service Worker
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js')
      .then(reg => console.log('SW pronto!', reg))
      .catch(err => console.log('Erro no SW:', err));
  });
}

// --- ESTADO ---
let currentRatio = 50;
let isInverseMode = false;
let showCosts = false;

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

// --- ELEMENTOS ---
const app = document.body;
const fuelInput = document.getElementById('fuel-input') as HTMLInputElement;
const oilInput = document.getElementById('oil-input') as HTMLInputElement;
const resultNum = document.getElementById('result-num') as HTMLElement;
const resultUnit = document.getElementById('result-unit') as HTMLElement;
const brandSearch = document.getElementById('brand-search') as HTMLInputElement;
const searchResults = document.getElementById('search-results') as HTMLElement;
const ratioSlider = document.getElementById('ratio-slider') as HTMLInputElement;
const ratioDisplay = document.getElementById('ratio-display') as HTMLElement;
const brandIndicator = document.getElementById('brand-indicator') as HTMLElement;

// Custos
const toggleCostsBtn = document.getElementById('toggle-costs') as HTMLButtonElement;
const costInputs = document.getElementById('cost-inputs') as HTMLElement;
const priceFuel = document.getElementById('price-fuel') as HTMLInputElement;
const priceOil = document.getElementById('price-oil') as HTMLInputElement;
const costResult = document.getElementById('cost-result') as HTMLElement;
const totalCostVal = document.getElementById('total-cost-val') as HTMLElement;

// Nav/Tabs
const navBtns = document.querySelectorAll('.nav-btn');
const tabViews = document.querySelectorAll('.tab-view');

// Modais
const helpModal = document.getElementById('help-modal') as HTMLElement;
const equipModal = document.getElementById('equip-modal') as HTMLElement;

// Listas
const equipList = document.getElementById('equip-list') as HTMLElement;
const historyList = document.getElementById('history-list') as HTMLElement;

// --- PERSISTÊNCIA ---
async function saveHistory(record: MixRecord) {
  const history = (await get('mix_history')) || [];
  history.unshift(record);
  await set('mix_history', history.slice(0, 10)); // Top 10
  renderHistory();
}

async function renderHistory() {
  const history = (await get('mix_history')) || [];
  historyList.innerHTML = history.length ? '' : '<div class="empty-state">Seu histórico está vazio</div>';
  
  history.forEach((item: MixRecord) => {
    const div = document.createElement('div');
    div.className = 'list-item';
    div.innerHTML = `
      <div class="item-info">
        <h4>${item.fuel}L @ ${item.ratio}:1</h4>
        <p>${new Date(item.date).toLocaleDateString()} - ${item.oil}ml óleo</p>
      </div>
      <div style="font-weight: 700; color: var(--primary)">${item.cost ? 'R$ '+item.cost : ''}</div>
    `;
    historyList.appendChild(div);
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
  equipList.innerHTML = equips.length ? '' : '<div class="empty-state">Nenhum equipamento salvo</div>';
  
  equips.forEach((item: Equipment) => {
    const div = document.createElement('div');
    div.className = 'list-item';
    div.innerHTML = `
      <div class="item-info">
        <h4>${item.name}</h4>
        <p>Proporção fixa ${item.ratio}:1</p>
      </div>
      <div style="display: flex; gap: 8px;">
        <button class="header-btn use-equip" data-ratio="${item.ratio}" style="width: 32px; height: 32px; background: var(--primary); color: #000;"><i data-lucide="play" style="width: 14px;"></i></button>
        <button class="header-btn delete-equip" data-id="${item.id}" style="width: 32px; height: 32px; color: var(--danger);"><i data-lucide="trash-2" style="width: 14px;"></i></button>
      </div>
    `;
    
    div.querySelector('.use-equip')?.addEventListener('click', () => {
      setRatio(item.ratio);
      switchTab('view-calc');
    });

    div.querySelector('.delete-equip')?.addEventListener('click', async () => {
      const filtered = equips.filter((e: Equipment) => e.id !== item.id);
      await set('user_equip', filtered);
      renderEquipments();
    });

    equipList.appendChild(div);
  });
  createIcons({ icons });
}

// --- CÁLCULO ---
function calculate() {
  const fuel = parseFloat(fuelInput.value) || 0;
  const oil = parseFloat(oilInput.value) || 0;
  let totalCost = 0;

  if (!isInverseMode) {
    const oilNeeded = (fuel * 1000) / currentRatio;
    resultNum.textContent = oilNeeded > 1000 ? (oilNeeded / 1000).toFixed(2) : Math.round(oilNeeded).toString();
    resultUnit.textContent = oilNeeded > 1000 ? 'L' : 'ml';
    
    if (showCosts) {
      const pF = parseFloat(priceFuel.value) || 0;
      const pO = parseFloat(priceOil.value) || 0;
      totalCost = (fuel * pF) + ((oilNeeded / 1000) * pO);
    }
  } else {
    const fuelNeeded = (oil * currentRatio) / 1000;
    resultNum.textContent = fuelNeeded.toFixed(2);
    resultUnit.textContent = 'L';
    
    if (showCosts) {
      const pF = parseFloat(priceFuel.value) || 0;
      const pO = parseFloat(priceOil.value) || 0;
      totalCost = (fuelNeeded * pF) + ((oil / 1000) * pO);
    }
  }

  if (showCosts && totalCost > 0) {
    costResult.style.display = 'block';
    totalCostVal.textContent = totalCost.toFixed(2);
  } else {
    costResult.style.display = 'none';
  }
}

function setRatio(ratio: number, profile?: BrandProfile) {
  currentRatio = ratio;
  ratioSlider.value = ratio.toString();
  ratioDisplay.textContent = `${ratio}:1`;
  
  document.querySelectorAll('.brand-btn').forEach(btn => {
    btn.classList.toggle('active', parseInt(btn.getAttribute('data-ratio') || '0') === ratio && !profile);
  });

  if (profile) {
    brandIndicator.textContent = `${profile.name} - ${profile.model}`;
    brandIndicator.style.color = 'var(--primary)';
  } else {
    brandIndicator.textContent = `Proporção ${ratio}:1`;
    brandIndicator.style.color = 'var(--text-muted)';
  }
  calculate();
}

// --- INTERAÇÕES ---
function switchTab(tabId: string) {
  tabViews.forEach(v => (v as HTMLElement).style.display = v.id === tabId ? 'flex' : 'none');
  navBtns.forEach(b => b.classList.toggle('active', b.getAttribute('data-tab') === tabId));
  if (tabId === 'view-history') renderHistory();
  if (tabId === 'view-equip') renderEquipments();
}

// Event Listeners
navBtns.forEach(btn => btn.addEventListener('click', () => switchTab(btn.getAttribute('data-tab') || 'view-calc')));

document.querySelectorAll('.vol-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    fuelInput.value = btn.getAttribute('data-val') || '';
    calculate();
  });
});

toggleCostsBtn.addEventListener('click', () => {
  showCosts = !showCosts;
  costInputs.style.display = showCosts ? 'flex' : 'none';
  calculate();
});

document.getElementById('save-mix')?.addEventListener('click', () => {
  const fuel = parseFloat(fuelInput.value) || 0;
  if (fuel <= 0) return;
  
  const oil = parseFloat(resultNum.textContent || '0');
  const unit = resultUnit.textContent;
  const cost = showCosts ? parseFloat(totalCostVal.textContent || '0') : undefined;

  saveHistory({
    id: Date.now(),
    date: new Date().toISOString(),
    fuel,
    oil: unit === 'L' ? oil * 1000 : oil,
    ratio: currentRatio,
    cost
  });
});

document.getElementById('share-btn')?.addEventListener('click', () => {
  const msg = `Mix2T Calc: Misture ${resultNum.textContent}${resultUnit.textContent} de óleo em ${fuelInput.value}L de gasolina (Proporção ${currentRatio}:1).`;
  window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(msg)}`);
});

// Busca Marcas
brandSearch.addEventListener('input', (e) => {
  const term = (e.target as HTMLInputElement).value.toLowerCase();
  const filtered = brands.filter(b => b.name.toLowerCase().includes(term) || b.model?.toLowerCase().includes(term));
  
  searchResults.innerHTML = '';
  if (term && filtered.length) {
    filtered.forEach(b => {
      const item = document.createElement('div');
      item.className = 'search-item';
      item.innerHTML = `<strong>${b.name}</strong> - ${b.model} <small>(${b.ratio}:1)</small>`;
      item.onclick = () => {
        setRatio(b.ratio, b);
        brandSearch.value = b.name;
        searchResults.classList.remove('active');
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

document.getElementById('help-btn')?.addEventListener('click', () => helpModal.classList.add('active'));
document.getElementById('close-modal')?.addEventListener('click', () => helpModal.classList.remove('active'));

document.getElementById('add-equip-btn')?.addEventListener('click', () => equipModal.classList.add('active'));
document.getElementById('close-equip-modal')?.addEventListener('click', () => equipModal.classList.remove('active'));

document.getElementById('save-new-equip')?.addEventListener('click', () => {
  const name = (document.getElementById('new-equip-name') as HTMLInputElement).value;
  const ratio = parseFloat((document.getElementById('new-equip-ratio') as HTMLInputElement).value);
  if (name && ratio) {
    saveEquipment({ id: Date.now(), name, ratio });
    equipModal.classList.remove('active');
  }
});

// Inputs Listeners
[fuelInput, oilInput, ratioSlider, priceFuel, priceOil].forEach(el => {
  el.addEventListener('input', () => {
    if (el === ratioSlider) ratioDisplay.textContent = `${ratioSlider.value}:1`;
    currentRatio = parseInt(ratioSlider.value);
    calculate();
  });
});

document.querySelectorAll('.brand-btn').forEach(btn => {
  btn.addEventListener('click', () => setRatio(parseInt(btn.getAttribute('data-ratio') || '50')));
});

// Inicialização
renderEquipments();
renderHistory();
setRatio(50);
