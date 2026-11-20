// The screenshot scenes behind ?shot=chase|city|mission|drive. Each one plays the
// real rules forward from a fresh world for a fixed number of steps, steered by a
// simple autopilot (drive forward, steer toward the road, keep the chase in frame),
// so the frame is what real play looks like — and the same seed always gives the
// same frame. The first by name, 1-chase, is the cover.

import { STEP } from './config.js';
import { startMission } from './missions.js';
import { addWanted } from './police.js';

const STEPS = 150;

function fakeInput(forward, left, right) {
  return {
    forward: () => forward,
    back: () => 0,
    left: () => left,
    right: () => right,
    run: () => false,
    takeDrag: () => 0,
    takeActions: () => 0,
  };
}

function driveForward(world, steps, steer) {
  const input = fakeInput(1, steer ? 1 : 0, steer ? 0 : 0);
  for (let i = 0; i < steps; i++) world.step(STEP, input, null);
}

export function stageShot(name, world) {
  const state = world.state;
  world.reset(null);
  if (name === 'city') {
    // Rio on foot in Solmar Plaza: traffic, pedestrians, mission 1 on the HUD.
    state.player.x = 0;
    state.player.z = 0;
    state.cameraYaw = 0.4;
    for (let i = 0; i < 90; i++) world.step(STEP, fakeInput(0, 0, 0), null);
    return { screen: 'play' };
  }
  if (name === 'mission') {
    // On foot at the Marina Pier approach, the yellow beacon marking the pickup.
    state.player.x = -168;
    state.player.z = 196;
    state.cameraYaw = 0;
    for (let i = 0; i < 90; i++) world.step(STEP, fakeInput(0, 0, 0), null);
    return { screen: 'play' };
  }
  if (name === 'drive') {
    // Cruising the beach road in Rio's own sedan, sea on the left, palms ahead.
    const car = state.cars.find((c) => c.id === 'parked-0');
    state.player.car = car;
    car.parked = false;
    car.x = -120;
    car.z = 224;
    car.angle = Math.PI / 2;
    state.player.x = car.x;
    state.player.z = car.z;
    state.cameraYaw = car.angle;
    driveForward(world, STEPS, false);
    return { screen: 'play' };
  }
  // Default: chase. Rio fleeing in a stolen sports car, three stars, two
  // interceptors closing in, the mission banner and minimap on screen.
  const car = state.cars.find((c) => c.kind === 'sport');
  state.player.car = car;
  car.parked = false;
  car.x = 0;
  car.z = 60;
  car.angle = 0;
  state.player.x = car.x;
  state.player.z = car.z;
  state.cameraYaw = car.angle;
  addWanted(state, 3, 'staged chase');
  startMission(state, 2);
  driveForward(world, STEPS, false);
  return { screen: 'play' };
}
