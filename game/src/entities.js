// Entities: the moth-warden, the shades, bolts, sparks and the little
// bursts of light everything leaves behind. Pure data plus the small
// functions that move it; the world owns the lists.

import { ENEMIES, LANTERN, PLAYER, VIEW } from './config.js';
import { range } from './random.js';

export function makePlayer() {
  return {
    x: VIEW.width / 2,
    y: VIEW.height / 2 + 170,
    vx: 0,
    vy: 0,
    angle: -Math.PI / 2,
    radius: PLAYER.radius,
    hp: PLAYER.maxHp,
    speed: PLAYER.speed,
    fireInterval: PLAYER.fireInterval,
    fireTimer: 0,
    bulletDamage: PLAYER.bulletDamage,
    bulletSpeed: PLAYER.bulletSpeed,
    shots: 1,
    pierce: 0,
    orbiters: 0,
    orbiterAngle: 0,
    invulnTimer: 0,
    wingPhase: 0,
  };
}

export function makeEnemy(kind, x, y, rng, elite) {
  const def = ENEMIES[kind];
  const hp = elite ? def.hp * 2 + 1 : def.hp;
  return {
    kind,
    x,
    y,
    vx: 0,
    vy: 0,
    hp,
    maxHp: hp,
    radius: def.radius * (elite ? 1.25 : 1),
    speed: def.speed * (elite ? 1.15 : 1) * range(rng, 0.9, 1.1),
    score: def.score * (elite ? 3 : 1),
    drain: def.drain,
    color: def.color,
    elite,
    wobble: range(rng, 0, Math.PI * 2),
    flash: 0,
    orbHitAt: -10,
  };
}

export function makeBullet(x, y, angle, speed, damage, pierce) {
  return {
    x, y,
    vx: Math.cos(angle) * speed,
    vy: Math.sin(angle) * speed,
    damage,
    pierceLeft: pierce,
    radius: PLAYER.bulletRadius,
    life: 1.4,
  };
}

export function makeParticle(x, y, color, count, rng, speed = 160) {
  const out = [];
  for (let i = 0; i < count; i += 1) {
    const angle = rng() * Math.PI * 2;
    const v = range(rng, speed * 0.3, speed);
    out.push({
      x, y,
      vx: Math.cos(angle) * v,
      vy: Math.sin(angle) * v,
      life: range(rng, 0.3, 0.7),
      maxLife: 0.7,
      size: range(rng, 2, 5),
      color,
    });
  }
  return out;
}

export function makeFloatText(x, y, text, color) {
  return { x, y, text, color, life: 0.9, maxLife: 0.9 };
}

// A shade drifts toward the lantern, wobbling as it goes. Darts zigzag.
export function steerEnemy(enemy, targetX, targetY, dt, time) {
  const dx = targetX - enemy.x;
  const dy = targetY - enemy.y;
  const dist = Math.hypot(dx, dy) || 1;
  let angle = Math.atan2(dy, dx);
  if (enemy.kind === 'dart') {
    angle += Math.sin(time * 6 + enemy.wobble) * 0.55;
  } else if (enemy.kind === 'wisp') {
    angle += Math.sin(time * 2.4 + enemy.wobble) * 0.25;
  }
  enemy.vx = Math.cos(angle) * enemy.speed;
  enemy.vy = Math.sin(angle) * enemy.speed;
  enemy.x += enemy.vx * dt;
  enemy.y += enemy.vy * dt;
  if (enemy.flash > 0) enemy.flash -= dt;
}

export function moveBullet(bullet, dt) {
  bullet.x += bullet.vx * dt;
  bullet.y += bullet.vy * dt;
  bullet.life -= dt;
}

export function moveParticle(p, dt) {
  p.x += p.vx * dt;
  p.y += p.vy * dt;
  p.vx *= 0.96;
  p.vy *= 0.96;
  p.life -= dt;
}

export function moveFloatText(t, dt) {
  t.y -= 34 * dt;
  t.life -= dt;
}

export function insideView(x, y, margin) {
  return x > -margin && x < VIEW.width + margin && y > -margin && y < VIEW.height + margin;
}

export function lanternDrain(kind) {
  return ENEMIES[kind].drain;
}

export { LANTERN };
