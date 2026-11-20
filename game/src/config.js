// SOLMAR HEAT — every tuning number, colour and story beat in one place.
// Original city: Solmar Bay. Original hero: Rio Vega, a courier for the Bayline crew.
// Nothing here comes from any commercial game: all names, places and art are ours.

export const GAME_TITLE = 'SOLMAR HEAT';
export const GAME_SUBTITLE = 'An open-city story from Solmar Bay';
export const SAVE_KEY = 'solmar-heat.save.v1';
export const BEST_KEY = 'solmar-heat.best.v1';

/** Fixed simulation step: 60 updates a second whatever the display rate. */
export const STEP = 1 / 60;

export const CITY = {
  half: 220, // playable square, -220..220 on x and z
  block: 44, // city block size; roads run between blocks
  road: 12, // road width
  seaZ: 252, // the beach and the sea start past this z
};

export const PLAYER = {
  walkSpeed: 9,
  runSpeed: 14,
  radius: 0.9,
  health: 100,
  startCash: 120,
};

export const CAR = {
  accel: 26,
  brake: 42,
  reverseAccel: 14,
  maxSpeed: 46,
  maxReverse: 12,
  steer: 1.9,
  grip: 6.5,
  radius: 2.4,
};

export const TRAFFIC_COUNT = 11;
export const PED_COUNT = 16;
export const POLICE_MAX = 4;

export const WANTED = {
  max: 5,
  stealCar: 1,
  hitPedestrian: 1,
  shoot: 1,
  ramPolice: 1,
  decaySeconds: 26,
  bustedSeconds: 3.2,
};

export const COMBAT = {
  range: 70,
  cooldown: 0.28,
  damage: 34,
  muzzleMs: 70,
};

/** The three story missions, in order. Rewards are paid in Solmar dollars. */
export const MISSIONS = [
  {
    id: 'pickup',
    name: 'MISSION 1 — FIRST PICKUP',
    brief: 'Mara needs a package from Marina Pier. Walk or drive there and press E.',
    target: 'marina',
    reward: 500,
    timeLimit: 0,
  },
  {
    id: 'rival',
    name: 'MISSION 2 — HOT WHEELS',
    brief: 'A rival courier stole the crew’s sports car. Chase it down and ram it to tag it.',
    target: 'rival',
    reward: 800,
    timeLimit: 0,
  },
  {
    id: 'delivery',
    name: 'MISSION 3 — SKYLINE DELIVERY',
    brief: 'Deliver the package to the Solmar Grand Hotel before the timer ends. The cops are watching.',
    target: 'hotel',
    reward: 1200,
    timeLimit: 100,
  },
];

export const PALETTE = {
  sky: 0x8ec9ee,
  sun: 0xffdf9e,
  sea: 0x1e7fa8,
  sand: 0xe8d29a,
  asphalt: 0x33363d,
  sidewalk: 0x9a9aa0,
  building: [0xe8b48a, 0xdfe6ea, 0xf2c14e, 0x7fb3d5, 0xe07a5f, 0x81b29a, 0xc9a7eb, 0xf4a261],
  glass: 0x2e4a66,
  taxi: 0xf2c14e,
  police: 0xf2f2f2,
  player: 0x2ec4b6,
};

export const FONT = 'system-ui, -apple-system, "Segoe UI", Roboto, sans-serif';
