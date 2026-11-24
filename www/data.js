export const ERAS = [
  {
    id: 0,
    name: 'Primordial',
    fullTitle: 'Sopa Primordial · Cámbrico',
    subtitle: 'Océanos hidrotermales y primeros cristales de vida',
    skyHex: 0x050914,
    fogHex: 0x071226,
    accentHex: '#22d3ee',
    unlockHint: 'Desbloquea Peces Acorazados para entrar al Mesozoico'
  },
  {
    id: 1,
    name: 'Mesozoico',
    fullTitle: 'Triásico y Jurásico',
    subtitle: 'Bosques de coníferas, volcanes activos y grandes saurios',
    skyHex: 0x09161d,
    fogHex: 0x0f252b,
    accentHex: '#f59e0b',
    unlockHint: 'Desbloquea Primeros Mamíferos para entrar a la Edad de Hielo'
  },
  {
    id: 2,
    name: 'Edad de Hielo',
    fullTitle: 'Pleistoceno · Edad de Hielo',
    subtitle: 'Glaciares eternos, megafauna lanuda y aurora humana',
    skyHex: 0x091326,
    fogHex: 0x132644,
    accentHex: '#a78bfa',
    unlockHint: 'Ciclo Cósmico disponible en la pestaña Extinción'
  }
];

export const COST_GROWTH = 1.15;

// 19 nodos evolutivos conectados secuencialmente a través de las 3 Eras
export const NODES = [
  {
    id: 'amino_acids',
    era: 0,
    code: 'AA',
    name: 'Aminoácidos',
    description: 'Moléculas orgánicas precursoras ensambladas cerca de fumarolas submarinas.',
    baseCost: 10,
    baseProd: 0.6,
    reqNode: null
  },
  {
    id: 'rna_replicator',
    era: 0,
    code: 'ARN',
    name: 'ARN Autorreplicante',
    description: 'Cadenas capaces de copiar su propia secuencia sin enzimas proteicas.',
    baseCost: 65,
    baseProd: 3.5,
    reqNode: 'amino_acids'
  },
  {
    id: 'prokaryote',
    era: 0,
    code: 'PRK',
    name: 'Célula Procariota',
    description: 'Organismos unicelulares sin núcleo que oxigenaron los mares primitivos.',
    baseCost: 360,
    baseProd: 16,
    reqNode: 'rna_replicator'
  },
  {
    id: 'eukaryote',
    era: 0,
    code: 'EUK',
    name: 'Célula Eucariota',
    description: 'Endosimbiosis con mitocondrias y núcleo protegido por membrana.',
    baseCost: 1900,
    baseProd: 75,
    reqNode: 'prokaryote'
  },
  {
    id: 'sponges',
    era: 0,
    code: 'ESP',
    name: 'Esponjas Abisales',
    description: 'Primeros animales pluricelulares filtradores del lecho oceánico.',
    baseCost: 9800,
    baseProd: 340,
    reqNode: 'eukaryote'
  },
  {
    id: 'trilobite',
    era: 0,
    code: 'TRL',
    name: 'Trilobite',
    description: 'Artrópodos acorazados con ojos compuestos de calcita del Cámbrico.',
    baseCost: 52000,
    baseProd: 1550,
    reqNode: 'sponges'
  },
  {
    id: 'armored_fish',
    era: 1,
    code: 'PEC',
    name: 'Peces Acorazados',
    description: 'Vertebrados con mandíbulas y placas dérmicas dominando mares someros.',
    baseCost: 270000,
    baseProd: 7100,
    reqNode: 'trilobite'
  },
  {
    id: 'amphibians',
    era: 1,
    code: 'ANF',
    name: 'Anfibios Pioneros',
    description: 'Aletas lobuladas convertidas en extremidades para conquistar tierra firme.',
    baseCost: 1450000,
    baseProd: 33000,
    reqNode: 'armored_fish'
  },
  {
    id: 'early_reptiles',
    era: 1,
    code: 'REP',
    name: 'Primeros Reptiles',
    description: 'Huevo amniótico y piel escamosa independientes del agua dulce.',
    baseCost: 7800000,
    baseProd: 152000,
    reqNode: 'amphibians'
  },
  {
    id: 'herrerasaurus',
    era: 1,
    code: 'HER',
    name: 'Herrerasaurus',
    description: 'Ágil terópodo bípedo del Triásico Tardío, uno de los primeros dinosaurios.',
    baseCost: 43000000,
    baseProd: 710000,
    reqNode: 'early_reptiles'
  },
  {
    id: 'brachiosaurus',
    era: 1,
    code: 'BRA',
    name: 'Brachiosaurus',
    description: 'Saurópodo gigante del Jurásico adaptado para alcanzar las copas de coníferas.',
    baseCost: 245000000,
    baseProd: 3450000,
    reqNode: 'herrerasaurus'
  },
  {
    id: 'tyrannosaurus',
    era: 1,
    code: 'REX',
    name: 'Tyrannosaurus Rex',
    description: 'Superdepredador ápice con mordida trituradora de huesos.',
    baseCost: 1450000000,
    baseProd: 17200000,
    reqNode: 'brachiosaurus'
  },
  {
    id: 'meteor_extinction',
    era: 1,
    code: 'KPG',
    name: 'Meteorito / Extinción',
    description: 'Impacto de Chicxulub: oscurece el cielo y reinicia los nichos ecológicos.',
    baseCost: 8900000000,
    baseProd: 86000000,
    reqNode: 'tyrannosaurus'
  },
  {
    id: 'early_mammals',
    era: 2,
    code: 'MAM',
    name: 'Primeros Mamíferos',
    description: 'Endotermia, pelaje aislante y cuidado parental bajo el nuevo clima.',
    baseCost: 56000000000,
    baseProd: 440000000,
    reqNode: 'meteor_extinction'
  },
  {
    id: 'megatherium',
    era: 2,
    code: 'MEG',
    name: 'Megatherium',
    description: 'Perezoso terrestre gigante del tamaño de un elefante con garras colosales.',
    baseCost: 365000000000,
    baseProd: 2350000000,
    reqNode: 'early_mammals'
  },
  {
    id: 'smilodon',
    era: 2,
    code: 'SMI',
    name: 'Smilodon',
    description: 'Tigre dientes de sable especialista en emboscadas en la estepa glacial.',
    baseCost: 2450000000000,
    baseProd: 13000000000,
    reqNode: 'megatherium'
  },
  {
    id: 'woolly_mammoth',
    era: 2,
    code: 'MMT',
    name: 'Mamut Lanudo',
    description: 'Proboscídeo de grandes colmillos curvos y denso manto para las ventiscas.',
    baseCost: 16800000000000,
    baseProd: 74000000000,
    reqNode: 'smilodon'
  },
  {
    id: 'archaic_hominins',
    era: 2,
    code: 'HOM',
    name: 'Homínidos Arcaicos',
    description: 'Bipedestación sostenida, talla de piedra y dominio temprano del fuego.',
    baseCost: 120000000000000,
    baseProd: 440000000000,
    reqNode: 'woolly_mammoth'
  },
  {
    id: 'homo_sapiens',
    era: 2,
    code: 'SAP',
    name: 'Homo Sapiens',
    description: 'Lenguaje simbólico, cultura compleja y conciencia del cosmos.',
    baseCost: 950000000000000,
    baseProd: 2900000000000,
    reqNode: 'archaic_hominins'
  }
];

export const UPGRADES = [
  // Mejoras de toque / clic
  {
    id: 'click_1',
    type: 'click',
    mult: 2,
    reqNode: 'amino_acids',
    reqCount: 1,
    cost: 45,
    name: 'Chispa Hidrotermal',
    description: 'Duplica el ADN obtenido por cada toque en el planeta (x2).'
  },
  {
    id: 'click_2',
    type: 'click',
    mult: 3,
    reqNode: 'prokaryote',
    reqCount: 5,
    cost: 1800,
    name: 'Fotólisis Solar',
    description: 'Triplica la Entropía generada por toque (x3).'
  },
  {
    id: 'click_pct_1',
    type: 'click_pct',
    pct: 0.02,
    reqNode: 'trilobite',
    reqCount: 1,
    cost: 95000,
    name: 'Pulso Cámbrico',
    description: 'Cada toque añade +2% de tu producción total de ADN/seg.'
  },
  {
    id: 'click_3',
    type: 'click',
    mult: 4,
    reqNode: 'herrerasaurus',
    reqCount: 1,
    cost: 110000000,
    name: 'Resonancia Triásica',
    description: 'Multiplica por 4 el poder base de cada toque.'
  },
  {
    id: 'click_pct_2',
    type: 'click_pct',
    pct: 0.05,
    reqNode: 'early_mammals',
    reqCount: 1,
    cost: 140000000000,
    name: 'Sinapsis Acelerada',
    description: 'Cada toque suma +5% adicional de tu ADN/seg total.'
  },

  // Mutaciones por especie
  {
    id: 'm_amino_1',
    type: 'node',
    targetId: 'amino_acids',
    mult: 2,
    reqNode: 'amino_acids',
    reqCount: 10,
    cost: 120,
    name: 'Plegamiento Proteico',
    description: 'Aminoácidos producen x2 ADN/seg.'
  },
  {
    id: 'm_rna_1',
    type: 'node',
    targetId: 'rna_replicator',
    mult: 2,
    reqNode: 'rna_replicator',
    reqCount: 10,
    cost: 750,
    name: 'Ribozimas Estables',
    description: 'ARN Autorreplicante produce x2 ADN/seg.'
  },
  {
    id: 'm_prok_1',
    type: 'node',
    targetId: 'prokaryote',
    mult: 2,
    reqNode: 'prokaryote',
    reqCount: 10,
    cost: 4200,
    name: 'Fotosíntesis Oxigénica',
    description: 'Célula Procariota produce x2 ADN/seg.'
  },
  {
    id: 'm_euk_1',
    type: 'node',
    targetId: 'eukaryote',
    mult: 2,
    reqNode: 'eukaryote',
    reqCount: 10,
    cost: 22000,
    name: 'Mitosis Acelerada',
    description: 'Célula Eucariota produce x2 ADN/seg.'
  },
  {
    id: 'm_sponge_1',
    type: 'node',
    targetId: 'sponges',
    mult: 2,
    reqNode: 'sponges',
    reqCount: 10,
    cost: 110000,
    name: 'Arrecifes Calcáreos',
    description: 'Esponjas Abisales producen x2 ADN/seg.'
  },
  {
    id: 'm_trilo_1',
    type: 'node',
    targetId: 'trilobite',
    mult: 2,
    reqNode: 'trilobite',
    reqCount: 10,
    cost: 580000,
    name: 'Ojos de Calcita',
    description: 'Trilobite produce x2 ADN/seg.'
  },
  {
    id: 'm_fish_1',
    type: 'node',
    targetId: 'armored_fish',
    mult: 2,
    reqNode: 'armored_fish',
    reqCount: 10,
    cost: 3200000,
    name: 'Mandíbula Articulada',
    description: 'Peces Acorazados producen x2 ADN/seg.'
  },
  {
    id: 'm_amph_1',
    type: 'node',
    targetId: 'amphibians',
    mult: 2,
    reqNode: 'amphibians',
    reqCount: 10,
    cost: 16500000,
    name: 'Pulmones Vasculares',
    description: 'Anfibios Pioneros producen x2 ADN/seg.'
  },
  {
    id: 'm_rep_1',
    type: 'node',
    targetId: 'early_reptiles',
    mult: 2,
    reqNode: 'early_reptiles',
    reqCount: 10,
    cost: 88000000,
    name: 'Cáscara Amniótica',
    description: 'Primeros Reptiles producen x2 ADN/seg.'
  },
  {
    id: 'm_herr_1',
    type: 'node',
    targetId: 'herrerasaurus',
    mult: 2,
    reqNode: 'herrerasaurus',
    reqCount: 10,
    cost: 490000000,
    name: 'Caza en Manada Triásica',
    description: 'Herrerasaurus produce x2 ADN/seg.'
  },
  {
    id: 'm_brach_1',
    type: 'node',
    targetId: 'brachiosaurus',
    mult: 2,
    reqNode: 'brachiosaurus',
    reqCount: 10,
    cost: 2800000000,
    name: 'Sacos Aéreos Vertebrales',
    description: 'Brachiosaurus produce x2 ADN/seg.'
  },
  {
    id: 'm_trex_1',
    type: 'node',
    targetId: 'tyrannosaurus',
    mult: 2,
    reqNode: 'tyrannosaurus',
    reqCount: 10,
    cost: 16500000000,
    name: 'Visión Binocular Ápice',
    description: 'Tyrannosaurus Rex produce x2 ADN/seg.'
  },
  {
    id: 'm_kpg_1',
    type: 'node',
    targetId: 'meteor_extinction',
    mult: 2,
    reqNode: 'meteor_extinction',
    reqCount: 5,
    cost: 95000000000,
    name: 'Invierno de Impacto',
    description: 'Meteorito / Extinción duplica su flujo evolutivo (x2).'
  },
  {
    id: 'm_mamm_1',
    type: 'node',
    targetId: 'early_mammals',
    mult: 2,
    reqNode: 'early_mammals',
    reqCount: 10,
    cost: 620000000000,
    name: 'Metabolismo Endotérmico',
    description: 'Primeros Mamíferos producen x2 ADN/seg.'
  },
  {
    id: 'm_mega_1',
    type: 'node',
    targetId: 'megatherium',
    mult: 2,
    reqNode: 'megatherium',
    reqCount: 10,
    cost: 4100000000000,
    name: 'Garras Excavadoras',
    description: 'Megatherium produce x2 ADN/seg.'
  },
  {
    id: 'm_smil_1',
    type: 'node',
    targetId: 'smilodon',
    mult: 2,
    reqNode: 'smilodon',
    reqCount: 10,
    cost: 28000000000000,
    name: 'Caninos de Élite',
    description: 'Smilodon produce x2 ADN/seg.'
  },
  {
    id: 'm_mamut_1',
    type: 'node',
    targetId: 'woolly_mammoth',
    mult: 2,
    reqNode: 'woolly_mammoth',
    reqCount: 10,
    cost: 190000000000000,
    name: 'Resistencia Subcero',
    description: 'Mamut Lanudo produce x2 ADN/seg.'
  },
  {
    id: 'm_hom_1',
    type: 'node',
    targetId: 'archaic_hominins',
    mult: 2,
    reqNode: 'archaic_hominins',
    reqCount: 10,
    cost: 1350000000000000,
    name: 'Dominio del Fuego',
    description: 'Homínidos Arcaicos producen x2 ADN/seg.'
  },
  {
    id: 'm_sap_1',
    type: 'node',
    targetId: 'homo_sapiens',
    mult: 3,
    reqNode: 'homo_sapiens',
    reqCount: 10,
    cost: 11000000000000000,
    name: 'Revolución Cognitiva',
    description: 'Homo Sapiens produce x3 ADN/seg.'
  },
  {
    id: 'global_1',
    type: 'global',
    mult: 2,
    reqNode: 'homo_sapiens',
    reqCount: 1,
    cost: 4500000000000000,
    name: 'Genoma Universal',
    description: 'Duplica la producción de TODAS las especies (x2).'
  }
];

const SUFFIXES = [
  '', 'K', 'M', 'B', 'T', 'Qa', 'Qi', 'Sx', 'Sp', 'Oc', 'No', 'Dc', 'Ud', 'Dd', 'Td'
];

export function formatNumber(num) {
  if (!Number.isFinite(num) || num <= 0) return '0';
  if (num < 1000) {
    return num < 10 && num % 1 !== 0 ? num.toFixed(1) : Math.floor(num).toString();
  }
  const tier = Math.floor(Math.log10(num) / 3);
  if (tier < SUFFIXES.length) {
    const scale = Math.pow(10, tier * 3);
    const scaled = num / scale;
    const digits = scaled >= 100 ? 1 : 2;
    return `${scaled.toFixed(digits)}${SUFFIXES[tier]}`;
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
  while (qty > 1 && getBulkCost(node, owned, qty) > adn) {
    qty -= 1;
  }
  while (getBulkCost(node, owned, qty + 1) <= adn && qty < 500) {
    qty += 1;
  }
  return { qty, cost: getBulkCost(node, owned, qty) };
}
