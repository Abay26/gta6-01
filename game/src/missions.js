// The story v2: ten jobs for Mara Solis that take Rico Vega from a nobody
// with $200 to the crew that hits the Coral Crown Casino and escapes by boat.
// A step is a place to reach, a car or bike to take, a wait to survive, a
// heat to lose, or fares to earn. Finishing one pays cash and unlocks the next.
import { STORY } from './config.js';
import { addWanted } from './police.js';

function lm(world, kind) {
  const mark = world.city.landmarks[kind];
  return { x: mark.x, y: mark.y + mark.h / 2 + 70 };
}
export function missionList(world) {
  const garage = lm(world, 'garage');
  const bank = lm(world, 'bank');
  const motel = lm(world, 'motel');
  const safehouse = lm(world, 'safehouse');
  const loft = lm(world, 'safehouse2');
  const casino = lm(world, 'casino');
  const diner = lm(world, 'diner');
  const stadium = lm(world, 'stadium');
  const docks = { x: world.city.docks.x + 40, y: world.city.docks.y + 300 };
  const marina = { x: 1800, y: 3480 };
  const paint = lm(world, 'paint');
  return [
    { id: 'first-day', title: 'First Day on the Job', giver: STORY.fixer, reward: 200,
      brief: 'Mara needs her sedan moved from the garage to the Palm Court Motel. Drive it there — gently.',
      steps: [
        { type: 'talk', npc: 'mara', x: garage.x, y: garage.y, text: 'Meet Mara at Solis Auto' },
        { type: 'enter', carType: 'sedan', text: "Get in Mara's sedan" },
        { type: 'goto', x: motel.x, y: motel.y, text: 'Drive the sedan to the Palm Court Motel' },
      ] },
    { id: 'docks-pickup', title: 'The Docks Pickup', giver: STORY.fixer, reward: 350,
      brief: 'A package is waiting at the Solmar Docks. Grab it and bring it to the safehouse. Someone may have tipped off the cops.',
      steps: [
        { type: 'goto', x: docks.x, y: docks.y, text: 'Go to the Solmar Docks' },
        { type: 'wait', x: docks.x, y: docks.y, seconds: 2, text: 'Grab the package' },
        { type: 'deliver', x: safehouse.x, y: safehouse.y, text: 'Deliver the package to the safehouse' },
      ] },
    { id: 'getaway', title: 'Getaway Driver', giver: 'Dante', reward: 500,
      brief: 'Dante is hot and needs wheels out of the motel district. Pick him up, then lose the heat — all of it.',
      steps: [
        { type: 'talk', npc: 'dante', x: motel.x, y: motel.y, text: 'Pick up Dante at the motel' },
        { type: 'lose', text: 'Lose the cops — get your wanted level to zero' },
      ] },
    { id: 'taxi-hustle', title: 'Taxi Hustle', giver: STORY.fixer, reward: 300,
      brief: 'The garage needs legit money on the books. Take a taxi and earn $400 in fares around the city.',
      steps: [
        { type: 'enter', carType: 'taxi', text: 'Get in a taxi' },
        { type: 'earn', amount: 400, text: 'Earn $400 in taxi fares' },
      ] },
    { id: 'bike-courier', title: 'Bike Courier', giver: 'Lena Cruz', reward: 380,
      brief: 'Lena needs a fast courier: take the street bike by the Sunset Diner and run the parcel to Northgate Hills before the sun sets.',
      steps: [
        { type: 'enter', carType: 'bike', text: 'Get on the street bike by the diner' },
        { type: 'goto', x: 3000, y: 600, text: 'Ride the parcel to Northgate Hills' },
      ] },
    { id: 'repo-run', title: 'Repo Run', giver: STORY.fixer, reward: 600,
      brief: 'A sports car is parked uptown and its owner stopped paying. Take it — any sports car will do — and bring it to the garage.',
      steps: [
        { type: 'enter', carType: 'sports', text: 'Steal a sports car' },
        { type: 'goto', x: garage.x, y: garage.y, text: 'Bring it to Solis Auto' },
      ] },
    { id: 'fresh-paint', title: 'Fresh Paint', giver: STORY.fixer, reward: 420,
      brief: 'The crew car is too hot to drive. Take any car to Luna Paint & Body and get it repainted — a new colour cools the heat.',
      steps: [
        { type: 'enter', carType: 'sedan', text: 'Get in any sedan' },
        { type: 'goto', x: paint.x, y: paint.y, text: 'Drive to Luna Paint & Body' },
        { type: 'wait', x: paint.x, y: paint.y, seconds: 3, text: 'Wait for the repaint' },
      ] },
    { id: 'solmar-score', title: 'The Solmar Score', giver: STORY.fixer, reward: 1500,
      brief: 'The big one: crack the vault at Bay Trust Bank, grab the cash, and get it to the safehouse with the whole city on your tail.',
      steps: [
        { type: 'goto', x: bank.x, y: bank.y, text: 'Go to Bay Trust Bank' },
        { type: 'wait', x: bank.x, y: bank.y, seconds: 4, text: 'Crack the vault — stay in the zone' },
        { type: 'deliver', x: safehouse.x, y: safehouse.y, text: 'Escape to the safehouse with the cash' },
      ] },
    { id: 'casino-caper', title: 'The Casino Caper', giver: 'Dante', reward: 1800,
      brief: 'The Coral Crown Casino counts its takings at midnight. Slip in, hold the floor for the count, and get out to the stadium car park.',
      steps: [
        { type: 'goto', x: casino.x, y: casino.y, text: 'Go to the Coral Crown Casino' },
        { type: 'wait', x: casino.x, y: casino.y, seconds: 5, text: 'Hold the floor while the count runs' },
        { type: 'deliver', x: stadium.x, y: stadium.y, text: 'Escape to the Bay Arena car park' },
      ] },
    { id: 'harbor-escape', title: 'Harbor Escape', giver: STORY.fixer, reward: 2500,
      brief: 'The finale: the whole PD is coming. Get to the Marina, take a speedboat, and outrun the harbour patrol to open water.',
      steps: [
        { type: 'goto', x: marina.x, y: marina.y, text: 'Get to the Solmar Marina' },
        { type: 'enter', carType: 'boat', text: 'Take a speedboat' },
        { type: 'goto', x: 1800, y: 3580, text: 'Outrun the patrol to open water' },
      ] },
  ];
}
export function startMission(world, index) {
  const list = missionList(world);
  const s = world.state;
  s.missionIndex = index; s.missionStep = 0; s.missionWait = 0; s.missionEarned = 0;
  s.missionActive = index < list.length;
  const m = list[index];
  if (m) { world.events.push({ kind: 'mission', title: m.title, giver: m.giver }); world.audio.jingle(); }
}
export function currentMission(world) {
  const list = missionList(world);
  if (!world.state.missionActive) return null;
  return list[world.state.missionIndex] ?? null;
}
export function currentStep(world) {
  const m = currentMission(world);
  if (!m) return null;
  return m.steps[world.state.missionStep] ?? null;
}
export function missionMarker(world) {
  const step = currentStep(world);
  if (!step || step.type === 'enter' || step.type === 'lose' || step.type === 'earn') return null;
  return { x: step.x, y: step.y, text: step.text };
}
export function objectiveText(world) {
  const m = currentMission(world);
  if (!m) return 'Free roam — phone (Q) for side jobs, fares, or the next job at the garage';
  const step = currentStep(world);
  if (!step) return m.title;
  if (step.type === 'earn') return `${m.title}: ${step.text} ($${world.state.missionEarned} / $${step.amount})`;
  if (step.type === 'wait' && world.state.missionWait > 0) return `${step.text} — ${Math.ceil(step.seconds - world.state.missionWait)}s left`;
  return `${m.title}: ${step.text}`;
}
function completeStep(world) {
  const s = world.state;
  const m = currentMission(world);
  const doneStep = m.steps[s.missionStep];
  s.missionStep += 1; s.missionWait = 0; world.audio.blip();
  if (s.missionIndex === 2 && doneStep.type === 'talk') addWanted(world, 3, 'Dante is wanted — lose the cops');
  if (s.missionStep >= m.steps.length) {
    s.cash += m.reward; s.missionDone.push(m.id);
    world.events.push({ kind: 'missionDone', title: m.title, reward: m.reward });
    world.audio.jingle();
    const next = s.missionIndex + 1;
    if (next < missionList(world).length) startMission(world, next);
    else { s.missionActive = false; world.events.push({ kind: 'storyDone', text: 'Story complete — Solmar Bay is yours. Keep the hustle going.' }); }
  }
}
export function updateMission(world, dt, input) {
  const s = world.state;
  const step = currentStep(world);
  if (!step) return;
  const p = s.player;
  const px = s.playerCar ? s.playerCar.x : p.x;
  const py = s.playerCar ? s.playerCar.y : p.y;
  const near = (x, y, r) => Math.hypot(px - x, py - y) < r;
  if (step.type === 'goto' || step.type === 'deliver') {
    if (near(step.x, step.y, 70)) completeStep(world);
  } else if (step.type === 'talk') {
    if (near(step.x, step.y, 60) && input.pressed('interact')) {
      world.events.push({ kind: 'talk', npc: step.npc });
      completeStep(world);
    }
  } else if (step.type === 'enter') {
    if (s.playerCar && s.playerCar.type === step.carType) completeStep(world);
  } else if (step.type === 'wait') {
    if (near(step.x, step.y, 70)) {
      s.missionWait += dt;
      if (s.missionWait >= step.seconds) {
        if (world.state.missionIndex === 1) addWanted(world, 1, 'Someone tipped off the cops');
        if (world.state.missionIndex === 7) addWanted(world, 4, 'The bank alarm is screaming');
        if (world.state.missionIndex === 8) addWanted(world, 4, 'Casino security called the PD');
        if (world.state.missionIndex === 9) addWanted(world, 5, 'Every cop in Solmar Bay is coming');
        completeStep(world);
      }
    } else s.missionWait = 0;
  } else if (step.type === 'lose') {
    if (s.wanted === 0) completeStep(world);
  } else if (step.type === 'earn') {
    if (s.missionEarned >= step.amount) completeStep(world);
  }
}
