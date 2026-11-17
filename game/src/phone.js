// The phone: Rico's in-game mobile (Q to open). Contacts call in side jobs —
// Mara offers a delivery, Dante a getaway, Lena a taxi shift — and the phone
// also shows cash, jobs done and the safehouse you own. 1/2/3 picks a contact.
import { addWanted } from './police.js';

export const CONTACTS = [
  { id: 'mara', name: 'Mara Solis', role: 'Garage — delivery job', job: 'delivery' },
  { id: 'dante', name: 'Dante', role: 'Crew — getaway job', job: 'getaway' },
  { id: 'lena', name: 'Lena Cruz', role: 'Dispatch — taxi shift', job: 'taxi' },
];
export function openPhone(world) { world.state.phoneOpen = true; world.audio.click(); }
export function closePhone(world) { world.state.phoneOpen = false; }
export function callContact(world, index) {
  const s = world.state;
  const c = CONTACTS[index];
  if (!c || s.sideJob) return;
  if (c.job === 'delivery') {
    s.sideJob = { kind: 'delivery', stage: 'pickup', x: world.city.docks.x + 40, y: world.city.docks.y + 300, reward: 260, text: 'Pick up the crate at the Docks' };
  } else if (c.job === 'getaway') {
    const motel = world.city.landmarks.motel;
    s.sideJob = { kind: 'getaway', stage: 'pickup', x: motel.x, y: motel.y + motel.h / 2 + 70, reward: 420, text: 'Pick up Dante at the motel, then lose the cops' };
  } else {
    s.sideJob = { kind: 'taxi', stage: 'shift', earned: 0, target: 300, reward: 150, text: 'Taxi shift: earn $300 in fares' };
    world.events.push({ kind: 'toast', text: 'Taxi shift started — get in a taxi (Lena pays $150 on top)' });
  }
  s.phoneOpen = false;
  world.events.push({ kind: 'toast', text: `${c.name}: side job started — ${s.sideJob.text}` });
  world.audio.blip();
}
export function updateSideJob(world, dt) {
  const s = world.state;
  const job = s.sideJob;
  if (!job) return;
  const px = s.playerCar ? s.playerCar.x : s.player.x;
  const py = s.playerCar ? s.playerCar.y : s.player.y;
  const near = (x, y, r) => Math.hypot(px - x, py - y) < r;
  if (job.kind === 'delivery') {
    if (job.stage === 'pickup' && near(job.x, job.y, 70)) {
      job.stage = 'drop'; const sh = world.city.landmarks.safehouse2;
      job.x = sh.x; job.y = sh.y + sh.h / 2 + 70; job.text = 'Deliver the crate to the Marina Loft';
      world.events.push({ kind: 'toast', text: 'Crate loaded — deliver it to the Marina Loft' });
    } else if (job.stage === 'drop' && near(job.x, job.y, 70)) {
      s.cash += job.reward; world.events.push({ kind: 'toast', text: `Delivery done +$${job.reward}` });
      world.audio.cash(); s.sideJob = null; s.sideJobsDone = (s.sideJobsDone || 0) + 1;
    }
  } else if (job.kind === 'getaway') {
    if (job.stage === 'pickup' && near(job.x, job.y, 60)) {
      job.stage = 'lose'; job.text = 'Lose the cops — wanted to zero';
      world.events.push({ kind: 'toast', text: 'Dante is in — lose the cops!' });
      addWanted(world, 3, 'Dante is wanted');
    } else if (job.stage === 'lose' && s.wanted === 0) {
      s.cash += job.reward; world.events.push({ kind: 'toast', text: `Getaway done +$${job.reward}` });
      world.audio.cash(); s.sideJob = null; s.sideJobsDone = (s.sideJobsDone || 0) + 1;
    }
  } else if (job.kind === 'taxi') {
    if (job.earned >= job.target) {
      s.cash += job.reward; world.events.push({ kind: 'toast', text: `Taxi shift done +$${job.reward} bonus` });
      world.audio.cash(); s.sideJob = null; s.sideJobsDone = (s.sideJobsDone || 0) + 1;
    }
  }
}
export function sideJobMarker(world) {
  const j = world.state.sideJob;
  if (!j || j.kind === 'taxi' || (j.kind === 'getaway' && j.stage === 'lose')) return null;
  return { x: j.x, y: j.y, text: j.text, color: '#4ad9a0' };
}
