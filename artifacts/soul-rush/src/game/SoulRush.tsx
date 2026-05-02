import { useEffect, useRef, useState } from 'react';

// ================================================================
//  SOUL RUSH — Original Bullet-Hell Boss Fight Game
//  10 unique bosses, original characters, HTML Canvas rendering.
//  Inspired by bullet-hell mechanics — all art generated in code.
// ================================================================

// ================================================================
// WEB AUDIO PLACEHOLDERS
// ================================================================
// let _audioCtx: AudioContext | null = null;
// function _getAC(): AudioContext {
//   if (!_audioCtx) _audioCtx = new AudioContext();
//   return _audioCtx;
// }
// function sfxHit()        { /* descending 330→110 Hz, 0.22s */ }
// function sfxLaser()      { /* filtered noise burst 880→220 Hz, 0.15s */ }
// function sfxWarning()    { /* sine osc 880 Hz, 0.1s */ }
// function sfxBossDefeat() { /* 220→330→440 Hz arpeggio, 0.12s each */ }
// function sfxTimeFreeze() { /* osc sweep 200→80 Hz + noise, 0.3s */ }

// ================================================================
// CANVAS & BATTLE BOX
// ================================================================

const W = 800;
const H = 600;
const BX = 220;
const BY = 148;
const BW = 360;
const BH = 285;
const BCX = BX + BW / 2;
const BCY = BY + BH / 2;

const P_SPEED  = 195;
const P_MAX_HP = 100;
const P_INV    = 1.5;
const P_HIT_R  = 4;

const SHAKE_AMT = 8;
const SHAKE_DUR = 0.28;

// ================================================================
// DIFFICULTY LEVELS
// ================================================================

const DIFF_LEVELS = [
  { label: 'Easy',      mult: 0.75 },
  { label: 'Normal',    mult: 1.0  },
  { label: 'Hard',      mult: 1.25 },
  { label: 'Extreme',   mult: 1.5  },
  { label: 'Nightmare', mult: 2.0  },
];

// ================================================================
// BOSS GUIDE TIPS
// ================================================================

const BOSS_TIPS = [
  {
    name: 'Virel the Glass Warden',
    tip: 'Crystal Rain: the drift reverses on the second pass — keep weaving left-right. Mirror Walls: second appearance pulses; dodge when it dims, not when it brightens. Shatter Pulse: two rings from offset centers — find the angle that clears both gaps.',
  },
  {
    name: 'Mawbyte the Hungry Code',
    tip: 'Bit Storm: second wave fires from BOTH opposite edges simultaneously — hug center. Error Sweep: second sweep reverses direction — predict it. Devour Lane: the SAFE stripe CHANGES halfway through on the second use — stay ready to move.',
  },
  {
    name: 'Seraph Null',
    tip: 'Halo Spiral: reverses rotation once mid-wave — counter-orbit when it flips. Judgment Beams: second appearance has 2 fakes; only the bright amber ones fire. Wing Barrage: second use fires volleys from all 4 corners in rotating order — stay center.',
  },
  {
    name: 'Orryx the Clock Eater',
    tip: 'Gear Maze: gears bounce off walls on second use — track them. Clock Slash: second use adds a third hand. Time Freeze: on unfreeze, bullets SPLIT — give yourself double the room to maneuver.',
  },
  {
    name: 'The Unreadable King',
    tip: 'Impossible Script: second use alternates dense columns and wide shots — memorize the column positions. Crown Collapse: streams come from 4 corners on the second run. Soul Split: fake soul mirrors your movement — move opposite to mislead its aim.',
  },
  {
    name: 'Nyxcoil, the Deep Current',
    tip: 'Current Surge sweeps twice — once right then once left. Stay above center on first pass, below on second. Coil Trap: the gap in the arc is always on the side farthest from the boss. Undertow Pull: sprint AGAINST the pull arrows to stay centered; bullets rain from the pull direction.',
  },
  {
    name: 'Marrow Saint',
    tip: 'Bone Rain aims at where you were 1.5 seconds ago — keep moving in circular patterns. Rib Cage: find the gap BEFORE the walls reach center — it is revealed during the warning. Halo Curse: stay still while bullets orbit you (safe zone), then sprint hard the moment they erupt outward.',
  },
  {
    name: 'Luxora, Queen of False Stars',
    tip: 'Starfall: bright GOLD sparkles are FAKE — only the dim purple ones hurt. Constellation Lines: the safe zones are the triangular gaps between laser lines; identify them in the 1.4s dot-placement phase. False Star: ignore the giant gold star; dodge the small purple eruption that follows it.',
  },
  {
    name: 'Ruin Engine Omega',
    tip: 'Piston Crush: the gap is always in the center — rush to center the instant you see the warning. Engine Spin: the 4 arms accelerate; weave inward behind one arm and rotate with it. Overheat zones explode after the flash stops — stay away from any zone that stops flickering.',
  },
  {
    name: 'Axiom, the End of Rules',
    tip: 'Rule Rewrite reshapes the box — stay away from the new edges shown in cyan. Axis Collapse: the ONE safe cell is the gap where a warn is missing. Mirror Soul fires toward you — keep the mirror heart on the same side and dodge its shots. Pattern Overload: prioritize the diagonal lasers first. Final Rule replays every boss — the order is Crystal→Bit→Halo→Gear→Script→Surge→Bone→Star→Piston.',
  },
];

// ================================================================
// TYPES
// ================================================================

type State = 'title' | 'intro' | 'playing' | 'bossWin' | 'gameOver' | 'victory' | 'finalVictory';

interface WarnMarker {
  id: number;
  x: number; y: number;
  angle: number;
  r: number;
  color: string;
  timer: number;
  maxTimer: number;
}

interface Player {
  x: number; y: number;
  hp: number;
  invTimer: number;
  flicker: boolean;
}

interface Bullet {
  id: number;
  x: number; y: number;
  vx: number; vy: number;
  r: number;
  color: string;
  shape: 'circle' | 'square' | 'diamond';
  rot: number; rotSpd: number;
  frozen: boolean;
}

interface LaserWarn {
  id: number;
  type: 'h' | 'v';
  pos: number;
  width: number;
  timer: number;
  color: string;
  fake: boolean;
}

interface Laser {
  id: number;
  type: 'h' | 'v';
  pos: number;
  width: number;
  timer: number;
  color: string;
}

interface DiagWarn {
  id: number;
  x1: number; y1: number;
  x2: number; y2: number;
  width: number;
  timer: number;
  color: string;
  fake: boolean;
}

interface DiagLaser {
  id: number;
  x1: number; y1: number;
  x2: number; y2: number;
  width: number;
  timer: number;
  color: string;
}

interface Ring {
  id: number;
  cx: number; cy: number;
  r: number; speed: number;
  thick: number;
  gaps: number[];
  gapSz: number;
  color: string;
}

interface DangerZone {
  id: number;
  x: number; y: number; w: number; h: number;
  warnTimer: number;
  activeTimer: number;
  color: string;
}

interface Gear {
  id: number;
  cx: number; cy: number;
  r: number;
  rot: number; rotSpd: number;
  color: string;
  vx: number; vy: number;
}

interface ClockHand {
  id: number;
  cx: number; cy: number;
  len: number; wid: number;
  angle: number; rotSpd: number;
  color: string;
  warming: boolean;
}

interface FakeSoul {
  active: boolean;
  x: number; y: number;
}

interface PistonBlock {
  id: number;
  x: number; y: number;
  w: number; h: number;
  vx: number; vy: number;
  warnTimer: number;
  active: boolean;
}

interface StarPoint {
  id: number;
  x: number; y: number;
}

interface BossConf {
  name: string;
  title: string;
  color: string;
  color2: string;
  bgTint: string;
  dialog: string[];
  attacks: string[];
  dmg: number;
  atkDur: number;
}

// ================================================================
// BOSS DEFINITIONS
// ================================================================

const BOSSES: BossConf[] = [
  {
    name: 'Virel',
    title: 'the Glass Warden',
    color: '#88ccff',
    color2: '#cc88ff',
    bgTint: '#050518',
    dialog: [
      '...Your soul is transparent to me.',
      'Precision is eternal. Let us begin.'
    ],
    attacks: ['crystalRain', 'mirrorWalls', 'shatterPulse', 'crystalRain', 'mirrorWalls'],
    dmg: 16,
    atkDur: 5,
  },
  {
    name: 'Mawbyte',
    title: 'the Hungry Code',
    color: '#ff4444',
    color2: '#44ff44',
    bgTint: '#060600',
    dialog: [
      'ERR_SOUL_DETECTED // CONSUMING...',
      'HUNGRY // HUNGRY // HUNGRY //'
    ],
    attacks: ['bitStorm', 'errorSweep', 'devourLane', 'bitStorm', 'errorSweep', 'devourLane'],
    dmg: 18,
    atkDur: 6,
  },
  {
    name: 'Seraph Null',
    title: '',
    color: '#ffdd55',
    color2: '#ffffff',
    bgTint: '#050400',
    dialog: [
      'Insufficient. Begin examination.',
      'Your score: failing. Proceed, if you can.'
    ],
    attacks: ['haloSpiral', 'judgmentBeams', 'wingBarrage', 'haloSpiral', 'judgmentBeams'],
    dmg: 20,
    atkDur: 6,
  },
  {
    name: 'Orryx',
    title: 'the Clock Eater',
    color: '#cc8822',
    color2: '#ff9900',
    bgTint: '#070400',
    dialog: [
      'T  i  m  e...  s  l  o  w  s...',
      'You cannot outrun the gears of eternity.'
    ],
    attacks: ['gearMaze', 'clockSlash', 'timeFreeze', 'gearMaze', 'clockSlash', 'gearMaze'],
    dmg: 22,
    atkDur: 7,
  },
  {
    name: 'The Unreadable King',
    title: '',
    color: '#cc44ff',
    color2: '#ff2222',
    bgTint: '#030005',
    dialog: [
      'T\u0336H\u0337E\u0338 \u0336E\u0337N\u0338D\u0336 \u0337I\u0338S\u0336 \u0337R\u0338E\u0336A\u0337D\u0338Y\u0336',
      'Y\u0336o\u0337u\u0338 \u0336c\u0337a\u0338n\u0336n\u0337o\u0338t\u0336 \u0337r\u0338e\u0336a\u0337d\u0338 \u0336t\u0337h\u0338i\u0336s\u0337'
    ],
    attacks: ['impossibleScript', 'crownCollapse', 'realityTear', 'soulSplit', 'impossibleScript', 'finalPattern'],
    dmg: 26,
    atkDur: 8,
  },
  {
    name: 'Nyxcoil',
    title: 'the Deep Current',
    color: '#00ccff',
    color2: '#0044ff',
    bgTint: '#000814',
    dialog: [
      '...',
      'The current takes everything in the end.'
    ],
    attacks: ['currentSurge', 'coilTrap', 'undertowPull', 'currentSurge', 'coilTrap', 'undertowPull'],
    dmg: 28,
    atkDur: 7,
  },
  {
    name: 'Marrow Saint',
    title: '',
    color: '#f0f0f0',
    color2: '#cc2222',
    bgTint: '#080004',
    dialog: [
      'Rest now. This will only take a moment.',
      'Your bones will remember this lesson.'
    ],
    attacks: ['boneRain', 'ribCage', 'haloCurse', 'boneRain', 'ribCage'],
    dmg: 30,
    atkDur: 7,
  },
  {
    name: 'Luxora',
    title: 'Queen of False Stars',
    color: '#cc88ff',
    color2: '#ffcc22',
    bgTint: '#050010',
    dialog: [
      'Can you tell which stars are real, little soul?',
      'Beauty is the oldest deception.'
    ],
    attacks: ['starfall', 'constellationLines', 'falseStar', 'starfall', 'constellationLines'],
    dmg: 32,
    atkDur: 7,
  },
  {
    name: 'Ruin Engine Omega',
    title: '',
    color: '#ff6600',
    color2: '#aaaaaa',
    bgTint: '#080500',
    dialog: [
      'INITIATING SOUL PROCESSING PROTOCOL.',
      'RESISTANCE IS MECHANICAL NOISE.'
    ],
    attacks: ['pistonCrush', 'engineSpin', 'overheat', 'pistonCrush', 'engineSpin', 'overheat'],
    dmg: 34,
    atkDur: 8,
  },
  {
    name: 'Axiom',
    title: 'the End of Rules',
    color: '#00ffff',
    color2: '#ffffff',
    bgTint: '#000000',
    dialog: [
      'Rules existed. They have been read.',
      'Now they end.'
    ],
    attacks: ['ruleRewrite', 'axisCollapse', 'mirrorSoul', 'patternOverload', 'ruleRewrite', 'axisCollapse', 'mirrorSoul', 'finalRule'],
    dmg: 38,
    atkDur: 9,
  },
];

// ================================================================
// GAME DATA
// ================================================================

interface GameData {
  state: State;
  player: Player;

  bossIdx: number;
  atkIdx: number;
  atkTimer: number;

  phase: number;
  phaseTimer: number;
  spawnTimer: number;
  spawnCount: number;

  introTimer: number;
  introLine: number;
  postBossTimer: number;
  gameOverTimer: number;

  bossAngle: number;
  time: number;
  glitchTimer: number;

  bullets: Bullet[];
  laserWarns: LaserWarn[];
  lasers: Laser[];
  diagWarns: DiagWarn[];
  diagLasers: DiagLaser[];
  rings: Ring[];
  dangerZones: DangerZone[];
  gears: Gear[];
  clockHands: ClockHand[];
  fakeSoul: FakeSoul;
  warnMarkers: WarnMarker[];
  selectedEdge: number;

  ctrlFlipped: boolean;
  ctrlFlipTimer: number;

  timeDistorted: boolean;
  timeDistortTimer: number;
  timeFrozen: boolean;
  timeFreezeTimer: number;

  devourLane: number;
  devourActive: boolean;

  // Boss 6 — Nyxcoil
  currentPullX: number;
  currentPullY: number;
  pullActive: boolean;

  // Boss 7 — Marrow Saint
  prevPlayerPositions: { x: number; y: number }[];
  prevPosTimer: number;
  haloOrbitActive: boolean;
  haloOrbitTimer: number;

  // Boss 8 — Luxora
  starPoints: StarPoint[];

  // Mirror-walls snapshot — stores positions from first pulse so second pulse reuses them
  laserSnapshot: { type: 'h' | 'v'; pos: number; width: number; color: string }[];

  // Boss 9 — Ruin Engine
  pistonBlocks: PistonBlock[];
  arenaShrunken: boolean;
  engineSpinAngle: number;

  // Boss 10 — Axiom
  rewrittenBounds: { bx: number; by: number; bw: number; bh: number } | null;
  mirrorSoulActive: boolean;
  mirrorSoulX: number;
  mirrorSoulY: number;
  mirrorSoulPulsing: boolean;
  finalRuleStep: number;
  finalRuleStepTimer: number;

  shakeX: number; shakeY: number; shakeTimer: number;
  keys: Set<string>;
  nextId: number;

  diffMult: number;
}

function createState(): GameData {
  return {
    state: 'title',
    player: { x: BCX, y: BCY, hp: P_MAX_HP, invTimer: 0, flicker: false },
    bossIdx: 0, atkIdx: 0, atkTimer: 0,
    phase: 0, phaseTimer: 0, spawnTimer: 0, spawnCount: 0,
    introTimer: 0, introLine: 0, postBossTimer: 0, gameOverTimer: 0,
    bossAngle: 0, time: 0, glitchTimer: 0,
    bullets: [], laserWarns: [], lasers: [],
    diagWarns: [], diagLasers: [],
    rings: [], dangerZones: [], gears: [], clockHands: [],
    fakeSoul: { active: false, x: 0, y: 0 },
    warnMarkers: [], selectedEdge: -1,
    ctrlFlipped: false, ctrlFlipTimer: 0,
    timeDistorted: false, timeDistortTimer: 0,
    timeFrozen: false, timeFreezeTimer: 0,
    devourLane: -1, devourActive: false,
    currentPullX: 0, currentPullY: 0, pullActive: false,
    prevPlayerPositions: [], prevPosTimer: 0,
    haloOrbitActive: false, haloOrbitTimer: 0,
    starPoints: [],
    pistonBlocks: [], arenaShrunken: false, engineSpinAngle: 0,
    rewrittenBounds: null,
    mirrorSoulActive: false, mirrorSoulX: 0, mirrorSoulY: 0, mirrorSoulPulsing: false,
    finalRuleStep: 0, finalRuleStepTimer: 0,
    laserSnapshot: [],
    shakeX: 0, shakeY: 0, shakeTimer: 0,
    keys: new Set(), nextId: 1,
    diffMult: 1.25,
  };
}

function resetForBoss(g: GameData, idx: number) {
  g.player = { x: BCX, y: BCY, hp: P_MAX_HP, invTimer: 0, flicker: false };
  g.bossIdx = idx;
  g.atkIdx = 0;
  g.atkTimer = BOSSES[idx].atkDur;
  g.phase = 0; g.phaseTimer = 0; g.spawnTimer = 0; g.spawnCount = 0;
  g.bossAngle = 0;
  clearEntities(g);
  g.ctrlFlipped = false; g.ctrlFlipTimer = 12;
  g.timeDistorted = false; g.timeDistortTimer = 3;
}

function clearEntities(g: GameData) {
  g.bullets = []; g.laserWarns = []; g.lasers = [];
  g.diagWarns = []; g.diagLasers = [];
  g.rings = []; g.dangerZones = []; g.gears = []; g.clockHands = [];
  g.fakeSoul = { active: false, x: 0, y: 0 };
  g.warnMarkers = []; g.selectedEdge = -1;
  g.devourActive = false; g.devourLane = -1;
  g.timeFrozen = false;
  g.currentPullX = 0; g.currentPullY = 0; g.pullActive = false;
  g.haloOrbitActive = false; g.haloOrbitTimer = 0;
  g.starPoints = [];
  g.pistonBlocks = []; g.arenaShrunken = false; g.engineSpinAngle = 0;
  g.rewrittenBounds = null;
  g.mirrorSoulActive = false; g.mirrorSoulPulsing = false;
  g.finalRuleStep = 0; g.finalRuleStepTimer = 0;
  g.laserSnapshot = [];
}

function jumpToBoss(g: GameData, idx: number) {
  resetForBoss(g, idx);
  g.state = 'playing';
}

function nid(g: GameData) { return g.nextId++; }

// ================================================================
// DIFFICULTY SCALE HELPERS
// ================================================================

function sm(g: GameData) { return 0.72 + 0.45 * g.diffMult; }
function st(base: number, g: GameData) { return base * (1.1 - 0.18 * g.diffMult); }

// ================================================================
// MATH HELPERS
// ================================================================

function rand(min: number, max: number) { return min + Math.random() * (max - min); }
function randInt(min: number, max: number) { return Math.floor(rand(min, max + 1)); }

function angleDiff(a: number, b: number) {
  let d = a - b;
  while (d > Math.PI)  d -= 2 * Math.PI;
  while (d < -Math.PI) d += 2 * Math.PI;
  return d;
}

function distToSeg(px: number, py: number, ax: number, ay: number, bx: number, by: number) {
  const abx = bx - ax, aby = by - ay;
  const len2 = abx * abx + aby * aby;
  if (len2 === 0) return Math.hypot(px - ax, py - ay);
  const t = Math.max(0, Math.min(1, ((px - ax) * abx + (py - ay) * aby) / len2));
  return Math.hypot(px - (ax + t * abx), py - (ay + t * aby));
}

function shake(g: GameData) {
  g.shakeTimer = SHAKE_DUR;
  g.shakeX = (Math.random() - 0.5) * SHAKE_AMT * 2;
  g.shakeY = (Math.random() - 0.5) * SHAKE_AMT * 2;
}

/** Returns how many times this attack has appeared BEFORE the current atkIdx */
function waveVariant(g: GameData): number {
  const boss = BOSSES[g.bossIdx];
  const atk = boss.attacks[g.atkIdx];
  let count = 0;
  for (let i = 0; i < g.atkIdx; i++) {
    if (boss.attacks[i] === atk) count++;
  }
  return count;
}

// ================================================================
// COLLISION DETECTION
// ================================================================

function checkHit(g: GameData): boolean {
  if (g.player.invTimer > 0) return false;
  const px = g.player.x, py = g.player.y, pr = P_HIT_R;

  // Use rewritten bounds if active (Axiom ruleRewrite)
  const cbx = g.rewrittenBounds ? g.rewrittenBounds.bx : BX;
  const cby = g.rewrittenBounds ? g.rewrittenBounds.by : BY;
  const cbw = g.rewrittenBounds ? g.rewrittenBounds.bw : BW;
  const cbh = g.rewrittenBounds ? g.rewrittenBounds.bh : BH;

  for (const b of g.bullets) {
    if (b.frozen) continue;
    if (Math.hypot(px - b.x, py - b.y) < pr + b.r) return true;
  }

  for (const l of g.lasers) {
    if (l.type === 'h') {
      if (px >= cbx && px <= cbx + cbw && Math.abs(py - l.pos) < l.width / 2 + pr) return true;
    } else {
      if (py >= cby && py <= cby + cbh && Math.abs(px - l.pos) < l.width / 2 + pr) return true;
    }
  }

  for (const dl of g.diagLasers) {
    if (distToSeg(px, py, dl.x1, dl.y1, dl.x2, dl.y2) < dl.width / 2 + pr) return true;
  }

  for (const ring of g.rings) {
    const dist = Math.hypot(px - ring.cx, py - ring.cy);
    if (Math.abs(dist - ring.r) < ring.thick / 2 + pr) {
      const angle = Math.atan2(py - ring.cy, px - ring.cx);
      let inGap = false;
      for (const g2 of ring.gaps) {
        if (Math.abs(angleDiff(angle, g2)) < ring.gapSz) { inGap = true; break; }
      }
      if (!inGap) return true;
    }
  }

  for (const dz of g.dangerZones) {
    if (dz.warnTimer > 0 || dz.activeTimer <= 0) continue;
    if (px + pr > dz.x && px - pr < dz.x + dz.w && py + pr > dz.y && py - pr < dz.y + dz.h) return true;
  }

  if (g.devourActive && g.devourLane >= 0) {
    const lH = BH / 5;
    for (let i = 0; i < 5; i++) {
      if (i === g.devourLane) continue;
      const ly = BY + i * lH;
      if (py + pr > ly && py - pr < ly + lH && px >= BX && px <= BX + BW) return true;
    }
  }

  for (const gear of g.gears) {
    if (Math.hypot(px - gear.cx, py - gear.cy) < gear.r * 1.1 + pr) return true;
  }

  for (const hand of g.clockHands) {
    if (hand.warming) continue;
    const ex = hand.cx + Math.cos(hand.angle) * hand.len;
    const ey = hand.cy + Math.sin(hand.angle) * hand.len;
    if (distToSeg(px, py, hand.cx, hand.cy, ex, ey) < hand.wid / 2 + pr) return true;
  }

  for (const pb of g.pistonBlocks) {
    if (!pb.active) continue;
    if (px + pr > pb.x && px - pr < pb.x + pb.w && py + pr > pb.y && py - pr < pb.y + pb.h) return true;
  }

  // Mirror soul collision (Axiom)
  if (g.mirrorSoulActive && !g.mirrorSoulPulsing) {
    if (Math.hypot(px - g.mirrorSoulX, py - g.mirrorSoulY) < 14 + pr) return true;
  }

  return false;
}

// ================================================================
// ATTACK HANDLERS DISPATCH
// ================================================================

function updateAttack(g: GameData, dt: number, boss: BossConf) {
  const atk = boss.attacks[g.atkIdx];

  if (atk === 'crystalRain')        { doCrystalRain(g, dt, boss);        return; }
  if (atk === 'mirrorWalls')        { doMirrorWalls(g, dt, boss);         return; }
  if (atk === 'shatterPulse')       { doShatterPulse(g, dt, boss);        return; }

  if (atk === 'bitStorm')           { doBitStorm(g, dt, boss);            return; }
  if (atk === 'errorSweep')         { doErrorSweep(g, dt, boss);          return; }
  if (atk === 'devourLane')         { doDevourLane(g, dt, boss);          return; }

  if (atk === 'haloSpiral')         { doHaloSpiral(g, dt, boss);          return; }
  if (atk === 'judgmentBeams')      { doJudgmentBeams(g, dt, boss);       return; }
  if (atk === 'wingBarrage')        { doWingBarrage(g, dt, boss);         return; }

  if (atk === 'gearMaze')           { doGearMaze(g, dt, boss);            return; }
  if (atk === 'clockSlash')         { doClockSlash(g, dt, boss);          return; }
  if (atk === 'timeFreeze')         { doTimeFreeze(g, dt, boss);          return; }

  if (atk === 'impossibleScript')   { doImpossibleScript(g, dt, boss);    return; }
  if (atk === 'crownCollapse')      { doCrownCollapse(g, dt, boss);       return; }
  if (atk === 'realityTear')        { doRealityTear(g, dt);               return; }
  if (atk === 'soulSplit')          { doSoulSplit(g, dt, boss);           return; }
  if (atk === 'finalPattern')       { doFinalPattern(g, dt, boss);        return; }

  if (atk === 'currentSurge')       { doCurrentSurge(g, dt, boss);        return; }
  if (atk === 'coilTrap')           { doCoilTrap(g, dt, boss);            return; }
  if (atk === 'undertowPull')       { doUndertowPull(g, dt, boss);        return; }

  if (atk === 'boneRain')           { doBoneRain(g, dt, boss);            return; }
  if (atk === 'ribCage')            { doRibCage(g, dt, boss);             return; }
  if (atk === 'haloCurse')          { doHaloCurse(g, dt, boss);           return; }

  if (atk === 'starfall')           { doStarfall(g, dt, boss);            return; }
  if (atk === 'constellationLines') { doConstellationLines(g, dt, boss);  return; }
  if (atk === 'falseStar')          { doFalseStar(g, dt, boss);           return; }

  if (atk === 'pistonCrush')        { doPistonCrush(g, dt, boss);         return; }
  if (atk === 'engineSpin')         { doEngineSpin(g, dt, boss);          return; }
  if (atk === 'overheat')           { doOverheat(g, dt, boss);            return; }

  if (atk === 'ruleRewrite')        { doRuleRewrite(g, dt, boss);         return; }
  if (atk === 'axisCollapse')       { doAxisCollapse(g, dt, boss);        return; }
  if (atk === 'mirrorSoul')         { doMirrorSoul(g, dt, boss);          return; }
  if (atk === 'patternOverload')    { doPatternOverload(g, dt, boss);     return; }
  if (atk === 'finalRule')          { doFinalRule(g, dt, boss);           return; }
}

// --- BOSS SPECIALS applied every frame ---
function applyBossSpecials(g: GameData, dt: number, boss: BossConf) {
  if (g.bossIdx === 1) {
    g.ctrlFlipTimer -= dt;
    if (g.ctrlFlipTimer <= 0) {
      g.ctrlFlipped = !g.ctrlFlipped;
      g.ctrlFlipTimer = g.ctrlFlipped ? 3.0 : 12.0;
    }
  }
  if (g.bossIdx === 3 && boss.attacks[g.atkIdx] === 'gearMaze') {
    g.timeDistortTimer -= dt;
    if (g.timeDistortTimer <= 0) {
      g.timeDistorted = !g.timeDistorted;
      g.timeDistortTimer = rand(2, 4);
    }
  } else if (g.bossIdx !== 3) {
    g.timeDistorted = false;
  }
}

// ================================================================
// BOSS 1: Virel — distinct waves
// ================================================================

// Wave 1 (atkIdx=0): Normal shard rain with mild drift.
// Wave 4 (atkIdx=3): Heavy drift that reverses direction every 0.6s mid-fall.
function doCrystalRain(g: GameData, dt: number, boss: BossConf) {
  const variant = waveVariant(g);
  const isHard = variant > 0;

  if (g.phase === 0) {
    if (g.warnMarkers.length === 0) {
      const count = isHard ? 18 : 12;
      for (let i = 0; i < count; i++) {
        const x = rand(BX + 8, BX + BW - 8);
        g.warnMarkers.push({
          id: nid(g), x, y: BY - 2,
          angle: Math.PI / 2, r: 6, color: boss.color,
          timer: 0.7, maxTimer: 0.7,
        });
      }
    }
    g.phaseTimer += dt;
    if (g.phaseTimer >= 0.7) { g.phase = 1; g.phaseTimer = 0; g.warnMarkers = []; }
    return;
  }

  g.spawnTimer -= dt;
  const baseInterval = isHard ? 0.07 : 0.085;
  if (g.spawnTimer <= 0) {
    g.spawnTimer = st(baseInterval, g);
    const x = rand(BX + 8, BX + BW - 8);
    const spd = sm(g);
    // Hard variant: drift that reverses sign based on time
    const driftSign = isHard ? (Math.sin(g.time * 1.8) > 0 ? 1 : -1) : 1;
    g.bullets.push({
      id: nid(g), x, y: BY - 6,
      vx: rand(isHard ? 30 : 10, isHard ? 55 : 22) * spd * driftSign,
      vy: rand(145, 270) * spd,
      r: rand(4, 8), color: Math.random() > 0.5 ? boss.color : boss.color2,
      shape: 'diamond', rot: rand(0, Math.PI * 2), rotSpd: rand(-3, 3), frozen: false,
    });
  }
  moveBullets(g, dt);
  g.bullets = g.bullets.filter(b => b.y < BY + BH + 20 && b.x > BX - 30 && b.x < BX + BW + 30);
}

// Wave 2 (atkIdx=1): Static laser walls.
// Wave 5 (atkIdx=4): Walls pulse off then on again — two shots from same positions.
function doMirrorWalls(g: GameData, dt: number, boss: BossConf) {
  const variant = waveVariant(g);
  const pulse2 = variant > 0;

  if (g.phase === 0) {
    if (g.laserWarns.length === 0) {
      const hCount = randInt(2, 3);
      const usedY: number[] = [];
      for (let i = 0; i < hCount; i++) {
        let y: number, tries = 0;
        do { y = rand(BY + 35, BY + BH - 35); tries++; }
        while (usedY.some(u => Math.abs(u - y) < 55) && tries < 20);
        usedY.push(y);
        g.laserWarns.push({ id: nid(g), type: 'h', pos: y, width: 20, timer: 1.6, color: boss.color, fake: false });
      }
      for (let i = 0; i < randInt(1, 2); i++) {
        const x = rand(BX + 45, BX + BW - 45);
        g.laserWarns.push({ id: nid(g), type: 'v', pos: x, width: 14, timer: 1.6, color: boss.color2, fake: false });
      }
    }
    for (const lw of g.laserWarns) lw.timer -= dt;
    g.phaseTimer += dt;
    if (g.phaseTimer >= 1.6) {
      g.phase = 1; g.phaseTimer = 0;
      g.lasers = g.laserWarns.map(lw => ({ id: nid(g), type: lw.type, pos: lw.pos, width: lw.width, timer: 2.2, color: lw.color }));
      g.laserSnapshot = g.laserWarns.map(lw => ({ type: lw.type, pos: lw.pos, width: lw.width, color: lw.color }));
      g.laserWarns = [];
      shake(g);
    }
  } else if (g.phase === 1) {
    for (const l of g.lasers) l.timer -= dt;
    g.phaseTimer += dt;
    if (g.phaseTimer >= (pulse2 ? 1.0 : 2.2)) {
      g.lasers = [];
      g.phase = pulse2 ? 2 : 99;
      g.phaseTimer = 0;
    }
  } else if (g.phase === 2) {
    // Brief gap then second shot — same wall positions as first pulse
    g.phaseTimer += dt;
    if (g.phaseTimer >= 0.5) {
      for (const snap of g.laserSnapshot) {
        g.lasers.push({ id: nid(g), type: snap.type, pos: snap.pos, width: snap.width, timer: 1.8, color: snap.color });
      }
      shake(g); g.phase = 3; g.phaseTimer = 0;
    }
  } else if (g.phase === 3) {
    for (const l of g.lasers) l.timer -= dt;
    g.lasers = g.lasers.filter(l => l.timer > 0);
    g.phaseTimer += dt;
    if (g.phaseTimer >= 1.8) { g.lasers = []; g.phase = 99; }
  } else {
    g.phaseTimer += dt;
    if (g.phaseTimer >= 0.9) { g.phase = 0; g.phaseTimer = 0; }
  }
}

// Wave 3: Two rings simultaneously from off-center points.
function doShatterPulse(g: GameData, dt: number, boss: BossConf) {
  const dualOrigin = g.bossIdx === 0 && g.atkIdx === 2;
  const maxRings = dualOrigin ? 6 : 4;
  const baseInterval = dualOrigin ? 1.1 : 1.5;

  g.spawnTimer -= dt;
  if (g.spawnTimer <= 0 && g.spawnCount < maxRings) {
    g.spawnTimer = baseInterval;
    g.spawnCount++;
    const gapCount = dualOrigin ? 2 + g.spawnCount : 3 + g.spawnCount;
    const spawnPoints = dualOrigin
      ? [{ cx: BX + BW * 0.32, cy: BCY - 20 }, { cx: BX + BW * 0.68, cy: BCY + 20 }]
      : [{ cx: BCX, cy: BCY }];
    for (const sp of spawnPoints) {
      const gaps: number[] = [];
      const step = (Math.PI * 2) / gapCount;
      const offset = rand(0, step);
      for (let i = 0; i < gapCount; i++) gaps.push(offset + i * step);
      const spd = sm(g);
      g.rings.push({
        id: nid(g), cx: sp.cx, cy: sp.cy, r: 12,
        speed: rand(125, 175) * spd,
        thick: dualOrigin ? 24 : 20,
        gaps,
        gapSz: dualOrigin
          ? Math.PI / (3.5 + g.spawnCount * 0.5)
          : Math.PI / (2.8 + g.bossIdx * 0.4),
        color: boss.color,
      });
    }
  }
  for (const ring of g.rings) ring.r += ring.speed * dt;
  g.rings = g.rings.filter(ring => ring.r < 420);
}

// ================================================================
// BOSS 2: Mawbyte — distinct waves
// ================================================================

// Wave 1 (atkIdx=0): Single edge fires.
// Wave 4 (atkIdx=3): Two OPPOSITE edges fire simultaneously.
function doBitStorm(g: GameData, dt: number, boss: BossConf) {
  const variant = waveVariant(g);
  const dualEdge = variant > 0;

  if (g.phase === 0) {
    if (g.selectedEdge < 0) {
      g.selectedEdge = randInt(0, 3);
      const edges = dualEdge ? [g.selectedEdge, (g.selectedEdge + 2) % 4] : [g.selectedEdge];
      for (const edge of edges) {
        const count = 9;
        for (let i = 0; i < count; i++) {
          const t = i / (count - 1);
          let x: number, y: number, angle: number;
          if (edge === 0)      { x = BX + BW * t; y = BY;      angle = Math.PI / 2; }
          else if (edge === 1) { x = BX + BW;     y = BY + BH * t; angle = Math.PI; }
          else if (edge === 2) { x = BX + BW * t; y = BY + BH; angle = -Math.PI / 2; }
          else                 { x = BX;           y = BY + BH * t; angle = 0; }
          g.warnMarkers.push({ id: nid(g), x, y, angle, r: 6, color: boss.color, timer: 0.55, maxTimer: 0.55 });
        }
      }
    }
    g.phaseTimer += dt;
    if (g.phaseTimer >= 0.55) { g.phase = 1; g.phaseTimer = 0; g.warnMarkers = []; }
  } else if (g.phase === 1) {
    g.spawnTimer -= dt;
    if (g.spawnTimer <= 0) {
      g.spawnTimer = st(0.28, g);
      g.spawnCount++;
      const edges = dualEdge ? [g.selectedEdge >= 0 ? g.selectedEdge : 0, ((g.selectedEdge >= 0 ? g.selectedEdge : 0) + 2) % 4] : [g.selectedEdge >= 0 ? g.selectedEdge : 0];
      const spd = sm(g) * 0.88;
      const count = 5;
      for (const edge of edges) {
        for (let i = 0; i < count; i++) {
          let x: number, y: number, vx: number, vy: number;
          const spread = rand(-25, 25);
          if (edge === 0)      { x = BX + BW * (i / count); y = BY - 5;      vx = spread * 0.4; vy = rand(85, 130) * spd; }
          else if (edge === 1) { x = BX + BW + 5;            y = BY + BH * (i / count); vx = rand(-130, -85) * spd; vy = spread * 0.4; }
          else if (edge === 2) { x = BX + BW * (i / count); y = BY + BH + 5; vx = spread * 0.4; vy = rand(-130, -85) * spd; }
          else                 { x = BX - 5;                 y = BY + BH * (i / count); vx = rand(85, 130) * spd;  vy = spread * 0.4; }
          g.bullets.push({ id: nid(g), x, y, vx, vy, r: 5, color: i % 2 === 0 ? boss.color : boss.color2, shape: 'square', rot: 0, rotSpd: rand(-2, 2), frozen: false });
        }
      }
      if (g.spawnCount >= 4) { g.phase = 2; g.phaseTimer = 0; }
    }
    moveBullets(g, dt);
    g.bullets = g.bullets.filter(b => b.x > BX - 65 && b.x < BX + BW + 65 && b.y > BY - 65 && b.y < BY + BH + 65);
  } else {
    moveBullets(g, dt);
    g.bullets = g.bullets.filter(b => b.x > BX - 65 && b.x < BX + BW + 65 && b.y > BY - 65 && b.y < BY + BH + 65);
    g.phaseTimer += dt;
    if (g.phaseTimer >= 0.5) { g.phase = 0; g.phaseTimer = 0; g.spawnCount = 0; g.selectedEdge = -1; }
  }
}

// Wave 2 (atkIdx=1): Single sweep.
// Wave 5 (atkIdx=4): Two sweeps — one forward, one reverse.
function doErrorSweep(g: GameData, dt: number, boss: BossConf) {
  const variant = waveVariant(g);
  const doubleSweep = variant > 0;

  if (g.phase === 0) {
    if (g.laserWarns.length === 0) {
      const isH = Math.random() > 0.35;
      const entryPos = isH ? BY : BX;
      g.laserWarns.push({ id: nid(g), type: isH ? 'h' : 'v', pos: entryPos, width: 72, timer: 1.1, color: boss.color, fake: false });
    }
    for (const lw of g.laserWarns) lw.timer -= dt;
    g.phaseTimer += dt;
    if (g.phaseTimer >= 1.1) {
      g.phase = 1; g.phaseTimer = 0;
      const lw = g.laserWarns[0];
      g.lasers.push({ id: nid(g), type: lw.type, pos: lw.pos, width: 72, timer: 6.0, color: boss.color });
      g.laserWarns = []; shake(g);
    }
  } else if (g.phase === 1) {
    const lType = g.lasers[0]?.type;
    const sweepSpeed = lType === 'h' ? (BH + 80) / 2.2 : (BW + 80) / 2.2;
    for (const l of g.lasers) { l.pos += sweepSpeed * dt; l.timer -= dt; }
    g.lasers = g.lasers.filter(l => l.type === 'h' ? l.pos < BY + BH + 50 : l.pos < BX + BW + 50);
    if (g.lasers.length === 0) {
      if (doubleSweep) { g.phase = 3; g.phaseTimer = 0; } // Start reverse sweep
      else { g.phase = 2; g.phaseTimer = 0; }
    }
  } else if (g.phase === 3) {
    // Brief pause then reverse sweep
    g.phaseTimer += dt;
    if (g.phaseTimer >= 0.35) {
      // Add reverse-direction warn
      const newType = Math.random() > 0.35 ? 'h' : 'v';
      const startPos = newType === 'h' ? BY + BH : BX + BW;
      g.laserWarns.push({ id: nid(g), type: newType, pos: startPos, width: 60, timer: 0.8, color: boss.color2, fake: false });
      g.phase = 4; g.phaseTimer = 0;
    }
  } else if (g.phase === 4) {
    for (const lw of g.laserWarns) lw.timer -= dt;
    g.phaseTimer += dt;
    if (g.phaseTimer >= 0.8) {
      const lw = g.laserWarns[0];
      if (lw) {
        g.lasers.push({ id: nid(g), type: lw.type, pos: lw.pos, width: 60, timer: 5.0, color: boss.color2 });
        g.laserWarns = []; shake(g);
      }
      g.phase = 5; g.phaseTimer = 0;
    }
  } else if (g.phase === 5) {
    const lType = g.lasers[0]?.type;
    const sweepSpeed = lType === 'h' ? (BH + 80) / 2.0 : (BW + 80) / 2.0;
    for (const l of g.lasers) { l.pos -= sweepSpeed * dt; l.timer -= dt; }
    g.lasers = g.lasers.filter(l => l.type === 'h' ? l.pos > BY - 50 : l.pos > BX - 50);
    if (g.lasers.length === 0) { g.phase = 2; g.phaseTimer = 0; }
  } else {
    g.phaseTimer += dt;
    if (g.phaseTimer >= 0.6) { g.phase = 0; g.phaseTimer = 0; }
  }
}

// Wave 3 (atkIdx=2): Fixed safe lane.
// Wave 6 (atkIdx=5): Safe lane CHANGES midway through.
function doDevourLane(g: GameData, dt: number, boss: BossConf) {
  const variant = waveVariant(g);
  const laneSwitch = variant > 0;

  if (g.phase === 0) {
    if (g.devourLane < 0) { g.devourLane = randInt(0, 4); g.devourActive = false; }
    g.phaseTimer += dt;
    if (g.phaseTimer >= 1.8) { g.phase = 1; g.phaseTimer = 0; g.devourActive = true; g.spawnTimer = 0; }
  } else if (g.phase === 1) {
    // Switch lane halfway if variant
    if (laneSwitch && g.phaseTimer >= 1.75 && g.phaseTimer - dt < 1.75) {
      // Change safe lane
      let newLane: number;
      do { newLane = randInt(0, 4); } while (newLane === g.devourLane);
      g.devourLane = newLane;
      shake(g);
    }
    g.spawnTimer -= dt;
    if (g.spawnTimer <= 0) {
      g.spawnTimer = st(0.22, g);
      const spd = sm(g);
      const lH = BH / 5;
      for (let lane = 0; lane < 5; lane++) {
        if (lane === g.devourLane) continue;
        const ly = BY + lane * lH + lH / 2;
        g.bullets.push({ id: nid(g), x: rand(BX + 10, BX + BW - 10), y: BY - 8, vx: rand(-20, 20) * spd, vy: rand(140, 200) * spd, r: 5, color: boss.color, shape: 'square', rot: 0, rotSpd: rand(-2, 2), frozen: false });
        if (Math.random() > 0.6) {
          g.bullets.push({ id: nid(g), x: BX - 8, y: ly + rand(-20, 20), vx: rand(110, 170) * spd, vy: rand(-20, 20) * spd, r: 5, color: boss.color2, shape: 'circle', rot: 0, rotSpd: 0, frozen: false });
        }
      }
    }
    moveBullets(g, dt);
    g.bullets = g.bullets.filter(b => b.x > BX - 80 && b.x < BX + BW + 80 && b.y > BY - 20 && b.y < BY + BH + 80);
    g.phaseTimer += dt;
    if (g.phaseTimer >= 3.5) { g.phase = 2; g.phaseTimer = 0; g.devourActive = false; g.devourLane = -1; g.bullets = []; }
  } else {
    g.phaseTimer += dt;
    if (g.phaseTimer >= 0.6) { g.phase = 0; g.phaseTimer = 0; }
  }
}

// ================================================================
// BOSS 3: Seraph Null — distinct waves
// ================================================================

// Wave 1 (atkIdx=0): Normal spiral.
// Wave 4 (atkIdx=3): Spiral reverses direction once at spawnCount=22.
function doHaloSpiral(g: GameData, dt: number, boss: BossConf) {
  const variant = waveVariant(g);
  const reverses = variant > 0;

  if (g.phase === 0) {
    if (g.warnMarkers.length === 0) {
      const arms = 5;
      const baseAngle = g.time * 1.6;
      for (let arm = 0; arm < arms; arm++) {
        const angle = baseAngle + (arm * Math.PI * 2) / arms;
        for (let d = 1; d <= 5; d++) {
          g.warnMarkers.push({ id: nid(g), x: BCX + Math.cos(angle) * d * 28, y: (BY - 55) + Math.sin(angle) * d * 18, angle, r: 4, color: boss.color, timer: 0.8, maxTimer: 0.8 });
        }
      }
    }
    g.phaseTimer += dt;
    if (g.phaseTimer >= 0.8) { g.phase = 1; g.phaseTimer = 0; g.warnMarkers = []; }
    return;
  }

  g.spawnTimer -= dt;
  const arms = 5;
  if (g.spawnTimer <= 0) {
    g.spawnTimer = st(0.09, g);
    g.spawnCount++;
    // Reverse direction after 22 bursts
    const dirMult = (reverses && g.spawnCount > 22) ? -1 : 1;
    const baseAngle = g.time * 1.6 * dirMult;
    const spd = sm(g);
    for (let arm = 0; arm < arms; arm++) {
      const angle = baseAngle + (arm * Math.PI * 2) / arms;
      g.bullets.push({ id: nid(g), x: BCX, y: BY - 55, vx: Math.cos(angle) * 135 * spd, vy: Math.sin(angle) * 135 * spd, r: 5, color: boss.color, shape: 'circle', rot: 0, rotSpd: 0, frozen: false });
    }
  }
  moveBullets(g, dt);
  g.bullets = g.bullets.filter(b => b.x > -60 && b.x < W + 60 && b.y > -60 && b.y < H + 60);
}

// Wave 2 (atkIdx=1): 3 beams, 1 fake.
// Wave 5 (atkIdx=4): 5 beams, 2 fakes — harder to distinguish.
function doJudgmentBeams(g: GameData, dt: number, boss: BossConf) {
  const variant = waveVariant(g);
  const moreBeams = variant > 0;

  if (g.phase === 0) {
    if (g.diagWarns.length === 0) {
      const angles = moreBeams ? [0.22, 0.44, 0.66, 0.88, 1.1] : [0.28, 0.55, 0.78];
      const fakeSet = moreBeams ? new Set([1, 3]) : new Set([1]);
      for (let i = 0; i < angles.length; i++) {
        const isFake = fakeSet.has(i) && Math.random() > 0.35;
        const angle = angles[i];
        const len = 270;
        g.diagWarns.push({
          id: nid(g),
          x1: BCX - Math.cos(angle) * len, y1: BCY - Math.sin(angle) * len,
          x2: BCX + Math.cos(angle) * len, y2: BCY + Math.sin(angle) * len,
          width: 22, timer: 1.6, color: isFake ? '#443300' : boss.color, fake: isFake,
        });
      }
    }
    for (const dw of g.diagWarns) dw.timer -= dt;
    g.phaseTimer += dt;
    if (g.phaseTimer >= 1.6) {
      g.phase = 1; g.phaseTimer = 0;
      g.diagLasers = g.diagWarns.filter(dw => !dw.fake).map(dw => ({ id: nid(g), x1: dw.x1, y1: dw.y1, x2: dw.x2, y2: dw.y2, width: dw.width, timer: 2.2, color: boss.color }));
      g.diagWarns = []; shake(g);
    }
  } else if (g.phase === 1) {
    for (const dl of g.diagLasers) dl.timer -= dt;
    g.diagLasers = g.diagLasers.filter(dl => dl.timer > 0);
    g.phaseTimer += dt;
    if (g.phaseTimer >= 2.2) { g.phase = 2; g.phaseTimer = 0; g.diagLasers = []; }
  } else {
    g.phaseTimer += dt;
    if (g.phaseTimer >= 1.0) { g.phase = 0; g.phaseTimer = 0; }
  }
}

// Wave 3: Alternating L/R volleys.
// Variant: volleys from all 4 corners in rotating order.
function doWingBarrage(g: GameData, dt: number, boss: BossConf) {
  const variant = waveVariant(g);

  if (g.phase === 0) {
    if (g.laserWarns.length === 0) {
      g.laserWarns.push({ id: nid(g), type: 'v', pos: BX + 10,      width: 22, timer: 0.65, color: boss.color,  fake: false });
      g.laserWarns.push({ id: nid(g), type: 'v', pos: BX + BW - 10, width: 22, timer: 0.65, color: boss.color2, fake: false });
    }
    for (const lw of g.laserWarns) lw.timer -= dt;
    g.phaseTimer += dt;
    if (g.phaseTimer >= 0.65) { g.phase = 1; g.phaseTimer = 0; g.laserWarns = []; }
    return;
  }

  g.spawnTimer -= dt;
  if (g.spawnTimer <= 0) {
    g.spawnTimer = st(0.2, g);
    g.spawnCount++;
    const count = 7 + Math.floor(g.spawnCount / 12);
    const spd = sm(g);

    if (variant === 0) {
      // Standard: alternating L/R
      for (let i = 0; i < count; i++) {
        const y = BY + BH * (i / (count - 1));
        const a = rand(-0.25, 0.25);
        g.bullets.push({ id: nid(g), x: BX - 5, y, vx: Math.cos(a) * 170 * spd, vy: Math.sin(a) * 170 * spd, r: 6, color: boss.color, shape: 'diamond', rot: 0, rotSpd: 0, frozen: false });
      }
      if (g.spawnCount % 2 === 0) {
        for (let i = 0; i < count; i++) {
          const y = BY + BH * (i / (count - 1));
          const a = Math.PI + rand(-0.25, 0.25);
          g.bullets.push({ id: nid(g), x: BX + BW + 5, y, vx: Math.cos(a) * 170 * spd, vy: Math.sin(a) * 170 * spd, r: 6, color: boss.color2, shape: 'diamond', rot: 0, rotSpd: 0, frozen: false });
        }
      }
    } else {
      // Variant: rotate through all 4 corners
      const corner = g.spawnCount % 4;
      const corners = [
        { x: BX - 5,       y: BY - 5,       ax:  0.5, ay:  0.5 },  // TL
        { x: BX + BW + 5,  y: BY - 5,       ax: -0.5, ay:  0.5 },  // TR
        { x: BX - 5,       y: BY + BH + 5,  ax:  0.5, ay: -0.5 },  // BL
        { x: BX + BW + 5,  y: BY + BH + 5,  ax: -0.5, ay: -0.5 },  // BR
      ];
      const c = corners[corner];
      for (let i = 0; i < count; i++) {
        const spread = rand(-0.3, 0.3);
        g.bullets.push({ id: nid(g), x: c.x, y: c.y + BH * (i / (count - 1)) - BH / 2, vx: (c.ax + spread) * 200 * spd, vy: (c.ay + spread * 0.5) * 200 * spd, r: 6, color: corner % 2 === 0 ? boss.color : boss.color2, shape: 'diamond', rot: 0, rotSpd: 0, frozen: false });
      }
    }
  }
  moveBullets(g, dt);
  g.bullets = g.bullets.filter(b => b.x > BX - 90 && b.x < BX + BW + 90 && b.y > BY - 20 && b.y < BY + BH + 20);
}

// ================================================================
// BOSS 4: Orryx — distinct waves
// ================================================================

// Wave 1: Gears move normally.
// Wave 4: Gears bounce off walls.
// Wave 6: Gears + bullet rain.
function doGearMaze(g: GameData, dt: number, boss: BossConf) {
  const variant = waveVariant(g);

  if (g.phase === 0) {
    if (g.warnMarkers.length === 0) {
      for (let i = 0; i < 3; i++) {
        const fromLeft = i % 2 === 0;
        g.warnMarkers.push({ id: nid(g), x: fromLeft ? BX : BX + BW, y: BY + BH * (0.2 + i * 0.3), angle: fromLeft ? 0 : Math.PI, r: 10, color: boss.color, timer: 0.9, maxTimer: 0.9 });
      }
    }
    g.phaseTimer += dt;
    if (g.phaseTimer >= 0.9) { g.phase = 1; g.phaseTimer = 0; g.warnMarkers = []; }
    return;
  }

  if (g.gears.length === 0) {
    for (let i = 0; i < 3; i++) {
      const fromLeft = i % 2 === 0;
      const spd = sm(g);
      g.gears.push({ id: nid(g), cx: fromLeft ? BX - 45 : BX + BW + 45, cy: BY + BH * (0.2 + i * 0.3), r: 32 + i * 7, rot: 0, rotSpd: fromLeft ? rand(0.9, 1.6) : rand(-1.6, -0.9), color: boss.color, vx: (fromLeft ? rand(48, 72) : rand(-72, -48)) * spd, vy: 0 });
    }
  }

  const spdMult = g.timeDistorted ? (0.55 + Math.abs(Math.sin(g.time * 3.5)) * 0.9) : 1.0;
  for (const gear of g.gears) {
    gear.cx += gear.vx * spdMult * dt;
    gear.rot += gear.rotSpd * dt;
    if (variant >= 1) {
      // Bounce off walls
      if (gear.cx > BX + BW + gear.r * 2.0) { gear.vx = -Math.abs(gear.vx); }
      if (gear.cx < BX - gear.r * 2.0)       { gear.vx =  Math.abs(gear.vx); }
    } else {
      if (gear.cx > BX + BW + gear.r * 2.2) gear.vx = -Math.abs(gear.vx);
      if (gear.cx < BX - gear.r * 2.2)       gear.vx =  Math.abs(gear.vx);
    }
  }

  // Wave 3 (variant=2): also rain bullets
  if (variant >= 2) {
    g.spawnTimer -= dt;
    if (g.spawnTimer <= 0) {
      g.spawnTimer = st(0.18, g);
      const spd = sm(g);
      g.bullets.push({ id: nid(g), x: rand(BX + 10, BX + BW - 10), y: BY - 8, vx: rand(-15, 15) * spd, vy: rand(110, 175) * spd, r: 5, color: boss.color2, shape: 'circle', rot: 0, rotSpd: 0, frozen: false });
    }
    moveBullets(g, dt);
    g.bullets = g.bullets.filter(b => b.y < BY + BH + 20 && b.x > BX - 20 && b.x < BX + BW + 20);
  }
}

// Wave 2: Two hands.
// Wave 5: Three hands at different speeds.
function doClockSlash(g: GameData, dt: number, boss: BossConf) {
  const variant = waveVariant(g);
  const threeHands = variant > 0;

  if (g.phase === 0) {
    if (g.clockHands.length === 0) {
      const spd = sm(g);
      g.clockHands.push({ id: nid(g), cx: BCX, cy: BCY, len: BW * 0.44, wid: 12, angle: 0, rotSpd: 1.25 * spd, color: boss.color, warming: true });
      g.clockHands.push({ id: nid(g), cx: BCX, cy: BCY, len: BW * 0.28, wid: 16, angle: Math.PI, rotSpd: -0.9 * spd, color: boss.color2, warming: true });
      if (threeHands) {
        g.clockHands.push({ id: nid(g), cx: BCX, cy: BCY, len: BW * 0.35, wid: 10, angle: Math.PI * 0.5, rotSpd: 2.1 * spd, color: '#ffff00', warming: true });
      }
    }
    g.phaseTimer += dt;
    for (const hand of g.clockHands) hand.angle += hand.rotSpd * dt;
    if (g.phaseTimer >= 1.2) {
      g.phase = 1;
      for (const hand of g.clockHands) hand.warming = false;
      shake(g);
    }
  } else {
    for (const hand of g.clockHands) hand.angle += hand.rotSpd * dt;
  }
}

// Wave 3: Bullets freeze then resume.
// Variant: On unfreeze, each bullet spawns a child bullet in a perpendicular direction.
function doTimeFreeze(g: GameData, dt: number, boss: BossConf) {
  const variant = waveVariant(g);

  if (g.phase === 0) {
    g.spawnTimer -= dt;
    if (g.spawnTimer <= 0) {
      g.spawnTimer = st(0.14, g);
      g.spawnCount++;
      const angle = (g.spawnCount * Math.PI * 2) / 18;
      const spd = sm(g);
      g.bullets.push({ id: nid(g), x: BCX, y: BY - 55, vx: Math.cos(angle) * 95 * spd, vy: Math.sin(angle) * 95 * spd, r: 7, color: boss.color, shape: 'circle', rot: 0, rotSpd: 0, frozen: false });
    }
    moveBullets(g, dt);
    g.phaseTimer += dt;
    if (g.phaseTimer >= 2.2) {
      g.phase = 1; g.phaseTimer = 0; g.timeFrozen = true;
      for (const b of g.bullets) b.frozen = true;
    }
  } else if (g.phase === 1) {
    g.phaseTimer += dt;
    if (g.phaseTimer >= 2.4) {
      g.phase = 2; g.phaseTimer = 0; g.timeFrozen = false;
      const newBullets: Bullet[] = [];
      for (const b of g.bullets) {
        b.frozen = false; b.vx *= 1.8; b.vy *= 1.8;
        // Variant: spawn child bullet perpendicular
        if (variant > 0) {
          newBullets.push({ id: nid(g), x: b.x, y: b.y, vx: b.vy * 0.7, vy: -b.vx * 0.7, r: 5, color: boss.color2, shape: 'diamond', rot: 0, rotSpd: rand(-3, 3), frozen: false });
        }
      }
      g.bullets.push(...newBullets);
      shake(g);
    }
  } else {
    moveBullets(g, dt);
    g.bullets = g.bullets.filter(b => b.x > -60 && b.x < W + 60 && b.y > -60 && b.y < H + 60);
  }
}

// ================================================================
// BOSS 5: The Unreadable King — distinct waves
// ================================================================

// Wave 1 (atkIdx=0): Dense rain from above.
// Wave 5 (atkIdx=4): Alternates dense column clusters and wide scattered shots.
function doImpossibleScript(g: GameData, dt: number, boss: BossConf) {
  const variant = waveVariant(g);

  if (g.phase === 0) {
    if (g.warnMarkers.length === 0) {
      const count = 30;
      for (let i = 0; i < count; i++) {
        g.warnMarkers.push({ id: nid(g), x: BX + BW * (i / (count - 1)), y: BY, angle: Math.PI / 2, r: 5, color: boss.color, timer: 0.65, maxTimer: 0.65 });
      }
    }
    g.phaseTimer += dt;
    if (g.phaseTimer >= 0.65) { g.phase = 1; g.phaseTimer = 0; g.warnMarkers = []; }
    return;
  }

  g.spawnTimer -= dt;
  if (g.spawnTimer <= 0) {
    g.spawnTimer = st(0.055, g);
    g.spawnCount++;
    const spd = sm(g);

    if (variant === 0) {
      const x = rand(BX + 4, BX + BW - 4);
      g.bullets.push({ id: nid(g), x, y: BY - 5, vx: rand(-12, 12) * spd, vy: rand(160, 285) * spd, r: 4, color: Math.random() > 0.5 ? boss.color : boss.color2, shape: 'circle', rot: 0, rotSpd: 0, frozen: false });
    } else {
      // Alternating: dense columns vs wide scatter
      if (g.spawnCount % 14 < 7) {
        // Dense cluster at 2 fixed columns
        for (const cx of [BX + BW * 0.3, BX + BW * 0.7]) {
          g.bullets.push({ id: nid(g), x: cx + rand(-18, 18), y: BY - 5, vx: rand(-8, 8) * spd, vy: rand(175, 300) * spd, r: 5, color: boss.color, shape: 'circle', rot: 0, rotSpd: 0, frozen: false });
        }
      } else {
        // Wide scatter from top
        for (let i = 0; i < 3; i++) {
          const x = rand(BX + 4, BX + BW - 4);
          g.bullets.push({ id: nid(g), x, y: BY - 5, vx: rand(-30, 30) * spd, vy: rand(100, 180) * spd, r: 4, color: boss.color2, shape: 'diamond', rot: rand(0, 6), rotSpd: rand(-3, 3), frozen: false });
        }
      }
    }
  }
  moveBullets(g, dt);
  g.bullets = g.bullets.filter(b => b.y < BY + BH + 15 && b.x > BX - 10 && b.x < BX + BW + 10);
}

// Wave 2: Crown from top edges converging to center. Variant: 4 corners.
function doCrownCollapse(g: GameData, dt: number, boss: BossConf) {
  const variant = waveVariant(g);
  const fourCorners = variant > 0;

  if (g.phase === 0) {
    if (g.warnMarkers.length === 0) {
      const streams = 7;
      for (let i = 0; i < streams; i++) {
        const startX = BX + BW * (i / (streams - 1));
        for (let d = 0; d < 5; d++) {
          const t = d / 4;
          const x = startX + (BCX - startX) * t;
          const y = BY + (BCY - BY) * t;
          g.warnMarkers.push({ id: nid(g), x, y, angle: Math.atan2(BCY - BY, BCX - startX), r: 4, color: i % 2 === 0 ? boss.color : boss.color2, timer: 0.9, maxTimer: 0.9 });
        }
      }
      if (fourCorners) {
        // Extra markers from bottom corners
        const bCorners = [{ sx: BX, sy: BY + BH }, { sx: BX + BW, sy: BY + BH }];
        for (const { sx, sy } of bCorners) {
          for (let d = 0; d < 4; d++) {
            const t = d / 3;
            g.warnMarkers.push({ id: nid(g), x: sx + (BCX - sx) * t, y: sy + (BCY - sy) * t, angle: Math.atan2(BCY - sy, BCX - sx), r: 4, color: boss.color2, timer: 0.9, maxTimer: 0.9 });
          }
        }
      }
    }
    g.phaseTimer += dt;
    if (g.phaseTimer >= 0.9) { g.phase = 1; g.phaseTimer = 0; g.warnMarkers = []; }
    return;
  }

  g.spawnTimer -= dt;
  if (g.spawnTimer <= 0) {
    g.spawnTimer = st(0.21, g);
    const streams = fourCorners ? 11 : 7;
    const spd = sm(g);
    const startXs: { sx: number; sy: number }[] = [];
    for (let i = 0; i < 7; i++) startXs.push({ sx: BX + BW * (i / 6), sy: BY - 5 });
    if (fourCorners) {
      startXs.push({ sx: BX - 5, sy: BY + BH + 5 });
      startXs.push({ sx: BX + BW + 5, sy: BY + BH + 5 });
      startXs.push({ sx: BCX, sy: BY + BH + 5 });
      startXs.push({ sx: BX - 5, sy: BCY });
    }
    for (let i = 0; i < Math.min(streams, startXs.length); i++) {
      const { sx, sy } = startXs[i];
      const targetX = BCX + rand(-15, 15), targetY = BCY;
      const dx = targetX - sx, dy = targetY - sy;
      const len = Math.sqrt(dx * dx + dy * dy) || 1;
      g.bullets.push({ id: nid(g), x: sx, y: sy, vx: (dx / len) * 165 * spd, vy: (dy / len) * 165 * spd, r: 5, color: i % 2 === 0 ? boss.color : boss.color2, shape: 'diamond', rot: 0, rotSpd: rand(-3, 3), frozen: false });
    }
  }
  moveBullets(g, dt);
  g.bullets = g.bullets.filter(b => b.x > BX - 25 && b.x < BX + BW + 25 && b.y > BY - 15 && b.y < BY + BH + 30);
}

function doRealityTear(g: GameData, dt: number) {
  g.spawnTimer -= dt;
  if (g.spawnTimer <= 0 && g.dangerZones.length < 4) {
    g.spawnTimer = rand(0.75, 1.4);
    const zw = rand(55, 115), zh = rand(48, 95);
    g.dangerZones.push({ id: nid(g), x: rand(BX + 4, BX + BW - zw - 4), y: rand(BY + 4, BY + BH - zh - 4), w: zw, h: zh, warnTimer: 1.0, activeTimer: 2.6, color: '#ff2222' });
  }
  for (const dz of g.dangerZones) {
    if (dz.warnTimer > 0) dz.warnTimer -= dt;
    else dz.activeTimer -= dt;
  }
  g.dangerZones = g.dangerZones.filter(dz => dz.warnTimer > 0 || dz.activeTimer > 0);
}

// Fake soul now actively mirrors player movement in the variant.
function doSoulSplit(g: GameData, dt: number, boss: BossConf) {
  if (g.phase === 0) {
    if (g.warnMarkers.length === 0) {
      for (let i = 0; i < 6; i++) {
        const a = (i * Math.PI * 2) / 6;
        g.warnMarkers.push({ id: nid(g), x: BCX + Math.cos(a) * 55, y: (BY - 55) + Math.sin(a) * 28, angle: a, r: 5, color: boss.color2, timer: 0.65, maxTimer: 0.65 });
      }
      if (!g.fakeSoul.active) {
        g.fakeSoul.active = true;
        g.fakeSoul.x = BX + BW - (g.player.x - BX);  // Mirror x
        g.fakeSoul.y = g.player.y;
      }
    }
    // Mirror movement in warning phase too
    g.fakeSoul.x = BX + BW - (g.player.x - BX);
    g.fakeSoul.y = g.player.y;
    g.phaseTimer += dt;
    if (g.phaseTimer >= 0.65) { g.phase = 1; g.phaseTimer = 0; g.warnMarkers = []; }
    return;
  }

  if (!g.fakeSoul.active) {
    g.fakeSoul.active = true;
    g.fakeSoul.x = BX + BW - (g.player.x - BX);
    g.fakeSoul.y = g.player.y;
  }
  // Mirror player exactly (mirrored x axis within the box)
  const mirrorX = BX + (BX + BW - g.player.x);
  g.fakeSoul.x += (mirrorX - g.fakeSoul.x) * 6.0 * dt;
  g.fakeSoul.y += (g.player.y - g.fakeSoul.y) * 6.0 * dt;

  g.spawnTimer -= dt;
  if (g.spawnTimer <= 0) {
    g.spawnTimer = st(0.38, g);
    const angle = g.time * 1.1;
    const spd = sm(g);
    for (let i = 0; i < 6; i++) {
      const a = angle + (i * Math.PI * 2) / 6;
      g.bullets.push({ id: nid(g), x: BCX, y: BY - 55, vx: Math.cos(a) * 115 * spd, vy: Math.sin(a) * 115 * spd, r: 5, color: boss.color, shape: 'circle', rot: 0, rotSpd: 0, frozen: false });
    }
  }
  moveBullets(g, dt);
  g.bullets = g.bullets.filter(b => b.x > -60 && b.x < W + 60 && b.y > -60 && b.y < H + 60);
}

function doFinalPattern(g: GameData, dt: number, boss: BossConf) {
  if (g.phase === 0) {
    if (g.warnMarkers.length === 0) {
      for (let i = 0; i < 16; i++) g.warnMarkers.push({ id: nid(g), x: BX + BW * (i / 15), y: BY, angle: Math.PI / 2, r: 4, color: boss.color, timer: 0.75, maxTimer: 0.75 });
      for (let arm = 0; arm < 4; arm++) {
        const a = (arm * Math.PI * 2) / 4;
        g.warnMarkers.push({ id: nid(g), x: BCX + Math.cos(a) * 52, y: (BY - 55) + Math.sin(a) * 28, angle: a, r: 5, color: boss.color2, timer: 0.75, maxTimer: 0.75 });
      }
    }
    g.phaseTimer += dt;
    if (g.phaseTimer >= 0.75) { g.phase = 1; g.phaseTimer = 0; g.warnMarkers = []; }
    return;
  }
  g.spawnTimer -= dt;
  const spd = sm(g);
  if (g.spawnTimer <= 0) {
    g.spawnTimer = st(0.075, g);
    g.bullets.push({ id: nid(g), x: rand(BX, BX + BW), y: BY - 5, vx: rand(-10, 10) * spd, vy: rand(165, 255) * spd, r: 4, color: boss.color, shape: 'circle', rot: 0, rotSpd: 0, frozen: false });
    const sa = g.time * 2.2;
    for (let arm = 0; arm < 4; arm++) {
      const a = sa + (arm * Math.PI * 2) / 4;
      g.bullets.push({ id: nid(g), x: BCX, y: BY - 55, vx: Math.cos(a) * 145 * spd, vy: Math.sin(a) * 145 * spd, r: 5, color: boss.color2, shape: 'circle', rot: 0, rotSpd: 0, frozen: false });
    }
  }
  g.phaseTimer += dt;
  if (g.phaseTimer > 3.8 && g.diagWarns.length === 0 && g.diagLasers.length === 0) {
    g.phaseTimer = 0;
    const angles = [0.3, 0.65, 0.9];
    for (const angle of angles) {
      const len = 265;
      g.diagWarns.push({ id: nid(g), x1: BCX - Math.cos(angle) * len, y1: BCY - Math.sin(angle) * len, x2: BCX + Math.cos(angle) * len, y2: BCY + Math.sin(angle) * len, width: 24, timer: 1.2, color: '#aa0000', fake: false });
    }
  }
  for (const dw of g.diagWarns) dw.timer -= dt;
  if (g.diagWarns.length > 0 && g.diagWarns[0].timer <= 0) {
    g.diagLasers = g.diagWarns.map(dw => ({ id: nid(g), x1: dw.x1, y1: dw.y1, x2: dw.x2, y2: dw.y2, width: dw.width, timer: 1.6, color: boss.color2 }));
    g.diagWarns = []; shake(g);
  }
  for (const dl of g.diagLasers) dl.timer -= dt;
  g.diagLasers = g.diagLasers.filter(dl => dl.timer > 0);
  moveBullets(g, dt);
  g.bullets = g.bullets.filter(b => b.x > -60 && b.x < W + 60 && b.y > -60 && b.y < H + 60);
}

// ================================================================
// BOSS 6: Nyxcoil, the Deep Current
// ================================================================

// Two-pass electric sweep (forward then reverse).
function doCurrentSurge(g: GameData, dt: number, boss: BossConf) {
  if (g.phase === 0) {
    if (g.laserWarns.length === 0) {
      const isH = Math.random() > 0.4;
      const entryPos = isH ? BY : BX;
      g.laserWarns.push({ id: nid(g), type: isH ? 'h' : 'v', pos: entryPos, width: 64, timer: 1.0, color: boss.color, fake: false });
    }
    for (const lw of g.laserWarns) lw.timer -= dt;
    g.phaseTimer += dt;
    if (g.phaseTimer >= 1.0) {
      const lw = g.laserWarns[0];
      g.lasers.push({ id: nid(g), type: lw.type, pos: lw.pos, width: 64, timer: 5.0, color: boss.color });
      g.laserWarns = []; g.phase = 1; g.phaseTimer = 0; shake(g);
    }
  } else if (g.phase === 1) {
    // Forward sweep
    const lType = g.lasers[0]?.type;
    const spd = lType === 'h' ? (BH + 80) / 2.0 : (BW + 80) / 2.0;
    for (const l of g.lasers) { l.pos += spd * dt; l.timer -= dt; }
    g.lasers = g.lasers.filter(l => l.type === 'h' ? l.pos < BY + BH + 50 : l.pos < BX + BW + 50);
    if (g.lasers.length === 0) { g.phase = 2; g.phaseTimer = 0; }
  } else if (g.phase === 2) {
    // Brief pause then add reverse warn
    g.phaseTimer += dt;
    if (g.phaseTimer >= 0.4) {
      const newType = Math.random() > 0.4 ? 'h' : 'v';
      const revPos = newType === 'h' ? BY + BH : BX + BW;
      g.laserWarns.push({ id: nid(g), type: newType, pos: revPos, width: 56, timer: 0.7, color: boss.color2, fake: false });
      g.phase = 3; g.phaseTimer = 0;
    }
  } else if (g.phase === 3) {
    for (const lw of g.laserWarns) lw.timer -= dt;
    g.phaseTimer += dt;
    if (g.phaseTimer >= 0.7) {
      const lw = g.laserWarns[0];
      if (lw) { g.lasers.push({ id: nid(g), type: lw.type, pos: lw.pos, width: 56, timer: 5.0, color: boss.color2 }); }
      g.laserWarns = []; g.phase = 4; g.phaseTimer = 0; shake(g);
    }
  } else if (g.phase === 4) {
    // Reverse sweep
    const lType = g.lasers[0]?.type;
    const spd = lType === 'h' ? (BH + 80) / 1.8 : (BW + 80) / 1.8;
    for (const l of g.lasers) { l.pos -= spd * dt; l.timer -= dt; }
    g.lasers = g.lasers.filter(l => l.type === 'h' ? l.pos > BY - 50 : l.pos > BX - 50);
    if (g.lasers.length === 0) { g.phase = 5; g.phaseTimer = 0; }
  } else {
    g.phaseTimer += dt;
    if (g.phaseTimer >= 0.6) { g.phase = 0; g.phaseTimer = 0; }
  }
}

// Three arc bullet streams that form a spiral cage. Gap on the far side from boss.
function doCoilTrap(g: GameData, dt: number, boss: BossConf) {
  if (g.phase === 0) {
    if (g.warnMarkers.length === 0) {
      // Show arc warning: 3 curved streams from boss position (above box)
      for (let arm = 0; arm < 3; arm++) {
        const baseA = (arm * Math.PI * 2) / 3;
        for (let d = 1; d <= 6; d++) {
          g.warnMarkers.push({ id: nid(g), x: BCX + Math.cos(baseA) * d * 32, y: (BY - 55) + Math.sin(baseA) * d * 20, angle: baseA, r: 4, color: boss.color, timer: 1.0, maxTimer: 1.0 });
        }
      }
    }
    g.phaseTimer += dt;
    if (g.phaseTimer >= 1.0) { g.phase = 1; g.phaseTimer = 0; g.warnMarkers = []; g.spawnCount = 0; }
  } else if (g.phase === 1) {
    g.spawnTimer -= dt;
    if (g.spawnTimer <= 0) {
      g.spawnTimer = st(0.07, g);
      g.spawnCount++;
      const spd = sm(g);
      // 3 rotating arc streams — gap always on right side (high angle)
      for (let arm = 0; arm < 3; arm++) {
        const baseA = g.time * 1.8 + (arm * Math.PI * 2) / 3;
        // Skip the gap zone (arm=2 side)
        if (arm === 2 && Math.sin(g.spawnCount * 0.1) > 0.3) continue;
        g.bullets.push({ id: nid(g), x: BCX, y: BY - 55, vx: Math.cos(baseA) * 140 * spd, vy: Math.sin(baseA) * 140 * spd, r: 6, color: arm === 0 ? boss.color : boss.color2, shape: 'circle', rot: 0, rotSpd: 0, frozen: false });
      }
    }
    moveBullets(g, dt);
    g.bullets = g.bullets.filter(b => b.x > -60 && b.x < W + 60 && b.y > -60 && b.y < H + 60);
  }
}

// Player pulled to one side. Bullets rain from pull direction.
function doUndertowPull(g: GameData, dt: number, boss: BossConf) {
  if (g.phase === 0) {
    // Warning: arrows show pull direction
    if (g.warnMarkers.length === 0) {
      const pullLeft = Math.random() > 0.5;
      g.currentPullX = pullLeft ? -38 : 38;
      g.currentPullY = 0;
      const arrowAngle = pullLeft ? Math.PI : 0;
      for (let i = 0; i < 5; i++) {
        g.warnMarkers.push({ id: nid(g), x: BCX + (i - 2) * 55, y: BCY, angle: arrowAngle, r: 9, color: boss.color, timer: 1.2, maxTimer: 1.2 });
      }
    }
    g.phaseTimer += dt;
    if (g.phaseTimer >= 1.2) { g.phase = 1; g.phaseTimer = 0; g.warnMarkers = []; g.pullActive = true; g.spawnTimer = 0; }
  } else if (g.phase === 1) {
    // Apply pull and rain bullets from the pull direction
    g.spawnTimer -= dt;
    if (g.spawnTimer <= 0) {
      g.spawnTimer = st(0.16, g);
      const spd = sm(g);
      const fromLeft = g.currentPullX < 0;
      // Bullets come from the wall toward which player is being pulled
      if (fromLeft) {
        g.bullets.push({ id: nid(g), x: BX - 6, y: rand(BY + 10, BY + BH - 10), vx: rand(90, 160) * spd, vy: rand(-25, 25) * spd, r: 6, color: boss.color, shape: 'circle', rot: 0, rotSpd: 0, frozen: false });
      } else {
        g.bullets.push({ id: nid(g), x: BX + BW + 6, y: rand(BY + 10, BY + BH - 10), vx: rand(-160, -90) * spd, vy: rand(-25, 25) * spd, r: 6, color: boss.color2, shape: 'circle', rot: 0, rotSpd: 0, frozen: false });
      }
      // Also some from top
      g.bullets.push({ id: nid(g), x: rand(BX + 10, BX + BW - 10), y: BY - 8, vx: g.currentPullX * 0.3 * spd, vy: rand(100, 160) * spd, r: 5, color: boss.color, shape: 'square', rot: 0, rotSpd: rand(-2, 2), frozen: false });
    }
    moveBullets(g, dt);
    g.bullets = g.bullets.filter(b => b.x > BX - 80 && b.x < BX + BW + 80 && b.y > BY - 20 && b.y < BY + BH + 80);
    g.phaseTimer += dt;
    if (g.phaseTimer >= 3.5) { g.phase = 2; g.phaseTimer = 0; g.pullActive = false; g.currentPullX = 0; g.bullets = []; }
  } else {
    g.phaseTimer += dt;
    if (g.phaseTimer >= 0.6) { g.phase = 0; g.phaseTimer = 0; }
  }
}

// ================================================================
// BOSS 7: Marrow Saint
// ================================================================

// Bone-shaped bullets in staggered columns, aimed at past player position.
function doBoneRain(g: GameData, dt: number, boss: BossConf) {
  if (g.phase === 0) {
    if (g.warnMarkers.length === 0) {
      const cols = 6;
      for (let c = 0; c < cols; c++) {
        const x = BX + BW * ((c + 0.5) / cols);
        g.warnMarkers.push({ id: nid(g), x, y: BY, angle: Math.PI / 2, r: 6, color: boss.color, timer: 1.0, maxTimer: 1.0 });
      }
    }
    g.phaseTimer += dt;
    if (g.phaseTimer >= 1.0) { g.phase = 1; g.phaseTimer = 0; g.warnMarkers = []; g.spawnCount = 0; }
  } else if (g.phase === 1) {
    g.spawnTimer -= dt;
    if (g.spawnTimer <= 0) {
      g.spawnTimer = st(0.12, g);
      g.spawnCount++;
      const spd = sm(g);
      const cols = 6;
      const colOffset = (g.spawnCount % 3) * (BW / (cols * 3));
      // Get past player position (aim at where player was ~1.5s ago)
      const pastPos = g.prevPlayerPositions.length > 0
        ? g.prevPlayerPositions[0]
        : { x: g.player.x, y: g.player.y };

      for (let c = 0; c < cols; c++) {
        const sx = BX + BW * ((c + 0.5) / cols) + colOffset;
        const dx = pastPos.x - sx, dy = pastPos.y - (BY - 5);
        const len = Math.sqrt(dx * dx + dy * dy) || 1;
        // Slight homing toward past position
        const bvx = (dx / len) * 0.35 * 150 * spd + rand(-10, 10) * spd;
        const bvy = rand(140, 210) * spd;
        g.bullets.push({ id: nid(g), x: sx, y: BY - 5, vx: bvx, vy: bvy, r: rand(4, 7), color: c % 2 === 0 ? boss.color : '#dddddd', shape: 'diamond', rot: rand(0, Math.PI * 2), rotSpd: rand(-2, 2), frozen: false });
      }
    }
    moveBullets(g, dt);
    g.bullets = g.bullets.filter(b => b.y < BY + BH + 20 && b.x > BX - 20 && b.x < BX + BW + 20);
  }
}

// Two bone walls close inward from left and right. An 80px gap stays open at the center (BCX).
function doRibCage(g: GameData, dt: number, boss: BossConf) {
  const wallWidth = 60;
  const gapHalf = 40;     // gap is 80px wide, centered at BCX
  const wallHalf = wallWidth / 2;
  // Left wall center stops at BCX - gapHalf - wallHalf; right at BCX + gapHalf + wallHalf
  const stopLeft  = BCX - gapHalf - wallHalf;
  const stopRight = BCX + gapHalf + wallHalf;
  const crushSpeed = (stopLeft - BX) / 1.8;

  if (g.phase === 0) {
    if (g.laserWarns.length === 0) {
      // Warn: two bone walls appearing from both sides
      g.laserWarns.push({ id: nid(g), type: 'v', pos: BX, width: wallWidth, timer: 1.3, color: boss.color, fake: false });
      g.laserWarns.push({ id: nid(g), type: 'v', pos: BX + BW, width: wallWidth, timer: 1.3, color: boss.color, fake: false });
    }
    for (const lw of g.laserWarns) lw.timer -= dt;
    g.phaseTimer += dt;
    if (g.phaseTimer >= 1.3) {
      g.lasers.push({ id: nid(g), type: 'v', pos: BX, width: wallWidth, timer: 4.0, color: boss.color });
      g.lasers.push({ id: nid(g), type: 'v', pos: BX + BW, width: wallWidth, timer: 4.0, color: boss.color });
      g.laserWarns = []; g.phase = 1; g.phaseTimer = 0; shake(g);
    }
  } else if (g.phase === 1) {
    // Move walls inward, stop with 80px gap centered at BCX
    if (g.lasers.length >= 2) {
      g.lasers[0].pos += crushSpeed * dt;
      g.lasers[1].pos -= crushSpeed * dt;
      g.lasers[0].pos = Math.min(g.lasers[0].pos, stopLeft);
      g.lasers[1].pos = Math.max(g.lasers[1].pos, stopRight);
    }
    for (const l of g.lasers) l.timer -= dt;
    g.phaseTimer += dt;
    if (g.phaseTimer >= 2.2) { g.lasers = []; g.phase = 2; g.phaseTimer = 0; }
  } else {
    g.phaseTimer += dt;
    if (g.phaseTimer >= 0.7) { g.phase = 0; g.phaseTimer = 0; }
  }
}

// 8 bullets orbit player for 2s (warning phase), then erupt outward.
function doHaloCurse(g: GameData, dt: number, boss: BossConf) {
  if (g.phase === 0) {
    // Show orbiting warn markers around player
    if (g.warnMarkers.length === 0) {
      for (let i = 0; i < 8; i++) {
        const a = (i * Math.PI * 2) / 8;
        g.warnMarkers.push({ id: nid(g), x: g.player.x + Math.cos(a) * 55, y: g.player.y + Math.sin(a) * 55, angle: a, r: 6, color: boss.color, timer: 1.8, maxTimer: 1.8 });
      }
      g.haloOrbitActive = true;
      g.haloOrbitTimer = 0;
    }
    // Update orbiting warn markers to follow player
    const orbitR = 55;
    for (let i = 0; i < g.warnMarkers.length; i++) {
      const a = (i * Math.PI * 2) / 8 + g.time * 1.2;
      g.warnMarkers[i].x = g.player.x + Math.cos(a) * orbitR;
      g.warnMarkers[i].y = g.player.y + Math.sin(a) * orbitR;
    }
    g.phaseTimer += dt;
    if (g.phaseTimer >= 1.8) {
      // ERUPT: spawn bullets from player position outward
      const spd = sm(g);
      for (let i = 0; i < 8; i++) {
        const a = (i * Math.PI * 2) / 8;
        g.bullets.push({ id: nid(g), x: g.player.x + Math.cos(a) * 50, y: g.player.y + Math.sin(a) * 50, vx: Math.cos(a) * 180 * spd, vy: Math.sin(a) * 180 * spd, r: 8, color: boss.color, shape: 'circle', rot: 0, rotSpd: 0, frozen: false });
        // Extra diagonal
        const a2 = a + Math.PI / 8;
        g.bullets.push({ id: nid(g), x: g.player.x + Math.cos(a2) * 30, y: g.player.y + Math.sin(a2) * 30, vx: Math.cos(a2) * 130 * spd, vy: Math.sin(a2) * 130 * spd, r: 5, color: boss.color2, shape: 'diamond', rot: 0, rotSpd: rand(-3, 3), frozen: false });
      }
      g.warnMarkers = []; g.haloOrbitActive = false;
      g.phase = 1; g.phaseTimer = 0; shake(g);
    }
  } else if (g.phase === 1) {
    moveBullets(g, dt);
    g.bullets = g.bullets.filter(b => b.x > -60 && b.x < W + 60 && b.y > -60 && b.y < H + 60);
    g.phaseTimer += dt;
    if (g.phaseTimer >= 2.5) { g.phase = 2; g.phaseTimer = 0; g.bullets = []; }
  } else {
    g.phaseTimer += dt;
    if (g.phaseTimer >= 0.6) { g.phase = 0; g.phaseTimer = 0; }
  }
}

// ================================================================
// BOSS 8: Luxora, Queen of False Stars
// ================================================================

// Real stars = dim purple bullets. Fake = bright gold, do not damage.
function doStarfall(g: GameData, dt: number, boss: BossConf) {
  if (g.phase === 0) {
    if (g.warnMarkers.length === 0) {
      const total = randInt(12, 16);
      const fakeCount = randInt(3, 4);
      const fakeIdxs = new Set<number>();
      while (fakeIdxs.size < fakeCount) fakeIdxs.add(randInt(0, total - 1));
      for (let i = 0; i < total; i++) {
        const isFake = fakeIdxs.has(i);
        g.warnMarkers.push({ id: nid(g), x: rand(BX + 12, BX + BW - 12), y: BY - 2, angle: Math.PI / 2, r: isFake ? 9 : 5, color: isFake ? boss.color2 : boss.color, timer: 1.2, maxTimer: 1.2 });
      }
    }
    g.phaseTimer += dt;
    if (g.phaseTimer >= 1.2) { g.phase = 1; g.phaseTimer = 0; g.warnMarkers = []; }
  } else if (g.phase === 1) {
    g.spawnTimer -= dt;
    if (g.spawnTimer <= 0) {
      g.spawnTimer = st(0.11, g);
      g.spawnCount++;
      const spd = sm(g);
      const isFake = Math.random() < 0.25;
      g.bullets.push({
        id: nid(g), x: rand(BX + 12, BX + BW - 12), y: BY - 8,
        vx: rand(-12, 12) * spd, vy: rand(150, 240) * spd,
        r: isFake ? 8 : 5,
        color: isFake ? boss.color2 + '44' : boss.color, // Fake stars are transparent and won't collide
        shape: 'diamond', rot: rand(0, Math.PI * 2), rotSpd: rand(-2, 2), frozen: isFake,  // frozen = no collision
      });
    }
    moveBullets(g, dt);
    g.bullets = g.bullets.filter(b => b.y < BY + BH + 20 && b.x > BX - 20 && b.x < BX + BW + 20);
    g.phaseTimer += dt;
    if (g.phaseTimer >= 3.5) { g.phase = 2; g.phaseTimer = 0; g.bullets = []; }
  } else {
    g.phaseTimer += dt;
    if (g.phaseTimer >= 0.5) { g.phase = 0; g.phaseTimer = 0; g.spawnCount = 0; }
  }
}

// Stars placed as glowing dots, then laser lines connect them.
function doConstellationLines(g: GameData, dt: number, boss: BossConf) {
  if (g.phase === 0) {
    if (g.starPoints.length === 0) {
      const count = randInt(4, 6);
      for (let i = 0; i < count; i++) {
        g.starPoints.push({ id: nid(g), x: rand(BX + 30, BX + BW - 30), y: rand(BY + 30, BY + BH - 30) });
      }
      // Show warn markers at star points
      for (const sp of g.starPoints) {
        g.warnMarkers.push({ id: nid(g), x: sp.x, y: sp.y, angle: 0, r: 8, color: boss.color2, timer: 1.4, maxTimer: 1.4 });
      }
    }
    g.phaseTimer += dt;
    if (g.phaseTimer >= 1.4) {
      // Activate laser lines connecting adjacent stars
      for (let i = 0; i < g.starPoints.length - 1; i++) {
        const a = g.starPoints[i], b2 = g.starPoints[i + 1];
        g.diagLasers.push({ id: nid(g), x1: a.x, y1: a.y, x2: b2.x, y2: b2.y, width: 16, timer: 2.2, color: boss.color });
      }
      // Connect last to first
      if (g.starPoints.length > 2) {
        const a = g.starPoints[g.starPoints.length - 1], b2 = g.starPoints[0];
        g.diagLasers.push({ id: nid(g), x1: a.x, y1: a.y, x2: b2.x, y2: b2.y, width: 16, timer: 2.2, color: boss.color });
      }
      g.warnMarkers = []; g.phase = 1; g.phaseTimer = 0; shake(g);
    }
  } else if (g.phase === 1) {
    for (const dl of g.diagLasers) dl.timer -= dt;
    g.diagLasers = g.diagLasers.filter(dl => dl.timer > 0);
    g.phaseTimer += dt;
    if (g.phaseTimer >= 2.2) { g.phase = 2; g.phaseTimer = 0; g.diagLasers = []; g.starPoints = []; }
  } else {
    g.phaseTimer += dt;
    if (g.phaseTimer >= 0.6) { g.phase = 0; g.phaseTimer = 0; }
  }
}

// Big gold fake star appears prominently, then real small stars erupt FROM that exact spot.
function doFalseStar(g: GameData, dt: number, boss: BossConf) {
  if (g.phase === 0) {
    // Show one big golden fake warn marker — record its exact position in starPoints
    if (g.warnMarkers.length === 0) {
      const cx = rand(BX + BW * 0.25, BX + BW * 0.75);
      const cy = rand(BY + BH * 0.25, BY + BH * 0.75);
      g.warnMarkers.push({ id: nid(g), x: cx, y: cy, angle: 0, r: 22, color: boss.color2, timer: 1.2, maxTimer: 1.2 });
      g.starPoints.push({ id: nid(g), x: cx, y: cy }); // store actual position for phase 1
    }
    g.phaseTimer += dt;
    if (g.phaseTimer >= 1.2) { g.phase = 1; g.phaseTimer = 0; g.warnMarkers = []; }
  } else if (g.phase === 1) {
    // Erupt real small stars outward from the fake star's actual position
    if (g.spawnTimer <= 0 && g.bullets.length < 5) {
      const star = g.starPoints[0];
      const eruCx = star ? star.x : BCX;
      const eruCy = star ? star.y : BCY;
      const spd = sm(g);
      for (let i = 0; i < 16; i++) {
        const a = (i / 16) * Math.PI * 2;
        const dist = rand(40, 120);
        g.bullets.push({ id: nid(g), x: eruCx + Math.cos(a) * dist * 0.4, y: eruCy + Math.sin(a) * dist * 0.4, vx: Math.cos(a) * (dist * 1.2) * spd, vy: Math.sin(a) * (dist * 1.2) * spd, r: 5, color: boss.color, shape: 'diamond', rot: 0, rotSpd: rand(-3, 3), frozen: false });
      }
      g.spawnTimer = 99; // fire once
    }
    g.spawnTimer -= dt;
    moveBullets(g, dt);
    g.bullets = g.bullets.filter(b => b.x > -60 && b.x < W + 60 && b.y > -60 && b.y < H + 60);
    g.phaseTimer += dt;
    if (g.phaseTimer >= 3.0) { g.phase = 2; g.phaseTimer = 0; g.bullets = []; g.starPoints = []; }
  } else {
    g.phaseTimer += dt;
    if (g.phaseTimer >= 0.5) { g.phase = 0; g.phaseTimer = 0; g.spawnCount = 0; }
  }
}

// ================================================================
// BOSS 9: Ruin Engine Omega
// ================================================================

// Piston blocks slam from left+right or top+bottom. Gap in center.
function doPistonCrush(g: GameData, dt: number, boss: BossConf) {
  if (g.phase === 0) {
    if (g.pistonBlocks.length === 0) {
      const horizontal = Math.random() > 0.5; // h = slabs from top+bottom, v = from left+right
      const gapSize = Math.max(60, 120 - (g.diffMult - 1) * 40); // harder = smaller gap
      const gapCenter = BCY;

      if (horizontal) {
        // Top slab: wide, entering from top
        g.pistonBlocks.push({ id: nid(g), x: BX, y: BY - 120, w: BW, h: 120, vx: 0, vy: 180, warnTimer: 1.1, active: false });
        // Bottom slab: entering from bottom
        g.pistonBlocks.push({ id: nid(g), x: BX, y: BY + BH, w: BW, h: 120, vx: 0, vy: -180, warnTimer: 1.1, active: false });
      } else {
        // Left slab entering from left
        g.pistonBlocks.push({ id: nid(g), x: BX - 160, y: BY, w: 160, h: BH, vx: 200, vy: 0, warnTimer: 1.1, active: false });
        // Right slab entering from right
        g.pistonBlocks.push({ id: nid(g), x: BX + BW, y: BY, w: 160, h: BH, vx: -200, vy: 0, warnTimer: 1.1, active: false });
      }
      g.arenaShrunken = false;
    }
    // Count down warn timers
    for (const pb of g.pistonBlocks) pb.warnTimer -= dt;
    g.phaseTimer += dt;
    if (g.phaseTimer >= 1.1) {
      for (const pb of g.pistonBlocks) { pb.active = true; pb.warnTimer = 0; }
      g.arenaShrunken = true;
      g.phase = 1; g.phaseTimer = 0; shake(g);
    }
  } else if (g.phase === 1) {
    // Move pistons
    const stopDist = 70; // how far they go
    for (const pb of g.pistonBlocks) {
      pb.x += pb.vx * dt;
      pb.y += pb.vy * dt;
      // Stop when they've entered enough
      if (pb.vx > 0 && pb.x > BX + stopDist) { pb.vx = 0; }
      if (pb.vx < 0 && pb.x + pb.w < BX + BW - stopDist) { pb.vx = 0; }
      if (pb.vy > 0 && pb.y > BY + stopDist) { pb.vy = 0; }
      if (pb.vy < 0 && pb.y + pb.h < BY + BH - stopDist) { pb.vy = 0; }
    }
    g.phaseTimer += dt;
    if (g.phaseTimer >= 1.8) { g.phase = 2; g.phaseTimer = 0; }
  } else if (g.phase === 2) {
    // Retract
    for (const pb of g.pistonBlocks) {
      if (pb.vy > 0 || (pb.vy === 0 && pb.y > BY - 120)) { pb.vy = pb.vy !== 0 ? -180 : -180; }
      if (pb.vx > 0 || (pb.vx === 0 && pb.x > BX - 160)) { pb.vx = pb.vx !== 0 ? -200 : -200; }
      pb.x += pb.vx * dt;
      pb.y += pb.vy * dt;
    }
    g.phaseTimer += dt;
    if (g.phaseTimer >= 1.0) { g.pistonBlocks = []; g.arenaShrunken = false; g.phase = 3; g.phaseTimer = 0; }
  } else {
    g.phaseTimer += dt;
    if (g.phaseTimer >= 0.7) { g.phase = 0; g.phaseTimer = 0; }
  }
}

// 4 rotating bullet arms firing from center.
function doEngineSpin(g: GameData, dt: number, boss: BossConf) {
  if (g.phase === 0) {
    // Warn: arm indicators spin briefly without shooting
    if (g.warnMarkers.length === 0) {
      for (let arm = 0; arm < 4; arm++) {
        const a = (arm * Math.PI * 2) / 4;
        for (let d = 1; d <= 4; d++) {
          g.warnMarkers.push({ id: nid(g), x: BCX + Math.cos(a) * d * 30, y: BCY + Math.sin(a) * d * 30, angle: a, r: 5, color: boss.color, timer: 0.8, maxTimer: 0.8 });
        }
      }
    }
    g.phaseTimer += dt;
    if (g.phaseTimer >= 0.8) { g.phase = 1; g.phaseTimer = 0; g.warnMarkers = []; }
  } else if (g.phase === 1) {
    // Accelerating spin
    const waveProgress = g.phaseTimer / 4.0;
    const rotSpeed = (1.8 + waveProgress * 2.4) * (g.diffMult > 1 ? g.diffMult : 1);
    g.engineSpinAngle += rotSpeed * dt;
    g.spawnTimer -= dt;
    if (g.spawnTimer <= 0) {
      g.spawnTimer = st(0.06, g);
      const spd = sm(g) * (1 + waveProgress * 0.5);
      for (let arm = 0; arm < 4; arm++) {
        const a = g.engineSpinAngle + (arm * Math.PI * 2) / 4;
        for (let j = 0; j < 3; j++) {
          const dist = 15 + j * 20;
          g.bullets.push({ id: nid(g), x: BCX + Math.cos(a) * dist, y: BCY + Math.sin(a) * dist, vx: Math.cos(a) * 155 * spd, vy: Math.sin(a) * 155 * spd, r: 5, color: j === 0 ? boss.color : boss.color2, shape: 'circle', rot: 0, rotSpd: 0, frozen: false });
        }
      }
    }
    moveBullets(g, dt);
    g.bullets = g.bullets.filter(b => b.x > -60 && b.x < W + 60 && b.y > -60 && b.y < H + 60);
    g.phaseTimer += dt;
    if (g.phaseTimer >= 4.0) { g.phase = 2; g.phaseTimer = 0; g.bullets = []; }
  } else {
    g.phaseTimer += dt;
    if (g.phaseTimer >= 0.6) { g.phase = 0; g.phaseTimer = 0; g.engineSpinAngle = 0; }
  }
}

// Overlapping danger zones with staggered timers.
function doOverheat(g: GameData, dt: number, boss: BossConf) {
  g.spawnTimer -= dt;
  if (g.spawnTimer <= 0 && g.dangerZones.length < 5) {
    g.spawnTimer = rand(0.55, 1.0);
    const zw = rand(65, 130), zh = rand(55, 105);
    g.dangerZones.push({ id: nid(g), x: rand(BX + 4, BX + BW - zw - 4), y: rand(BY + 4, BY + BH - zh - 4), w: zw, h: zh, warnTimer: 1.2, activeTimer: 0.7, color: boss.color });
  }
  for (const dz of g.dangerZones) {
    if (dz.warnTimer > 0) dz.warnTimer -= dt;
    else dz.activeTimer -= dt;
  }
  g.dangerZones = g.dangerZones.filter(dz => dz.warnTimer > 0 || dz.activeTimer > 0);
}

// ================================================================
// BOSS 10: Axiom, the End of Rules
// ================================================================

// Box reshapes. Player must stay inside new bounds.
function doRuleRewrite(g: GameData, dt: number, boss: BossConf) {
  if (g.phase === 0) {
    // Warning: box flashes
    if (g.warnMarkers.length === 0) {
      for (let i = 0; i < 8; i++) {
        const a = (i / 8) * Math.PI * 2;
        g.warnMarkers.push({ id: nid(g), x: BCX + Math.cos(a) * 80, y: BCY + Math.sin(a) * 60, angle: a, r: 5, color: boss.color, timer: 0.8, maxTimer: 0.8 });
      }
    }
    g.phaseTimer += dt;
    if (g.phaseTimer >= 0.8) {
      // New smaller box — shrinks by ~25% on each side
      const shrink = 0.28 + (g.diffMult - 1) * 0.08;
      const newBx = BX + BW * shrink;
      const newBy = BY + BH * shrink;
      const newBw = BW * (1 - shrink * 2);
      const newBh = BH * (1 - shrink * 2);
      g.rewrittenBounds = { bx: newBx, by: newBy, bw: Math.max(120, newBw), bh: Math.max(90, newBh) };
      // Also spawn ring attacks inside new box
      const spd = sm(g);
      const newCx = newBx + newBw / 2, newCy = newBy + newBh / 2;
      g.rings.push({ id: nid(g), cx: newCx, cy: newCy, r: 8, speed: 110 * spd, thick: 18, gaps: [0, Math.PI], gapSz: Math.PI / 3, color: boss.color });
      g.warnMarkers = []; g.phase = 1; g.phaseTimer = 0; shake(g);
    }
  } else if (g.phase === 1) {
    for (const ring of g.rings) ring.r += ring.speed * dt;
    g.rings = g.rings.filter(ring => ring.r < 420);
    g.phaseTimer += dt;
    if (g.phaseTimer >= 4.0) { g.rewrittenBounds = null; g.rings = []; g.phase = 2; g.phaseTimer = 0; }
  } else {
    g.phaseTimer += dt;
    if (g.phaseTimer >= 0.6) { g.phase = 0; g.phaseTimer = 0; }
  }
}

// Full laser grid with one safe cell.
function doAxisCollapse(g: GameData, dt: number, boss: BossConf) {
  if (g.phase === 0) {
    if (g.laserWarns.length === 0) {
      // 3 horizontal + 3 vertical warns. One of each is fake (safe cell where they intersect)
      const fakePairH = randInt(0, 2);
      const fakePairV = randInt(0, 2);
      const hPositions = [BY + BH * 0.25, BY + BH * 0.5, BY + BH * 0.75];
      const vPositions = [BX + BW * 0.25, BX + BW * 0.5, BX + BW * 0.75];
      for (let i = 0; i < 3; i++) {
        const isFakeH = i === fakePairH;
        const isFakeV = i === fakePairV;
        g.laserWarns.push({ id: nid(g), type: 'h', pos: hPositions[i], width: 24, timer: 1.5, color: isFakeH ? '#002222' : boss.color, fake: isFakeH });
        g.laserWarns.push({ id: nid(g), type: 'v', pos: vPositions[i], width: 24, timer: 1.5, color: isFakeV ? '#002222' : boss.color2, fake: isFakeV });
      }
    }
    for (const lw of g.laserWarns) lw.timer -= dt;
    g.phaseTimer += dt;
    if (g.phaseTimer >= 1.5) {
      g.lasers = g.laserWarns.filter(lw => !lw.fake).map(lw => ({ id: nid(g), type: lw.type, pos: lw.pos, width: lw.width, timer: 2.0, color: lw.color }));
      g.laserWarns = []; g.phase = 1; g.phaseTimer = 0; shake(g);
    }
  } else if (g.phase === 1) {
    for (const l of g.lasers) l.timer -= dt;
    g.lasers = g.lasers.filter(l => l.timer > 0);
    g.phaseTimer += dt;
    if (g.phaseTimer >= 2.0) { g.lasers = []; g.phase = 2; g.phaseTimer = 0; }
  } else {
    g.phaseTimer += dt;
    if (g.phaseTimer >= 0.7) { g.phase = 0; g.phaseTimer = 0; }
  }
}

// Mirror soul spawns opposite the player, mirrors movement, fires toward player.
function doMirrorSoul(g: GameData, dt: number, boss: BossConf) {
  if (g.phase === 0) {
    // Pulsing warning at mirror position
    if (!g.mirrorSoulActive) {
      g.mirrorSoulActive = true;
      g.mirrorSoulPulsing = true;
      g.mirrorSoulX = BX + (BX + BW - g.player.x);
      g.mirrorSoulY = BY + (BY + BH - g.player.y);
    }
    // Follow mirror position during pulsing
    const mirX = Math.max(BX + 12, Math.min(BX + BW - 12, BX + (BX + BW - g.player.x)));
    const mirY = Math.max(BY + 12, Math.min(BY + BH - 12, BY + (BY + BH - g.player.y)));
    g.mirrorSoulX += (mirX - g.mirrorSoulX) * 4.0 * dt;
    g.mirrorSoulY += (mirY - g.mirrorSoulY) * 4.0 * dt;
    g.phaseTimer += dt;
    if (g.phaseTimer >= 1.0) {
      g.mirrorSoulPulsing = false; // now becomes dangerous
      g.phase = 1; g.phaseTimer = 0; g.spawnTimer = 0;
    }
  } else if (g.phase === 1) {
    // Mirror soul tracks player (mirrored) and fires bullets
    const mirX = Math.max(BX + 12, Math.min(BX + BW - 12, BX + (BX + BW - g.player.x)));
    const mirY = Math.max(BY + 12, Math.min(BY + BH - 12, BY + (BY + BH - g.player.y)));
    g.mirrorSoulX += (mirX - g.mirrorSoulX) * 5.5 * dt;
    g.mirrorSoulY += (mirY - g.mirrorSoulY) * 5.5 * dt;

    g.spawnTimer -= dt;
    if (g.spawnTimer <= 0) {
      g.spawnTimer = st(0.5, g);
      // Fire toward player
      const dx = g.player.x - g.mirrorSoulX;
      const dy = g.player.y - g.mirrorSoulY;
      const len = Math.sqrt(dx * dx + dy * dy) || 1;
      const spd = sm(g) * 130;
      for (let i = -1; i <= 1; i++) {
        const a = Math.atan2(dy, dx) + i * 0.22;
        g.bullets.push({ id: nid(g), x: g.mirrorSoulX, y: g.mirrorSoulY, vx: Math.cos(a) * spd, vy: Math.sin(a) * spd, r: 5, color: boss.color2, shape: 'circle', rot: 0, rotSpd: 0, frozen: false });
      }
    }
    moveBullets(g, dt);
    g.bullets = g.bullets.filter(b => b.x > -60 && b.x < W + 60 && b.y > -60 && b.y < H + 60);
    g.phaseTimer += dt;
    if (g.phaseTimer >= 4.5) { g.mirrorSoulActive = false; g.bullets = []; g.phase = 2; g.phaseTimer = 0; }
  } else {
    g.phaseTimer += dt;
    if (g.phaseTimer >= 0.6) { g.phase = 0; g.phaseTimer = 0; }
  }
}

// All three attack types simultaneously.
function doPatternOverload(g: GameData, dt: number, boss: BossConf) {
  if (g.phase === 0) {
    // Warning: all 3 warn types appear
    if (g.warnMarkers.length === 0) {
      for (let i = 0; i < 12; i++) g.warnMarkers.push({ id: nid(g), x: BX + BW * (i / 11), y: BY, angle: Math.PI / 2, r: 4, color: boss.color, timer: 1.2, maxTimer: 1.2 });
      for (let arm = 0; arm < 4; arm++) {
        const a = (arm * Math.PI * 2) / 4;
        g.warnMarkers.push({ id: nid(g), x: BCX + Math.cos(a) * 50, y: BCY + Math.sin(a) * 50, angle: a, r: 5, color: boss.color2, timer: 1.2, maxTimer: 1.2 });
      }
      const angles = [0.3, 0.85];
      for (const angle of angles) {
        const len = 265;
        g.diagWarns.push({ id: nid(g), x1: BCX - Math.cos(angle) * len, y1: BCY - Math.sin(angle) * len, x2: BCX + Math.cos(angle) * len, y2: BCY + Math.sin(angle) * len, width: 20, timer: 1.2, color: boss.color, fake: false });
      }
    }
    for (const dw of g.diagWarns) dw.timer -= dt;
    g.phaseTimer += dt;
    if (g.phaseTimer >= 1.2) {
      g.diagLasers = g.diagWarns.map(dw => ({ id: nid(g), x1: dw.x1, y1: dw.y1, x2: dw.x2, y2: dw.y2, width: dw.width, timer: 5.0, color: boss.color }));
      g.diagWarns = []; g.warnMarkers = []; g.phase = 1; g.phaseTimer = 0; shake(g);
    }
  } else if (g.phase === 1) {
    // Simultaneously: spiral + falling + diagonal lasers
    g.spawnTimer -= dt;
    const spd = sm(g);
    if (g.spawnTimer <= 0) {
      g.spawnTimer = st(0.06, g);
      // Falling
      g.bullets.push({ id: nid(g), x: rand(BX + 4, BX + BW - 4), y: BY - 5, vx: rand(-8, 8) * spd, vy: rand(155, 240) * spd, r: 4, color: boss.color, shape: 'circle', rot: 0, rotSpd: 0, frozen: false });
      // Spiral
      const sa = g.time * 2.8;
      for (let arm = 0; arm < 4; arm++) {
        const a = sa + (arm * Math.PI * 2) / 4;
        g.bullets.push({ id: nid(g), x: BCX, y: BCY, vx: Math.cos(a) * 145 * spd, vy: Math.sin(a) * 145 * spd, r: 5, color: boss.color2, shape: 'diamond', rot: 0, rotSpd: rand(-2, 2), frozen: false });
      }
    }
    for (const dl of g.diagLasers) dl.timer -= dt;
    g.diagLasers = g.diagLasers.filter(dl => dl.timer > 0);
    moveBullets(g, dt);
    g.bullets = g.bullets.filter(b => b.x > -60 && b.x < W + 60 && b.y > -60 && b.y < H + 60);
    g.phaseTimer += dt;
    if (g.phaseTimer >= 5.0) { g.phase = 2; g.phaseTimer = 0; g.bullets = []; g.diagLasers = []; }
  } else {
    g.phaseTimer += dt;
    if (g.phaseTimer >= 0.6) { g.phase = 0; g.phaseTimer = 0; }
  }
}

// Each previous boss's signature attack in rapid 2.5s sequence.
const FINAL_RULE_ATTACKS = [
  'crystalRain', 'bitStorm', 'haloSpiral', 'gearMaze', 'impossibleScript',
  'currentSurge', 'boneRain', 'starfall', 'pistonCrush',
];

function doFinalRule(g: GameData, dt: number, boss: BossConf) {
  // Each step lasts 2.5s with 0.5s warning
  const STEP_DUR = 3.0;
  const WARN_DUR = 0.6;

  if (g.finalRuleStep >= FINAL_RULE_ATTACKS.length) {
    // Final combined burst
    g.spawnTimer -= dt;
    const spd = sm(g);
    if (g.spawnTimer <= 0) {
      g.spawnTimer = st(0.05, g);
      // Everything at once
      g.bullets.push({ id: nid(g), x: rand(BX, BX + BW), y: BY - 5, vx: rand(-15, 15) * spd, vy: rand(160, 280) * spd, r: 4, color: boss.color, shape: 'circle', rot: 0, rotSpd: 0, frozen: false });
      const a = g.time * 3.5;
      for (let arm = 0; arm < 6; arm++) {
        const ang = a + (arm * Math.PI * 2) / 6;
        g.bullets.push({ id: nid(g), x: BCX, y: BCY, vx: Math.cos(ang) * 160 * spd, vy: Math.sin(ang) * 160 * spd, r: 6, color: boss.color2, shape: 'diamond', rot: 0, rotSpd: rand(-3, 3), frozen: false });
      }
    }
    moveBullets(g, dt);
    g.bullets = g.bullets.filter(b => b.x > -60 && b.x < W + 60 && b.y > -60 && b.y < H + 60);
    g.finalRuleStepTimer += dt;
    // This is the last sub-wave — it just keeps going until atkTimer expires
    return;
  }

  g.finalRuleStepTimer += dt;

  if (g.finalRuleStepTimer < WARN_DUR) {
    // Brief warning flash
    if (g.warnMarkers.length === 0) {
      for (let i = 0; i < 10; i++) g.warnMarkers.push({ id: nid(g), x: rand(BX, BX + BW), y: BY + rand(0, BH), angle: rand(0, Math.PI * 2), r: 5, color: boss.color, timer: WARN_DUR, maxTimer: WARN_DUR });
    }
  } else {
    g.warnMarkers = [];
    // Run the sub-attack for this step
    const subAtk = FINAL_RULE_ATTACKS[g.finalRuleStep];
    const subBoss: BossConf = { ...BOSSES[g.bossIdx], attacks: [subAtk] };
    // Temporarily set atkIdx=0 context for sub-attack
    const savedAtkIdx = g.atkIdx;
    g.atkIdx = 0;
    updateAttack(g, dt, subBoss);
    g.atkIdx = savedAtkIdx;
  }

  if (g.finalRuleStepTimer >= STEP_DUR) {
    g.finalRuleStep++;
    g.finalRuleStepTimer = 0;
    clearEntities(g);
    g.mirrorSoulActive = false;
  }
}

// ================================================================
// BULLET MOVEMENT + WARN MARKERS
// ================================================================

function moveBullets(g: GameData, dt: number) {
  for (const b of g.bullets) {
    if (!b.frozen) { b.x += b.vx * dt; b.y += b.vy * dt; }
    b.rot += b.rotSpd * dt;
  }
}

function updateWarnMarkers(g: GameData, dt: number) {
  for (const wm of g.warnMarkers) wm.timer -= dt;
  g.warnMarkers = g.warnMarkers.filter(wm => wm.timer > 0);
}

// ================================================================
// MAIN GAME UPDATE
// ================================================================

function update(
  g: GameData,
  dt: number,
  adminMode: boolean,
  diffIdxRef: React.MutableRefObject<number>,
  setDiffIdx: (n: number) => void,
  jumpBoss: (idx: number) => void,
  inputFocused: boolean,
) {
  const cap = Math.min(dt, 0.05);
  g.time += cap;

  // Sample prev player positions for Marrow Saint
  g.prevPosTimer -= cap;
  if (g.prevPosTimer <= 0) {
    g.prevPosTimer = 0.15;
    g.prevPlayerPositions.push({ x: g.player.x, y: g.player.y });
    if (g.prevPlayerPositions.length > 12) g.prevPlayerPositions.shift();
  }

  if (g.state === 'title') {
    if (g.keys.has('Enter') || g.keys.has(' ')) {
      g.state = 'intro'; g.introTimer = 0; g.introLine = 0;
      resetForBoss(g, 0);
    }
    return;
  }
  if (g.state === 'intro') {
    g.introTimer += cap;
    if (g.keys.has('r') || g.keys.has('R')) { resetForBoss(g, 0); g.state = 'title'; return; }
    const boss = BOSSES[g.bossIdx];
    if (g.introTimer >= 2.0 && g.introLine < boss.dialog.length - 1 && (g.keys.has('Enter') || g.keys.has(' '))) {
      g.introLine++; g.introTimer = 0;
    }
    if (g.introLine >= boss.dialog.length - 1 && g.introTimer >= 2.5 && (g.keys.has('Enter') || g.keys.has(' '))) {
      g.state = 'playing';
      g.atkTimer = BOSSES[g.bossIdx].atkDur;
      g.atkIdx = 0; g.phase = 0; g.phaseTimer = 0; g.spawnTimer = 0; g.spawnCount = 0;
    }
    return;
  }
  if (g.state === 'bossWin') {
    g.postBossTimer += cap;
    if (g.keys.has('r') || g.keys.has('R')) { resetForBoss(g, 0); g.state = 'title'; return; }
    if (g.postBossTimer >= 3.0 && (g.keys.has('Enter') || g.keys.has(' '))) {
      const next = g.bossIdx + 1;
      if (next >= BOSSES.length) { g.state = 'finalVictory'; }
      else { resetForBoss(g, next); g.state = 'intro'; g.introTimer = 0; g.introLine = 0; }
    }
    return;
  }
  if (g.state === 'gameOver') {
    g.gameOverTimer += cap;
    if (g.gameOverTimer >= 1.5 && (g.keys.has('r') || g.keys.has('R'))) { resetForBoss(g, 0); g.state = 'title'; g.gameOverTimer = 0; }
    return;
  }
  if (g.state === 'finalVictory') {
    if (g.keys.has('r') || g.keys.has('R') || g.keys.has('Enter') || g.keys.has(' ')) { resetForBoss(g, 0); g.state = 'title'; }
    return;
  }

  // ---- PLAYING ----
  if ((g.keys.has('r') || g.keys.has('R')) && !inputFocused) {
    resetForBoss(g, 0); g.state = 'title'; return;
  }

  const boss = BOSSES[g.bossIdx];

  // Admin keyboard shortcuts
  if (adminMode && !inputFocused) {
    for (let i = 1; i <= 9; i++) {
      if (g.keys.has(String(i))) { jumpBoss(i - 1); g.keys.delete(String(i)); return; }
    }
    if (g.keys.has('0')) { jumpBoss(9); g.keys.delete('0'); return; }
    if (g.keys.has('e') || g.keys.has('E')) {
      const next = Math.max(0, diffIdxRef.current - 1);
      if (next !== diffIdxRef.current) setDiffIdx(next);
      g.keys.delete('e'); g.keys.delete('E');
    }
    if (g.keys.has('f') || g.keys.has('F')) {
      const next = Math.min(DIFF_LEVELS.length - 1, diffIdxRef.current + 1);
      if (next !== diffIdxRef.current) setDiffIdx(next);
      g.keys.delete('f'); g.keys.delete('F');
    }
  }

  // Player movement
  let dx = 0, dy = 0;
  if (!inputFocused) {
    if (g.keys.has('ArrowLeft')  || g.keys.has('a')) dx -= 1;
    if (g.keys.has('ArrowRight') || g.keys.has('d')) dx += 1;
    if (g.keys.has('ArrowUp')    || g.keys.has('w')) dy -= 1;
    if (g.keys.has('ArrowDown')  || g.keys.has('s')) dy += 1;
  }
  if (g.ctrlFlipped) { dx = -dx; dy = -dy; }

  const baseSpd = g.timeDistorted ? P_SPEED * (0.55 + Math.abs(Math.sin(g.time * 4)) * 0.85) : P_SPEED;
  const diag = dx !== 0 && dy !== 0 ? 0.7071 : 1;

  // Active bounds
  const cbx = g.rewrittenBounds ? g.rewrittenBounds.bx : BX;
  const cby = g.rewrittenBounds ? g.rewrittenBounds.by : BY;
  const cbw = g.rewrittenBounds ? g.rewrittenBounds.bw : BW;
  const cbh = g.rewrittenBounds ? g.rewrittenBounds.bh : BH;

  g.player.x += dx * diag * baseSpd * cap;
  g.player.y += dy * diag * baseSpd * cap;

  // Apply undertow pull
  if (g.pullActive) {
    g.player.x += g.currentPullX * cap;
    g.player.y += g.currentPullY * cap;
  }

  g.player.x = Math.max(cbx + P_HIT_R, Math.min(cbx + cbw - P_HIT_R, g.player.x));
  g.player.y = Math.max(cby + P_HIT_R, Math.min(cby + cbh - P_HIT_R, g.player.y));

  // Push player away from advancing piston slabs when arena is shrunken
  if (g.arenaShrunken) {
    for (const pb of g.pistonBlocks) {
      if (!pb.active) continue;
      if (pb.w >= BW * 0.6) {
        // Horizontal slab (full-width, entering top or bottom)
        if (pb.y + pb.h / 2 < BCY) g.player.y = Math.max(g.player.y, pb.y + pb.h + P_HIT_R);
        else                        g.player.y = Math.min(g.player.y, pb.y - P_HIT_R);
      } else {
        // Vertical slab (full-height, entering left or right)
        if (pb.x + pb.w / 2 < BCX) g.player.x = Math.max(g.player.x, pb.x + pb.w + P_HIT_R);
        else                        g.player.x = Math.min(g.player.x, pb.x - P_HIT_R);
      }
    }
  }

  if (g.player.invTimer > 0) {
    g.player.invTimer -= cap;
    g.player.flicker = Math.floor(g.player.invTimer * 10) % 2 === 0;
  } else { g.player.flicker = false; }

  if (g.shakeTimer > 0) {
    g.shakeTimer -= cap;
    const shakeStrength = g.shakeTimer / SHAKE_DUR;
    g.shakeX = (Math.random() - 0.5) * SHAKE_AMT * 2 * shakeStrength;
    g.shakeY = (Math.random() - 0.5) * SHAKE_AMT * 2 * shakeStrength;
    if (g.shakeTimer <= 0) { g.shakeX = 0; g.shakeY = 0; }
  }

  g.bossAngle += cap * 0.85;
  g.glitchTimer += cap;

  applyBossSpecials(g, cap, boss);
  updateAttack(g, cap, boss);
  updateWarnMarkers(g, cap);

  // Update piston warn timers (outside attack to prevent double-counting)
  for (const pb of g.pistonBlocks) {
    if (pb.warnTimer > 0) pb.warnTimer -= cap;
  }

  // Collision & damage
  if (checkHit(g)) {
    g.player.hp -= boss.dmg * g.diffMult;
    g.player.invTimer = P_INV;
    shake(g);
    if (g.player.hp <= 0) {
      g.player.hp = 0;
      g.state = 'gameOver';
      g.gameOverTimer = 0;
      clearEntities(g);
    }
  }

  g.atkTimer -= cap;
  if (g.atkTimer <= 0) {
    g.atkIdx++;
    if (g.atkIdx >= boss.attacks.length) {
      g.state = 'bossWin';
      g.postBossTimer = 0;
      clearEntities(g);
    } else {
      clearEntities(g);
      g.atkTimer = boss.atkDur;
      g.phase = 0; g.phaseTimer = 0; g.spawnTimer = 0; g.spawnCount = 0;
    }
  }
}

// ================================================================
// RENDERING
// ================================================================

function drawHeart(ctx: CanvasRenderingContext2D, x: number, y: number, size: number, color: string) {
  ctx.save();
  ctx.shadowBlur = 18; ctx.shadowColor = color;
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.moveTo(x, y + size * 0.25);
  ctx.bezierCurveTo(x, y - size * 0.5, x - size, y - size * 0.5, x - size, y + size * 0.1);
  ctx.bezierCurveTo(x - size, y + size * 0.65, x, y + size, x, y + size);
  ctx.bezierCurveTo(x, y + size, x + size, y + size * 0.65, x + size, y + size * 0.1);
  ctx.bezierCurveTo(x + size, y - size * 0.5, x, y - size * 0.5, x, y + size * 0.25);
  ctx.fill();
  ctx.restore();
}

function drawBullet(ctx: CanvasRenderingContext2D, b: Bullet) {
  ctx.save();
  ctx.shadowBlur = 10; ctx.shadowColor = b.color;
  ctx.fillStyle = b.color;
  ctx.translate(b.x, b.y);
  ctx.rotate(b.rot);
  if (b.shape === 'circle') {
    ctx.beginPath(); ctx.arc(0, 0, b.r, 0, Math.PI * 2); ctx.fill();
  } else if (b.shape === 'square') {
    ctx.fillRect(-b.r, -b.r, b.r * 2, b.r * 2);
  } else {
    ctx.beginPath(); ctx.moveTo(0, -b.r * 1.4); ctx.lineTo(b.r * 0.9, 0); ctx.lineTo(0, b.r * 1.4); ctx.lineTo(-b.r * 0.9, 0); ctx.closePath(); ctx.fill();
  }
  ctx.restore();
}

function drawGear(ctx: CanvasRenderingContext2D, gear: Gear) {
  ctx.save();
  ctx.translate(gear.cx, gear.cy); ctx.rotate(gear.rot);
  ctx.shadowBlur = 14; ctx.shadowColor = gear.color;
  ctx.fillStyle = gear.color + '30'; ctx.strokeStyle = gear.color; ctx.lineWidth = 3;
  ctx.beginPath(); ctx.arc(0, 0, gear.r, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
  const teeth = 8;
  for (let i = 0; i < teeth; i++) {
    const a = (i * Math.PI * 2) / teeth;
    ctx.save(); ctx.translate(Math.cos(a) * gear.r, Math.sin(a) * gear.r); ctx.rotate(a);
    ctx.fillStyle = gear.color; ctx.fillRect(-4, -6, 8, 12); ctx.restore();
  }
  ctx.beginPath(); ctx.arc(0, 0, gear.r * 0.38, 0, Math.PI * 2); ctx.strokeStyle = gear.color; ctx.stroke();
  ctx.restore();
}

function drawWarnMarkers(ctx: CanvasRenderingContext2D, g: GameData) {
  for (const wm of g.warnMarkers) {
    const fade = wm.timer / wm.maxTimer;
    const pulse = 0.4 + 0.45 * Math.sin(g.time * 14);
    ctx.save();
    ctx.globalAlpha = pulse * fade;
    ctx.shadowBlur = 14; ctx.shadowColor = wm.color;
    ctx.fillStyle = wm.color;
    ctx.translate(wm.x, wm.y);
    ctx.rotate(wm.angle + Math.PI / 2);
    ctx.beginPath();
    ctx.moveTo(0, -wm.r * 1.3);
    ctx.lineTo(wm.r, wm.r * 0.8);
    ctx.lineTo(-wm.r, wm.r * 0.8);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }
}

// ================================================================
// BOSS DRAW FUNCTIONS
// ================================================================

function drawBoss1(ctx: CanvasRenderingContext2D, g: GameData, boss: BossConf) {
  ctx.save();
  ctx.translate(BCX, BY - 72 + Math.sin(g.bossAngle) * 5);
  ctx.shadowBlur = 22; ctx.shadowColor = boss.color;
  ctx.fillStyle = boss.color + '88'; ctx.strokeStyle = boss.color; ctx.lineWidth = 2;
  ctx.beginPath(); ctx.moveTo(0, -52); ctx.lineTo(26, -18); ctx.lineTo(32, 32); ctx.lineTo(-32, 32); ctx.lineTo(-26, -18); ctx.closePath(); ctx.fill(); ctx.stroke();
  ctx.fillStyle = boss.color2 + '55';
  ctx.beginPath(); ctx.moveTo(-12, -52); ctx.lineTo(0, -52); ctx.lineTo(26, -18); ctx.lineTo(-4, -14); ctx.closePath(); ctx.fill();
  ctx.fillStyle = '#ffffff'; ctx.shadowColor = '#ffffff';
  ctx.beginPath(); ctx.ellipse(5, -12, 11, 7, 0, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#4488ff'; ctx.beginPath(); ctx.arc(5, -12, 5, 0, Math.PI * 2); ctx.fill();
  for (let i = 0; i < 4; i++) {
    const a = g.bossAngle * 1.6 + i * Math.PI * 0.5;
    ctx.save(); ctx.translate(Math.cos(a) * 48, Math.sin(a) * 18 - 18); ctx.rotate(a);
    ctx.fillStyle = boss.color + 'cc'; ctx.shadowColor = boss.color;
    ctx.beginPath(); ctx.moveTo(0, -9); ctx.lineTo(4, 0); ctx.lineTo(0, 9); ctx.lineTo(-4, 0); ctx.closePath(); ctx.fill();
    ctx.restore();
  }
  ctx.restore();
}

function drawBoss2(ctx: CanvasRenderingContext2D, g: GameData, boss: BossConf) {
  ctx.save();
  ctx.translate(BCX, BY - 68);
  const glitch = Math.sin(g.glitchTimer * 22) > 0.72;
  const gox = glitch ? rand(-5, 5) : 0; const goy = glitch ? rand(-3, 3) : 0;
  ctx.shadowBlur = 15; ctx.shadowColor = boss.color;
  const rects = [
    { x: -22, y: -38, w: 44, h: 48, c: boss.color + '88' },
    { x: -27, y: -16, w: 16, h: 22, c: boss.color2 + '66' },
    { x: 16,  y: -10, w: 13, h: 26, c: boss.color + '55' },
    { x: -11, y: 10,  w: 33, h: 21, c: boss.color2 + '44' },
  ];
  for (const r of rects) {
    const ox = glitch && Math.random() > 0.8 ? rand(-3, 3) : 0;
    ctx.fillStyle = r.c; ctx.fillRect(r.x + gox + ox, r.y + goy, r.w, r.h);
    ctx.strokeStyle = r.c.slice(0, 7); ctx.lineWidth = 1; ctx.strokeRect(r.x + gox + ox, r.y + goy, r.w, r.h);
  }
  ctx.fillStyle = boss.color2;
  for (let i = 0; i < 6; i++) ctx.fillRect(-18 + i * 7 + gox, 10 + goy, 5, 13);
  ctx.fillStyle = boss.color; ctx.shadowColor = boss.color;
  ctx.beginPath(); ctx.arc(0 + (glitch ? rand(-3, 3) : 0), -22 + goy, 9, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#000'; ctx.beginPath(); ctx.arc(1, -22 + goy, 4, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = boss.color2; ctx.font = '8px monospace'; ctx.globalAlpha = 0.7;
  ctx.fillText(Math.floor(g.time * 3) % 2 === 0 ? 'ERR' : '0xF', -30, -52 + goy);
  ctx.globalAlpha = 1;
  ctx.restore();
}

function drawBoss3(ctx: CanvasRenderingContext2D, g: GameData, boss: BossConf) {
  ctx.save();
  ctx.translate(BCX, BY - 78 + Math.sin(g.bossAngle * 0.7) * 6);
  ctx.shadowBlur = 22; ctx.shadowColor = boss.color;
  ctx.save(); ctx.rotate(g.bossAngle);
  for (let i = 0; i < 7; i++) {
    const ha = (i / 7) * Math.PI * 2;
    ctx.save(); ctx.translate(Math.cos(ha) * 56, Math.sin(ha) * 20); ctx.rotate(ha + Math.PI / 2);
    ctx.fillStyle = boss.color; ctx.shadowColor = boss.color; ctx.shadowBlur = 8;
    ctx.beginPath(); ctx.moveTo(0, -8); ctx.lineTo(7, 8); ctx.lineTo(-7, 8); ctx.closePath(); ctx.fill(); ctx.restore();
  }
  ctx.restore();
  ctx.fillStyle = '#151515'; ctx.strokeStyle = boss.color; ctx.lineWidth = 2.5;
  ctx.beginPath(); ctx.ellipse(0, -10, 29, 40, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
  ctx.fillStyle = boss.color; ctx.shadowColor = boss.color; ctx.shadowBlur = 12;
  ctx.fillRect(-22, -24, 16, 5); ctx.fillRect(6, -24, 16, 5);
  ctx.strokeStyle = boss.color + '66'; ctx.lineWidth = 2.5;
  ctx.beginPath(); ctx.moveTo(-29, -12); ctx.lineTo(-55, -42); ctx.lineTo(-40, -7); ctx.lineTo(-68, -12); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(29, -12); ctx.lineTo(55, -42); ctx.lineTo(40, -7); ctx.lineTo(68, -12); ctx.stroke();
  ctx.restore();
}

function drawBoss4(ctx: CanvasRenderingContext2D, g: GameData, boss: BossConf) {
  ctx.save();
  ctx.translate(BCX, BY - 78 + Math.sin(g.bossAngle * 0.5) * 4);
  ctx.shadowBlur = 18; ctx.shadowColor = boss.color;
  ctx.fillStyle = '#1a0e00'; ctx.strokeStyle = boss.color; ctx.lineWidth = 3;
  ctx.beginPath(); ctx.arc(0, 0, 42, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * Math.PI * 2 - Math.PI / 2;
    ctx.fillStyle = boss.color; ctx.beginPath(); ctx.arc(Math.cos(a) * 34, Math.sin(a) * 34, i % 3 === 0 ? 2.5 : 1.5, 0, Math.PI * 2); ctx.fill();
  }
  ctx.strokeStyle = boss.color2; ctx.lineWidth = 4; ctx.lineCap = 'round';
  ctx.save(); ctx.rotate(g.time * 0.3); ctx.beginPath(); ctx.moveTo(0, 5); ctx.lineTo(0, -26); ctx.stroke(); ctx.restore();
  ctx.strokeStyle = '#ffffff88'; ctx.lineWidth = 2;
  ctx.save(); ctx.rotate(g.time * 1.3); ctx.beginPath(); ctx.moveTo(0, 5); ctx.lineTo(0, -36); ctx.stroke(); ctx.restore();
  ctx.fillStyle = boss.color2; ctx.beginPath(); ctx.arc(0, 0, 4, 0, Math.PI * 2); ctx.fill();
  ctx.restore();
}

function drawBoss5(ctx: CanvasRenderingContext2D, g: GameData, boss: BossConf) {
  ctx.save();
  ctx.translate(BCX, BY - 78);
  ctx.shadowBlur = 28; ctx.shadowColor = boss.color;
  ctx.globalAlpha = 0.9 + Math.sin(g.time * 16) * 0.1;
  ctx.fillStyle = boss.color + 'cc'; ctx.strokeStyle = boss.color; ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(-38, 22); ctx.lineTo(-38, -10); ctx.lineTo(-22, -34); ctx.lineTo(-10, -10);
  ctx.lineTo(0, -44); ctx.lineTo(10, -10); ctx.lineTo(22, -34); ctx.lineTo(38, -10); ctx.lineTo(38, 22); ctx.closePath();
  ctx.fill(); ctx.stroke();
  ctx.fillStyle = '#000'; ctx.fillRect(-21, -5, 42, 30);
  const syms = ['Ψ', 'Ω', '∞', '⚡', '◈', '☾', '⚔'];
  const t = g.time;
  ctx.fillStyle = boss.color2; ctx.font = 'bold 14px serif'; ctx.shadowColor = boss.color2; ctx.textAlign = 'center';
  ctx.fillText(syms[Math.floor(t * 6) % syms.length], -10, 16);
  ctx.fillText(syms[(Math.floor(t * 8) + 3) % syms.length], 10, 16);
  ctx.globalAlpha = 1;
  ctx.restore();
}

function drawBoss6(ctx: CanvasRenderingContext2D, g: GameData, boss: BossConf) {
  ctx.save();
  ctx.translate(BCX, BY - 68 + Math.sin(g.bossAngle * 1.2) * 8);
  ctx.shadowBlur = 28; ctx.shadowColor = boss.color;
  // Eel-like coil body
  for (let i = 0; i < 6; i++) {
    const t = i / 5;
    const cx2 = Math.sin(g.time * 2.2 + i * 0.9) * 18;
    const cy2 = -i * 12;
    const r = 16 - i * 1.8;
    ctx.fillStyle = i % 2 === 0 ? boss.color + 'aa' : boss.color2 + '88';
    ctx.beginPath(); ctx.ellipse(cx2, cy2, r, r * 0.7, 0, 0, Math.PI * 2); ctx.fill();
  }
  // Electric sparks
  for (let i = 0; i < 4; i++) {
    const a = g.time * 4 + i * Math.PI / 2;
    ctx.strokeStyle = boss.color; ctx.lineWidth = 2; ctx.shadowBlur = 18;
    ctx.beginPath();
    ctx.moveTo(Math.cos(a) * 22, Math.sin(a) * 14 - 20);
    ctx.lineTo(Math.cos(a + 0.5) * 36, Math.sin(a + 0.5) * 22 - 20);
    ctx.stroke();
  }
  // Eye
  ctx.fillStyle = boss.color2; ctx.shadowColor = boss.color2;
  ctx.beginPath(); ctx.ellipse(0, -6, 10, 6, 0, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#000'; ctx.beginPath(); ctx.arc(0, -6, 4, 0, Math.PI * 2); ctx.fill();
  ctx.restore();
}

function drawBoss7(ctx: CanvasRenderingContext2D, g: GameData, boss: BossConf) {
  ctx.save();
  ctx.translate(BCX, BY - 80 + Math.sin(g.bossAngle * 0.6) * 5);
  ctx.shadowBlur = 20; ctx.shadowColor = boss.color;
  // Skeletal body
  ctx.strokeStyle = boss.color; ctx.lineWidth = 3;
  ctx.fillStyle = '#111';
  ctx.beginPath(); ctx.ellipse(0, -20, 22, 32, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
  // Ribcage lines
  for (let i = 0; i < 4; i++) {
    const ry = -30 + i * 9;
    ctx.strokeStyle = boss.color + 'aa'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(-20, ry); ctx.bezierCurveTo(-30, ry + 4, -30, ry + 8, -20, ry + 8); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(20, ry); ctx.bezierCurveTo(30, ry + 4, 30, ry + 8, 20, ry + 8); ctx.stroke();
  }
  // Halo
  ctx.strokeStyle = boss.color2; ctx.lineWidth = 3; ctx.shadowColor = boss.color2;
  ctx.setLineDash([8, 5]);
  ctx.beginPath(); ctx.ellipse(0, -62, 28, 10, 0, 0, Math.PI * 2); ctx.stroke();
  ctx.setLineDash([]);
  // Bone wings
  ctx.save(); ctx.rotate(-0.3);
  ctx.strokeStyle = boss.color; ctx.lineWidth = 2.5;
  ctx.beginPath(); ctx.moveTo(-22, -20); ctx.lineTo(-55, -35); ctx.lineTo(-45, -15); ctx.lineTo(-70, -20); ctx.stroke();
  ctx.restore();
  ctx.save(); ctx.rotate(0.3);
  ctx.strokeStyle = boss.color; ctx.lineWidth = 2.5;
  ctx.beginPath(); ctx.moveTo(22, -20); ctx.lineTo(55, -35); ctx.lineTo(45, -15); ctx.lineTo(70, -20); ctx.stroke();
  ctx.restore();
  // Skull-like face
  ctx.fillStyle = boss.color + '44';
  ctx.beginPath(); ctx.ellipse(0, -48, 14, 12, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
  ctx.fillStyle = '#000'; ctx.beginPath(); ctx.ellipse(-5, -48, 4, 4, 0, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.ellipse(5, -48, 4, 4, 0, 0, Math.PI * 2); ctx.fill();
  ctx.restore();
}

function drawBoss8(ctx: CanvasRenderingContext2D, g: GameData, boss: BossConf) {
  ctx.save();
  ctx.translate(BCX, BY - 82 + Math.sin(g.bossAngle * 0.8) * 5);
  ctx.shadowBlur = 28; ctx.shadowColor = boss.color;
  // Cosmic cloak
  ctx.globalAlpha = 0.6;
  ctx.fillStyle = boss.color + '44';
  ctx.beginPath(); ctx.moveTo(-50, 30); ctx.lineTo(50, 30); ctx.lineTo(30, -50); ctx.lineTo(-30, -50); ctx.closePath(); ctx.fill();
  ctx.globalAlpha = 1;
  // Body
  ctx.strokeStyle = boss.color; ctx.fillStyle = '#0a0012'; ctx.lineWidth = 2.5;
  ctx.beginPath(); ctx.ellipse(0, -18, 24, 34, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
  // Crown
  ctx.fillStyle = boss.color2; ctx.shadowColor = boss.color2;
  for (let i = -2; i <= 2; i++) {
    const h = i % 2 === 0 ? 18 : 12;
    ctx.fillRect(i * 8 - 3, -54 - h, 6, h);
  }
  ctx.fillStyle = boss.color2 + '88';
  ctx.fillRect(-18, -54, 36, 4);
  // Floating star constellations
  for (let i = 0; i < 5; i++) {
    const sa = g.bossAngle * 0.7 + (i * Math.PI * 2) / 5;
    const sr = 58;
    ctx.fillStyle = boss.color2; ctx.shadowColor = boss.color2;
    ctx.beginPath(); ctx.arc(Math.cos(sa) * sr * 0.9, Math.sin(sa) * sr * 0.45 - 18, 3 + Math.sin(g.time * 5 + i) * 1, 0, Math.PI * 2); ctx.fill();
  }
  // Face veil
  ctx.strokeStyle = boss.color + '88'; ctx.lineWidth = 1.5;
  ctx.beginPath(); ctx.moveTo(-20, -25); ctx.lineTo(-25, 5); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(20, -25); ctx.lineTo(25, 5); ctx.stroke();
  ctx.fillStyle = boss.color; ctx.shadowColor = boss.color;
  ctx.beginPath(); ctx.ellipse(-8, -22, 5, 3, 0, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.ellipse(8, -22, 5, 3, 0, 0, Math.PI * 2); ctx.fill();
  ctx.restore();
}

function drawBoss9(ctx: CanvasRenderingContext2D, g: GameData, boss: BossConf) {
  ctx.save();
  ctx.translate(BCX, BY - 80);
  ctx.shadowBlur = 18; ctx.shadowColor = boss.color;
  // Machine core
  ctx.fillStyle = '#111'; ctx.strokeStyle = boss.color; ctx.lineWidth = 3;
  ctx.fillRect(-36, -48, 72, 72); ctx.strokeRect(-36, -48, 72, 72);
  // Rotating arms
  for (let i = 0; i < 4; i++) {
    const a = g.bossAngle * 1.8 + (i * Math.PI) / 2;
    ctx.save(); ctx.rotate(a);
    ctx.strokeStyle = boss.color; ctx.lineWidth = 6; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(0, -52); ctx.stroke();
    ctx.fillStyle = boss.color2; ctx.fillRect(-4, -58, 8, 10); ctx.restore();
  }
  // Pistons
  for (let i = 0; i < 2; i++) {
    const py = -30 + i * 20;
    const piston = Math.sin(g.time * 6 + i * Math.PI) * 8;
    ctx.fillStyle = boss.color2 + 'cc';
    ctx.fillRect(-50 + piston, py - 5, 16, 10);
    ctx.fillRect(38 - piston, py - 5, 16, 10);
  }
  // Warning lights
  const warnOn = Math.floor(g.time * 4) % 2 === 0;
  for (let i = -1; i <= 1; i += 2) {
    ctx.fillStyle = warnOn ? '#ff3300' : '#440000';
    ctx.shadowColor = warnOn ? '#ff3300' : '#000';
    ctx.shadowBlur = warnOn ? 16 : 0;
    ctx.beginPath(); ctx.arc(i * 28, -42, 5, 0, Math.PI * 2); ctx.fill();
  }
  ctx.restore();
}

function drawBoss10(ctx: CanvasRenderingContext2D, g: GameData, boss: BossConf) {
  ctx.save();
  ctx.translate(BCX, BY - 80 + Math.sin(g.time * 0.8) * 3);
  ctx.shadowBlur = 35; ctx.shadowColor = boss.color;
  ctx.globalAlpha = 0.9 + Math.sin(g.time * 20) * 0.1;
  // Abstract geometric form
  ctx.strokeStyle = boss.color; ctx.lineWidth = 2.5;
  for (let i = 0; i < 3; i++) {
    ctx.save(); ctx.rotate(g.time * (0.4 + i * 0.3) * (i % 2 === 0 ? 1 : -1));
    ctx.strokeRect(-24 + i * 4, -24 + i * 4, 48 - i * 8, 48 - i * 8);
    ctx.restore();
  }
  // Floating eyes
  for (let i = 0; i < 4; i++) {
    const ea = g.time * 1.1 + (i * Math.PI * 2) / 4;
    const ex = Math.cos(ea) * 42, ey = Math.sin(ea) * 28 - 14;
    ctx.fillStyle = boss.color2; ctx.shadowColor = boss.color2; ctx.shadowBlur = 10;
    ctx.beginPath(); ctx.ellipse(ex, ey, 7, 5, ea, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#000'; ctx.beginPath(); ctx.arc(ex, ey, 2.5, 0, Math.PI * 2); ctx.fill();
  }
  // Broken equations
  const eqs = ['∀x', '⊥', '∄', '∞=0', '¬¬'];
  ctx.font = '9px monospace'; ctx.textAlign = 'center';
  ctx.globalAlpha = 0.5;
  ctx.fillStyle = boss.color;
  for (let i = 0; i < eqs.length; i++) {
    const ea2 = g.time * 0.9 + (i * Math.PI * 2) / eqs.length;
    ctx.fillText(eqs[i], Math.cos(ea2) * 65, Math.sin(ea2) * 42 - 14);
  }
  ctx.globalAlpha = 1;
  // Center core
  ctx.fillStyle = boss.color; ctx.shadowBlur = 22; ctx.shadowColor = boss.color;
  ctx.beginPath(); ctx.arc(0, -14, 10, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#000'; ctx.beginPath(); ctx.arc(0, -14, 5, 0, Math.PI * 2); ctx.fill();
  ctx.restore();
}

// ================================================================
// BACKGROUND + BOX
// ================================================================

function drawBackground(ctx: CanvasRenderingContext2D, g: GameData) {
  const boss = BOSSES[g.bossIdx];
  ctx.fillStyle = '#000'; ctx.fillRect(0, 0, W, H);
  const grad = ctx.createRadialGradient(BCX, BCY, 40, BCX, H * 0.55, 420);
  grad.addColorStop(0, boss.bgTint); grad.addColorStop(1, '#000000');
  ctx.fillStyle = grad; ctx.fillRect(0, 0, W, H);
  ctx.fillStyle = 'rgba(0,0,0,0.1)';
  for (let y = 0; y < H; y += 3) ctx.fillRect(0, y, W, 1);

  // Boss 6: underwater shimmer effect
  if (g.bossIdx === 5) {
    ctx.globalAlpha = 0.06;
    for (let i = 0; i < 6; i++) {
      const shimY = ((g.time * 28 + i * 45) % H);
      ctx.fillStyle = '#00ccff';
      ctx.fillRect(0, shimY, W, 2);
    }
    ctx.globalAlpha = 1;
  }
}

function drawBox(ctx: CanvasRenderingContext2D, boss: BossConf, g: GameData) {
  ctx.save();
  // If rewrittenBounds active, show it in cyan
  if (g.rewrittenBounds) {
    const rb = g.rewrittenBounds;
    const flash = 0.4 + 0.4 * Math.sin(g.time * 12);
    ctx.globalAlpha = flash;
    ctx.strokeStyle = '#00ffff'; ctx.lineWidth = 3; ctx.shadowBlur = 16; ctx.shadowColor = '#00ffff';
    ctx.strokeRect(rb.bx, rb.by, rb.bw, rb.bh);
    ctx.globalAlpha = 1;
  }
  ctx.shadowBlur = 10; ctx.shadowColor = '#ffffff44';
  ctx.strokeStyle = '#ffffff66'; ctx.lineWidth = 2;
  ctx.strokeRect(BX, BY, BW, BH);
  const cL = 14;
  ctx.strokeStyle = boss.color; ctx.lineWidth = 2.8; ctx.shadowColor = boss.color; ctx.shadowBlur = 14;
  const corners: [number, number][] = [[BX, BY], [BX + BW, BY], [BX, BY + BH], [BX + BW, BY + BH]];
  for (const [cx2, cy2] of corners) {
    const ddx = cx2 === BX ? 1 : -1; const ddy = cy2 === BY ? 1 : -1;
    ctx.beginPath(); ctx.moveTo(cx2 + ddx * cL, cy2); ctx.lineTo(cx2, cy2); ctx.lineTo(cx2, cy2 + ddy * cL); ctx.stroke();
  }
  ctx.restore();
}

function drawDevourLanes(ctx: CanvasRenderingContext2D, g: GameData) {
  if (g.devourLane < 0) return;
  const lH = BH / 5;
  for (let i = 0; i < 5; i++) {
    const ly = BY + i * lH;
    ctx.save();
    if (i === g.devourLane) {
      ctx.fillStyle = '#002800'; ctx.globalAlpha = 0.55; ctx.fillRect(BX + 1, ly, BW - 2, lH); ctx.globalAlpha = 1;
      ctx.strokeStyle = '#00ff55'; ctx.lineWidth = 2; ctx.shadowBlur = 14; ctx.shadowColor = '#00ff55'; ctx.setLineDash([7, 5]);
      ctx.strokeRect(BX + 1, ly, BW - 2, lH); ctx.setLineDash([]);
      ctx.fillStyle = '#00ff55'; ctx.font = 'bold 10px monospace'; ctx.textAlign = 'center';
      ctx.fillText('SAFE', BX + BW / 2, ly + lH / 2 + 4);
    } else if (g.devourActive) {
      ctx.fillStyle = '#ff000055'; ctx.fillRect(BX + 1, ly, BW - 2, lH);
      ctx.globalAlpha = 0.35 + 0.25 * Math.sin(g.time * 9 + i);
      ctx.fillStyle = '#ff0000'; ctx.fillRect(BX + 1, ly, BW - 2, lH);
    } else {
      ctx.globalAlpha = 0.18 + 0.12 * Math.sin(g.time * 6 + i);
      ctx.fillStyle = '#ff2200'; ctx.fillRect(BX + 1, ly, BW - 2, lH);
    }
    ctx.restore();
  }
}

function drawCurrentArrows(ctx: CanvasRenderingContext2D, g: GameData, boss: BossConf) {
  if (!g.pullActive) return;
  const arrowDir = g.currentPullX < 0 ? -1 : 1;
  ctx.save();
  ctx.globalAlpha = 0.25 + 0.15 * Math.sin(g.time * 8);
  ctx.fillStyle = boss.color;
  for (let i = 0; i < 5; i++) {
    const ax = BX + ((g.time * 60 * arrowDir + i * (BW / 5)) % BW + BW) % BW;
    const ay = BY + BH * (0.15 + i * 0.18);
    ctx.save(); ctx.translate(ax, ay); ctx.rotate(arrowDir > 0 ? 0 : Math.PI);
    ctx.beginPath(); ctx.moveTo(0, -6); ctx.lineTo(10, 0); ctx.lineTo(0, 6); ctx.closePath(); ctx.fill();
    ctx.restore();
  }
  ctx.restore();
}

function drawPistonBlocks(ctx: CanvasRenderingContext2D, g: GameData, boss: BossConf) {
  for (const pb of g.pistonBlocks) {
    ctx.save();
    if (pb.warnTimer > 0) {
      const flash = 0.3 + 0.3 * Math.sin(g.time * 14);
      ctx.globalAlpha = flash;
      ctx.fillStyle = boss.color;
      ctx.strokeStyle = boss.color; ctx.lineWidth = 3;
      ctx.fillRect(pb.x, pb.y, pb.w, pb.h);
    } else if (pb.active) {
      ctx.shadowBlur = 18; ctx.shadowColor = boss.color;
      ctx.fillStyle = boss.color + 'cc'; ctx.strokeStyle = boss.color2; ctx.lineWidth = 3;
      ctx.fillRect(pb.x, pb.y, pb.w, pb.h);
      ctx.strokeRect(pb.x, pb.y, pb.w, pb.h);
      // Striped warning pattern
      ctx.globalAlpha = 0.25;
      ctx.fillStyle = '#ffff00';
      for (let i = 0; i < 8; i++) {
        if (i % 2 === 0) ctx.fillRect(pb.x + i * (pb.w / 8), pb.y, pb.w / 8, pb.h);
      }
    }
    ctx.restore();
  }
}

function drawMirrorSoul(ctx: CanvasRenderingContext2D, g: GameData) {
  if (!g.mirrorSoulActive) return;
  const alpha = g.mirrorSoulPulsing ? 0.4 + 0.4 * Math.sin(g.time * 10) : 0.85;
  ctx.save();
  ctx.globalAlpha = alpha;
  drawHeart(ctx, g.mirrorSoulX, g.mirrorSoulY - 7, 7, g.mirrorSoulPulsing ? '#8888ff' : '#ffffff');
  if (!g.mirrorSoulPulsing) {
    ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 1; ctx.globalAlpha = 0.4;
    ctx.setLineDash([3, 5]);
    ctx.beginPath(); ctx.moveTo(g.player.x, g.player.y); ctx.lineTo(g.mirrorSoulX, g.mirrorSoulY); ctx.stroke();
    ctx.setLineDash([]);
  }
  ctx.restore();
}

function drawStarPoints(ctx: CanvasRenderingContext2D, g: GameData, boss: BossConf) {
  for (const sp of g.starPoints) {
    ctx.save();
    ctx.shadowBlur = 14; ctx.shadowColor = boss.color2;
    ctx.fillStyle = boss.color2;
    ctx.beginPath(); ctx.arc(sp.x, sp.y, 5 + Math.sin(g.time * 6 + sp.id) * 2, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
  }
}

const HP_X = 28, HP_Y = 458, HP_W = 220, HP_H = 14;

function drawUI(ctx: CanvasRenderingContext2D, g: GameData, adminMode: boolean, diffIdx: number) {
  const boss = BOSSES[g.bossIdx];

  ctx.fillStyle = '#ff4466'; ctx.shadowBlur = 8; ctx.shadowColor = '#ff4466';
  ctx.font = 'bold 12px "Courier New", monospace'; ctx.textAlign = 'left';
  ctx.fillText('HP', HP_X, HP_Y - 6);

  ctx.fillStyle = '#2a0a0a'; ctx.fillRect(HP_X, HP_Y, HP_W, HP_H);
  const hpRatio = Math.max(0, g.player.hp / P_MAX_HP);
  const hpCol = hpRatio > 0.5 ? '#ff4466' : hpRatio > 0.25 ? '#ff9900' : '#ff2200';
  ctx.fillStyle = hpCol; ctx.shadowColor = hpCol; ctx.shadowBlur = 10;
  ctx.fillRect(HP_X, HP_Y, HP_W * hpRatio, HP_H);
  ctx.strokeStyle = '#ffffff44'; ctx.lineWidth = 1; ctx.shadowBlur = 0;
  ctx.strokeRect(HP_X, HP_Y, HP_W, HP_H);
  ctx.fillStyle = '#ffffff'; ctx.font = '11px "Courier New", monospace';
  ctx.fillText(`${Math.ceil(Math.max(0, g.player.hp))}/${P_MAX_HP}`, HP_X + HP_W + 8, HP_Y + 11);

  ctx.shadowBlur = 14; ctx.shadowColor = boss.color; ctx.fillStyle = boss.color;
  ctx.font = 'bold 16px "Courier New", monospace'; ctx.textAlign = 'right';
  ctx.fillText(`${g.bossIdx + 1}. ${boss.name}`, W - 28, HP_Y + 2);
  if (boss.title) {
    ctx.fillStyle = '#aaaaaa'; ctx.shadowBlur = 0; ctx.font = '11px "Courier New", monospace';
    ctx.fillText(boss.title, W - 28, HP_Y + 16);
  }

  const atkTotal = boss.attacks.length;
  ctx.fillStyle = '#222'; ctx.fillRect(HP_X, HP_Y + 26, HP_W, 6);
  ctx.fillStyle = boss.color; ctx.shadowColor = boss.color; ctx.shadowBlur = 7;
  const wRatio = (g.atkIdx + (1 - g.atkTimer / boss.atkDur)) / atkTotal;
  ctx.fillRect(HP_X, HP_Y + 26, HP_W * Math.min(1, wRatio), 6);
  ctx.strokeStyle = '#ffffff33'; ctx.lineWidth = 1; ctx.shadowBlur = 0;
  ctx.strokeRect(HP_X, HP_Y + 26, HP_W, 6);
  ctx.fillStyle = '#888'; ctx.font = '10px "Courier New", monospace'; ctx.textAlign = 'left';
  ctx.fillText(`WAVE ${g.atkIdx + 1}/${atkTotal}`, HP_X, HP_Y + 44);

  const tRatio = Math.max(0, g.atkTimer / boss.atkDur);
  ctx.fillStyle = '#111'; ctx.fillRect(W - 185, HP_Y + 26, 155, 6);
  const tCol = tRatio > 0.5 ? '#44ffaa' : tRatio > 0.25 ? '#ffcc00' : '#ff4400';
  ctx.fillStyle = tCol; ctx.shadowColor = tCol; ctx.shadowBlur = 7;
  ctx.fillRect(W - 185, HP_Y + 26, 155 * tRatio, 6);
  ctx.strokeStyle = '#ffffff33'; ctx.lineWidth = 1; ctx.shadowBlur = 0;
  ctx.strokeRect(W - 185, HP_Y + 26, 155, 6);
  ctx.fillStyle = '#888'; ctx.font = '10px "Courier New", monospace'; ctx.textAlign = 'right';
  ctx.fillText(`${Math.max(0, g.atkTimer).toFixed(1)}s`, W - 28, HP_Y + 44);

  if (adminMode) {
    const dl = DIFF_LEVELS[diffIdx];
    ctx.fillStyle = '#00ffcc'; ctx.shadowBlur = 8; ctx.shadowColor = '#00ffcc';
    ctx.font = 'bold 11px "Courier New", monospace'; ctx.textAlign = 'left';
    ctx.fillText(`[ADMIN] ${dl.label} ${dl.mult}x`, HP_X, HP_Y + 58);
    ctx.fillText('1-9: boss 1-9  0: boss 10  E/F: difficulty', HP_X, HP_Y + 70);
    ctx.shadowBlur = 0;
  }

  ctx.textAlign = 'center';

  if (g.ctrlFlipped) {
    ctx.fillStyle = '#ff3300'; ctx.shadowColor = '#ff3300'; ctx.shadowBlur = 16;
    ctx.font = 'bold 13px "Courier New", monospace';
    ctx.fillText('\u26A0 CONTROLS FLIPPED \u26A0', W / 2, BY - 10);
  } else if (g.bossIdx === 1 && !g.ctrlFlipped && g.ctrlFlipTimer < 1.5) {
    const pulse = 0.6 + 0.4 * Math.sin(g.time * 14);
    ctx.globalAlpha = pulse;
    ctx.fillStyle = '#ff8800'; ctx.shadowColor = '#ff8800'; ctx.shadowBlur = 16;
    ctx.font = 'bold 13px "Courier New", monospace';
    ctx.fillText('\u26A0 CONTROLS FLIPPING... \u26A0', W / 2, BY - 10);
    ctx.globalAlpha = 1;
  }

  if (g.timeDistorted) {
    ctx.fillStyle = '#ff9900'; ctx.shadowColor = '#ff9900'; ctx.shadowBlur = 16;
    ctx.font = 'bold 13px "Courier New", monospace';
    ctx.fillText('\u23F1 TIME DISTORTED \u23F1', W / 2, BY + BH + 24);
  } else if (g.bossIdx === 3 && !g.timeDistorted && g.timeDistortTimer < 1.0) {
    const pulse = 0.55 + 0.45 * Math.sin(g.time * 12);
    ctx.globalAlpha = pulse;
    ctx.fillStyle = '#cc7722'; ctx.shadowColor = '#cc7722'; ctx.shadowBlur = 14;
    ctx.font = 'bold 13px "Courier New", monospace';
    ctx.fillText('\u23F1 TIME DISTORTION INCOMING... \u23F1', W / 2, BY + BH + 24);
    ctx.globalAlpha = 1;
  }

  if (g.timeFrozen) {
    const alpha = 0.6 + 0.4 * Math.sin(g.time * 12);
    ctx.globalAlpha = alpha;
    ctx.fillStyle = '#aaddff'; ctx.shadowColor = '#aaddff'; ctx.shadowBlur = 22;
    ctx.font = 'bold 16px "Courier New", monospace';
    ctx.fillText('\u2014 TIME FREEZE \u2014', W / 2, BY - 10);
    ctx.globalAlpha = 1;
  }

  if (g.pullActive) {
    const pulse = 0.5 + 0.5 * Math.sin(g.time * 6);
    ctx.globalAlpha = pulse;
    ctx.fillStyle = '#00ccff'; ctx.shadowColor = '#00ccff'; ctx.shadowBlur = 16;
    ctx.font = 'bold 13px "Courier New", monospace';
    ctx.fillText(`\u21E2 CURRENT PULLING ${g.currentPullX < 0 ? 'LEFT' : 'RIGHT'} \u21E2`, W / 2, BY - 10);
    ctx.globalAlpha = 1;
  }
}

function drawElectricLaser(ctx: CanvasRenderingContext2D, l: Laser, time: number) {
  ctx.save();
  // Soft glow fill
  ctx.globalAlpha = 0.18;
  ctx.fillStyle = l.color; ctx.shadowBlur = 32; ctx.shadowColor = l.color;
  if (l.type === 'h') ctx.fillRect(BX, l.pos - l.width / 2, BW, l.width);
  else ctx.fillRect(l.pos - l.width / 2, BY, l.width, BH);
  ctx.globalAlpha = 1;
  // Two jagged-line passes: wide colored core + thin white highlight
  for (let pass = 0; pass < 2; pass++) {
    ctx.strokeStyle = pass === 0 ? l.color : '#aaeeff';
    ctx.lineWidth   = pass === 0 ? 2.5 : 1;
    ctx.shadowBlur  = pass === 0 ? 20 : 8;
    ctx.shadowColor = l.color;
    ctx.beginPath();
    if (l.type === 'h') {
      const segs = 20;
      ctx.moveTo(BX, l.pos);
      for (let i = 1; i <= segs; i++) {
        const x   = BX + BW * (i / segs);
        const jag = (i % 2 === 0 ? 1 : -1) * (5 + Math.sin(time * 24 + i * 1.9) * 9);
        ctx.lineTo(x, l.pos + jag);
      }
    } else {
      const segs = 16;
      ctx.moveTo(l.pos, BY);
      for (let i = 1; i <= segs; i++) {
        const y   = BY + BH * (i / segs);
        const jag = (i % 2 === 0 ? 1 : -1) * (5 + Math.sin(time * 24 + i * 1.9) * 9);
        ctx.lineTo(l.pos + jag, y);
      }
    }
    ctx.stroke();
  }
  ctx.restore();
}

function renderPlaying(ctx: CanvasRenderingContext2D, g: GameData, adminMode: boolean, diffIdx: number) {
  const boss = BOSSES[g.bossIdx];
  ctx.save();
  ctx.translate(g.shakeX, g.shakeY);

  drawBackground(ctx, g);

  switch (g.bossIdx) {
    case 0: drawBoss1(ctx, g, boss); break;
    case 1: drawBoss2(ctx, g, boss); break;
    case 2: drawBoss3(ctx, g, boss); break;
    case 3: drawBoss4(ctx, g, boss); break;
    case 4: drawBoss5(ctx, g, boss); break;
    case 5: drawBoss6(ctx, g, boss); break;
    case 6: drawBoss7(ctx, g, boss); break;
    case 7: drawBoss8(ctx, g, boss); break;
    case 8: drawBoss9(ctx, g, boss); break;
    case 9: drawBoss10(ctx, g, boss); break;
  }

  drawBox(ctx, boss, g);
  drawDevourLanes(ctx, g);

  // Piston blocks
  drawPistonBlocks(ctx, g, boss);

  // Danger zones
  for (const dz of g.dangerZones) {
    ctx.save();
    if (dz.warnTimer > 0) {
      ctx.globalAlpha = 0.3 + 0.3 * Math.sin(g.time * 11);
      ctx.fillStyle = dz.color; ctx.fillRect(dz.x, dz.y, dz.w, dz.h);
      ctx.strokeStyle = dz.color; ctx.lineWidth = 2; ctx.strokeRect(dz.x, dz.y, dz.w, dz.h);
    } else if (dz.activeTimer > 0) {
      ctx.fillStyle = dz.color + '55'; ctx.fillRect(dz.x, dz.y, dz.w, dz.h);
      ctx.shadowBlur = 20; ctx.shadowColor = dz.color; ctx.strokeStyle = dz.color; ctx.lineWidth = 3; ctx.strokeRect(dz.x, dz.y, dz.w, dz.h);
    }
    ctx.restore();
  }

  // Laser warnings
  for (const lw of g.laserWarns) {
    const alpha = 0.28 + 0.28 * Math.sin(g.time * 9);
    ctx.save(); ctx.globalAlpha = alpha;
    ctx.fillStyle = lw.fake ? '#664400' : '#ff3300';
    if (lw.type === 'h') ctx.fillRect(BX, lw.pos - lw.width / 2, BW, lw.width);
    else ctx.fillRect(lw.pos - lw.width / 2, BY, lw.width, BH);
    ctx.restore();
  }

  // Diagonal warnings
  for (const dw of g.diagWarns) {
    const alpha = 0.28 + 0.24 * Math.sin(g.time * 9);
    ctx.save(); ctx.globalAlpha = alpha;
    ctx.strokeStyle = dw.fake ? '#554400' : '#ffaa00';
    ctx.lineWidth = dw.width; ctx.lineCap = 'round'; ctx.shadowBlur = 12; ctx.shadowColor = dw.fake ? '#443300' : '#ffaa00';
    ctx.beginPath(); ctx.moveTo(dw.x1, dw.y1); ctx.lineTo(dw.x2, dw.y2); ctx.stroke();
    ctx.restore();
  }

  // Active lasers — Boss 6 (Nyxcoil) uses a jagged electric render
  for (const l of g.lasers) {
    if (g.bossIdx === 5) {
      drawElectricLaser(ctx, l, g.time);
    } else {
      ctx.save(); ctx.shadowBlur = 22; ctx.shadowColor = l.color; ctx.fillStyle = l.color;
      if (l.type === 'h') ctx.fillRect(BX, l.pos - l.width / 2, BW, l.width);
      else ctx.fillRect(l.pos - l.width / 2, BY, l.width, BH);
      ctx.restore();
    }
  }

  // Diagonal lasers
  for (const dl of g.diagLasers) {
    ctx.save(); ctx.strokeStyle = dl.color; ctx.lineWidth = dl.width; ctx.lineCap = 'round';
    ctx.shadowBlur = 28; ctx.shadowColor = dl.color;
    ctx.beginPath(); ctx.moveTo(dl.x1, dl.y1); ctx.lineTo(dl.x2, dl.y2); ctx.stroke();
    ctx.restore();
  }

  // Rings
  for (const ring of g.rings) {
    ctx.save(); ctx.strokeStyle = ring.color; ctx.lineWidth = ring.thick; ctx.shadowBlur = 16; ctx.shadowColor = ring.color;
    const segs = 240;
    const step = (Math.PI * 2) / segs;
    for (let s = 0; s < segs; s++) {
      const angle = s * step;
      let inGap = false;
      for (const gap of ring.gaps) { if (Math.abs(angleDiff(angle, gap)) < ring.gapSz) { inGap = true; break; } }
      if (!inGap) { ctx.beginPath(); ctx.arc(ring.cx, ring.cy, ring.r, angle, angle + step + 0.01); ctx.stroke(); }
    }
    ctx.restore();
  }

  // Gears
  for (const gear of g.gears) drawGear(ctx, gear);

  // Clock hands
  for (const hand of g.clockHands) {
    const ex2 = hand.cx + Math.cos(hand.angle) * hand.len;
    const ey2 = hand.cy + Math.sin(hand.angle) * hand.len;
    ctx.save(); ctx.strokeStyle = hand.color; ctx.lineWidth = hand.wid; ctx.lineCap = 'round';
    ctx.shadowBlur = hand.warming ? 6 : 22; ctx.shadowColor = hand.color;
    ctx.beginPath(); ctx.moveTo(hand.cx, hand.cy); ctx.lineTo(ex2, ey2); ctx.stroke();
    ctx.fillStyle = hand.color; ctx.beginPath(); ctx.arc(hand.cx, hand.cy, hand.wid * 0.7, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
  }

  // Star points (Luxora constellation)
  drawStarPoints(ctx, g, boss);

  // Current arrows (Nyxcoil)
  drawCurrentArrows(ctx, g, boss);

  // Mirror soul (Axiom)
  drawMirrorSoul(ctx, g);

  // Warn markers
  drawWarnMarkers(ctx, g);

  // Bullets
  for (const b of g.bullets) {
    if (b.frozen) { ctx.save(); ctx.globalAlpha = 0.55 + Math.sin(g.time * 16) * 0.2; drawBullet(ctx, b); ctx.restore(); }
    else drawBullet(ctx, b);
  }

  // Fake soul
  if (g.fakeSoul.active) {
    ctx.save(); ctx.globalAlpha = 0.72;
    drawHeart(ctx, g.fakeSoul.x, g.fakeSoul.y - 7, 6, '#ff8833');
    ctx.restore();
  }

  // Player heart
  if (!g.player.flicker) {
    drawHeart(ctx, g.player.x, g.player.y - 7, 6, '#ff2244');
  }

  ctx.restore();
  drawUI(ctx, g, adminMode, diffIdx);
}

function renderTitle(ctx: CanvasRenderingContext2D, time: number) {
  ctx.fillStyle = '#000'; ctx.fillRect(0, 0, W, H);
  for (let i = 0; i < 90; i++) {
    const x = (i * 137.5 + time * 6) % W;
    const y = (i * 91.3 + 20) % H;
    ctx.fillStyle = `rgba(255,255,255,${0.25 + 0.25 * Math.sin(time * 2 + i)})`;
    ctx.fillRect(x, y, 1.5, 1.5);
  }
  const pulse = 1 + Math.sin(time * 2.2) * 0.035;
  ctx.save(); ctx.translate(W / 2, H / 2 - 90); ctx.scale(pulse, pulse);
  ctx.shadowBlur = 45; ctx.shadowColor = '#cc44ff'; ctx.fillStyle = '#cc44ff';
  ctx.font = 'bold 74px "Courier New", monospace'; ctx.textAlign = 'center';
  ctx.fillText('SOUL', 0, 0);
  ctx.shadowColor = '#ff2244'; ctx.fillStyle = '#ff2244';
  ctx.fillText('RUSH', 0, 76);
  ctx.restore();
  ctx.shadowBlur = 0; ctx.fillStyle = '#777777'; ctx.font = '13px "Courier New", monospace'; ctx.textAlign = 'center';
  ctx.fillText('— 10-BOSS RUSH MODE  \u2665  BULLET HELL —', W / 2, H / 2 + 14);
  ctx.fillStyle = '#555';
  ['MOVE: Arrow Keys / WASD', 'PAUSE: P    RESTART: R'].forEach((s, i) => ctx.fillText(s, W / 2, H / 2 + 50 + i * 20));
  ctx.globalAlpha = 0.5 + 0.5 * Math.sin(time * 3);
  ctx.fillStyle = '#ffffff'; ctx.shadowBlur = 12; ctx.shadowColor = '#ffffff';
  ctx.font = 'bold 14px "Courier New", monospace';
  ctx.fillText('[ PRESS ENTER TO BEGIN ]', W / 2, H / 2 + 130);
  ctx.globalAlpha = 1;
  ctx.shadowBlur = 0; ctx.fillStyle = '#333'; ctx.font = '10px monospace';
  ctx.fillText('ALL ORIGINAL CHARACTERS — NO COPYRIGHTED CONTENT', W / 2, H - 14);
}

function renderIntro(ctx: CanvasRenderingContext2D, g: GameData) {
  const boss = BOSSES[g.bossIdx];
  ctx.fillStyle = '#000'; ctx.fillRect(0, 0, W, H);
  const grad = ctx.createRadialGradient(W / 2, H / 2, 20, W / 2, H / 2, 370);
  grad.addColorStop(0, boss.bgTint + 'cc'); grad.addColorStop(1, '#000');
  ctx.fillStyle = grad; ctx.fillRect(0, 0, W, H);
  ctx.fillStyle = '#ffffff0a'; ctx.font = 'bold 140px "Courier New", monospace'; ctx.textAlign = 'center';
  ctx.fillText(`${g.bossIdx + 1}`, W / 2, H / 2 + 60);
  ctx.shadowBlur = 35; ctx.shadowColor = boss.color; ctx.fillStyle = boss.color;
  ctx.font = 'bold 40px "Courier New", monospace'; ctx.fillText(boss.name, W / 2, H / 2 - 55);
  if (boss.title) {
    ctx.shadowBlur = 14; ctx.fillStyle = '#aaaaaa'; ctx.font = '20px "Courier New", monospace';
    ctx.fillText(boss.title, W / 2, H / 2 - 18);
  }
  const line = boss.dialog[g.introLine] || '';
  const charCount = Math.min(line.length, Math.floor(g.introTimer * 26));
  ctx.shadowBlur = 8; ctx.shadowColor = boss.color + '55'; ctx.fillStyle = '#cccccc';
  ctx.font = 'italic 15px "Courier New", monospace';
  ctx.fillText(`"${line.slice(0, charCount)}"`, W / 2, H / 2 + 100);
  if (g.introTimer >= 2.0) {
    ctx.globalAlpha = 0.5 + 0.5 * Math.sin(g.time * 4);
    ctx.fillStyle = '#888'; ctx.shadowBlur = 0; ctx.font = '12px "Courier New", monospace';
    ctx.fillText('[ ENTER to continue ]', W / 2, H / 2 + 148);
    ctx.globalAlpha = 1;
  }
}

function renderBossWin(ctx: CanvasRenderingContext2D, g: GameData) {
  const boss = BOSSES[g.bossIdx];
  ctx.fillStyle = '#000'; ctx.fillRect(0, 0, W, H);
  ctx.shadowBlur = 32; ctx.shadowColor = '#44ffaa'; ctx.fillStyle = '#44ffaa';
  ctx.font = 'bold 42px "Courier New", monospace'; ctx.textAlign = 'center';
  ctx.fillText('BOSS DEFEATED', W / 2, H / 2 - 42);
  ctx.shadowColor = boss.color; ctx.fillStyle = boss.color; ctx.font = '22px "Courier New", monospace';
  ctx.fillText(`${boss.name}${boss.title ? ' \u2014 ' + boss.title : ''}`, W / 2, H / 2 + 5);
  if (g.postBossTimer >= 3.0) {
    ctx.globalAlpha = 0.5 + 0.5 * Math.sin(g.time * 3);
    ctx.fillStyle = '#fff'; ctx.shadowBlur = 8; ctx.shadowColor = '#fff'; ctx.font = '14px "Courier New", monospace';
    ctx.fillText(g.bossIdx < BOSSES.length - 1 ? '[ ENTER — face the next boss ]' : '[ ENTER — see your fate ]', W / 2, H / 2 + 68);
    ctx.globalAlpha = 1;
  }
}

function renderGameOver(ctx: CanvasRenderingContext2D, g: GameData) {
  ctx.fillStyle = '#000'; ctx.fillRect(0, 0, W, H);
  ctx.save(); ctx.translate(Math.sin(g.time * 22) * 2, 0);
  ctx.shadowBlur = 38; ctx.shadowColor = '#ff0000'; ctx.fillStyle = '#ff0000';
  ctx.font = 'bold 62px "Courier New", monospace'; ctx.textAlign = 'center';
  ctx.fillText('GAME OVER', W / 2, H / 2 - 28);
  ctx.restore();
  ctx.shadowBlur = 0; ctx.fillStyle = '#666'; ctx.font = '15px "Courier New", monospace';
  ctx.fillText(`Fell to ${BOSSES[g.bossIdx].name}`, W / 2, H / 2 + 24);
  if (g.gameOverTimer >= 1.5) {
    ctx.globalAlpha = 0.5 + 0.5 * Math.sin(g.time * 3);
    ctx.fillStyle = '#aaa'; ctx.font = '13px "Courier New", monospace';
    ctx.fillText('[ R — Restart from the beginning ]', W / 2, H / 2 + 68);
    ctx.globalAlpha = 1;
  }
}

function renderVictory(ctx: CanvasRenderingContext2D, time: number) {
  ctx.fillStyle = '#000'; ctx.fillRect(0, 0, W, H);
  for (let i = 0; i < 16; i++) {
    ctx.fillStyle = `hsla(${(time * 55 + i * 22) % 360},100%,55%,0.025)`;
    ctx.fillRect(0, 0, W, H);
  }
  ctx.shadowBlur = 44; ctx.shadowColor = '#00ffff'; ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 44px "Courier New", monospace'; ctx.textAlign = 'center';
  ctx.fillText('YOU SURVIVED', W / 2, H / 2 - 72);
  ctx.shadowColor = '#ff2244'; ctx.fillStyle = '#00ffff'; ctx.font = 'bold 28px "Courier New", monospace';
  ctx.fillText('THE END OF RULES.', W / 2, H / 2 - 22);
  ctx.shadowBlur = 10; ctx.fillStyle = '#888'; ctx.font = '14px "Courier New", monospace';
  ctx.fillText('All ten bosses have been silenced.', W / 2, H / 2 + 28);
  ctx.fillStyle = '#555'; ctx.font = '12px "Courier New", monospace';
  ctx.fillText('Rules existed. They have been read. Now they end.', W / 2, H / 2 + 52);
  ctx.globalAlpha = 0.5 + 0.5 * Math.sin(time * 2.2);
  ctx.fillStyle = '#fff'; ctx.shadowBlur = 8; ctx.shadowColor = '#fff'; ctx.font = '13px "Courier New", monospace';
  ctx.fillText('[ R or ENTER — return to title ]', W / 2, H / 2 + 104);
  ctx.globalAlpha = 1;
}

function renderFinalVictory(ctx: CanvasRenderingContext2D, time: number) {
  ctx.fillStyle = '#000'; ctx.fillRect(0, 0, W, H);
  for (let i = 0; i < 16; i++) {
    ctx.fillStyle = `hsla(${(time * 55 + i * 22) % 360},100%,55%,0.025)`;
    ctx.fillRect(0, 0, W, H);
  }
  ctx.shadowBlur = 44; ctx.shadowColor = '#00ffff'; ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 32px "Courier New", monospace'; ctx.textAlign = 'center';
  ctx.fillText('You survived the end of rules.', W / 2, H / 2 - 58);
  ctx.shadowBlur = 10; ctx.fillStyle = '#888'; ctx.font = '14px "Courier New", monospace';
  ctx.fillText('All ten bosses have been silenced.', W / 2, H / 2 + 6);
  ctx.fillStyle = '#555'; ctx.font = '12px "Courier New", monospace';
  ctx.fillText('Rules existed. They have been read. Now they end.', W / 2, H / 2 + 32);
  ctx.globalAlpha = 0.5 + 0.5 * Math.sin(time * 2.2);
  ctx.fillStyle = '#fff'; ctx.shadowBlur = 8; ctx.shadowColor = '#fff'; ctx.font = '13px "Courier New", monospace';
  ctx.fillText('[ R or ENTER — return to title ]', W / 2, H / 2 + 86);
  ctx.globalAlpha = 1;
}

function render(ctx: CanvasRenderingContext2D, g: GameData, adminMode: boolean, diffIdx: number) {
  ctx.clearRect(0, 0, W, H);
  switch (g.state) {
    case 'title':    renderTitle(ctx, g.time);                   break;
    case 'intro':    renderIntro(ctx, g);                        break;
    case 'playing':  renderPlaying(ctx, g, adminMode, diffIdx);  break;
    case 'bossWin':  renderBossWin(ctx, g);                      break;
    case 'gameOver': renderGameOver(ctx, g);                     break;
    case 'victory':       renderVictory(ctx, g.time);       break;
    case 'finalVictory':  renderFinalVictory(ctx, g.time); break;
  }
}

// ================================================================
// REACT COMPONENT
// ================================================================

const OVERLAY_STYLE: React.CSSProperties = {
  position: 'absolute',
  top: 0, left: 0, right: 0, bottom: 0,
  display: 'flex', alignItems: 'center', justifyContent: 'center',
  background: 'rgba(0,0,0,0.88)',
  zIndex: 10,
};

const PANEL_STYLE: React.CSSProperties = {
  background: '#080810',
  border: '2px solid #00ffcc44',
  borderRadius: 10,
  padding: '28px 36px',
  minWidth: 560,
  maxWidth: 680,
  fontFamily: '"Courier New", monospace',
  color: '#ccc',
  boxShadow: '0 0 40px #00ffcc22',
};

export default function SoulRush() {
  const canvasRef       = useRef<HTMLCanvasElement>(null);
  const gameRef         = useRef<GameData>(createState());
  const rafRef          = useRef<number>(0);
  const lastRef         = useRef<number>(0);
  const pausedRef       = useRef<boolean>(false);
  const inputFocusedRef = useRef<boolean>(false);
  const diffIdxRef      = useRef<number>(2);
  const adminModeRef    = useRef<boolean>(false);

  const [adminInput,     setAdminInput]     = useState('');
  const [adminMode,      setAdminModeState] = useState(false);
  const [adminPanelOpen, setAdminPanelOpen] = useState(false);
  const [bossGuideOpen,  setBossGuideOpen]  = useState(false);
  const [diffIdx,        setDiffIdxState]   = useState(2);
  const [adminMsg,       setAdminMsg]       = useState('');

  const enableAdmin = () => {
    adminModeRef.current = true;
    setAdminModeState(true);
  };

  const setDiffIdx = (n: number) => {
    diffIdxRef.current = n;
    setDiffIdxState(n);
    gameRef.current.diffMult = DIFF_LEVELS[n].mult;
  };

  const jumpBoss = (idx: number) => {
    jumpToBoss(gameRef.current, idx);
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const g = gameRef.current;

    const onDown = (e: KeyboardEvent) => {
      if (inputFocusedRef.current) return;
      g.keys.add(e.key);
      if ((e.key === 'p' || e.key === 'P') && g.state === 'playing') pausedRef.current = !pausedRef.current;
      if (['ArrowUp','ArrowDown','ArrowLeft','ArrowRight',' '].includes(e.key)) e.preventDefault();
    };
    const onUp = (e: KeyboardEvent) => {
      if (!inputFocusedRef.current) g.keys.delete(e.key);
    };

    window.addEventListener('keydown', onDown);
    window.addEventListener('keyup', onUp);

    const loop = (ts: number) => {
      const dt = Math.min((ts - lastRef.current) / 1000, 0.05);
      lastRef.current = ts;

      const isAdmin = adminModeRef.current;
      const dIdx    = diffIdxRef.current;

      if (!pausedRef.current) {
        update(g, dt, isAdmin, diffIdxRef, setDiffIdx, jumpBoss, inputFocusedRef.current);
      }
      render(ctx, g, isAdmin, dIdx);

      if (pausedRef.current) {
        ctx.fillStyle = 'rgba(0,0,0,0.62)'; ctx.fillRect(0, 0, W, H);
        ctx.shadowBlur = 22; ctx.shadowColor = '#fff'; ctx.fillStyle = '#fff';
        ctx.font = 'bold 42px "Courier New", monospace'; ctx.textAlign = 'center';
        ctx.fillText('PAUSED', W / 2, H / 2);
        ctx.shadowBlur = 0; ctx.fillStyle = '#888'; ctx.font = '14px "Courier New", monospace';
        ctx.fillText('Press P to resume', W / 2, H / 2 + 44);
      }
      rafRef.current = requestAnimationFrame(loop);
    };

    lastRef.current = performance.now();
    rafRef.current  = requestAnimationFrame(loop);

    return () => {
      window.removeEventListener('keydown', onDown);
      window.removeEventListener('keyup', onUp);
      cancelAnimationFrame(rafRef.current);
    };
  }, []);

  const handleAdminInput = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key !== 'Enter') return;
    const val = adminInput.trim();
    if (val === 'Orcas@0112') {
      enableAdmin();
      setAdminPanelOpen(true);
      setAdminMsg('ADMIN MODE ENABLED.');
      setTimeout(() => setAdminMsg(''), 4000);
    } else if (val === 'solution0112') {
      setBossGuideOpen(true);
      setAdminMsg('BOSS GUIDE UNLOCKED.');
      setTimeout(() => setAdminMsg(''), 3000);
    } else {
      setAdminMsg('Unknown command.');
      setTimeout(() => setAdminMsg(''), 2000);
    }
    setAdminInput('');
  };

  const btnStyle = (color: string): React.CSSProperties => ({
    background: 'transparent',
    border: `1px solid ${color}`,
    color,
    fontFamily: '"Courier New", monospace',
    fontSize: 13,
    padding: '5px 12px',
    borderRadius: 4,
    cursor: 'pointer',
    margin: 3,
  });

  const [, forceRender] = useState(0);
  useEffect(() => {
    const id = setInterval(() => forceRender(n => n + 1), 200);
    return () => clearInterval(id);
  }, []);
  const showAdminInput = gameRef.current.state !== 'playing';

  return (
    <div style={{ width: '100vw', height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#000', overflow: 'hidden', position: 'relative' }}>
      <div style={{ position: 'relative' }}>
        <canvas
          ref={canvasRef}
          width={W}
          height={H}
          style={{ display: 'block', maxWidth: '100%', maxHeight: '100%' }}
        />

        {/* Admin panel overlay */}
        {adminPanelOpen && (
          <div style={OVERLAY_STYLE}>
            <div style={PANEL_STYLE}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
                <div style={{ color: '#00ffcc', fontSize: 22, fontWeight: 'bold', letterSpacing: 2, textShadow: '0 0 18px #00ffcc88' }}>
                  ⚙ ADMIN PANEL
                </div>
                <button style={{ ...btnStyle('#555'), fontSize: 16, padding: '2px 10px' }} onClick={() => setAdminPanelOpen(false)}>✕</button>
              </div>

              <div style={{ background: '#0d0d1a', border: '1px solid #00ffcc33', borderRadius: 6, padding: '10px 16px', marginBottom: 20, textAlign: 'center' }}>
                <span style={{ color: '#666', fontSize: 12 }}>CURRENT DIFFICULTY — </span>
                <span style={{ color: '#00ffcc', fontSize: 16, fontWeight: 'bold' }}>
                  {DIFF_LEVELS[diffIdx].label} &nbsp;{DIFF_LEVELS[diffIdx].mult}×
                </span>
              </div>

              <div style={{ display: 'flex', gap: 12, marginBottom: 20 }}>
                <button style={{ flex: 1, ...btnStyle('#44aaff'), fontSize: 16, padding: '10px 0', fontWeight: 'bold' }} onClick={() => { if (diffIdx > 0) setDiffIdx(diffIdx - 1); }}>◀ Easier</button>
                <button style={{ flex: 1, ...btnStyle('#ff4444'), fontSize: 16, padding: '10px 0', fontWeight: 'bold' }} onClick={() => { if (diffIdx < DIFF_LEVELS.length - 1) setDiffIdx(diffIdx + 1); }}>Harder ▶</button>
              </div>

              <div style={{ marginBottom: 22 }}>
                <div style={{ fontSize: 11, color: '#555', marginBottom: 8 }}>SELECT LEVEL</div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                  {DIFF_LEVELS.map((dl, i) => (
                    <button key={dl.label} style={{ ...btnStyle(i === diffIdx ? '#00ffcc' : '#444'), background: i === diffIdx ? '#00ffcc22' : 'transparent', fontSize: 13, padding: '6px 14px' }} onClick={() => setDiffIdx(i)}>
                      {dl.label} {dl.mult}×
                    </button>
                  ))}
                </div>
              </div>

              <div style={{ marginBottom: 16 }}>
                <div style={{ fontSize: 11, color: '#555', marginBottom: 8 }}>BOSS SELECT — jumps with full HP &amp; clean state</div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                  {BOSSES.map((b, i) => (
                    <button key={b.name} style={{ ...btnStyle(b.color), fontSize: 12, padding: '6px 12px', fontWeight: 'bold' }} onClick={() => { jumpBoss(i); setAdminPanelOpen(false); }}>
                      {i === 9 ? '0' : i + 1}. {b.name}
                    </button>
                  ))}
                </div>
              </div>

              <div style={{ fontSize: 11, color: '#444', borderTop: '1px solid #222', paddingTop: 12 }}>
                Keyboard: &nbsp;<span style={{ color: '#666' }}>1–9</span> boss 1–9 · <span style={{ color: '#666' }}>0</span> boss 10 · <span style={{ color: '#666' }}>E</span> easier · <span style={{ color: '#666' }}>F</span> harder
              </div>
            </div>
          </div>
        )}

        {/* Boss guide overlay */}
        {bossGuideOpen && (
          <div style={OVERLAY_STYLE}>
            <div style={{ ...PANEL_STYLE, maxWidth: 560, maxHeight: '90vh', overflowY: 'auto' }}>
              <div style={{ color: '#cc44ff', fontSize: 18, marginBottom: 16, fontWeight: 'bold' }}>BOSS GUIDE — 10 BOSSES</div>
              {BOSS_TIPS.map((tip, i) => (
                <div key={i} style={{ marginBottom: 16 }}>
                  <div style={{ color: BOSSES[i].color, fontSize: 13, fontWeight: 'bold', marginBottom: 5 }}>
                    Boss {i + 1}: {tip.name}
                  </div>
                  <div style={{ fontSize: 11, color: '#999', lineHeight: 1.6 }}>{tip.tip}</div>
                </div>
              ))}
              <button style={{ ...btnStyle('#888'), marginTop: 8 }} onClick={() => setBossGuideOpen(false)}>Close</button>
            </div>
          </div>
        )}

        {/* Admin confirmation toast */}
        {adminMsg && (
          <div style={{ position: 'absolute', bottom: 60, right: 12, background: '#002a22', border: '1px solid #00ffcc', color: '#00ffcc', fontFamily: '"Courier New", monospace', fontSize: 12, padding: '6px 12px', borderRadius: 4 }}>
            {adminMsg}
          </div>
        )}

        {/* Admin command input */}
        {showAdminInput && (
          <div style={{ position: 'absolute', bottom: 18, right: 18, display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 6 }}>
            <div style={{ fontSize: 10, color: '#444', fontFamily: '"Courier New", monospace', letterSpacing: 1 }}>
              ADMIN COMMAND
            </div>
            <input
              type="text"
              value={adminInput}
              placeholder="Type command + Enter"
              onChange={e => setAdminInput(e.target.value)}
              onKeyDown={handleAdminInput}
              onFocus={() => { inputFocusedRef.current = true; }}
              onBlur={() => { inputFocusedRef.current = false; }}
              style={{ width: 220, background: '#0a0a14', border: '1px solid #333', borderRadius: 5, color: '#aaaacc', fontFamily: '"Courier New", monospace', fontSize: 13, padding: '8px 12px', outline: 'none', boxShadow: 'inset 0 0 8px #00000088' }}
            />
            <div style={{ fontSize: 9, color: '#333', fontFamily: 'monospace' }}>
              Orcas@0112 · solution0112
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
