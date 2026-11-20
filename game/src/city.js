// Solmar Bay itself: the ground, the streets, the buildings, the beach and the sea.
// Everything is procedural — one canvas texture for the streets, plain boxes for
// the towers — so the city ships as code, with no image or model files at all.

import { CITY, PALETTE } from './config.js';

export function mulberry32(seed) {
  let a = seed >>> 0;
  return function random() {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Paint the street grid onto a canvas: asphalt roads, sidewalks, crosswalks, sand. */
export function makeGroundTexture(THREE) {
  const size = 1024;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const g = canvas.getContext('2d');
  const scale = size / (CITY.half * 2 + 80);
  const toPx = (v) => (v + CITY.half + 40) * scale;
  g.fillStyle = '#8f9299';
  g.fillRect(0, 0, size, size);
  // Beach + sea along the south edge (high z).
  g.fillStyle = '#e8d29a';
  g.fillRect(0, toPx(CITY.seaZ - 22), size, size - toPx(CITY.seaZ - 22));
  g.fillStyle = '#1e7fa8';
  g.fillRect(0, toPx(CITY.seaZ + 6), size, size - toPx(CITY.seaZ + 6));
  g.fillStyle = '#ffffff';
  g.fillRect(0, toPx(CITY.seaZ + 4), size, 3);
  // Roads: a grid every block+road, plus the ring road.
  g.fillStyle = '#33363d';
  const step = CITY.block + CITY.road;
  for (let i = -4; i <= 4; i++) {
    const c = i * step;
    g.fillRect(toPx(c - CITY.road / 2), 0, CITY.road * scale, toPx(CITY.seaZ - 22));
    g.fillRect(0, toPx(c - CITY.road / 2), size, CITY.road * scale);
  }
  // Dashed centre lines.
  g.fillStyle = '#f2c14e';
  for (let i = -4; i <= 4; i++) {
    const c = i * step;
    for (let d = -CITY.half; d < CITY.half; d += 16) {
      g.fillRect(toPx(c) - 2, toPx(d), 4, 8 * scale);
      g.fillRect(toPx(d), toPx(c) - 2, 8 * scale, 4);
    }
  }
  // Crosswalks at every intersection.
  g.fillStyle = '#e8e8e8';
  for (let i = -4; i <= 4; i++) {
    for (let j = -4; j <= 4; j++) {
      const x = i * step; const z = j * step;
      for (let k = -2; k <= 2; k++) {
        g.fillRect(toPx(x + k * 3) - 2, toPx(z - CITY.road / 2), 4, 5);
        g.fillRect(toPx(x - CITY.road / 2), toPx(z + k * 3) - 2, 5, 4);
      }
    }
  }
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 4;
  return texture;
}

export function buildCity(THREE, scene, seed) {
  const rng = mulberry32(seed);
  const group = new THREE.Group();
  group.name = 'solmar-bay';
  const ground = new THREE.Mesh(
    new THREE.PlaneGeometry(CITY.half * 2 + 80, CITY.half * 2 + 80),
    new THREE.MeshLambertMaterial({ map: makeGroundTexture(THREE) }),
  );
  ground.rotation.x = -Math.PI / 2;
  ground.position.z = 20;
  group.add(ground);

  const buildings = [];
  const colliders = [];
  const palette = PALETTE.building;
  const step = CITY.block + CITY.road;
  const boxGeo = new THREE.BoxGeometry(1, 1, 1);
  for (let bx = -4; bx <= 4; bx++) {
    for (let bz = -4; bz <= 4; bz++) {
      if (bz === 4) continue; // the beach row stays open
      // Blocks sit BETWEEN the roads: road centrelines run at multiples of
      // (block + road), so each block centre is half a step off the roads.
      const cx = bx * step + step / 2;
      const cz = bz * step + step / 2;
      const count = 1 + Math.floor(rng() * 3);
      for (let k = 0; k < count; k++) {
        const w = 10 + rng() * 14;
        const d = 10 + rng() * 14;
        const h = 8 + rng() * rng() * 46;
        const x = cx + (rng() - 0.5) * (CITY.block - w - 4);
        const z = cz + (rng() - 0.5) * (CITY.block - d - 4);
        const color = palette[Math.floor(rng() * palette.length)];
        const mat = new THREE.MeshLambertMaterial({ color });
        const mesh = new THREE.Mesh(boxGeo, mat);
        mesh.scale.set(w, h, d);
        mesh.position.set(x, h / 2, z);
        group.add(mesh);
        // Glass roof cap so towers read as buildings, not plain boxes.
        const cap = new THREE.Mesh(
          new THREE.BoxGeometry(w * 0.55, 1.2, d * 0.55),
          new THREE.MeshLambertMaterial({ color: PALETTE.glass, emissive: 0x0a2030 }),
        );
        cap.position.set(x, h + 0.6, z);
        group.add(cap);
        buildings.push({ x, z, w, d, h });
        colliders.push({ minX: x - w / 2, maxX: x + w / 2, minZ: z - d / 2, maxZ: z + d / 2 });
      }
    }
  }

  // The Solmar Grand Hotel: the tallest tower, the delivery landmark.
  const hotel = new THREE.Mesh(
    new THREE.BoxGeometry(26, 78, 26),
    new THREE.MeshLambertMaterial({ color: 0xf2c14e, emissive: 0x332200 }),
  );
  hotel.position.set(150, 39, -150);
  group.add(hotel);
  colliders.push({ minX: 137, maxX: 163, minZ: -163, maxZ: -137 });
  buildings.push({ x: 150, z: -150, w: 26, d: 26, h: 78 });

  // Marina Pier: a wooden walkway into the sea, the first mission's target.
  const pier = new THREE.Mesh(
    new THREE.BoxGeometry(10, 1, 46),
    new THREE.MeshLambertMaterial({ color: 0x8a6a45 }),
  );
  pier.position.set(-180, 0.6, 232);
  group.add(pier);

  // Palm trees along the beach and the main avenue.
  const trunkMat = new THREE.MeshLambertMaterial({ color: 0x7a5230 });
  const leafMat = new THREE.MeshLambertMaterial({ color: 0x2e9e5b });
  for (let i = 0; i < 46; i++) {
    const x = -CITY.half + rng() * CITY.half * 2;
    const z = i < 24 ? CITY.seaZ - 14 + rng() * 8 : -CITY.half + rng() * CITY.half * 2;
    const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.5, 7, 6), trunkMat);
    trunk.position.set(x, 3.5, z);
    const crown = new THREE.Mesh(new THREE.ConeGeometry(3.2, 3.4, 7), leafMat);
    crown.position.set(x, 8.2, z);
    group.add(trunk, crown);
  }

  // Street lamps on every other intersection.
  const lampMat = new THREE.MeshLambertMaterial({ color: 0x222222 });
  const bulbMat = new THREE.MeshLambertMaterial({ color: 0xffe9a8, emissive: 0xcc9900 });
  for (let i = -4; i <= 4; i += 2) {
    for (let j = -4; j <= 4; j += 2) {
      const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.18, 7, 6), lampMat);
      pole.position.set(i * step + 7, 3.5, j * step + 7);
      const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.55, 8, 6), bulbMat);
      bulb.position.set(i * step + 7, 7.2, j * step + 7);
      group.add(pole, bulb);
    }
  }

  scene.add(group);
  return {
    buildings,
    colliders,
    landmarks: {
      marina: { x: -180, z: 232, label: 'Marina Pier' },
      hotel: { x: 150, z: -118, label: 'Solmar Grand Hotel' },
      hideout: { x: -150, z: -150, label: 'Bayline Hideout' },
      plaza: { x: 0, z: 0, label: 'Solmar Plaza' },
    },
  };
}

/** Keep a circle (player, car, ped) out of every building box. */
export function collideCircle(city, x, z, radius) {
  let nx = x;
  let nz = z;
  for (const b of city.colliders) {
    const cx = Math.max(b.minX, Math.min(nx, b.maxX));
    const cz = Math.max(b.minZ, Math.min(nz, b.maxZ));
    const dx = nx - cx;
    const dz = nz - cz;
    const d2 = dx * dx + dz * dz;
    if (d2 < radius * radius) {
      if (d2 > 0.0001) {
        const d = Math.sqrt(d2);
        nx = cx + (dx / d) * radius;
        nz = cz + (dz / d) * radius;
      } else {
        nx = b.maxX + radius;
      }
    }
  }
  return { x: nx, z: nz };
}

export function clampToCity(x, z) {
  return {
    x: Math.max(-CITY.half, Math.min(CITY.half, x)),
    z: Math.max(-CITY.half, Math.min(CITY.seaZ - 4, z)),
  };
}
