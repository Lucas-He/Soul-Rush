import { useEffect, useRef } from 'react';

// ================================================================
//  SOUL RUSH — Original Bullet-Hell Boss Fight Game
//  5 unique bosses, original characters, HTML Canvas rendering.
//  Inspired by bullet-hell mechanics — all art generated in code.
// ================================================================

// --- CANVAS & BATTLE BOX ---
const W = 800;
const H = 600;
const BX = 220;    // battle box left
const BY = 148;    // battle box top
const BW = 360;    // battle box width
const BH = 285;    // battle box height
const BCX = BX + BW / 2;  // box center x
const BCY = BY + BH / 2;  // box center y

// --- PLAYER ---
const P_SPEED  = 195;   // px/s
const P_MAX_HP = 100;
const P_INV    = 1.5;   // seconds invincibility after hit
const P_HIT_R  = 4;     // collision radius (px)

// --- SCREEN SHAKE ---
const SHAKE_AMT = 8;
const SHAKE_DUR = 0.28;

// ================================================================
// TYPES
// ================================================================

type State = 'title' | 'intro' | 'playing' | 'bossWin' | 'gameOver' | 'victory';

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
  pos: number;    // y for 'h', x for 'v'
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
  gaps: number[];  // gap center angles (radians)
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
// Each boss has unique color, attacks, and personality.
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
    // Boss 1: Teaches warning indicators. Crystal attacks, laser walls, rings.
    attacks: ['crystalRain', 'mirrorWalls', 'shatterPulse', 'crystalRain', 'mirrorWalls'],
    dmg: 10,
    atkDur: 7,
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
    // Boss 2: Chaotic. Square bullets, sweeping bars, safe lanes, control flip.
    attacks: ['bitStorm', 'errorSweep', 'devourLane', 'bitStorm', 'errorSweep', 'devourLane'],
    dmg: 12,
    atkDur: 8,
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
    // Boss 3: Judges. Spiral bullets, diagonal beams (some fake), wing salvos.
    attacks: ['haloSpiral', 'judgmentBeams', 'wingBarrage', 'haloSpiral', 'judgmentBeams'],
    dmg: 14,
    atkDur: 8,
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
    // Boss 4: Time manipulation. Rotating gears, clock hands, time freeze.
    attacks: ['gearMaze', 'clockSlash', 'timeFreeze', 'gearMaze', 'clockSlash', 'gearMaze'],
    dmg: 15,
    atkDur: 9,
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
    // Boss 5: Reality collapse. Dense rain, crown patterns, danger zones, soul split, final combo.
    attacks: ['impossibleScript', 'crownCollapse', 'realityTear', 'soulSplit', 'impossibleScript', 'finalPattern'],
    dmg: 18,
    atkDur: 10,
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

  ctrlFlipped: boolean;
  ctrlFlipTimer: number;

  timeDistorted: boolean;
  timeDistortTimer: number;
  timeFrozen: boolean;
  timeFreezeTimer: number;

  devourLane: number;   // -1 = no lane, 0-4 = safe lane index
  devourActive: boolean;

  shakeX: number; shakeY: number; shakeTimer: number;
  keys: Set<string>;
  nextId: number;
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
    ctrlFlipped: false, ctrlFlipTimer: 0,
    timeDistorted: false, timeDistortTimer: 0,
    timeFrozen: false, timeFreezeTimer: 0,
    devourLane: -1, devourActive: false,
    shakeX: 0, shakeY: 0, shakeTimer: 0,
    keys: new Set(), nextId: 1,
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
  g.devourActive = false; g.devourLane = -1;
  g.timeFrozen = false;
}

function nid(g: GameData) { return g.nextId++; }

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

// ================================================================
// COLLISION DETECTION
// Each entity type has accurate, fair collision.
// ================================================================

function checkHit(g: GameData): boolean {
  if (g.player.invTimer > 0) return false;
  const px = g.player.x, py = g.player.y, pr = P_HIT_R;

  // Bullets
  for (const b of g.bullets) {
    if (b.frozen) continue;
    if (Math.hypot(px - b.x, py - b.y) < pr + b.r) return true;
  }

  // Horizontal / vertical lasers
  for (const l of g.lasers) {
    if (l.type === 'h') {
      if (px >= BX && px <= BX + BW && Math.abs(py - l.pos) < l.width / 2 + pr) return true;
    } else {
      if (py >= BY && py <= BY + BH && Math.abs(px - l.pos) < l.width / 2 + pr) return true;
    }
  }

  // Diagonal lasers
  for (const dl of g.diagLasers) {
    if (distToSeg(px, py, dl.x1, dl.y1, dl.x2, dl.y2) < dl.width / 2 + pr) return true;
  }

  // Rings — hit if inside ring band AND not in a gap
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

  // Danger zones (active only, not warning)
  for (const dz of g.dangerZones) {
    if (dz.warnTimer > 0 || dz.activeTimer <= 0) continue;
    if (px + pr > dz.x && px - pr < dz.x + dz.w && py + pr > dz.y && py - pr < dz.y + dz.h) return true;
  }

  // Devour lanes — everything except safe lane is dangerous
  if (g.devourActive && g.devourLane >= 0) {
    const lH = BH / 5;
    for (let i = 0; i < 5; i++) {
      if (i === g.devourLane) continue;
      const ly = BY + i * lH;
      if (py + pr > ly && py - pr < ly + lH && px >= BX && px <= BX + BW) return true;
    }
  }

  // Gears
  for (const gear of g.gears) {
    if (Math.hypot(px - gear.cx, py - gear.cy) < gear.r * 1.1 + pr) return true;
  }

  // Clock hands (thick line)
  for (const hand of g.clockHands) {
    if (hand.warming) continue;
    const ex = hand.cx + Math.cos(hand.angle) * hand.len;
    const ey = hand.cy + Math.sin(hand.angle) * hand.len;
    if (distToSeg(px, py, hand.cx, hand.cy, ex, ey) < hand.wid / 2 + pr) return true;
  }

  return false;
}

// ================================================================
// ATTACK HANDLERS
// Each attack type has spawn logic and per-frame update logic.
// ================================================================

function updateAttack(g: GameData, dt: number, boss: BossConf) {
  const atk = boss.attacks[g.atkIdx];

  // Boss 1 — Virel
  if (atk === 'crystalRain')  { doCrystalRain(g, dt, boss); return; }
  if (atk === 'mirrorWalls')  { doMirrorWalls(g, dt, boss); return; }
  if (atk === 'shatterPulse') { doShatterPulse(g, dt, boss); return; }

  // Boss 2 — Mawbyte
  if (atk === 'bitStorm')   { doBitStorm(g, dt, boss); return; }
  if (atk === 'errorSweep') { doErrorSweep(g, dt, boss); return; }
  if (atk === 'devourLane') { doDevourLane(g, dt); return; }

  // Boss 3 — Seraph Null
  if (atk === 'haloSpiral')    { doHaloSpiral(g, dt, boss); return; }
  if (atk === 'judgmentBeams') { doJudgmentBeams(g, dt, boss); return; }
  if (atk === 'wingBarrage')   { doWingBarrage(g, dt, boss); return; }

  // Boss 4 — Orryx
  if (atk === 'gearMaze')  { doGearMaze(g, dt, boss); return; }
  if (atk === 'clockSlash'){ doClockSlash(g, dt, boss); return; }
  if (atk === 'timeFreeze'){ doTimeFreeze(g, dt, boss); return; }

  // Boss 5 — The Unreadable King
  if (atk === 'impossibleScript') { doImpossibleScript(g, dt, boss); return; }
  if (atk === 'crownCollapse')    { doCrownCollapse(g, dt, boss); return; }
  if (atk === 'realityTear')      { doRealityTear(g, dt); return; }
  if (atk === 'soulSplit')        { doSoulSplit(g, dt, boss); return; }
  if (atk === 'finalPattern')     { doFinalPattern(g, dt, boss); return; }
}

// --- BOSS SPECIALS applied every frame ---
function applyBossSpecials(g: GameData, dt: number, boss: BossConf) {
  // Mawbyte: control flip every ~12s for 3s
  if (g.bossIdx === 1) {
    g.ctrlFlipTimer -= dt;
    if (g.ctrlFlipTimer <= 0) {
      g.ctrlFlipped = !g.ctrlFlipped;
      g.ctrlFlipTimer = g.ctrlFlipped ? 3.0 : 12.0;
    }
  }
  // Orryx: time distortion during gearMaze
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

// ---- BOSS 1: Virel ----

// crystalRain: Blue/purple crystal shards fall from top at varied speeds.
// Teaches the player that colored objects are harmful.
function doCrystalRain(g: GameData, dt: number, boss: BossConf) {
  g.spawnTimer -= dt;
  if (g.spawnTimer <= 0) {
    g.spawnTimer = 0.11;
    const x = rand(BX + 8, BX + BW - 8);
    g.bullets.push({
      id: nid(g), x, y: BY - 6,
      vx: rand(-18, 18), vy: rand(110, 230),
      r: rand(4, 8), color: Math.random() > 0.5 ? boss.color : boss.color2,
      shape: 'diamond', rot: rand(0, Math.PI * 2), rotSpd: rand(-3, 3), frozen: false,
    });
  }
  moveBullets(g, dt);
  g.bullets = g.bullets.filter(b => b.y < BY + BH + 20 && b.x > BX - 20 && b.x < BX + BW + 20);
}

// mirrorWalls: Warning lines appear, then horizontal/vertical laser walls fire.
// Gaps allow safe passage — teaches reading warnings before they fire.
function doMirrorWalls(g: GameData, dt: number, boss: BossConf) {
  if (g.phase === 0) {
    // Spawn warning lines
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
      g.laserWarns = [];
      shake(g);
    }
  } else if (g.phase === 1) {
    for (const l of g.lasers) l.timer -= dt;
    g.lasers = g.lasers.filter(l => l.timer > 0);
    g.phaseTimer += dt;
    if (g.phaseTimer >= 2.2) { g.phase = 2; g.phaseTimer = 0; g.lasers = []; }
  } else {
    g.phaseTimer += dt;
    if (g.phaseTimer >= 0.9) { g.phase = 0; g.phaseTimer = 0; }
  }
}

// shatterPulse: Expanding rings from battle box center with gaps.
// Player must position in a gap before the ring reaches them.
function doShatterPulse(g: GameData, dt: number, boss: BossConf) {
  g.spawnTimer -= dt;
  if (g.spawnTimer <= 0 && g.spawnCount < 4) {
    g.spawnTimer = 1.5;
    g.spawnCount++;
    const gapCount = 3 + g.spawnCount;
    const gaps: number[] = [];
    const step = (Math.PI * 2) / gapCount;
    const offset = rand(0, step);
    for (let i = 0; i < gapCount; i++) gaps.push(offset + i * step);
    g.rings.push({
      id: nid(g), cx: BCX, cy: BCY, r: 12,
      speed: rand(115, 155), thick: 20,
      gaps, gapSz: Math.PI / (2.8 + g.bossIdx * 0.4),
      color: boss.color,
    });
  }
  for (const ring of g.rings) ring.r += ring.speed * dt;
  g.rings = g.rings.filter(ring => ring.r < 420);
}

// ---- BOSS 2: Mawbyte ----

// bitStorm: Square bullets erupt from edges in orderly-looking waves.
// Looks random, but wave patterns are fair and predictable with practice.
function doBitStorm(g: GameData, dt: number, boss: BossConf) {
  g.spawnTimer -= dt;
  if (g.spawnTimer <= 0) {
    g.spawnTimer = 0.22;
    const edge = randInt(0, 3);
    const count = 6;
    for (let i = 0; i < count; i++) {
      let x: number, y: number, vx: number, vy: number;
      const spread = rand(-35, 35);
      if (edge === 0) { x = BX + BW * (i / count); y = BY - 5; vx = spread * 0.4; vy = rand(100, 160); }
      else if (edge === 1) { x = BX + BW + 5; y = BY + BH * (i / count); vx = rand(-160, -100); vy = spread * 0.4; }
      else if (edge === 2) { x = BX + BW * (i / count); y = BY + BH + 5; vx = spread * 0.4; vy = rand(-160, -100); }
      else { x = BX - 5; y = BY + BH * (i / count); vx = rand(100, 160); vy = spread * 0.4; }
      g.bullets.push({
        id: nid(g), x, y, vx, vy,
        r: 5, color: i % 2 === 0 ? boss.color : boss.color2,
        shape: 'square', rot: 0, rotSpd: rand(-2, 2), frozen: false,
      });
    }
  }
  moveBullets(g, dt);
  g.bullets = g.bullets.filter(b =>
    b.x > BX - 65 && b.x < BX + BW + 65 && b.y > BY - 65 && b.y < BY + BH + 65
  );
}

// errorSweep: A large glitch bar slowly sweeps across the battle box.
// A warning flashes at its start position so the player can move out of the way.
function doErrorSweep(g: GameData, dt: number, boss: BossConf) {
  if (g.phase === 0) {
    if (g.laserWarns.length === 0) {
      const isH = Math.random() > 0.35;
      const pos = isH ? rand(BY + 40, BY + BH - 40) : rand(BX + 40, BX + BW - 40);
      g.laserWarns.push({ id: nid(g), type: isH ? 'h' : 'v', pos, width: 65, timer: 1.0, color: boss.color, fake: false });
    }
    for (const lw of g.laserWarns) lw.timer -= dt;
    g.phaseTimer += dt;
    if (g.phaseTimer >= 1.0) {
      g.phase = 1; g.phaseTimer = 0;
      const lw = g.laserWarns[0];
      g.lasers.push({ id: nid(g), type: lw.type, pos: lw.type === 'h' ? BY - 35 : BX - 35, width: 70, timer: 3.5, color: boss.color });
      g.laserWarns = [];
      shake(g);
    }
  } else if (g.phase === 1) {
    const sweepSpeed = g.lasers[0]?.type === 'h' ? (BH + 70) / 3.0 : (BW + 70) / 3.0;
    for (const l of g.lasers) {
      l.pos += sweepSpeed * dt;
      l.timer -= dt;
    }
    g.lasers = g.lasers.filter(l => {
      return l.type === 'h' ? l.pos < BY + BH + 40 : l.pos < BX + BW + 40;
    });
    if (g.lasers.length === 0) { g.phase = 2; g.phaseTimer = 0; }
  } else {
    g.phaseTimer += dt;
    if (g.phaseTimer >= 0.7) { g.phase = 0; g.phaseTimer = 0; }
  }
}

// devourLane: Battle box splits into 5 horizontal lanes.
// One lane glows green (safe). The other 4 fill with red (dangerous).
// Warning shows which lane is safe BEFORE activating.
function doDevourLane(g: GameData, dt: number) {
  if (g.phase === 0) {
    if (g.devourLane < 0) { g.devourLane = randInt(0, 4); g.devourActive = false; }
    g.phaseTimer += dt;
    if (g.phaseTimer >= 1.6) { g.phase = 1; g.phaseTimer = 0; g.devourActive = true; }
  } else if (g.phase === 1) {
    g.phaseTimer += dt;
    if (g.phaseTimer >= 3.2) { g.phase = 2; g.phaseTimer = 0; g.devourActive = false; g.devourLane = -1; }
  } else {
    g.phaseTimer += dt;
    if (g.phaseTimer >= 0.7) { g.phase = 0; g.phaseTimer = 0; }
  }
}

// ---- BOSS 3: Seraph Null ----

// haloSpiral: Bullets radiate outward in a 5-arm spiral from above the box.
// Arm angle rotates continuously — creates a slow-spinning bullet pattern.
function doHaloSpiral(g: GameData, dt: number, boss: BossConf) {
  g.spawnTimer -= dt;
  const arms = 5;
  if (g.spawnTimer <= 0) {
    g.spawnTimer = 0.09;
    const baseAngle = g.time * 1.6;
    for (let arm = 0; arm < arms; arm++) {
      const angle = baseAngle + (arm * Math.PI * 2) / arms;
      const speed = 135;
      g.bullets.push({
        id: nid(g), x: BCX, y: BY - 55,
        vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed,
        r: 5, color: boss.color, shape: 'circle', rot: 0, rotSpd: 0, frozen: false,
      });
    }
  }
  moveBullets(g, dt);
  g.bullets = g.bullets.filter(b => b.x > -60 && b.x < W + 60 && b.y > -60 && b.y < H + 60);
}

// judgmentBeams: Diagonal laser beams cross the battle box.
// Real beams are brighter. Fake "safe zone" warnings are dimmer — don't be fooled.
function doJudgmentBeams(g: GameData, dt: number, boss: BossConf) {
  if (g.phase === 0) {
    if (g.diagWarns.length === 0) {
      const angles = [0.28, 0.55, 0.78, 1.05];
      for (let i = 0; i < 3; i++) {
        const isFake = i === 1 && Math.random() > 0.45;  // center beam sometimes fake
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
      g.diagLasers = g.diagWarns
        .filter(dw => !dw.fake)
        .map(dw => ({ id: nid(g), x1: dw.x1, y1: dw.y1, x2: dw.x2, y2: dw.y2, width: dw.width, timer: 2.2, color: boss.color }));
      g.diagWarns = [];
      shake(g);
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

// wingBarrage: Elongated diamond bullets fire from both sides of the box in waves.
// Alternating left/right salvos — timing them creates safe gaps.
function doWingBarrage(g: GameData, dt: number, boss: BossConf) {
  g.spawnTimer -= dt;
  if (g.spawnTimer <= 0) {
    g.spawnTimer = 0.2;
    g.spawnCount++;
    const count = 7 + Math.floor(g.spawnCount / 12);
    // Left side
    for (let i = 0; i < count; i++) {
      const y = BY + BH * (i / (count - 1));
      const a = rand(-0.25, 0.25);
      g.bullets.push({ id: nid(g), x: BX - 5, y, vx: Math.cos(a) * 170, vy: Math.sin(a) * 170, r: 6, color: boss.color, shape: 'diamond', rot: 0, rotSpd: 0, frozen: false });
    }
    // Right side on alternating spawns
    if (g.spawnCount % 2 === 0) {
      for (let i = 0; i < count; i++) {
        const y = BY + BH * (i / (count - 1));
        const a = Math.PI + rand(-0.25, 0.25);
        g.bullets.push({ id: nid(g), x: BX + BW + 5, y, vx: Math.cos(a) * 170, vy: Math.sin(a) * 170, r: 6, color: boss.color2, shape: 'diamond', rot: 0, rotSpd: 0, frozen: false });
      }
    }
  }
  moveBullets(g, dt);
  g.bullets = g.bullets.filter(b =>
    b.x > BX - 90 && b.x < BX + BW + 90 && b.y > BY - 20 && b.y < BY + BH + 20
  );
}

// ---- BOSS 4: Orryx ----

// gearMaze: Large rotating gears traverse the battle box.
// Speed is distorted randomly — warning text shown when distortion begins.
function doGearMaze(g: GameData, dt: number, boss: BossConf) {
  if (g.gears.length === 0) {
    for (let i = 0; i < 3; i++) {
      const fromLeft = Math.random() > 0.5;
      g.gears.push({
        id: nid(g),
        cx: fromLeft ? BX - 45 : BX + BW + 45,
        cy: BY + BH * (0.2 + i * 0.3),
        r: 32 + i * 7,
        rot: 0, rotSpd: fromLeft ? rand(0.9, 1.6) : rand(-1.6, -0.9),
        color: boss.color, vx: fromLeft ? rand(48, 72) : rand(-72, -48), vy: 0,
      });
    }
  }
  const spdMult = g.timeDistorted ? (0.55 + Math.abs(Math.sin(g.time * 3.5)) * 0.9) : 1.0;
  for (const gear of g.gears) {
    gear.cx += gear.vx * spdMult * dt;
    gear.rot += gear.rotSpd * dt;
    if (gear.cx > BX + BW + gear.r * 2.2) gear.vx = -Math.abs(gear.vx);
    if (gear.cx < BX - gear.r * 2.2) gear.vx = Math.abs(gear.vx);
  }
}

// clockSlash: Two rotating clock hands sweep the battle box.
// Appear with a brief warm-up glow before becoming dangerous.
function doClockSlash(g: GameData, dt: number, boss: BossConf) {
  if (g.clockHands.length === 0 && g.phase === 0) {
    g.phase = 1; g.phaseTimer = 1.0;
  }
  if (g.phase === 1) {
    g.phaseTimer -= dt;
    if (g.phaseTimer <= 0 && g.clockHands.length === 0) {
      g.clockHands.push({
        id: nid(g), cx: BCX, cy: BCY,
        len: BW * 0.44, wid: 12,
        angle: 0, rotSpd: 1.25, color: boss.color, warming: false,
      });
      g.clockHands.push({
        id: nid(g), cx: BCX, cy: BCY,
        len: BW * 0.28, wid: 16,
        angle: Math.PI, rotSpd: -0.9, color: boss.color2, warming: false,
      });
      shake(g);
    }
  }
  for (const hand of g.clockHands) hand.angle += hand.rotSpd * dt;
}

// timeFreeze: Spawns bullets then FREEZES them for 2 seconds.
// Warning text shows "TIME FREEZE". Then bullets resume at 1.8x velocity.
function doTimeFreeze(g: GameData, dt: number, boss: BossConf) {
  if (g.phase === 0) {
    g.spawnTimer -= dt;
    if (g.spawnTimer <= 0) {
      g.spawnTimer = 0.14;
      g.spawnCount++;
      const angle = (g.spawnCount * Math.PI * 2) / 18;
      g.bullets.push({
        id: nid(g), x: BCX, y: BY - 55,
        vx: Math.cos(angle) * 95, vy: Math.sin(angle) * 95,
        r: 7, color: boss.color, shape: 'circle', rot: 0, rotSpd: 0, frozen: false,
      });
    }
    moveBullets(g, dt);
    g.phaseTimer += dt;
    if (g.phaseTimer >= 2.2) { g.phase = 1; g.phaseTimer = 0; g.timeFrozen = true; for (const b of g.bullets) b.frozen = true; }
  } else if (g.phase === 1) {
    g.phaseTimer += dt;
    if (g.phaseTimer >= 2.4) {
      g.phase = 2; g.phaseTimer = 0; g.timeFrozen = false;
      for (const b of g.bullets) { b.frozen = false; b.vx *= 1.8; b.vy *= 1.8; }
      shake(g);
    }
  } else {
    moveBullets(g, dt);
    g.bullets = g.bullets.filter(b => b.x > -60 && b.x < W + 60 && b.y > -60 && b.y < H + 60);
  }
}

// ---- BOSS 5: The Unreadable King ----

// impossibleScript: Dense rain of small bullets from above the box.
// Very high density — narrow safe channels exist but move quickly.
function doImpossibleScript(g: GameData, dt: number, boss: BossConf) {
  g.spawnTimer -= dt;
  if (g.spawnTimer <= 0) {
    g.spawnTimer = 0.055;
    const x = rand(BX + 4, BX + BW - 4);
    g.bullets.push({
      id: nid(g), x, y: BY - 5,
      vx: rand(-12, 12), vy: rand(160, 285),
      r: 4, color: Math.random() > 0.5 ? boss.color : boss.color2,
      shape: 'circle', rot: 0, rotSpd: 0, frozen: false,
    });
  }
  moveBullets(g, dt);
  g.bullets = g.bullets.filter(b => b.y < BY + BH + 15 && b.x > BX - 5 && b.x < BX + BW + 5);
}

// crownCollapse: 7 streams of bullets descend from the top, converging inward.
// Forms a crown-shaped closing pattern — gaps exist at the edges and center.
function doCrownCollapse(g: GameData, dt: number, boss: BossConf) {
  g.spawnTimer -= dt;
  if (g.spawnTimer <= 0) {
    g.spawnTimer = 0.21;
    const streams = 7;
    for (let i = 0; i < streams; i++) {
      const startX = BX + BW * (i / (streams - 1));
      const targetX = BCX + (Math.random() > 0.5 ? rand(-15, 15) : 0);
      const dx = targetX - startX, dy = BCY - BY;
      const len = Math.sqrt(dx * dx + dy * dy);
      const speed = 165;
      g.bullets.push({
        id: nid(g), x: startX, y: BY - 5,
        vx: (dx / len) * speed, vy: (dy / len) * speed,
        r: 5, color: i % 2 === 0 ? boss.color : boss.color2,
        shape: 'diamond', rot: 0, rotSpd: rand(-3, 3), frozen: false,
      });
    }
  }
  moveBullets(g, dt);
  g.bullets = g.bullets.filter(b => b.x > BX - 20 && b.x < BX + BW + 20 && b.y > BY - 10 && b.y < BY + BH + 25);
}

// realityTear: Random rectangular zones in the box flash red (warning),
// then become active danger areas. Zones disappear after a few seconds.
function doRealityTear(g: GameData, dt: number) {
  g.spawnTimer -= dt;
  if (g.spawnTimer <= 0 && g.dangerZones.length < 4) {
    g.spawnTimer = rand(0.75, 1.4);
    const zw = rand(55, 115), zh = rand(48, 95);
    g.dangerZones.push({
      id: nid(g),
      x: rand(BX + 4, BX + BW - zw - 4), y: rand(BY + 4, BY + BH - zh - 4),
      w: zw, h: zh, warnTimer: 1.0, activeTimer: 2.6, color: '#ff2222',
    });
  }
  for (const dz of g.dangerZones) {
    if (dz.warnTimer > 0) dz.warnTimer -= dt;
    else dz.activeTimer -= dt;
  }
  g.dangerZones = g.dangerZones.filter(dz => dz.warnTimer > 0 || dz.activeTimer > 0);
}

// soulSplit: A fake soul appears and mirrors the player's movement.
// The fake soul is a slightly different color. Only the real soul takes damage.
function doSoulSplit(g: GameData, dt: number, boss: BossConf) {
  if (!g.fakeSoul.active) {
    g.fakeSoul.active = true;
    g.fakeSoul.x = g.player.x + 50;
    g.fakeSoul.y = g.player.y;
  }
  // Mirror movement with slight lag
  g.fakeSoul.x += (g.player.x + 48 - g.fakeSoul.x) * 5.5 * dt;
  g.fakeSoul.y += (g.player.y    - g.fakeSoul.y)   * 5.5 * dt;
  // Also add slow circular bullet pressure
  g.spawnTimer -= dt;
  if (g.spawnTimer <= 0) {
    g.spawnTimer = 0.38;
    const angle = g.time * 1.1;
    for (let i = 0; i < 6; i++) {
      const a = angle + (i * Math.PI * 2) / 6;
      g.bullets.push({ id: nid(g), x: BCX, y: BY - 55, vx: Math.cos(a) * 115, vy: Math.sin(a) * 115, r: 5, color: boss.color, shape: 'circle', rot: 0, rotSpd: 0, frozen: false });
    }
  }
  moveBullets(g, dt);
  g.bullets = g.bullets.filter(b => b.x > -60 && b.x < W + 60 && b.y > -60 && b.y < H + 60);
}

// finalPattern: The ultimate combination attack.
// Dense bullet rain + 4-arm spiral + sweeping diagonal beams simultaneously.
// All elements have visible warnings — technically dodgeable with focus.
function doFinalPattern(g: GameData, dt: number, boss: BossConf) {
  g.spawnTimer -= dt;
  if (g.spawnTimer <= 0) {
    g.spawnTimer = 0.075;
    // Dense rain
    g.bullets.push({
      id: nid(g), x: rand(BX, BX + BW), y: BY - 5,
      vx: rand(-10, 10), vy: rand(165, 255),
      r: 4, color: boss.color, shape: 'circle', rot: 0, rotSpd: 0, frozen: false,
    });
    // 4-arm spiral
    const sa = g.time * 2.2;
    for (let arm = 0; arm < 4; arm++) {
      const a = sa + (arm * Math.PI * 2) / 4;
      g.bullets.push({ id: nid(g), x: BCX, y: BY - 55, vx: Math.cos(a) * 145, vy: Math.sin(a) * 145, r: 5, color: boss.color2, shape: 'circle', rot: 0, rotSpd: 0, frozen: false });
    }
  }
  // Diagonal beam cycle every 3.8s
  g.phaseTimer += dt;
  if (g.phaseTimer > 3.8 && g.diagWarns.length === 0 && g.diagLasers.length === 0) {
    g.phaseTimer = 0;
    const angles = [0.3, 0.65, 0.9];
    for (const angle of angles) {
      const len = 265;
      g.diagWarns.push({
        id: nid(g),
        x1: BCX - Math.cos(angle) * len, y1: BCY - Math.sin(angle) * len,
        x2: BCX + Math.cos(angle) * len, y2: BCY + Math.sin(angle) * len,
        width: 24, timer: 1.2, color: '#aa0000', fake: false,
      });
    }
  }
  for (const dw of g.diagWarns) dw.timer -= dt;
  if (g.diagWarns.length > 0 && g.diagWarns[0].timer <= 0) {
    g.diagLasers = g.diagWarns.map(dw => ({ id: nid(g), x1: dw.x1, y1: dw.y1, x2: dw.x2, y2: dw.y2, width: dw.width, timer: 1.6, color: boss.color2 }));
    g.diagWarns = [];
    shake(g);
  }
  for (const dl of g.diagLasers) dl.timer -= dt;
  g.diagLasers = g.diagLasers.filter(dl => dl.timer > 0);
  moveBullets(g, dt);
  g.bullets = g.bullets.filter(b => b.x > -60 && b.x < W + 60 && b.y > -60 && b.y < H + 60);
}

function moveBullets(g: GameData, dt: number) {
  for (const b of g.bullets) {
    if (!b.frozen) { b.x += b.vx * dt; b.y += b.vy * dt; }
    b.rot += b.rotSpd * dt;
  }
}

// ================================================================
// MAIN GAME UPDATE
// ================================================================

function update(g: GameData, dt: number) {
  const cap = Math.min(dt, 0.05);
  g.time += cap;

  if (g.state === 'title') {
    if (g.keys.has('Enter') || g.keys.has(' ')) {
      g.state = 'intro'; g.introTimer = 0; g.introLine = 0;
      resetForBoss(g, 0);
    }
    return;
  }
  if (g.state === 'intro') {
    g.introTimer += cap;
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
    if (g.postBossTimer >= 3.0 && (g.keys.has('Enter') || g.keys.has(' '))) {
      const next = g.bossIdx + 1;
      if (next >= BOSSES.length) { g.state = 'victory'; }
      else { resetForBoss(g, next); g.state = 'intro'; g.introTimer = 0; g.introLine = 0; }
    }
    return;
  }
  if (g.state === 'gameOver') {
    g.gameOverTimer += cap;
    if (g.gameOverTimer >= 1.5 && g.keys.has('r')) { resetForBoss(g, 0); g.state = 'title'; g.gameOverTimer = 0; }
    return;
  }
  if (g.state === 'victory') {
    if (g.keys.has('r') || g.keys.has('Enter') || g.keys.has(' ')) { resetForBoss(g, 0); g.state = 'title'; }
    return;
  }

  // ---- PLAYING ----
  const boss = BOSSES[g.bossIdx];

  // Player movement
  let dx = 0, dy = 0;
  if (g.keys.has('ArrowLeft')  || g.keys.has('a')) dx -= 1;
  if (g.keys.has('ArrowRight') || g.keys.has('d')) dx += 1;
  if (g.keys.has('ArrowUp')    || g.keys.has('w')) dy -= 1;
  if (g.keys.has('ArrowDown')  || g.keys.has('s')) dy += 1;
  if (g.ctrlFlipped) { dx = -dx; dy = -dy; }

  const baseSpd = g.timeDistorted ? P_SPEED * (0.55 + Math.abs(Math.sin(g.time * 4)) * 0.85) : P_SPEED;
  const diag = dx !== 0 && dy !== 0 ? 0.7071 : 1;
  g.player.x += dx * diag * baseSpd * cap;
  g.player.y += dy * diag * baseSpd * cap;
  g.player.x = Math.max(BX + P_HIT_R, Math.min(BX + BW - P_HIT_R, g.player.x));
  g.player.y = Math.max(BY + P_HIT_R, Math.min(BY + BH - P_HIT_R, g.player.y));

  // Invincibility frames & flicker
  if (g.player.invTimer > 0) {
    g.player.invTimer -= cap;
    g.player.flicker = Math.floor(g.player.invTimer * 10) % 2 === 0;
  } else { g.player.flicker = false; }

  // Screen shake decay
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

  // Collision & damage
  if (checkHit(g)) {
    g.player.hp -= boss.dmg;
    g.player.invTimer = P_INV;
    shake(g);
    if (g.player.hp <= 0) {
      g.player.hp = 0;
      g.state = 'gameOver';
      g.gameOverTimer = 0;
      clearEntities(g);
    }
  }

  // Attack timer — advance to next attack when expired
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
// RENDERING — Canvas drawing functions
// ================================================================

// Glowing heart shape for the player soul
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
  ctx.fillStyle = gear.color + '30';
  ctx.strokeStyle = gear.color; ctx.lineWidth = 3;
  ctx.beginPath(); ctx.arc(0, 0, gear.r, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
  // Teeth
  const teeth = 8;
  for (let i = 0; i < teeth; i++) {
    const a = (i * Math.PI * 2) / teeth;
    ctx.save(); ctx.translate(Math.cos(a) * gear.r, Math.sin(a) * gear.r); ctx.rotate(a);
    ctx.fillStyle = gear.color; ctx.fillRect(-4, -6, 8, 12); ctx.restore();
  }
  ctx.beginPath(); ctx.arc(0, 0, gear.r * 0.38, 0, Math.PI * 2); ctx.strokeStyle = gear.color; ctx.stroke();
  ctx.restore();
}

// Boss 1: Virel — Crystal knight with angular armor, cracked eye, orbiting shards
function drawBoss1(ctx: CanvasRenderingContext2D, g: GameData, boss: BossConf) {
  ctx.save();
  ctx.translate(BCX, BY - 72 + Math.sin(g.bossAngle) * 5);
  ctx.shadowBlur = 22; ctx.shadowColor = boss.color;

  // Body
  ctx.fillStyle = boss.color + '88'; ctx.strokeStyle = boss.color; ctx.lineWidth = 2;
  ctx.beginPath(); ctx.moveTo(0, -52); ctx.lineTo(26, -18); ctx.lineTo(32, 32); ctx.lineTo(-32, 32); ctx.lineTo(-26, -18); ctx.closePath(); ctx.fill(); ctx.stroke();
  // Facets
  ctx.fillStyle = boss.color2 + '55';
  ctx.beginPath(); ctx.moveTo(-12, -52); ctx.lineTo(0, -52); ctx.lineTo(26, -18); ctx.lineTo(-4, -14); ctx.closePath(); ctx.fill();
  // Cracked eye
  ctx.fillStyle = '#ffffff'; ctx.shadowColor = '#ffffff';
  ctx.beginPath(); ctx.ellipse(5, -12, 11, 7, 0, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#4488ff'; ctx.beginPath(); ctx.arc(5, -12, 5, 0, Math.PI * 2); ctx.fill();
  // Crack lines on eye
  ctx.strokeStyle = '#ffffff88'; ctx.lineWidth = 1.5;
  ctx.beginPath(); ctx.moveTo(9, -20); ctx.lineTo(13, -7); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(13, -7); ctx.lineTo(16, -4); ctx.stroke();
  // Orbiting shards
  for (let i = 0; i < 4; i++) {
    const a = g.bossAngle * 1.6 + i * Math.PI * 0.5;
    ctx.save(); ctx.translate(Math.cos(a) * 48, Math.sin(a) * 18 - 18); ctx.rotate(a);
    ctx.fillStyle = boss.color + 'cc'; ctx.shadowColor = boss.color;
    ctx.beginPath(); ctx.moveTo(0, -9); ctx.lineTo(4, 0); ctx.lineTo(0, 9); ctx.lineTo(-4, 0); ctx.closePath(); ctx.fill();
    ctx.restore();
  }
  ctx.restore();
}

// Boss 2: Mawbyte — Glitchy broken-square monster, error-code colors
function drawBoss2(ctx: CanvasRenderingContext2D, g: GameData, boss: BossConf) {
  ctx.save();
  ctx.translate(BCX, BY - 68);
  const glitch = Math.sin(g.glitchTimer * 22) > 0.72;
  const gox = glitch ? rand(-5, 5) : 0; const goy = glitch ? rand(-3, 3) : 0;
  ctx.shadowBlur = 15; ctx.shadowColor = boss.color;

  const rects = [
    { x: -22, y: -38, w: 44, h: 48, c: boss.color + '88' },
    { x: -27, y: -16, w: 16, h: 22, c: boss.color2 + '66' },
    { x: 16, y: -10, w: 13, h: 26, c: boss.color + '55' },
    { x: -11, y: 10, w: 33, h: 21, c: boss.color2 + '44' },
  ];
  for (const r of rects) {
    const ox = glitch && Math.random() > 0.8 ? rand(-3, 3) : 0;
    ctx.fillStyle = r.c; ctx.fillRect(r.x + gox + ox, r.y + goy, r.w, r.h);
    ctx.strokeStyle = r.c.slice(0, 7); ctx.lineWidth = 1; ctx.strokeRect(r.x + gox + ox, r.y + goy, r.w, r.h);
  }
  // Teeth
  ctx.fillStyle = boss.color2;
  for (let i = 0; i < 6; i++) ctx.fillRect(-18 + i * 7 + gox, 10 + goy, 5, 13);
  // Glitchy eye
  const ex = glitch ? rand(-3, 3) : 0;
  ctx.fillStyle = boss.color; ctx.shadowColor = boss.color;
  ctx.beginPath(); ctx.arc(0 + ex, -22 + goy, 9, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#000'; ctx.beginPath(); ctx.arc(1 + ex, -22 + goy, 4, 0, Math.PI * 2); ctx.fill();
  // Error text
  ctx.fillStyle = boss.color2; ctx.font = '8px monospace'; ctx.globalAlpha = 0.7;
  ctx.fillText(Math.floor(g.time * 3) % 2 === 0 ? 'ERR' : '0xF', -30, -52 + goy);
  ctx.globalAlpha = 1;
  ctx.restore();
}

// Boss 3: Seraph Null — Angelic robotic mask, triangle halo, broken wings
function drawBoss3(ctx: CanvasRenderingContext2D, g: GameData, boss: BossConf) {
  ctx.save();
  ctx.translate(BCX, BY - 78 + Math.sin(g.bossAngle * 0.7) * 6);
  ctx.shadowBlur = 22; ctx.shadowColor = boss.color;

  // Rotating triangle halo
  ctx.save(); ctx.rotate(g.bossAngle);
  for (let i = 0; i < 7; i++) {
    const ha = (i / 7) * Math.PI * 2;
    ctx.save(); ctx.translate(Math.cos(ha) * 56, Math.sin(ha) * 20); ctx.rotate(ha + Math.PI / 2);
    ctx.fillStyle = boss.color; ctx.shadowColor = boss.color; ctx.shadowBlur = 8;
    ctx.beginPath(); ctx.moveTo(0, -8); ctx.lineTo(7, 8); ctx.lineTo(-7, 8); ctx.closePath(); ctx.fill(); ctx.restore();
  }
  ctx.restore();

  // Face mask
  ctx.fillStyle = '#151515'; ctx.strokeStyle = boss.color; ctx.lineWidth = 2.5;
  ctx.beginPath(); ctx.ellipse(0, -10, 29, 40, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
  // Eye slits
  ctx.fillStyle = boss.color; ctx.shadowColor = boss.color; ctx.shadowBlur = 12;
  ctx.fillRect(-22, -24, 16, 5); ctx.fillRect(6, -24, 16, 5);
  // Nose mark
  ctx.strokeStyle = boss.color + '88'; ctx.lineWidth = 1.5;
  ctx.beginPath(); ctx.moveTo(-5, -10); ctx.lineTo(0, 0); ctx.lineTo(5, -10); ctx.stroke();
  // Broken wings
  ctx.strokeStyle = boss.color + '66'; ctx.lineWidth = 2.5;
  ctx.beginPath(); ctx.moveTo(-29, -12); ctx.lineTo(-55, -42); ctx.lineTo(-40, -7); ctx.lineTo(-68, -12); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(29, -12); ctx.lineTo(55, -42); ctx.lineTo(40, -7); ctx.lineTo(68, -12); ctx.stroke();
  // Rotating rings
  for (let i = 0; i < 2; i++) {
    ctx.save(); ctx.rotate(g.bossAngle * 0.5 + i * Math.PI);
    ctx.strokeStyle = '#ffffff44'; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.ellipse(0, 0, 40, 13, 0, 0, Math.PI * 2); ctx.stroke();
    ctx.restore();
  }
  ctx.restore();
}

// Boss 4: Orryx — Clock-faced beast, rotating hands, glowing gear-eyes
function drawBoss4(ctx: CanvasRenderingContext2D, g: GameData, boss: BossConf) {
  ctx.save();
  ctx.translate(BCX, BY - 78 + Math.sin(g.bossAngle * 0.5) * 4);
  ctx.shadowBlur = 18; ctx.shadowColor = boss.color;

  // Clock body
  ctx.fillStyle = '#1a0e00'; ctx.strokeStyle = boss.color; ctx.lineWidth = 3;
  ctx.beginPath(); ctx.arc(0, 0, 42, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
  // Ticks
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * Math.PI * 2 - Math.PI / 2;
    ctx.fillStyle = boss.color; ctx.beginPath(); ctx.arc(Math.cos(a) * 34, Math.sin(a) * 34, i % 3 === 0 ? 2.5 : 1.5, 0, Math.PI * 2); ctx.fill();
  }
  // Hour hand
  ctx.strokeStyle = boss.color2; ctx.lineWidth = 4; ctx.lineCap = 'round';
  ctx.save(); ctx.rotate(g.time * 0.3);
  ctx.beginPath(); ctx.moveTo(0, 5); ctx.lineTo(0, -26); ctx.stroke(); ctx.restore();
  // Minute hand
  ctx.strokeStyle = '#ffffff88'; ctx.lineWidth = 2;
  ctx.save(); ctx.rotate(g.time * 1.3);
  ctx.beginPath(); ctx.moveTo(0, 5); ctx.lineTo(0, -36); ctx.stroke(); ctx.restore();
  // Center pin
  ctx.fillStyle = boss.color2; ctx.beginPath(); ctx.arc(0, 0, 4, 0, Math.PI * 2); ctx.fill();
  // Eyes below clock
  ctx.fillStyle = '#ff6600'; ctx.shadowColor = '#ff6600'; ctx.shadowBlur = 14;
  ctx.beginPath(); ctx.ellipse(-19, 54, 9, 6, 0, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.ellipse(19, 54, 9, 6, 0, 0, Math.PI * 2); ctx.fill();
  // Decorative mini-gears
  for (let i = 0; i < 2; i++) {
    const ga = g.bossAngle * 0.9 + i * Math.PI;
    ctx.save(); ctx.translate(Math.cos(ga) * 62, Math.sin(ga) * 26); ctx.rotate(g.bossAngle * 2 * (i === 0 ? 1 : -1));
    ctx.strokeStyle = boss.color + '88'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(0, 0, 13, 0, Math.PI * 2); ctx.stroke();
    for (let t = 0; t < 6; t++) {
      const ta = (t / 6) * Math.PI * 2;
      ctx.fillStyle = boss.color + '88';
      ctx.save(); ctx.translate(Math.cos(ta) * 13, Math.sin(ta) * 13); ctx.rotate(ta); ctx.fillRect(-2, -4, 4, 8); ctx.restore();
    }
    ctx.restore();
  }
  ctx.restore();
}

// Boss 5: The Unreadable King — Reality-collapsing crown entity
function drawBoss5(ctx: CanvasRenderingContext2D, g: GameData, boss: BossConf) {
  ctx.save();
  ctx.translate(BCX, BY - 78);
  ctx.shadowBlur = 28; ctx.shadowColor = boss.color;
  ctx.globalAlpha = 0.9 + Math.sin(g.time * 16) * 0.1;

  // Crown
  ctx.fillStyle = boss.color + 'cc'; ctx.strokeStyle = boss.color; ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(-38, 22); ctx.lineTo(-38, -10); ctx.lineTo(-22, -34); ctx.lineTo(-10, -10);
  ctx.lineTo(0, -44); ctx.lineTo(10, -10); ctx.lineTo(22, -34); ctx.lineTo(38, -10); ctx.lineTo(38, 22); ctx.closePath();
  ctx.fill(); ctx.stroke();

  // Face void
  ctx.fillStyle = '#000'; ctx.fillRect(-21, -5, 42, 30);

  // Shifting symbols as eyes
  const syms = ['Ψ', 'Ω', '∞', '⚡', '◈', '☾', '⚔'];
  const t = g.time;
  ctx.fillStyle = boss.color2; ctx.font = 'bold 14px serif'; ctx.shadowColor = boss.color2;
  ctx.textAlign = 'center';
  ctx.fillText(syms[Math.floor(t * 6) % syms.length], -10, 16);
  ctx.fillText(syms[(Math.floor(t * 8) + 3) % syms.length], 10, 16);

  // Orbiting eyes
  for (let i = 0; i < 5; i++) {
    const ea = g.bossAngle * 1.4 + i * Math.PI * 2 / 5;
    const ex = Math.cos(ea) * 58, ey = Math.sin(ea) * 24 + 5;
    ctx.fillStyle = boss.color2; ctx.shadowColor = boss.color2;
    ctx.beginPath(); ctx.arc(ex, ey, 4 + Math.sin(t * 9 + i) * 1.5, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#000'; ctx.beginPath(); ctx.arc(ex, ey, 2, 0, Math.PI * 2); ctx.fill();
  }

  // Floating broken text
  ctx.font = '7px monospace'; ctx.globalAlpha = 0.45;
  ctx.fillStyle = boss.color;
  ['K\u0338\u0337I\u0336N\u0338G', '̷̢', '...'].forEach((f, i) => {
    ctx.fillText(f, Math.cos(t * 2.2 + i * 2) * 75, Math.sin(t * 3 + i) * 30 - 10);
  });
  ctx.globalAlpha = 1;
  ctx.restore();
}

function drawBackground(ctx: CanvasRenderingContext2D, g: GameData) {
  const boss = BOSSES[g.bossIdx];
  ctx.fillStyle = '#000'; ctx.fillRect(0, 0, W, H);
  const grad = ctx.createRadialGradient(BCX, BCY, 40, BCX, H * 0.55, 420);
  grad.addColorStop(0, boss.bgTint); grad.addColorStop(1, '#000000');
  ctx.fillStyle = grad; ctx.fillRect(0, 0, W, H);
  // Subtle scanlines
  ctx.fillStyle = 'rgba(0,0,0,0.1)';
  for (let y = 0; y < H; y += 3) ctx.fillRect(0, y, W, 1);
}

function drawBox(ctx: CanvasRenderingContext2D, boss: BossConf) {
  ctx.save();
  ctx.shadowBlur = 10; ctx.shadowColor = '#ffffff44';
  ctx.strokeStyle = '#ffffff66'; ctx.lineWidth = 2;
  ctx.strokeRect(BX, BY, BW, BH);
  // Boss-colored corner accents
  const cL = 14;
  ctx.strokeStyle = boss.color; ctx.lineWidth = 2.8; ctx.shadowColor = boss.color; ctx.shadowBlur = 14;
  const corners: [number, number][] = [[BX, BY], [BX + BW, BY], [BX, BY + BH], [BX + BW, BY + BH]];
  for (const [cx, cy] of corners) {
    const dx = cx === BX ? 1 : -1; const dy = cy === BY ? 1 : -1;
    ctx.beginPath(); ctx.moveTo(cx + dx * cL, cy); ctx.lineTo(cx, cy); ctx.lineTo(cx, cy + dy * cL); ctx.stroke();
  }
  ctx.restore();
}

function drawDevourLanes(ctx: CanvasRenderingContext2D, g: GameData, boss: BossConf) {
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

const HP_X = 28, HP_Y = 458, HP_W = 220, HP_H = 14;

function drawUI(ctx: CanvasRenderingContext2D, g: GameData) {
  const boss = BOSSES[g.bossIdx];

  // HP label
  ctx.fillStyle = '#ff4466'; ctx.shadowBlur = 8; ctx.shadowColor = '#ff4466';
  ctx.font = 'bold 12px "Courier New", monospace'; ctx.textAlign = 'left';
  ctx.fillText('HP', HP_X, HP_Y - 6);

  // HP bar
  ctx.fillStyle = '#2a0a0a'; ctx.fillRect(HP_X, HP_Y, HP_W, HP_H);
  const hpRatio = Math.max(0, g.player.hp / P_MAX_HP);
  const hpCol = hpRatio > 0.5 ? '#ff4466' : hpRatio > 0.25 ? '#ff9900' : '#ff2200';
  ctx.fillStyle = hpCol; ctx.shadowColor = hpCol; ctx.shadowBlur = 10;
  ctx.fillRect(HP_X, HP_Y, HP_W * hpRatio, HP_H);
  ctx.strokeStyle = '#ffffff44'; ctx.lineWidth = 1; ctx.shadowBlur = 0;
  ctx.strokeRect(HP_X, HP_Y, HP_W, HP_H);
  ctx.fillStyle = '#ffffff'; ctx.font = '11px "Courier New", monospace';
  ctx.fillText(`${g.player.hp}/${P_MAX_HP}`, HP_X + HP_W + 8, HP_Y + 11);

  // Boss name
  ctx.shadowBlur = 14; ctx.shadowColor = boss.color; ctx.fillStyle = boss.color;
  ctx.font = 'bold 16px "Courier New", monospace'; ctx.textAlign = 'right';
  ctx.fillText(boss.name, W - 28, HP_Y + 2);
  if (boss.title) {
    ctx.fillStyle = '#aaaaaa'; ctx.shadowBlur = 0; ctx.font = '11px "Courier New", monospace';
    ctx.fillText(boss.title, W - 28, HP_Y + 16);
  }

  // Wave progress
  const atkTotal = boss.attacks.length;
  ctx.fillStyle = '#222'; ctx.fillRect(HP_X, HP_Y + 26, HP_W, 6);
  ctx.fillStyle = boss.color; ctx.shadowColor = boss.color; ctx.shadowBlur = 7;
  const wRatio = (g.atkIdx + (1 - g.atkTimer / boss.atkDur)) / atkTotal;
  ctx.fillRect(HP_X, HP_Y + 26, HP_W * Math.min(1, wRatio), 6);
  ctx.strokeStyle = '#ffffff33'; ctx.lineWidth = 1; ctx.shadowBlur = 0;
  ctx.strokeRect(HP_X, HP_Y + 26, HP_W, 6);
  ctx.fillStyle = '#888'; ctx.font = '10px "Courier New", monospace'; ctx.textAlign = 'left';
  ctx.fillText(`WAVE ${g.atkIdx + 1}/${atkTotal}`, HP_X, HP_Y + 44);

  // Attack timer bar
  const tRatio = Math.max(0, g.atkTimer / boss.atkDur);
  ctx.fillStyle = '#111'; ctx.fillRect(W - 185, HP_Y + 26, 155, 6);
  const tCol = tRatio > 0.5 ? '#44ffaa' : tRatio > 0.25 ? '#ffcc00' : '#ff4400';
  ctx.fillStyle = tCol; ctx.shadowColor = tCol; ctx.shadowBlur = 7;
  ctx.fillRect(W - 185, HP_Y + 26, 155 * tRatio, 6);
  ctx.strokeStyle = '#ffffff33'; ctx.lineWidth = 1; ctx.shadowBlur = 0;
  ctx.strokeRect(W - 185, HP_Y + 26, 155, 6);
  ctx.fillStyle = '#888'; ctx.font = '10px "Courier New", monospace'; ctx.textAlign = 'right';
  ctx.fillText(`${Math.max(0, g.atkTimer).toFixed(1)}s`, W - 28, HP_Y + 44);

  // Special status overlays
  ctx.textAlign = 'center';
  if (g.ctrlFlipped) {
    ctx.fillStyle = '#ff3300'; ctx.shadowColor = '#ff3300'; ctx.shadowBlur = 16;
    ctx.font = 'bold 13px "Courier New", monospace';
    ctx.fillText('\u26A0 CONTROLS FLIPPED \u26A0', W / 2, BY - 10);
  }
  if (g.timeDistorted) {
    ctx.fillStyle = '#ff9900'; ctx.shadowColor = '#ff9900'; ctx.shadowBlur = 16;
    ctx.font = 'bold 13px "Courier New", monospace';
    ctx.fillText('\u23F1 TIME DISTORTED \u23F1', W / 2, BY + BH + 24);
  }
  if (g.timeFrozen) {
    const alpha = 0.6 + 0.4 * Math.sin(g.time * 12);
    ctx.globalAlpha = alpha;
    ctx.fillStyle = '#aaddff'; ctx.shadowColor = '#aaddff'; ctx.shadowBlur = 22;
    ctx.font = 'bold 16px "Courier New", monospace';
    ctx.fillText('\u2014 TIME FREEZE \u2014', W / 2, BY - 10);
    ctx.globalAlpha = 1;
  }
}

function renderPlaying(ctx: CanvasRenderingContext2D, g: GameData) {
  const boss = BOSSES[g.bossIdx];
  ctx.save();
  ctx.translate(g.shakeX, g.shakeY);

  drawBackground(ctx, g);

  // Boss visual
  switch (g.bossIdx) {
    case 0: drawBoss1(ctx, g, boss); break;
    case 1: drawBoss2(ctx, g, boss); break;
    case 2: drawBoss3(ctx, g, boss); break;
    case 3: drawBoss4(ctx, g, boss); break;
    case 4: drawBoss5(ctx, g, boss); break;
  }

  drawBox(ctx, boss);
  drawDevourLanes(ctx, g, boss);

  // Danger zones
  for (const dz of g.dangerZones) {
    ctx.save();
    if (dz.warnTimer > 0) {
      ctx.globalAlpha = 0.3 + 0.3 * Math.sin(g.time * 11);
      ctx.fillStyle = '#ff0000'; ctx.fillRect(dz.x, dz.y, dz.w, dz.h);
      ctx.strokeStyle = '#ff4444'; ctx.lineWidth = 2; ctx.strokeRect(dz.x, dz.y, dz.w, dz.h);
    } else if (dz.activeTimer > 0) {
      ctx.fillStyle = '#ff000055'; ctx.fillRect(dz.x, dz.y, dz.w, dz.h);
      ctx.shadowBlur = 20; ctx.shadowColor = '#ff0000'; ctx.strokeStyle = '#ff2222'; ctx.lineWidth = 3; ctx.strokeRect(dz.x, dz.y, dz.w, dz.h);
    }
    ctx.restore();
  }

  // Laser warnings
  for (const lw of g.laserWarns) {
    const alpha = 0.28 + 0.28 * Math.sin(g.time * 9);
    ctx.save(); ctx.globalAlpha = alpha;
    ctx.fillStyle = '#ff3300';
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

  // Active lasers
  for (const l of g.lasers) {
    ctx.save(); ctx.shadowBlur = 22; ctx.shadowColor = l.color; ctx.fillStyle = l.color;
    if (l.type === 'h') ctx.fillRect(BX, l.pos - l.width / 2, BW, l.width);
    else ctx.fillRect(l.pos - l.width / 2, BY, l.width, BH);
    ctx.restore();
  }

  // Diagonal lasers
  for (const dl of g.diagLasers) {
    ctx.save(); ctx.strokeStyle = dl.color; ctx.lineWidth = dl.width; ctx.lineCap = 'round';
    ctx.shadowBlur = 28; ctx.shadowColor = dl.color;
    ctx.beginPath(); ctx.moveTo(dl.x1, dl.y1); ctx.lineTo(dl.x2, dl.y2); ctx.stroke();
    ctx.restore();
  }

  // Rings (drawn as arc segments, gaps are omitted)
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
    const ex = hand.cx + Math.cos(hand.angle) * hand.len;
    const ey = hand.cy + Math.sin(hand.angle) * hand.len;
    ctx.save(); ctx.strokeStyle = hand.color; ctx.lineWidth = hand.wid; ctx.lineCap = 'round';
    ctx.shadowBlur = hand.warming ? 6 : 22; ctx.shadowColor = hand.color;
    ctx.beginPath(); ctx.moveTo(hand.cx, hand.cy); ctx.lineTo(ex, ey); ctx.stroke();
    // Center circle
    ctx.fillStyle = hand.color; ctx.beginPath(); ctx.arc(hand.cx, hand.cy, hand.wid * 0.7, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
  }

  // Bullets
  for (const b of g.bullets) {
    if (b.frozen) { ctx.save(); ctx.globalAlpha = 0.55 + Math.sin(g.time * 16) * 0.2; drawBullet(ctx, b); ctx.restore(); }
    else drawBullet(ctx, b);
  }

  // Fake soul (Boss 5 soul split)
  if (g.fakeSoul.active) {
    ctx.save(); ctx.globalAlpha = 0.72;
    drawHeart(ctx, g.fakeSoul.x, g.fakeSoul.y - 7, 6, '#ff8833');
    ctx.restore();
  }

  // Player heart
  if (!g.player.flicker) {
    drawHeart(ctx, g.player.x, g.player.y - 7, 6, '#ff2244');
  }

  ctx.restore(); // end shake translation
  drawUI(ctx, g);
}

function renderTitle(ctx: CanvasRenderingContext2D, time: number) {
  ctx.fillStyle = '#000'; ctx.fillRect(0, 0, W, H);
  // Stars
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
  ctx.fillText('— 5 ORIGINAL BOSSES  \u2665  BULLET HELL —', W / 2, H / 2 + 14);
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

  // Big boss number
  ctx.fillStyle = '#ffffff0a'; ctx.font = 'bold 140px "Courier New", monospace'; ctx.textAlign = 'center';
  ctx.fillText(`${g.bossIdx + 1}`, W / 2, H / 2 + 60);

  ctx.shadowBlur = 35; ctx.shadowColor = boss.color; ctx.fillStyle = boss.color;
  ctx.font = 'bold 40px "Courier New", monospace'; ctx.fillText(boss.name, W / 2, H / 2 - 55);
  if (boss.title) {
    ctx.shadowBlur = 14; ctx.fillStyle = '#aaaaaa'; ctx.font = '20px "Courier New", monospace';
    ctx.fillText(boss.title, W / 2, H / 2 - 18);
  }

  // Dialog with typewriter
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
  // Colour shimmer
  for (let i = 0; i < 16; i++) {
    ctx.fillStyle = `hsla(${(time * 55 + i * 22) % 360},100%,55%,0.025)`;
    ctx.fillRect(0, 0, W, H);
  }
  ctx.shadowBlur = 44; ctx.shadowColor = '#cc44ff'; ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 44px "Courier New", monospace'; ctx.textAlign = 'center';
  ctx.fillText('YOU SURVIVED', W / 2, H / 2 - 62);
  ctx.shadowColor = '#ff2244'; ctx.fillStyle = '#cc44ff'; ctx.font = 'bold 32px "Courier New", monospace';
  ctx.fillText('THE UNREADABLE.', W / 2, H / 2 - 14);
  ctx.shadowBlur = 10; ctx.fillStyle = '#888'; ctx.font = '14px "Courier New", monospace';
  ctx.fillText('All five bosses have been silenced.', W / 2, H / 2 + 36);
  ctx.globalAlpha = 0.5 + 0.5 * Math.sin(time * 2.2);
  ctx.fillStyle = '#fff'; ctx.shadowBlur = 8; ctx.shadowColor = '#fff'; ctx.font = '13px "Courier New", monospace';
  ctx.fillText('[ R or ENTER — return to title ]', W / 2, H / 2 + 100);
  ctx.globalAlpha = 1;
}

function render(ctx: CanvasRenderingContext2D, g: GameData) {
  ctx.clearRect(0, 0, W, H);
  switch (g.state) {
    case 'title':   renderTitle(ctx, g.time);   break;
    case 'intro':   renderIntro(ctx, g);        break;
    case 'playing': renderPlaying(ctx, g);      break;
    case 'bossWin': renderBossWin(ctx, g);      break;
    case 'gameOver':renderGameOver(ctx, g);     break;
    case 'victory': renderVictory(ctx, g.time); break;
  }
}

// ================================================================
// REACT COMPONENT
// ================================================================

export default function SoulRush() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const gameRef   = useRef<GameData>(createState());
  const rafRef    = useRef<number>(0);
  const lastRef   = useRef<number>(0);
  const pausedRef = useRef<boolean>(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const g = gameRef.current;

    const onDown = (e: KeyboardEvent) => {
      g.keys.add(e.key);
      if ((e.key === 'p' || e.key === 'P') && g.state === 'playing') pausedRef.current = !pausedRef.current;
      if (['ArrowUp','ArrowDown','ArrowLeft','ArrowRight',' '].includes(e.key)) e.preventDefault();
    };
    const onUp = (e: KeyboardEvent) => g.keys.delete(e.key);

    window.addEventListener('keydown', onDown);
    window.addEventListener('keyup', onUp);

    const loop = (ts: number) => {
      const dt = Math.min((ts - lastRef.current) / 1000, 0.05);
      lastRef.current = ts;
      if (!pausedRef.current) update(g, dt);
      render(ctx, g);

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

  return (
    <div style={{ width: '100vw', height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#000', overflow: 'hidden' }}>
      <canvas
        ref={canvasRef}
        width={W}
        height={H}
        style={{ display: 'block', maxWidth: '100%', maxHeight: '100%' }}
      />
    </div>
  );
}
