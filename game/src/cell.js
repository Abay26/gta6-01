// The phone: Q opens it, 1–4 call a contact. Mara points at the next job,
// Lena runs parcels, Dante runs getaways, and dispatch runs taxi shifts.
import { jobNow } from './story.js';
import { nearestRoadPoint } from './atlas.js';

export const CONTACTS = [
  { name: 'Mara Solis', role: 'Fixer — next job' },
  { name: 'Lena Cruz', role: 'Dispatch — parcel run' },
  { name: 'Dante', role: 'Crew — getaway' },
  { name: 'Cab Dispatch', role: 'Taxi shift' },
];
export function openCell(world) { world.state.phoneOpen = true; world.sound.click(); }
export function closeCell(world) { world.state.phoneOpen = false; }
export function ringContact(world, index) {
  const s = world.state;
  const contact = CONTACTS[index];
  if (!contact) return;
  world.sound.blip();
  if (index === 0) {
    const job = jobNow(world);
    world.events.push({ kind: 'toast', text: job ? `Mara: "${job.title} — ${job.brief}"` : 'Mara: "No jobs right now. Enjoy the city, Rico."' });
  } else if (index === 1) {
    if (s.sideJob) { world.events.push({ kind: 'toast', text: 'Finish the current side job first.' }); return; }
    const a = nearestRoadPoint(s.hero.x + 500, s.hero.y);
    const b = nearestRoadPoint(s.hero.x - 600, s.hero.y + 400);
    s.sideJob = { kind: 'parcel', stage: 'pickup', x: a.x, y: a.y, dx: b.x, dy: b.y, pay: 250 };
    world.events.push({ kind: 'toast', text: 'Lena: "Parcel waiting at the marker. Bring it across town — $250."' });
  } else if (index === 2) {
    if (s.sideJob) { world.events.push({ kind: 'toast', text: 'Finish the current side job first.' }); return; }
    s.sideJob = { kind: 'getaway', stage: 'pickup', x: world.atlas.spots.motel.x, y: world.atlas.spots.motel.y, pay: 400 };
    world.events.push({ kind: 'toast', text: 'Dante: "Pick me up at the motel. Cops will follow — $400 if we make it."' });
  } else if (index === 3) {
    if (s.sideJob) { world.events.push({ kind: 'toast', text: 'Finish the current side job first.' }); return; }
    s.sideJob = { kind: 'taxi', earned: 0, goal: 300, pay: 200 };
    world.events.push({ kind: 'toast', text: 'Dispatch: "Taxi shift — earn $300 in fares, keep a $200 bonus."' });
  }
  closeCell(world);
}
export function stepSideJob(world, dt) {
  const s = world.state;
  const job = s.sideJob;
  if (!job) return;
  const px = s.car ? s.car.x : s.hero.x;
  const py = s.car ? s.car.y : s.hero.y;
  if (job.kind === 'parcel') {
    if (job.stage === 'pickup' && Math.hypot(px - job.x, py - job.y) < 70) {
      job.stage = 'drop';
      world.events.push({ kind: 'toast', text: 'Parcel collected — deliver it to the marker.' });
    } else if (job.stage === 'drop' && Math.hypot(px - job.dx, py - job.dy) < 70) {
      s.cash += job.pay; s.sideJobsDone += 1; s.sideJob = null;
      world.sound.cash();
      world.events.push({ kind: 'toast', text: `Parcel delivered +$${job.pay}` });
    }
  } else if (job.kind === 'getaway') {
    if (job.stage === 'pickup' && Math.hypot(px - job.x, py - job.y) < 70) {
      job.stage = 'clear';
      world.events.push({ kind: 'toast', text: 'Dante is in — now lose the cops!' });
    } else if (job.stage === 'clear' && s.wanted === 0) {
      s.cash += job.pay; s.sideJobsDone += 1; s.sideJob = null;
      world.sound.cash();
      world.events.push({ kind: 'toast', text: `Clean getaway +$${job.pay}` });
    }
  } else if (job.kind === 'taxi') {
    if (job.earned >= job.goal) {
      s.cash += job.pay; s.sideJobsDone += 1; s.sideJob = null;
      world.sound.cash();
      world.events.push({ kind: 'toast', text: `Shift complete — bonus +$${job.pay}` });
    }
  }
  void dt;
}
export function sideMarker(world) {
  const job = world.state.sideJob;
  if (!job) return null;
  if (job.kind === 'parcel') return { x: job.stage === 'pickup' ? job.x : job.dx, y: job.stage === 'pickup' ? job.y : job.dy, text: job.stage === 'pickup' ? 'Parcel pickup' : 'Parcel dropoff' };
  if (job.kind === 'getaway') return job.stage === 'pickup' ? { x: job.x, y: job.y, text: 'Pick up Dante' } : null;
  return null;
}
