import * as THREE from 'three';
import {
  ERAS,
  NODES,
  UPGRADES,
  formatNumber,
  getSingleCost,
  getBulkCost,
  getMaxAffordable
} from './data.js';
import { ChronoAudio } from './audio.js';

const SAVE_KEY = 'chrono_genesis_save_v1';
const PLANET_RADIUS = 1.92;
const MAX_OFFLINE_SEC = 86400; // Hasta 24 horas de progreso offline

// Vectores reutilizables fuera del loop para evitar GC
const _vecA = new THREE.Vector3();
const _vecB = new THREE.Vector3();
const _vecC = new THREE.Vector3();
const _vecD = new THREE.Vector3();
const _upVec = new THREE.Vector3(0, 1, 0);
const _zAxis = new THREE.Vector3(0, 0, 1);
const _quatA = new THREE.Quaternion();
const _raycaster = new THREE.Raycaster();
const _pointerNdc = new THREE.Vector2();

const audio = new ChronoAudio();

function createDefaultState() {
  const counts = {};
  NODES.forEach((n) => {
    counts[n.id] = 0;
  });
  return {
    adn: 0,
    totalRunAdn: 0,
    lifetimeAdn: 0,
    starFossils: 0,
    prestigeCount: 0,
    counts,
    upgrades: [],
    highestEra: 0,
    biomePreview: 'auto',
    settings: {
      music: true,
      sfx: true,
      haptic: true
    },
    lastSavedAt: Date.now()
  };
}

let state = createDefaultState();
let buyQty = '1'; // '1' | '10' | 'max'
let activeTab = 'evolution';
let needsListRebuild = true;

// ============================================================
// LÓGICA ECONÓMICA Y PROGRESIÓN
// ============================================================

function getPrestigeMultiplier() {
  return 1 + state.starFossils * 0.25;
}

function getGlobalUpgradeMultiplier() {
  let mult = 1;
  for (const up of UPGRADES) {
    if (up.type === 'global' && state.upgrades.includes(up.id)) {
      mult *= up.mult;
    }
  }
  return mult;
}

function getNodeMultiplier(nodeId) {
  let mult = 1;
  for (const up of UPGRADES) {
    if (up.type === 'node' && up.targetId === nodeId && state.upgrades.includes(up.id)) {
      mult *= up.mult;
    }
  }
  return mult;
}

function getNodeProduction(node) {
  const owned = state.counts[node.id] || 0;
  if (owned <= 0) return 0;
  return owned * node.baseProd * getNodeMultiplier(node.id) * getGlobalUpgradeMultiplier() * getPrestigeMultiplier();
}

function getTotalAdnPerSec() {
  let sum = 0;
  for (const node of NODES) {
    sum += getNodeProduction(node);
  }
  return sum;
}

function getTapPower() {
  let baseMult = 1;
  let pctOfDps = 0;
  for (const up of UPGRADES) {
    if (!state.upgrades.includes(up.id)) continue;
    if (up.type === 'click') baseMult *= up.mult;
    if (up.type === 'click_pct') pctOfDps += up.pct;
  }
  const baseTap = 1 * baseMult * getPrestigeMultiplier();
  return baseTap + getTotalAdnPerSec() * pctOfDps;
}

function isNodeUnlocked(node) {
  if (!node.reqNode) return true;
  return (state.counts[node.reqNode] || 0) >= 1;
}

function isUpgradeUnlocked(up) {
  if (state.upgrades.includes(up.id)) return false;
  return (state.counts[up.reqNode] || 0) >= up.reqCount;
}

function computeCurrentEra() {
  let era = 0;
  for (const node of NODES) {
    if ((state.counts[node.id] || 0) > 0 && node.era > era) {
      era = node.era;
    }
  }
  return era;
}

function getPendingStarFossils() {
  if (computeCurrentEra() < 2) return 0;
  const threshold = 5e10;
  if (state.totalRunAdn < threshold) return 1;
  return Math.max(1, Math.floor(Math.pow(state.totalRunAdn / threshold, 0.36)));
}

function getEraProgressRatio() {
  const era = computeCurrentEra();
  if (era === 0) {
    const targetNode = NODES.find((n) => n.id === 'armored_fish');
    return Math.min(1, state.totalRunAdn / targetNode.baseCost);
  }
  if (era === 1) {
    const targetNode = NODES.find((n) => n.id === 'early_mammals');
    return Math.min(1, state.totalRunAdn / targetNode.baseCost);
  }
  const targetNode = NODES.find((n) => n.id === 'homo_sapiens');
  return Math.min(1, state.totalRunAdn / targetNode.baseCost);
}

// ============================================================
// PERSISTENCIA Y PROGRESO OFFLINE
// ============================================================

function saveGame() {
  state.lastSavedAt = Date.now();
  try {
    localStorage.setItem(SAVE_KEY, JSON.stringify(state));
  } catch {
    // Ignorar si almacenamiento privado está lleno
  }
}

function loadGame() {
  let raw = null;
  try {
    raw = localStorage.getItem(SAVE_KEY);
  } catch {
    raw = null;
  }
  if (!raw) return 0;

  try {
    const parsed = JSON.parse(raw);
    const base = createDefaultState();
    state = {
      ...base,
      ...parsed,
      counts: { ...base.counts, ...(parsed.counts || {}) },
      upgrades: Array.isArray(parsed.upgrades) ? parsed.upgrades : [],
      settings: { ...base.settings, ...(parsed.settings || {}) }
    };
    const now = Date.now();
    const last = Number(state.lastSavedAt) || now;
    const elapsedSec = Math.max(0, Math.min(MAX_OFFLINE_SEC, (now - last) / 1000));
    return elapsedSec;
  } catch {
    state = createDefaultState();
    return 0;
  }
}

// ============================================================
// REFERENCIAS DOM
// ============================================================

const dom = {
  adnTotalVal: document.getElementById('adnTotalVal'),
  adnRateVal: document.getElementById('adnRateVal'),
  eraNameVal: document.getElementById('eraNameVal'),
  eraSubtitle: document.getElementById('eraSubtitle'),
  eraProgressFill: document.getElementById('eraProgressFill'),
  tapPowerVal: document.getElementById('tapPowerVal'),
  starFossilsHud: document.getElementById('starFossilsHud'),
  starFossilsVal: document.getElementById('starFossilsVal'),
  prestigeBonusVal: document.getElementById('prestigeBonusVal'),
  upgradeCountText: document.getElementById('upgradeCountText'),
  evolutionList: document.getElementById('evolutionList'),
  upgradesList: document.getElementById('upgradesList'),
  prestigeContainer: document.getElementById('prestigeContainer'),
  floatingLayer: document.getElementById('floatingLayer'),
  canvasHost: document.getElementById('canvasHost'),
  webglFallback: document.getElementById('webglFallback'),
  qtySelector: document.getElementById('qtySelector'),
  offlineModal: document.getElementById('offlineModal'),
  offlineElapsedText: document.getElementById('offlineElapsedText'),
  offlineRewardVal: document.getElementById('offlineRewardVal'),
  claimOfflineBtn: document.getElementById('claimOfflineBtn'),
  settingsBtn: document.getElementById('settingsBtn'),
  settingsModal: document.getElementById('settingsModal'),
  closeSettingsBtn: document.getElementById('closeSettingsBtn'),
  toggleMusicBtn: document.getElementById('toggleMusicBtn'),
  toggleSfxBtn: document.getElementById('toggleSfxBtn'),
  toggleHapticBtn: document.getElementById('toggleHapticBtn'),
  biomeViewSelect: document.getElementById('biomeViewSelect'),
  hardResetBtn: document.getElementById('hardResetBtn'),
  confirmResetRow: document.getElementById('confirmResetRow'),
  cancelResetBtn: document.getElementById('cancelResetBtn'),
  confirmResetBtn: document.getElementById('confirmResetBtn'),
  prestigeModal: document.getElementById('prestigeModal'),
  modalFossilsGain: document.getElementById('modalFossilsGain'),
  cancelPrestigeBtn: document.getElementById('cancelPrestigeBtn'),
  confirmPrestigeBtn: document.getElementById('confirmPrestigeBtn'),
  eraToast: document.getElementById('eraToast'),
  eraToastTitle: document.getElementById('eraToastTitle')
};

// ============================================================
// MOTOR 3D THREE.JS (PLANETA LOW POLY EN 3 ERAS)
// ============================================================

const threeCtx = {
  ready: false,
  isSoftwareGl: false,
  renderer: null,
  scene: null,
  camera: null,
  planetPivot: null,
  oceanMesh: null,
  landMesh: null,
  hitSphere: null,
  biomeGroups: [],
  animatedActors: [], // Dinosaurios, mamuts, smilodon, perezosos, cristales
  volcanoSmoke: [],
  eraParticles: [],
  shockwaves: [],
  tapParticles: [],
  activeBiome: -1,
  targetTheta: 0.4,
  targetPhi: 1.18,
  currentTheta: 0.4,
  currentPhi: 1.18,
  targetRadius: 6.4,
  currentRadius: 6.4,
  planetPulse: 0,
  frameId: 0
};

function pseudoNoise3(x, y, z) {
  return (
    Math.sin(x * 2.3 + y * 1.4) * 0.45 +
    Math.cos(y * 2.7 - z * 2.1) * 0.35 +
    Math.sin(z * 3.4 + x * 1.9) * 0.25
  );
}

function orientOnSurface(obj, unitDir, radius) {
  obj.position.copy(unitDir).multiplyScalar(radius);
  _quatA.setFromUnitVectors(_upVec, unitDir);
  obj.quaternion.copy(_quatA);
}

function randomSurfaceDir(seed) {
  const u = Math.abs(Math.sin(seed * 12.9898) * 43758.5453) % 1;
  const v = Math.abs(Math.sin(seed * 78.233 + 1.7) * 29432.1234) % 1;
  const theta = u * Math.PI * 2;
  const phi = Math.acos(2 * v - 1);
  return new THREE.Vector3(
    Math.sin(phi) * Math.cos(theta),
    Math.cos(phi),
    Math.sin(phi) * Math.sin(theta)
  ).normalize();
}

function buildStudioEnvironment(renderer) {
  const envScene = new THREE.Scene();
  envScene.background = new THREE.Color(0x0b1326);
  const panels = [
    { pos: [6, 6, 4], color: 0xffe4b5, scale: [6, 6, 0.2] },
    { pos: [-6, 3, -4], color: 0x38bdf8, scale: [6, 5, 0.2] },
    { pos: [0, -6, 2], color: 0x6d28d9, scale: [8, 0.2, 8] }
  ];
  panels.forEach((p) => {
    const m = new THREE.Mesh(
      new THREE.BoxGeometry(p.scale[0], p.scale[1], p.scale[2]),
      new THREE.MeshBasicMaterial({ color: p.color })
    );
    m.position.set(p.pos[0], p.pos[1], p.pos[2]);
    m.lookAt(0, 0, 0);
    envScene.add(m);
  });
  const pmrem = new THREE.PMREMGenerator(renderer);
  const tex = pmrem.fromScene(envScene, 0.04).texture;
  pmrem.dispose();
  return tex;
}

// Constructores de actores Low-Poly compuestos (3-9 piezas c/u)
function createCrystalCluster(colorHex) {
  const g = new THREE.Group();
  const baseMat = new THREE.MeshStandardMaterial({
    color: 0x1e293b,
    roughness: 0.85,
    metalness: 0.15,
    flatShading: true
  });
  const crystalMat = new THREE.MeshPhysicalMaterial({
    color: colorHex,
    emissive: colorHex,
    emissiveIntensity: 0.48,
    roughness: 0.15,
    metalness: 0.1,
    clearcoat: 1.0,
    flatShading: true
  });

  const base = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.16, 0.08, 6), baseMat);
  base.position.y = 0.04;
  g.add(base);

  const mainSpire = new THREE.Mesh(new THREE.OctahedronGeometry(0.12, 0), crystalMat);
  mainSpire.scale.set(0.7, 2.3, 0.7);
  mainSpire.position.y = 0.24;
  g.add(mainSpire);

  const sideSpire = new THREE.Mesh(new THREE.OctahedronGeometry(0.08, 0), crystalMat);
  sideSpire.scale.set(0.6, 1.7, 0.6);
  sideSpire.position.set(0.08, 0.15, 0.04);
  sideSpire.rotation.z = -0.35;
  g.add(sideSpire);

  const shard = new THREE.Mesh(new THREE.OctahedronGeometry(0.045, 0), crystalMat);
  shard.position.set(-0.07, 0.42, 0.02);
  g.add(shard);

  g.userData.floatingShard = shard;
  return g;
}

function createVolcanoProp() {
  const g = new THREE.Group();
  const rockMat = new THREE.MeshStandardMaterial({
    color: 0x2d2424,
    roughness: 0.9,
    flatShading: true
  });
  const lavaMat = new THREE.MeshStandardMaterial({
    color: 0xff5722,
    emissive: 0xff3d00,
    emissiveIntensity: 1.25,
    roughness: 0.4,
    flatShading: true
  });

  const cone = new THREE.Mesh(new THREE.ConeGeometry(0.28, 0.38, 7, 1, true), rockMat);
  cone.position.y = 0.19;
  g.add(cone);

  const rim = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.14, 0.06, 7), rockMat);
  rim.position.y = 0.36;
  g.add(rim);

  const magma = new THREE.Mesh(new THREE.CylinderGeometry(0.085, 0.085, 0.03, 7), lavaMat);
  magma.position.y = 0.375;
  g.add(magma);

  const stream = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.24, 0.03), lavaMat);
  stream.position.set(0.11, 0.22, 0);
  stream.rotation.z = -0.48;
  g.add(stream);

  return g;
}

function createPineTreeProp() {
  const g = new THREE.Group();
  const trunkMat = new THREE.MeshStandardMaterial({ color: 0x5c3a21, roughness: 0.9, flatShading: true });
  const leafMat = new THREE.MeshStandardMaterial({ color: 0x16a34a, roughness: 0.72, flatShading: true });

  const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.022, 0.035, 0.14, 5), trunkMat);
  trunk.position.y = 0.07;
  g.add(trunk);

  const c1 = new THREE.Mesh(new THREE.ConeGeometry(0.12, 0.18, 6), leafMat);
  c1.position.y = 0.20;
  g.add(c1);

  const c2 = new THREE.Mesh(new THREE.ConeGeometry(0.09, 0.15, 6), leafMat);
  c2.position.y = 0.30;
  g.add(c2);

  const c3 = new THREE.Mesh(new THREE.ConeGeometry(0.055, 0.12, 5), leafMat);
  c3.position.y = 0.39;
  g.add(c3);

  return g;
}

function createGlacierProp() {
  const g = new THREE.Group();
  const iceMat = new THREE.MeshPhysicalMaterial({
    color: 0xdbeafe,
    emissive: 0x0ea5e9,
    emissiveIntensity: 0.18,
    roughness: 0.18,
    metalness: 0.05,
    clearcoat: 1.0,
    flatShading: true
  });
  const base = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.24, 0.12, 6), iceMat);
  base.position.y = 0.06;
  g.add(base);

  const spireA = new THREE.Mesh(new THREE.ConeGeometry(0.12, 0.42, 5), iceMat);
  spireA.position.set(0, 0.26, 0);
  spireA.rotation.z = 0.08;
  g.add(spireA);

  const spireB = new THREE.Mesh(new THREE.ConeGeometry(0.08, 0.28, 5), iceMat);
  spireB.position.set(0.11, 0.18, 0.05);
  spireB.rotation.z = -0.25;
  g.add(spireB);

  return g;
}

function createDinoActor(type) {
  const g = new THREE.Group();
  const isSauropod = type === 'sauropod';
  const mat = new THREE.MeshStandardMaterial({
    color: isSauropod ? 0x22c55e : 0xf97316,
    roughness: 0.65,
    flatShading: true
  });
  const bellyMat = new THREE.MeshStandardMaterial({
    color: isSauropod ? 0x86efac : 0xfdba74,
    roughness: 0.72,
    flatShading: true
  });

  const body = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.10, 0.20), mat);
  body.position.y = 0.12;
  g.add(body);

  const tail = new THREE.Mesh(new THREE.ConeGeometry(0.045, 0.18, 5), mat);
  tail.rotation.x = -Math.PI / 2;
  tail.position.set(0, 0.12, -0.17);
  g.add(tail);

  if (isSauropod) {
    const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.028, 0.042, 0.24, 5), bellyMat);
    neck.rotation.x = 0.45;
    neck.position.set(0, 0.23, 0.12);
    g.add(neck);

    const head = new THREE.Mesh(new THREE.BoxGeometry(0.055, 0.045, 0.08), mat);
    head.position.set(0, 0.34, 0.19);
    g.add(head);
  } else {
    const head = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.07, 0.12), mat);
    head.position.set(0, 0.20, 0.13);
    g.add(head);

    const jaw = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.025, 0.09), bellyMat);
    jaw.position.set(0, 0.155, 0.13);
    g.add(jaw);
  }

  for (let i = 0; i < 4; i++) {
    const leg = new THREE.Mesh(new THREE.BoxGeometry(0.032, 0.08, 0.032), bellyMat);
    leg.position.set(i % 2 === 0 ? -0.045 : 0.045, 0.04, i < 2 ? 0.06 : -0.06);
    g.add(leg);
  }
  return g;
}

function createIceAgeActor(kind) {
  const g = new THREE.Group();
  if (kind === 'mammoth') {
    const furMat = new THREE.MeshStandardMaterial({ color: 0x78350f, roughness: 0.9, flatShading: true });
    const tuskMat = new THREE.MeshStandardMaterial({ color: 0xfef3c7, roughness: 0.35, flatShading: true });

    const body = new THREE.Mesh(new THREE.DodecahedronGeometry(0.11, 0), furMat);
    body.scale.set(0.95, 0.95, 1.35);
    body.position.y = 0.14;
    g.add(body);

    const head = new THREE.Mesh(new THREE.DodecahedronGeometry(0.075, 0), furMat);
    head.position.set(0, 0.19, 0.13);
    g.add(head);

    const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.026, 0.16, 5), furMat);
    trunk.rotation.x = 0.35;
    trunk.position.set(0, 0.11, 0.20);
    g.add(trunk);

    [-1, 1].forEach((side) => {
      const tusk = new THREE.Mesh(new THREE.ConeGeometry(0.015, 0.15, 5), tuskMat);
      tusk.rotation.x = 1.05;
      tusk.rotation.z = side * -0.25;
      tusk.position.set(side * 0.045, 0.13, 0.21);
      g.add(tusk);
    });

    for (let i = 0; i < 4; i++) {
      const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 0.09, 5), furMat);
      leg.position.set(i % 2 === 0 ? -0.055 : 0.055, 0.045, i < 2 ? 0.07 : -0.07);
      g.add(leg);
    }
  } else if (kind === 'smilodon') {
    const coatMat = new THREE.MeshStandardMaterial({ color: 0xf59e0b, roughness: 0.65, flatShading: true });
    const fangMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.2, flatShading: true });

    const body = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.075, 0.17), coatMat);
    body.position.y = 0.10;
    g.add(body);

    const head = new THREE.Mesh(new THREE.BoxGeometry(0.068, 0.06, 0.075), coatMat);
    head.position.set(0, 0.13, 0.11);
    g.add(head);

    [-1, 1].forEach((side) => {
      const fang = new THREE.Mesh(new THREE.ConeGeometry(0.009, 0.045, 4), fangMat);
      fang.rotation.x = Math.PI;
      fang.position.set(side * 0.018, 0.085, 0.14);
      g.add(fang);
    });

    const tail = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.02, 0.06), coatMat);
    tail.position.set(0, 0.12, -0.11);
    g.add(tail);
  } else {
    // Megatherium (Perezoso Gigante)
    const slothMat = new THREE.MeshStandardMaterial({ color: 0xa16207, roughness: 0.88, flatShading: true });
    const body = new THREE.Mesh(new THREE.DodecahedronGeometry(0.10, 0), slothMat);
    body.scale.set(0.95, 1.15, 1.2);
    body.position.y = 0.14;
    g.add(body);

    const head = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.055, 0.075), slothMat);
    head.position.set(0, 0.23, 0.09);
    g.add(head);

    const tail = new THREE.Mesh(new THREE.ConeGeometry(0.04, 0.12, 5), slothMat);
    tail.rotation.x = -1.1;
    tail.position.set(0, 0.08, -0.12);
    g.add(tail);
  }
  return g;
}

function initThreeScene() {
  const host = dom.canvasHost;
  const width = host.clientWidth || window.innerWidth;
  const height = host.clientHeight || 300;

  let isSoftwareGl = false;
  try {
    const probe = document.createElement('canvas').getContext('webgl2');
    if (!probe) {
      isSoftwareGl = true;
    } else {
      const ext = probe.getExtension('WEBGL_debug_renderer_info');
      const gpu = String(probe.getParameter(ext ? ext.UNMASKED_RENDERER_WEBGL : probe.RENDERER));
      probe.getExtension('WEBGL_lose_context')?.loseContext();
      isSoftwareGl = /SwiftShader|llvmpipe|softpipe|Software|Basic Render/i.test(gpu);
    }
  } catch {
    isSoftwareGl = true;
  }

  let renderer;
  try {
    renderer = new THREE.WebGLRenderer({
      antialias: !isSoftwareGl,
      powerPreference: 'high-performance'
    });
  } catch {
    dom.webglFallback.classList.remove('hidden');
    return;
  }

  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.12;
  renderer.setPixelRatio(isSoftwareGl ? 1 : Math.min(window.devicePixelRatio || 1, 2));
  renderer.setSize(width, height);
  renderer.shadowMap.enabled = !isSoftwareGl;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  host.appendChild(renderer.domElement);

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x050914);
  scene.fog = new THREE.FogExp2(0x071226, 0.042);
  scene.environment = buildStudioEnvironment(renderer);

  const camera = new THREE.PerspectiveCamera(44, width / height, 0.1, 80);

  // Iluminación de 3 puntos
  const hemi = new THREE.HemisphereLight(0x7dd3fc, 0x1e1b4b, 0.85);
  scene.add(hemi);

  const keyLight = new THREE.DirectionalLight(0xfff1d6, 2.2);
  keyLight.position.set(6, 7, 5);
  keyLight.castShadow = !isSoftwareGl;
  keyLight.shadow.mapSize.set(1024, 1024);
  keyLight.shadow.bias = -0.0005;
  scene.add(keyLight);

  const rimLight = new THREE.DirectionalLight(0x22d3ee, 1.35);
  rimLight.position.set(-6, -3, -5);
  scene.add(rimLight);

  // Estrellas de fondo
  const starGeo = new THREE.BufferGeometry();
  const starPos = new Float32Array(320 * 3);
  for (let i = 0; i < 320; i++) {
    const dir = randomSurfaceDir(i + 11.3);
    const dist = 16 + (i % 10) * 1.4;
    starPos[i * 3] = dir.x * dist;
    starPos[i * 3 + 1] = dir.y * dist;
    starPos[i * 3 + 2] = dir.z * dist;
  }
  starGeo.setAttribute('position', new THREE.BufferAttribute(starPos, 3));
  const starPoints = new THREE.Points(
    starGeo,
    new THREE.PointsMaterial({ color: 0xcbd5e1, size: 0.11, transparent: true, opacity: 0.78 })
  );
  scene.add(starPoints);

  // Pivote principal del planeta
  const planetPivot = new THREE.Group();
  scene.add(planetPivot);

  // Esfera invisible para raycasting veloz
  const hitSphere = new THREE.Mesh(
    new THREE.SphereGeometry(PLANET_RADIUS + 0.18, 20, 20),
    new THREE.MeshBasicMaterial({ visible: false })
  );
  planetPivot.add(hitSphere);

  // Océano interno low-poly
  const oceanMat = new THREE.MeshPhysicalMaterial({
    color: 0x072642,
    emissive: 0x04182b,
    emissiveIntensity: 0.45,
    roughness: 0.22,
    metalness: 0.2,
    clearcoat: 0.85,
    flatShading: true
  });
  const oceanMesh = new THREE.Mesh(new THREE.IcosahedronGeometry(PLANET_RADIUS - 0.04, 3), oceanMat);
  oceanMesh.receiveShadow = true;
  planetPivot.add(oceanMesh);

  // Corteza continental facetada (displacada por ruido 3D)
  const rawLandGeo = new THREE.IcosahedronGeometry(PLANET_RADIUS, 3).toNonIndexed();
  const posAttr = rawLandGeo.getAttribute('position');
  const baseLandPositions = new Float32Array(posAttr.array.length);
  for (let i = 0; i < posAttr.count; i++) {
    _vecA.fromBufferAttribute(posAttr, i).normalize();
    const n = pseudoNoise3(_vecA.x, _vecA.y, _vecA.z);
    const rad = n > 0.04 ? PLANET_RADIUS + 0.05 + n * 0.19 : PLANET_RADIUS - 0.12;
    _vecA.multiplyScalar(rad);
    posAttr.setXYZ(i, _vecA.x, _vecA.y, _vecA.z);
    baseLandPositions[i * 3] = _vecA.x;
    baseLandPositions[i * 3 + 1] = _vecA.y;
    baseLandPositions[i * 3 + 2] = _vecA.z;
  }
  rawLandGeo.computeVertexNormals();

  const landMat = new THREE.MeshStandardMaterial({
    color: 0x1e293b,
    roughness: 0.82,
    metalness: 0.12,
    flatShading: true
  });
  const landMesh = new THREE.Mesh(rawLandGeo, landMat);
  landMesh.castShadow = !isSoftwareGl;
  landMesh.receiveShadow = true;
  planetPivot.add(landMesh);

  // Grupos por Bioma
  const gEra0 = new THREE.Group();
  const gEra1 = new THREE.Group();
  const gEra2 = new THREE.Group();
  planetPivot.add(gEra0, gEra1, gEra2);

  // --- ERA 0: Sopa Primordial (cristales bioluminiscentes, respiraderos y esporas) ---
  for (let i = 0; i < 16; i++) {
    const dir = randomSurfaceDir(i * 3.17 + 1);
    const n = pseudoNoise3(dir.x, dir.y, dir.z);
    const radius = n > 0.04 ? PLANET_RADIUS + 0.05 + n * 0.18 : PLANET_RADIUS - 0.05;
    const crystal = createCrystalCluster(i % 2 === 0 ? 0x22d3ee : 0xa78bfa);
    orientOnSurface(crystal, dir, radius);
    crystal.scale.setScalar(0.85 + (i % 4) * 0.18);
    gEra0.add(crystal);
    threeCtx.animatedActors.push({ kind: 'crystal', group: crystal, phase: i * 0.9 });
  }
  const sporeGeo = new THREE.BufferGeometry();
  const sporePos = new Float32Array(130 * 3);
  for (let i = 0; i < 130; i++) {
    const dir = randomSurfaceDir(i * 5.7 + 9);
    const r = PLANET_RADIUS + 0.25 + (i % 7) * 0.09;
    sporePos[i * 3] = dir.x * r;
    sporePos[i * 3 + 1] = dir.y * r;
    sporePos[i * 3 + 2] = dir.z * r;
  }
  sporeGeo.setAttribute('position', new THREE.BufferAttribute(sporePos, 3));
  const sporePoints = new THREE.Points(
    sporeGeo,
    new THREE.PointsMaterial({ color: 0x38bdf8, size: 0.075, transparent: true, opacity: 0.85 })
  );
  gEra0.add(sporePoints);
  threeCtx.eraParticles[0] = sporePoints;

  // --- ERA 1: Triásico & Jurásico (volcanes, pinos y dinosaurios caminando) ---
  for (let i = 0; i < 4; i++) {
    const dir = randomSurfaceDir(i * 9.3 + 4.2);
    const volc = createVolcanoProp();
    orientOnSurface(volc, dir, PLANET_RADIUS + 0.04);
    gEra1.add(volc);
  }
  for (let i = 0; i < 24; i++) {
    const dir = randomSurfaceDir(i * 4.1 + 17.3);
    if (pseudoNoise3(dir.x, dir.y, dir.z) < 0.0) continue;
    const pine = createPineTreeProp();
    orientOnSurface(pine, dir, PLANET_RADIUS + 0.08);
    pine.scale.setScalar(0.85 + (i % 3) * 0.2);
    gEra1.add(pine);
  }
  for (let i = 0; i < 5; i++) {
    const dino = createDinoActor(i % 2 === 0 ? 'sauropod' : 'theropod');
    gEra1.add(dino);
    const axis = randomSurfaceDir(i * 7.4 + 22).normalize();
    const startDir = new THREE.Vector3(1, 0, 0).cross(axis);
    if (startDir.lengthSq() < 0.01) startDir.set(0, 1, 0).cross(axis);
    startDir.normalize();
    threeCtx.animatedActors.push({
      kind: 'walker',
      era: 1,
      group: dino,
      axis,
      baseDir: startDir,
      speed: 0.16 + i * 0.03,
      phase: i * 1.4
    });
  }
  // Ceniza volcánica / polen dorado mesozoico
  const emberGeo = new THREE.BufferGeometry();
  const emberPos = new Float32Array(110 * 3);
  for (let i = 0; i < 110; i++) {
    const dir = randomSurfaceDir(i * 2.9 + 41);
    const r = PLANET_RADIUS + 0.28 + (i % 6) * 0.11;
    emberPos[i * 3] = dir.x * r;
    emberPos[i * 3 + 1] = dir.y * r;
    emberPos[i * 3 + 2] = dir.z * r;
  }
  emberGeo.setAttribute('position', new THREE.BufferAttribute(emberPos, 3));
  const emberPoints = new THREE.Points(
    emberGeo,
    new THREE.PointsMaterial({ color: 0xf59e0b, size: 0.065, transparent: true, opacity: 0.75 })
  );
  gEra1.add(emberPoints);
  threeCtx.eraParticles[1] = emberPoints;

  // --- ERA 2: Edad de Hielo (glaciares, ventisca, mamuts, smilodon, megatherium) ---
  for (let i = 0; i < 16; i++) {
    const dir = randomSurfaceDir(i * 6.3 + 52);
    const glacier = createGlacierProp();
    orientOnSurface(glacier, dir, PLANET_RADIUS + 0.05);
    glacier.scale.setScalar(0.8 + (i % 4) * 0.18);
    gEra2.add(glacier);
  }
  const iceKinds = ['mammoth', 'smilodon', 'megatherium', 'mammoth', 'smilodon'];
  iceKinds.forEach((kind, i) => {
    const beast = createIceAgeActor(kind);
    gEra2.add(beast);
    const axis = randomSurfaceDir(i * 8.1 + 73).normalize();
    const startDir = new THREE.Vector3(0, 1, 0).cross(axis);
    if (startDir.lengthSq() < 0.01) startDir.set(1, 0, 0).cross(axis);
    startDir.normalize();
    threeCtx.animatedActors.push({
      kind: 'walker',
      era: 2,
      group: beast,
      axis,
      baseDir: startDir,
      speed: 0.14 + i * 0.025,
      phase: i * 1.25
    });
  });

  const snowGeo = new THREE.BufferGeometry();
  const snowPos = new Float32Array(220 * 3);
  for (let i = 0; i < 220; i++) {
    const dir = randomSurfaceDir(i * 3.8 + 90);
    const r = PLANET_RADIUS + 0.22 + (i % 8) * 0.12;
    snowPos[i * 3] = dir.x * r;
    snowPos[i * 3 + 1] = dir.y * r;
    snowPos[i * 3 + 2] = dir.z * r;
  }
  snowGeo.setAttribute('position', new THREE.BufferAttribute(snowPos, 3));
  const snowPoints = new THREE.Points(
    snowGeo,
    new THREE.PointsMaterial({ color: 0xe0f2fe, size: 0.068, transparent: true, opacity: 0.88 })
  );
  gEra2.add(snowPoints);
  threeCtx.eraParticles[2] = snowPoints;

  // Pool de ondas de choque y partículas doradas de Entropía/ADN al tocar
  for (let i = 0; i < 6; i++) {
    const ring = new THREE.Mesh(
      new THREE.RingGeometry(0.14, 0.21, 24),
      new THREE.MeshBasicMaterial({
        color: 0x22d3ee,
        side: THREE.DoubleSide,
        transparent: true,
        opacity: 0,
        depthWrite: false
      })
    );
    ring.visible = false;
    planetPivot.add(ring);
    threeCtx.shockwaves.push({ mesh: ring, life: 0, maxLife: 0.55 });
  }

  const pGeom = new THREE.OctahedronGeometry(0.055, 0);
  for (let i = 0; i < 40; i++) {
    const pMesh = new THREE.Mesh(
      pGeom,
      new THREE.MeshBasicMaterial({ color: 0xfbbf24, transparent: true, opacity: 0 })
    );
    pMesh.visible = false;
    planetPivot.add(pMesh);
    threeCtx.tapParticles.push({
      mesh: pMesh,
      vel: new THREE.Vector3(),
      life: 0,
      maxLife: 0.7
    });
  }

  threeCtx.ready = true;
  threeCtx.isSoftwareGl = isSoftwareGl;
  threeCtx.renderer = renderer;
  threeCtx.scene = scene;
  threeCtx.camera = camera;
  threeCtx.planetPivot = planetPivot;
  threeCtx.oceanMesh = oceanMesh;
  threeCtx.landMesh = landMesh;
  threeCtx.hitSphere = hitSphere;
  threeCtx.biomeGroups = [gEra0, gEra1, gEra2];

  applyBiomeVisuals(0);
  bindViewportInteractions(renderer.domElement);

  const canvas = renderer.domElement;
  canvas.addEventListener('webglcontextlost', (e) => {
    e.preventDefault();
    cancelAnimationFrame(threeCtx.frameId);
    clearTimeout(threeCtx.frameId);
  });
  canvas.addEventListener('webglcontextrestored', () => {
    startRenderLoop();
  });

  window.addEventListener('resize', resizeViewport);
  resizeViewport();
  startRenderLoop();
}

function applyBiomeVisuals(eraIndex) {
  if (!threeCtx.ready || threeCtx.activeBiome === eraIndex) return;
  threeCtx.activeBiome = eraIndex;

  threeCtx.biomeGroups.forEach((grp, idx) => {
    grp.visible = idx === eraIndex;
  });

  const eraData = ERAS[eraIndex] || ERAS[0];
  threeCtx.scene.background.setHex(eraData.skyHex);
  threeCtx.scene.fog.color.setHex(eraData.fogHex);

  if (eraIndex === 0) {
    threeCtx.oceanMesh.material.color.setHex(0x082f49);
    threeCtx.oceanMesh.material.emissive.setHex(0x062033);
    threeCtx.landMesh.material.color.setHex(0x1e293b);
    threeCtx.landMesh.material.roughness = 0.82;
  } else if (eraIndex === 1) {
    threeCtx.oceanMesh.material.color.setHex(0x0369a1);
    threeCtx.oceanMesh.material.emissive.setHex(0x022c43);
    threeCtx.landMesh.material.color.setHex(0x2e7d32);
    threeCtx.landMesh.material.roughness = 0.76;
  } else {
    threeCtx.oceanMesh.material.color.setHex(0x7dd3fc);
    threeCtx.oceanMesh.material.emissive.setHex(0x0c4a6e);
    threeCtx.landMesh.material.color.setHex(0xe2e8f0);
    threeCtx.landMesh.material.roughness = 0.42;
  }
}

function spawnShockwaveAndParticles(localPoint, localNormal) {
  if (!threeCtx.ready) return;

  // Activar onda de choque
  const sw = threeCtx.shockwaves.find((s) => s.life <= 0) || threeCtx.shockwaves[0];
  sw.life = sw.maxLife;
  sw.mesh.visible = true;
  sw.mesh.position.copy(localPoint).addScaledVector(localNormal, 0.04);
  _quatA.setFromUnitVectors(_zAxis, localNormal);
  sw.mesh.quaternion.copy(_quatA);
  sw.mesh.scale.setScalar(1);
  sw.mesh.material.color.set(ERAS[threeCtx.activeBiome]?.accentHex || '#22d3ee');
  sw.mesh.material.opacity = 0.95;

  // Activar partículas doradas de ADN/Entropía
  let spawned = 0;
  for (const p of threeCtx.tapParticles) {
    if (p.life > 0) continue;
    p.life = p.maxLife;
    p.mesh.visible = true;
    p.mesh.position.copy(localPoint).addScaledVector(localNormal, 0.06);
    p.mesh.scale.setScalar(0.75 + Math.random() * 0.65);
    p.mesh.material.opacity = 1;
    p.vel
      .copy(localNormal)
      .multiplyScalar(1.3 + Math.random() * 1.4)
      .add(
        _vecB.set(
          (Math.random() - 0.5) * 1.8,
          (Math.random() - 0.5) * 1.8,
          (Math.random() - 0.5) * 1.8
        )
      );
    spawned += 1;
    if (spawned >= 8) break;
  }

  threeCtx.planetPulse = 1;
}

function spawnFloatingTapLabel(clientX, clientY, gain) {
  const rect = dom.floatingLayer.getBoundingClientRect();
  const el = document.createElement('span');
  el.className = 'tap-float';
  el.textContent = `+${formatNumber(gain)} ADN`;
  el.style.left = `${clientX - rect.left}px`;
  el.style.top = `${clientY - rect.top}px`;
  dom.floatingLayer.appendChild(el);
  setTimeout(() => el.remove(), 780);
}

function handlePlanetTap(clientX, clientY) {
  const gain = getTapPower();
  state.adn += gain;
  state.totalRunAdn += gain;
  state.lifetimeAdn += gain;

  audio.playTap();
  spawnFloatingTapLabel(clientX, clientY, gain);

  if (threeCtx.ready) {
    const rect = threeCtx.renderer.domElement.getBoundingClientRect();
    _pointerNdc.x = ((clientX - rect.left) / rect.width) * 2 - 1;
    _pointerNdc.y = -((clientY - rect.top) / rect.height) * 2 + 1;
    _raycaster.setFromCamera(_pointerNdc, threeCtx.camera);
    const hits = _raycaster.intersectObject(threeCtx.hitSphere, false);
    if (hits.length > 0) {
      const worldPt = hits[0].point.clone();
      threeCtx.planetPivot.worldToLocal(worldPt);
      const localNormal = worldPt.clone().normalize();
      spawnShockwaveAndParticles(worldPt, localNormal);
    } else {
      _vecC.copy(threeCtx.camera.position).normalize();
      threeCtx.planetPivot.worldToLocal(_vecC);
      _vecC.normalize();
      const pt = _vecC.clone().multiplyScalar(PLANET_RADIUS + 0.08);
      spawnShockwaveAndParticles(pt, _vecC);
    }
  }
  updateTopHud();
}

function bindViewportInteractions(canvas) {
  const pointers = new Map();
  let startX = 0;
  let startY = 0;
  let lastX = 0;
  let lastY = 0;
  let movedDist = 0;
  let downTime = 0;
  let pinchDist = 0;

  const getPinchDist = () => {
    const pts = Array.from(pointers.values());
    if (pts.length < 2) return 0;
    return Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y);
  };

  canvas.addEventListener('pointerdown', (e) => {
    audio.unlock();
    canvas.setPointerCapture?.(e.pointerId);
    pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (pointers.size === 1) {
      startX = lastX = e.clientX;
      startY = lastY = e.clientY;
      movedDist = 0;
      downTime = performance.now();
    } else if (pointers.size === 2) {
      pinchDist = getPinchDist();
      movedDist = 999; // No contar pellizco como toque
    }
  });

  canvas.addEventListener('pointermove', (e) => {
    if (!pointers.has(e.pointerId)) return;
    pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });

    if (pointers.size === 1) {
      const dx = e.clientX - lastX;
      const dy = e.clientY - lastY;
      movedDist += Math.hypot(e.clientX - startX, e.clientY - startY) * 0.2 + Math.hypot(dx, dy);
      lastX = e.clientX;
      lastY = e.clientY;
      threeCtx.targetTheta -= dx * 0.0085;
      threeCtx.targetPhi = THREE.MathUtils.clamp(threeCtx.targetPhi - dy * 0.0075, 0.35, Math.PI - 0.35);
    } else if (pointers.size === 2) {
      const nextDist = getPinchDist();
      if (pinchDist > 0) {
        const delta = (pinchDist - nextDist) * 0.018;
        threeCtx.targetRadius = THREE.MathUtils.clamp(threeCtx.targetRadius + delta, 4.1, 10.5);
      }
      pinchDist = nextDist;
    }
  });

  const endPointer = (e) => {
    const wasSingle = pointers.size === 1;
    pointers.delete(e.pointerId);
    if (wasSingle && movedDist < 12 && performance.now() - downTime < 350) {
      handlePlanetTap(e.clientX, e.clientY);
    }
    if (pointers.size < 2) pinchDist = 0;
  };

  canvas.addEventListener('pointerup', endPointer);
  canvas.addEventListener('pointercancel', endPointer);

  canvas.addEventListener(
    'wheel',
    (e) => {
      e.preventDefault();
      threeCtx.targetRadius = THREE.MathUtils.clamp(
        threeCtx.targetRadius + e.deltaY * 0.004,
        4.1,
        10.5
      );
    },
    { passive: false }
  );
}

function resizeViewport() {
  if (!threeCtx.ready) return;
  const w = dom.canvasHost.clientWidth || window.innerWidth;
  const h = dom.canvasHost.clientHeight || 280;
  threeCtx.camera.aspect = w / Math.max(1, h);
  threeCtx.camera.updateProjectionMatrix();
  threeCtx.renderer.setSize(w, h);
}

function afterDraw(cb) {
  const gl = threeCtx.renderer.getContext();
  if (!gl || typeof gl.fenceSync !== 'function') {
    threeCtx.frameId = window.setTimeout(cb, 80);
    return;
  }
  const sync = gl.fenceSync(gl.SYNC_GPU_COMMANDS_COMPLETE, 0);
  gl.flush();
  const poll = () => {
    const status = sync && gl.getSyncParameter(sync, gl.SYNC_STATUS);
    if (status === gl.UNSIGNALED) {
      threeCtx.frameId = window.setTimeout(poll, 5);
    } else {
      gl.deleteSync(sync);
      threeCtx.frameId = window.setTimeout(cb, 80);
    }
  };
  threeCtx.frameId = window.setTimeout(poll, 5);
}

function startRenderLoop() {
  const clock = new THREE.Clock();
  let uiAcc = 0;
  let saveAcc = 0;

  function tick() {
    const dt = Math.min(0.1, clock.getDelta());
    const elapsed = clock.getElapsedTime();

    // Producción automática de ADN
    const dps = getTotalAdnPerSec();
    if (dps > 0) {
      const gained = dps * dt;
      state.adn += gained;
      state.totalRunAdn += gained;
      state.lifetimeAdn += gained;
    }

    // Cámara suave con amortiguación exponencial
    threeCtx.currentTheta = THREE.MathUtils.damp(threeCtx.currentTheta, threeCtx.targetTheta, 8, dt);
    threeCtx.currentPhi = THREE.MathUtils.damp(threeCtx.currentPhi, threeCtx.targetPhi, 8, dt);
    threeCtx.currentRadius = THREE.MathUtils.damp(threeCtx.currentRadius, threeCtx.targetRadius, 8, dt);

    const sinPhi = Math.sin(threeCtx.currentPhi);
    threeCtx.camera.position.set(
      threeCtx.currentRadius * sinPhi * Math.sin(threeCtx.currentTheta),
      threeCtx.currentRadius * Math.cos(threeCtx.currentPhi),
      threeCtx.currentRadius * sinPhi * Math.cos(threeCtx.currentTheta)
    );
    threeCtx.camera.lookAt(0, 0, 0);

    // Rotación suave automática del planeta + pulso táctil
    threeCtx.planetPivot.rotation.y += dt * 0.085;
    if (threeCtx.planetPulse > 0) {
      threeCtx.planetPulse = Math.max(0, threeCtx.planetPulse - dt * 5.2);
      const s = 1 + Math.sin(threeCtx.planetPulse * Math.PI) * 0.04;
      threeCtx.planetPivot.scale.setScalar(s);
    } else {
      threeCtx.planetPivot.scale.setScalar(1);
    }

    // Animar partículas de Era y actores (dinosaurios, mamuts, cristales)
    const activePts = threeCtx.eraParticles[threeCtx.activeBiome];
    if (activePts) {
      activePts.rotation.y += dt * (threeCtx.activeBiome === 2 ? 0.24 : 0.12);
    }

    for (const actor of threeCtx.animatedActors) {
      if (actor.kind === 'crystal' && threeCtx.activeBiome === 0) {
        const shard = actor.group.userData.floatingShard;
        if (shard) {
          shard.position.y = 0.42 + Math.sin(elapsed * 2.4 + actor.phase) * 0.05;
          shard.rotation.y += dt * 1.4;
        }
      } else if (actor.kind === 'walker' && actor.era === threeCtx.activeBiome) {
        const angle = elapsed * actor.speed + actor.phase;
        _vecA.copy(actor.baseDir).applyAxisAngle(actor.axis, angle).normalize();
        const r = PLANET_RADIUS + 0.10;
        actor.group.position.copy(_vecA).multiplyScalar(r);

        // Tangente hacia adelante
        _vecB.crossVectors(actor.axis, _vecA).normalize();
        _quatA.setFromUnitVectors(_upVec, _vecA);
        actor.group.quaternion.copy(_quatA);
        // Alinear frente +Z con la tangente sin crear objetos en el loop
        _vecC.set(0, 0, 1).applyQuaternion(actor.group.quaternion);
        _vecD.crossVectors(_vecC, _vecB);
        const turnAngle = Math.atan2(_vecD.dot(_vecA), _vecC.dot(_vecB));
        actor.group.rotateY(turnAngle);
        actor.group.position.addScaledVector(_vecA, Math.abs(Math.sin(elapsed * 7 + actor.phase)) * 0.018);
      }
    }

    // Ondas de choque
    for (const sw of threeCtx.shockwaves) {
      if (sw.life <= 0) continue;
      sw.life -= dt;
      if (sw.life <= 0) {
        sw.mesh.visible = false;
      } else {
        const p = 1 - sw.life / sw.maxLife;
        sw.mesh.scale.setScalar(1 + p * 4.4);
        sw.mesh.material.opacity = (1 - p) * 0.92;
      }
    }

    // Partículas doradas de Entropía/ADN
    for (const pt of threeCtx.tapParticles) {
      if (pt.life <= 0) continue;
      pt.life -= dt;
      if (pt.life <= 0) {
        pt.mesh.visible = false;
      } else {
        const p = pt.life / pt.maxLife;
        pt.mesh.position.addScaledVector(pt.vel, dt);
        pt.mesh.rotation.x += dt * 4;
        pt.mesh.rotation.y += dt * 5;
        pt.mesh.material.opacity = p;
      }
    }

    threeCtx.renderer.render(threeCtx.scene, threeCtx.camera);

    uiAcc += dt;
    if (uiAcc >= 0.12) {
      uiAcc = 0;
      updateTopHud();
      refreshAffordableStates();
    }

    saveAcc += dt;
    if (saveAcc >= 3.0) {
      saveAcc = 0;
      saveGame();
    }

    if (threeCtx.isSoftwareGl) afterDraw(tick);
    else threeCtx.frameId = requestAnimationFrame(tick);
  }

  tick();
}

// ============================================================
// INTERFAZ DOM Y CONTROLES
// ============================================================

function checkEraProgression() {
  const realEra = computeCurrentEra();
  if (realEra > state.highestEra) {
    state.highestEra = realEra;
    audio.setEra(realEra);
    audio.playEraUnlock();
    dom.eraToastTitle.textContent = ERAS[realEra].fullTitle;
    dom.eraToast.classList.remove('hidden');
    setTimeout(() => dom.eraToast.classList.add('hidden'), 3400);
    syncBiomeSelector();
  }
  const displayEra =
    state.biomePreview === 'auto' ? realEra : Math.min(Number(state.biomePreview) || 0, state.highestEra);
  applyBiomeVisuals(displayEra);
}

function updateTopHud() {
  const realEra = computeCurrentEra();
  const eraInfo = ERAS[realEra];

  dom.adnTotalVal.textContent = formatNumber(state.adn);
  dom.adnRateVal.textContent = `${formatNumber(getTotalAdnPerSec())}/s`;
  dom.eraNameVal.textContent = eraInfo.name;
  dom.eraSubtitle.textContent = eraInfo.fullTitle;
  dom.tapPowerVal.textContent = `+${formatNumber(getTapPower())}`;
  dom.eraProgressFill.style.width = `${Math.round(getEraProgressRatio() * 100)}%`;

  if (state.starFossils > 0) {
    dom.starFossilsHud.classList.remove('hidden');
    dom.starFossilsVal.textContent = formatNumber(state.starFossils);
    dom.prestigeBonusVal.textContent = `+${state.starFossils * 25}%`;
  } else {
    dom.starFossilsHud.classList.add('hidden');
  }

  const availUpgrades = UPGRADES.filter((u) => isUpgradeUnlocked(u)).length;
  dom.upgradeCountText.textContent = availUpgrades > 0 ? String(availUpgrades) : '';
}

function getBuyOrderForNode(node) {
  const owned = state.counts[node.id] || 0;
  if (buyQty === '1') return { qty: 1, cost: getSingleCost(node, owned) };
  if (buyQty === '10') return { qty: 10, cost: getBulkCost(node, owned, 10) };
  const maxRes = getMaxAffordable(node, owned, state.adn);
  return { qty: Math.max(1, maxRes.qty), cost: maxRes.qty > 0 ? maxRes.cost : getSingleCost(node, owned) };
}

function buildEvolutionCards() {
  const frag = document.createDocumentFragment();
  let lastEra = -1;

  for (const node of NODES) {
    const unlocked = isNodeUnlocked(node);
    const owned = state.counts[node.id] || 0;

    // Mostrar hasta el siguiente nodo bloqueado inmediato para mantener el árbol limpio e intuitivo
    const prevOwned = node.reqNode ? state.counts[node.reqNode] || 0 : 1;
    const isNextTeaser = !unlocked && node.reqNode && NODES.some((n) => n.id === node.reqNode && isNodeUnlocked(n));
    if (!unlocked && !isNextTeaser && prevOwned === 0 && owned === 0) {
      continue;
    }

    if (node.era !== lastEra) {
      lastEra = node.era;
      const div = document.createElement('div');
      div.className = 'era-divider';
      div.innerHTML = `<span>${ERAS[node.era].fullTitle}</span><span>Era ${node.era + 1}</span>`;
      frag.appendChild(div);
    }

    const card = document.createElement('article');
    card.className = `node-card ${unlocked ? '' : 'locked'}`;
    card.dataset.nodeId = node.id;

    const prod = getNodeProduction(node);
    const singleProd = node.baseProd * getNodeMultiplier(node.id) * getGlobalUpgradeMultiplier() * getPrestigeMultiplier();
    const milestoneNext = Math.ceil((owned + 1) / 10) * 10;
    const milestonePct = Math.round(((owned % 10) / 10) * 100);

    card.innerHTML = `
      <div class="node-emblem">${node.code}</div>
      <div class="node-info">
        <div class="node-title-row">
          <span class="node-name">${unlocked ? node.name : '??? (' + node.name + ')'}</span>
          <span class="node-owned">${owned}</span>
        </div>
        <div class="node-desc">${unlocked ? node.description : 'Requiere desbloquear la especie anterior.'}</div>
        <div class="node-metrics">
          <span class="prod">+${formatNumber(unlocked ? (owned > 0 ? prod : singleProd) : node.baseProd)}/s</span>
          <span>·</span>
          <span>Meta ${owned}/${milestoneNext}</span>
        </div>
        <div class="node-progress-bar">
          <div class="node-progress-fill" style="width:${owned > 0 ? Math.max(8, milestonePct) : 0}%"></div>
        </div>
      </div>
      <button class="buy-btn" type="button" data-buy-node="${node.id}">
        <span class="buy-qty">x1</span>
        <span class="buy-cost">0</span>
      </button>
    `;
    frag.appendChild(card);
  }

  dom.evolutionList.replaceChildren(frag);
}

function buildUpgradeCards() {
  const avail = UPGRADES.filter((u) => isUpgradeUnlocked(u));
  if (avail.length === 0) {
    dom.upgradesList.innerHTML = `
      <div class="prestige-hero">
        <p class="modal-kicker">Sin mutaciones pendientes</p>
        <h3>Evoluciona más organismos</h3>
        <p>Al alcanzar hitos de especies (1, 5, 10 ejemplares) se desbloquean mutaciones genéticas y multiplicadores de toque.</p>
      </div>
    `;
    return;
  }

  const frag = document.createDocumentFragment();
  for (const up of avail) {
    const card = document.createElement('article');
    card.className = 'node-card';
    card.dataset.upgradeId = up.id;
    const badge = up.type.startsWith('click') ? 'TAP' : up.type === 'global' ? 'ALL' : 'x' + up.mult;
    card.innerHTML = `
      <div class="node-emblem" style="color:#fbbf24">${badge}</div>
      <div class="node-info">
        <div class="node-title-row">
          <span class="node-name">${up.name}</span>
        </div>
        <div class="node-desc">${up.description}</div>
      </div>
      <button class="buy-btn amber" type="button" data-buy-upgrade="${up.id}">
        <span class="buy-qty">Mutar</span>
        <span class="buy-cost">${formatNumber(up.cost)}</span>
      </button>
    `;
    frag.appendChild(card);
  }
  dom.upgradesList.replaceChildren(frag);
}

function buildPrestigePanel() {
  const currentEra = computeCurrentEra();
  const canPrestige = currentEra >= 2;
  const pendingFossils = getPendingStarFossils();
  const currentBonus = state.starFossils * 25;
  const nextBonus = (state.starFossils + pendingFossils) * 25;

  dom.prestigeContainer.innerHTML = `
    <div class="prestige-hero">
      <p class="modal-kicker">Prestigio · Ciclo Cósmico</p>
      <h3>Extinción y Renacimiento Estelar</h3>
      <p>Al alcanzar la Edad de Hielo puedes reiniciar la línea temporal para cristalizar tu progreso en Fósiles Estelares permanentes (+25% producción global y poder de toque cada uno).</p>
    </div>
    <div class="prestige-stats-grid">
      <div class="prestige-stat-box">
        <span class="stat-label">Fósiles Actuales</span>
        <strong>${formatNumber(state.starFossils)}</strong>
        <span class="setting-sub">Bono activo: +${currentBonus}%</span>
      </div>
      <div class="prestige-stat-box">
        <span class="stat-label">Al Reiniciar Ahora</span>
        <strong class="amber">+${formatNumber(pendingFossils)}</strong>
        <span class="setting-sub">Nuevo bono: +${nextBonus}%</span>
      </div>
    </div>
    <button id="triggerPrestigeBtn" class="primary-cta violet" type="button" ${canPrestige ? '' : 'disabled'}>
      ${canPrestige ? 'Iniciar Ciclo Cósmico (+' + formatNumber(pendingFossils) + ' Fósiles)' : 'Bloqueado: Alcanza la Edad de Hielo'}
    </button>
  `;

  const btn = document.getElementById('triggerPrestigeBtn');
  if (btn && canPrestige) {
    btn.addEventListener('click', () => {
      dom.modalFossilsGain.textContent = `+${formatNumber(getPendingStarFossils())}`;
      dom.prestigeModal.classList.remove('hidden');
    });
  }
}

function refreshAffordableStates() {
  if (needsListRebuild) {
    needsListRebuild = false;
    buildEvolutionCards();
    buildUpgradeCards();
    buildPrestigePanel();
  }

  // Actualizar botones de Evolución sin reconstruir DOM
  dom.evolutionList.querySelectorAll('.node-card').forEach((card) => {
    const id = card.dataset.nodeId;
    const node = NODES.find((n) => n.id === id);
    if (!node) return;
    const unlocked = isNodeUnlocked(node);
    const btn = card.querySelector('.buy-btn');
    const order = getBuyOrderForNode(node);
    const canBuy = unlocked && state.adn >= order.cost;

    btn.querySelector('.buy-qty').textContent = buyQty === 'max' ? `x${order.qty}` : `x${order.qty}`;
    btn.querySelector('.buy-cost').textContent = formatNumber(order.cost);
    btn.disabled = !canBuy;
    btn.classList.toggle('ready', canBuy);
    card.classList.toggle('affordable', canBuy);
  });

  // Actualizar botones de Mutaciones
  dom.upgradesList.querySelectorAll('.node-card').forEach((card) => {
    const id = card.dataset.upgradeId;
    const up = UPGRADES.find((u) => u.id === id);
    if (!up) return;
    const btn = card.querySelector('.buy-btn');
    const canBuy = state.adn >= up.cost;
    btn.disabled = !canBuy;
    btn.classList.toggle('ready', canBuy);
    card.classList.toggle('affordable', canBuy);
  });
}

function buyNode(nodeId) {
  const node = NODES.find((n) => n.id === nodeId);
  if (!node || !isNodeUnlocked(node)) return;
  const order = getBuyOrderForNode(node);
  if (state.adn < order.cost) return;

  state.adn -= order.cost;
  state.counts[node.id] = (state.counts[node.id] || 0) + order.qty;
  audio.playBuy();
  checkEraProgression();
  needsListRebuild = true;
  refreshAffordableStates();
  updateTopHud();
  saveGame();
}

function buyUpgrade(upgradeId) {
  const up = UPGRADES.find((u) => u.id === upgradeId);
  if (!up || state.upgrades.includes(up.id) || state.adn < up.cost) return;

  state.adn -= up.cost;
  state.upgrades.push(up.id);
  audio.playUpgrade();
  needsListRebuild = true;
  refreshAffordableStates();
  updateTopHud();
  saveGame();
}

function performCosmicReset() {
  const gain = getPendingStarFossils();
  if (gain <= 0) return;

  const preservedFossils = state.starFossils + gain;
  const preservedCount = state.prestigeCount + 1;
  const preservedLifetime = state.lifetimeAdn;
  const preservedSettings = { ...state.settings };

  state = createDefaultState();
  state.starFossils = preservedFossils;
  state.prestigeCount = preservedCount;
  state.lifetimeAdn = preservedLifetime;
  state.settings = preservedSettings;

  audio.setEra(0);
  audio.playPrestige();
  syncBiomeSelector();
  applyBiomeVisuals(0);
  needsListRebuild = true;
  refreshAffordableStates();
  updateTopHud();
  saveGame();
  dom.prestigeModal.classList.add('hidden');
  switchTab('evolution');
}

function switchTab(tabName) {
  activeTab = tabName;
  document.querySelectorAll('.tab-btn').forEach((btn) => {
    const active = btn.dataset.tab === tabName;
    btn.classList.toggle('active', active);
    btn.setAttribute('aria-selected', String(active));
  });
  document.getElementById('panelEvolution').classList.toggle('active', tabName === 'evolution');
  document.getElementById('panelUpgrades').classList.toggle('active', tabName === 'upgrades');
  document.getElementById('panelPrestige').classList.toggle('active', tabName === 'prestige');
  dom.qtySelector.classList.toggle('hidden', tabName !== 'evolution');
  if (tabName === 'prestige') buildPrestigePanel();
}

function syncBiomeSelector() {
  const opts = ['<option value="auto">Automática (Era actual)</option>'];
  for (let i = 0; i <= state.highestEra; i++) {
    opts.push(`<option value="${i}">${ERAS[i].name}</option>`);
  }
  dom.biomeViewSelect.innerHTML = opts.join('');
  dom.biomeViewSelect.value = state.biomePreview || 'auto';
}

function syncSettingsUi() {
  dom.toggleMusicBtn.classList.toggle('active', state.settings.music);
  dom.toggleMusicBtn.textContent = state.settings.music ? 'Activa' : 'Silencio';
  dom.toggleSfxBtn.classList.toggle('active', state.settings.sfx);
  dom.toggleSfxBtn.textContent = state.settings.sfx ? 'Activos' : 'Silencio';
  dom.toggleHapticBtn.classList.toggle('active', state.settings.haptic);
  dom.toggleHapticBtn.textContent = state.settings.haptic ? 'Activa' : 'Inactiva';

  audio.setMusicEnabled(state.settings.music);
  audio.setSfxEnabled(state.settings.sfx);
  audio.setHapticEnabled(state.settings.haptic);
  syncBiomeSelector();
}

function bindUiEvents() {
  // Delegación para botones de compra en listas
  dom.evolutionList.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-buy-node]');
    if (btn) {
      audio.unlock();
      buyNode(btn.dataset.buyNode);
    }
  });

  dom.upgradesList.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-buy-upgrade]');
    if (btn) {
      audio.unlock();
      buyUpgrade(btn.dataset.buyUpgrade);
    }
  });

  // Selector x1 / x10 / Max
  dom.qtySelector.addEventListener('click', (e) => {
    const btn = e.target.closest('.qty-btn');
    if (!btn) return;
    buyQty = btn.dataset.qty;
    dom.qtySelector.querySelectorAll('.qty-btn').forEach((b) => {
      b.classList.toggle('active', b === btn);
    });
    refreshAffordableStates();
  });

  // Pestañas
  document.querySelectorAll('.tab-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      audio.unlock();
      switchTab(btn.dataset.tab);
    });
  });

  // Gesto deslizable horizontal entre pestañas en panel inferior
  const swipeWrap = document.getElementById('panelSwipeWrap');
  let sx = 0;
  let sy = 0;
  swipeWrap.addEventListener('touchstart', (e) => {
    if (e.touches.length === 1) {
      sx = e.touches[0].clientX;
      sy = e.touches[0].clientY;
    }
  }, { passive: true });
  swipeWrap.addEventListener('touchend', (e) => {
    if (e.changedTouches.length !== 1) return;
    const dx = e.changedTouches[0].clientX - sx;
    const dy = e.changedTouches[0].clientY - sy;
    if (Math.abs(dx) > 65 && Math.abs(dx) > Math.abs(dy) * 1.6) {
      const order = ['evolution', 'upgrades', 'prestige'];
      const curIdx = order.indexOf(activeTab);
      if (dx < 0 && curIdx < order.length - 1) switchTab(order[curIdx + 1]);
      else if (dx > 0 && curIdx > 0) switchTab(order[curIdx - 1]);
    }
  }, { passive: true });

  // Configuración y audio
  dom.settingsBtn.addEventListener('click', () => {
    audio.unlock();
    dom.confirmResetRow.classList.add('hidden');
    dom.settingsModal.classList.remove('hidden');
  });
  dom.closeSettingsBtn.addEventListener('click', () => dom.settingsModal.classList.add('hidden'));

  dom.toggleMusicBtn.addEventListener('click', () => {
    audio.unlock();
    state.settings.music = !state.settings.music;
    syncSettingsUi();
    saveGame();
  });
  dom.toggleSfxBtn.addEventListener('click', () => {
    audio.unlock();
    state.settings.sfx = !state.settings.sfx;
    syncSettingsUi();
    saveGame();
  });
  dom.toggleHapticBtn.addEventListener('click', () => {
    state.settings.haptic = !state.settings.haptic;
    syncSettingsUi();
    saveGame();
  });

  dom.biomeViewSelect.addEventListener('change', () => {
    state.biomePreview = dom.biomeViewSelect.value;
    checkEraProgression();
    saveGame();
  });

  dom.hardResetBtn.addEventListener('click', () => {
    dom.confirmResetRow.classList.remove('hidden');
  });
  dom.cancelResetBtn.addEventListener('click', () => {
    dom.confirmResetRow.classList.add('hidden');
  });
  dom.confirmResetBtn.addEventListener('click', () => {
    localStorage.removeItem(SAVE_KEY);
    state = createDefaultState();
    audio.setEra(0);
    syncSettingsUi();
    applyBiomeVisuals(0);
    needsListRebuild = true;
    refreshAffordableStates();
    updateTopHud();
    dom.confirmResetRow.classList.add('hidden');
    dom.settingsModal.classList.add('hidden');
  });

  // Modal de Prestigio
  dom.cancelPrestigeBtn.addEventListener('click', () => dom.prestigeModal.classList.add('hidden'));
  dom.confirmPrestigeBtn.addEventListener('click', performCosmicReset);

  // Guardar al ocultar o cerrar pestaña
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') saveGame();
  });
  window.addEventListener('pagehide', saveGame);
}

// ============================================================
// ARRANQUE PRINCIPAL
// ============================================================

function bootstrap() {
  const elapsedSec = loadGame();
  syncSettingsUi();
  bindUiEvents();
  initThreeScene();

  const currentEra = computeCurrentEra();
  if (currentEra > state.highestEra) state.highestEra = currentEra;
  audio.setEra(currentEra);
  syncBiomeSelector();
  applyBiomeVisuals(
    state.biomePreview === 'auto'
      ? currentEra
      : Math.min(Number(state.biomePreview) || 0, state.highestEra)
  );

  // Recompensa Offline si estuvo ausente >= 15 segundos con producción activa
  const dps = getTotalAdnPerSec();
  if (elapsedSec >= 15 && dps > 0) {
    const offlineGain = dps * elapsedSec;
    const mins = Math.floor(elapsedSec / 60);
    const hrs = Math.floor(mins / 60);
    const timeLabel =
      hrs > 0
        ? `${hrs} h ${mins % 60} min`
        : mins > 0
          ? `${mins} min ${Math.floor(elapsedSec % 60)} s`
          : `${Math.floor(elapsedSec)} segundos`;

    dom.offlineElapsedText.textContent = `Estuviste ausente ${timeLabel}. Tu ecosistema continuó sintetizando vida.`;
    dom.offlineRewardVal.textContent = `+${formatNumber(offlineGain)} ADN`;
    dom.offlineModal.classList.remove('hidden');

    dom.claimOfflineBtn.onclick = () => {
      audio.unlock();
      state.adn += offlineGain;
      state.totalRunAdn += offlineGain;
      state.lifetimeAdn += offlineGain;
      audio.playUpgrade();
      dom.offlineModal.classList.add('hidden');
      refreshAffordableStates();
      updateTopHud();
      saveGame();
    };
  }

  needsListRebuild = true;
  refreshAffordableStates();
  updateTopHud();
}

bootstrap();
