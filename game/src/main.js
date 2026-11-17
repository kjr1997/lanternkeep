// Lanternkeep bootstrap: the loop, the state changes and the screenshot
// mode. The game itself lives in world.js, entities.js and render.js.

import { VIEW } from './config.js';
import { createAudio } from './audio.js';
import { createInput } from './input.js';
import { draftCardRects, render } from './render.js';
import { applyShot } from './shots.js';
import { loadMuted, saveMuted } from './storage.js';
import {
  STATES, chooseUpgrade, createWorld, seedScenery, startGame, updateWorld,
} from './world.js';

const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
const input = createInput(canvas);
const audio = createAudio();
audio.setMuted(loadMuted());

const params = new URLSearchParams(window.location.search);
const shot = params.get('shot');
const seed = Number(params.get('seed') || '1');

const world = createWorld(seed * 7919 + 13);
seedScenery(world);

let shotReady = false;

function unlockAudio() {
  audio.unlock();
  audio.startMusic();
}

function cardAt(mouse) {
  const rects = draftCardRects();
  for (let i = 0; i < rects.length; i += 1) {
    const r = rects[i];
    if (mouse.x >= r.x && mouse.x <= r.x + r.w && mouse.y >= r.y && mouse.y <= r.y + r.h) return i;
  }
  return -1;
}

function handleTransitions() {
  if (input.wasPressed('KeyM')) {
    const muted = !audio.isMuted();
    audio.setMuted(muted);
    saveMuted(muted);
  }
  if (input.mouse.clicked) unlockAudio();
  if (input.wasPressed('Enter') || input.wasPressed('Space')) unlockAudio();

  if (world.state === STATES.TITLE) {
    if (input.wasPressed('Enter') || input.mouse.clicked) {
      unlockAudio();
      audio.click();
      startGame(world);
    }
    return;
  }
  if (world.state === STATES.PLAYING) {
    if (input.wasPressed('KeyP') || input.wasPressed('Escape')) {
      world.prevState = STATES.PLAYING;
      world.state = STATES.PAUSED;
      audio.click();
    }
    return;
  }
  if (world.state === STATES.PAUSED) {
    if (input.wasPressed('KeyP') || input.wasPressed('Escape') || input.mouse.clicked) {
      world.state = STATES.PLAYING;
      audio.click();
    }
    return;
  }
  if (world.state === STATES.DRAFT) {
    world.draftHover = cardAt(input.mouse);
    if (input.wasPressed('Digit1')) chooseUpgrade(world, 0, audio);
    else if (input.wasPressed('Digit2')) chooseUpgrade(world, 1, audio);
    else if (input.wasPressed('Digit3')) chooseUpgrade(world, 2, audio);
    else if (input.mouse.clicked) {
      const index = cardAt(input.mouse);
      if (index >= 0) chooseUpgrade(world, index, audio);
    }
    return;
  }
  if (world.state === STATES.OVER) {
    if (input.wasPressed('KeyR') || input.mouse.clicked) {
      unlockAudio();
      audio.click();
      startGame(world);
    }
    return;
  }
  if (world.state === STATES.DAWN) {
    if (input.wasPressed('KeyC')) {
      world.endless = true;
      world.state = STATES.PLAYING;
      audio.click();
    } else if (input.wasPressed('KeyR') || input.mouse.clicked) {
      unlockAudio();
      audio.click();
      startGame(world);
    }
  }
}

if (shot) {
  // Screenshot mode: one fixed scene, no input, no clock.
  applyShot(world, shot, seed);
  render(ctx, world, input);
  window.__shotReady = true;
  shotReady = true;
} else {
  let last = performance.now();
  const frame = (now) => {
    const dt = Math.min(1 / 30, Math.max(0, (now - last) / 1000));
    last = now;
    handleTransitions();
    updateWorld(world, dt, input, audio);
    render(ctx, world, input);
    input.endFrame();
    if (!shotReady) {
      shotReady = true;
      window.__shotReady = true;
    }
    requestAnimationFrame(frame);
  };
  requestAnimationFrame(frame);
}
