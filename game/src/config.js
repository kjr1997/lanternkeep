// Lanternkeep tuning: every number that shapes how the game feels.
// One place to tune difficulty, speed, scoring and the upgrade pool.

export const VIEW = { width: 1280, height: 720 };
export const CENTER = { x: VIEW.width / 2, y: VIEW.height / 2 };

export const PALETTE = {
  skyTop: '#0b0722',
  skyBottom: '#171233',
  ground: '#0e0a26',
  lanternCore: '#ffd97a',
  lanternGlow: '#ff9d3c',
  player: '#7fe7d2',
  playerCore: '#eafff8',
  bullet: '#ffe9a8',
  wisp: '#b78cff',
  dart: '#ff7ad9',
  brute: '#ff5d5d',
  splitter: '#8fd0ff',
  elite: '#ffd23c',
  ember: '#ffb347',
  text: '#f4ead8',
  textDim: '#a99ec7',
  cardBack: '#1c1440',
  cardEdge: '#6b5aa8',
  danger: '#ff6b6b',
  heal: '#8dff9e',
};

export const PLAYER = {
  radius: 14,
  speed: 300,
  fireInterval: 0.16,
  bulletSpeed: 640,
  bulletDamage: 1,
  bulletRadius: 5,
  maxHp: 3,
};

export const LANTERN = {
  radius: 46,
  maxLight: 100,
  drainWisp: 5,
  drainDart: 5,
  drainSplitter: 8,
  drainBrute: 15,
  regenPerSecond: 0,
};

export const ENEMIES = {
  wisp: { radius: 13, hp: 1, speed: 55, score: 10, drain: LANTERN.drainWisp, color: PALETTE.wisp },
  dart: { radius: 11, hp: 1, speed: 135, score: 15, drain: LANTERN.drainDart, color: PALETTE.dart },
  brute: { radius: 26, hp: 6, speed: 34, score: 40, drain: LANTERN.drainBrute, color: PALETTE.brute },
  splitter: { radius: 17, hp: 3, speed: 70, score: 25, drain: LANTERN.drainSplitter, color: PALETTE.splitter },
};

// How a wave is built: base count grows, new kinds join over time.
export function waveComposition(wave) {
  const list = [];
  const wisps = 5 + wave * 2;
  const darts = wave >= 2 ? 1 + wave : 0;
  const splitters = wave >= 3 ? Math.floor(wave / 2) : 0;
  const brutes = wave >= 4 ? Math.floor((wave - 2) / 2) : 0;
  for (let i = 0; i < wisps; i += 1) list.push('wisp');
  for (let i = 0; i < darts; i += 1) list.push('dart');
  for (let i = 0; i < splitters; i += 1) list.push('splitter');
  for (let i = 0; i < brutes; i += 1) list.push('brute');
  return list;
}

export function waveSpawnInterval(wave) {
  return Math.max(0.45, 1.15 - wave * 0.06);
}

export const UPGRADES = [
  { id: 'rapid', name: 'Rapid Wick', text: 'Shoot 22% faster.', apply: (p) => { p.fireInterval *= 0.78; } },
  { id: 'twin', name: 'Twin Flame', text: 'Fire two bolts at once.', apply: (p) => { p.shots += 1; } },
  { id: 'heavy', name: 'Heavy Ember', text: '+1 damage on every bolt.', apply: (p) => { p.bulletDamage += 1; } },
  { id: 'swift', name: 'Swift Wings', text: 'Move 15% faster.', apply: (p) => { p.speed *= 1.15; } },
  { id: 'mend', name: 'Mend Light', text: 'Restore 30 lantern light.', apply: (p, w) => { w.lanternLight = Math.min(LANTERN.maxLight, w.lanternLight + 30); } },
  { id: 'orbit', name: 'Orbiting Spark', text: 'A spark circles you, hurting shades it touches.', apply: (p) => { p.orbiters += 1; } },
  { id: 'pierce', name: 'Piercing Light', text: 'Bolts pass through one extra shade.', apply: (p) => { p.pierce += 1; } },
  { id: 'ward', name: 'Lantern Ward', text: 'The lantern slowly regains light.', apply: (p, w) => { w.lanternRegen += 0.8; } },
];

export const SCORE = {
  comboWindow: 2.5,
  comboStep: 0.25,
  comboMax: 3,
  waveClearBonus: 50,
};
