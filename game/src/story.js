// The story: ten jobs for Mara Solis that take Rico Vega from a nobody
// with $200 to the crew that hits the Coral Crown Casino and escapes by
// speedboat. A step is a place to reach, a person to meet, a vehicle to
// board, a zone to hold, heat to shake, or fares to earn.
import { PEOPLE } from './tuning.js';
import { raiseHeat } from './heat.js';

function door(world, kind) {
  const mark = world.atlas.spots[kind];
  return { x: mark.x, y: mark.y + mark.h / 2 + 70 };
}
export function storyJobs(world) {
  const garage = door(world, 'garage');
  const bank = door(world, 'bank');
  const motel = door(world, 'motel');
  const flat = door(world, 'flat');
  const loft = door(world, 'loft');
  const casino = door(world, 'casino');
  const diner = door(world, 'diner');
  const arena = door(world, 'arena');
  const paint = door(world, 'paint');
  const docks = { x: world.atlas.docks.x + 40, y: world.atlas.docks.y + 300 };
  const marina = { x: 1800, y: 3480 };
  return [
    { id: 'first-day', title: 'First Day on the Job', giver: PEOPLE.fixer, reward: 200,
      brief: 'Mara needs her sedan moved from the garage to the Palm Court Motel. Drive it there — gently.',
      steps: [
        { kind: 'meet', npc: 'mara', x: garage.x, y: garage.y, text: 'Meet Mara at Solis Auto' },
        { kind: 'board', vehicle: 'sedan', text: "Get in Mara's sedan" },
        { kind: 'reach', x: motel.x, y: motel.y, text: 'Drive the sedan to the Palm Court Motel' },
      ] },
    { id: 'docks-pickup', title: 'The Docks Pickup', giver: PEOPLE.fixer, reward: 350,
      brief: 'A package is waiting at the Solmar Docks. Grab it and bring it to the flat. Someone may have tipped off the cops.',
      steps: [
        { kind: 'reach', x: docks.x, y: docks.y, text: 'Go to the Solmar Docks' },
        { kind: 'hold', x: docks.x, y: docks.y, seconds: 2, text: 'Grab the package' },
        { kind: 'drop', x: flat.x, y: flat.y, text: 'Deliver the package to the flat' },
      ] },
    { id: 'getaway', title: 'Getaway Driver', giver: 'Dante', reward: 500,
      brief: 'Dante is hot and needs wheels out of the motel district. Pick him up, then lose the heat — all of it.',
      steps: [
        { kind: 'meet', npc: 'dante', x: motel.x, y: motel.y, text: 'Pick up Dante at the motel' },
        { kind: 'clear', text: 'Lose the cops — get your wanted level to zero' },
      ] },
    { id: 'taxi-hustle', title: 'Taxi Hustle', giver: PEOPLE.fixer, reward: 300,
      brief: 'The garage needs legit money on the books. Take a taxi and earn $400 in fares around the city.',
      steps: [
        { kind: 'board', vehicle: 'taxi', text: 'Get in a taxi' },
        { kind: 'earn', amount: 400, text: 'Earn $400 in taxi fares' },
      ] },
    { id: 'bike-courier', title: 'Bike Courier', giver: 'Lena Cruz', reward: 380,
      brief: 'Lena needs a fast courier: take the street bike by the Sunset Diner and run the parcel to Northgate Hills before the sun sets.',
      steps: [
        { kind: 'board', vehicle: 'bike', text: 'Get on the street bike by the diner' },
        { kind: 'reach', x: 3000, y: 600, text: 'Ride the parcel to Northgate Hills' },
      ] },
    { id: 'repo-run', title: 'Repo Run', giver: PEOPLE.fixer, reward: 600,
      brief: 'A sports car is parked uptown and its owner stopped paying. Take it — any sports car will do — and bring it to the garage.',
      steps: [
        { kind: 'board', vehicle: 'sports', text: 'Steal a sports car' },
        { kind: 'reach', x: garage.x, y: garage.y, text: 'Bring it to Solis Auto' },
      ] },
    { id: 'fresh-paint', title: 'Fresh Paint', giver: PEOPLE.fixer, reward: 420,
      brief: 'The crew car is too hot to drive. Take any sedan to Luna Paint & Body and get it repainted — a new colour cools the heat.',
      steps: [
        { kind: 'board', vehicle: 'sedan', text: 'Get in any sedan' },
        { kind: 'reach', x: paint.x, y: paint.y, text: 'Drive to Luna Paint & Body' },
        { kind: 'hold', x: paint.x, y: paint.y, seconds: 3, text: 'Wait for the repaint' },
      ] },
    { id: 'solmar-score', title: 'The Solmar Score', giver: PEOPLE.fixer, reward: 1500,
      brief: 'The big one: crack the vault at Bay Trust Bank, grab the cash, and get it to the flat with the whole city on your tail.',
      steps: [
        { kind: 'reach', x: bank.x, y: bank.y, text: 'Go to Bay Trust Bank' },
        { kind: 'hold', x: bank.x, y: bank.y, seconds: 4, text: 'Crack the vault — stay in the zone' },
        { kind: 'drop', x: flat.x, y: flat.y, text: 'Escape to the flat with the cash' },
      ] },
    { id: 'casino-caper', title: 'The Casino Caper', giver: 'Dante', reward: 1800,
      brief: 'The Coral Crown Casino counts its takings at midnight. Slip in, hold the floor for the count, and get out to the arena car park.',
      steps: [
        { kind: 'reach', x: casino.x, y: casino.y, text: 'Go to the Coral Crown Casino' },
        { kind: 'hold', x: casino.x, y: casino.y, seconds: 5, text: 'Hold the floor while the count runs' },
        { kind: 'drop', x: arena.x, y: arena.y, text: 'Escape to the Bay Arena car park' },
      ] },
    { id: 'harbor-escape', title: 'Harbor Escape', giver: PEOPLE.fixer, reward: 2500,
      brief: 'The finale: the whole PD is coming. Get to the Marina, take a speedboat, and outrun the harbour patrol to open water.',
      steps: [
        { kind: 'reach', x: marina.x, y: marina.y, text: 'Get to the Solmar Marina' },
        { kind: 'board', vehicle: 'boat', text: 'Take a speedboat' },
        { kind: 'reach', x: 1800, y: 3580, text: 'Outrun the patrol to open water' },
      ] },
  ];
}
export function beginJob(world, index) {
  const list = storyJobs(world);
  const s = world.state;
  s.missionIdx = index; s.missionStep = 0; s.missionWait = 0; s.missionEarned = 0;
  s.missionActive = index < list.length;
  const job = list[index];
  if (job) { world.events.push({ kind: 'job', title: job.title, giver: job.giver }); world.sound.jingle(); }
}
export function jobNow(world) {
  const list = storyJobs(world);
  if (!world.state.missionActive) return null;
  return list[world.state.missionIdx] ?? null;
}
export function stepNow(world) {
  const job = jobNow(world);
  if (!job) return null;
  return job.steps[world.state.missionStep] ?? null;
}
export function jobMarker(world) {
  const step = stepNow(world);
  if (!step || step.kind === 'board' || step.kind === 'clear' || step.kind === 'earn') return null;
  return { x: step.x, y: step.y, text: step.text };
}
export function objectiveLine(world) {
  const job = jobNow(world);
  if (!job) return 'Free roam — phone (Q) for side jobs, fares, or the next job at the garage';
  const step = stepNow(world);
  if (!step) return job.title;
  if (step.kind === 'earn') return `${job.title}: ${step.text} ($${world.state.missionEarned} / $${step.amount})`;
  if (step.kind === 'hold' && world.state.missionWait > 0) return `${step.text} — ${Math.ceil(step.seconds - world.state.missionWait)}s left`;
  return `${job.title}: ${step.text}`;
}
function finishStep(world) {
  const s = world.state;
  const job = jobNow(world);
  const done = job.steps[s.missionStep];
  s.missionStep += 1; s.missionWait = 0; world.sound.blip();
  if (s.missionIdx === 2 && done.kind === 'meet') raiseHeat(world, 3, 'Dante is wanted — lose the cops');
  if (s.missionStep >= job.steps.length) {
    s.cash += job.reward; s.missionDone.push(job.id);
    world.events.push({ kind: 'jobDone', title: job.title, reward: job.reward });
    world.sound.jingle();
    const next = s.missionIdx + 1;
    if (next < storyJobs(world).length) beginJob(world, next);
    else { s.missionActive = false; world.events.push({ kind: 'storyDone', text: 'Story complete — Solmar Bay is yours. Keep the hustle going.' }); }
  }
}
export function stepStory(world, dt, keys) {
  const s = world.state;
  const step = stepNow(world);
  if (!step) return;
  const px = s.car ? s.car.x : s.hero.x;
  const py = s.car ? s.car.y : s.hero.y;
  const near = (x, y, r) => Math.hypot(px - x, py - y) < r;
  if (step.kind === 'reach' || step.kind === 'drop') {
    if (near(step.x, step.y, 70)) finishStep(world);
  } else if (step.kind === 'meet') {
    if (near(step.x, step.y, 60) && keys.pressed('interact')) {
      world.events.push({ kind: 'talk', npc: step.npc });
      finishStep(world);
    }
  } else if (step.kind === 'board') {
    if (s.car && s.car.type === step.vehicle) finishStep(world);
  } else if (step.kind === 'hold') {
    // Hold the zone: progress builds while inside and only leaks away
    // slowly outside, so one shove from a cop car does not wipe the count.
    if (near(step.x, step.y, 90)) {
      s.missionWait += dt;
      if (s.missionWait >= step.seconds) {
        if (world.state.missionIdx === 1) raiseHeat(world, 1, 'Someone tipped off the cops');
        if (world.state.missionIdx === 7) raiseHeat(world, 4, 'The bank alarm is screaming');
        if (world.state.missionIdx === 8) raiseHeat(world, 4, 'Casino security called the PD');
        if (world.state.missionIdx === 9) raiseHeat(world, 5, 'Every cop in Solmar Bay is coming');
        finishStep(world);
      }
    } else s.missionWait = Math.max(0, s.missionWait - dt * 0.5);
  } else if (step.kind === 'clear') {
    if (s.wanted === 0) finishStep(world);
  } else if (step.kind === 'earn') {
    if (s.missionEarned >= step.amount) finishStep(world);
  }
}
