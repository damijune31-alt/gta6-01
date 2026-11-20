// Drawing only: the three.js scene for SOLMAR HEAT — sun, sky, fog, the city,
// every car and person synced from the world state, the chase camera and the
// pulsing mission beacon. Nothing here decides rules; it paints what is there.

import { PALETTE } from './config.js';
import { buildCity } from './city.js';
import { makeCarMesh } from './vehicles.js';
import { makePersonMesh } from './people.js';
import { missionTarget } from './missions.js';

export function createRenderer(canvas, state) {
  const THREE = window.THREE;
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(PALETTE.sky);
  scene.fog = new THREE.Fog(PALETTE.sky, 180, 520);
  const hemi = new THREE.HemisphereLight(0xcfe8ff, 0x8a7a5a, 0.95);
  scene.add(hemi);
  const sun = new THREE.DirectionalLight(PALETTE.sun, 1.6);
  sun.position.set(120, 180, 60);
  scene.add(sun);
  const camera = new THREE.PerspectiveCamera(62, 1, 0.1, 900);

  const city = buildCity(THREE, scene, state.seed);
  state.city = city;

  // The mission beacon: a glowing column + a floating marker at the target.
  const beacon = new THREE.Group();
  const column = new THREE.Mesh(
    new THREE.CylinderGeometry(1.6, 1.6, 60, 12, 1, true),
    new THREE.MeshBasicMaterial({ color: 0xf2c14e, transparent: true, opacity: 0.28, side: THREE.DoubleSide }),
  );
  column.position.y = 30;
  const marker = new THREE.Mesh(
    new THREE.ConeGeometry(2.2, 4.5, 4),
    new THREE.MeshLambertMaterial({ color: 0xf2c14e, emissive: 0x664400 }),
  );
  marker.position.y = 12;
  marker.rotation.x = Math.PI;
  beacon.add(column, marker);
  scene.add(beacon);

  const playerMesh = makePersonMesh(THREE, PALETTE.player, { hero: true });
  scene.add(playerMesh);

  // One mesh per car, created once and repositioned every frame.
  const carMeshes = new Map();
  function carMeshFor(car) {
    let mesh = carMeshes.get(car.id);
    if (!mesh) {
      const color = car.kind === 'police' ? PALETTE.police : car.color;
      mesh = makeCarMesh(THREE, color, { police: car.kind === 'police', taxi: car.kind === 'taxi' });
      scene.add(mesh);
      carMeshes.set(car.id, mesh);
    }
    return mesh;
  }
  const rivalMesh = makeCarMesh(THREE, 0xd64545, {});
  scene.add(rivalMesh);

  const pedMeshes = new Map();
  function pedMeshFor(ped) {
    let mesh = pedMeshes.get(ped.id);
    if (!mesh) {
      mesh = makePersonMesh(THREE, ped.shirt);
      scene.add(mesh);
      pedMeshes.set(ped.id, mesh);
    }
    return mesh;
  }

  // Muzzle flash: a small bright plane shown for a few frames after a shot.
  const flash = new THREE.Mesh(
    new THREE.PlaneGeometry(1.6, 1.6),
    new THREE.MeshBasicMaterial({ color: 0xfff2a8, transparent: true, opacity: 0 }),
  );
  scene.add(flash);

  const camPos = new THREE.Vector3(0, 9, -14);
  const lookAt = new THREE.Vector3(0, 1, 0);
  let orbitAngle = 0;

  function resize() {
    const w = window.innerWidth;
    const h = window.innerHeight;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  }
  window.addEventListener('resize', resize);
  resize();

  function syncMeshes() {
    const p = state.player;
    playerMesh.visible = !p.car;
    playerMesh.position.set(p.x, 0, p.z);
    playerMesh.rotation.y = p.heading;
    for (const car of state.cars) {
      const mesh = carMeshFor(car);
      car.mesh = mesh;
      mesh.position.set(car.x, 0, car.z);
      mesh.rotation.y = car.angle;
      const spin = car.speed * 0.12;
      for (const wheel of mesh.userData.wheels || []) wheel.rotation.x += spin;
    }
    for (const cop of state.police) {
      const mesh = carMeshFor(cop);
      cop.mesh = mesh;
      mesh.position.set(cop.x, 0, cop.z);
      mesh.rotation.y = cop.angle;
    }
    for (const ped of state.peds) {
      const mesh = pedMeshFor(ped);
      ped.mesh = mesh;
      mesh.position.set(ped.x, 0, ped.z);
      mesh.rotation.y = ped.angle;
    }
    rivalMesh.visible = state.rival.active;
    rivalMesh.position.set(state.rival.x, 0, state.rival.z);
    rivalMesh.rotation.y = state.rival.angle;
    const target = missionTarget(state);
    beacon.visible = !!target;
    if (target) {
      beacon.position.set(target.x, 0, target.z);
      marker.position.y = 12 + Math.sin(state.time * 3) * 1.2;
      marker.rotation.y = state.time * 2;
    }
    flash.material.opacity = state.time < state.muzzleUntil ? 0.95 : 0;
    if (state.time < state.muzzleUntil) {
      flash.position.set(p.x + Math.sin(state.cameraYaw) * 1.6, 1.6, p.z + Math.cos(state.cameraYaw) * 1.6);
      flash.lookAt(camera.position);
    }
  }

  function moveCamera(dt) {
    const p = state.player;
    if (state.mode === 'title') {
      orbitAngle += dt * 0.08;
      const r = 150;
      camPos.set(Math.sin(orbitAngle) * r, 62, Math.cos(orbitAngle) * r);
      lookAt.set(0, 4, 0);
    } else {
      const yaw = state.cameraYaw;
      const dist = p.car ? 16 : 9.5;
      const height = p.car ? 7.4 : 4.6;
      const tx = p.x - Math.sin(yaw) * dist;
      const tz = p.z - Math.cos(yaw) * dist;
      camPos.x += (tx - camPos.x) * Math.min(1, 6 * dt);
      camPos.y += (height - camPos.y) * Math.min(1, 6 * dt);
      camPos.z += (tz - camPos.z) * Math.min(1, 6 * dt);
      lookAt.set(p.x + Math.sin(yaw) * 6, 1.6, p.z + Math.cos(yaw) * 6);
    }
    camera.position.copy(camPos);
    camera.lookAt(lookAt);
  }

  /** Paint one frame: sync every mesh, move the camera, render. */
  function draw(dt) {
    syncMeshes();
    moveCamera(dt || 0.016);
    renderer.render(scene, camera);
  }

  return { draw, scene, camera, city };
}
