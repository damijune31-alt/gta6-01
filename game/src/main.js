// Boot and the one loop for SOLMAR HEAT: input is read every frame, the world
// advances in fixed 1/60 s steps (several in a slow frame, none in a fast one),
// the renderer paints what is there and the HUD is updated from the state.
// The game moves between title, play, paused, busted and story-complete screens.
//
// ?seed=N fixes the city and traffic. ?shot=chase|city|mission|drive (with
// &seed=N) stages that scene instead of running the loop, paints it three times
// and sets window.__shotReady for a screenshot.

import { STEP } from './config.js';
import { createWorld } from './world.js';
import { createRenderer } from './render.js';
import { ACTION_CONFIRM, ACTION_PAUSE, createInput } from './input.js';
import { createAudio } from './audio.js';
import { buildHud, updateHud, showBanner, showToast } from './hud.js';
import { loadSave, writeSave, clearSave } from './save.js';
import { stageShot } from './shots.js';

/** The longest frame the loop catches up on; a longer stall is dropped, not replayed. */
const MAX_FRAME = 0.25;

const params = new URLSearchParams(window.location.search);
const shot = params.get('shot');
const seedParam = Number.parseInt(params.get('seed') ?? '', 10);
const seed = Number.isInteger(seedParam) ? seedParam : 20261121;

const canvas = document.getElementById('game');
const status = document.getElementById('status');
const hud = buildHud();
const audio = createAudio();
const world = createWorld(seed);
const renderer = createRenderer(canvas, world.state);
const saved = loadSave();

const screens = {
  start: document.getElementById('screen-start'),
  pause: document.getElementById('screen-pause'),
  busted: document.getElementById('screen-busted'),
  complete: document.getElementById('screen-complete'),
};

function showScreen(name) {
  for (const [key, el] of Object.entries(screens)) el.classList.toggle('hidden', key !== name);
  if (!name) for (const el of Object.values(screens)) el.classList.add('hidden');
}

function announce(message) {
  status.textContent = message;
}

function saveProgress() {
  const p = world.state.player;
  writeSave({ cash: p.cash, missionIndex: p.missionIndex, completed: p.completed, bestChase: world.state.chaseBest });
}

function drainEvents() {
  const events = world.state.events.splice(0, world.state.events.length);
  for (const event of events) {
    if (event.type === 'mission') {
      showBanner(hud, `<b>${event.name}</b><span>${event.brief}</span>`, 4.5);
      announce(`${event.name}. ${event.brief}`);
    } else if (event.type === 'mission-complete') {
      showBanner(hud, `<b>${event.name} — COMPLETE</b><span>+$${event.reward} · progress saved</span>`, 4);
      audio.cash();
      saveProgress();
    } else if (event.type === 'mission-failed') {
      showToast(hud, event.reason);
    } else if (event.type === 'steal') {
      showToast(hud, 'Car stolen — the cops saw that. ★');
      audio.pickup();
    } else if (event.type === 'shoot') {
      audio.gunshot();
    } else if (event.type === 'hit-ped') {
      showToast(hud, 'Pedestrian hit — wanted level up!');
    } else if (event.type === 'hit-police') {
      showToast(hud, 'You shot at the police!');
    } else if (event.type === 'hit-rival') {
      showToast(hud, 'Rival courier tagged — keep on him!');
    } else if (event.type === 'enter-car') {
      audio.click();
    } else if (event.type === 'rammed') {
      audio.crash();
    } else if (event.type === 'busted') {
      audio.busted();
      world.state.mode = 'busted';
      showScreen('busted');
      announce('Busted. The Solmar Bay PD caught Rio.');
    } else if (event.type === 'story-complete') {
      saveProgress();
      world.state.mode = 'complete';
      showScreen('complete');
      announce('Story complete. Solmar Bay is yours.');
    }
  }
}

function startGame(useSave) {
  audio.resume();
  world.reset(useSave ? saved : null);
  world.state.mode = 'play';
  showScreen(null);
  announce('Playing. Follow the yellow waypoint.');
}

function runShot(name) {
  const staged = stageShot(name, world);
  world.state.mode = 'play';
  showScreen(null);
  // The chase camera eases toward the player; run enough frames up front so
  // the first painted frame already sits behind the car, not at the origin.
  for (let i = 0; i < 48; i++) renderer.draw(STEP);
  let painted = 0;
  function paint() {
    renderer.draw(STEP);
    updateHud(hud, world.state, STEP);
    painted += 1;
    if (painted < 3) requestAnimationFrame(paint);
    else window.__shotReady = true;
  }
  requestAnimationFrame(paint);
  return staged;
}

function runGame() {
  const input = createInput(canvas);
  let accumulator = 0;
  let last = performance.now();
  const continueBtn = document.getElementById('btn-continue');
  if (!saved) continueBtn.style.display = 'none';
  showScreen('start');
  announce('Solmar Heat. Press Start Engine to play.');

  document.getElementById('btn-start').addEventListener('click', () => startGame(false));
  continueBtn.addEventListener('click', () => startGame(true));
  document.getElementById('btn-resume').addEventListener('click', () => {
    world.state.mode = 'play';
    showScreen(null);
  });
  document.getElementById('btn-save').addEventListener('click', () => {
    saveProgress();
    showToast(hud, 'Game saved.');
  });
  document.getElementById('btn-restart').addEventListener('click', () => {
    clearSave();
    startGame(false);
  });
  document.getElementById('btn-bail').addEventListener('click', () => {
    const p = world.state.player;
    p.cash = Math.max(0, p.cash - 200);
    p.health = 100;
    p.wanted = 0;
    p.lastCrimeAt = world.state.time;
    world.state.police = [];
    p.x = -150;
    p.z = -150;
    if (p.car) { p.car.parked = true; p.car = null; }
    world.state.mode = 'play';
    showScreen(null);
    showToast(hud, 'Bail posted. Lay low for a while.');
  });
  document.getElementById('btn-freeroam').addEventListener('click', () => {
    world.state.mode = 'play';
    showScreen(null);
  });

  function frame(now) {
    requestAnimationFrame(frame);
    accumulator += Math.min((now - last) / 1000, MAX_FRAME);
    last = now;
    const actions = input.takeActions();
    if (actions & ACTION_CONFIRM && world.state.mode === 'title') startGame(false);
    if (actions & ACTION_PAUSE) {
      if (world.state.mode === 'play') {
        world.state.mode = 'paused';
        showScreen('pause');
        announce('Paused.');
      } else if (world.state.mode === 'paused') {
        world.state.mode = 'play';
        showScreen(null);
      }
    }
    if (world.state.mode === 'play') {
      let firstStep = true;
      while (accumulator >= STEP) {
        // The frame's one-shot actions go to the first step only, so E / F
        // fire exactly once no matter how many steps this frame runs.
        world.step(STEP, input, audio, firstStep ? actions : 0);
        firstStep = false;
        accumulator -= STEP;
      }
      drainEvents();
    } else if (world.state.mode === 'title') {
      while (accumulator >= STEP) {
        world.step(STEP, null, null);
        accumulator -= STEP;
      }
    } else {
      accumulator = 0;
    }
    renderer.draw(STEP);
    updateHud(hud, world.state, STEP);
  }

  document.addEventListener('visibilitychange', () => {
    if (document.hidden && world.state.mode === 'play') {
      world.state.mode = 'paused';
      showScreen('pause');
    }
  });

  requestAnimationFrame(frame);
}

if (shot) runShot(shot);
else runGame();
