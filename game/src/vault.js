// The vault: save and load through localStorage. Progress saves when a
// job finishes and when the game is paused.
import { SAVE_KEY } from './tuning.js';

export function loadVault() {
  try {
    const raw = window.localStorage.getItem(SAVE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch (e) { return null; }
}
export function saveVault(world) {
  try { window.localStorage.setItem(SAVE_KEY, JSON.stringify(world.saveData())); } catch (e) { /* storage full or blocked */ }
}
export function wipeVault() {
  try { window.localStorage.removeItem(SAVE_KEY); } catch (e) { /* ignore */ }
}
