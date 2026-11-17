// World: the game state, the waves, the lantern, the score and the
// upgrade draft. Rendering lives in render.js; this file only decides
// what happens.

import {
  CENTER, ENEMIES, LANTERN, PLAYER, SCORE, UPGRADES, VIEW,
  waveComposition, waveSpawnInterval,
} from './config.js';
import { makeRng, pick, range, shuffle } from './random.js';
import {
  makeBullet, makeEnemy, makeFloatText, makeParticle, makePlayer,
  moveBullet, moveFloatText, moveParticle, steerEnemy,
} from './entities.js';
import { loadBest, saveBest } from './storage.js';

export const STATES = {
  TITLE: 'title',
  PLAYING: 'playing',
  DRAFT: 'draft',
  PAUSED: 'paused',
  OVER: 'over',
  DAWN: 'dawn',
};

export function createWorld(seed) {
  return {
    rng: makeRng(seed),
    state: STATES.TITLE,
    prevState: STATES.TITLE,
    time: 0,
    wave: 0,
    score: 0,
    best: loadBest(),
    combo: 1,
    comboTimer: 0,
    kills: 0,
    shotsFired: 0,
    shotsHit: 0,
    lanternLight: LANTERN.maxLight,
    lanternRegen: 0,
    player: makePlayer(),
    enemies: [],
    bullets: [],
    particles: [],
    texts: [],
    spawnQueue: [],
    spawnTimer: 0,
    draftChoices: [],
    draftHover: -1,
    shake: 0,
    flashRed: 0,
    waveBanner: 0,
    waveBannerText: '',
    fireflies: [],
    stars: [],
    newBest: false,
    endless: false,
  };
}

export function seedScenery(world) {
  const rng = makeRng(20261117);
  world.stars = [];
  for (let i = 0; i < 110; i += 1) {
    world.stars.push({ x: rng() * VIEW.width, y: rng() * VIEW.height * 0.7, r: range(rng, 0.6, 1.8), tw: range(rng, 0, Math.PI * 2) });
  }
  world.fireflies = [];
  for (let i = 0; i < 26; i += 1) {
    world.fireflies.push({ x: rng() * VIEW.width, y: range(rng, 120, VIEW.height - 60), p: range(rng, 0, Math.PI * 2), s: range(rng, 6, 16) });
  }
}

export function startGame(world) {
  world.state = STATES.PLAYING;
  world.time = 0;
  world.wave = 0;
  world.score = 0;
  world.combo = 1;
  world.comboTimer = 0;
  world.kills = 0;
  world.shotsFired = 0;
  world.shotsHit = 0;
  world.lanternLight = LANTERN.maxLight;
  world.lanternRegen = 0;
  world.player = makePlayer();
  world.enemies = [];
  world.bullets = [];
  world.particles = [];
  world.texts = [];
  world.spawnQueue = [];
  world.newBest = false;
  world.endless = false;
  nextWave(world);
}

export function nextWave(world) {
  world.wave += 1;
  const kinds = shuffle(world.rng, waveComposition(world.wave));
  world.spawnQueue = kinds;
  world.spawnTimer = 0.8;
  world.waveBanner = 2.2;
  world.waveBannerText = `Wave ${world.wave}`;
}

function spawnPoint(world) {
  const side = Math.floor(world.rng() * 4);
  const m = 30;
  if (side === 0) return { x: range(world.rng, 0, VIEW.width), y: -m };
  if (side === 1) return { x: VIEW.width + m, y: range(world.rng, 0, VIEW.height) };
  if (side === 2) return { x: range(world.rng, 0, VIEW.width), y: VIEW.height + m };
  return { x: -m, y: range(world.rng, 0, VIEW.height) };
}

function spawnNext(world) {
  const kind = world.spawnQueue.pop();
  if (!kind) return;
  const p = spawnPoint(world);
  const elite = world.wave >= 5 && world.rng() < 0.12;
  world.enemies.push(makeEnemy(kind, p.x, p.y, world.rng, elite));
}

function addScore(world, base, x, y) {
  const gained = Math.round(base * world.combo);
  world.score += gained;
  world.combo = Math.min(SCORE.comboMax, world.combo + SCORE.comboStep);
  world.comboTimer = SCORE.comboWindow;
  world.texts.push(makeFloatText(x, y, `+${gained}`, '#ffe9a8'));
}

function killEnemy(world, index, byBullet) {
  const enemy = world.enemies[index];
  world.enemies.splice(index, 1);
  world.kills += 1;
  addScore(world, enemy.score, enemy.x, enemy.y);
  world.particles.push(...makeParticle(enemy.x, enemy.y, enemy.color, enemy.kind === 'brute' ? 26 : 14, world.rng));
  world.shake = Math.min(10, world.shake + (enemy.kind === 'brute' ? 7 : 3));
  if (enemy.kind === 'splitter') {
    for (let i = 0; i < 2; i += 1) {
      const child = makeEnemy('wisp', enemy.x + range(world.rng, -14, 14), enemy.y + range(world.rng, -14, 14), world.rng, false);
      child.speed *= 1.25;
      world.enemies.push(child);
    }
  }
  return byBullet;
}

function drainLantern(world, enemy) {
  world.lanternLight = Math.max(0, world.lanternLight - enemy.drain);
  world.flashRed = 0.45;
  world.shake = Math.min(12, world.shake + 6);
  world.particles.push(...makeParticle(CENTER.x, CENTER.y, '#ff9d3c', 18, world.rng, 220));
  world.texts.push(makeFloatText(CENTER.x, CENTER.y - 70, `-${enemy.drain} light`, '#ff6b6b'));
  if (world.lanternLight <= 0) {
    endGame(world);
  }
}

function hurtPlayer(world) {
  const p = world.player;
  if (p.invulnTimer > 0) return;
  p.hp -= 1;
  p.invulnTimer = 1.4;
  world.flashRed = 0.5;
  world.shake = Math.min(12, world.shake + 8);
  world.particles.push(...makeParticle(p.x, p.y, '#7fe7d2', 20, world.rng, 240));
  if (p.hp <= 0) {
    endGame(world);
  }
}

function endGame(world) {
  world.state = STATES.OVER;
  world.best = saveBest(world.score);
  world.newBest = world.score > 0 && world.score >= world.best;
  world.particles.push(...makeParticle(CENTER.x, CENTER.y, '#ffd97a', 60, world.rng, 320));
}

function openDraft(world) {
  world.state = STATES.DRAFT;
  const pool = UPGRADES.filter((u) => {
    if (u.id === 'twin' && world.player.shots >= 3) return false;
    if (u.id === 'orbit' && world.player.orbiters >= 3) return false;
    if (u.id === 'pierce' && world.player.pierce >= 3) return false;
    return true;
  });
  world.draftChoices = shuffle(world.rng, pool).slice(0, 3);
  world.draftHover = -1;
}

export function chooseUpgrade(world, index, audio) {
  const upgrade = world.draftChoices[index];
  if (!upgrade) return;
  upgrade.apply(world.player, world);
  world.texts.push(makeFloatText(world.player.x, world.player.y - 30, upgrade.name, '#8dff9e'));
  if (audio) audio.upgrade();
  nextWave(world);
  world.state = STATES.PLAYING;
}

function fireBullets(world, audio) {
  const p = world.player;
  const shots = p.shots;
  const spread = 0.14;
  for (let i = 0; i < shots; i += 1) {
    const offset = shots === 1 ? 0 : (i - (shots - 1) / 2) * spread;
    const angle = p.angle + offset;
    world.bullets.push(makeBullet(
      p.x + Math.cos(angle) * (p.radius + 6),
      p.y + Math.sin(angle) * (p.radius + 6),
      angle, p.bulletSpeed, p.bulletDamage, p.pierce,
    ));
  }
  world.shotsFired += 1;
  if (audio) audio.shoot();
}

function updatePlaying(world, dt, input, audio) {
  const p = world.player;
  world.time += dt;

  // Movement and aim.
  const axis = input.axis();
  const len = Math.hypot(axis.x, axis.y) || 1;
  p.vx = (axis.x / len) * p.speed * (axis.x || axis.y ? 1 : 0);
  p.vy = (axis.y / len) * p.speed * (axis.x || axis.y ? 1 : 0);
  p.x = Math.max(p.radius, Math.min(VIEW.width - p.radius, p.x + p.vx * dt));
  p.y = Math.max(p.radius, Math.min(VIEW.height - p.radius, p.y + p.vy * dt));
  p.angle = Math.atan2(input.mouse.y - p.y, input.mouse.x - p.x);
  p.wingPhase += dt * (axis.x || axis.y ? 26 : 14);
  if (p.invulnTimer > 0) p.invulnTimer -= dt;

  // Firing while the mouse or Space is held.
  p.fireTimer -= dt;
  if ((input.mouse.down || input.isDown('Space')) && p.fireTimer <= 0) {
    p.fireTimer = p.fireInterval;
    fireBullets(world, audio);
  }

  // Orbiting sparks.
  p.orbiterAngle += dt * 3.2;
  if (p.orbiters > 0) {
    for (let i = 0; i < p.orbiters; i += 1) {
      const a = p.orbiterAngle + (i * Math.PI * 2) / p.orbiters;
      const ox = p.x + Math.cos(a) * 52;
      const oy = p.y + Math.sin(a) * 52;
      for (let e = world.enemies.length - 1; e >= 0; e -= 1) {
        const enemy = world.enemies[e];
        if (world.time - enemy.orbHitAt < 0.5) continue;
        const d = Math.hypot(enemy.x - ox, enemy.y - oy);
        if (d < enemy.radius + 10) {
          enemy.orbHitAt = world.time;
          enemy.hp -= 1;
          enemy.flash = 0.12;
          world.particles.push(...makeParticle(enemy.x, enemy.y, '#ffe9a8', 6, world.rng, 120));
          if (enemy.hp <= 0) {
            killEnemy(world, e, false);
            if (audio) audio.explode(false);
          }
        }
      }
    }
  }

  // Spawning.
  if (world.spawnQueue.length > 0) {
    world.spawnTimer -= dt;
    if (world.spawnTimer <= 0) {
      world.spawnTimer = waveSpawnInterval(world.wave);
      spawnNext(world);
    }
  }

  // Enemies steer toward the lantern.
  for (const enemy of world.enemies) {
    steerEnemy(enemy, CENTER.x, CENTER.y, dt, world.time);
  }

  // Bullets fly and hit shades.
  for (let b = world.bullets.length - 1; b >= 0; b -= 1) {
    const bullet = world.bullets[b];
    moveBullet(bullet, dt);
    let dead = bullet.life <= 0 || bullet.x < -20 || bullet.x > VIEW.width + 20 || bullet.y < -20 || bullet.y > VIEW.height + 20;
    if (!dead) {
      for (let e = world.enemies.length - 1; e >= 0; e -= 1) {
        const enemy = world.enemies[e];
        const d = Math.hypot(enemy.x - bullet.x, enemy.y - bullet.y);
        if (d < enemy.radius + bullet.radius) {
          enemy.hp -= bullet.damage;
          enemy.flash = 0.12;
          world.shotsHit += 1;
          world.particles.push(...makeParticle(bullet.x, bullet.y, '#ffe9a8', 5, world.rng, 110));
          if (audio) audio.hit();
          if (enemy.hp <= 0) {
            killEnemy(world, e, true);
            if (audio) audio.explode(enemy.kind === 'brute');
          }
          if (bullet.pierceLeft > 0) {
            bullet.pierceLeft -= 1;
          } else {
            dead = true;
          }
          break;
        }
      }
    }
    if (dead) world.bullets.splice(b, 1);
  }

  // Shades that reach the lantern drain it; shades that touch the moth hurt it.
  for (let e = world.enemies.length - 1; e >= 0; e -= 1) {
    const enemy = world.enemies[e];
    const dLantern = Math.hypot(enemy.x - CENTER.x, enemy.y - CENTER.y);
    if (dLantern < LANTERN.radius + enemy.radius * 0.6) {
      world.enemies.splice(e, 1);
      world.particles.push(...makeParticle(enemy.x, enemy.y, enemy.color, 16, world.rng, 200));
      if (audio) audio.hurt();
      drainLantern(world, enemy);
      if (world.state !== STATES.PLAYING) return;
      continue;
    }
    const dPlayer = Math.hypot(enemy.x - p.x, enemy.y - p.y);
    if (dPlayer < enemy.radius + p.radius * 0.8) {
      world.enemies.splice(e, 1);
      world.particles.push(...makeParticle(enemy.x, enemy.y, enemy.color, 16, world.rng, 200));
      hurtPlayer(world);
      if (audio) audio.hurt();
      if (world.state !== STATES.PLAYING) return;
    }
  }

  // Lantern slowly regains light when warded.
  if (world.lanternRegen > 0) {
    world.lanternLight = Math.min(LANTERN.maxLight, world.lanternLight + world.lanternRegen * dt);
  }

  // Combo fades when the moth stops scoring.
  if (world.comboTimer > 0) {
    world.comboTimer -= dt;
    if (world.comboTimer <= 0) world.combo = 1;
  }

  // Wave cleared: bonus, then the draft — or dawn at wave ten.
  if (world.spawnQueue.length === 0 && world.enemies.length === 0) {
    world.score += SCORE.waveClearBonus * world.wave;
    if (world.wave >= 10 && !world.endless) {
      world.state = STATES.DAWN;
      world.best = saveBest(world.score);
      world.newBest = world.score > 0 && world.score >= world.best;
      if (audio) audio.victory();
    } else {
      if (audio) audio.waveHorn();
      openDraft(world);
    }
  }

  if (world.waveBanner > 0) world.waveBanner -= dt;
}

function updateParticles(world, dt) {
  for (let i = world.particles.length - 1; i >= 0; i -= 1) {
    moveParticle(world.particles[i], dt);
    if (world.particles[i].life <= 0) world.particles.splice(i, 1);
  }
  for (let i = world.texts.length - 1; i >= 0; i -= 1) {
    moveFloatText(world.texts[i], dt);
    if (world.texts[i].life <= 0) world.texts.splice(i, 1);
  }
  if (world.shake > 0) world.shake = Math.max(0, world.shake - dt * 26);
  if (world.flashRed > 0) world.flashRed -= dt;
}

export function updateWorld(world, dt, input, audio) {
  if (world.state === STATES.PLAYING) {
    updatePlaying(world, dt, input, audio);
  } else if (world.state === STATES.TITLE || world.state === STATES.OVER || world.state === STATES.DAWN) {
    world.time += dt;
  }
  updateParticles(world, dt);
}

export function accuracy(world) {
  if (world.shotsFired === 0) return 0;
  return Math.round((world.shotsHit / world.shotsFired) * 100);
}
