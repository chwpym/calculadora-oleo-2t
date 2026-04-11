# Mix2T Calc PRO - Desenvolvimento e Design

Este documento codifica os padrões visuais e lógicos do projeto Mix2T Calc PRO, servindo como uma "Skill" para orientar futuras manutenções e evitar regressões.

## 🎨 Design System (Steel & Fire)

### Cores Base
- **Primary (Destaque)**: `hsl(24, 100%, 50%)` (Laranja/Ouro Vibrante).
- **Background (Dark)**: `hsl(222, 47%, 11%)` (Azul Ardósia Profundo).
- **Surface (Cards)**: `hsla(222, 47%, 15%, 0.8)` com efeito Glassmorphism.
- **Success**: `hsl(142, 70%, 45%)`.
- **Danger**: `hsl(0, 84%, 60%)`.

### Identidade Visual
- **Tipografia**: Utilizar 'Outfit' (Google Fonts) para um visual moderno e técnico.
- **Elevação**: Bordas arredondadas de `16px` (`--radius`).
- **Efeitos**: Uso intensivo de `backdrop-filter: blur(12px)` e gradientes sutis para profundidade.
- **Animações**: Transições suaves de `0.3s` baseadas em `cubic-bezier`.

## ⚙️ Regras Logicas de Cálculo

### Proporções (X:1)
- O cálculo deve SEMPRE usar a fórmula: `Óleo (ml) = (Gasolina (L) * 1000) / Proporção`.
- No modo inverso: `Gasolina (L) = (Óleo (ml) * Proporção) / 1000`.
- **Importante**: Ao trocar de modo (Gasolina ↔ Óleo), os campos de entrada devem ser limpos para evitar confusão.

### Segurança
- **Mistura Rica (< 25:1)**: Alerta de fumaça excessiva.
- **Mistura Ideal (25:1 - 50:1)**: Status seguro.
- **Mistura Pobre (> 50:1)**: Alerta crítico de risco de dano ao motor.

## 🧱 Padrões de Componentes

### Modais
- Devem seguir o estilo Dark/Glass com sobreposição opaca (`0.8`).
- Devem ser centrados e responsivos com animação de `fadeIn`.

### Histórico e Equipamentos
- Persistência utilizando `idb-keyval` (IndexedDB).
- Registros de histórico devem carregar o `equipmentName` se a mistura foi originada de um perfil salvo.

## 🚀 PWA e Service Worker
- **Estratégia de Cache**: "Network First" para `index.html` e "Cache First" para ativos (`/assets/`).
- **Build**: Vite + TypeScript. Nunca usar caminhos de `/src/` em arquivos de produção (`sw.js`).
