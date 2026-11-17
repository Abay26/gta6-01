// The save v2: cash, the job the story is on, the pistol, the jacket, the
// Marina Loft, side jobs done and the player's spot, kept in this browser's
// localStorage. Saving happens when a job is finished and when the player
// pauses — never mid-chase, so a save is always clean.
import { SAVE_KEY } from './config.js';
export function readSave() {
  try {
    const raw = window.localStorage.getItem(SAVE_KEY);
    if (!raw) return null;
    const data = JSON.parse(raw);
    if (!data || typeof data.cash !== 'number') return null;
    return data;
  } catch { return null; }
}
export function writeSave(world) {
  try { window.localStorage.setItem(SAVE_KEY, JSON.stringify(world.saveData())); return true; }
  catch { return false; }
}
export function clearSave() {
  try { window.localStorage.removeItem(SAVE_KEY); }
  catch { /* Storage can be off: the game simply starts fresh each visit. */ }
}
