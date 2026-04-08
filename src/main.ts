import './style.css';
import { createIcons, Fuel, Droplet, Moon, Sun, Search, HelpCircle, X } from 'lucide';
import { brands } from './data/brands';
import type { BrandProfile } from './data/brands';
import { registerSW } from 'virtual:pwa-register';

// Inicializar ícones Lucide
createIcons({
  icons: { Fuel, Droplet, Moon, Sun, Search, HelpCircle, X }
});

// Registrar Service Worker
registerSW({ immediate: true });

// Estado da Aplicação
let currentRatio = 50;
let isInverseMode = false;

// Elementos da UI
const app = document.body;
const fuelInput = document.getElementById('fuel-input') as HTMLInputElement;
const oilInput = document.getElementById('oil-input') as HTMLInputElement;
const resultNum = document.getElementById('result-num') as HTMLElement;
const resultUnit = document.getElementById('result-unit') as HTMLElement;
const ratioDescription = document.getElementById('ratio-description') as HTMLElement;
const brandSearch = document.getElementById('brand-search') as HTMLInputElement;
const searchResults = document.getElementById('search-results') as HTMLElement;
const brandIndicator = document.getElementById('brand-indicator') as HTMLElement;
const ratioSlider = document.getElementById('ratio-slider') as HTMLInputElement;
const ratioDisplay = document.getElementById('ratio-display') as HTMLElement;
const btnFuel = document.getElementById('btn-fuel') as HTMLButtonElement;
const btnOil = document.getElementById('btn-oil') as HTMLButtonElement;
const themeToggle = document.getElementById('theme-toggle') as HTMLButtonElement;
const helpBtn = document.getElementById('help-btn') as HTMLButtonElement;
const helpModal = document.getElementById('help-modal') as HTMLElement;
const closeModal = document.getElementById('close-modal') as HTMLButtonElement;
const directMode = document.getElementById('direct-mode') as HTMLElement;
const inverseMode = document.getElementById('inverse-mode') as HTMLElement;
const resultLabelText = document.getElementById('result-label-text') as HTMLElement;

// --- LÓGICA DE CÁLCULO ---

function calculate() {
  if (!isInverseMode) {
    // Gasolina -> Óleo (Litros para ML)
    const fuel = parseFloat(fuelInput.value) || 0;
    const oilNeeded = (fuel * 1000) / currentRatio;
    
    // Formatação amigável
    if (oilNeeded > 1000) {
      resultNum.textContent = (oilNeeded / 1000).toFixed(2);
      resultUnit.textContent = 'L';
    } else {
      resultNum.textContent = Math.round(oilNeeded).toString();
      resultUnit.textContent = 'ml';
    }
    
    if (fuel > 100) {
      fuelInput.style.borderColor = 'var(--danger)';
    } else {
      fuelInput.style.borderColor = '';
    }
  } else {
    // Óleo -> Gasolina (ML para Litros)
    const oil = parseFloat(oilInput.value) || 0;
    const fuelNeeded = (oil * currentRatio) / 1000;
    
    resultNum.textContent = fuelNeeded.toFixed(2);
    resultUnit.textContent = 'L';
  }
}

// --- GERENCIAMENTO DE MARCAS ---

function setRatio(ratio: number, profile?: BrandProfile) {
  currentRatio = ratio;
  
  // Atualizar visual da UI
  document.querySelectorAll('.brand-btn').forEach(btn => {
    const btnRatio = parseInt(btn.getAttribute('data-ratio') || '0');
    if (btnRatio === ratio && !profile) {
      btn.classList.add('active');
    } else {
      btn.classList.remove('active');
    }
  });

  if (profile) {
    brandIndicator.textContent = `${profile.name} - ${profile.model}`;
    brandIndicator.style.color = 'var(--primary)';
    ratioDescription.textContent = profile.description;
    
    // Atualizar slider
    ratioSlider.value = ratio.toString();
    ratioDisplay.textContent = `${ratio}:1`;
  } else {
    brandIndicator.textContent = `Proporção ${ratio}:1`;
    brandIndicator.style.color = 'var(--text-muted)';
    ratioDescription.textContent = `Fórmula: Gasolina / ${ratio}. 1L de gasolina requer ${Math.round(1000/ratio)}ml de óleo.`;
    
    // Atualizar slider
    ratioSlider.value = ratio.toString();
    ratioDisplay.textContent = `${ratio}:1`;
  }
  
  calculate();
}

// --- BUSCA E FILTROS ---

function renderSearchResults(term: string) {
  const filtered = brands.filter(b => 
    b.name.toLowerCase().includes(term.toLowerCase()) || 
    (b.model && b.model.toLowerCase().includes(term.toLowerCase()))
  );

  searchResults.innerHTML = '';
  
  if (filtered.length > 0 && term) {
    filtered.forEach(brand => {
      const item = document.createElement('div');
      item.className = 'search-item';
      item.innerHTML = `
        <strong>${brand.name}</strong> - ${brand.model}
        <div style="font-size: 0.7rem; color: var(--text-muted)">Proporção ${brand.ratio}:1</div>
      `;
      item.onclick = () => {
        setRatio(brand.ratio, brand);
        brandSearch.value = brand.name;
        searchResults.classList.remove('active');
      };
      searchResults.appendChild(item);
    });
    searchResults.classList.add('active');
  } else {
    searchResults.classList.remove('active');
  }
}

// --- EVENT LISTENERS ---

fuelInput.addEventListener('input', calculate);
oilInput.addEventListener('input', calculate);

brandSearch.addEventListener('input', (e) => {
  renderSearchResults((e.target as HTMLInputElement).value);
});

// Fechar busca ao clicar fora
document.addEventListener('click', (e) => {
  if (!brandSearch.contains(e.target as Node) && !searchResults.contains(e.target as Node)) {
    searchResults.classList.remove('active');
  }
});

ratioSlider.addEventListener('input', (e) => {
  const ratio = parseInt((e.target as HTMLInputElement).value);
  setRatio(ratio);
});

document.querySelectorAll('.brand-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    const ratio = parseInt(btn.getAttribute('data-ratio') || '50');
    setRatio(ratio);
  });
});

themeToggle.addEventListener('click', () => {
  const currentTheme = app.getAttribute('data-theme');
  const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
  app.setAttribute('data-theme', newTheme);
  
  const icon = document.getElementById('theme-icon');
  if (icon) {
    icon.setAttribute('data-lucide', newTheme === 'dark' ? 'moon' : 'sun');
    createIcons({ icons: { Moon, Sun } });
  }
});

// Modal Logic
helpBtn.addEventListener('click', () => {
  helpModal.classList.add('active');
});

closeModal.addEventListener('click', () => {
  helpModal.classList.remove('active');
});

helpModal.addEventListener('click', (e) => {
  if (e.target === helpModal) {
    helpModal.classList.remove('active');
  }
});

btnFuel.addEventListener('click', () => {
  isInverseMode = false;
  btnFuel.classList.add('active');
  btnOil.classList.remove('active');
  directMode.style.display = 'block';
  inverseMode.style.display = 'none';
  resultLabelText.textContent = 'ÓLEO NECESSÁRIO';
  calculate();
});

btnOil.addEventListener('click', () => {
  isInverseMode = true;
  btnOil.classList.add('active');
  btnFuel.classList.remove('active');
  directMode.style.display = 'none';
  inverseMode.style.display = 'block';
  resultLabelText.textContent = 'GASOLINA NECESSÁRIA';
  calculate();
});

// Inicialização
setRatio(50);
