// The rules and state of SOLMAR HEAT, with no drawing and no browser in it:
// Rio on foot or in a car, traffic, pedestrians, the wanted level, the police,
// the rival courier, the three missions and the shoot / steal / crash rules.
// step() advances one fixed step; main.js drains state.events for sound and HUD.

import { CITY, COMBAT, MISSIONS, PLAYER, STEP, WANTED } from './config.js';
import { mulberry32 } from './city.js';
import { spawnParkedCars, spawnTraffic, updateTraffic, driveCar, nearestCar } from './vehicles.js';
import { spawnPedestrians, updatePedestrians, walkPlayer } from './people.js';
import { addWanted, spawnPolice, updateWanted, updatePolice } from './police.js';
import { startMission, updateMission, currentMission } from './missions.js';

export function createWorld(seed) {
  const rng = mulberry32(seed);
  const state = {
    time: 0,
    seed,
    mode: 'title',
    city: null,
    player: {
      x: 0, z: 20, heading: 0, health: PLAYER.health, cash: PLAYER.startCash,
      wanted: 0, lastCrimeAt: -999, lastCrimeReason: '',
      car: null, missionIndex: 0, completed: 0,
    },
    cars: [],
    traffic: [],
    police: [],
    peds: [],
    rival: { x: 120, z: -60, angle: 0, speed: 16, active: false, mesh: null },
    mission: null,
    events: [],
    cameraYaw: 0,
    shootCooldown: 0,
    muzzleUntil: 0,
    chaseBest: 0,
  };

  function populate() {
    state.cars = [...spawnParkedCars(rng)];
    state.traffic = spawnTraffic(rng, 11);
    state.cars.push(...state.traffic);
    state.peds = spawnPedestrians(rng, 16);
    state.police = [];
  }

  function reset(save) {
    state.time = 0;
    state.mode = 'title';
    state.player.x = 0;
    state.player.z = 20;
    state.player.heading = 0;
    state.player.health = PLAYER.health;
    state.player.cash = save ? save.cash : PLAYER.startCash;
    state.player.wanted = 0;
    state.player.lastCrimeAt = -999;
    state.player.car = null;
    state.player.missionIndex = save ? Math.min(save.missionIndex, MISSIONS.length - 1) : 0;
    state.player.completed = save ? save.completed : 0;
    state.rival.active = false;
    state.mission = null;
    state.events = [];
    state.cameraYaw = 0;
    populate();
    startMission(state, state.player.missionIndex);
  }

  function enterOrExitCar() {
    const p = state.player;
    if (p.car) {
      // Step out beside the car; it stays parked where it stopped.
      const car = p.car;
      car.parked = true;
      car.speed = 0;
      p.x = car.x + Math.cos(car.angle) * 3;
      p.z = car.z - Math.sin(car.angle) * 3;
      p.heading = car.angle;
      p.car = null;
      state.events.push({ type: 'exit-car' });
      return;
    }
    const car = nearestCar(state.cars, p.x, p.z, 5);
    if (!car) return;
    if (car.kind !== 'sedan' || car.id !== 'parked-0') {
      addWanted(state, WANTED.stealCar, 'stole a car');
      state.events.push({ type: 'steal', car: car.kind });
    }
    car.parked = false;
    car.speed = 0;
    p.car = car;
    p.heading = car.angle;
    state.cameraYaw = car.angle;
    state.events.push({ type: 'enter-car', car: car.kind });
  }

  function shoot() {
    const p = state.player;
    if (state.shootCooldown > 0) return;
    state.shootCooldown = COMBAT.cooldown;
    state.muzzleUntil = state.time + COMBAT.muzzleMs / 1000;
    addWanted(state, WANTED.shoot, 'fired a pistol');
    state.events.push({ type: 'shoot' });
    // Hitscan: the nearest person or car roughly ahead of the camera, in range.
    const fx = Math.sin(state.cameraYaw);
    const fz = Math.cos(state.cameraYaw);
    const targets = [];
    for (const ped of state.peds) targets.push({ x: ped.x, z: ped.z, kind: 'ped', ref: ped });
    for (const cop of state.police) targets.push({ x: cop.x, z: cop.z, kind: 'police', ref: cop });
    targets.push({ x: state.rival.x, z: state.rival.z, kind: 'rival', ref: state.rival });
    let best = null;
    let bestScore = Infinity;
    for (const t of targets) {
      const dx = t.x - p.x;
      const dz = t.z - p.z;
      const dist = Math.hypot(dx, dz);
      if (dist > COMBAT.range || dist < 1) continue;
      const dot = (dx * fx + dz * fz) / dist;
      if (dot < 0.82) continue;
      const score = dist + (1 - dot) * 40;
      if (score < bestScore) { bestScore = score; best = t; }
    }
    if (!best) return;
    if (best.kind === 'ped') {
      const ped = best.ref;
      ped.x = -190 + rng() * 380;
      ped.z = -190 + rng() * 380;
      ped.panic = 3;
      addWanted(state, WANTED.hitPedestrian, 'hit a pedestrian');
      state.events.push({ type: 'hit-ped' });
    } else if (best.kind === 'police') {
      best.ref.speed = Math.max(best.ref.speed, 30);
      addWanted(state, WANTED.ramPolice, 'shot at police');
      state.events.push({ type: 'hit-police' });
    } else if (best.kind === 'rival' && state.rival.active) {
      state.rival.speed = Math.max(6, state.rival.speed - 8);
      state.events.push({ type: 'hit-rival' });
    }
  }

  function hitPedestrianCheck() {
    const p = state.player;
    const speed = p.car ? Math.abs(p.car.speed) : 0;
    if (speed < 4) return;
    for (const ped of state.peds) {
      const dx = ped.x - p.x;
      const dz = ped.z - p.z;
      if (dx * dx + dz * dz < 7) {
        ped.x = -190 + rng() * 380;
        ped.z = -190 + rng() * 380;
        ped.panic = 3;
        addWanted(state, WANTED.hitPedestrian, 'ran over a pedestrian');
        state.events.push({ type: 'hit-ped' });
        if (p.car) p.car.speed *= 0.6;
        break;
      }
    }
  }

  function updateRival(dt) {
    const r = state.rival;
    if (!r.active) return;
    // The rival flees from Rio along the avenues, turning at the city edge.
    const dx = r.x - state.player.x;
    const dz = r.z - state.player.z;
    const dist = Math.hypot(dx, dz) || 1;
    const fleeAngle = Math.atan2(dx / dist, dz / dist);
    let diff = fleeAngle - r.angle;
    while (diff > Math.PI) diff -= Math.PI * 2;
    while (diff < -Math.PI) diff += Math.PI * 2;
    r.angle += Math.max(-1.8 * dt, Math.min(1.8 * dt, diff));
    r.speed = dist < 30 ? 24 : 17;
    r.x += Math.sin(r.angle) * r.speed * dt;
    r.z += Math.cos(r.angle) * r.speed * dt;
    r.x = Math.max(-CITY.half + 10, Math.min(CITY.half - 10, r.x));
    r.z = Math.max(-CITY.half + 10, Math.min(CITY.seaZ - 20, r.z));
  }

  /** One fixed step. `input` may be null in staged screenshot scenes. When the
   * caller already took the frame's one-shot actions, pass them as `actionsTaken`
   * (only on the first step of the frame); otherwise step() takes them itself. */
  function step(dt, input, audio, actionsTaken) {
    state.time += dt;
    if (state.shootCooldown > 0) state.shootCooldown -= dt;
    const p = state.player;
    if (input) {
      state.cameraYaw += input.takeDrag() * 0.004;
      const actions = actionsTaken !== undefined ? actionsTaken : input.takeActions();
      // Bit flags are defined in input.js; keep the numbers local to avoid a cycle.
      if (actions & 4) enterOrExitCar(); // ACTION_ENTER_CAR
      if (actions & 8) shoot(); // ACTION_SHOOT
    }
    if (p.car) {
      const crashed = driveCar(p.car, input, dt, state.city, state.cars);
      if (crashed && audio) audio.crash();
      p.x = p.car.x;
      p.z = p.car.z;
      p.heading = p.car.angle;
      state.cameraYaw += (p.car.angle - state.cameraYaw) * Math.min(1, 2.2 * dt);
    } else if (input) {
      walkPlayer(p, input, dt, state.city, state.cameraYaw);
    }
    // Traffic, pedestrians, police and the rival all move every step.
    updateTraffic(dt, state.city, state.traffic, p);
    updatePedestrians(dt, state.city, state.peds, p, state.cars);
    hitPedestrianCheck();
    updateRival(dt);
    updateWanted(state, dt);
    if (p.wanted > 0) spawnPolice(state, rng);
    updatePolice(state, dt, state.city);
    updateMission(state, dt);
    if (audio) {
      audio.engine(p.car ? Math.abs(p.car.speed) / 46 : 0, !!p.car);
      audio.siren(p.wanted, dt);
    }
    if (p.wanted > 0) state.chaseBest = Math.max(state.chaseBest, p.wanted);
  }

  reset(null);
  return { state, reset, step, enterOrExitCar, shoot, currentMission: () => currentMission(state) };
}
