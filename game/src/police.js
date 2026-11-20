// The wanted system and the Solmar Bay Police Department.
// Stars rise when Rio is seen committing crimes, fall when he stays clean and out
// of sight, and police interceptors spawn, chase, ram and — if they pin him down
// on foot — bust him.

import { WANTED, POLICE_MAX, CITY } from './config.js';
import { makeCar } from './vehicles.js';

export function addWanted(state, stars, reason) {
  if (state.player.wanted >= WANTED.max) return;
  state.player.wanted = Math.min(WANTED.max, state.player.wanted + stars);
  state.player.lastCrimeAt = state.time;
  state.player.lastCrimeReason = reason;
  state.events.push({ type: 'wanted', stars: state.player.wanted, reason });
}

export function spawnPolice(state, rng) {
  const count = Math.min(state.player.wanted, POLICE_MAX);
  while (state.police.length < count) {
    const angle = rng() * Math.PI * 2;
    const dist = 55 + rng() * 25;
    const car = makeCar(
      `police-${state.police.length}-${Math.floor(state.time)}`,
      state.player.x + Math.sin(angle) * dist,
      state.player.z + Math.cos(angle) * dist,
      0, 0xf2f2f2, 'police',
    );
    car.police = true;
    car.speed = 0;
    car.bustedTimer = 0;
    state.police.push(car);
  }
}

export function updateWanted(state, dt) {
  const p = state.player;
  if (p.wanted > 0 && state.time - p.lastCrimeAt > WANTED.decaySeconds) {
    p.wanted -= 1;
    p.lastCrimeAt = state.time;
    state.events.push({ type: 'wanted', stars: p.wanted, reason: 'cooled off' });
  }
  if (p.wanted === 0 && state.police.length > 0) {
    // The heat is off: cruisers peel away one by one.
    state.police = state.police.filter((car) => {
      const dx = car.x - p.x;
      const dz = car.z - p.z;
      return dx * dx + dz * dz < 900;
    });
  }
}

export function updatePolice(state, dt, city) {
  const p = state.player;
  for (const cop of state.police) {
    const dx = p.x - cop.x;
    const dz = p.z - cop.z;
    const dist = Math.hypot(dx, dz) || 1;
    const wantAngle = Math.atan2(dx, dz);
    let diff = wantAngle - cop.angle;
    while (diff > Math.PI) diff -= Math.PI * 2;
    while (diff < -Math.PI) diff += Math.PI * 2;
    cop.angle += Math.max(-2.4 * dt, Math.min(2.4 * dt, diff));
    const targetSpeed = Math.min(34 + p.wanted * 3, dist > 60 ? 40 : 26);
    cop.speed += (targetSpeed - cop.speed) * Math.min(1, 1.4 * dt);
    cop.x += Math.sin(cop.angle) * cop.speed * dt;
    cop.z += Math.cos(cop.angle) * cop.speed * dt;
    cop.x = Math.max(-CITY.half, Math.min(CITY.half, cop.x));
    cop.z = Math.max(-CITY.half, Math.min(CITY.seaZ - 4, cop.z));
    // Ram the player: damage on foot, a hard shove in a car — but at most once
    // every 1.5 s per cruiser, so a cop glued to the bumper can't drain all speed.
    if (dist < 3.6) {
      if (p.car) {
        if (state.time - (cop.lastRam || -99) > 1.5) {
          cop.lastRam = state.time;
          p.car.speed *= 0.6;
          state.events.push({ type: 'rammed', by: 'police' });
        }
      } else {
        cop.bustedTimer += dt;
        if (cop.bustedTimer > WANTED.bustedSeconds) {
          state.mode = 'busted';
          state.events.push({ type: 'busted' });
        }
      }
    } else {
      cop.bustedTimer = Math.max(0, cop.bustedTimer - dt);
    }
    // Flash the light bar.
    if (cop.mesh && cop.mesh.userData.lightRed) {
      const on = Math.floor(state.time * 6) % 2 === 0;
      cop.mesh.userData.lightRed.material.emissive.setHex(on ? 0xff0000 : 0x220000);
      cop.mesh.userData.lightBlue.material.emissive.setHex(on ? 0x000022 : 0x0000ff);
    }
  }
}
