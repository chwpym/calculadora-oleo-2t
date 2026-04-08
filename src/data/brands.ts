export interface BrandProfile {
  id: string;
  name: string;
  model?: string;
  ratio: number;
  description: string;
}

export const brands: BrandProfile[] = [
  {
    id: 'toyama-breakin',
    name: 'Toyama',
    model: 'Amaciamento (1-20h)',
    ratio: 25,
    description: 'Proporção 25:1 recomendada para as primeiras 20 horas de uso.'
  },
  {
    id: 'toyama-normal',
    name: 'Toyama',
    model: 'Uso Normal',
    ratio: 50,
    description: 'Proporção 50:1 para uso após o amaciamento (com óleo Toyama ou similar).'
  },
  {
    id: 'stihl-50',
    name: 'Stihl',
    model: 'Padrão 8017 / Castrol',
    ratio: 50,
    description: 'Proporção 50:1 (20ml por litro) recomendada pela Stihl.'
  },
  {
    id: 'husqvarna-50',
    name: 'Husqvarna',
    model: 'Padrão High Performance',
    ratio: 50,
    description: 'Proporção 50:1 recomendada para motores Husqvarna.'
  },
  {
    id: 'generic-25',
    name: 'Genérico',
    model: '25:1 (Mineral)',
    ratio: 25,
    description: 'Proporção comum para motores antigos ou óleos minerais simples.'
  },
  {
    id: 'generic-32',
    name: 'Genérico',
    model: '32:1',
    ratio: 32,
    description: 'Proporção 32:1 (aprox. 31ml por litro).'
  },
  {
    id: 'generic-40',
    name: 'Genérico',
    model: '40:1',
    ratio: 40,
    description: 'Proporção intermediária comum (25ml por litro).'
  },
  {
    id: 'generic-50',
    name: 'Genérico',
    model: '50:1 (Sintético)',
    ratio: 50,
    description: 'Proporção padrão para óleos sintéticos/premium de alta qualidade.'
  }
];
