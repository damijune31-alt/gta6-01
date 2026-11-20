// Save / load for SOLMAR HEAT. Progress lives in localStorage only (this browser),
// so saving never needs a server. A save holds cash, the mission index, missions
// completed and the best chase score; loading it resumes exactly there.

import { SAVE_KEY } from './config.js';

export function defaultSave() {
  return { cash: 120, missionIndex: 0, completed: 0, bestChase: 0, savedAt: 0 };
}

export function loadSave() {
  try {
    const raw = window.localStorage.getItem(SAVE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (typeof parsed !== 'object' || parsed === null) return null;
    return { ...defaultSave(), ...parsed };
  } catch {
    return null;
  }
}

export function writeSave(save) {
  try {
    const stamped = { ...save, savedAt: Date.now() };
    window.localStorage.setItem(SAVE_KEY, JSON.stringify(stamped));
    return stamped;
  } catch {
    return save;
  }
}

export function clearSave() {
  try { window.localStorage.removeItem(SAVE_KEY); } catch { /* ignore */ }
}

export function readBest() {
  try {
    return Number.parseInt(window.localStorage.getItem('solmar-heat.best.v1') ?? '0', 10) || 0;
  } catch {
    return 0;
  }
}

export function writeBest(value) {
  try { window.localStorage.setItem('solmar-heat.best.v1', String(value)); } catch { /* ignore */ }
}
