export const ERAS = [
  {
    id: 0,
    name: 'Primordial',
    fullTitle: 'Sopa Primordial · Cámbrico',
    subtitle: 'Océanos hidrotermales y primeros cristales de vida',
    skyHex: 0x040711,
    fogHex: 0x060c1c,
    accentHex: '#22d3ee',
    unlockHint: 'Desbloquea Peces Acorazados para entrar al Mesozoico'
  },
  {
    id: 1,
    name: 'Mesozoico',
    fullTitle: 'Triásico y Jurásico',
    subtitle: 'Bosques de coníferas, volcanes activos y grandes saurios',
    skyHex: 0x08121a,
    fogHex: 0x0e2028,
    accentHex: '#f59e0b',
    unlockHint: 'Desbloquea Primeros Mamíferos para entrar a la Edad de Hielo'
  },
  {
    id: 2,
    name: 'Edad de Hielo',
    fullTitle: 'Pleistoceno · Edad de Hielo',
    subtitle: 'Glaciares eternos, megafauna lanuda y aurora humana',
    skyHex: 0x071122,
    fogHex: 0x0f223e,
    accentHex: '#a78bfa',
    unlockHint: 'Ciclo Cósmico disponible en la pestaña Extinción'
  }
];

export const COST_GROWTH = 1.15;

export const NODES = [
  { id: 'amino_acids', era: 0, code: 'AA', name: 'Aminoácidos', description: 'Moléculas orgánicas precursoras ensambladas cerca de fumarolas submarinas.', baseCost: 10, baseProd: 0.6, reqNode: null },
  { id: 'rna_replicator', era: 0, code: 'ARN', name: 'ARN Autorreplicante', description: 'Cadenas capaces de copiar su propia secuencia sin enzimas proteicas.', baseCost: 65, baseProd: 3.5, reqNode: 'amino_acids' },
  { id: 'prokaryote', era: 0, code: 'PRK', name: 'Célula Procariota', description: 'Organismos unicelulares sin núcleo que oxigenaron los mares primitivos.', baseCost: 360, baseProd: 16, reqNode: 'rna_replicator' },
  { id: 'eukaryote', era: 0, code: 'EUK', name: 'Célula Eucariota', description: 'Endosimbiosis con mitocondrias y núcleo protegido por membrana.', baseCost: 1900, baseProd: 75, reqNode: 'prokaryote' },
  { id: 'sponges', era: 0, code: 'ESP', name: 'Esponjas Abisales', description: 'Primeros animales pluricelulares filtradores del lecho oceánico.', baseCost: 9800, baseProd: 340, reqNode: 'eukaryote' },
  { id: 'trilobite', era: 0, code: 'TRL', name: 'Trilobite', description: 'Artrópodos acorazados con ojos compuestos de calcita del Cámbrico.', baseCost: 52000, baseProd: 1550, reqNode: 'sponges' },
  { id: 'armored_fish', era: 1, code: 'PEC', name: 'Peces Acorazados', description: 'Vertebrados con mandíbulas y placas dérmicas dominando mares someros.', baseCost: 270000, baseProd: 7100, reqNode: 'trilobite' },
  { id: 'amphibians', era: 1, code: 'ANF', name: 'Anfibios Pioneros', description: 'Aletas lobuladas convertidas en extremidades para conquistar tierra firme.', baseCost: 1450000, baseProd: 33000, reqNode: 'armored_fish' },
  { id: 'early_reptiles', era: 1, code: 'REP', name: 'Primeros Reptiles', description: 'Huevo amniótico y piel escamosa independientes del agua dulce.', baseCost: 7800000, baseProd: 152000, reqNode: 'amphibians' },
  { id: 'herrerasaurus', era: 1, code: 'HER', name: 'Herrerasaurus', description: 'Ágil terópodo bípedo del Triásico Tardío, uno de los primeros dinosaurios.', baseCost: 43000000, baseProd: 710000, reqNode: 'early_reptiles' },
  { id: 'brachiosaurus', era: 1, code: 'BRA', name: 'Brachiosaurus', description: 'Saurópodo gigante del Jurásico adaptado para alcanzar las copas de coníferas.', baseCost: 245000000, baseProd: 3450000, reqNode: 'herrerasaurus' },
  { id: 'tyrannosaurus', era: 1, code: 'REX', name: 'Tyrannosaurus Rex', description: 'Superdepredador ápice con mordida trituradora de huesos.', baseCost: 1450000000, baseProd: 17200000, reqNode: 'brachiosaurus' },
  { id: 'meteor_extinction', era: 1, code: 'KPG', name: 'Meteorito / Extinción', description: 'Impacto de Chicxulub: oscurece el cielo y reinicia los nichos ecológicos.', baseCost: 8900000000, baseProd: 86000000, reqNode: 'tyrannosaurus' },
  { id: 'early_mammals', era: 2, code: 'MAM', name: 'Primeros Mamíferos', description: 'Endotermia, pelaje aislante y cuidado parental bajo el nuevo clima.', baseCost: 56000000000, baseProd: 440000000, reqNode: 'meteor_extinction' },
  { id: 'megatherium', era: 2, code: 'MEG', name: 'Megatherium', description: 'Perezoso terrestre gigante del tamaño de un elefante con garras colosales.', baseCost: 365000000000, baseProd: 2350000000, reqNode: 'early_mammals' },
  { id: 'smilodon', era: 2, code: 'SMI', name: 'Smilodon', description: 'Tigre dientes de sable especialista en emboscadas en la estepa glacial.', baseCost: 2450000000000, baseProd: 13000000000, reqNode: 'megatherium' },
  { id: 'woolly_mammoth', era: 2, code: 'MMT', name: 'Mamut Lanudo', description: 'Proboscídeo de grandes colmillos curvos y denso manto para las ventiscas.', baseCost: 16800000000000, baseProd: 74000000000, reqNode: 'smilodon' },
  { id: 'archaic_hominins', era: 2, code: 'HOM', name: 'Homínidos Arcaicos', description: 'Bipedestación sostenida, talla de piedra y dominio temprano del fuego.', baseCost: 120000000000000, baseProd: 440000000000, reqNode: 'woolly_mammoth' },
  { id: 'homo_sapiens', era: 2, code: 'SAP', name: 'Homo Sapiens', description: 'Lenguaje simbólico, cultura compleja y conciencia del cosmos.', baseCost: 950000000000000, baseProd: 2900000000000, reqNode: 'archaic_hominins' }
];

export const UPGRADES = [
  { id: 'click_1', type: 'click', mult: 2, reqNode: 'amino_acids', reqCount: 1, cost: 45, name: 'Chispa Hidrotermal', description: 'Duplica el ADN obtenido por cada toque (x2).' },
  { id: 'click_2', type: 'click', mult: 3, reqNode: 'prokaryote', reqCount: 5, cost: 1800, name: 'Fotólisis Solar', description: 'Triplica la Entropía generada por toque (x3).' },
  { id: 'click_pct_1', type: 'click_pct', pct: 0.02, reqNode: 'trilobite', reqCount: 1, cost: 95000, name: 'Pulso Cámbrico', description: 'Cada toque añade +2% de tu producción total de ADN/seg.' },
  { id: 'click_3', type: 'click', mult: 4, reqNode: 'herrerasaurus', reqCount: 1, cost: 110000000, name: 'Resonancia Triásica', description: 'Multiplica por 4 el poder de cada toque.' },
  { id: 'click_pct_2', type: 'click_pct', pct: 0.05, reqNode: 'early_mammals', reqCount: 1, cost: 140000000000, name: 'Sinapsis Acelerada', description: 'Cada toque suma +5% adicional de tu ADN/seg total.' },
  { id: 'global_1', type: 'global', mult: 2, reqNode: 'homo_sapiens', reqCount: 1, cost: 4500000000000000, name: 'Genoma Universal', description: 'Duplica la producción de TODAS las especies (x2).' }
];

const SUFFIXES = ['', 'K', 'M', 'B', 'T', 'Qa', 'Qi', 'Sx', 'Sp', 'Oc', 'No', 'Dc', 'Ud', 'Dd', 'Td'];

export function formatNumber(num) {
  if (!Number.isFinite(num) || num <= 0) return '0';
  if (num < 1000) {
    return num < 10 && num % 1 !== 0 ? num.toFixed(1) : Math.floor(num).toString();
  }
  const tier = Math.floor(Math.log10(num) / 3);
  if (tier < SUFFIXES.length) {
    const scale = Math.pow(10, tier * 3);
    const scaled = num / scale;
    return `${scaled.toFixed(scaled >= 100 ? 1 : 2)}${SUFFIXES[tier]}`;
  }
  return num.toExponential(2).replace('+', '');
}

export function getSingleCost(node, owned) {
  return Math.ceil(node.baseCost * Math.pow(COST_GROWTH, owned));
}

export function getBulkCost(node, owned, qty) {
  if (qty <= 0) return 0;
  const r = COST_GROWTH;
  const first = node.baseCost * Math.pow(r, owned);
  const sum = first * ((Math.pow(r, qty) - 1) / (r - 1));
  return Math.ceil(sum);
}

export function getMaxAffordable(node, owned, adn) {
  const first = getSingleCost(node, owned);
  if (adn < first) return { qty: 0, cost: first };
  const r = COST_GROWTH;
  const baseFirst = node.baseCost * Math.pow(r, owned);
  const rawMax = Math.floor(Math.log((adn * (r - 1)) / baseFirst + 1) / Math.log(r));
  let qty = Math.max(1, Math.min(rawMax, 500));
  while (qty > 1 && getBulkCost(node, owned, qty) > adn) qty -= 1;
  while (getBulkCost(node, owned, qty + 1) <= adn && qty < 500) qty += 1;
  return { qty, cost: getBulkCost(node, owned, qty) };
}
