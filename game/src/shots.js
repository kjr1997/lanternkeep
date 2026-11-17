// Deterministic screenshot scenes: ?shot=start|play|draft|end&seed=N draws
// a fixed moment of the game with a seeded garden, then sets
// window.__shotReady so a screenshot tool knows the frame is done.
// Nothing here reads the wall clock: the scenes are the same every run.

import { CENTER, UPGRADES, VIEW } from './config.js';
import { makeRng, range } from './random.js';
import { makeEnemy, makeParticle } from './entities.js';
import { STATES } from './world.js';

function placeEnemies(world, seed) {
  const rng = makeRng(seed);
  const kinds = ['wisp', 'dart', 'wisp', 'splitter', 'wisp', 'dart', 'brute', 'wisp'];
  for (const kind of kinds) {
    const angle = rng() * Math.PI * 2;
    const dist = range(rng, 190, 420);
    const x = CENTER.x + Math.cos(angle) * dist;
    const y = CENTER.y + Math.sin(angle) * dist * 0.7;
    world.enemies.push(makeEnemy(kind, x, y, rng, kind === 'brute'));
  }
}

export function applyShot(world, shot, seed) {
  world.time = 12;
  world.best = 1250;
  if (shot === 'start') {
    world.state = STATES.TITLE;
    world.score = 0;
    return;
  }
  if (shot === 'play') {
    world.state = STATES.PLAYING;
    world.wave = 3;
    world.score = 1840;
    world.combo = 1.5;
    world.lanternLight = 74;
    world.player.hp = 3;
    world.player.x = VIEW.width / 2 + 60;
    world.player.y = VIEW.height / 2 + 150;
    world.player.angle = -0.6;
    world.player.shots = 2;
    world.spawnQueue = ['wisp', 'dart', 'wisp'];
    placeEnemies(world, seed);
    world.particles.push(...makeParticle(CENTER.x - 120, CENTER.y - 90, '#ffe9a8', 12, makeRng(seed + 5), 140));
    world.particles.push(...makeParticle(CENTER.x + 200, CENTER.y + 60, '#b78cff', 10, makeRng(seed + 9), 140));
    world.waveBanner = 0;
    return;
  }
  if (shot === 'draft') {
    world.state = STATES.DRAFT;
    world.wave = 3;
    world.score = 2310;
    world.lanternLight = 82;
    world.player.hp = 3;
    world.spawnQueue = [];
    world.enemies = [];
    // Three fixed, readable blessings for the screenshot.
    world.draftChoices = [
      UPGRADES.find((u) => u.id === 'twin'),
      UPGRADES.find((u) => u.id === 'mend'),
      UPGRADES.find((u) => u.id === 'orbit'),
    ];
    world.draftHover = 0;
    return;
  }
  if (shot === 'end') {
    world.state = STATES.OVER;
    world.score = 4860;
    world.wave = 6;
    world.kills = 87;
    world.shotsFired = 410;
    world.shotsHit = 289;
    world.lanternLight = 0;
    world.newBest = true;
    world.best = 4860;
    return;
  }
  world.state = STATES.TITLE;
}
