// Cars for SOLMAR HEAT: the player's rides, the traffic that fills the streets,
// the rival courier's sports car and the police interceptors. Every car is built
// from boxes, cylinders and a light bar — no model files, no borrowed shapes.

import { CAR, CITY } from './config.js';
import { collideCircle, clampToCity } from './city.js';

const CAR_COLORS = [0xd64545, 0x3a7bd5, 0xe8e8e8, 0x222222, 0x2ec4b6, 0xf2c14e, 0x7a4fd0, 0x8a8a8a];

export function makeCarMesh(THREE, color, opts = {}) {
  const group = new THREE.Group();
  const bodyMat = new THREE.MeshLambertMaterial({ color });
  const glassMat = new THREE.MeshLambertMaterial({ color: 0x1a2a3a });
  const body = new THREE.Mesh(new THREE.BoxGeometry(2.1, 0.75, 4.4), bodyMat);
  body.position.y = 0.65;
  group.add(body);
  const cabin = new THREE.Mesh(new THREE.BoxGeometry(1.8, 0.65, 2.2), glassMat);
  cabin.position.set(0, 1.3, -0.25);
  group.add(cabin);
  const wheelGeo = new THREE.CylinderGeometry(0.42, 0.42, 0.35, 10);
  const wheelMat = new THREE.MeshLambertMaterial({ color: 0x111111 });
  const wheels = [];
  for (const [wx, wz] of [[-1.05, 1.45], [1.05, 1.45], [-1.05, -1.45], [1.05, -1.45]]) {
    const wheel = new THREE.Mesh(wheelGeo, wheelMat);
    wheel.rotation.z = Math.PI / 2;
    wheel.position.set(wx, 0.42, wz);
    group.add(wheel);
    wheels.push(wheel);
  }
  if (opts.police) {
    const bar = new THREE.Mesh(
      new THREE.BoxGeometry(1.5, 0.22, 0.5),
      new THREE.MeshLambertMaterial({ color: 0x111111 }),
    );
    bar.position.set(0, 1.75, -0.25);
    group.add(bar);
    const red = new THREE.Mesh(
      new THREE.BoxGeometry(0.65, 0.22, 0.5),
      new THREE.MeshLambertMaterial({ color: 0xff2222, emissive: 0xaa0000 }),
    );
    red.position.set(-0.38, 1.78, -0.25);
    const blue = new THREE.Mesh(
      new THREE.BoxGeometry(0.65, 0.22, 0.5),
      new THREE.MeshLambertMaterial({ color: 0x2244ff, emissive: 0x0000aa }),
    );
    blue.position.set(0.38, 1.78, -0.25);
    group.add(red, blue);
    group.userData.lightRed = red;
    group.userData.lightBlue = blue;
  }
  if (opts.taxi) {
    const sign = new THREE.Mesh(
      new THREE.BoxGeometry(0.9, 0.3, 0.5),
      new THREE.MeshLambertMaterial({ color: 0xf2c14e, emissive: 0x664400 }),
    );
    sign.position.set(0, 1.8, -0.25);
    group.add(sign);
  }
  group.userData.wheels = wheels;
  return group;
}

export function makeCar(id, x, z, angle, color, kind) {
  return {
    id, kind: kind || 'traffic', x, z, angle,
    speed: 0, steer: 0, color, mesh: null,
    lane: 0, axis: 'x', dir: 1, cruise: 8 + Math.random() * 5,
  };
}

/** Parked + drivable cars the player can steal, scattered near the plaza. */
export function spawnParkedCars(rng) {
  const spots = [
    [24, 30, 0.2, 0xd64545, 'sedan'], [-30, 58, -0.4, 0x3a7bd5, 'sedan'],
    [58, -24, 1.57, 0xf2c14e, 'taxi'], [-58, -30, 0, 0x2ec4b6, 'sport'],
    [90, 58, 0.1, 0xe8e8e8, 'sedan'], [-90, 24, -1.57, 0x222222, 'sport'],
  ];
  return spots.map(([x, z, angle, color, kind], i) => {
    const car = makeCar(`parked-${i}`, x, z, angle, color, kind);
    car.parked = true;
    return car;
  });
}

export function spawnTraffic(rng, count) {
  const cars = [];
  const step = CITY.block + CITY.road;
  for (let i = 0; i < count; i++) {
    const axis = rng() > 0.5 ? 'x' : 'z';
    const roadIndex = Math.floor(rng() * 9) - 4;
    const lane = roadIndex * step + (rng() > 0.5 ? 3 : -3);
    const along = -CITY.half + rng() * CITY.half * 2;
    const dir = rng() > 0.5 ? 1 : -1;
    const color = CAR_COLORS[Math.floor(rng() * CAR_COLORS.length)];
    const car = makeCar(`traffic-${i}`, axis === 'x' ? along : lane, axis === 'x' ? lane : along,
      axis === 'x' ? (dir > 0 ? Math.PI / 2 : -Math.PI / 2) : (dir > 0 ? 0 : Math.PI),
      color, rng() > 0.85 ? 'taxi' : 'sedan');
    car.axis = axis;
    car.dir = dir;
    car.cruise = 7 + rng() * 6;
    cars.push(car);
  }
  return cars;
}

export function updateTraffic(dt, city, cars, player) {
  for (const car of cars) {
    if (car.parked) continue;
    const speed = car.cruise;
    if (car.axis === 'x') car.x += car.dir * speed * dt;
    else car.z += car.dir * speed * dt;
    // Wrap around the far edge so the streets never empty out.
    if (car.x > CITY.half + 10) car.x = -CITY.half - 10;
    if (car.x < -CITY.half - 10) car.x = CITY.half + 10;
    if (car.z > CITY.seaZ + 10) car.z = -CITY.half - 10;
    if (car.z < -CITY.half - 10) car.z = CITY.seaZ + 10;
    // Don't drive through the player: brake when close ahead.
    if (player) {
      const dx = player.x - car.x;
      const dz = player.z - car.z;
      if (dx * dx + dz * dz < 64) car.cruise = Math.max(2, car.cruise - dt * 8);
      else car.cruise = Math.min(13, car.cruise + dt * 4);
    }
  }
}

/** Arcade driving: accelerate, steer by speed, brake, reverse, collide, clamp. */
export function driveCar(car, input, dt, city, others) {
  const throttle = input.forward() - input.back();
  const steerInput = input.left() - input.right();
  if (throttle > 0) car.speed += CAR.accel * dt;
  else if (throttle < 0) {
    if (car.speed > 0.5) car.speed -= CAR.brake * dt;
    else car.speed -= CAR.reverseAccel * dt;
  } else {
    car.speed -= Math.sign(car.speed) * Math.min(Math.abs(car.speed), 10 * dt);
  }
  car.speed = Math.max(-CAR.maxReverse, Math.min(CAR.maxSpeed, car.speed));
  const steerTarget = steerInput * CAR.steer * Math.min(1, Math.abs(car.speed) / 10);
  car.steer += (steerTarget - car.steer) * Math.min(1, CAR.grip * dt);
  car.angle += car.steer * dt * Math.sign(car.speed || 1) * (car.speed >= 0 ? 1 : -1) * 0.9;
  const nx = car.x + Math.sin(car.angle) * car.speed * dt;
  const nz = car.z + Math.cos(car.angle) * car.speed * dt;
  const hit = collideCircle(city, nx, nz, CAR.radius);
  const clamped = clampToCity(hit.x, hit.z);
  const collided = Math.abs(clamped.x - nx) > 0.01 || Math.abs(clamped.z - nz) > 0.01
    || Math.abs(hit.x - nx) > 0.01 || Math.abs(hit.z - nz) > 0.01;
  car.x = clamped.x;
  car.z = clamped.z;
  if (collided && Math.abs(car.speed) > 6) {
    car.speed *= 0.35;
    return true; // hard hit — the caller plays the crash sound
  }
  // Soft push-apart against other cars.
  for (const other of others) {
    if (other === car || other.parked) continue;
    const dx = car.x - other.x;
    const dz = car.z - other.z;
    const d2 = dx * dx + dz * dz;
    if (d2 < 20 && d2 > 0.01) {
      const d = Math.sqrt(d2);
      car.x = other.x + (dx / d) * 4.5;
      car.z = other.z + (dz / d) * 4.5;
      car.speed *= 0.7;
    }
  }
  return false;
}

export function nearestCar(cars, x, z, maxDist) {
  let best = null;
  let bestD = maxDist * maxDist;
  for (const car of cars) {
    const dx = car.x - x;
    const dz = car.z - z;
    const d2 = dx * dx + dz * dz;
    if (d2 < bestD) { bestD = d2; best = car; }
  }
  return best;
}
