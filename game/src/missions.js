// Story missions for SOLMAR HEAT. Three jobs for the Bayline crew, in order:
// pick up a package at Marina Pier, chase down the rival who stole the crew's
// sports car, then deliver it to the Solmar Grand Hotel against the clock — with
// the police already watching. Completing a job pays cash and saves progress.

import { MISSIONS } from './config.js';

export function currentMission(state) {
  if (state.player.missionIndex >= MISSIONS.length) return null;
  return MISSIONS[state.player.missionIndex];
}

export function missionTarget(state) {
  const mission = currentMission(state);
  if (!mission) return null;
  if (mission.target === 'rival') return { x: state.rival.x, z: state.rival.z, label: 'Rival courier' };
  const spot = state.city.landmarks[mission.target];
  return spot ? { x: spot.x, z: spot.z, label: spot.label } : null;
}

export function startMission(state, index) {
  const mission = MISSIONS[index];
  if (!mission) return;
  state.player.missionIndex = index;
  state.mission = {
    id: mission.id,
    startedAt: state.time,
    timeLeft: mission.timeLimit || 0,
    done: false,
  };
  state.events.push({ type: 'mission', name: mission.name, brief: mission.brief });
  if (mission.id === 'delivery') {
    // The delivery is hot: two stars the moment Rio takes the wheel.
    state.player.wanted = Math.max(state.player.wanted, 2);
    state.player.lastCrimeAt = state.time;
  }
  if (mission.id === 'rival') {
    // The rival courier flees along the avenues in the crew's stolen sports car.
    state.rival.active = true;
    state.rival.x = state.player.x + 60;
    state.rival.z = state.player.z - 40;
  }
}

export function updateMission(state, dt) {
  const mission = currentMission(state);
  if (!mission || !state.mission || state.mission.done) return;
  const target = missionTarget(state);
  if (!target) return;
  const dx = state.player.x - target.x;
  const dz = state.player.z - target.z;
  const dist = Math.hypot(dx, dz);
  state.mission.distance = dist;
  if (mission.timeLimit > 0) {
    state.mission.timeLeft -= dt;
    if (state.mission.timeLeft <= 0) {
      state.events.push({ type: 'mission-failed', name: mission.name, reason: 'Out of time — Mara gives you one more shot.' });
      startMission(state, state.player.missionIndex);
      return;
    }
  }
  const arrive = mission.id === 'rival' ? 5 : 7;
  if (dist < arrive) {
    completeMission(state, mission);
  }
}

export function completeMission(state, mission) {
  state.mission.done = true;
  state.player.cash += mission.reward;
  state.player.completed += 1;
  state.events.push({ type: 'mission-complete', name: mission.name, reward: mission.reward });
  state.player.missionIndex += 1;
  if (state.player.missionIndex < MISSIONS.length) {
    startMission(state, state.player.missionIndex);
  } else {
    state.mode = 'complete';
    state.events.push({ type: 'story-complete' });
  }
}
