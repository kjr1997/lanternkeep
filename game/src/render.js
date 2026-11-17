// Render: everything the player sees, drawn on one canvas — the night
// garden, the lantern, the moth, the shades, the HUD and every menu.

import { CENTER, LANTERN, PALETTE, VIEW } from './config.js';
import { STATES, accuracy } from './world.js';

export function draftCardRects() {
  const w = 300;
  const h = 240;
  const gap = 28;
  const total = w * 3 + gap * 2;
  const x0 = (VIEW.width - total) / 2;
  const y = 268;
  return [0, 1, 2].map((i) => ({ x: x0 + i * (w + gap), y, w, h }));
}

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function drawBackground(ctx, world) {
  const sky = ctx.createLinearGradient(0, 0, 0, VIEW.height);
  sky.addColorStop(0, PALETTE.skyTop);
  sky.addColorStop(1, PALETTE.skyBottom);
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, VIEW.width, VIEW.height);

  for (const star of world.stars) {
    const a = 0.35 + 0.3 * Math.sin(world.time * 1.3 + star.tw);
    ctx.globalAlpha = a;
    ctx.fillStyle = '#cfd8ff';
    ctx.beginPath();
    ctx.arc(star.x, star.y, star.r, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;

  // Fireflies drift through the garden.
  for (const fly of world.fireflies) {
    const x = fly.x + Math.sin(world.time * 0.5 + fly.p) * 14;
    const y = fly.y + Math.cos(world.time * 0.7 + fly.p * 1.3) * 10;
    const glow = ctx.createRadialGradient(x, y, 0, x, y, 12);
    glow.addColorStop(0, 'rgba(255, 214, 120, 0.5)');
    glow.addColorStop(1, 'rgba(255, 214, 120, 0)');
    ctx.fillStyle = glow;
    ctx.beginPath();
    ctx.arc(x, y, 12, 0, Math.PI * 2);
    ctx.fill();
  }

  // The garden floor glows faintly around the lantern.
  const floor = ctx.createRadialGradient(CENTER.x, CENTER.y, 10, CENTER.x, CENTER.y, 320);
  floor.addColorStop(0, 'rgba(255, 157, 60, 0.10)');
  floor.addColorStop(1, 'rgba(255, 157, 60, 0)');
  ctx.fillStyle = floor;
  ctx.beginPath();
  ctx.arc(CENTER.x, CENTER.y, 320, 0, Math.PI * 2);
  ctx.fill();
}

function drawLantern(ctx, world) {
  const light = world.lanternLight / LANTERN.maxLight;
  const flicker = 1 + Math.sin(world.time * 7) * 0.03 + Math.sin(world.time * 13.7) * 0.02;
  const glowR = (90 + light * 190) * flicker;
  const glow = ctx.createRadialGradient(CENTER.x, CENTER.y, 8, CENTER.x, CENTER.y, glowR);
  glow.addColorStop(0, `rgba(255, 217, 122, ${0.55 * light + 0.1})`);
  glow.addColorStop(0.5, `rgba(255, 157, 60, ${0.22 * light + 0.04})`);
  glow.addColorStop(1, 'rgba(255, 157, 60, 0)');
  ctx.fillStyle = glow;
  ctx.beginPath();
  ctx.arc(CENTER.x, CENTER.y, glowR, 0, Math.PI * 2);
  ctx.fill();

  // Lantern body: a little paper lantern on a post.
  ctx.fillStyle = '#2a1f4d';
  ctx.fillRect(CENTER.x - 3, CENTER.y + 26, 6, 52);
  ctx.fillStyle = '#3d2b6b';
  ctx.beginPath();
  ctx.ellipse(CENTER.x, CENTER.y, LANTERN.radius, LANTERN.radius * 1.12, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = `rgba(255, 217, 122, ${0.35 + light * 0.6})`;
  ctx.beginPath();
  ctx.ellipse(CENTER.x, CENTER.y, LANTERN.radius * 0.72, LANTERN.radius * 0.86, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = 'rgba(20, 10, 40, 0.55)';
  ctx.lineWidth = 2;
  for (let i = -2; i <= 2; i += 1) {
    ctx.beginPath();
    ctx.ellipse(CENTER.x, CENTER.y + i * 14, LANTERN.radius * 0.86, 7, 0, 0, Math.PI);
    ctx.stroke();
  }
  // Flame.
  const flameH = (14 + light * 12) * flicker;
  ctx.fillStyle = '#fff3c4';
  ctx.beginPath();
  ctx.ellipse(CENTER.x, CENTER.y - 4, 7, flameH, 0, 0, Math.PI * 2);
  ctx.fill();
}

function drawPlayer(ctx, world) {
  const p = world.player;
  if (p.invulnTimer > 0 && Math.floor(world.time * 14) % 2 === 0) return;
  const flap = Math.sin(p.wingPhase) * 0.5;
  ctx.save();
  ctx.translate(p.x, p.y);
  ctx.rotate(p.angle);
  // Wings.
  ctx.fillStyle = 'rgba(127, 231, 210, 0.85)';
  ctx.beginPath();
  ctx.ellipse(0, -13 - flap * 5, 15, 7 + flap * 3, -0.5, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.ellipse(0, 13 + flap * 5, 15, 7 + flap * 3, 0.5, 0, Math.PI * 2);
  ctx.fill();
  // Body.
  const glow = ctx.createRadialGradient(0, 0, 0, 0, 0, p.radius + 10);
  glow.addColorStop(0, 'rgba(127, 231, 210, 0.5)');
  glow.addColorStop(1, 'rgba(127, 231, 210, 0)');
  ctx.fillStyle = glow;
  ctx.beginPath();
  ctx.arc(0, 0, p.radius + 10, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = PALETTE.player;
  ctx.beginPath();
  ctx.arc(0, 0, p.radius, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = PALETTE.playerCore;
  ctx.beginPath();
  ctx.arc(4, 0, 6, 0, Math.PI * 2);
  ctx.fill();
  // Aim tick.
  ctx.strokeStyle = 'rgba(234, 255, 248, 0.9)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(p.radius + 4, 0);
  ctx.lineTo(p.radius + 14, 0);
  ctx.stroke();
  ctx.restore();
}

function drawEnemy(ctx, enemy, time) {
  ctx.save();
  ctx.translate(enemy.x, enemy.y);
  if (enemy.flash > 0) {
    ctx.shadowColor = '#ffffff';
    ctx.shadowBlur = 18;
  } else {
    ctx.shadowColor = enemy.color;
    ctx.shadowBlur = 14;
  }
  ctx.fillStyle = enemy.flash > 0 ? '#ffffff' : enemy.color;
  const r = enemy.radius;
  if (enemy.kind === 'wisp') {
    ctx.beginPath();
    ctx.arc(0, 0, r, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(-r * 0.7, r * 0.4);
    ctx.quadraticCurveTo(-r * 0.4, r * 1.5 + Math.sin(time * 5 + enemy.wobble) * 4, 0, r * 1.1);
    ctx.quadraticCurveTo(r * 0.4, r * 1.5 - Math.sin(time * 5 + enemy.wobble) * 4, r * 0.7, r * 0.4);
    ctx.fill();
  } else if (enemy.kind === 'dart') {
    ctx.rotate(Math.atan2(enemy.vy, enemy.vx));
    ctx.beginPath();
    ctx.moveTo(r * 1.3, 0);
    ctx.lineTo(-r * 0.8, r * 0.8);
    ctx.lineTo(-r * 0.4, 0);
    ctx.lineTo(-r * 0.8, -r * 0.8);
    ctx.closePath();
    ctx.fill();
  } else if (enemy.kind === 'brute') {
    ctx.beginPath();
    for (let i = 0; i < 6; i += 1) {
      const a = (i / 6) * Math.PI * 2 + time * 0.2;
      const px = Math.cos(a) * r;
      const py = Math.sin(a) * r;
      if (i === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.closePath();
    ctx.fill();
    ctx.shadowBlur = 0;
    ctx.fillStyle = 'rgba(20, 5, 25, 0.8)';
    ctx.beginPath();
    ctx.arc(-r * 0.3, -r * 0.2, r * 0.16, 0, Math.PI * 2);
    ctx.arc(r * 0.3, -r * 0.2, r * 0.16, 0, Math.PI * 2);
    ctx.fill();
  } else {
    ctx.beginPath();
    ctx.arc(-r * 0.45, 0, r * 0.6, 0, Math.PI * 2);
    ctx.arc(r * 0.45, 0, r * 0.6, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();

  // Health bar for tough shades, and a gold ring for elites.
  if (enemy.maxHp > 1) {
    const w = enemy.radius * 2;
    ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
    ctx.fillRect(enemy.x - w / 2, enemy.y - enemy.radius - 12, w, 5);
    ctx.fillStyle = '#ff6b6b';
    ctx.fillRect(enemy.x - w / 2, enemy.y - enemy.radius - 12, w * (enemy.hp / enemy.maxHp), 5);
  }
  if (enemy.elite) {
    ctx.strokeStyle = PALETTE.elite;
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.arc(enemy.x, enemy.y, enemy.radius + 6, 0, Math.PI * 2);
    ctx.stroke();
  }
}

function drawBullets(ctx, world) {
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  for (const b of world.bullets) {
    const grad = ctx.createRadialGradient(b.x, b.y, 0, b.x, b.y, 14);
    grad.addColorStop(0, 'rgba(255, 233, 168, 0.95)');
    grad.addColorStop(1, 'rgba(255, 233, 168, 0)');
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(b.x, b.y, 14, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#fff7dd';
    ctx.beginPath();
    ctx.arc(b.x, b.y, b.radius, 0, Math.PI * 2);
    ctx.fill();
  }
  // Orbiting sparks.
  const p = world.player;
  if (p.orbiters > 0) {
    for (let i = 0; i < p.orbiters; i += 1) {
      const a = p.orbiterAngle + (i * Math.PI * 2) / p.orbiters;
      const ox = p.x + Math.cos(a) * 52;
      const oy = p.y + Math.sin(a) * 52;
      ctx.fillStyle = '#ffe9a8';
      ctx.beginPath();
      ctx.arc(ox, oy, 7, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  ctx.restore();
}

function drawParticles(ctx, world) {
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  for (const part of world.particles) {
    const a = Math.max(0, part.life / part.maxLife);
    ctx.globalAlpha = a;
    ctx.fillStyle = part.color;
    ctx.beginPath();
    ctx.arc(part.x, part.y, part.size * a + 0.5, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
  ctx.globalAlpha = 1;
  ctx.font = '700 16px system-ui, sans-serif';
  ctx.textAlign = 'center';
  for (const t of world.texts) {
    ctx.globalAlpha = Math.max(0, t.life / t.maxLife);
    ctx.fillStyle = t.color;
    ctx.fillText(t.text, t.x, t.y);
  }
  ctx.globalAlpha = 1;
}

function drawHud(ctx, world) {
  ctx.save();
  ctx.textBaseline = 'top';
  // Score, left.
  ctx.textAlign = 'left';
  ctx.fillStyle = PALETTE.text;
  ctx.font = '700 26px system-ui, sans-serif';
  ctx.fillText(`Score ${world.score}`, 24, 18);
  ctx.font = '600 15px system-ui, sans-serif';
  ctx.fillStyle = PALETTE.textDim;
  ctx.fillText(`Best ${world.best}`, 24, 50);
  if (world.combo > 1.05) {
    ctx.fillStyle = '#ffd23c';
    ctx.font = '700 20px system-ui, sans-serif';
    ctx.fillText(`Combo x${world.combo.toFixed(2)}`, 24, 74);
  }
  // Wave, centre.
  ctx.textAlign = 'center';
  ctx.fillStyle = PALETTE.text;
  ctx.font = '700 26px system-ui, sans-serif';
  ctx.fillText(`Wave ${world.wave}`, VIEW.width / 2, 18);
  const left = world.spawnQueue.length + world.enemies.length;
  ctx.font = '600 15px system-ui, sans-serif';
  ctx.fillStyle = PALETTE.textDim;
  ctx.fillText(`${left} shades remain`, VIEW.width / 2, 50);
  // Lantern light, right.
  ctx.textAlign = 'right';
  ctx.fillStyle = PALETTE.text;
  ctx.font = '700 20px system-ui, sans-serif';
  ctx.fillText('Lantern light', VIEW.width - 24, 18);
  const bw = 190;
  const bx = VIEW.width - 24 - bw;
  ctx.fillStyle = 'rgba(0, 0, 0, 0.55)';
  roundRect(ctx, bx, 44, bw, 14, 7);
  ctx.fill();
  const lightFrac = world.lanternLight / LANTERN.maxLight;
  ctx.fillStyle = lightFrac > 0.35 ? '#ffb347' : '#ff6b6b';
  if (lightFrac > 0) {
    roundRect(ctx, bx, 44, bw * lightFrac, 14, 7);
    ctx.fill();
  }
  // Moth hearts.
  ctx.font = '20px system-ui, sans-serif';
  let hearts = '';
  for (let i = 0; i < world.player.hp; i += 1) hearts += '♥ ';
  ctx.fillStyle = '#ff8fa3';
  ctx.fillText(hearts, VIEW.width - 24, 66);
  ctx.restore();

  if (world.waveBanner > 0) {
    ctx.save();
    ctx.globalAlpha = Math.min(1, world.waveBanner);
    ctx.textAlign = 'center';
    ctx.fillStyle = PALETTE.text;
    ctx.font = '700 54px Georgia, serif';
    ctx.fillText(world.waveBannerText, VIEW.width / 2, 240);
    ctx.restore();
  }
}

function dim(ctx, alpha) {
  ctx.fillStyle = `rgba(5, 3, 18, ${alpha})`;
  ctx.fillRect(0, 0, VIEW.width, VIEW.height);
}

function drawTitle(ctx, world) {
  dim(ctx, 0.45);
  ctx.save();
  ctx.textAlign = 'center';
  ctx.fillStyle = PALETTE.lanternCore;
  ctx.font = '700 88px Georgia, serif';
  ctx.fillText('Lanternkeep', VIEW.width / 2, 150);
  ctx.fillStyle = PALETTE.text;
  ctx.font = 'italic 26px Georgia, serif';
  ctx.fillText('Keep the last light alive.', VIEW.width / 2, 252);
  ctx.font = '600 19px system-ui, sans-serif';
  ctx.fillStyle = PALETTE.textDim;
  ctx.fillText('Shades drift in from the dark to drink the lantern. You are the moth-warden:', VIEW.width / 2, 320);
  ctx.fillText('WASD or arrows to fly · mouse to aim · hold click or Space to shoot', VIEW.width / 2, 350);
  ctx.fillText('Between waves, choose one blessing. Survive 10 waves and dawn breaks.', VIEW.width / 2, 380);
  ctx.fillStyle = PALETTE.text;
  ctx.font = '700 24px system-ui, sans-serif';
  const blink = 0.65 + 0.35 * Math.sin(world.time * 3);
  ctx.globalAlpha = blink;
  ctx.fillText('Click or press Enter to start', VIEW.width / 2, 450);
  ctx.globalAlpha = 1;
  ctx.font = '600 17px system-ui, sans-serif';
  ctx.fillStyle = PALETTE.textDim;
  ctx.fillText(`Best score ${world.best} · P pauses · M mutes`, VIEW.width / 2, 500);
  ctx.restore();
}

function drawDraft(ctx, world, mouse) {
  dim(ctx, 0.55);
  ctx.save();
  ctx.textAlign = 'center';
  ctx.fillStyle = PALETTE.text;
  ctx.font = '700 44px Georgia, serif';
  ctx.fillText(`Wave ${world.wave} cleared`, VIEW.width / 2, 130);
  ctx.font = '600 20px system-ui, sans-serif';
  ctx.fillStyle = PALETTE.textDim;
  ctx.fillText('Choose one blessing — click a card, or press 1, 2 or 3.', VIEW.width / 2, 196);
  const rects = draftCardRects();
  world.draftChoices.forEach((choice, i) => {
    const r = rects[i];
    const hover = world.draftHover === i;
    ctx.fillStyle = hover ? '#2a1d5e' : PALETTE.cardBack;
    roundRect(ctx, r.x, r.y, r.w, r.h, 16);
    ctx.fill();
    ctx.strokeStyle = hover ? '#ffd97a' : PALETTE.cardEdge;
    ctx.lineWidth = hover ? 3 : 2;
    roundRect(ctx, r.x, r.y, r.w, r.h, 16);
    ctx.stroke();
    ctx.fillStyle = '#ffd97a';
    ctx.font = '700 15px system-ui, sans-serif';
    ctx.fillText(`[ ${i + 1} ]`, r.x + r.w / 2, r.y + 30);
    ctx.fillStyle = PALETTE.text;
    ctx.font = '700 26px Georgia, serif';
    ctx.fillText(choice.name, r.x + r.w / 2, r.y + 76);
    ctx.fillStyle = PALETTE.textDim;
    ctx.font = '600 18px system-ui, sans-serif';
    const words = choice.text.split(' ');
    let line = '';
    let ly = r.y + 128;
    for (const word of words) {
      if ((line + word).length > 22) {
        ctx.fillText(line.trim(), r.x + r.w / 2, ly);
        ly += 26;
        line = '';
      }
      line += `${word} `;
    }
    if (line.trim()) ctx.fillText(line.trim(), r.x + r.w / 2, ly);
  });
  ctx.restore();
}

function drawPaused(ctx) {
  dim(ctx, 0.55);
  ctx.save();
  ctx.textAlign = 'center';
  ctx.fillStyle = PALETTE.text;
  ctx.font = '700 56px Georgia, serif';
  ctx.fillText('Paused', VIEW.width / 2, 300);
  ctx.font = '600 20px system-ui, sans-serif';
  ctx.fillStyle = PALETTE.textDim;
  ctx.fillText('Press P or Esc to keep flying', VIEW.width / 2, 380);
  ctx.restore();
}

function drawOver(ctx, world) {
  dim(ctx, 0.6);
  ctx.save();
  ctx.textAlign = 'center';
  ctx.fillStyle = '#ff8fa3';
  ctx.font = '700 64px Georgia, serif';
  ctx.fillText('The light went out', VIEW.width / 2, 170);
  if (world.newBest) {
    ctx.fillStyle = '#ffd23c';
    ctx.font = '700 26px system-ui, sans-serif';
    ctx.fillText('New best score!', VIEW.width / 2, 240);
  }
  ctx.fillStyle = PALETTE.text;
  ctx.font = '700 30px system-ui, sans-serif';
  ctx.fillText(`Score ${world.score}   ·   Wave ${world.wave}   ·   ${world.kills} shades banished`, VIEW.width / 2, 300);
  ctx.font = '600 19px system-ui, sans-serif';
  ctx.fillStyle = PALETTE.textDim;
  ctx.fillText(`Best ${world.best} · Accuracy ${accuracy(world)}%`, VIEW.width / 2, 344);
  ctx.fillStyle = PALETTE.text;
  ctx.font = '700 24px system-ui, sans-serif';
  const blink = 0.65 + 0.35 * Math.sin(world.time * 3);
  ctx.globalAlpha = blink;
  ctx.fillText('Press R or click to play again', VIEW.width / 2, 420);
  ctx.globalAlpha = 1;
  ctx.restore();
}

function drawDawn(ctx, world) {
  dim(ctx, 0.5);
  ctx.save();
  ctx.textAlign = 'center';
  ctx.fillStyle = '#ffe9a8';
  ctx.font = '700 64px Georgia, serif';
  ctx.fillText('Dawn breaks', VIEW.width / 2, 170);
  ctx.fillStyle = PALETTE.text;
  ctx.font = 'italic 24px Georgia, serif';
  ctx.fillText('Ten waves held. The lantern burns on into the morning.', VIEW.width / 2, 236);
  ctx.font = '700 30px system-ui, sans-serif';
  ctx.fillText(`Score ${world.score}   ·   ${world.kills} shades banished`, VIEW.width / 2, 300);
  ctx.font = '600 19px system-ui, sans-serif';
  ctx.fillStyle = PALETTE.textDim;
  ctx.fillText(`Best ${world.best} · Accuracy ${accuracy(world)}%`, VIEW.width / 2, 344);
  ctx.fillStyle = PALETTE.text;
  ctx.font = '700 24px system-ui, sans-serif';
  const blink = 0.65 + 0.35 * Math.sin(world.time * 3);
  ctx.globalAlpha = blink;
  ctx.fillText('C — keep flying into the endless night · R — play again', VIEW.width / 2, 420);
  ctx.globalAlpha = 1;
  ctx.restore();
}

export function render(ctx, world, input) {
  ctx.save();
  if (world.shake > 0.3) {
    const s = world.shake;
    ctx.translate((Math.random() - 0.5) * s, (Math.random() - 0.5) * s);
  }
  drawBackground(ctx, world);
  drawLantern(ctx, world);
  for (const enemy of world.enemies) drawEnemy(ctx, enemy, world.time);
  drawBullets(ctx, world);
  if (world.state !== STATES.TITLE) drawPlayer(ctx, world);
  drawParticles(ctx, world);

  if (world.state === STATES.PLAYING || world.state === STATES.PAUSED || world.state === STATES.DRAFT) {
    drawHud(ctx, world);
  }
  if (world.state === STATES.TITLE) drawTitle(ctx, world);
  if (world.state === STATES.DRAFT) drawDraft(ctx, world, input.mouse);
  if (world.state === STATES.PAUSED) drawPaused(ctx);
  if (world.state === STATES.OVER) drawOver(ctx, world);
  if (world.state === STATES.DAWN) drawDawn(ctx, world);

  if (world.flashRed > 0) {
    ctx.fillStyle = `rgba(255, 40, 40, ${Math.min(0.22, world.flashRed * 0.4)})`;
    ctx.fillRect(0, 0, VIEW.width, VIEW.height);
  }
  // Vignette.
  const vig = ctx.createRadialGradient(640, 360, 320, 640, 360, 720);
  vig.addColorStop(0, 'rgba(0, 0, 0, 0)');
  vig.addColorStop(1, 'rgba(0, 0, 0, 0.35)');
  ctx.fillStyle = vig;
  ctx.fillRect(0, 0, VIEW.width, VIEW.height);
  ctx.restore();
}
