// People for SOLMAR HEAT: Rio on foot, and the pedestrians who fill the sidewalks.
// Pedestrians stroll the blocks, scatter when a car barrels at them, and remember
// being hit — which is exactly what raises Rio's wanted level.

import { CITY, PLAYER } from './config.js';
import { collideCircle, clampToCity } from './city.js';

const SHIRT_COLORS = [0xe07a5f, 0x81b29a, 0xf2c14e, 0x7fb3d5, 0xc9a7eb, 0xe8e8e8, 0x2ec4b6, 0xf4a261];

export function makePersonMesh(THREE, shirtColor, opts = {}) {
  const group = new THREE.Group();
  const shirt = new THREE.MeshLambertMaterial({ color: shirtColor });
  const skin = new THREE.MeshLambertMaterial({ color: 0xd9a066 });
  const pants = new THREE.MeshLambertMaterial({ color: 0x2a3040 });
  const body = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.5, 1.05, 8), shirt);
  body.position.y = 1.05;
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.32, 10, 8), skin);
  head.position.y = 1.85;
  const legL = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.55, 0.22), pants);
  legL.position.set(-0.18, 0.28, 0);
  const legR = legL.clone();
  legR.position.x = 0.18;
  group.add(body, head, legL, legR);
  if (opts.hero) {
    const cap = new THREE.Mesh(
      new THREE.CylinderGeometry(0.34, 0.34, 0.16, 10),
      new THREE.MeshLambertMaterial({ color: 0x2ec4b6 }),
    );
    cap.position.y = 2.05;
    group.add(cap);
  }
  group.userData.legL = legL;
  group.userData.legR = legR;
  return group;
}

export function spawnPedestrians(rng, count) {
  const peds = [];
  for (let i = 0; i < count; i++) {
    peds.push({
      id: `ped-${i}`,
      x: -180 + rng() * 360,
      z: -180 + rng() * 360,
      angle: rng() * Math.PI * 2,
      speed: 1.2 + rng() * 1.4,
      shirt: SHIRT_COLORS[Math.floor(rng() * SHIRT_COLORS.length)],
      panic: 0,
      walkPhase: rng() * 6,
      mesh: null,
    });
  }
  return peds;
}

export function updatePedestrians(dt, city, peds, player, cars) {
  for (const ped of peds) {
    // Flee from a nearby speeding car or from the player when wanted.
    let fleeing = false;
    if (player && player.wanted > 0) {
      const dx = ped.x - player.x;
      const dz = ped.z - player.z;
      if (dx * dx + dz * dz < 100) { ped.panic = 2; fleeing = true; }
    }
    if (ped.panic > 0) {
      ped.panic -= dt;
      const dx = ped.x - (player ? player.x : 0);
      const dz = ped.z - (player ? player.z : 0);
      const d = Math.hypot(dx, dz) || 1;
      ped.angle = Math.atan2(dx / d, dz / d);
      ped.speed = 5;
    } else {
      ped.speed = 1.2 + Math.sin(ped.walkPhase) * 0.3;
      if (Math.random() < dt * 0.08) ped.angle += (Math.random() - 0.5) * 1.6;
    }
    ped.walkPhase += dt * (fleeing ? 9 : 5);
    const nx = ped.x + Math.sin(ped.angle) * ped.speed * dt;
    const nz = ped.z + Math.cos(ped.angle) * ped.speed * dt;
    const hit = collideCircle(city, nx, nz, 0.6);
    const clamped = clampToCity(hit.x, hit.z);
    ped.x = clamped.x;
    ped.z = clamped.z;
    if (ped.mesh) {
      ped.mesh.position.set(ped.x, 0, ped.z);
      ped.mesh.rotation.y = ped.angle;
      const swing = Math.sin(ped.walkPhase) * 0.45;
      if (ped.mesh.userData.legL) {
        ped.mesh.userData.legL.rotation.x = swing;
        ped.mesh.userData.legR.rotation.x = -swing;
      }
    }
  }
}

/** Walk Rio on foot: camera-relative WASD, run with Shift, blocked by buildings. */
export function walkPlayer(player, input, dt, city, cameraYaw) {
  const fwd = input.forward() - input.back();
  const strafe = input.right() - input.left();
  const speed = input.run() ? PLAYER.runSpeed : PLAYER.walkSpeed;
  if (fwd === 0 && strafe === 0) return false;
  const sin = Math.sin(cameraYaw);
  const cos = Math.cos(cameraYaw);
  let dx = (sin * fwd + cos * strafe) * speed * dt;
  let dz = (cos * fwd - sin * strafe) * speed * dt;
  const len = Math.hypot(dx, dz);
  if (len > 0) { dx /= len; dz /= len; dx *= speed * dt; dz *= speed * dt; }
  const hit = collideCircle(city, player.x + dx, player.z + dz, PLAYER.radius);
  const clamped = clampToCity(hit.x, hit.z);
  player.x = clamped.x;
  player.z = clamped.z;
  player.heading = Math.atan2(dx, dz);
  return true;
}
