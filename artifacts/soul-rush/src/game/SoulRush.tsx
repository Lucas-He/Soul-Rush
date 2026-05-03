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
// HAZARD VISUAL SCALE
// Bullets, lasers, warnings, and rings render 30% larger visually.
// Player size, player hitbox, and collision radii are NOT changed.
// ================================================================
const HAZARD_VISUAL_SCALE = 1.3;
const PLAYER_VISUAL_SCALE  = 1.0; // documented reference — player draw uses this implicitly
const PLAYER_HITBOX_SCALE  = 1.0; // player collision radius stays small and fair

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
  {
    name: 'Vyrial, Moth of Velvet Plague',
    tip: 'Spore Bloom fires radially from the center — sprint to the arena edge the moment you see the ring warn. In Velvet Swarm keep moving in wide circles so homing spores trail behind you. Plague Garden zones shrink over time but never overlap at the very center — identify your safe tile during the warn and plant yourself there.',
  },
  {
    name: 'Echora, the Masked Choir',
    tip: 'Silent Beat has a deceptive long silence before a massive radial burst — stay away from arena walls when the music stops. Chrome Hymn lasers track your position at the moment they charge, not when they fire — sidestep AFTER the glow locks. Broken Rhythm alternates fast and slow bursts unpredictably; hug the center and react rather than anticipate.',
  },
  {
    name: 'Vantus, the Gravity Rex',
    tip: 'In Gravity Pull sprint perpendicular to the pull direction to maintain position rather than fighting it head-on. Orbit Break bullets lock their path when spawned and do not adjust mid-flight — strafe through the gap in the formation. For Collapse Ring the safe zone is the very edge of the arena; move there immediately on warn.',
  },
  {
    name: 'Caloric, the Last Candle',
    tip: 'Wax Flood rises from the bottom — get to the top quarter early and stay there. Blue Flame Lane has exactly one safe strip that does not move during the wave; find it and hold it. Flicker Fakeout: the dim barely-visible candles are the real projectiles; ignore the big bright flame in the center.',
  },
  {
    name: 'Zylvira, the Static Widow',
    tip: 'Web Grid has one open cell per row — the safe cell shifts every 2 seconds, so read the NEXT gap while standing in the current one. VHS Storm fires at where you were exactly 1 second ago; sprint forward into its origin to lap it. Static Mirror reverses direction on its second appearance — prepare to counter-strafe.',
  },
  {
    name: 'Atlas Minor',
    tip: "Meteor Lesson aims at your position from 0.5 s ago — keep moving and let it chase your past self. Tiny Apocalypse overlaps three separate wave patterns; the center column is usually clear of all three simultaneously. Planet Spin safe zone is at the 9-o'clock position relative to the boss — rotate with it, do not stand still.",
  },
  {
    name: 'Xiu, the Paper Emperor',
    tip: "Paper Cuts arrive from all four sides in sequence — the order is always Left→Right→Top→Bottom, so dodge inward between each pair. Ink Decree marks areas in red that become instant-kill; the unmarked corridor is always diagonal. Emperor's Letter targets the arena center — vacate it the moment you see the gold seal warn.",
  },
  {
    name: 'Mnemovex, the Archive',
    tip: 'Memory Replay replicates the bullet pattern from exactly 4 seconds prior — what you dodged then you must dodge again mirrored. Crystal Repeat adds a half-rotation offset to the replay so your muscle memory will betray you; slow down and re-read it. Echo Cage walls close from opposite corners simultaneously — the safe zone is the remaining diagonal gap.',
  },
  {
    name: 'Lunara, the Cruel Curtain',
    tip: 'String Pull forces your movement along a fixed axis for 2 seconds — pre-position yourself at the center of that axis before it activates. Moon Drop targets your last standing position; take one step sideways just before impact. Theater Crush walls close from all sides leaving only a small central bubble — sprint to center immediately and do not move until it opens.',
  },
  {
    name: 'Soulvex, the First and Last',
    tip: 'Boss Memory Chain cycles all 20 bosses in sequence — each sub-pattern lasts 2.5 s and they escalate in speed; treat it as a reflex test not a memorization test. First Mistake is deliberately misleading — the decoy burst is harmless; dodge the thin ring that follows 0.3 s later. Axiom Rewrite remaps the entire arena boundary; ignore your old muscle memory and read the new cyan edges.',
  },
];

// ================================================================
// TYPES
// ================================================================

type State = 'title' | 'intro' | 'playing' | 'bossWin' | 'gameOver' | 'victory' | 'finalVictory' | 'waveEnd';

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

interface Wave {
  id: string; name: string; description: string;
  duration: number; attackType: string; warningType: string;
  bulletSpeed: number; spawnRate: number; damage: number;
  arenaEffect: string; patternTags: string[]; execute: string;
  // Computed by applyFairnessDebuffs at module init (do not hand-edit)
  warnDuration?: number;     // seconds of visible pre-attack warning derived from warningType
  safeGapFraction?: number;  // fraction of arena that remains safe at peak bullet density (0–1)
  layers?: number;           // simultaneous mechanic layers (patternTags + arenaEffect weight)
}

interface Item {
  id: string; name: string; type: string; description: string;
  maxStack: number; usable: boolean; allowedInLeaderboard: boolean;
  iconShape: string; themeColor: string; effect: string;
  bossSource: string; rarity: string; useFunction: string;
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
  difficultyLabel?: string;
  themeColors?: string[];
  personality?: string;
  design?: string;
  arenaModifier?: string;
  rewardItemPool?: string[];
  waves?: Wave[];
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
    attacks: ['crystalRain', 'mirrorWalls', 'shatterPulse', 'constellationLines', 'haloCurse'],
    dmg: 16,
    atkDur: 5,
    rewardItemPool: ['candle_ash', 'echo_fragment'],
    waves: [
      { id: 'vr1', name: 'Crystal Rain', description: 'Crystal shards fall from the top in staggered lanes.', duration: 5, attackType: 'rain', warningType: 'top', bulletSpeed: 185, spawnRate: 11, damage: 16, arenaEffect: 'none', patternTags: ['rain'], execute: 'crystalRain' },
      { id: 'vr2', name: 'Mirror Walls', description: 'Horizontal and vertical laser walls appear after warning lines.', duration: 5, attackType: 'laser', warningType: 'side', bulletSpeed: 0, spawnRate: 2, damage: 16, arenaEffect: 'none', patternTags: ['laser', 'wall'], execute: 'mirrorWalls' },
      { id: 'vr3', name: 'Shatter Pulse', description: 'Expanding crystal rings grow from center with rotating gaps.', duration: 5, attackType: 'ring', warningType: 'ring', bulletSpeed: 115, spawnRate: 2, damage: 16, arenaEffect: 'none', patternTags: ['ring', 'multi'], execute: 'shatterPulse' },
      { id: 'vr4', name: 'Prism Crossfire', description: 'Angled beams connect across the arena after warning reflections.', duration: 5, attackType: 'laser', warningType: 'dot', bulletSpeed: 0, spawnRate: 6, damage: 16, arenaEffect: 'none', patternTags: ['laser', 'diag'], execute: 'constellationLines' },
      { id: 'vr5', name: 'Prism Prison', description: 'Crystal walls trap the player with one escape gap then shatter into diagonal shards.', duration: 5, attackType: 'ring', warningType: 'ring', bulletSpeed: 90, spawnRate: 1, damage: 16, arenaEffect: 'none', patternTags: ['ring', 'gap'], execute: 'haloCurse' },
    ],
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
    attacks: ['bitStorm', 'errorSweep', 'devourLane', 'bitStorm', 'wingBarrage', 'boneRain'],
    dmg: 18,
    atkDur: 6,
    rewardItemPool: ['candle_ash', 'moth_wing'],
    waves: [
      { id: 'mb1', name: 'Bit Storm', description: 'Pixel bullets scatter in square-grid bursts from both sides.', duration: 6, attackType: 'sweep', warningType: 'side', bulletSpeed: 195, spawnRate: 11, damage: 18, arenaEffect: 'none', patternTags: ['sweep'], execute: 'bitStorm' },
      { id: 'mb2', name: 'Error Sweep', description: 'Giant glitch bars sweep across the arena from random sides.', duration: 6, attackType: 'sweep', warningType: 'side', bulletSpeed: 182, spawnRate: 7, damage: 18, arenaEffect: 'none', patternTags: ['sweep'], execute: 'errorSweep' },
      { id: 'mb3', name: 'Devour Lane', description: 'Only one safe lane remains while corruption fills the rest.', duration: 6, attackType: 'laser', warningType: 'row', bulletSpeed: 0, spawnRate: 1, damage: 18, arenaEffect: 'none', patternTags: ['laser', 'sweep'], execute: 'devourLane' },
      { id: 'mb4', name: 'Corrupted Download', description: 'Blocks fall in chunky file-download patterns with a moving gap.', duration: 6, attackType: 'sweep', warningType: 'side', bulletSpeed: 178, spawnRate: 9, damage: 18, arenaEffect: 'none', patternTags: ['sweep'], execute: 'bitStorm' },
      { id: 'mb5', name: 'Input Rot', description: 'Fake letters rain down — only bright-red ones deal damage.', duration: 6, attackType: 'rain', warningType: 'top', bulletSpeed: 170, spawnRate: 9, damage: 18, arenaEffect: 'none', patternTags: ['rain', 'fake'], execute: 'wingBarrage' },
      { id: 'mb6', name: 'Cache Bite', description: 'Glitch teeth snap at the positions you occupied a moment ago.', duration: 6, attackType: 'aimed', warningType: 'target', bulletSpeed: 195, spawnRate: 6, damage: 18, arenaEffect: 'none', patternTags: ['aimed', 'memory'], execute: 'boneRain' },
    ],
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
    attacks: ['haloSpiral', 'judgmentBeams', 'wingBarrage', 'judgmentBeams', 'mothEclipse', 'ribCage', 'crownCollapse'],
    dmg: 20,
    atkDur: 6,
    rewardItemPool: ['wax_seal', 'candle_ash'],
    waves: [
      { id: 'sn1', name: 'Halo Spiral', description: 'Halo bullets spiral outward in rotating golden arms.', duration: 6, attackType: 'spiral', warningType: 'ring', bulletSpeed: 135, spawnRate: 7, damage: 20, arenaEffect: 'none', patternTags: ['spiral'], execute: 'haloSpiral' },
      { id: 'sn2', name: 'Judgment Beams', description: 'Diagonal divine beams fire after golden warning lines.', duration: 6, attackType: 'laser', warningType: 'column', bulletSpeed: 0, spawnRate: 5, damage: 20, arenaEffect: 'none', patternTags: ['laser', 'column'], execute: 'judgmentBeams' },
      { id: 'sn3', name: 'Wing Barrage', description: 'Feather bullets enter from both sides in alternating waves.', duration: 6, attackType: 'rain', warningType: 'top', bulletSpeed: 165, spawnRate: 9, damage: 20, arenaEffect: 'none', patternTags: ['rain', 'dense'], execute: 'wingBarrage' },
      { id: 'sn4', name: 'False Judgment', description: 'Fake beam warnings appear — only the brighter beams are real.', duration: 6, attackType: 'laser', warningType: 'column', bulletSpeed: 0, spawnRate: 6, damage: 20, arenaEffect: 'none', patternTags: ['laser', 'fake'], execute: 'judgmentBeams' },
      { id: 'sn5', name: 'Null Verdict', description: 'Safe circles shrink while halo bullets orbit around them.', duration: 6, attackType: 'ring', warningType: 'ring', bulletSpeed: 82, spawnRate: 1, damage: 20, arenaEffect: 'eclipse', patternTags: ['ring', 'gap'], execute: 'mothEclipse' },
      { id: 'sn6', name: 'Seraphic Cage', description: 'Golden cage bars close inward forcing movement through holy gaps.', duration: 6, attackType: 'wall', warningType: 'side', bulletSpeed: 0, spawnRate: 1, damage: 20, arenaEffect: 'none', patternTags: ['wall', 'gap'], execute: 'ribCage' },
      { id: 'sn7', name: 'Broken Halo', description: 'Halo fragments ricochet around the arena like sharp triangle bullets.', duration: 6, attackType: 'radial', warningType: 'ring', bulletSpeed: 165, spawnRate: 12, damage: 20, arenaEffect: 'none', patternTags: ['radial', 'burst'], execute: 'crownCollapse' },
    ],
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
    attacks: ['gearMaze', 'timeFreeze', 'clockSlash', 'timeFreeze', 'gearMaze', 'haloSpiral', 'ribCage', 'boneRain'],
    dmg: 22,
    atkDur: 7,
    rewardItemPool: ['echo_fragment', 'candle_ash'],
    waves: [
      { id: 'or1', name: 'Gear Maze', description: 'Rotating gears move through the arena like crushing mechanical walls.', duration: 7, attackType: 'maze', warningType: 'center', bulletSpeed: 95, spawnRate: 7, damage: 22, arenaEffect: 'none', patternTags: ['maze', 'rotate'], execute: 'gearMaze' },
      { id: 'or2', name: 'Time Freeze', description: 'Bullets freeze briefly then suddenly resume at full speed.', duration: 7, attackType: 'freeze', warningType: 'glow', bulletSpeed: 135, spawnRate: 6, damage: 22, arenaEffect: 'freeze', patternTags: ['freeze', 'burst'], execute: 'timeFreeze' },
      { id: 'or3', name: 'Clock Hand Slash', description: 'Giant clock hands rotate across the arena in sweeping arcs.', duration: 7, attackType: 'orbit', warningType: 'center', bulletSpeed: 0, spawnRate: 3, damage: 22, arenaEffect: 'none', patternTags: ['orbit', 'laser'], execute: 'clockSlash' },
      { id: 'or4', name: 'Rewind Strike', description: 'Bullets reverse direction after a warning flash.', duration: 7, attackType: 'freeze', warningType: 'glow', bulletSpeed: 145, spawnRate: 6, damage: 22, arenaEffect: 'freeze', patternTags: ['freeze', 'reverse'], execute: 'timeFreeze' },
      { id: 'or5', name: 'Midnight Loop', description: 'A pattern repeats three times but each loop shifts the safe gap.', duration: 7, attackType: 'maze', warningType: 'center', bulletSpeed: 105, spawnRate: 8, damage: 22, arenaEffect: 'none', patternTags: ['maze', 'rotate'], execute: 'gearMaze' },
      { id: 'or6', name: 'Second Hand Spiral', description: 'Thin clock-hand bullets spiral tightly from the center outward.', duration: 7, attackType: 'spiral', warningType: 'ring', bulletSpeed: 140, spawnRate: 7, damage: 22, arenaEffect: 'none', patternTags: ['spiral', 'thin'], execute: 'haloSpiral' },
      { id: 'or7', name: 'Pendulum Crush', description: 'Huge pendulum blades swing from side to side with warning arcs.', duration: 7, attackType: 'wall', warningType: 'side', bulletSpeed: 0, spawnRate: 2, damage: 22, arenaEffect: 'none', patternTags: ['wall', 'swing'], execute: 'ribCage' },
      { id: 'or8', name: 'Time Debt', description: 'Delayed ghost bullets appear where the player stood three seconds ago.', duration: 7, attackType: 'aimed', warningType: 'target', bulletSpeed: 175, spawnRate: 6, damage: 22, arenaEffect: 'none', patternTags: ['aimed', 'memory'], execute: 'boneRain' },
    ],
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
    attacks: ['impossibleScript', 'crownCollapse', 'realityTear', 'errorSweep', 'soulSplit', 'devourLane', 'haloSpiral', 'gearMaze', 'finalPattern'],
    dmg: 26,
    atkDur: 8,
    rewardItemPool: ['ink_blot', 'candle_ash'],
    waves: [
      { id: 'uk1', name: 'Impossible Script', description: 'Strange symbols rain from above in curved streams that defy logic.', duration: 8, attackType: 'column', warningType: 'column', bulletSpeed: 175, spawnRate: 11, damage: 26, arenaEffect: 'none', patternTags: ['column', 'dense'], execute: 'impossibleScript' },
      { id: 'uk2', name: 'Crown Collapse', description: 'Crown-shaped bullet rings close inward from every direction.', duration: 8, attackType: 'radial', warningType: 'ring', bulletSpeed: 155, spawnRate: 9, damage: 26, arenaEffect: 'none', patternTags: ['radial', 'burst'], execute: 'crownCollapse' },
      { id: 'uk3', name: 'Reality Tear', description: 'Red cracks split the arena into temporary danger zones.', duration: 8, attackType: 'laser', warningType: 'row', bulletSpeed: 0, spawnRate: 1, damage: 26, arenaEffect: 'none', patternTags: ['laser', 'split'], execute: 'realityTear' },
      { id: 'uk4', name: 'Broken Sentence', description: 'Word-like walls slide across the arena with missing-letter gaps.', duration: 8, attackType: 'sweep', warningType: 'side', bulletSpeed: 185, spawnRate: 8, damage: 26, arenaEffect: 'none', patternTags: ['sweep', 'gap'], execute: 'errorSweep' },
      { id: 'uk5', name: 'Crown of Static', description: 'Rotating symbol rings overlap with falling crown shards simultaneously.', duration: 8, attackType: 'mirror', warningType: 'mirror', bulletSpeed: 160, spawnRate: 6, damage: 26, arenaEffect: 'none', patternTags: ['mirror', 'combo'], execute: 'soulSplit' },
      { id: 'uk6', name: 'Lost Paragraph', description: 'Text blocks cover parts of the arena — only the blank lane is safe.', duration: 8, attackType: 'laser', warningType: 'row', bulletSpeed: 0, spawnRate: 1, damage: 26, arenaEffect: 'none', patternTags: ['laser', 'sweep'], execute: 'devourLane' },
      { id: 'uk7', name: 'Glyph Spiral', description: 'Glyph bullets spiral outward from four corners simultaneously.', duration: 8, attackType: 'spiral', warningType: 'ring', bulletSpeed: 145, spawnRate: 8, damage: 26, arenaEffect: 'none', patternTags: ['spiral', 'corner'], execute: 'haloSpiral' },
      { id: 'uk8', name: 'Unreadable Maze', description: 'Moving text walls create a shifting maze with no clear pattern.', duration: 8, attackType: 'maze', warningType: 'center', bulletSpeed: 105, spawnRate: 8, damage: 26, arenaEffect: 'none', patternTags: ['maze'], execute: 'gearMaze' },
      { id: 'uk9', name: 'Royal Redaction', description: 'Black redaction bars cover safe paths before the final narrow escape.', duration: 8, attackType: 'chaos', warningType: 'all', bulletSpeed: 155, spawnRate: 10, damage: 26, arenaEffect: 'none', patternTags: ['chaos'], execute: 'finalPattern' },
    ],
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
    attacks: ['currentSurge', 'coilTrap', 'undertowPull', 'shatterPulse', 'coilTrap', 'starfall', 'ribCage', 'currentSurge', 'undertowPull', 'screenTear'],
    dmg: 28,
    atkDur: 7,
    rewardItemPool: ['moonthread', 'candle_ash'],
    waves: [
      { id: 'nx1', name: 'Current Surge', description: 'Electric lines sweep across the arena after blue warning flashes.', duration: 7, attackType: 'sweep', warningType: 'side', bulletSpeed: 175, spawnRate: 9, damage: 28, arenaEffect: 'current', patternTags: ['sweep', 'wave'], execute: 'currentSurge' },
      { id: 'nx2', name: 'Coil Trap', description: 'Curved electric trails form temporary cages that tighten inward.', duration: 7, attackType: 'spiral', warningType: 'ring', bulletSpeed: 105, spawnRate: 7, damage: 28, arenaEffect: 'none', patternTags: ['spiral', 'coil'], execute: 'coilTrap' },
      { id: 'nx3', name: 'Undertow Pull', description: 'Water current pulls the player sideways while bullets drift opposite.', duration: 7, attackType: 'pull', warningType: 'arrow', bulletSpeed: 155, spawnRate: 6, damage: 28, arenaEffect: 'current', patternTags: ['pull', 'flow'], execute: 'undertowPull' },
      { id: 'nx4', name: 'Deep Shock', description: 'Electric circles expand from ripple warning points across the arena.', duration: 7, attackType: 'ring', warningType: 'ring', bulletSpeed: 120, spawnRate: 2, damage: 28, arenaEffect: 'none', patternTags: ['ring', 'multi'], execute: 'shatterPulse' },
      { id: 'nx5', name: 'Whirlpool Circuit', description: 'A coiling spiral pulls inward while sparks fire outward simultaneously.', duration: 7, attackType: 'spiral', warningType: 'ring', bulletSpeed: 115, spawnRate: 8, damage: 28, arenaEffect: 'none', patternTags: ['spiral', 'pull'], execute: 'coilTrap' },
      { id: 'nx6', name: 'Abyss Spark', description: 'Tiny sparks hide in the arena then flash into full lightning bolts.', duration: 7, attackType: 'rain', warningType: 'top', bulletSpeed: 170, spawnRate: 10, damage: 28, arenaEffect: 'none', patternTags: ['rain', 'fake'], execute: 'starfall' },
      { id: 'nx7', name: 'Tide Cage', description: 'Water walls rise and fall changing the usable arena space.', duration: 7, attackType: 'wall', warningType: 'side', bulletSpeed: 0, spawnRate: 1, damage: 28, arenaEffect: 'current', patternTags: ['wall', 'tide'], execute: 'ribCage' },
      { id: 'nx8', name: 'Voltage Riptide', description: 'Fast electric streams rush diagonally across the arena with little warning.', duration: 7, attackType: 'sweep', warningType: 'side', bulletSpeed: 190, spawnRate: 9, damage: 28, arenaEffect: 'current', patternTags: ['sweep', 'fast'], execute: 'currentSurge' },
      { id: 'nx9', name: 'Serpent Loop', description: 'The eel body loops through the arena as a relentless moving hazard.', duration: 7, attackType: 'pull', warningType: 'arrow', bulletSpeed: 162, spawnRate: 6, damage: 28, arenaEffect: 'current', patternTags: ['pull', 'loop'], execute: 'undertowPull' },
      { id: 'nx10', name: 'Blackwater Flash', description: 'The arena darkens then lightning reveals all danger zones for a split second.', duration: 7, attackType: 'laser', warningType: 'row', bulletSpeed: 0, spawnRate: 2, damage: 28, arenaEffect: 'none', patternTags: ['laser', 'flash'], execute: 'screenTear' },
    ],
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
    attacks: ['boneRain', 'ribCage', 'haloCurse', 'shatterPulse', 'ribCage', 'haloSpiral', 'falseStar', 'inkDecree', 'webGrid', 'overheat', 'engineSpin'],
    dmg: 30,
    atkDur: 7,
    rewardItemPool: ['blood_vial', 'candle_ash'],
    waves: [
      { id: 'ms1', name: 'Bone Rain', description: 'Bone bullets fall in offset columns with precise aim.', duration: 7, attackType: 'aimed', warningType: 'top', bulletSpeed: 165, spawnRate: 6, damage: 30, arenaEffect: 'none', patternTags: ['rain', 'aimed'], execute: 'boneRain' },
      { id: 'ms2', name: 'Rib Cage', description: 'Bone walls close inward from both sides with a single tight gap.', duration: 7, attackType: 'wall', warningType: 'side', bulletSpeed: 0, spawnRate: 1, damage: 30, arenaEffect: 'none', patternTags: ['wall', 'gap'], execute: 'ribCage' },
      { id: 'ms3', name: 'Halo Curse', description: 'Cursed halo ring closes from all sides with one gap.', duration: 7, attackType: 'ring', warningType: 'ring', bulletSpeed: 88, spawnRate: 1, damage: 30, arenaEffect: 'none', patternTags: ['ring', 'gap'], execute: 'haloCurse' },
      { id: 'ms4', name: 'Grave Hymn', description: 'Bone bullets pulse outward in rhythm waves from the center.', duration: 7, attackType: 'ring', warningType: 'ring', bulletSpeed: 120, spawnRate: 2, damage: 30, arenaEffect: 'none', patternTags: ['ring', 'rhythm'], execute: 'shatterPulse' },
      { id: 'ms5', name: "Saint's Ossuary", description: 'Bone walls and orbiting bullets create a layered moving cage.', duration: 7, attackType: 'wall', warningType: 'side', bulletSpeed: 0, spawnRate: 1, damage: 30, arenaEffect: 'none', patternTags: ['wall', 'combo'], execute: 'ribCage' },
      { id: 'ms6', name: 'Marrow Spiral', description: 'Long bone spears spiral outward from the boss in tight arms.', duration: 7, attackType: 'spiral', warningType: 'ring', bulletSpeed: 148, spawnRate: 8, damage: 30, arenaEffect: 'none', patternTags: ['spiral', 'spear'], execute: 'haloSpiral' },
      { id: 'ms7', name: 'Skull Lanterns', description: 'Skull bullets float slowly then fire bursts of small teeth.', duration: 7, attackType: 'decoy', warningType: 'glow', bulletSpeed: 145, spawnRate: 1, damage: 30, arenaEffect: 'none', patternTags: ['decoy', 'burst'], execute: 'falseStar' },
      { id: 'ms8', name: 'Tomb Step', description: 'The floor lights up in stepping-stone danger tiles in sequence.', duration: 7, attackType: 'zone', warningType: 'grid', bulletSpeed: 0, spawnRate: 2, damage: 30, arenaEffect: 'none', patternTags: ['zone', 'rhythm'], execute: 'inkDecree' },
      { id: 'ms9', name: 'Bone Lattice', description: 'Crossing bone beams form a moving grid hazard.', duration: 7, attackType: 'grid', warningType: 'grid', bulletSpeed: 0, spawnRate: 4, damage: 30, arenaEffect: 'none', patternTags: ['laser', 'grid'], execute: 'webGrid' },
      { id: 'ms10', name: 'Red Prayer', description: 'Crimson ritual circles appear under the player and explode after a chant.', duration: 7, attackType: 'burst', warningType: 'area', bulletSpeed: 165, spawnRate: 14, damage: 30, arenaEffect: 'none', patternTags: ['burst', 'area'], execute: 'overheat' },
      { id: 'ms11', name: 'Final Relic', description: 'A giant relic bone rotates while smaller bones rain from above.', duration: 7, attackType: 'spiral', warningType: 'center', bulletSpeed: 152, spawnRate: 9, damage: 30, arenaEffect: 'none', patternTags: ['spiral', 'rain'], execute: 'engineSpin' },
    ],
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
    attacks: ['starfall', 'constellationLines', 'falseStar', 'crownCollapse', 'devourLane', 'meteorLesson', 'soulSplit', 'plagueGarden', 'echoTrail', 'axisCollapse', 'webGrid', 'mothEclipse'],
    dmg: 32,
    atkDur: 7,
    rewardItemPool: ['wax_seal', 'candle_ash'],
    waves: [
      { id: 'lx1', name: 'Starfall', description: 'Stars fall with sparkle warning markers in staggered dense rain.', duration: 7, attackType: 'rain', warningType: 'top', bulletSpeed: 170, spawnRate: 9, damage: 32, arenaEffect: 'none', patternTags: ['rain', 'star'], execute: 'starfall' },
      { id: 'lx2', name: 'Constellation Lines', description: 'Stars connect into laser lines spanning the arena.', duration: 7, attackType: 'laser', warningType: 'dot', bulletSpeed: 0, spawnRate: 7, damage: 32, arenaEffect: 'none', patternTags: ['laser', 'diag'], execute: 'constellationLines' },
      { id: 'lx3', name: 'False Star', description: 'Dim fake stars appear beside bright real hazards — read carefully.', duration: 7, attackType: 'decoy', warningType: 'glow', bulletSpeed: 145, spawnRate: 1, damage: 32, arenaEffect: 'none', patternTags: ['decoy'], execute: 'falseStar' },
      { id: 'lx4', name: 'Supernova Waltz', description: 'Large stars explode into smaller bullets in circular rotating patterns.', duration: 7, attackType: 'radial', warningType: 'ring', bulletSpeed: 158, spawnRate: 10, damage: 32, arenaEffect: 'none', patternTags: ['radial', 'burst'], execute: 'crownCollapse' },
      { id: 'lx5', name: 'Royal Eclipse', description: 'Arena darkens — only the real hazards glow clearly.', duration: 7, attackType: 'laser', warningType: 'row', bulletSpeed: 0, spawnRate: 1, damage: 32, arenaEffect: 'none', patternTags: ['laser', 'dark'], execute: 'devourLane' },
      { id: 'lx6', name: 'Meteor Crown', description: 'Crown-shaped meteors fall in rotating arcs after warning flashes.', duration: 7, attackType: 'rain', warningType: 'top', bulletSpeed: 168, spawnRate: 6, damage: 32, arenaEffect: 'none', patternTags: ['rain', 'large'], execute: 'meteorLesson' },
      { id: 'lx7', name: 'Astral Mirror', description: 'Star bullets mirror the player\'s vertical position precisely.', duration: 7, attackType: 'mirror', warningType: 'mirror', bulletSpeed: 162, spawnRate: 6, damage: 32, arenaEffect: 'none', patternTags: ['mirror', 'aimed'], execute: 'soulSplit' },
      { id: 'lx8', name: 'Nebula Bloom', description: 'Slow nebula clouds expand and deny space in the arena.', duration: 7, attackType: 'zone', warningType: 'area', bulletSpeed: 0, spawnRate: 2, damage: 32, arenaEffect: 'none', patternTags: ['zone', 'slow'], execute: 'plagueGarden' },
      { id: 'lx9', name: 'Comet Thread', description: 'Comets leave damaging trails that linger after passing.', duration: 7, attackType: 'echo', warningType: 'trail', bulletSpeed: 140, spawnRate: 5, damage: 32, arenaEffect: 'none', patternTags: ['echo', 'trail'], execute: 'echoTrail' },
      { id: 'lx10', name: 'Dark Sky Court', description: 'Four star judges fire beams inward from the arena corners.', duration: 7, attackType: 'laser', warningType: 'cross', bulletSpeed: 0, spawnRate: 2, damage: 32, arenaEffect: 'none', patternTags: ['laser', 'cross'], execute: 'axisCollapse' },
      { id: 'lx11', name: 'Star Map Trap', description: 'The arena becomes a constellation map — crossing glowing lines causes damage.', duration: 7, attackType: 'grid', warningType: 'grid', bulletSpeed: 0, spawnRate: 5, damage: 32, arenaEffect: 'none', patternTags: ['laser', 'grid'], execute: 'webGrid' },
      { id: 'lx12', name: "Queen's Nova", description: 'A massive nova expands then leaves only a tiny safe ring to survive.', duration: 7, attackType: 'ring', warningType: 'ring', bulletSpeed: 83, spawnRate: 1, damage: 32, arenaEffect: 'eclipse', patternTags: ['ring', 'gap'], execute: 'mothEclipse' },
    ],
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
    attacks: ['pistonCrush', 'engineSpin', 'overheat', 'centerCrush', 'tinyApocalypse', 'devourLane', 'gearMaze', 'crystalRain', 'ribCage', 'waxFlood', 'webGrid', 'falseStar', 'finalRule'],
    dmg: 34,
    atkDur: 8,
    rewardItemPool: ['crater_core', 'candle_ash'],
    waves: [
      { id: 're1', name: 'Piston Crush', description: 'Pistons slam from the sides after red warning alerts.', duration: 8, attackType: 'piston', warningType: 'side', bulletSpeed: 0, spawnRate: 1, damage: 34, arenaEffect: 'none', patternTags: ['piston'], execute: 'pistonCrush' },
      { id: 're2', name: 'Engine Spin', description: 'Rotating machine arms sweep bullets around the arena in tight spirals.', duration: 8, attackType: 'spiral', warningType: 'center', bulletSpeed: 148, spawnRate: 9, damage: 34, arenaEffect: 'none', patternTags: ['spiral', 'spin'], execute: 'engineSpin' },
      { id: 're3', name: 'Overheat', description: 'Arena tiles glow orange then explode in rapid bursts.', duration: 8, attackType: 'burst', warningType: 'area', bulletSpeed: 168, spawnRate: 14, damage: 34, arenaEffect: 'none', patternTags: ['burst', 'area'], execute: 'overheat' },
      { id: 're4', name: 'Compression Cycle', description: 'The arena shrinks while machine arms keep firing from all sides.', duration: 8, attackType: 'piston', warningType: 'side', bulletSpeed: 0, spawnRate: 2, damage: 34, arenaEffect: 'none', patternTags: ['piston'], execute: 'centerCrush' },
      { id: 're5', name: 'Meltdown Protocol', description: 'Pistons, heat tiles, and spin arms activate in timed bursts simultaneously.', duration: 8, attackType: 'combo', warningType: 'ring', bulletSpeed: 138, spawnRate: 9, damage: 34, arenaEffect: 'none', patternTags: ['combo', 'multi'], execute: 'tinyApocalypse' },
      { id: 're6', name: 'Furnace Lane', description: 'Fire vents leave only one safe lane that shifts every few seconds.', duration: 8, attackType: 'laser', warningType: 'row', bulletSpeed: 0, spawnRate: 1, damage: 34, arenaEffect: 'none', patternTags: ['laser', 'sweep'], execute: 'devourLane' },
      { id: 're7', name: 'Cog Barrage', description: 'Gear bullets roll across the arena and bounce off the walls.', duration: 8, attackType: 'maze', warningType: 'center', bulletSpeed: 112, spawnRate: 9, damage: 34, arenaEffect: 'none', patternTags: ['maze', 'bounce'], execute: 'gearMaze' },
      { id: 're8', name: 'Rust Storm', description: 'Rust flakes rain slowly then suddenly accelerate to full speed.', duration: 8, attackType: 'rain', warningType: 'top', bulletSpeed: 195, spawnRate: 13, damage: 34, arenaEffect: 'none', patternTags: ['rain', 'accel'], execute: 'crystalRain' },
      { id: 're9', name: 'Hydraulic Snap', description: 'Mechanical jaws snap shut around marked zones after warnings.', duration: 8, attackType: 'wall', warningType: 'side', bulletSpeed: 0, spawnRate: 2, damage: 34, arenaEffect: 'none', patternTags: ['wall', 'snap'], execute: 'ribCage' },
      { id: 're10', name: 'Core Vent', description: 'Steam clouds flood the arena blocking vision before bullets emerge.', duration: 8, attackType: 'zone', warningType: 'area', bulletSpeed: 0, spawnRate: 3, damage: 34, arenaEffect: 'none', patternTags: ['zone', 'blind'], execute: 'waxFlood' },
      { id: 're11', name: 'Redline Grid', description: 'Red machine lasers form a shifting grid of death.', duration: 8, attackType: 'grid', warningType: 'grid', bulletSpeed: 0, spawnRate: 5, damage: 34, arenaEffect: 'none', patternTags: ['laser', 'grid'], execute: 'webGrid' },
      { id: 're12', name: 'Shutdown Fakeout', description: 'The screen goes quiet then emergency hazards restart suddenly.', duration: 8, attackType: 'decoy', warningType: 'glow', bulletSpeed: 185, spawnRate: 1, damage: 34, arenaEffect: 'none', patternTags: ['decoy', 'fake'], execute: 'falseStar' },
      { id: 're13', name: 'Omega Cycle', description: 'Every machine hazard runs in a devastating final sequence.', duration: 8, attackType: 'chaos', warningType: 'all', bulletSpeed: 200, spawnRate: 22, damage: 34, arenaEffect: 'all', patternTags: ['chaos', 'finale'], execute: 'finalRule' },
    ],
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
    attacks: ['ruleRewrite', 'axisCollapse', 'mirrorSoul', 'ruleRewrite', 'patternOverload', 'devourLane', 'haloSpiral', 'constellationLines', 'falseStar', 'tinyApocalypse', 'timeFreeze', 'collapseRing', 'falseStar', 'finalRule'],
    dmg: 38,
    atkDur: 9,
    rewardItemPool: ['memory_stone', 'blood_vial'],
    waves: [
      { id: 'ax1', name: 'Rule Rewrite', description: 'The battle box changes shape temporarily — all bullet paths shift.', duration: 9, attackType: 'rewrite', warningType: 'flash', bulletSpeed: 0, spawnRate: 1, damage: 38, arenaEffect: 'rewrite', patternTags: ['rewrite'], execute: 'ruleRewrite' },
      { id: 'ax2', name: 'Axis Collapse', description: 'Vertical and horizontal laser grids appear with safe gaps.', duration: 9, attackType: 'laser', warningType: 'cross', bulletSpeed: 0, spawnRate: 2, damage: 38, arenaEffect: 'none', patternTags: ['laser', 'cross'], execute: 'axisCollapse' },
      { id: 'ax3', name: 'Mirror Soul', description: 'A fake soul mirrors movement and damages on contact.', duration: 9, attackType: 'mirror', warningType: 'mirror', bulletSpeed: 162, spawnRate: 5, damage: 38, arenaEffect: 'none', patternTags: ['mirror'], execute: 'mirrorSoul' },
      { id: 'ax4', name: 'Rule Stack', description: 'Arena shape changes while lasers fire through the new geometry.', duration: 9, attackType: 'rewrite', warningType: 'flash', bulletSpeed: 0, spawnRate: 1, damage: 38, arenaEffect: 'rewrite', patternTags: ['rewrite', 'combo'], execute: 'ruleRewrite' },
      { id: 'ax5', name: 'Undefined Behavior', description: 'Several rules shift at once with warning icons — prepare for anything.', duration: 9, attackType: 'chaos', warningType: 'all', bulletSpeed: 155, spawnRate: 12, damage: 38, arenaEffect: 'none', patternTags: ['chaos'], execute: 'patternOverload' },
      { id: 'ax6', name: 'Null Coordinate', description: 'Parts of the arena lose coordinates and become void zones.', duration: 9, attackType: 'laser', warningType: 'row', bulletSpeed: 0, spawnRate: 1, damage: 38, arenaEffect: 'none', patternTags: ['laser', 'void'], execute: 'devourLane' },
      { id: 'ax7', name: 'Logic Spiral', description: 'Mathematical symbols spiral outward in alternating clockwise patterns.', duration: 9, attackType: 'spiral', warningType: 'ring', bulletSpeed: 148, spawnRate: 8, damage: 38, arenaEffect: 'none', patternTags: ['spiral'], execute: 'haloSpiral' },
      { id: 'ax8', name: 'Broken Equation', description: 'Equation fragments fall then rearrange into laser walls.', duration: 9, attackType: 'laser', warningType: 'dot', bulletSpeed: 0, spawnRate: 7, damage: 38, arenaEffect: 'none', patternTags: ['laser', 'diag'], execute: 'constellationLines' },
      { id: 'ax9', name: 'False Safe Zone', description: 'Several safe zones appear — only one matches the correct rule.', duration: 9, attackType: 'decoy', warningType: 'glow', bulletSpeed: 155, spawnRate: 1, damage: 38, arenaEffect: 'none', patternTags: ['decoy', 'fake'], execute: 'falseStar' },
      { id: 'ax10', name: 'Geometry Collapse', description: 'Triangle, square, and circle hazards collapse toward the center.', duration: 9, attackType: 'combo', warningType: 'ring', bulletSpeed: 142, spawnRate: 9, damage: 38, arenaEffect: 'none', patternTags: ['combo', 'multi'], execute: 'tinyApocalypse' },
      { id: 'ax11', name: 'Input Paradox', description: 'Movement becomes delayed after a countdown warning — plan ahead.', duration: 9, attackType: 'freeze', warningType: 'glow', bulletSpeed: 128, spawnRate: 5, damage: 38, arenaEffect: 'freeze', patternTags: ['freeze', 'delay'], execute: 'timeFreeze' },
      { id: 'ax12', name: 'Axiom Cage', description: 'A geometric cage ring rotates around the player with a single gap.', duration: 9, attackType: 'ring', warningType: 'ring', bulletSpeed: 78, spawnRate: 1, damage: 38, arenaEffect: 'none', patternTags: ['ring', 'gap'], execute: 'collapseRing' },
      { id: 'ax13', name: 'End of Pattern', description: 'A predictable pattern suddenly stops — react to the silence.', duration: 9, attackType: 'decoy', warningType: 'glow', bulletSpeed: 178, spawnRate: 1, damage: 38, arenaEffect: 'none', patternTags: ['decoy', 'fake'], execute: 'falseStar' },
      { id: 'ax14', name: 'Rule Zero', description: 'The arena rapidly cycles through all previous rule changes in a final test.', duration: 9, attackType: 'chaos', warningType: 'all', bulletSpeed: 172, spawnRate: 16, damage: 38, arenaEffect: 'rewrite', patternTags: ['chaos'], execute: 'finalRule' },
    ],
  },
  // ── Bosses 11–20 ─────────────────────────────────────────────
  {
    name: 'Vyrial',
    title: 'Moth of Velvet Plague',
    color: '#88ff44', color2: '#ff8844', bgTint: '#031004',
    difficultyLabel: 'Hard',
    personality: 'Languid and beautiful; spreads disease through elegance.',
    design: 'Moth form; wings drip iridescent spores; antennae pulse neon green.',
    arenaModifier: 'Spore clouds obscure edge visibility.',
    dialog: ['Your air tastes like rot already.', 'Bloom, little garden.'],
    attacks: ['sporeBloom', 'velvetSwarm', 'plagueGarden', 'velvetSwarm', 'plagueGarden', 'sporeBloom', 'mothEclipse', 'feverRings', 'velvetSwarm', 'plagueCrown', 'sporeBloom', 'plagueGarden', 'feverRings', 'plagueCrown', 'sporeBloom'],
    dmg: 20, atkDur: 8,
    rewardItemPool: ['moth_wing', 'velvet_spore'],
    waves: [
      { id: 'v1', name: 'Spore Bloom', description: 'Spores burst radially from the center in a spiral pattern.', duration: 5, attackType: 'radial', warningType: 'ring', bulletSpeed: 102, spawnRate: 8, damage: 20, arenaEffect: 'none', patternTags: ['radial', 'slow'], execute: 'sporeBloom' },
      { id: 'v2', name: 'Wing Dust', description: 'Diagonal dust waves sweep from both sides of the arena.', duration: 5, attackType: 'homing', warningType: 'top', bulletSpeed: 122, spawnRate: 8, damage: 20, arenaEffect: 'none', patternTags: ['homing', 'rain'], execute: 'velvetSwarm' },
      { id: 'v3', name: 'Infection Zones', description: 'Danger zones bloom unpredictably across the arena floor.', duration: 6, attackType: 'zone', warningType: 'area', bulletSpeed: 0, spawnRate: 2, damage: 20, arenaEffect: 'plague', patternTags: ['zone', 'spread'], execute: 'plagueGarden' },
      { id: 'v4', name: 'Velvet Swarm', description: 'Homing spore bullets track the player with slow drift.', duration: 5, attackType: 'homing', warningType: 'top', bulletSpeed: 126, spawnRate: 8, damage: 20, arenaEffect: 'none', patternTags: ['homing', 'rain'], execute: 'velvetSwarm' },
      { id: 'v5', name: 'Plague Garden', description: 'Dense plague zone clusters form around the player.', duration: 6, attackType: 'zone', warningType: 'area', bulletSpeed: 0, spawnRate: 2, damage: 20, arenaEffect: 'plague', patternTags: ['zone'], execute: 'plagueGarden' },
      { id: 'v6', name: 'Toxic Waltz', description: 'Spore clouds rotate in pairs through the arena.', duration: 5, attackType: 'radial', warningType: 'ring', bulletSpeed: 104, spawnRate: 9, damage: 20, arenaEffect: 'none', patternTags: ['radial'], execute: 'sporeBloom' },
      { id: 'v7', name: 'Moth Eclipse', description: 'Full-arena spore ring contracts with one escape gap.', duration: 4, attackType: 'ring', warningType: 'ring', bulletSpeed: 82, spawnRate: 1, damage: 20, arenaEffect: 'eclipse', patternTags: ['ring', 'gap'], execute: 'mothEclipse' },
      { id: 'v8', name: 'Fever Rings', description: 'Three expanding concentric spore rings pulse outward.', duration: 4, attackType: 'ring', warningType: 'ring', bulletSpeed: 97, spawnRate: 3, damage: 20, arenaEffect: 'none', patternTags: ['ring', 'multi'], execute: 'feverRings' },
      { id: 'v9', name: 'Velvet Veil', description: 'A homing veil of spores hides the bullet paths from view.', duration: 5, attackType: 'homing', warningType: 'top', bulletSpeed: 132, spawnRate: 8, damage: 20, arenaEffect: 'none', patternTags: ['homing'], execute: 'velvetSwarm' },
      { id: 'v10', name: 'Antidote Fakeout', description: 'Glowing safe icons appear but only one is real — avoid the fakes.', duration: 4, attackType: 'corner', warningType: 'corner', bulletSpeed: 148, spawnRate: 16, damage: 20, arenaEffect: 'none', patternTags: ['corner', 'burst'], execute: 'plagueCrown' },
      { id: 'v11', name: 'Green Cathedral', description: 'Poison pillars form walls with shifting gaps.', duration: 5, attackType: 'radial', warningType: 'ring', bulletSpeed: 106, spawnRate: 9, damage: 20, arenaEffect: 'none', patternTags: ['radial'], execute: 'sporeBloom' },
      { id: 'v12', name: 'Rotting Petals', description: 'Petal-shaped zone clusters split and spread across the arena.', duration: 6, attackType: 'zone', warningType: 'area', bulletSpeed: 0, spawnRate: 3, damage: 20, arenaEffect: 'plague', patternTags: ['zone'], execute: 'plagueGarden' },
      { id: 'v13', name: 'Spore Spiral', description: 'Spores spiral outward in tight arms with narrowing gaps.', duration: 4, attackType: 'ring', warningType: 'ring', bulletSpeed: 108, spawnRate: 3, damage: 20, arenaEffect: 'none', patternTags: ['ring', 'multi'], execute: 'feverRings' },
      { id: 'v14', name: 'Plague Crown', description: 'Corner spore eruptions fire bursts that spread to center.', duration: 4, attackType: 'corner', warningType: 'corner', bulletSpeed: 152, spawnRate: 16, damage: 20, arenaEffect: 'none', patternTags: ['corner', 'burst'], execute: 'plagueCrown' },
      { id: 'v15', name: 'Final Bloom', description: 'Maximum spore radial finale — center erupts.', duration: 5, attackType: 'radial', warningType: 'ring', bulletSpeed: 112, spawnRate: 10, damage: 20, arenaEffect: 'none', patternTags: ['radial'], execute: 'sporeBloom' },
    ],
  },
  {
    name: 'Echora',
    title: 'the Masked Choir',
    color: '#ff44aa', color2: '#44aaff', bgTint: '#050008',
    difficultyLabel: 'Hard',
    personality: 'Theatrical and layered; every attack is a performance.',
    design: 'Conductor figure; wears a cracked mask; baton drips sound waves.',
    arenaModifier: 'Reverb pulses distort bullet trails briefly.',
    dialog: ['The choir will drown your heartbeat.', 'Sing. Or be silenced.'],
    attacks: ['soundBars', 'choirSplit', 'silentBeat', 'crescendoCrush', 'doubleTempo', 'soundBars', 'choirSplit', 'silentBeat', 'crescendoCrush', 'soundBars', 'silentBeat', 'choirSplit', 'silentBeat', 'doubleTempo', 'soundBars', 'silentBeat'],
    dmg: 20, atkDur: 8,
    rewardItemPool: ['echo_fragment', 'choir_mask'],
    waves: [
      { id: 'e1', name: 'Sound Bars', description: 'Piano-key laser bars sweep inward from alternating sides.', duration: 5, attackType: 'laser', warningType: 'column', bulletSpeed: 0, spawnRate: 4, damage: 20, arenaEffect: 'none', patternTags: ['laser', 'sweep'], execute: 'soundBars' },
      { id: 'e2', name: 'Choir Split', description: 'Diagonal quad burst from all four directions at once.', duration: 4, attackType: 'quad', warningType: 'center', bulletSpeed: 162, spawnRate: 20, damage: 20, arenaEffect: 'none', patternTags: ['quad', 'burst'], execute: 'choirSplit' },
      { id: 'e3', name: 'Silent Beat', description: 'Long silence builds then erupts in a massive radial burst.', duration: 5, attackType: 'radial', warningType: 'pulse', bulletSpeed: 185, spawnRate: 40, damage: 20, arenaEffect: 'none', patternTags: ['radial', 'burst'], execute: 'silentBeat' },
      { id: 'e4', name: 'Crescendo Crush', description: 'A laser sweep accelerates from slow to fast across the arena.', duration: 5, attackType: 'laser', warningType: 'row', bulletSpeed: 0, spawnRate: 1, damage: 20, arenaEffect: 'none', patternTags: ['laser', 'accel'], execute: 'crescendoCrush' },
      { id: 'e5', name: 'Dissonance Finale', description: 'Two rhythm systems overlap — sweeps fire in conflicting timing.', duration: 6, attackType: 'laser', warningType: 'multi', bulletSpeed: 0, spawnRate: 2, damage: 20, arenaEffect: 'none', patternTags: ['laser', 'multi'], execute: 'doubleTempo' },
      { id: 'e6', name: 'Bass Drop', description: 'A shockwave drops from the top of the screen like a bass hit.', duration: 5, attackType: 'laser', warningType: 'column', bulletSpeed: 0, spawnRate: 5, damage: 20, arenaEffect: 'none', patternTags: ['laser'], execute: 'soundBars' },
      { id: 'e7', name: 'Mask Canon', description: 'Repeating musical canon — burst fires again after a short delay.', duration: 4, attackType: 'quad', warningType: 'center', bulletSpeed: 166, spawnRate: 22, damage: 20, arenaEffect: 'none', patternTags: ['quad'], execute: 'choirSplit' },
      { id: 'e8', name: 'Broken Rhythm', description: 'The beat intentionally skips — bullets fire on the off-beat.', duration: 5, attackType: 'radial', warningType: 'pulse', bulletSpeed: 185, spawnRate: 40, damage: 20, arenaEffect: 'none', patternTags: ['radial'], execute: 'silentBeat' },
      { id: 'e9', name: 'Echo Measure', description: 'Each attack repeats as a faded echo moments later.', duration: 5, attackType: 'laser', warningType: 'row', bulletSpeed: 0, spawnRate: 2, damage: 20, arenaEffect: 'none', patternTags: ['laser'], execute: 'crescendoCrush' },
      { id: 'e10', name: 'Red Note Rain', description: 'Red music notes fall in rhythmic columns from above.', duration: 5, attackType: 'laser', warningType: 'column', bulletSpeed: 0, spawnRate: 6, damage: 20, arenaEffect: 'none', patternTags: ['laser'], execute: 'soundBars' },
      { id: 'e11', name: 'Syncopation Trap', description: 'Safe zones only appear on the off-beats of the rhythm pattern.', duration: 5, attackType: 'radial', warningType: 'pulse', bulletSpeed: 185, spawnRate: 40, damage: 20, arenaEffect: 'none', patternTags: ['radial'], execute: 'silentBeat' },
      { id: 'e12', name: 'Chrome Hymn', description: 'Chrome laser beams sweep in rhythm from alternating corners.', duration: 4, attackType: 'quad', warningType: 'center', bulletSpeed: 171, spawnRate: 24, damage: 20, arenaEffect: 'none', patternTags: ['quad'], execute: 'choirSplit' },
      { id: 'e13', name: 'Rest Note Fakeout', description: 'A pause appears safe — but hidden bullets fire in the silence.', duration: 5, attackType: 'radial', warningType: 'pulse', bulletSpeed: 185, spawnRate: 40, damage: 20, arenaEffect: 'none', patternTags: ['radial'], execute: 'silentBeat' },
      { id: 'e14', name: 'Double Tempo', description: 'Two laser sweeps fire back to back with tiny recovery windows.', duration: 6, attackType: 'laser', warningType: 'multi', bulletSpeed: 0, spawnRate: 2, damage: 20, arenaEffect: 'none', patternTags: ['laser', 'multi'], execute: 'doubleTempo' },
      { id: 'e15', name: 'Choir Wall', description: 'Choir masks form walls while singing beams fire between the gaps.', duration: 5, attackType: 'laser', warningType: 'column', bulletSpeed: 0, spawnRate: 7, damage: 20, arenaEffect: 'none', patternTags: ['laser'], execute: 'soundBars' },
      { id: 'e16', name: 'Final Chord', description: 'A massive layered chord fires every active attack pattern at once.', duration: 5, attackType: 'radial', warningType: 'pulse', bulletSpeed: 188, spawnRate: 44, damage: 20, arenaEffect: 'none', patternTags: ['radial'], execute: 'silentBeat' },
    ],
  },
  {
    name: 'Vantus',
    title: 'the Gravity Rex',
    color: '#8844ff', color2: '#44ffcc', bgTint: '#040008',
    difficultyLabel: 'Hard+',
    personality: 'Methodical and cosmic; bends space itself as a weapon.',
    design: 'Massive purple serpent; orbiting debris rings; empty eyes like event horizons.',
    arenaModifier: 'Bullet paths arc toward center gravitational well.',
    dialog: ['Gravity is the only honest force.', 'All things collapse. Eventually.'],
    attacks: ['gravityPull', 'orbitBreak', 'collapseRing', 'gravityPull', 'gravityPull', 'orbitBreak', 'collapseRing', 'gravityPull', 'centerCrush', 'collapseRing', 'orbitBreak', 'gravityPull', 'centerCrush', 'orbitBreak', 'gravityPull', 'collapseRing', 'centerCrush'],
    dmg: 20, atkDur: 9,
    rewardItemPool: ['gravity_lens', 'orbit_stone'],
    waves: [
      { id: 'va1', name: 'Gravity Pull', description: 'Bullets arc toward the gravity well — the center is dangerous.', duration: 5, attackType: 'gravity', warningType: 'ring', bulletSpeed: 82, spawnRate: 7, damage: 20, arenaEffect: 'gravity', patternTags: ['gravity', 'arc'], execute: 'gravityPull' },
      { id: 'va2', name: 'Orbiting Teeth', description: 'Bullet teeth orbit the center before launching outward in all directions.', duration: 5, attackType: 'ring', warningType: 'ring', bulletSpeed: 202, spawnRate: 16, damage: 20, arenaEffect: 'none', patternTags: ['ring', 'burst'], execute: 'orbitBreak' },
      { id: 'va3', name: 'Collapse Ring', description: 'Ring shrinks inward from the edges with one gap to survive.', duration: 4, attackType: 'ring', warningType: 'ring', bulletSpeed: 77, spawnRate: 1, damage: 20, arenaEffect: 'none', patternTags: ['ring', 'gap'], execute: 'collapseRing' },
      { id: 'va4', name: 'Gravity Flip', description: 'Gravity reverses — bullets that curved inward now curve outward.', duration: 5, attackType: 'gravity', warningType: 'ring', bulletSpeed: 86, spawnRate: 7, damage: 20, arenaEffect: 'gravity', patternTags: ['gravity', 'reverse'], execute: 'gravityPull' },
      { id: 'va5', name: 'Royal Singularity', description: 'Multiple gravity wells appear and arc bullets into overlapping paths.', duration: 5, attackType: 'gravity', warningType: 'ring', bulletSpeed: 88, spawnRate: 8, damage: 20, arenaEffect: 'gravity', patternTags: ['gravity', 'multi'], execute: 'gravityPull' },
      { id: 'va6', name: 'Crown Well', description: 'Crown-shaped black holes pull bullets inward in a spiral.', duration: 5, attackType: 'ring', warningType: 'ring', bulletSpeed: 206, spawnRate: 16, damage: 20, arenaEffect: 'none', patternTags: ['ring'], execute: 'orbitBreak' },
      { id: 'va7', name: 'Heavy Step', description: 'Gravity increases suddenly — movement slows and danger zones appear on the floor.', duration: 4, attackType: 'ring', warningType: 'ring', bulletSpeed: 80, spawnRate: 1, damage: 20, arenaEffect: 'none', patternTags: ['ring'], execute: 'collapseRing' },
      { id: 'va8', name: 'Orbit Break', description: 'Debris ring holds then erupts into a scattered bullet storm.', duration: 5, attackType: 'gravity', warningType: 'ring', bulletSpeed: 90, spawnRate: 8, damage: 20, arenaEffect: 'gravity', patternTags: ['gravity'], execute: 'gravityPull' },
      { id: 'va9', name: 'Dark Matter Rain', description: 'Heavy bullets fall in curved paths — gravity bends their trajectories.', duration: 5, attackType: 'piston', warningType: 'all', bulletSpeed: 0, spawnRate: 4, damage: 20, arenaEffect: 'none', patternTags: ['piston'], execute: 'centerCrush' },
      { id: 'va10', name: 'Tidal Bite', description: 'Gravity waves push the player toward hazard zones repeatedly.', duration: 4, attackType: 'ring', warningType: 'ring', bulletSpeed: 85, spawnRate: 1, damage: 20, arenaEffect: 'none', patternTags: ['ring'], execute: 'collapseRing' },
      { id: 'va11', name: 'Center Crush', description: 'All four pistons close to center simultaneously.', duration: 5, attackType: 'ring', warningType: 'ring', bulletSpeed: 210, spawnRate: 16, damage: 20, arenaEffect: 'none', patternTags: ['ring'], execute: 'orbitBreak' },
      { id: 'va12', name: 'Gravity Maze', description: 'Invisible gravity lanes form a maze that curves bullets unpredictably.', duration: 5, attackType: 'gravity', warningType: 'ring', bulletSpeed: 90, spawnRate: 7, damage: 20, arenaEffect: 'gravity', patternTags: ['gravity'], execute: 'gravityPull' },
      { id: 'va13', name: 'Void Roar', description: 'Boss roars pushing bullets outward then they snap back inward.', duration: 5, attackType: 'piston', warningType: 'all', bulletSpeed: 0, spawnRate: 4, damage: 20, arenaEffect: 'none', patternTags: ['piston'], execute: 'centerCrush' },
      { id: 'va14', name: 'Silver Orbit', description: 'Silver bullets orbit the player then collapse inward suddenly.', duration: 5, attackType: 'ring', warningType: 'ring', bulletSpeed: 210, spawnRate: 16, damage: 20, arenaEffect: 'none', patternTags: ['ring'], execute: 'orbitBreak' },
      { id: 'va15', name: 'Falling Crown', description: 'Gravity crowns drop from above with wide warning arcs.', duration: 5, attackType: 'gravity', warningType: 'ring', bulletSpeed: 91, spawnRate: 7, damage: 20, arenaEffect: 'gravity', patternTags: ['gravity'], execute: 'gravityPull' },
      { id: 'va16', name: 'Singularity Cage', description: 'Gravity walls form a cage that rotates around the arena.', duration: 4, attackType: 'ring', warningType: 'ring', bulletSpeed: 91, spawnRate: 1, damage: 20, arenaEffect: 'none', patternTags: ['ring'], execute: 'collapseRing' },
      { id: 'va17', name: 'Rex Collapse', description: 'Multiple gravity effects stack in a devastating final sequence.', duration: 5, attackType: 'piston', warningType: 'all', bulletSpeed: 0, spawnRate: 4, damage: 20, arenaEffect: 'none', patternTags: ['piston'], execute: 'centerCrush' },
    ],
  },
  {
    name: 'Caloric',
    title: 'the Dying Candle',
    color: '#ffaa22', color2: '#ff4422', bgTint: '#070300',
    difficultyLabel: 'Hard+',
    personality: 'Mournful, slow-burning; attacks grow quieter but deadlier.',
    design: 'Skeletal wax figure; dripping candle crown; flame eyes; trails of amber smoke.',
    arenaModifier: 'Wax drips leave brief ground-burn patches.',
    dialog: ['Every flame has an end.', 'Do not grieve. Burn with me.'],
    attacks: ['waxDrip', 'funeralMarch', 'funeralMarch', 'lastEmber', 'waxFlood', 'candleTears', 'waxDrip', 'funeralMarch', 'waxFlood', 'lastEmber', 'candleTears', 'waxFlood', 'lastEmber', 'candleTears', 'waxDrip', 'funeralMarch', 'waxDrip', 'funeralMarch'],
    dmg: 20, atkDur: 8,
    rewardItemPool: ['wax_seal', 'candle_ash'],
    waves: [
      { id: 'c1', name: 'Wax Drip', description: 'Wax bullets drop in sinusoidal arcs leaving brief floor burn patches.', duration: 5, attackType: 'rain', warningType: 'top', bulletSpeed: 162, spawnRate: 8, damage: 20, arenaEffect: 'wax', patternTags: ['rain', 'arc'], execute: 'waxDrip' },
      { id: 'c2', name: 'Flame Flicker', description: 'Slow procession of candles — some flicker out safely while others erupt.', duration: 5, attackType: 'wall', warningType: 'top', bulletSpeed: 82, spawnRate: 8, damage: 20, arenaEffect: 'none', patternTags: ['wall', 'dense'], execute: 'funeralMarch' },
      { id: 'c3', name: 'Funeral March', description: 'Dense slow rows of bullet candles advance across the arena.', duration: 5, attackType: 'wall', warningType: 'top', bulletSpeed: 84, spawnRate: 8, damage: 20, arenaEffect: 'none', patternTags: ['wall', 'dense'], execute: 'funeralMarch' },
      { id: 'c4', name: 'Last Ember', description: 'Long warning glow then total radial ember burst.', duration: 5, attackType: 'radial', warningType: 'pulse', bulletSpeed: 177, spawnRate: 40, damage: 20, arenaEffect: 'none', patternTags: ['radial', 'burst'], execute: 'lastEmber' },
      { id: 'c5', name: 'Melting Cathedral', description: 'Wax puddles and flame columns narrow the arena path.', duration: 5, attackType: 'zone', warningType: 'area', bulletSpeed: 0, spawnRate: 3, damage: 20, arenaEffect: 'wax', patternTags: ['zone'], execute: 'waxFlood' },
      { id: 'c6', name: 'Candle Tears', description: 'Tear-shaped arcing bullet streams pour from above.', duration: 5, attackType: 'arc', warningType: 'top', bulletSpeed: 142, spawnRate: 5, damage: 20, arenaEffect: 'none', patternTags: ['arc', 'spread'], execute: 'candleTears' },
      { id: 'c7', name: 'Wick Spiral', description: 'Wax bullets follow the burning wick in sinusoidal spirals.', duration: 5, attackType: 'rain', warningType: 'top', bulletSpeed: 164, spawnRate: 8, damage: 20, arenaEffect: 'wax', patternTags: ['rain'], execute: 'waxDrip' },
      { id: 'c8', name: 'Blue Flame Lane', description: 'Blue flames cover all but one safe lane that shifts mid-wave.', duration: 5, attackType: 'wall', warningType: 'top', bulletSpeed: 86, spawnRate: 8, damage: 20, arenaEffect: 'none', patternTags: ['wall'], execute: 'funeralMarch' },
      { id: 'c9', name: 'Wax Flood', description: 'Wax zones flood from the top leaving a small unburned area.', duration: 5, attackType: 'zone', warningType: 'area', bulletSpeed: 0, spawnRate: 3, damage: 20, arenaEffect: 'wax', patternTags: ['zone'], execute: 'waxFlood' },
      { id: 'c10', name: 'Ember Cross', description: 'Cross-shaped ember bursts erupt from marked floor tiles.', duration: 5, attackType: 'radial', warningType: 'pulse', bulletSpeed: 179, spawnRate: 40, damage: 20, arenaEffect: 'none', patternTags: ['radial'], execute: 'lastEmber' },
      { id: 'c11', name: 'Flicker Fakeout', description: 'Fake flickers disappear — the real ones burst when you relax.', duration: 5, attackType: 'arc', warningType: 'top', bulletSpeed: 146, spawnRate: 5, damage: 20, arenaEffect: 'none', patternTags: ['arc'], execute: 'candleTears' },
      { id: 'c12', name: 'Smoke Veil', description: 'Smoke clouds fill the arena blocking vision before bullets emerge.', duration: 5, attackType: 'zone', warningType: 'area', bulletSpeed: 0, spawnRate: 4, damage: 20, arenaEffect: 'wax', patternTags: ['zone'], execute: 'waxFlood' },
      { id: 'c13', name: 'Mourning Bells', description: 'Bell-shaped shockwave rings pulse outward from the boss center.', duration: 5, attackType: 'radial', warningType: 'pulse', bulletSpeed: 181, spawnRate: 44, damage: 20, arenaEffect: 'none', patternTags: ['radial'], execute: 'lastEmber' },
      { id: 'c14', name: 'Lantern Drop', description: 'Lantern bullets fall in arcing streams then burst into sparks on impact.', duration: 5, attackType: 'arc', warningType: 'top', bulletSpeed: 148, spawnRate: 5, damage: 20, arenaEffect: 'none', patternTags: ['arc'], execute: 'candleTears' },
      { id: 'c15', name: 'Cathedral Collapse', description: 'Candle pillar bullets cascade in overlapping diagonal waves.', duration: 5, attackType: 'rain', warningType: 'top', bulletSpeed: 166, spawnRate: 9, damage: 20, arenaEffect: 'wax', patternTags: ['rain'], execute: 'waxDrip' },
      { id: 'c16', name: 'Final Candle', description: 'The last candle fires a giant sweeping wall across the full arena.', duration: 5, attackType: 'wall', warningType: 'top', bulletSpeed: 88, spawnRate: 8, damage: 20, arenaEffect: 'none', patternTags: ['wall'], execute: 'funeralMarch' },
      { id: 'c17', name: 'Ash Ring', description: 'Ash rings drip in sinusoidal arcs that stack and overlap.', duration: 5, attackType: 'rain', warningType: 'top', bulletSpeed: 168, spawnRate: 9, damage: 20, arenaEffect: 'wax', patternTags: ['rain'], execute: 'waxDrip' },
      { id: 'c18', name: 'Grave Flame', description: 'Grave-shaped flame shapes advance in final dense procession.', duration: 5, attackType: 'wall', warningType: 'top', bulletSpeed: 90, spawnRate: 8, damage: 20, arenaEffect: 'none', patternTags: ['wall'], execute: 'funeralMarch' },
    ],
  },
  {
    name: 'Zylvira',
    title: 'the Static Widow',
    color: '#ff44ff', color2: '#aaffaa', bgTint: '#060005',
    difficultyLabel: 'Very Hard',
    personality: 'Cold and systematic; corrupts everything it touches.',
    design: 'Spider-form made of circuit board legs; static sparks as eyes; web of laser filaments.',
    arenaModifier: 'Static flickers briefly swap bullet colors.',
    dialog: ['Signal acquired. Eliminating.', 'You are noise in a perfect system.'],
    attacks: ['webGrid', 'signalBite', 'screenTear', 'staticNest', 'webGrid', 'signalBite', 'vhsStorm', 'webGrid', 'screenTear', 'signalBite', 'signalBite', 'staticNest', 'vhsStorm', 'staticNest', 'screenTear', 'signalBite', 'vhsStorm', 'staticNest', 'webGrid'],
    dmg: 20, atkDur: 9,
    rewardItemPool: ['signal_jam', 'vhs_loop'],
    waves: [
      { id: 'z1', name: 'Web Grid', description: 'Horizontal and vertical laser lines fire simultaneously in a grid pattern.', duration: 4, attackType: 'grid', warningType: 'grid', bulletSpeed: 0, spawnRate: 4, damage: 20, arenaEffect: 'web', patternTags: ['laser', 'grid'], execute: 'webGrid' },
      { id: 'z2', name: 'Signal Bite', description: 'Targeted signal volleys snap toward the player\'s current position.', duration: 4, attackType: 'aimed', warningType: 'target', bulletSpeed: 152, spawnRate: 5, damage: 20, arenaEffect: 'none', patternTags: ['aimed'], execute: 'signalBite' },
      { id: 'z3', name: 'Screen Tear', description: 'The screen rips horizontally — two fast laser slices cross simultaneously.', duration: 3, attackType: 'laser', warningType: 'row', bulletSpeed: 0, spawnRate: 2, damage: 20, arenaEffect: 'none', patternTags: ['laser', 'fast'], execute: 'screenTear' },
      { id: 'z4', name: 'Static Nest', description: 'Static erupts from all four corners in spreading bursts.', duration: 4, attackType: 'corner', warningType: 'corner', bulletSpeed: 152, spawnRate: 20, damage: 20, arenaEffect: 'static', patternTags: ['corner'], execute: 'staticNest' },
      { id: 'z5', name: "Widow's Broadcast", description: 'Web grid fires on a wider channel — multiple rows activate at once.', duration: 4, attackType: 'grid', warningType: 'grid', bulletSpeed: 0, spawnRate: 6, damage: 20, arenaEffect: 'web', patternTags: ['laser'], execute: 'webGrid' },
      { id: 'z6', name: 'Antenna Strike', description: 'Antenna beams stab downward from marked points in targeted volleys.', duration: 4, attackType: 'aimed', warningType: 'target', bulletSpeed: 156, spawnRate: 5, damage: 20, arenaEffect: 'none', patternTags: ['aimed'], execute: 'signalBite' },
      { id: 'z7', name: 'Pink Noise', description: 'Pink static bullets jitter unpredictably from all arena edges.', duration: 4, attackType: 'random', warningType: 'edge', bulletSpeed: 162, spawnRate: 15, damage: 20, arenaEffect: 'static', patternTags: ['random'], execute: 'vhsStorm' },
      { id: 'z8', name: 'Pixel Web', description: 'Pixel blocks connect into web lines — the grid expands.', duration: 4, attackType: 'grid', warningType: 'grid', bulletSpeed: 0, spawnRate: 8, damage: 20, arenaEffect: 'web', patternTags: ['laser'], execute: 'webGrid' },
      { id: 'z9', name: 'Dead Channel', description: 'Arena desaturates then hazards flash across the silent screen.', duration: 3, attackType: 'laser', warningType: 'row', bulletSpeed: 0, spawnRate: 2, damage: 20, arenaEffect: 'none', patternTags: ['laser'], execute: 'screenTear' },
      { id: 'z10', name: 'Signal Lag', description: 'Signal volleys delay then arrive in rapid double bursts.', duration: 4, attackType: 'aimed', warningType: 'target', bulletSpeed: 161, spawnRate: 5, damage: 20, arenaEffect: 'none', patternTags: ['aimed'], execute: 'signalBite' },
      { id: 'z11', name: 'Glitch Fang', description: 'Sharp glitch fangs snap from the edges with minimal warning.', duration: 4, attackType: 'aimed', warningType: 'target', bulletSpeed: 165, spawnRate: 5, damage: 20, arenaEffect: 'none', patternTags: ['aimed'], execute: 'signalBite' },
      { id: 'z12', name: 'Web Collapse', description: 'Web lines collapse inward from all sides in an accelerating ring.', duration: 4, attackType: 'corner', warningType: 'corner', bulletSpeed: 158, spawnRate: 20, damage: 20, arenaEffect: 'static', patternTags: ['corner'], execute: 'staticNest' },
      { id: 'z13', name: 'VHS Storm', description: 'Random VHS static bursts scatter from the arena edges simultaneously.', duration: 4, attackType: 'random', warningType: 'edge', bulletSpeed: 166, spawnRate: 15, damage: 20, arenaEffect: 'static', patternTags: ['random'], execute: 'vhsStorm' },
      { id: 'z14', name: 'Static Mirror', description: 'A static clone appears in the corner and mirrors corner eruptions.', duration: 4, attackType: 'corner', warningType: 'corner', bulletSpeed: 162, spawnRate: 20, damage: 20, arenaEffect: 'static', patternTags: ['corner'], execute: 'staticNest' },
      { id: 'z15', name: 'Corrupt Frame', description: 'The arena frame becomes dangerous — edge contact deals damage.', duration: 3, attackType: 'laser', warningType: 'row', bulletSpeed: 0, spawnRate: 3, damage: 20, arenaEffect: 'none', patternTags: ['laser'], execute: 'screenTear' },
      { id: 'z16', name: 'Spider Pulse', description: 'The boss sends a pulse through every web line at once.', duration: 4, attackType: 'aimed', warningType: 'target', bulletSpeed: 171, spawnRate: 5, damage: 20, arenaEffect: 'none', patternTags: ['aimed'], execute: 'signalBite' },
      { id: 'z17', name: 'Broken Feed', description: 'Warning icons appear out of order — the feed itself is corrupted.', duration: 4, attackType: 'random', warningType: 'edge', bulletSpeed: 171, spawnRate: 15, damage: 20, arenaEffect: 'static', patternTags: ['random'], execute: 'vhsStorm' },
      { id: 'z18', name: 'Final Broadcast', description: 'Every static system activates at once in a final corrupted transmission.', duration: 4, attackType: 'corner', warningType: 'corner', bulletSpeed: 166, spawnRate: 20, damage: 20, arenaEffect: 'static', patternTags: ['corner'], execute: 'staticNest' },
      { id: 'z19', name: 'Widow Crash', description: 'The web grid collapses and a final full-screen web assault fires.', duration: 4, attackType: 'grid', warningType: 'grid', bulletSpeed: 0, spawnRate: 8, damage: 20, arenaEffect: 'web', patternTags: ['laser'], execute: 'webGrid' },
    ],
  },
  {
    name: 'Atlas Minor',
    title: 'the Little Catastrophe',
    color: '#cc8833', color2: '#ff6644', bgTint: '#060300',
    difficultyLabel: 'Very Hard',
    personality: 'Clumsy but apocalyptic; destroys without malice.',
    design: 'A tiny laughing planet covered in craters; orbiting boulders; asteroid belt halo.',
    arenaModifier: 'Screen shakes randomly from impact tremors.',
    dialog: ['Oops. Another one.', 'I am not trying. This just happens.'],
    attacks: ['meteorLesson', 'planetTilt', 'craterBurst', 'tinyApocalypse', 'meteorLesson', 'craterBurst', 'planetTilt', 'craterBurst', 'planetTilt', 'meteorLesson', 'tinyApocalypse', 'tinyApocalypse', 'planetTilt', 'meteorLesson', 'craterBurst', 'tinyApocalypse', 'craterBurst', 'tinyApocalypse', 'craterBurst', 'tinyApocalypse'],
    dmg: 19, atkDur: 9,
    rewardItemPool: ['crater_core', 'asteroid_belt'],
    waves: [
      { id: 'at1', name: 'Meteor Lesson', description: 'Giant slow meteors rain down with wide crater-warning markers.', duration: 5, attackType: 'rain', warningType: 'top', bulletSpeed: 162, spawnRate: 5, damage: 19, arenaEffect: 'quake', patternTags: ['rain', 'large'], execute: 'meteorLesson' },
      { id: 'at2', name: 'Planet Tilt', description: 'Six spiral arms rotate and sweep bullets across the arena floor.', duration: 5, attackType: 'spiral', warningType: 'center', bulletSpeed: 157, spawnRate: 6, damage: 19, arenaEffect: 'none', patternTags: ['spiral'], execute: 'planetTilt' },
      { id: 'at3', name: 'Crater Burst', description: 'Random craters explode in bursts from marked positions.', duration: 4, attackType: 'burst', warningType: 'area', bulletSpeed: 168, spawnRate: 16, damage: 19, arenaEffect: 'none', patternTags: ['burst'], execute: 'craterBurst' },
      { id: 'at4', name: 'Tiny Apocalypse', description: 'Expanding rings and bullet sprays fire simultaneously.', duration: 4, attackType: 'combo', warningType: 'ring', bulletSpeed: 132, spawnRate: 8, damage: 19, arenaEffect: 'none', patternTags: ['combo', 'ring'], execute: 'tinyApocalypse' },
      { id: 'at5', name: 'World Drop', description: 'A giant planetary shadow drops as a massive wide meteor impact.', duration: 5, attackType: 'rain', warningType: 'top', bulletSpeed: 164, spawnRate: 6, damage: 19, arenaEffect: 'quake', patternTags: ['rain', 'large'], execute: 'meteorLesson' },
      { id: 'at6', name: 'Magma Steps', description: 'Magma pools appear in stepping-stone sequences forcing narrow paths.', duration: 4, attackType: 'burst', warningType: 'area', bulletSpeed: 170, spawnRate: 16, damage: 19, arenaEffect: 'none', patternTags: ['burst'], execute: 'craterBurst' },
      { id: 'at7', name: 'Orbit Pebbles', description: 'Small orbiting rocks spiral outward in a multi-arm rotating pattern.', duration: 5, attackType: 'spiral', warningType: 'center', bulletSpeed: 162, spawnRate: 6, damage: 19, arenaEffect: 'none', patternTags: ['spiral'], execute: 'planetTilt' },
      { id: 'at8', name: 'Titan Toss', description: 'Giant rocks are thrown as large burst explosions from marked points.', duration: 4, attackType: 'burst', warningType: 'area', bulletSpeed: 172, spawnRate: 16, damage: 19, arenaEffect: 'none', patternTags: ['burst', 'large'], execute: 'craterBurst' },
      { id: 'at9', name: 'Continent Crack', description: 'Cracks split across the arena floor in diagonal expanding lines.', duration: 5, attackType: 'spiral', warningType: 'center', bulletSpeed: 164, spawnRate: 6, damage: 19, arenaEffect: 'none', patternTags: ['spiral'], execute: 'planetTilt' },
      { id: 'at10', name: 'Falling Lesson', description: 'Meteors fall slowly then suddenly accelerate mid-drop.', duration: 5, attackType: 'rain', warningType: 'top', bulletSpeed: 168, spawnRate: 6, damage: 19, arenaEffect: 'quake', patternTags: ['rain', 'accel'], execute: 'meteorLesson' },
      { id: 'at11', name: 'Planet Spin', description: 'The arena rotates — spiral arms sweep in tight counterclockwise waves.', duration: 5, attackType: 'spiral', warningType: 'center', bulletSpeed: 167, spawnRate: 6, damage: 19, arenaEffect: 'none', patternTags: ['spiral'], execute: 'planetTilt' },
      { id: 'at12', name: 'Stone Rain', description: 'Heavy stones fall and bounce off the floor before disappearing.', duration: 5, attackType: 'rain', warningType: 'top', bulletSpeed: 170, spawnRate: 7, damage: 19, arenaEffect: 'quake', patternTags: ['rain'], execute: 'meteorLesson' },
      { id: 'at13', name: 'Cracked Horizon', description: 'The horizon line becomes a sweeping hazard that crosses the screen.', duration: 4, attackType: 'burst', warningType: 'area', bulletSpeed: 174, spawnRate: 16, damage: 19, arenaEffect: 'none', patternTags: ['burst'], execute: 'craterBurst' },
      { id: 'at14', name: 'Atlas Shrug', description: 'Arena shakes and drops debris chunks from above in large burst clusters.', duration: 4, attackType: 'combo', warningType: 'ring', bulletSpeed: 146, spawnRate: 8, damage: 19, arenaEffect: 'none', patternTags: ['combo'], execute: 'tinyApocalypse' },
      { id: 'at15', name: 'Moon Bounce', description: 'Moon bullets bounce off the arena walls before homing in.', duration: 4, attackType: 'burst', warningType: 'area', bulletSpeed: 176, spawnRate: 16, damage: 19, arenaEffect: 'none', patternTags: ['burst'], execute: 'craterBurst' },
      { id: 'at16', name: 'Small Extinction', description: 'Meteor clusters close from all sides in a miniature extinction event.', duration: 4, attackType: 'combo', warningType: 'ring', bulletSpeed: 148, spawnRate: 8, damage: 19, arenaEffect: 'none', patternTags: ['combo'], execute: 'tinyApocalypse' },
      { id: 'at17', name: 'Core Break', description: 'Magma erupts from the center in a radial crater explosion.', duration: 4, attackType: 'burst', warningType: 'area', bulletSpeed: 178, spawnRate: 16, damage: 19, arenaEffect: 'none', patternTags: ['burst'], execute: 'craterBurst' },
      { id: 'at18', name: 'World Lesson', description: 'Every planetary mechanic returns in a final chaotic sequence.', duration: 4, attackType: 'combo', warningType: 'ring', bulletSpeed: 152, spawnRate: 8, damage: 19, arenaEffect: 'none', patternTags: ['combo'], execute: 'tinyApocalypse' },
    ],
  },
  {
    name: 'Xiu',
    title: 'the Paper Emperor',
    color: '#ffffff', color2: '#cc2222', bgTint: '#050505',
    difficultyLabel: 'Very Hard',
    personality: 'Regal and precise; believes every cut is a pronouncement.',
    design: 'Origami crane emperor; white paper armour edged in crimson; ink-drip crown.',
    arenaModifier: 'Occasional ink pools reduce movement speed.',
    dialog: ['Each fold is a sentence. Each cut, a law.', 'You will be filed away.'],
    attacks: ['paperCuts', 'foldedWalls', 'inkDecree', 'royalGuillotine', 'foldedWalls', 'origamiSpears', 'inkDecree', 'foldedWalls', 'royalGuillotine', 'foldedWalls', 'inkDecree', 'paperCuts', 'royalGuillotine', 'origamiSpears', 'paperCuts', 'paperCuts', 'royalGuillotine', 'royalGuillotine', 'inkDecree', 'royalGuillotine', 'royalGuillotine'],
    dmg: 18, atkDur: 10,
    rewardItemPool: ['paper_crane', 'ink_blot'],
    waves: [
      { id: 'x1', name: 'Paper Cuts', description: 'Angled paper-blade lasers fire in diagonal volleys across the arena.', duration: 4, attackType: 'diag', warningType: 'line', bulletSpeed: 0, spawnRate: 3, damage: 18, arenaEffect: 'none', patternTags: ['diag', 'laser'], execute: 'paperCuts' },
      { id: 'x2', name: 'Folded Walls', description: 'V-shaped paper walls fold inward from both sides simultaneously.', duration: 5, attackType: 'laser', warningType: 'side', bulletSpeed: 0, spawnRate: 3, damage: 18, arenaEffect: 'none', patternTags: ['laser', 'wall'], execute: 'foldedWalls' },
      { id: 'x3', name: 'Ink Decree', description: 'Grid of ink danger zones stamps across the arena floor.', duration: 5, attackType: 'zone', warningType: 'grid', bulletSpeed: 0, spawnRate: 2, damage: 18, arenaEffect: 'ink', patternTags: ['zone'], execute: 'inkDecree' },
      { id: 'x4', name: 'Royal Guillotine', description: 'A vertical blade slashes down with a burst of paper bullets on impact.', duration: 4, attackType: 'slash', warningType: 'column', bulletSpeed: 172, spawnRate: 12, damage: 18, arenaEffect: 'none', patternTags: ['slash', 'burst'], execute: 'royalGuillotine' },
      { id: 'x5', name: 'Thousand Folds', description: 'Layered paper walls fold from multiple directions with shifting gaps.', duration: 5, attackType: 'laser', warningType: 'side', bulletSpeed: 0, spawnRate: 4, damage: 18, arenaEffect: 'none', patternTags: ['laser'], execute: 'foldedWalls' },
      { id: 'x6', name: 'Origami Spears', description: 'Eight paper spears fold and launch in star formation.', duration: 3, attackType: 'diag', warningType: 'star', bulletSpeed: 0, spawnRate: 8, damage: 18, arenaEffect: 'none', patternTags: ['diag', 'laser'], execute: 'origamiSpears' },
      { id: 'x7', name: 'Ink Rain', description: 'Ink falls in diagonal drips creating overlapping decree zones.', duration: 5, attackType: 'zone', warningType: 'grid', bulletSpeed: 0, spawnRate: 2, damage: 18, arenaEffect: 'ink', patternTags: ['zone'], execute: 'inkDecree' },
      { id: 'x8', name: 'Scroll Maze', description: 'Scrolling paper walls slide across creating a shifting moving maze.', duration: 5, attackType: 'laser', warningType: 'side', bulletSpeed: 0, spawnRate: 5, damage: 18, arenaEffect: 'none', patternTags: ['laser'], execute: 'foldedWalls' },
      { id: 'x9', name: 'Paper Fan', description: 'Fan-shaped burst of paper guillotine blades radiate outward.', duration: 4, attackType: 'slash', warningType: 'column', bulletSpeed: 176, spawnRate: 12, damage: 18, arenaEffect: 'none', patternTags: ['slash'], execute: 'royalGuillotine' },
      { id: 'x10', name: 'Fold Trap', description: 'Safe areas fold shut — the paper walls close from multiple directions.', duration: 5, attackType: 'laser', warningType: 'side', bulletSpeed: 0, spawnRate: 5, damage: 18, arenaEffect: 'none', patternTags: ['laser'], execute: 'foldedWalls' },
      { id: 'x11', name: 'Red Stamp', description: 'Red stamp marks appear then slam as explosive ink zones.', duration: 5, attackType: 'zone', warningType: 'grid', bulletSpeed: 0, spawnRate: 2, damage: 18, arenaEffect: 'ink', patternTags: ['zone'], execute: 'inkDecree' },
      { id: 'x12', name: 'Blade Script', description: 'Written ink lines become diagonal cutting beams.', duration: 4, attackType: 'diag', warningType: 'line', bulletSpeed: 0, spawnRate: 3, damage: 18, arenaEffect: 'none', patternTags: ['diag'], execute: 'paperCuts' },
      { id: 'x13', name: "Emperor's Letter", description: 'A sealed envelope opens — paper shards burst in a royal slash pattern.', duration: 4, attackType: 'slash', warningType: 'column', bulletSpeed: 181, spawnRate: 12, damage: 18, arenaEffect: 'none', patternTags: ['slash'], execute: 'royalGuillotine' },
      { id: 'x14', name: 'Paper Storm', description: 'Tiny paper scraps swirl from all directions in unpredictable volleys.', duration: 3, attackType: 'diag', warningType: 'star', bulletSpeed: 0, spawnRate: 8, damage: 18, arenaEffect: 'none', patternTags: ['diag'], execute: 'origamiSpears' },
      { id: 'x15', name: 'Ink Mirror', description: 'Ink reflections copy diagonal cuts — double the blades.', duration: 4, attackType: 'diag', warningType: 'line', bulletSpeed: 0, spawnRate: 3, damage: 18, arenaEffect: 'none', patternTags: ['diag'], execute: 'paperCuts' },
      { id: 'x16', name: 'Crown Fold', description: 'Paper crown folds into rotating blade arcs around the arena.', duration: 4, attackType: 'diag', warningType: 'line', bulletSpeed: 0, spawnRate: 3, damage: 18, arenaEffect: 'none', patternTags: ['diag'], execute: 'paperCuts' },
      { id: 'x17', name: 'White Edge', description: 'Nearly invisible white paper blades appear — fake ones hide the real.', duration: 4, attackType: 'slash', warningType: 'column', bulletSpeed: 184, spawnRate: 12, damage: 18, arenaEffect: 'none', patternTags: ['slash'], execute: 'royalGuillotine' },
      { id: 'x18', name: 'Guillotine Hall', description: 'Several guillotine blades fire in rapid sequence — no gaps between.', duration: 4, attackType: 'slash', warningType: 'column', bulletSpeed: 184, spawnRate: 12, damage: 18, arenaEffect: 'none', patternTags: ['slash'], execute: 'royalGuillotine' },
      { id: 'x19', name: 'Final Decree', description: 'Ink decrees cover the arena then the pattern suddenly changes its final rule.', duration: 5, attackType: 'zone', warningType: 'grid', bulletSpeed: 0, spawnRate: 2, damage: 18, arenaEffect: 'ink', patternTags: ['zone'], execute: 'inkDecree' },
      { id: 'x20', name: 'Shredded Throne', description: 'Paper throne fragments fly outward in a massive radial slash burst.', duration: 4, attackType: 'slash', warningType: 'column', bulletSpeed: 186, spawnRate: 12, damage: 18, arenaEffect: 'none', patternTags: ['slash'], execute: 'royalGuillotine' },
      { id: 'x21', name: 'Thousand Cuts', description: 'Rapid sequence of blade paths — every paper attack fires in its final form.', duration: 4, attackType: 'slash', warningType: 'column', bulletSpeed: 187, spawnRate: 12, damage: 18, arenaEffect: 'none', patternTags: ['slash'], execute: 'royalGuillotine' },
    ],
  },
  {
    name: 'Mnemovex',
    title: 'the Living Archive',
    color: '#44ccff', color2: '#ccaaff', bgTint: '#000510',
    difficultyLabel: 'Extreme',
    personality: 'Ancient, calm; stores every soul it has killed and weaponizes the memories.',
    design: 'Floating archive cube; thousands of tiny screens; hands made of floating pages.',
    arenaModifier: 'Ghostly player echo appears 2 seconds behind.',
    dialog: ['I have remembered every soul that failed here.', 'Including yours. Eventually.'],
    attacks: ['echoTrail', 'memoryReplay', 'vaultLock', 'crystalRepeat', 'echoTrail', 'vaultLock', 'crystalRepeat', 'echoTrail', 'vaultLock', 'crystalRepeat', 'echoTrail', 'memoryReplay', 'vaultLock', 'crystalRepeat', 'echoTrail', 'memoryReplay', 'vaultLock', 'crystalRepeat', 'echoTrail', 'vaultLock', 'echoTrail', 'crystalRepeat'],
    dmg: 18, atkDur: 10,
    rewardItemPool: ['memory_stone', 'echo_key'],
    waves: [
      { id: 'm1', name: 'Echo Trail', description: 'Bullets erupt from positions the player occupied two seconds ago.', duration: 5, attackType: 'echo', warningType: 'trail', bulletSpeed: 132, spawnRate: 5, damage: 18, arenaEffect: 'echo', patternTags: ['echo', 'memory'], execute: 'echoTrail' },
      { id: 'm2', name: 'Memory Replay', description: 'The archive replays an earlier boss attack pattern from memory.', duration: 5, attackType: 'replay', warningType: 'random', bulletSpeed: 0, spawnRate: 0, damage: 18, arenaEffect: 'none', patternTags: ['replay'], execute: 'memoryReplay' },
      { id: 'm3', name: 'Vault Lock', description: 'A grid laser fires in a blinking sequence — safe cells shift unpredictably.', duration: 5, attackType: 'grid', warningType: 'grid', bulletSpeed: 0, spawnRate: 4, damage: 18, arenaEffect: 'none', patternTags: ['laser', 'grid'], execute: 'vaultLock' },
      { id: 'm4', name: 'Crystal Repeat', description: 'A rain pattern plays then repeats itself in a slightly offset second pass.', duration: 6, attackType: 'rain', warningType: 'top', bulletSpeed: 192, spawnRate: 10, damage: 18, arenaEffect: 'none', patternTags: ['rain', 'repeat'], execute: 'crystalRepeat' },
      { id: 'm5', name: 'Ghostprint', description: 'Your echo becomes visible — it fires a burst from where you just were.', duration: 5, attackType: 'echo', warningType: 'trail', bulletSpeed: 136, spawnRate: 5, damage: 18, arenaEffect: 'echo', patternTags: ['echo'], execute: 'echoTrail' },
      { id: 'm6', name: 'File Cabinet', description: 'Archive files open and fire laser rows in rotating columns.', duration: 5, attackType: 'grid', warningType: 'grid', bulletSpeed: 0, spawnRate: 4, damage: 18, arenaEffect: 'none', patternTags: ['laser'], execute: 'vaultLock' },
      { id: 'm7', name: 'Time Loop', description: 'The exact same crystal pattern fires twice with a 1-second offset.', duration: 6, attackType: 'rain', warningType: 'top', bulletSpeed: 196, spawnRate: 10, damage: 18, arenaEffect: 'none', patternTags: ['rain'], execute: 'crystalRepeat' },
      { id: 'm8', name: 'Shadow Clone', description: 'Your shadow separates and fires volleys from where you stood moments ago.', duration: 5, attackType: 'echo', warningType: 'trail', bulletSpeed: 141, spawnRate: 5, damage: 18, arenaEffect: 'echo', patternTags: ['echo'], execute: 'echoTrail' },
      { id: 'm9', name: 'Double Lock', description: 'Two vault grid patterns overlap — only one safe corridor remains.', duration: 5, attackType: 'grid', warningType: 'grid', bulletSpeed: 0, spawnRate: 4, damage: 18, arenaEffect: 'none', patternTags: ['laser'], execute: 'vaultLock' },
      { id: 'm10', name: 'Memory Flood', description: 'The crystal rain overwrites itself mid-pattern with a denser repeat.', duration: 6, attackType: 'rain', warningType: 'top', bulletSpeed: 174, spawnRate: 10, damage: 18, arenaEffect: 'none', patternTags: ['rain'], execute: 'crystalRepeat' },
      { id: 'm11', name: 'Phantom Step', description: 'Every step you took in the last 3 seconds leaves a bullet behind.', duration: 5, attackType: 'echo', warningType: 'trail', bulletSpeed: 146, spawnRate: 5, damage: 18, arenaEffect: 'echo', patternTags: ['echo'], execute: 'echoTrail' },
      { id: 'm12', name: 'Archive Dive', description: 'The archive pulls a replay from deeper — a harder older boss pattern.', duration: 5, attackType: 'replay', warningType: 'random', bulletSpeed: 0, spawnRate: 0, damage: 18, arenaEffect: 'none', patternTags: ['replay'], execute: 'memoryReplay' },
      { id: 'm13', name: 'Overdrive Lock', description: 'The vault grid blinks three times in rapid succession — read each flash.', duration: 5, attackType: 'grid', warningType: 'grid', bulletSpeed: 0, spawnRate: 4, damage: 18, arenaEffect: 'none', patternTags: ['laser'], execute: 'vaultLock' },
      { id: 'm14', name: 'Shattered Memory', description: 'The crystal rain pattern shatters into sub-bullets mid-fall.', duration: 6, attackType: 'rain', warningType: 'top', bulletSpeed: 178, spawnRate: 10, damage: 18, arenaEffect: 'none', patternTags: ['rain'], execute: 'crystalRepeat' },
      { id: 'm15', name: 'Echostorm', description: 'Multiple echoes fire simultaneously — the whole arena tracks your history.', duration: 5, attackType: 'echo', warningType: 'trail', bulletSpeed: 151, spawnRate: 5, damage: 18, arenaEffect: 'echo', patternTags: ['echo'], execute: 'echoTrail' },
      { id: 'm16', name: 'Final Archive', description: 'The deepest recorded memory replays — a combined boss 6–10 pattern.', duration: 5, attackType: 'replay', warningType: 'random', bulletSpeed: 0, spawnRate: 0, damage: 18, arenaEffect: 'none', patternTags: ['replay'], execute: 'memoryReplay' },
      { id: 'm17', name: 'Grand Vault', description: 'The largest vault grid activates — nearly every column and row fires.', duration: 5, attackType: 'grid', warningType: 'grid', bulletSpeed: 0, spawnRate: 4, damage: 18, arenaEffect: 'none', patternTags: ['laser'], execute: 'vaultLock' },
      { id: 'm18', name: 'Crystal Cascade', description: 'Crystal rain cascades in three sequential waves with no pause between.', duration: 6, attackType: 'rain', warningType: 'top', bulletSpeed: 182, spawnRate: 10, damage: 18, arenaEffect: 'none', patternTags: ['rain'], execute: 'crystalRepeat' },
      { id: 'm19', name: 'Soul Echo', description: 'The echo of your soul fires from six positions at once.', duration: 5, attackType: 'echo', warningType: 'trail', bulletSpeed: 156, spawnRate: 5, damage: 18, arenaEffect: 'echo', patternTags: ['echo'], execute: 'echoTrail' },
      { id: 'm20', name: 'Sealed Archive', description: 'Final vault sequence — two overlapping grids fire with no rest between.', duration: 5, attackType: 'grid', warningType: 'grid', bulletSpeed: 0, spawnRate: 4, damage: 18, arenaEffect: 'none', patternTags: ['laser'], execute: 'vaultLock' },
      { id: 'm21', name: 'Final Echo', description: 'Maximum echo storm — every position you\'ve visited erupts.', duration: 5, attackType: 'echo', warningType: 'trail', bulletSpeed: 161, spawnRate: 5, damage: 18, arenaEffect: 'echo', patternTags: ['echo'], execute: 'echoTrail' },
      { id: 'm22', name: 'Record Break', description: 'The archive fires its final crystal pattern — heavier than anything before.', duration: 6, attackType: 'rain', warningType: 'top', bulletSpeed: 185, spawnRate: 10, damage: 18, arenaEffect: 'none', patternTags: ['rain'], execute: 'crystalRepeat' },
    ],
  },
  {
    name: 'Lunara',
    title: 'the Red Marionette',
    color: '#cc2244', color2: '#ffccaa', bgTint: '#070001',
    difficultyLabel: 'Extreme',
    personality: 'Childlike but terrifying; controls the arena like a puppet stage.',
    design: 'Marionette with crescent moon halo; crimson strings; porcelain face with crack.',
    arenaModifier: 'Puppet strings visible across arena; touching them briefly slows player.',
    dialog: ['Dance. The strings do not lie.', 'Shhhh. The moon is watching.'],
    attacks: ['stringPull', 'puppetDance', 'moonDrop', 'bloodCurtain', 'puppetDance', 'moonShatter', 'puppetDance', 'moonDrop', 'stringPull', 'puppetDance', 'moonShatter', 'stringPull', 'bloodCurtain', 'puppetDance', 'moonDrop', 'puppetDance', 'bloodCurtain', 'puppetDance', 'moonDrop', 'stringPull', 'moonShatter', 'stringPull', 'bloodCurtain'],
    dmg: 17, atkDur: 10,
    rewardItemPool: ['moonthread', 'blood_vial'],
    waves: [
      { id: 'lu1', name: 'String Pull', description: 'Crimson strings yank the player diagonally while bullets close in.', duration: 5, attackType: 'pull', warningType: 'arrow', bulletSpeed: 162, spawnRate: 6, damage: 17, arenaEffect: 'pull', patternTags: ['pull', 'homing'], execute: 'stringPull' },
      { id: 'lu2', name: 'Puppet Dance', description: 'The marionette jerks the arena — laser walls shuffle with a narrow safe path.', duration: 5, attackType: 'wall', warningType: 'row', bulletSpeed: 132, spawnRate: 7, damage: 17, arenaEffect: 'none', patternTags: ['wall', 'combo'], execute: 'puppetDance' },
      { id: 'lu3', name: 'Moon Drop', description: 'Giant crescent bullets fall slowly but leave huge hazard areas on impact.', duration: 5, attackType: 'rain', warningType: 'top', bulletSpeed: 112, spawnRate: 2, damage: 17, arenaEffect: 'none', patternTags: ['rain', 'large'], execute: 'moonDrop' },
      { id: 'lu4', name: 'Blood Curtain', description: 'A red laser curtain sweeps fast across the full arena width.', duration: 4, attackType: 'laser', warningType: 'row', bulletSpeed: 0, spawnRate: 2, damage: 17, arenaEffect: 'none', patternTags: ['laser', 'fast'], execute: 'bloodCurtain' },
      { id: 'lu5', name: 'Puppet Lurch', description: 'The puppet lurches — walls shift mid-approach and the safe path moves.', duration: 5, attackType: 'wall', warningType: 'row', bulletSpeed: 136, spawnRate: 7, damage: 17, arenaEffect: 'none', patternTags: ['wall'], execute: 'puppetDance' },
      { id: 'lu6', name: 'Moon Shatter', description: 'A full crescent ring contracts then shatters outward in a radial burst.', duration: 5, attackType: 'ring', warningType: 'ring', bulletSpeed: 162, spawnRate: 24, damage: 17, arenaEffect: 'none', patternTags: ['ring', 'burst'], execute: 'moonShatter' },
      { id: 'lu7', name: 'Marionette Cross', description: 'Puppet strings form a cross pattern while walls fire from both axes.', duration: 5, attackType: 'wall', warningType: 'row', bulletSpeed: 141, spawnRate: 7, damage: 17, arenaEffect: 'none', patternTags: ['wall'], execute: 'puppetDance' },
      { id: 'lu8', name: 'Lunar Tears', description: 'Moon drops cluster in groups of three — gaps between are tighter.', duration: 5, attackType: 'rain', warningType: 'top', bulletSpeed: 114, spawnRate: 3, damage: 17, arenaEffect: 'none', patternTags: ['rain'], execute: 'moonDrop' },
      { id: 'lu9', name: 'Tangled Web', description: 'Multiple strings drag from opposite corners simultaneously.', duration: 5, attackType: 'pull', warningType: 'arrow', bulletSpeed: 166, spawnRate: 6, damage: 17, arenaEffect: 'pull', patternTags: ['pull'], execute: 'stringPull' },
      { id: 'lu10', name: 'Broken Puppet', description: 'The puppet moves erratically — walls stutter and shift without warning.', duration: 5, attackType: 'wall', warningType: 'row', bulletSpeed: 146, spawnRate: 7, damage: 17, arenaEffect: 'none', patternTags: ['wall'], execute: 'puppetDance' },
      { id: 'lu11', name: 'Blood Moon', description: 'The moon shatters red — burst radius doubles and hits the arena walls.', duration: 5, attackType: 'ring', warningType: 'ring', bulletSpeed: 167, spawnRate: 24, damage: 17, arenaEffect: 'none', patternTags: ['ring'], execute: 'moonShatter' },
      { id: 'lu12', name: 'String Maze', description: 'A web of strings fills the arena — touching them pulls you off course.', duration: 5, attackType: 'pull', warningType: 'arrow', bulletSpeed: 170, spawnRate: 6, damage: 17, arenaEffect: 'pull', patternTags: ['pull'], execute: 'stringPull' },
      { id: 'lu13', name: 'Red Veil', description: 'Two curtain sweeps fire from opposite sides of the arena.', duration: 4, attackType: 'laser', warningType: 'row', bulletSpeed: 0, spawnRate: 2, damage: 17, arenaEffect: 'none', patternTags: ['laser'], execute: 'bloodCurtain' },
      { id: 'lu14', name: 'Lost Control', description: 'The marionette loses control — walls cross each other in chaotic formation.', duration: 5, attackType: 'wall', warningType: 'row', bulletSpeed: 151, spawnRate: 7, damage: 17, arenaEffect: 'none', patternTags: ['wall'], execute: 'puppetDance' },
      { id: 'lu15', name: 'Full Moon', description: 'Maximum-size crescent bullets drop in clusters — no clear safe zone.', duration: 5, attackType: 'rain', warningType: 'top', bulletSpeed: 116, spawnRate: 4, damage: 17, arenaEffect: 'none', patternTags: ['rain'], execute: 'moonDrop' },
      { id: 'lu16', name: 'Puppet Frenzy', description: 'Rapid puppet wall bursts — barely any pause between each wall pass.', duration: 5, attackType: 'wall', warningType: 'row', bulletSpeed: 153, spawnRate: 7, damage: 17, arenaEffect: 'none', patternTags: ['wall'], execute: 'puppetDance' },
      { id: 'lu17', name: 'Triple Curtain', description: 'Three blood curtain sweeps fire back to back — no margin between.', duration: 4, attackType: 'laser', warningType: 'row', bulletSpeed: 0, spawnRate: 2, damage: 17, arenaEffect: 'none', patternTags: ['laser'], execute: 'bloodCurtain' },
      { id: 'lu18', name: 'Final Dance', description: 'The ultimate puppet sequence — walls, strings and moon drops layer together.', duration: 5, attackType: 'wall', warningType: 'row', bulletSpeed: 156, spawnRate: 7, damage: 17, arenaEffect: 'none', patternTags: ['wall'], execute: 'puppetDance' },
      { id: 'lu19', name: 'Moonfall', description: 'The densest moon drop barrage — every lane is marked at once.', duration: 5, attackType: 'rain', warningType: 'top', bulletSpeed: 119, spawnRate: 4, damage: 17, arenaEffect: 'none', patternTags: ['rain'], execute: 'moonDrop' },
      { id: 'lu20', name: 'Soul Strings', description: 'Strings target the player directly — pulling toward the center from all sides.', duration: 5, attackType: 'pull', warningType: 'arrow', bulletSpeed: 174, spawnRate: 6, damage: 17, arenaEffect: 'pull', patternTags: ['pull'], execute: 'stringPull' },
      { id: 'lu21', name: 'Last Quarter', description: 'The moon shatters completely — ring collapses then explodes at max speed.', duration: 5, attackType: 'ring', warningType: 'ring', bulletSpeed: 177, spawnRate: 24, damage: 17, arenaEffect: 'none', patternTags: ['ring'], execute: 'moonShatter' },
      { id: 'lu22', name: 'Puppet Master', description: 'Every string activates — the full arena is pulled simultaneously.', duration: 5, attackType: 'pull', warningType: 'arrow', bulletSpeed: 180, spawnRate: 6, damage: 17, arenaEffect: 'pull', patternTags: ['pull'], execute: 'stringPull' },
      { id: 'lu23', name: 'Curtain Call', description: 'The final blood curtain drops — an unstoppable red sweep closes the show.', duration: 4, attackType: 'laser', warningType: 'row', bulletSpeed: 0, spawnRate: 2, damage: 17, arenaEffect: 'none', patternTags: ['laser'], execute: 'bloodCurtain' },
    ],
  },
  {
    name: 'Soulvex',
    title: 'the First Mistake',
    color: '#ffffff', color2: '#ff4444', bgTint: '#000000',
    difficultyLabel: 'Impossible',
    personality: 'The concept of original error; knows every pattern ever learned.',
    design: 'Pure white sphere cracked with red veins; all 19 boss silhouettes orbit it.',
    arenaModifier: 'Arena randomly shifts between all previous boss bgTints.',
    dialog: ['I am everything that came before.', 'There is no pattern I have not already used on you.'],
    attacks: ['regretSpiral', 'bossMemoryChain', 'brokenControls', 'soulDuel', 'regretSpiral', 'soulDuel', 'regretSpiral', 'brokenControls', 'bossMemoryChain', 'brokenControls', 'soulDuel', 'regretSpiral', 'bossMemoryChain', 'regretSpiral', 'regretSpiral', 'brokenControls', 'soulDuel', 'bossMemoryChain', 'soulDuel', 'regretSpiral', 'brokenControls', 'soulDuel', 'bossMemoryChain', 'firstMistake', 'firstMistake'],
    dmg: 15, atkDur: 12,
    rewardItemPool: ['soul_echo', 'first_light'],
    waves: [
      { id: 's1', name: 'Regret Spiral', description: 'A dense 8-arm spiral erupts from the center — the pattern of every mistake.', duration: 5, attackType: 'spiral', warningType: 'ring', bulletSpeed: 172, spawnRate: 8, damage: 15, arenaEffect: 'none', patternTags: ['spiral', 'dense'], execute: 'regretSpiral' },
      { id: 's2', name: 'Boss Memory Chain', description: 'Soulvex cycles through every prior boss attack rapidly in sequence.', duration: 25, attackType: 'chain', warningType: 'all', bulletSpeed: 0, spawnRate: 0, damage: 15, arenaEffect: 'memory', patternTags: ['chain', 'replay'], execute: 'bossMemoryChain' },
      { id: 's3', name: 'Broken Controls', description: 'Your movement controls invert — left is right, up is down. Bullets rain in.', duration: 5, attackType: 'rain', warningType: 'top', bulletSpeed: 162, spawnRate: 7, damage: 15, arenaEffect: 'flip', patternTags: ['rain', 'flip'], execute: 'brokenControls' },
      { id: 's4', name: 'Soul Duel', description: 'A mirror version of you fires everything you would have dodged.', duration: 6, attackType: 'mirror', warningType: 'mirror', bulletSpeed: 162, spawnRate: 5, damage: 15, arenaEffect: 'mirror', patternTags: ['mirror'], execute: 'soulDuel' },
      { id: 's5', name: 'Ancient Wound', description: 'A spiral from the deepest regret — arms are tighter and faster.', duration: 5, attackType: 'spiral', warningType: 'ring', bulletSpeed: 177, spawnRate: 8, damage: 15, arenaEffect: 'none', patternTags: ['spiral'], execute: 'regretSpiral' },
      { id: 's6', name: 'Mirror Test', description: 'The mirror soul tests you — it anticipates your dodge direction.', duration: 6, attackType: 'mirror', warningType: 'mirror', bulletSpeed: 166, spawnRate: 5, damage: 15, arenaEffect: 'mirror', patternTags: ['mirror', 'aimed'], execute: 'soulDuel' },
      { id: 's7', name: 'All Roads', description: 'Spiral arms reach in all 8 directions — no obvious escape lane.', duration: 5, attackType: 'spiral', warningType: 'ring', bulletSpeed: 179, spawnRate: 8, damage: 15, arenaEffect: 'none', patternTags: ['spiral'], execute: 'regretSpiral' },
      { id: 's8', name: 'Static Mind', description: 'Controls shift randomly mid-wave — you can\'t tell which direction does what.', duration: 5, attackType: 'rain', warningType: 'top', bulletSpeed: 168, spawnRate: 7, damage: 15, arenaEffect: 'flip', patternTags: ['rain', 'flip'], execute: 'brokenControls' },
      { id: 's9', name: 'Deep Recall', description: 'Soulvex recalls a longer combined memory — multiple bosses fire at once.', duration: 25, attackType: 'chain', warningType: 'all', bulletSpeed: 0, spawnRate: 0, damage: 15, arenaEffect: 'memory', patternTags: ['chain'], execute: 'bossMemoryChain' },
      { id: 's10', name: 'Error Loop', description: 'Your controls loop — each button press delays by half a second.', duration: 5, attackType: 'rain', warningType: 'top', bulletSpeed: 172, spawnRate: 7, damage: 15, arenaEffect: 'flip', patternTags: ['rain', 'flip'], execute: 'brokenControls' },
      { id: 's11', name: 'Reflection', description: 'The mirror soul copies your last 3 movements and fires from all of them.', duration: 6, attackType: 'mirror', warningType: 'mirror', bulletSpeed: 167, spawnRate: 5, damage: 15, arenaEffect: 'mirror', patternTags: ['mirror'], execute: 'soulDuel' },
      { id: 's12', name: 'Pattern Fall', description: 'The regret spiral falls from above — arms descend rather than expanding.', duration: 5, attackType: 'spiral', warningType: 'ring', bulletSpeed: 181, spawnRate: 8, damage: 15, arenaEffect: 'none', patternTags: ['spiral'], execute: 'regretSpiral' },
      { id: 's13', name: 'Archive of Shame', description: 'The longest memory chain — all 19 bosses fire in a chained sequence.', duration: 25, attackType: 'chain', warningType: 'all', bulletSpeed: 0, spawnRate: 0, damage: 15, arenaEffect: 'memory', patternTags: ['chain'], execute: 'bossMemoryChain' },
      { id: 's14', name: 'Spiral of Ruin', description: 'Maximum arm count — every degree is covered by the spiral pattern.', duration: 5, attackType: 'spiral', warningType: 'ring', bulletSpeed: 189, spawnRate: 8, damage: 15, arenaEffect: 'none', patternTags: ['spiral', 'dense'], execute: 'regretSpiral' },
      { id: 's15', name: 'The Weight', description: 'Regret accumulates — a heavy dense spiral that fires slower but fills everything.', duration: 5, attackType: 'spiral', warningType: 'ring', bulletSpeed: 184, spawnRate: 8, damage: 15, arenaEffect: 'none', patternTags: ['spiral'], execute: 'regretSpiral' },
      { id: 's16', name: 'Lost Input', description: 'Controls barely respond — a 1-second delay on every movement input.', duration: 5, attackType: 'rain', warningType: 'top', bulletSpeed: 168, spawnRate: 7, damage: 15, arenaEffect: 'flip', patternTags: ['rain', 'flip'], execute: 'brokenControls' },
      { id: 's17', name: 'Twin Soul', description: 'Two mirror souls appear and fire simultaneously from opposite sides.', duration: 6, attackType: 'mirror', warningType: 'mirror', bulletSpeed: 171, spawnRate: 5, damage: 15, arenaEffect: 'mirror', patternTags: ['mirror'], execute: 'soulDuel' },
      { id: 's18', name: 'Everything Before', description: 'The complete chain — every boss pattern chains together in final form.', duration: 25, attackType: 'chain', warningType: 'all', bulletSpeed: 0, spawnRate: 0, damage: 15, arenaEffect: 'memory', patternTags: ['chain'], execute: 'bossMemoryChain' },
      { id: 's19', name: 'Perfect Mirror', description: 'The mirror soul matches your speed and position exactly — it knows you.', duration: 6, attackType: 'mirror', warningType: 'mirror', bulletSpeed: 173, spawnRate: 5, damage: 15, arenaEffect: 'mirror', patternTags: ['mirror', 'aimed'], execute: 'soulDuel' },
      { id: 's20', name: 'Endless Loop', description: 'The spiral never resolves — arms keep adding as the pattern escalates.', duration: 5, attackType: 'spiral', warningType: 'ring', bulletSpeed: 187, spawnRate: 8, damage: 15, arenaEffect: 'none', patternTags: ['spiral'], execute: 'regretSpiral' },
      { id: 's21', name: 'System Break', description: 'Every control input breaks — movement is now random for the duration.', duration: 5, attackType: 'rain', warningType: 'top', bulletSpeed: 170, spawnRate: 7, damage: 15, arenaEffect: 'flip', patternTags: ['rain', 'flip'], execute: 'brokenControls' },
      { id: 's22', name: 'Your Reflection', description: 'The mirror knows your patterns — it predicts your movement before you move.', duration: 6, attackType: 'mirror', warningType: 'mirror', bulletSpeed: 176, spawnRate: 5, damage: 15, arenaEffect: 'mirror', patternTags: ['mirror'], execute: 'soulDuel' },
      { id: 's23', name: 'The Whole Story', description: 'The final chain — all 20 boss signatures fire simultaneously.', duration: 25, attackType: 'chain', warningType: 'all', bulletSpeed: 0, spawnRate: 0, damage: 15, arenaEffect: 'memory', patternTags: ['chain'], execute: 'bossMemoryChain' },
      { id: 's24', name: 'The First Mistake', description: 'Maximum chaos erupts — rings, lasers, and bullets fill every corner at once.', duration: 6, attackType: 'chaos', warningType: 'all', bulletSpeed: 178, spawnRate: 14, damage: 15, arenaEffect: 'all', patternTags: ['chaos', 'finale'], execute: 'firstMistake' },
      { id: 's25', name: 'The Last Attempt', description: 'The original sin fires one final time — everything, everywhere, all at once.', duration: 6, attackType: 'chaos', warningType: 'all', bulletSpeed: 182, spawnRate: 14, damage: 15, arenaEffect: 'all', patternTags: ['chaos', 'finale'], execute: 'firstMistake' },
    ],
  },
];

// ================================================================
// FAIRNESS DEBUFF ENFORCER — runs once at module init
// Computes explicit warnDuration/safeGapFraction/layers from wave data, then
// enforces tier-based floors/caps by mutating bulletSpeed/spawnRate/patternTags.
// This makes debuffs both data-level AND runtime-level, and gives validateWaveFairness
// actual measured values instead of indirect heuristics.
// ================================================================
(function applyFairnessDebuffs() {
  // Warning duration (seconds) per warningType — how long players see the warning before hazard fires
  const WARN_SECS: Record<string, number> = {
    none: 0, random: 0.30, trail: 0.40, pulse: 0.50, edge: 0.50, top: 0.50,
    mirror: 0.60, target: 0.70, center: 0.80, ring: 0.80, area: 0.80, corner: 0.80,
    column: 1.00, row: 1.00, multi: 1.00, grid: 1.20, all: 1.20,
  };

  // Arena width used for safe-gap density formula (pixels)
  const ARENA_W = 438;
  const AVG_BULLET_R = 6; // base radius before HAZARD_VISUAL_SCALE

  // Per-tier thresholds (tier = 0..4 for boss indices 0-3, 4-6, 7-9, 10-14, 15-19)
  const tierMaxSpeed    = [162, 172, 182, 188, 192];
  const tierMinWarnSecs = [0.90, 0.80, 0.70, 0.60, 0.50];
  const tierMinSafeGap  = [0.40, 0.34, 0.26, 0.20, 0.16];
  const tierMaxLayers   = [2, 3, 3, 4, 4];

  // Per-attackType spawnRate hard caps
  const spawnCaps: Record<string, number> = {
    corner: 22, burst: 18, rain: 18, radial: 44, random: 20,
  };

  const computeSafeGap = (sr: number, spd: number): number => {
    // Each bullet sweeps a strip of width 2*r across ARENA_W.
    // Fraction of arena width covered per second ≈ sr * 2*r / ARENA_W
    const r = AVG_BULLET_R * HAZARD_VISUAL_SCALE;
    const density = spd > 0 ? sr * (2 * r) / ARENA_W : sr * 0.02;
    return Math.max(0, Math.min(1, 1 - density));
  };

  BOSSES.forEach((boss, bi) => {
    const tier = bi < 4 ? 0 : bi < 7 ? 1 : bi < 10 ? 2 : bi < 15 ? 3 : 4;
    (boss.waves ?? []).forEach(wave => {
      const tags = wave.patternTags;

      // ── Step 1: Compute explicit fields from wave data ──────────
      wave.warnDuration = WARN_SECS[wave.warningType] ?? 0.50;
      wave.safeGapFraction = computeSafeGap(wave.spawnRate, wave.bulletSpeed);
      const nonTrivialEffect = !['none', 'memory', 'mirror', 'echo', 'flip'].includes(wave.arenaEffect);
      wave.layers = tags.length + (nonTrivialEffect ? 1 : 0);

      // ── Step 2: Remove banned mechanic combos (mutate tags) ─────
      const hasFlip  = tags.includes('flip') || wave.arenaEffect === 'flip';
      const hasDense = tags.includes('dense');
      const hasDark  = tags.includes('dark') || wave.arenaEffect === 'dark';
      const hasFake  = tags.includes('fake');
      const hasVoid  = tags.includes('void');
      const hasLaser = tags.includes('laser') || wave.attackType === 'laser';

      // Banned: flip + dense → remove 'dense' tag, cap rate
      if (hasFlip && hasDense) {
        const idx = tags.indexOf('dense'); if (idx !== -1) tags.splice(idx, 1);
        wave.spawnRate = Math.min(wave.spawnRate, 7);
      }
      // Banned: flip + fast + high rate → cap speed and rate
      if (hasFlip && wave.bulletSpeed > 162 && wave.spawnRate >= 8) {
        wave.bulletSpeed = Math.min(wave.bulletSpeed, 162);
        wave.spawnRate   = Math.min(wave.spawnRate, 7);
      }
      // Banned: dark + fake + fast → remove 'fake', cap speed
      if (hasDark && hasFake && wave.bulletSpeed > 155) {
        const idx = tags.indexOf('fake'); if (idx !== -1) tags.splice(idx, 1);
        wave.bulletSpeed = Math.min(wave.bulletSpeed, 155);
      }
      // Banned: void + laser + dense → remove 'dense'
      if (hasVoid && hasLaser && hasDense) {
        const idx = tags.indexOf('dense'); if (idx !== -1) tags.splice(idx, 1);
      }

      // ── Step 3: Enforce tier bulletSpeed cap ────────────────────
      if (wave.bulletSpeed > tierMaxSpeed[tier]) wave.bulletSpeed = tierMaxSpeed[tier];

      // ── Step 4: Enforce per-type spawnRate cap ──────────────────
      const srCap = spawnCaps[wave.attackType];
      if (srCap !== undefined && wave.spawnRate > srCap) wave.spawnRate = srCap;

      // ── Step 5: Enforce warning-time floor ──────────────────────
      // If warnDuration is below the tier minimum for a bullet-based hazard,
      // reduce bulletSpeed so slow bullets compensate for the short warning window.
      const minWarn = tierMinWarnSecs[tier];
      if (wave.warnDuration < minWarn && wave.bulletSpeed > 0) {
        const deficit = minWarn - wave.warnDuration; // seconds short
        // Reduce speed proportional to the warning deficit (max 35% reduction)
        const reduction = Math.min(0.35, deficit / minWarn);
        wave.bulletSpeed = Math.round(wave.bulletSpeed * (1 - reduction));
      }

      // ── Step 6: Enforce safe-gap minimum ───────────────────────
      // If bullet density leaves too small a safe gap, reduce spawnRate until gap is safe.
      const minGap = tierMinSafeGap[tier];
      let safeGap = computeSafeGap(wave.spawnRate, wave.bulletSpeed);
      if (safeGap < minGap && wave.bulletSpeed > 0) {
        // Solve: 1 - sr * 2*r / ARENA_W >= minGap  →  sr <= (1-minGap)*ARENA_W / (2*r)
        const r = AVG_BULLET_R * HAZARD_VISUAL_SCALE;
        const maxSR = Math.floor((1 - minGap) * ARENA_W / (2 * r));
        if (maxSR > 0 && wave.spawnRate > maxSR) wave.spawnRate = maxSR;
        safeGap = computeSafeGap(wave.spawnRate, wave.bulletSpeed);
      }

      // ── Step 7: Enforce layer cap ────────────────────────────────
      const maxL = tierMaxLayers[tier];
      const effectiveNonTrivial = !['none', 'memory', 'mirror', 'echo', 'flip'].includes(wave.arenaEffect);
      const tagBudget = maxL - (effectiveNonTrivial ? 1 : 0);
      if (tags.length > tagBudget && tagBudget >= 0) {
        tags.splice(tagBudget); // trim to budget
      }

      // ── Step 8: Re-compute final explicit fields after adjustments
      wave.warnDuration    = WARN_SECS[wave.warningType] ?? 0.50;
      wave.safeGapFraction = computeSafeGap(wave.spawnRate, wave.bulletSpeed);
      wave.layers          = tags.length + (effectiveNonTrivial ? 1 : 0);
    });
  });
})();

// ITEMS (20 collectibles — one reward pool per boss)
// ================================================================

const ITEMS: Item[] = [
  { id: 'moth_wing', name: 'Moth Wing', type: 'speed', description: 'Grants ethereal speed for 3 seconds. Your movement doubles briefly.', maxStack: 2, usable: true, allowedInLeaderboard: true, iconShape: 'wing', themeColor: '#88ff44', effect: 'speedBoost3s', bossSource: 'Vyrial', rarity: 'common', useFunction: 'useSpeedBoost' },
  { id: 'velvet_spore', name: 'Velvet Spore', type: 'decoy', description: 'Leaves a smoke decoy at current position, drawing bullets for 1.5 seconds.', maxStack: 3, usable: true, allowedInLeaderboard: true, iconShape: 'cloud', themeColor: '#ff8844', effect: 'spawnDecoy', bossSource: 'Vyrial', rarity: 'uncommon', useFunction: 'useDecoy' },
  { id: 'echo_fragment', name: 'Echo Fragment', type: 'utility', description: 'Freezes all current bullets for 0.5 seconds.', maxStack: 2, usable: true, allowedInLeaderboard: true, iconShape: 'wave', themeColor: '#ff44aa', effect: 'freezeBullets0.5s', bossSource: 'Echora', rarity: 'common', useFunction: 'useEchoFreeze' },
  { id: 'choir_mask', name: 'Choir Mask', type: 'defense', description: 'Absorbs the next laser hit entirely.', maxStack: 1, usable: true, allowedInLeaderboard: true, iconShape: 'mask', themeColor: '#44aaff', effect: 'absorbLaser', bossSource: 'Echora', rarity: 'rare', useFunction: 'useChoirMask' },
  { id: 'gravity_lens', name: 'Gravity Lens', type: 'utility', description: 'Inverts all bullet pull directions for 3 seconds.', maxStack: 1, usable: true, allowedInLeaderboard: true, iconShape: 'lens', themeColor: '#8844ff', effect: 'invertGravity3s', bossSource: 'Vantus', rarity: 'rare', useFunction: 'useGravityInvert' },
  { id: 'orbit_stone', name: 'Orbit Stone', type: 'defense', description: 'Orbiting shield blocks 3 bullets before shattering.', maxStack: 2, usable: true, allowedInLeaderboard: true, iconShape: 'ring', themeColor: '#44ffcc', effect: 'orbitShield3', bossSource: 'Vantus', rarity: 'uncommon', useFunction: 'useOrbitShield' },
  { id: 'wax_seal', name: 'Wax Seal', type: 'defense', description: 'Encases you in protective wax for 1 second — immune to damage.', maxStack: 2, usable: true, allowedInLeaderboard: true, iconShape: 'circle', themeColor: '#ffaa22', effect: 'invincible1s', bossSource: 'Caloric', rarity: 'uncommon', useFunction: 'useWaxSeal' },
  { id: 'candle_ash', name: 'Candle Ash', type: 'healing', description: 'Restores 8 HP immediately.', maxStack: 3, usable: true, allowedInLeaderboard: true, iconShape: 'drop', themeColor: '#ff4422', effect: 'heal8', bossSource: 'Caloric', rarity: 'common', useFunction: 'useHeal8' },
  { id: 'signal_jam', name: 'Signal Jam', type: 'utility', description: 'Scrambles all bullet tracking for 3 seconds — homing bullets lose target.', maxStack: 2, usable: true, allowedInLeaderboard: true, iconShape: 'spark', themeColor: '#ff44ff', effect: 'jamTracking3s', bossSource: 'Zylvira', rarity: 'rare', useFunction: 'useSignalJam' },
  { id: 'vhs_loop', name: 'VHS Loop', type: 'utility', description: 'Teleports you back to your position from 2 seconds ago.', maxStack: 1, usable: true, allowedInLeaderboard: true, iconShape: 'tape', themeColor: '#aaffaa', effect: 'rewindPosition2s', bossSource: 'Zylvira', rarity: 'rare', useFunction: 'useVHSLoop' },
  { id: 'crater_core', name: 'Crater Core', type: 'defense', description: 'Absorbs one large bullet (radius ≥ 12) completely.', maxStack: 2, usable: false, allowedInLeaderboard: true, iconShape: 'rock', themeColor: '#cc8833', effect: 'absorbLargeBullet', bossSource: 'Atlas Minor', rarity: 'uncommon', useFunction: 'useCraterCore' },
  { id: 'asteroid_belt', name: 'Asteroid Belt', type: 'defense', description: 'Spawns 5 tiny orbiting shields for 2 seconds.', maxStack: 2, usable: true, allowedInLeaderboard: true, iconShape: 'ring', themeColor: '#ff6644', effect: 'orbitShield5x2s', bossSource: 'Atlas Minor', rarity: 'uncommon', useFunction: 'useAsteroidBelt' },
  { id: 'paper_crane', name: 'Paper Crane', type: 'defense', description: 'Unfolds into a shield, absorbing all damage for 1 second.', maxStack: 1, usable: true, allowedInLeaderboard: true, iconShape: 'bird', themeColor: '#ffffff', effect: 'invincible1s', bossSource: 'Xiu', rarity: 'rare', useFunction: 'usePaperCrane' },
  { id: 'ink_blot', name: 'Ink Blot', type: 'utility', description: 'Cancels the current danger zone decree instantly.', maxStack: 2, usable: true, allowedInLeaderboard: true, iconShape: 'drop', themeColor: '#cc2222', effect: 'clearDangerZones', bossSource: 'Xiu', rarity: 'uncommon', useFunction: 'useInkBlot' },
  { id: 'memory_stone', name: 'Memory Stone', type: 'checkpoint', description: 'Stores your current HP as a checkpoint. On next death, restore to that value instead.', maxStack: 1, usable: true, allowedInLeaderboard: false, iconShape: 'gem', themeColor: '#44ccff', effect: 'hpCheckpoint', bossSource: 'Mnemovex', rarity: 'legendary', useFunction: 'useMemoryStone' },
  { id: 'echo_key', name: 'Echo Key', type: 'utility', description: 'Skips the warn phase of the next vault lock — lasers fire instantly.', maxStack: 2, usable: true, allowedInLeaderboard: true, iconShape: 'key', themeColor: '#ccaaff', effect: 'skipVaultWarn', bossSource: 'Mnemovex', rarity: 'uncommon', useFunction: 'useEchoKey' },
  { id: 'moonthread', name: 'Moonthread', type: 'utility', description: 'Severs puppet strings — disables forced movement for 3 seconds.', maxStack: 2, usable: true, allowedInLeaderboard: true, iconShape: 'thread', themeColor: '#cc2244', effect: 'disablePull3s', bossSource: 'Lunara', rarity: 'uncommon', useFunction: 'useMoonthread' },
  { id: 'blood_vial', name: 'Blood Vial', type: 'healing', description: 'Heals 12 HP — more than candle ash but rarer.', maxStack: 2, usable: true, allowedInLeaderboard: true, iconShape: 'vial', themeColor: '#ffccaa', effect: 'heal12', bossSource: 'Lunara', rarity: 'rare', useFunction: 'useHeal12' },
  { id: 'soul_echo', name: 'Soul Echo', type: 'utility', description: 'Your next dodge movement is duplicated to a mirror position simultaneously.', maxStack: 1, usable: true, allowedInLeaderboard: true, iconShape: 'ghost', themeColor: '#ffffff', effect: 'mirrorDodge', bossSource: 'Soulvex', rarity: 'legendary', useFunction: 'useSoulEcho' },
  { id: 'first_light', name: 'First Light', type: 'defense', description: 'Negates the next hit you take — once per run.', maxStack: 1, usable: false, allowedInLeaderboard: true, iconShape: 'star', themeColor: '#ff4444', effect: 'negateOneHit', bossSource: 'Soulvex', rarity: 'legendary', useFunction: 'useFirstLight' },
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

  hitsThisWave: number;
  waveStartHp: number;
  atkFinishTimer: number;
  phaseOnTimerZero: number;
  waveEndHp: number;
  waveEndHits: number;
  waveEndBossIdx: number;
  waveEndWaveIdx: number;

  speedBoostTimer: number;
  waveEndIsBossWin: boolean;

  shakeX: number; shakeY: number; shakeTimer: number;
  keys: Set<string>;
  nextId: number;

  diffMult: number;
  adminInvincible: boolean;
  debugSpeedMult: number;
  runScore: number;
  wavesCleared: number;
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
    hitsThisWave: 0, waveStartHp: P_MAX_HP, atkFinishTimer: -1, phaseOnTimerZero: -1,
    waveEndHp: 0, waveEndHits: 0, waveEndBossIdx: 0, waveEndWaveIdx: 0,
    speedBoostTimer: 0, waveEndIsBossWin: false,
    laserSnapshot: [],
    shakeX: 0, shakeY: 0, shakeTimer: 0,
    keys: new Set(), nextId: 1,
    diffMult: 1.25,
    adminInvincible: false, debugSpeedMult: 1,
    runScore: 0, wavesCleared: 0,
  };
}

function resetForBoss(g: GameData, idx: number) {
  g.player = { x: BCX, y: BCY, hp: P_MAX_HP, invTimer: 0, flicker: false };
  g.bossIdx = idx;
  g.atkIdx = 0;
  g.atkTimer = BOSSES[idx].atkDur;
  g.atkFinishTimer = -1;
  g.phase = 0; g.phaseTimer = 0; g.spawnTimer = 0; g.spawnCount = 0;
  g.bossAngle = 0;
  g.hitsThisWave = 0; g.waveStartHp = P_MAX_HP;
  g.runScore = 0; g.wavesCleared = 0;
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
  g.prevPlayerPositions = []; g.prevPosTimer = 0;
  g.speedBoostTimer = 0;
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

  // Bosses 11–20
  if (atk === 'sporeBloom')        { doSporeBloom(g, dt, boss);          return; }
  if (atk === 'velvetSwarm')       { doVelvetSwarm(g, dt, boss);         return; }
  if (atk === 'mothEclipse')       { doMothEclipse(g, dt, boss);         return; }
  if (atk === 'plagueGarden')      { doPlagueGarden(g, dt, boss);        return; }
  if (atk === 'feverRings')        { doFeverRings(g, dt, boss);          return; }
  if (atk === 'plagueCrown')       { doPlagueCrown(g, dt, boss);         return; }

  if (atk === 'soundBars')         { doSoundBars(g, dt, boss);           return; }
  if (atk === 'choirSplit')        { doChoirSplit(g, dt, boss);          return; }
  if (atk === 'crescendoCrush')    { doCrescendoCrush(g, dt, boss);      return; }
  if (atk === 'silentBeat')        { doSilentBeat(g, dt, boss);          return; }
  if (atk === 'doubleTempo')       { doDoubleTempo(g, dt, boss);         return; }

  if (atk === 'gravityPull')       { doGravityPull(g, dt, boss);         return; }
  if (atk === 'orbitBreak')        { doOrbitBreak(g, dt, boss);          return; }
  if (atk === 'collapseRing')      { doCollapseRing(g, dt, boss);        return; }
  if (atk === 'centerCrush')       { doCenterCrush(g, dt, boss);         return; }

  if (atk === 'waxDrip')           { doWaxDrip(g, dt, boss);             return; }
  if (atk === 'funeralMarch')      { doFuneralMarch(g, dt, boss);        return; }
  if (atk === 'candleTears')       { doCandleTears(g, dt, boss);         return; }
  if (atk === 'lastEmber')         { doLastEmber(g, dt, boss);           return; }
  if (atk === 'waxFlood')          { doWaxFlood(g, dt, boss);            return; }

  if (atk === 'webGrid')           { doWebGrid(g, dt, boss);             return; }
  if (atk === 'signalBite')        { doSignalBite(g, dt, boss);          return; }
  if (atk === 'screenTear')        { doScreenTear(g, dt, boss);          return; }
  if (atk === 'staticNest')        { doStaticNest(g, dt, boss);          return; }
  if (atk === 'vhsStorm')          { doVHSStorm(g, dt, boss);            return; }

  if (atk === 'meteorLesson')      { doMeteorLesson(g, dt, boss);        return; }
  if (atk === 'planetTilt')        { doPlanetTilt(g, dt, boss);          return; }
  if (atk === 'craterBurst')       { doCraterBurst(g, dt, boss);         return; }
  if (atk === 'tinyApocalypse')    { doTinyApocalypse(g, dt, boss);      return; }

  if (atk === 'paperCuts')         { doPaperCuts(g, dt, boss);           return; }
  if (atk === 'foldedWalls')       { doFoldedWalls(g, dt, boss);         return; }
  if (atk === 'inkDecree')         { doInkDecree(g, dt, boss);           return; }
  if (atk === 'royalGuillotine')   { doRoyalGuillotine(g, dt, boss);     return; }
  if (atk === 'origamiSpears')     { doOrigamiSpears(g, dt, boss);       return; }

  if (atk === 'echoTrail')         { doEchoTrail(g, dt, boss);           return; }
  if (atk === 'memoryReplay')      { doMemoryReplay(g, dt, boss);        return; }
  if (atk === 'vaultLock')         { doVaultLock(g, dt, boss);           return; }
  if (atk === 'crystalRepeat')     { doCrystalRepeat(g, dt, boss);       return; }

  if (atk === 'stringPull')        { doStringPull(g, dt, boss);          return; }
  if (atk === 'puppetDance')       { doPuppetDance(g, dt, boss);         return; }
  if (atk === 'moonDrop')          { doMoonDrop(g, dt, boss);            return; }
  if (atk === 'bloodCurtain')      { doBloodCurtain(g, dt, boss);        return; }
  if (atk === 'moonShatter')       { doMoonShatter(g, dt, boss);         return; }

  if (atk === 'regretSpiral')      { doRegretSpiral(g, dt, boss);        return; }
  if (atk === 'bossMemoryChain')   { doBossMemoryChain(g, dt, boss);     return; }
  if (atk === 'brokenControls')    { doBrokenControls(g, dt, boss);      return; }
  if (atk === 'soulDuel')          { doSoulDuel(g, dt, boss);            return; }
  if (atk === 'firstMistake')      { doFirstMistake(g, dt, boss);        return; }
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
      g.spawnCount = isH ? 1 : 0; // encode sweep axis so reverse pass reuses the SAME axis
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
    // Brief pause then reverse sweep — SAME axis as forward pass (stored in spawnCount)
    g.phaseTimer += dt;
    if (g.phaseTimer >= 0.35) {
      const revType: 'h' | 'v' = g.spawnCount === 1 ? 'h' : 'v';
      const startPos = revType === 'h' ? BY + BH : BX + BW;
      g.laserWarns.push({ id: nid(g), type: revType, pos: startPos, width: 60, timer: 0.8, color: boss.color2, fake: false });
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
        // Variant: spawn TWO child bullets at ±15° from perpendicular
        if (variant > 0) {
          const spd2 = Math.hypot(b.vx, b.vy) * 0.7;
          const baseA = Math.atan2(b.vy, b.vx) + Math.PI / 2;
          newBullets.push({ id: nid(g), x: b.x, y: b.y, vx: Math.cos(baseA + 0.26) * spd2, vy: Math.sin(baseA + 0.26) * spd2, r: 5, color: boss.color2, shape: 'diamond', rot: 0, rotSpd: rand(-3, 3), frozen: false });
          newBullets.push({ id: nid(g), x: b.x, y: b.y, vx: Math.cos(baseA - 0.26) * spd2, vy: Math.sin(baseA - 0.26) * spd2, r: 5, color: boss.color2, shape: 'diamond', rot: 0, rotSpd: rand(-3, 3), frozen: false });
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
      g.spawnCount = isH ? 1 : 0; // encode sweep axis so reverse pass reuses it
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
    // Brief pause then add reverse warn — SAME axis as forward pass
    g.phaseTimer += dt;
    if (g.phaseTimer >= 0.4) {
      const revType: 'h' | 'v' = g.spawnCount === 1 ? 'h' : 'v';
      const revPos = revType === 'h' ? BY + BH : BX + BW;
      g.laserWarns.push({ id: nid(g), type: revType, pos: revPos, width: 56, timer: 0.7, color: boss.color2, fake: false });
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

// Two bone walls close inward from left and right. Gap is a random width centered at a random X.
function doRibCage(g: GameData, dt: number, boss: BossConf) {
  const wallWidth = 60;
  const gapHalf = 40; // 80px gap
  const wallHalf = wallWidth / 2;

  if (g.phase === 0) {
    if (g.laserWarns.length === 0) {
      // Random gap center — store as integer in spawnCount so phase 1 uses the same value
      const gapCenter = rand(BX + BW * 0.3, BX + BW * 0.7);
      g.spawnCount = Math.round(gapCenter);
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
    // Move walls inward toward the randomly chosen gap center
    const gapCenter = g.spawnCount;
    const stopLeft  = gapCenter - gapHalf - wallHalf;
    const stopRight = gapCenter + gapHalf + wallHalf;
    const crushSpeed = (stopLeft - BX) / 1.8;
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
// Phase 0 stores REAL bullet x-positions in starPoints so warn markers telegraph actual danger.
function doStarfall(g: GameData, dt: number, boss: BossConf) {
  if (g.phase === 0) {
    if (g.warnMarkers.length === 0) {
      const total = randInt(12, 16);
      const fakeCount = randInt(3, 4);
      // Shuffle: first fakeCount indices are fakes
      const positions: number[] = Array.from({ length: total }, () => rand(BX + 12, BX + BW - 12));
      for (let i = 0; i < total; i++) {
        const isFake = i < fakeCount;
        g.warnMarkers.push({ id: nid(g), x: positions[i], y: BY - 2, angle: Math.PI / 2, r: isFake ? 9 : 5, color: isFake ? boss.color2 : boss.color, timer: 1.2, maxTimer: 1.2 });
        // Store real bullet positions in starPoints so phase 1 can spawn from the SAME spots
        if (!isFake) g.starPoints.push({ id: nid(g), x: positions[i], y: BY - 2 });
      }
    }
    g.phaseTimer += dt;
    if (g.phaseTimer >= 1.2) { g.phase = 1; g.phaseTimer = 0; g.warnMarkers = []; }
  } else if (g.phase === 1) {
    g.spawnTimer -= dt;
    if (g.spawnTimer <= 0) {
      g.spawnTimer = st(0.11, g);
      const spd = sm(g);
      if (g.spawnCount < g.starPoints.length) {
        // First batch: real bullets at the TELEGRAPHED positions
        const pt = g.starPoints[g.spawnCount];
        g.bullets.push({ id: nid(g), x: pt.x, y: BY - 8, vx: rand(-8, 8) * spd, vy: rand(150, 240) * spd, r: 5, color: boss.color, shape: 'diamond', rot: rand(0, Math.PI * 2), rotSpd: rand(-2, 2), frozen: false });
      } else {
        // Subsequent bullets: random mix of real and decoy
        const isFake = Math.random() < 0.25;
        g.bullets.push({ id: nid(g), x: rand(BX + 12, BX + BW - 12), y: BY - 8, vx: rand(-12, 12) * spd, vy: rand(150, 240) * spd, r: isFake ? 8 : 5, color: isFake ? boss.color2 + '44' : boss.color, shape: 'diamond', rot: rand(0, Math.PI * 2), rotSpd: rand(-2, 2), frozen: isFake });
      }
      g.spawnCount++;
    }
    moveBullets(g, dt);
    g.bullets = g.bullets.filter(b => b.y < BY + BH + 20 && b.x > BX - 20 && b.x < BX + BW + 20);
    g.phaseTimer += dt;
    if (g.phaseTimer >= 3.5) { g.phase = 2; g.phaseTimer = 0; g.bullets = []; g.starPoints = []; }
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

// Piston blocks slam from left+right or top+bottom. Gap size scales with difficulty.
// Configuration stored: spawnCount=horizontal(1/0), engineSpinAngle=gapSize
function doPistonCrush(g: GameData, dt: number, boss: BossConf) {
  if (g.phase === 0) {
    if (g.pistonBlocks.length === 0) {
      const horizontal = Math.random() > 0.5;
      const gapSize = Math.max(60, 120 - (g.diffMult - 1) * 40); // harder = tighter gap
      g.spawnCount = horizontal ? 1 : 0;
      g.engineSpinAngle = gapSize; // repurposed as storage between phases
      if (horizontal) {
        g.pistonBlocks.push({ id: nid(g), x: BX, y: BY - 120, w: BW, h: 120, vx: 0, vy: 180, warnTimer: 1.1, active: false });
        g.pistonBlocks.push({ id: nid(g), x: BX, y: BY + BH, w: BW, h: 120, vx: 0, vy: -180, warnTimer: 1.1, active: false });
      } else {
        g.pistonBlocks.push({ id: nid(g), x: BX - 160, y: BY, w: 160, h: BH, vx: 200, vy: 0, warnTimer: 1.1, active: false });
        g.pistonBlocks.push({ id: nid(g), x: BX + BW, y: BY, w: 160, h: BH, vx: -200, vy: 0, warnTimer: 1.1, active: false });
      }
      g.arenaShrunken = false;
    }
    for (const pb of g.pistonBlocks) pb.warnTimer -= dt;
    g.phaseTimer += dt;
    if (g.phaseTimer >= 1.1) {
      for (const pb of g.pistonBlocks) { pb.active = true; pb.warnTimer = 0; }
      g.arenaShrunken = true;
      g.phase = 1; g.phaseTimer = 0; shake(g);
    }
  } else if (g.phase === 1) {
    const gapSz = g.engineSpinAngle; // stored in phase 0
    for (const pb of g.pistonBlocks) {
      pb.x += pb.vx * dt;
      pb.y += pb.vy * dt;
      // Stop when leading edge reaches gap boundary centered at BCX / BCY
      if (pb.vy > 0 && pb.y + pb.h >= BCY - gapSz / 2) { pb.y = BCY - gapSz / 2 - pb.h; pb.vy = 0; }
      if (pb.vy < 0 && pb.y <= BCY + gapSz / 2)         { pb.y = BCY + gapSz / 2;         pb.vy = 0; }
      if (pb.vx > 0 && pb.x + pb.w >= BCX - gapSz / 2)  { pb.x = BCX - gapSz / 2 - pb.w;  pb.vx = 0; }
      if (pb.vx < 0 && pb.x <= BCX + gapSz / 2)         { pb.x = BCX + gapSz / 2;         pb.vx = 0; }
    }
    g.phaseTimer += dt;
    if (g.phaseTimer >= 1.8) { g.phase = 2; g.phaseTimer = 0; }
  } else if (g.phase === 2) {
    for (const pb of g.pistonBlocks) {
      if (pb.vy >= 0 && pb.y > BY - 120)  { pb.vy = -180; }
      if (pb.vy <= 0 && pb.y + pb.h < BY) { pb.vy = -180; }
      if (pb.vx >= 0 && pb.x > BX - 160)  { pb.vx = -200; }
      if (pb.vx <= 0 && pb.x + pb.w < BX) { pb.vx = -200; }
      pb.x += pb.vx * dt;
      pb.y += pb.vy * dt;
    }
    g.phaseTimer += dt;
    if (g.phaseTimer >= 1.0) { g.pistonBlocks = []; g.arenaShrunken = false; g.engineSpinAngle = 0; g.phase = 3; g.phaseTimer = 0; }
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
    // Reset phase/spawn state so the next sub-attack starts clean
    g.phase = 0; g.phaseTimer = 0; g.spawnTimer = 0; g.spawnCount = 0;
  }
}

// ================================================================
// BOSSES 11–20: ATTACK FUNCTIONS
// ================================================================

// Boss 11 — Vyrial
function doSporeBloom(g: GameData, dt: number, boss: BossConf) {
  if (g.phase === 0) {
    if (g.warnMarkers.length === 0)
      for (let i = 0; i < 12; i++) { const a = (i / 12) * Math.PI * 2; g.warnMarkers.push({ id: nid(g), x: BCX + Math.cos(a) * 55, y: BCY + Math.sin(a) * 55, angle: a, r: 6, color: boss.color, timer: 0.9, maxTimer: 0.9 }); }
    g.phaseTimer += dt;
    if (g.phaseTimer >= 0.9) { g.phase = 1; g.phaseTimer = 0; g.warnMarkers = []; shake(g); }
  } else if (g.phase === 1) {
    g.spawnTimer -= dt;
    if (g.spawnTimer <= 0) {
      g.spawnTimer = st(0.08, g); g.spawnCount++;
      const spd = sm(g);
      for (let arm = 0; arm < 8; arm++) { const a = (arm / 8) * Math.PI * 2 + g.spawnCount * 0.14; g.bullets.push({ id: nid(g), x: BCX, y: BCY, vx: Math.cos(a) * 100 * spd, vy: Math.sin(a) * 100 * spd, r: 6, color: boss.color, shape: 'circle', rot: 0, rotSpd: 0, frozen: false }); }
    }
    moveBullets(g, dt); g.bullets = g.bullets.filter(b => b.x > -80 && b.x < W + 80 && b.y > -80 && b.y < H + 80);
    g.phaseTimer += dt; if (g.phaseTimer >= 3.5) { g.phase = 2; g.phaseTimer = 0; g.bullets = []; }
  } else { g.phaseTimer += dt; if (g.phaseTimer >= 0.6) { g.phase = 0; g.phaseTimer = 0; } }
}
function doVelvetSwarm(g: GameData, dt: number, boss: BossConf) {
  if (g.phase === 0) {
    if (g.warnMarkers.length === 0)
      for (let i = 0; i < 6; i++) g.warnMarkers.push({ id: nid(g), x: rand(BX + 20, BX + BW - 20), y: BY - 8, angle: Math.PI / 2, r: 5, color: boss.color2, timer: 0.8, maxTimer: 0.8 });
    g.phaseTimer += dt;
    if (g.phaseTimer >= 0.8) { g.phase = 1; g.phaseTimer = 0; g.warnMarkers = []; }
  } else if (g.phase === 1) {
    g.spawnTimer -= dt;
    if (g.spawnTimer <= 0) {
      g.spawnTimer = st(0.12, g);
      const spd = sm(g) * 0.7; const a = Math.atan2(g.player.y - BY - 30, g.player.x - BCX) + rand(-0.3, 0.3);
      g.bullets.push({ id: nid(g), x: rand(BX + 20, BX + BW - 20), y: BY - 6, vx: Math.cos(a) * 120 * spd, vy: Math.abs(Math.sin(a)) * 120 * spd + 60, r: 5, color: boss.color2, shape: 'circle', rot: 0, rotSpd: 0, frozen: false });
    }
    moveBullets(g, dt); g.bullets = g.bullets.filter(b => b.y < BY + BH + 30);
    g.phaseTimer += dt; if (g.phaseTimer >= 4.0) { g.phase = 2; g.phaseTimer = 0; g.bullets = []; }
  } else { g.phaseTimer += dt; if (g.phaseTimer >= 0.5) { g.phase = 0; g.phaseTimer = 0; } }
}
function doMothEclipse(g: GameData, dt: number, boss: BossConf) {
  if (g.phase === 0) {
    if (g.warnMarkers.length === 0)
      for (let i = 0; i < 20; i++) { const a = (i / 20) * Math.PI * 2; g.warnMarkers.push({ id: nid(g), x: BCX + Math.cos(a) * 180, y: BCY + Math.sin(a) * 180, angle: a, r: 5, color: boss.color, timer: 1.0, maxTimer: 1.0 }); }
    g.phaseTimer += dt;
    if (g.phaseTimer >= 1.0) {
      g.rings.push({ id: nid(g), cx: BCX, cy: BCY, r: 180, speed: -80 * sm(g), thick: 28, gaps: [g.bossAngle], gapSz: 0.45, color: boss.color });
      g.phase = 1; g.phaseTimer = 0; g.warnMarkers = []; shake(g);
    }
  } else if (g.phase === 1) {
    for (const ring of g.rings) { ring.r += ring.speed * dt; ring.gaps[0] += 1.4 * dt; }
    g.rings = g.rings.filter(r => r.r > 20);
    g.phaseTimer += dt; if (g.phaseTimer >= 2.2) { g.rings = []; g.phase = 2; g.phaseTimer = 0; }
  } else { g.phaseTimer += dt; if (g.phaseTimer >= 0.6) { g.phase = 0; g.phaseTimer = 0; } }
}
function doPlagueGarden(g: GameData, dt: number, boss: BossConf) {
  g.spawnTimer -= dt;
  if (g.spawnTimer <= 0 && g.dangerZones.length < 7) {
    g.spawnTimer = rand(0.4, 0.8); const zw = rand(55, 100), zh = rand(45, 85);
    g.dangerZones.push({ id: nid(g), x: rand(BX + 4, BX + BW - zw - 4), y: rand(BY + 4, BY + BH - zh - 4), w: zw, h: zh, warnTimer: 1.0, activeTimer: 1.2, color: boss.color });
  }
  for (const dz of g.dangerZones) { if (dz.warnTimer > 0) dz.warnTimer -= dt; else dz.activeTimer -= dt; }
  g.dangerZones = g.dangerZones.filter(dz => dz.warnTimer > 0 || dz.activeTimer > 0);
}
function doFeverRings(g: GameData, dt: number, boss: BossConf) {
  if (g.phase === 0) {
    if (g.warnMarkers.length === 0)
      for (let i = 0; i < 8; i++) { const a = (i / 8) * Math.PI * 2; g.warnMarkers.push({ id: nid(g), x: BCX + Math.cos(a) * 50, y: BCY + Math.sin(a) * 50, angle: a, r: 4, color: boss.color2, timer: 0.7, maxTimer: 0.7 }); }
    g.phaseTimer += dt;
    if (g.phaseTimer >= 0.7) {
      const spd = sm(g); const gaps = [0, (Math.PI * 2) / 3, (Math.PI * 4) / 3];
      for (let i = 0; i < 3; i++) g.rings.push({ id: nid(g), cx: BCX, cy: BCY, r: 10 + i * 30, speed: (90 + i * 20) * spd, thick: 16, gaps: [...gaps], gapSz: 0.55, color: i === 0 ? boss.color : boss.color2 });
      g.warnMarkers = []; g.phase = 1; g.phaseTimer = 0; shake(g);
    }
  } else if (g.phase === 1) {
    for (const ring of g.rings) { ring.r += ring.speed * dt; ring.gaps = ring.gaps.map(a => a + 1.1 * dt); }
    g.rings = g.rings.filter(r => r.r < 300);
    g.phaseTimer += dt; if (g.phaseTimer >= 3.0) { g.rings = []; g.phase = 2; g.phaseTimer = 0; }
  } else { g.phaseTimer += dt; if (g.phaseTimer >= 0.5) { g.phase = 0; g.phaseTimer = 0; } }
}
function doPlagueCrown(g: GameData, dt: number, boss: BossConf) {
  const corners: [number, number][] = [[BX, BY], [BX + BW, BY], [BX, BY + BH], [BX + BW, BY + BH]];
  if (g.phase === 0) {
    if (g.warnMarkers.length === 0)
      for (const [cx, cy] of corners) for (let i = 0; i < 4; i++) { const a = Math.atan2(BCY - cy, BCX - cx) + rand(-0.4, 0.4); g.warnMarkers.push({ id: nid(g), x: cx + Math.cos(a) * i * 18, y: cy + Math.sin(a) * i * 18, angle: a, r: 5, color: boss.color, timer: 1.1, maxTimer: 1.1 }); }
    g.phaseTimer += dt;
    if (g.phaseTimer >= 1.1) {
      const spd = sm(g);
      for (const [cx, cy] of corners) { const baseA = Math.atan2(BCY - cy, BCX - cx); for (let i = 0; i < 6; i++) { const a = baseA + rand(-0.55, 0.55); g.bullets.push({ id: nid(g), x: cx, y: cy, vx: Math.cos(a) * 150 * spd, vy: Math.sin(a) * 150 * spd, r: 5, color: boss.color, shape: 'circle', rot: 0, rotSpd: 0, frozen: false }); } }
      g.warnMarkers = []; g.phase = 1; g.phaseTimer = 0; shake(g);
    }
  } else if (g.phase === 1) {
    moveBullets(g, dt); g.bullets = g.bullets.filter(b => b.x > -60 && b.x < W + 60 && b.y > -60 && b.y < H + 60);
    g.phaseTimer += dt; if (g.phaseTimer >= 2.5) { g.phase = 2; g.phaseTimer = 0; g.bullets = []; }
  } else { g.phaseTimer += dt; if (g.phaseTimer >= 0.5) { g.phase = 0; g.phaseTimer = 0; } }
}

// Boss 12 — Echora
function doSoundBars(g: GameData, dt: number, boss: BossConf) {
  if (g.phase === 0) {
    if (g.laserWarns.length === 0)
      for (let i = 0; i < 4; i++) g.laserWarns.push({ id: nid(g), type: 'v', pos: BX + BW * (i / 3), width: 38, timer: 0.9, color: boss.color, fake: i % 2 !== 0 });
    for (const lw of g.laserWarns) lw.timer -= dt;
    g.phaseTimer += dt;
    if (g.phaseTimer >= 0.9) {
      for (const lw of g.laserWarns) if (!lw.fake) g.lasers.push({ id: nid(g), type: lw.type, pos: lw.pos, width: 38, timer: 3.5, color: boss.color });
      g.laserWarns = []; g.phase = 1; g.phaseTimer = 0; shake(g);
    }
  } else if (g.phase === 1) {
    for (const l of g.lasers) { l.pos += (l.pos < BCX ? 1 : -1) * 60 * dt; l.timer -= dt; }
    g.lasers = g.lasers.filter(l => l.timer > 0);
    g.phaseTimer += dt; if (g.phaseTimer >= 3.0) { g.lasers = []; g.phase = 2; g.phaseTimer = 0; }
  } else { g.phaseTimer += dt; if (g.phaseTimer >= 0.6) { g.phase = 0; g.phaseTimer = 0; } }
}
function doChoirSplit(g: GameData, dt: number, boss: BossConf) {
  const dirs: [number, number][] = [[-1, -1], [1, -1], [-1, 1], [1, 1]];
  if (g.phase === 0) {
    if (g.warnMarkers.length === 0)
      for (const [dx, dy] of dirs) for (let d = 1; d <= 3; d++) g.warnMarkers.push({ id: nid(g), x: BCX + dx * d * 40, y: BCY + dy * d * 30, angle: Math.atan2(dy, dx), r: 5, color: boss.color, timer: 0.8, maxTimer: 0.8 });
    g.phaseTimer += dt;
    if (g.phaseTimer >= 0.8) {
      const spd = sm(g);
      for (const [dx, dy] of dirs) for (let i = 0; i < 5; i++) { const a = Math.atan2(dy, dx) + rand(-0.4, 0.4); g.bullets.push({ id: nid(g), x: BCX, y: BCY, vx: Math.cos(a) * 160 * spd, vy: Math.sin(a) * 160 * spd, r: 5, color: boss.color2, shape: 'diamond', rot: 0, rotSpd: rand(-2, 2), frozen: false }); }
      g.warnMarkers = []; g.phase = 1; g.phaseTimer = 0; shake(g);
    }
  } else if (g.phase === 1) {
    moveBullets(g, dt); g.bullets = g.bullets.filter(b => b.x > -60 && b.x < W + 60 && b.y > -60 && b.y < H + 60);
    g.phaseTimer += dt; if (g.phaseTimer >= 2.5) { g.phase = 2; g.phaseTimer = 0; g.bullets = []; }
  } else { g.phaseTimer += dt; if (g.phaseTimer >= 0.5) { g.phase = 0; g.phaseTimer = 0; } }
}
function doCrescendoCrush(g: GameData, dt: number, boss: BossConf) {
  if (g.phase === 0) {
    if (g.laserWarns.length === 0) g.laserWarns.push({ id: nid(g), type: 'h', pos: BY, width: 48, timer: 0.8, color: boss.color, fake: false });
    for (const lw of g.laserWarns) lw.timer -= dt;
    g.phaseTimer += dt;
    if (g.phaseTimer >= 0.8) { g.lasers.push({ id: nid(g), type: 'h', pos: BY, width: 48, timer: 8.0, color: boss.color }); g.laserWarns = []; g.phase = 1; g.phaseTimer = 0; shake(g); }
  } else if (g.phase === 1) {
    const sweepSpd = (30 + g.phaseTimer * 80) * sm(g);
    for (const l of g.lasers) { l.pos += sweepSpd * dt; l.timer -= dt; }
    g.lasers = g.lasers.filter(l => l.pos < BY + BH + 60 && l.timer > 0);
    g.phaseTimer += dt; if (g.lasers.length === 0 || g.phaseTimer >= 4.0) { g.lasers = []; g.phase = 2; g.phaseTimer = 0; }
  } else { g.phaseTimer += dt; if (g.phaseTimer >= 0.6) { g.phase = 0; g.phaseTimer = 0; } }
}
function doSilentBeat(g: GameData, dt: number, boss: BossConf) {
  if (g.phase === 0) {
    if (g.warnMarkers.length === 0) g.warnMarkers.push({ id: nid(g), x: BCX, y: BCY, angle: 0, r: 80, color: boss.color, timer: 2.0, maxTimer: 2.0 });
    for (const wm of g.warnMarkers) { wm.timer -= dt; }
    g.phaseTimer += dt;
    if (g.phaseTimer >= 2.0) { g.phase = 1; g.phaseTimer = 0; g.warnMarkers = []; shake(g); shake(g); }
  } else if (g.phase === 1) {
    if (g.spawnCount === 0) {
      g.spawnCount = 1; const spd = sm(g);
      for (let i = 0; i < 24; i++) { const a = (i / 24) * Math.PI * 2; g.bullets.push({ id: nid(g), x: BCX + Math.cos(a) * 10, y: BCY + Math.sin(a) * 10, vx: Math.cos(a) * 200 * spd, vy: Math.sin(a) * 200 * spd, r: 7, color: boss.color, shape: 'circle', rot: 0, rotSpd: 0, frozen: false }); g.bullets.push({ id: nid(g), x: BCX + Math.cos(a + 0.13) * 10, y: BCY + Math.sin(a + 0.13) * 10, vx: Math.cos(a + 0.13) * 130 * spd, vy: Math.sin(a + 0.13) * 130 * spd, r: 5, color: boss.color2, shape: 'diamond', rot: 0, rotSpd: rand(-3, 3), frozen: false }); }
    }
    moveBullets(g, dt); g.bullets = g.bullets.filter(b => b.x > -60 && b.x < W + 60 && b.y > -60 && b.y < H + 60);
    g.phaseTimer += dt; if (g.phaseTimer >= 2.5) { g.phase = 2; g.phaseTimer = 0; g.bullets = []; }
  } else { g.phaseTimer += dt; if (g.phaseTimer >= 0.6) { g.phase = 0; g.phaseTimer = 0; g.spawnCount = 0; } }
}
function doDoubleTempo(g: GameData, dt: number, boss: BossConf) {
  if (g.phase === 0) {
    if (g.laserWarns.length === 0) g.laserWarns.push({ id: nid(g), type: 'h', pos: BY, width: 56, timer: 0.7, color: boss.color, fake: false });
    for (const lw of g.laserWarns) lw.timer -= dt;
    g.phaseTimer += dt;
    if (g.phaseTimer >= 0.7) { g.lasers.push({ id: nid(g), type: 'h', pos: BY, width: 56, timer: 4.0, color: boss.color }); g.laserWarns = []; g.phase = 1; g.phaseTimer = 0; shake(g); }
  } else if (g.phase === 1) {
    const spd = sm(g); for (const l of g.lasers) { l.pos += (BH + 80) / 1.6 * spd * dt; l.timer -= dt; }
    g.lasers = g.lasers.filter(l => l.pos < BY + BH + 50 && l.timer > 0);
    if (g.lasers.length === 0) { g.phase = 2; g.phaseTimer = 0; }
  } else if (g.phase === 2) {
    g.phaseTimer += dt;
    if (g.phaseTimer >= 0.3) { g.laserWarns.push({ id: nid(g), type: 'v', pos: BX, width: 48, timer: 0.5, color: boss.color2, fake: false }); g.phase = 3; g.phaseTimer = 0; }
  } else if (g.phase === 3) {
    for (const lw of g.laserWarns) lw.timer -= dt;
    g.phaseTimer += dt;
    if (g.phaseTimer >= 0.5) { for (const lw of g.laserWarns) g.lasers.push({ id: nid(g), type: lw.type, pos: lw.pos, width: 48, timer: 4.0, color: lw.color }); g.laserWarns = []; g.phase = 4; g.phaseTimer = 0; shake(g); }
  } else if (g.phase === 4) {
    const spd = sm(g); for (const l of g.lasers) { l.pos += (BW + 80) / 1.4 * spd * dt; l.timer -= dt; }
    g.lasers = g.lasers.filter(l => l.pos < BX + BW + 50 && l.timer > 0);
    if (g.lasers.length === 0) { g.phase = 5; g.phaseTimer = 0; }
  } else { g.phaseTimer += dt; if (g.phaseTimer >= 0.5) { g.phase = 0; g.phaseTimer = 0; } }
}

// Boss 13 — Vantus
function doGravityPull(g: GameData, dt: number, boss: BossConf) {
  if (g.phase === 0) {
    if (g.warnMarkers.length === 0)
      for (let i = 0; i < 10; i++) { const a = (i / 10) * Math.PI * 2; g.warnMarkers.push({ id: nid(g), x: BCX + Math.cos(a) * 55, y: BCY + Math.sin(a) * 55, angle: a + Math.PI, r: 5, color: boss.color, timer: 0.8, maxTimer: 0.8 }); }
    g.phaseTimer += dt; if (g.phaseTimer >= 0.8) { g.phase = 1; g.phaseTimer = 0; g.warnMarkers = []; }
  } else if (g.phase === 1) {
    g.spawnTimer -= dt;
    if (g.spawnTimer <= 0) {
      g.spawnTimer = st(0.15, g); const spd = sm(g); const edge = randInt(0, 3);
      let bx = 0, by = 0;
      if (edge === 0) { bx = rand(BX, BX + BW); by = BY; } else if (edge === 1) { bx = rand(BX, BX + BW); by = BY + BH; } else if (edge === 2) { bx = BX; by = rand(BY, BY + BH); } else { bx = BX + BW; by = rand(BY, BY + BH); }
      const a = Math.atan2(BCY - by, BCX - bx) + rand(-0.5, 0.5);
      g.bullets.push({ id: nid(g), x: bx, y: by, vx: Math.cos(a) * 80 * spd, vy: Math.sin(a) * 80 * spd, r: 6, color: boss.color, shape: 'circle', rot: 0, rotSpd: 0, frozen: false });
    }
    for (const b of g.bullets) { const dx = BCX - b.x, dy = BCY - b.y; const dist = Math.hypot(dx, dy); if (dist > 10) { b.vx += dx / dist * 30 * dt; b.vy += dy / dist * 30 * dt; } }
    moveBullets(g, dt); g.bullets = g.bullets.filter(b => b.x > BX - 30 && b.x < BX + BW + 30 && b.y > BY - 30 && b.y < BY + BH + 30);
    g.phaseTimer += dt; if (g.phaseTimer >= 4.0) { g.phase = 2; g.phaseTimer = 0; g.bullets = []; }
  } else { g.phaseTimer += dt; if (g.phaseTimer >= 0.6) { g.phase = 0; g.phaseTimer = 0; } }
}
function doOrbitBreak(g: GameData, dt: number, boss: BossConf) {
  if (g.phase === 0) {
    if (g.warnMarkers.length === 0)
      for (let i = 0; i < 12; i++) { const a = (i / 12) * Math.PI * 2; g.warnMarkers.push({ id: nid(g), x: BCX + Math.cos(a) * 90, y: BCY + Math.sin(a) * 90, angle: a, r: 5, color: boss.color, timer: 0.9, maxTimer: 0.9 }); }
    g.phaseTimer += dt;
    if (g.phaseTimer >= 0.9) { g.rings.push({ id: nid(g), cx: BCX, cy: BCY, r: 90, speed: 0, thick: 20, gaps: [Math.random() * Math.PI * 2], gapSz: 0.7, color: boss.color }); g.warnMarkers = []; g.phase = 1; g.phaseTimer = 0; shake(g); }
  } else if (g.phase === 1) {
    g.phaseTimer += dt;
    if (g.phaseTimer >= 1.5 && g.rings.length > 0) {
      const ring = g.rings[0]; const spd = sm(g);
      for (let i = 0; i < 16; i++) { const a = (i / 16) * Math.PI * 2; g.bullets.push({ id: nid(g), x: ring.cx + Math.cos(a) * ring.r, y: ring.cy + Math.sin(a) * ring.r, vx: Math.cos(a) * 200 * spd, vy: Math.sin(a) * 200 * spd, r: 6, color: boss.color, shape: 'circle', rot: 0, rotSpd: 0, frozen: false }); }
      g.rings = []; shake(g); g.phase = 2; g.phaseTimer = 0;
    }
  } else if (g.phase === 2) {
    moveBullets(g, dt); g.bullets = g.bullets.filter(b => b.x > -60 && b.x < W + 60 && b.y > -60 && b.y < H + 60);
    g.phaseTimer += dt; if (g.phaseTimer >= 2.0) { g.phase = 3; g.phaseTimer = 0; g.bullets = []; }
  } else { g.phaseTimer += dt; if (g.phaseTimer >= 0.5) { g.phase = 0; g.phaseTimer = 0; } }
}
function doCollapseRing(g: GameData, dt: number, boss: BossConf) {
  if (g.phase === 0) {
    if (g.warnMarkers.length === 0)
      for (let i = 0; i < 16; i++) { const a = (i / 16) * Math.PI * 2; g.warnMarkers.push({ id: nid(g), x: BCX + Math.cos(a) * 170, y: BCY + Math.sin(a) * 170, angle: a, r: 4, color: boss.color2, timer: 0.9, maxTimer: 0.9 }); }
    g.phaseTimer += dt;
    if (g.phaseTimer >= 0.9) { g.rings.push({ id: nid(g), cx: BCX, cy: BCY, r: 170, speed: -75 * sm(g), thick: 22, gaps: [Math.random() * Math.PI * 2], gapSz: 0.6, color: boss.color2 }); g.warnMarkers = []; g.phase = 1; g.phaseTimer = 0; shake(g); }
  } else if (g.phase === 1) {
    for (const ring of g.rings) { ring.r += ring.speed * dt; ring.gaps[0] += 0.7 * dt; }
    g.rings = g.rings.filter(r => r.r > 15);
    g.phaseTimer += dt; if (g.phaseTimer >= 2.5 || g.rings.length === 0) { g.rings = []; g.phase = 2; g.phaseTimer = 0; }
  } else { g.phaseTimer += dt; if (g.phaseTimer >= 0.6) { g.phase = 0; g.phaseTimer = 0; } }
}
function doCenterCrush(g: GameData, dt: number, boss: BossConf) {
  if (g.phase === 0) {
    if (g.pistonBlocks.length === 0) {
      const gapSz = Math.max(50, 100 - (g.diffMult - 1) * 30);
      g.engineSpinAngle = gapSz;
      g.pistonBlocks.push({ id: nid(g), x: BX, y: BY - 80, w: BW, h: 80, vx: 0, vy: 160, warnTimer: 1.0, active: false });
      g.pistonBlocks.push({ id: nid(g), x: BX, y: BY + BH, w: BW, h: 80, vx: 0, vy: -160, warnTimer: 1.0, active: false });
      g.pistonBlocks.push({ id: nid(g), x: BX - 100, y: BY, w: 100, h: BH, vx: 170, vy: 0, warnTimer: 1.0, active: false });
      g.pistonBlocks.push({ id: nid(g), x: BX + BW, y: BY, w: 100, h: BH, vx: -170, vy: 0, warnTimer: 1.0, active: false });
      g.arenaShrunken = false;
    }
    for (const pb of g.pistonBlocks) pb.warnTimer -= dt;
    g.phaseTimer += dt;
    if (g.phaseTimer >= 1.0) { for (const pb of g.pistonBlocks) { pb.active = true; pb.warnTimer = 0; } g.arenaShrunken = true; g.phase = 1; g.phaseTimer = 0; shake(g); }
  } else if (g.phase === 1) {
    const gap = g.engineSpinAngle;
    for (const pb of g.pistonBlocks) {
      pb.x += pb.vx * dt; pb.y += pb.vy * dt;
      if (pb.vy > 0 && pb.y + pb.h >= BCY - gap / 2) { pb.y = BCY - gap / 2 - pb.h; pb.vy = 0; }
      if (pb.vy < 0 && pb.y <= BCY + gap / 2)         { pb.y = BCY + gap / 2;         pb.vy = 0; }
      if (pb.vx > 0 && pb.x + pb.w >= BCX - gap / 2)  { pb.x = BCX - gap / 2 - pb.w;  pb.vx = 0; }
      if (pb.vx < 0 && pb.x <= BCX + gap / 2)         { pb.x = BCX + gap / 2;         pb.vx = 0; }
    }
    g.phaseTimer += dt; if (g.phaseTimer >= 1.5) { g.phase = 2; g.phaseTimer = 0; }
  } else if (g.phase === 2) {
    for (const pb of g.pistonBlocks) {
      if (pb.vy === 0 && pb.y + pb.h > BCY) pb.vy = -160;
      if (pb.vy === 0 && pb.y < BCY)        pb.vy = -160;
      if (pb.vx === 0 && pb.x + pb.w > BCX) pb.vx = -170;
      if (pb.vx === 0 && pb.x < BCX)        pb.vx = -170;
      pb.x += pb.vx * dt; pb.y += pb.vy * dt;
    }
    g.phaseTimer += dt;
    if (g.phaseTimer >= 1.0) { g.pistonBlocks = []; g.arenaShrunken = false; g.engineSpinAngle = 0; g.phase = 3; g.phaseTimer = 0; }
  } else { g.phaseTimer += dt; if (g.phaseTimer >= 0.7) { g.phase = 0; g.phaseTimer = 0; } }
}

// Boss 14 — Caloric
function doWaxDrip(g: GameData, dt: number, boss: BossConf) {
  g.spawnTimer -= dt;
  if (g.spawnTimer <= 0) {
    g.spawnTimer = st(0.13, g); const spd = sm(g); const x = rand(BX + 10, BX + BW - 10);
    const drift = Math.sin(g.time * 3.0 + x * 0.05) * 25;
    g.bullets.push({ id: nid(g), x, y: BY - 6, vx: drift * spd, vy: rand(120, 200) * spd, r: 5, color: boss.color, shape: 'circle', rot: 0, rotSpd: 0, frozen: false });
  }
  moveBullets(g, dt); g.bullets = g.bullets.filter(b => b.y < BY + BH + 20);
}
function doFuneralMarch(g: GameData, dt: number, boss: BossConf) {
  if (g.phase === 0) {
    if (g.warnMarkers.length === 0)
      for (let i = 0; i < 8; i++) g.warnMarkers.push({ id: nid(g), x: BX + BW * (i / 7), y: BY + 12, angle: Math.PI / 2, r: 6, color: boss.color, timer: 1.0, maxTimer: 1.0 });
    g.phaseTimer += dt; if (g.phaseTimer >= 1.0) { g.phase = 1; g.phaseTimer = 0; g.warnMarkers = []; }
  } else if (g.phase === 1) {
    g.spawnTimer -= dt;
    if (g.spawnTimer <= 0 && g.spawnCount < 8) {
      g.spawnTimer = st(0.25, g); const spd = sm(g) * 0.55;
      for (let i = 0; i < 8; i++) g.bullets.push({ id: nid(g), x: BX + BW * (i / 7), y: BY - 5, vx: 0, vy: 80 * spd, r: 7, color: boss.color, shape: 'circle', rot: 0, rotSpd: 0, frozen: false });
      g.spawnCount++;
    }
    moveBullets(g, dt); g.bullets = g.bullets.filter(b => b.y < BY + BH + 30);
    g.phaseTimer += dt; if (g.phaseTimer >= 4.5) { g.phase = 2; g.phaseTimer = 0; g.bullets = []; }
  } else { g.phaseTimer += dt; if (g.phaseTimer >= 0.6) { g.phase = 0; g.phaseTimer = 0; g.spawnCount = 0; } }
}
function doCandleTears(g: GameData, dt: number, boss: BossConf) {
  if (g.phase === 0) {
    if (g.warnMarkers.length === 0)
      for (let i = 0; i < 5; i++) g.warnMarkers.push({ id: nid(g), x: BX + BW * (i / 4), y: BY - 4, angle: Math.PI * 0.6 + i * 0.08, r: 5, color: boss.color2, timer: 0.8, maxTimer: 0.8 });
    g.phaseTimer += dt; if (g.phaseTimer >= 0.8) { g.phase = 1; g.phaseTimer = 0; g.warnMarkers = []; }
  } else if (g.phase === 1) {
    g.spawnTimer -= dt;
    if (g.spawnTimer <= 0) {
      g.spawnTimer = st(0.09, g); g.spawnCount++; const spd = sm(g);
      for (let i = 0; i < 5; i++) { const arc = Math.sin(g.spawnCount * 0.18 + i * 0.6) * 0.5; const a = Math.PI / 2 + arc; g.bullets.push({ id: nid(g), x: BX + BW * (i / 4), y: BY - 4, vx: Math.cos(a) * 140 * spd, vy: Math.sin(a) * 140 * spd, r: 5, color: boss.color2, shape: 'circle', rot: 0, rotSpd: 0, frozen: false }); }
    }
    moveBullets(g, dt); g.bullets = g.bullets.filter(b => b.y < BY + BH + 30 && b.x > BX - 40 && b.x < BX + BW + 40);
    g.phaseTimer += dt; if (g.phaseTimer >= 3.5) { g.phase = 2; g.phaseTimer = 0; g.bullets = []; }
  } else { g.phaseTimer += dt; if (g.phaseTimer >= 0.6) { g.phase = 0; g.phaseTimer = 0; g.spawnCount = 0; } }
}
function doLastEmber(g: GameData, dt: number, boss: BossConf) {
  if (g.phase === 0) {
    if (g.warnMarkers.length === 0) g.warnMarkers.push({ id: nid(g), x: BCX, y: BCY, angle: 0, r: 100, color: boss.color, timer: 2.5, maxTimer: 2.5 });
    for (const wm of g.warnMarkers) { wm.timer -= dt; wm.r = 100 * (wm.timer / wm.maxTimer); }
    g.phaseTimer += dt; if (g.phaseTimer >= 2.5) { g.phase = 1; g.phaseTimer = 0; g.warnMarkers = []; shake(g); shake(g); }
  } else if (g.phase === 1) {
    if (g.spawnCount === 0) {
      g.spawnCount = 1; const spd = sm(g);
      for (let i = 0; i < 32; i++) { const a = (i / 32) * Math.PI * 2; g.bullets.push({ id: nid(g), x: BCX, y: BCY, vx: Math.cos(a) * 175 * spd, vy: Math.sin(a) * 175 * spd, r: 7, color: boss.color, shape: 'circle', rot: 0, rotSpd: 0, frozen: false }); if (i % 4 === 0) g.bullets.push({ id: nid(g), x: BCX, y: BCY, vx: Math.cos(a + 0.1) * 100 * spd, vy: Math.sin(a + 0.1) * 100 * spd, r: 5, color: boss.color2, shape: 'diamond', rot: 0, rotSpd: rand(-3, 3), frozen: false }); }
    }
    moveBullets(g, dt); g.bullets = g.bullets.filter(b => b.x > -60 && b.x < W + 60 && b.y > -60 && b.y < H + 60);
    g.phaseTimer += dt; if (g.phaseTimer >= 2.5) { g.phase = 2; g.phaseTimer = 0; g.bullets = []; }
  } else { g.phaseTimer += dt; if (g.phaseTimer >= 0.6) { g.phase = 0; g.phaseTimer = 0; g.spawnCount = 0; } }
}
function doWaxFlood(g: GameData, dt: number, boss: BossConf) {
  g.spawnTimer -= dt;
  if (g.spawnTimer <= 0 && g.dangerZones.length < 8) {
    g.spawnTimer = rand(0.3, 0.6); const zw = rand(60, 120);
    g.dangerZones.push({ id: nid(g), x: rand(BX + 4, BX + BW - zw - 4), y: BY + 4, w: zw, h: rand(40, 70), warnTimer: 0.7, activeTimer: 1.0, color: boss.color });
  }
  for (const dz of g.dangerZones) { if (dz.warnTimer > 0) dz.warnTimer -= dt; else dz.activeTimer -= dt; }
  g.dangerZones = g.dangerZones.filter(dz => dz.warnTimer > 0 || dz.activeTimer > 0);
}

// Boss 15 — Zylvira
function doWebGrid(g: GameData, dt: number, boss: BossConf) {
  if (g.phase === 0) {
    if (g.laserWarns.length === 0) {
      const count = 2 + waveVariant(g);
      for (let i = 0; i < count; i++) { g.laserWarns.push({ id: nid(g), type: 'h', pos: BY + BH * (i / count + 0.5 / count), width: 30, timer: 0.9, color: boss.color, fake: false }); g.laserWarns.push({ id: nid(g), type: 'v', pos: BX + BW * (i / count + 0.5 / count), width: 30, timer: 0.9, color: boss.color2, fake: false }); }
    }
    for (const lw of g.laserWarns) lw.timer -= dt;
    g.phaseTimer += dt;
    if (g.phaseTimer >= 0.9) { for (const lw of g.laserWarns) g.lasers.push({ id: nid(g), type: lw.type, pos: lw.pos, width: 30, timer: 2.5, color: lw.color }); g.laserWarns = []; g.phase = 1; g.phaseTimer = 0; shake(g); }
  } else if (g.phase === 1) {
    for (const l of g.lasers) l.timer -= dt; g.lasers = g.lasers.filter(l => l.timer > 0);
    g.phaseTimer += dt; if (g.phaseTimer >= 2.5) { g.lasers = []; g.phase = 2; g.phaseTimer = 0; }
  } else { g.phaseTimer += dt; if (g.phaseTimer >= 0.5) { g.phase = 0; g.phaseTimer = 0; } }
}
function doSignalBite(g: GameData, dt: number, boss: BossConf) {
  if (g.phase === 0) {
    if (g.warnMarkers.length === 0)
      for (let i = 0; i < 5; i++) g.warnMarkers.push({ id: nid(g), x: g.player.x, y: g.player.y, angle: Math.PI * 2 * i / 5, r: 5 + i * 3, color: boss.color, timer: 0.8, maxTimer: 0.8 });
    g.phaseTimer += dt; if (g.phaseTimer >= 0.8) { g.phase = 1; g.phaseTimer = 0; g.warnMarkers = []; }
  } else if (g.phase === 1) {
    g.spawnTimer -= dt;
    if (g.spawnTimer <= 0 && g.spawnCount < 6) {
      g.spawnTimer = st(0.3, g); g.spawnCount++; const spd = sm(g); const tx = g.player.x, ty = g.player.y;
      for (let i = 0; i < 5; i++) { const a = Math.atan2(ty - BCY + Math.sin(i * 1.2) * 40, tx - BCX + Math.cos(i * 1.2) * 40); g.bullets.push({ id: nid(g), x: BCX, y: BY - 20, vx: Math.cos(a) * 150 * spd, vy: Math.sin(a) * 150 * spd, r: 5, color: boss.color, shape: 'circle', rot: 0, rotSpd: 0, frozen: false }); }
    }
    moveBullets(g, dt); g.bullets = g.bullets.filter(b => b.x > -60 && b.x < W + 60 && b.y > -60 && b.y < H + 60);
    g.phaseTimer += dt; if (g.phaseTimer >= 3.0) { g.phase = 2; g.phaseTimer = 0; g.bullets = []; }
  } else { g.phaseTimer += dt; if (g.phaseTimer >= 0.5) { g.phase = 0; g.phaseTimer = 0; g.spawnCount = 0; } }
}
function doScreenTear(g: GameData, dt: number, boss: BossConf) {
  if (g.phase === 0) {
    if (g.laserWarns.length === 0) { const y = rand(BY + BH * 0.2, BY + BH * 0.8); g.spawnCount = Math.round(y); g.laserWarns.push({ id: nid(g), type: 'h', pos: y, width: 50, timer: 0.6, color: boss.color, fake: false }); }
    for (const lw of g.laserWarns) lw.timer -= dt;
    g.phaseTimer += dt;
    if (g.phaseTimer >= 0.6) { for (const lw of g.laserWarns) g.lasers.push({ id: nid(g), type: lw.type, pos: lw.pos, width: 50, timer: 0.5, color: boss.color }); g.laserWarns = []; g.phase = 1; g.phaseTimer = 0; shake(g); }
  } else if (g.phase === 1) {
    for (const l of g.lasers) l.timer -= dt; g.lasers = g.lasers.filter(l => l.timer > 0);
    if (g.lasers.length === 0) { g.phase = 2; g.phaseTimer = 0; }
  } else if (g.phase === 2) {
    g.phaseTimer += dt;
    if (g.phaseTimer >= 0.3) { g.laserWarns.push({ id: nid(g), type: 'h', pos: rand(BY + BH * 0.2, BY + BH * 0.8), width: 50, timer: 0.5, color: boss.color2, fake: false }); g.phase = 3; g.phaseTimer = 0; }
  } else if (g.phase === 3) {
    for (const lw of g.laserWarns) lw.timer -= dt;
    g.phaseTimer += dt;
    if (g.phaseTimer >= 0.5) { for (const lw of g.laserWarns) g.lasers.push({ id: nid(g), type: lw.type, pos: lw.pos, width: 50, timer: 0.5, color: boss.color2 }); g.laserWarns = []; g.phase = 4; g.phaseTimer = 0; shake(g); }
  } else if (g.phase === 4) {
    for (const l of g.lasers) l.timer -= dt; g.lasers = g.lasers.filter(l => l.timer > 0);
    if (g.lasers.length === 0) { g.phase = 5; g.phaseTimer = 0; }
  } else { g.phaseTimer += dt; if (g.phaseTimer >= 0.5) { g.phase = 0; g.phaseTimer = 0; } }
}
function doStaticNest(g: GameData, dt: number, boss: BossConf) {
  const corners: [number, number][] = [[BX + 8, BY + 8], [BX + BW - 8, BY + 8], [BX + 8, BY + BH - 8], [BX + BW - 8, BY + BH - 8]];
  if (g.phase === 0) {
    if (g.warnMarkers.length === 0)
      for (const [cx, cy] of corners) g.warnMarkers.push({ id: nid(g), x: cx, y: cy, angle: Math.atan2(BCY - cy, BCX - cx), r: 12, color: boss.color, timer: 0.9, maxTimer: 0.9 });
    g.phaseTimer += dt;
    if (g.phaseTimer >= 0.9) {
      const spd = sm(g);
      for (const [cx, cy] of corners) { const baseA = Math.atan2(BCY - cy, BCX - cx); for (let i = 0; i < 8; i++) { const a = baseA + rand(-0.8, 0.8); g.bullets.push({ id: nid(g), x: cx, y: cy, vx: Math.cos(a) * 160 * spd, vy: Math.sin(a) * 160 * spd, r: 5, color: boss.color2, shape: 'circle', rot: 0, rotSpd: 0, frozen: false }); } }
      g.warnMarkers = []; g.phase = 1; g.phaseTimer = 0; shake(g);
    }
  } else if (g.phase === 1) {
    moveBullets(g, dt); g.bullets = g.bullets.filter(b => b.x > -60 && b.x < W + 60 && b.y > -60 && b.y < H + 60);
    g.phaseTimer += dt; if (g.phaseTimer >= 2.5) { g.phase = 2; g.phaseTimer = 0; g.bullets = []; }
  } else { g.phaseTimer += dt; if (g.phaseTimer >= 0.5) { g.phase = 0; g.phaseTimer = 0; } }
}
function doVHSStorm(g: GameData, dt: number, boss: BossConf) {
  if (g.phase === 0) {
    if (g.warnMarkers.length === 0) {
      for (let i = 0; i < 18; i++) { const t = i / 18; const pos = t < 0.25 ? { x: BX + BW * (t / 0.25), y: BY } : t < 0.5 ? { x: BX + BW, y: BY + BH * ((t - 0.25) / 0.25) } : t < 0.75 ? { x: BX + BW * (1 - (t - 0.5) / 0.25), y: BY + BH } : { x: BX, y: BY + BH * (1 - (t - 0.75) / 0.25) }; g.warnMarkers.push({ id: nid(g), x: pos.x, y: pos.y, angle: Math.atan2(BCY - pos.y, BCX - pos.x), r: 4, color: boss.color, timer: 0.7, maxTimer: 0.7 }); }
    }
    g.phaseTimer += dt; if (g.phaseTimer >= 0.7) { g.phase = 1; g.phaseTimer = 0; g.warnMarkers = []; shake(g); }
  } else if (g.phase === 1) {
    g.spawnTimer -= dt;
    if (g.spawnTimer <= 0) {
      g.spawnTimer = st(0.07, g); const spd = sm(g); const edge = randInt(0, 3); let bx = 0, by = 0;
      if (edge === 0) { bx = rand(BX, BX + BW); by = BY; } else if (edge === 1) { bx = rand(BX, BX + BW); by = BY + BH; } else if (edge === 2) { bx = BX; by = rand(BY, BY + BH); } else { bx = BX + BW; by = rand(BY, BY + BH); }
      const a = Math.atan2(BCY - by, BCX - bx) + rand(-0.7, 0.7);
      g.bullets.push({ id: nid(g), x: bx, y: by, vx: Math.cos(a) * 160 * spd, vy: Math.sin(a) * 160 * spd, r: 4, color: Math.random() > 0.5 ? boss.color : boss.color2, shape: 'circle', rot: 0, rotSpd: 0, frozen: false });
    }
    moveBullets(g, dt); g.bullets = g.bullets.filter(b => b.x > BX - 30 && b.x < BX + BW + 30 && b.y > BY - 30 && b.y < BY + BH + 30);
    g.phaseTimer += dt; if (g.phaseTimer >= 3.5) { g.phase = 2; g.phaseTimer = 0; g.bullets = []; }
  } else { g.phaseTimer += dt; if (g.phaseTimer >= 0.5) { g.phase = 0; g.phaseTimer = 0; } }
}

// Boss 16 — Atlas Minor
function doMeteorLesson(g: GameData, dt: number, boss: BossConf) {
  if (g.phase === 0) {
    if (g.warnMarkers.length === 0) { const count = 4 + Math.floor(g.diffMult); for (let i = 0; i < count; i++) { const x = rand(BX + 20, BX + BW - 20); g.warnMarkers.push({ id: nid(g), x, y: BCY, angle: 0, r: 22, color: boss.color, timer: 1.2, maxTimer: 1.2 }); g.starPoints.push({ id: nid(g), x, y: BCY }); } }
    g.phaseTimer += dt; if (g.phaseTimer >= 1.2) { g.phase = 1; g.phaseTimer = 0; g.warnMarkers = []; }
  } else if (g.phase === 1) {
    if (g.spawnCount < g.starPoints.length) { g.spawnTimer -= dt; if (g.spawnTimer <= 0) { g.spawnTimer = 0.2; const pt = g.starPoints[g.spawnCount]; g.bullets.push({ id: nid(g), x: pt.x, y: BY - 20, vx: 0, vy: 200 * sm(g) * 0.8, r: 16, color: boss.color, shape: 'circle', rot: 0, rotSpd: 0, frozen: false }); g.spawnCount++; } }
    moveBullets(g, dt); g.bullets = g.bullets.filter(b => b.y < BY + BH + 40);
    g.phaseTimer += dt; if (g.phaseTimer >= 3.0) { g.phase = 2; g.phaseTimer = 0; g.bullets = []; g.starPoints = []; }
  } else { g.phaseTimer += dt; if (g.phaseTimer >= 0.6) { g.phase = 0; g.phaseTimer = 0; g.spawnCount = 0; } }
}
function doPlanetTilt(g: GameData, dt: number, boss: BossConf) {
  if (g.phase === 0) {
    if (g.warnMarkers.length === 0)
      for (let arm = 0; arm < 6; arm++) { const a = (arm / 6) * Math.PI * 2; for (let d = 1; d <= 3; d++) g.warnMarkers.push({ id: nid(g), x: BCX + Math.cos(a) * d * 35, y: BCY + Math.sin(a) * d * 35, angle: a, r: 5, color: boss.color, timer: 0.8, maxTimer: 0.8 }); }
    g.phaseTimer += dt; if (g.phaseTimer >= 0.8) { g.phase = 1; g.phaseTimer = 0; g.warnMarkers = []; }
  } else if (g.phase === 1) {
    g.spawnTimer -= dt;
    if (g.spawnTimer <= 0) {
      g.spawnTimer = st(0.07, g); const spd = sm(g); const baseA = g.time * 1.6;
      for (let arm = 0; arm < 6; arm++) { const a = baseA + (arm / 6) * Math.PI * 2; g.bullets.push({ id: nid(g), x: BCX, y: BCY, vx: Math.cos(a) * 155 * spd, vy: Math.sin(a) * 155 * spd, r: 6, color: arm % 2 === 0 ? boss.color : boss.color2, shape: 'circle', rot: 0, rotSpd: 0, frozen: false }); }
    }
    moveBullets(g, dt); g.bullets = g.bullets.filter(b => b.x > -80 && b.x < W + 80 && b.y > -80 && b.y < H + 80);
    g.phaseTimer += dt; if (g.phaseTimer >= 4.0) { g.phase = 2; g.phaseTimer = 0; g.bullets = []; }
  } else { g.phaseTimer += dt; if (g.phaseTimer >= 0.6) { g.phase = 0; g.phaseTimer = 0; } }
}
function doCraterBurst(g: GameData, dt: number, boss: BossConf) {
  if (g.phase === 0) {
    if (g.warnMarkers.length === 0) { const cx = rand(BX + BW * 0.25, BX + BW * 0.75); const cy = rand(BY + BH * 0.25, BY + BH * 0.75); g.starPoints.push({ id: nid(g), x: cx, y: cy }); for (let i = 0; i < 12; i++) { const a = (i / 12) * Math.PI * 2; g.warnMarkers.push({ id: nid(g), x: cx + Math.cos(a) * 30, y: cy + Math.sin(a) * 30, angle: a, r: 6, color: boss.color, timer: 1.0, maxTimer: 1.0 }); } }
    g.phaseTimer += dt; if (g.phaseTimer >= 1.0) { g.phase = 1; g.phaseTimer = 0; g.warnMarkers = []; shake(g); }
  } else if (g.phase === 1) {
    if (g.spawnCount === 0 && g.starPoints.length > 0) { g.spawnCount = 1; const pt = g.starPoints[0]; const spd = sm(g); for (let i = 0; i < 20; i++) { const a = (i / 20) * Math.PI * 2; g.bullets.push({ id: nid(g), x: pt.x, y: pt.y, vx: Math.cos(a) * 185 * spd, vy: Math.sin(a) * 185 * spd, r: 7, color: boss.color, shape: 'circle', rot: 0, rotSpd: 0, frozen: false }); if (i % 5 === 0) g.bullets.push({ id: nid(g), x: pt.x, y: pt.y, vx: Math.cos(a) * 90 * spd, vy: Math.sin(a) * 90 * spd, r: 9, color: boss.color2, shape: 'circle', rot: 0, rotSpd: 0, frozen: false }); } }
    moveBullets(g, dt); g.bullets = g.bullets.filter(b => b.x > -60 && b.x < W + 60 && b.y > -60 && b.y < H + 60);
    g.phaseTimer += dt; if (g.phaseTimer >= 2.5) { g.phase = 2; g.phaseTimer = 0; g.bullets = []; g.starPoints = []; }
  } else { g.phaseTimer += dt; if (g.phaseTimer >= 0.5) { g.phase = 0; g.phaseTimer = 0; g.spawnCount = 0; } }
}
function doTinyApocalypse(g: GameData, dt: number, boss: BossConf) {
  if (g.phase === 0) {
    if (g.warnMarkers.length === 0)
      for (let i = 0; i < 14; i++) { const a = (i / 14) * Math.PI * 2; g.warnMarkers.push({ id: nid(g), x: BCX + Math.cos(a) * 70, y: BCY + Math.sin(a) * 70, angle: a, r: 5, color: boss.color, timer: 0.8, maxTimer: 0.8 }); }
    g.phaseTimer += dt;
    if (g.phaseTimer >= 0.8) {
      const spd = sm(g);
      g.rings.push({ id: nid(g), cx: BCX, cy: BCY, r: 20, speed: 95 * spd, thick: 18, gaps: [Math.random() * Math.PI * 2, Math.random() * Math.PI * 2 + Math.PI], gapSz: 0.5, color: boss.color });
      g.rings.push({ id: nid(g), cx: BCX, cy: BCY, r: 80, speed: 110 * spd, thick: 14, gaps: [Math.random() * Math.PI * 2], gapSz: 0.6, color: boss.color2 });
      for (let i = 0; i < 8; i++) { const a = (i / 8) * Math.PI * 2; g.bullets.push({ id: nid(g), x: BCX, y: BCY, vx: Math.cos(a) * 130 * spd, vy: Math.sin(a) * 130 * spd, r: 5, color: boss.color2, shape: 'diamond', rot: 0, rotSpd: rand(-3, 3), frozen: false }); }
      g.warnMarkers = []; g.phase = 1; g.phaseTimer = 0; shake(g);
    }
  } else if (g.phase === 1) {
    for (const ring of g.rings) { ring.r += ring.speed * dt; ring.gaps = ring.gaps.map(a => a + 1.2 * dt); }
    g.rings = g.rings.filter(r => r.r < 300);
    moveBullets(g, dt); g.bullets = g.bullets.filter(b => b.x > -60 && b.x < W + 60 && b.y > -60 && b.y < H + 60);
    g.phaseTimer += dt; if (g.phaseTimer >= 2.5) { g.rings = []; g.bullets = []; g.phase = 2; g.phaseTimer = 0; }
  } else { g.phaseTimer += dt; if (g.phaseTimer >= 0.6) { g.phase = 0; g.phaseTimer = 0; } }
}

// Boss 17 — Xiu
function doPaperCuts(g: GameData, dt: number, boss: BossConf) {
  if (g.phase === 0) {
    if (g.diagWarns.length === 0) { const count = 2 + waveVariant(g); for (let i = 0; i < count; i++) { const y = BY + BH * (i / (count + 1) + 0.25); const angle = i % 2 === 0 ? 0.4 : -0.4; g.diagWarns.push({ id: nid(g), x1: BX, y1: y, x2: BX + BW, y2: y + Math.tan(angle) * BW, width: 12, timer: 0.8, color: boss.color, fake: false }); } }
    for (const dw of g.diagWarns) dw.timer -= dt;
    g.phaseTimer += dt;
    if (g.phaseTimer >= 0.8) { g.diagLasers = g.diagWarns.map(dw => ({ id: nid(g), x1: dw.x1, y1: dw.y1, x2: dw.x2, y2: dw.y2, width: 12, timer: 1.2, color: boss.color })); g.diagWarns = []; g.phase = 1; g.phaseTimer = 0; shake(g); }
  } else if (g.phase === 1) {
    for (const dl of g.diagLasers) dl.timer -= dt; g.diagLasers = g.diagLasers.filter(dl => dl.timer > 0);
    g.phaseTimer += dt; if (g.phaseTimer >= 1.5) { g.diagLasers = []; g.phase = 2; g.phaseTimer = 0; }
  } else { g.phaseTimer += dt; if (g.phaseTimer >= 0.5) { g.phase = 0; g.phaseTimer = 0; } }
}
function doFoldedWalls(g: GameData, dt: number, boss: BossConf) {
  if (g.phase === 0) {
    if (g.laserWarns.length === 0) { const n = 3 + waveVariant(g); for (let i = 0; i < n; i++) g.laserWarns.push({ id: nid(g), type: 'v', pos: i % 2 === 0 ? BX : BX + BW, width: 35, timer: 0.85, color: boss.color, fake: false }); }
    for (const lw of g.laserWarns) lw.timer -= dt;
    g.phaseTimer += dt;
    if (g.phaseTimer >= 0.85) { for (const lw of g.laserWarns) g.lasers.push({ id: nid(g), type: lw.type, pos: lw.pos, width: 35, timer: 3.5, color: boss.color }); g.laserWarns = []; g.phase = 1; g.phaseTimer = 0; shake(g); }
  } else if (g.phase === 1) {
    const spd = sm(g); for (const l of g.lasers) { l.pos += (l.pos < BCX ? 1 : -1) * 55 * spd * dt; l.timer -= dt; }
    g.lasers = g.lasers.filter(l => l.timer > 0 && Math.abs(l.pos - BCX) > 20);
    g.phaseTimer += dt; if (g.phaseTimer >= 3.0) { g.lasers = []; g.phase = 2; g.phaseTimer = 0; }
  } else { g.phaseTimer += dt; if (g.phaseTimer >= 0.5) { g.phase = 0; g.phaseTimer = 0; } }
}
function doInkDecree(g: GameData, dt: number, boss: BossConf) {
  g.spawnTimer -= dt;
  if (g.spawnTimer <= 0 && g.dangerZones.length < 6) {
    g.spawnTimer = rand(0.45, 0.75); const col = g.dangerZones.length % 3; const row = Math.floor(g.dangerZones.length / 3);
    const zw = BW / 3 - 8, zh = BH / 2 - 8;
    g.dangerZones.push({ id: nid(g), x: BX + 4 + col * (zw + 4), y: BY + 4 + row * (zh + 4), w: zw, h: zh, warnTimer: 0.9, activeTimer: 1.1, color: boss.color2 });
  }
  for (const dz of g.dangerZones) { if (dz.warnTimer > 0) dz.warnTimer -= dt; else dz.activeTimer -= dt; }
  g.dangerZones = g.dangerZones.filter(dz => dz.warnTimer > 0 || dz.activeTimer > 0);
}
function doRoyalGuillotine(g: GameData, dt: number, boss: BossConf) {
  if (g.phase === 0) {
    if (g.laserWarns.length === 0) { const x = rand(BX + BW * 0.2, BX + BW * 0.8); g.spawnCount = Math.round(x); g.laserWarns.push({ id: nid(g), type: 'v', pos: x, width: 55, timer: 1.0, color: boss.color, fake: false }); }
    for (const lw of g.laserWarns) lw.timer -= dt;
    g.phaseTimer += dt;
    if (g.phaseTimer >= 1.0) { g.lasers.push({ id: nid(g), type: 'v', pos: g.laserWarns[0]?.pos ?? BCX, width: 55, timer: 0.8, color: boss.color }); g.laserWarns = []; g.phase = 1; g.phaseTimer = 0; shake(g); }
  } else if (g.phase === 1) {
    for (const l of g.lasers) l.timer -= dt; g.lasers = g.lasers.filter(l => l.timer > 0);
    if (g.lasers.length === 0) { const spd = sm(g); for (let i = 0; i < 12; i++) { const a = Math.PI / 2 + rand(-0.8, 0.8); g.bullets.push({ id: nid(g), x: g.spawnCount, y: BY, vx: Math.cos(a) * 170 * spd, vy: Math.sin(a) * 170 * spd, r: 5, color: boss.color2, shape: 'diamond', rot: 0, rotSpd: rand(-3, 3), frozen: false }); } g.phase = 2; g.phaseTimer = 0; shake(g); }
  } else if (g.phase === 2) {
    moveBullets(g, dt); g.bullets = g.bullets.filter(b => b.x > -60 && b.x < W + 60 && b.y > -60 && b.y < H + 60);
    g.phaseTimer += dt; if (g.phaseTimer >= 2.0) { g.phase = 3; g.phaseTimer = 0; g.bullets = []; }
  } else { g.phaseTimer += dt; if (g.phaseTimer >= 0.5) { g.phase = 0; g.phaseTimer = 0; } }
}
function doOrigamiSpears(g: GameData, dt: number, boss: BossConf) {
  if (g.phase === 0) {
    if (g.diagWarns.length === 0)
      for (let i = 0; i < 8; i++) { const a = (i / 8) * Math.PI * 2; const len = 240; g.diagWarns.push({ id: nid(g), x1: BCX, y1: BCY, x2: BCX + Math.cos(a) * len, y2: BCY + Math.sin(a) * len, width: 18, timer: 0.9, color: boss.color, fake: i % 2 !== 0 }); }
    for (const dw of g.diagWarns) dw.timer -= dt;
    g.phaseTimer += dt;
    if (g.phaseTimer >= 0.9) { g.diagLasers = g.diagWarns.filter(dw => !dw.fake).map(dw => ({ id: nid(g), x1: dw.x1, y1: dw.y1, x2: dw.x2, y2: dw.y2, width: 18, timer: 0.9, color: boss.color })); g.diagWarns = []; g.phase = 1; g.phaseTimer = 0; shake(g); }
  } else if (g.phase === 1) {
    for (const dl of g.diagLasers) dl.timer -= dt; g.diagLasers = g.diagLasers.filter(dl => dl.timer > 0);
    g.phaseTimer += dt; if (g.phaseTimer >= 1.2) { g.diagLasers = []; g.diagWarns = []; g.phase = 2; g.phaseTimer = 0; }
  } else { g.phaseTimer += dt; if (g.phaseTimer >= 0.5) { g.phase = 0; g.phaseTimer = 0; } }
}

// Boss 18 — Mnemovex
function doEchoTrail(g: GameData, dt: number, boss: BossConf) {
  if (g.phase === 0) {
    if (g.warnMarkers.length === 0) { const pp = g.prevPlayerPositions[0] ?? { x: g.player.x, y: g.player.y }; for (let i = 0; i < 6; i++) g.warnMarkers.push({ id: nid(g), x: pp.x + rand(-30, 30), y: pp.y + rand(-30, 30), angle: 0, r: 8, color: boss.color, timer: 0.9, maxTimer: 0.9 }); }
    g.phaseTimer += dt; if (g.phaseTimer >= 0.9) { g.phase = 1; g.phaseTimer = 0; g.warnMarkers = []; }
  } else if (g.phase === 1) {
    g.spawnTimer -= dt;
    if (g.spawnTimer <= 0 && g.spawnCount < 12) {
      g.spawnTimer = st(0.18, g); g.spawnCount++; const spd = sm(g);
      const pp = g.prevPlayerPositions[g.spawnCount] ?? { x: rand(BX + 20, BX + BW - 20), y: rand(BY + 20, BY + BH - 20) };
      for (let i = 0; i < 5; i++) { const a = (i / 5) * Math.PI * 2; g.bullets.push({ id: nid(g), x: pp.x, y: pp.y, vx: Math.cos(a) * 130 * spd, vy: Math.sin(a) * 130 * spd, r: 5, color: boss.color, shape: 'circle', rot: 0, rotSpd: 0, frozen: false }); }
    }
    moveBullets(g, dt); g.bullets = g.bullets.filter(b => b.x > -60 && b.x < W + 60 && b.y > -60 && b.y < H + 60);
    g.phaseTimer += dt; if (g.phaseTimer >= 3.5) { g.phase = 2; g.phaseTimer = 0; g.bullets = []; }
  } else { g.phaseTimer += dt; if (g.phaseTimer >= 0.6) { g.phase = 0; g.phaseTimer = 0; g.spawnCount = 0; } }
}
function doMemoryReplay(g: GameData, dt: number, boss: BossConf) {
  const REPLAYS = ['crystalRain', 'bitStorm', 'haloSpiral', 'clockSlash', 'impossibleScript'];
  if (g.phase === 0) {
    if (g.spawnCount === 0) g.spawnCount = randInt(1, REPLAYS.length);
    const subBoss: BossConf = { ...BOSSES[g.spawnCount - 1], attacks: [REPLAYS[g.spawnCount - 1]] };
    const saved = g.atkIdx; g.atkIdx = 0;
    updateAttack(g, dt, subBoss);
    g.atkIdx = saved;
    g.phaseTimer += dt; if (g.phaseTimer >= 4.0) { g.phase = 1; g.phaseTimer = 0; clearEntities(g); }
  } else { g.phaseTimer += dt; if (g.phaseTimer >= 0.6) { g.phase = 0; g.phaseTimer = 0; g.spawnCount = 0; } }
}
function doVaultLock(g: GameData, dt: number, boss: BossConf) {
  if (g.phase === 0) {
    if (g.laserWarns.length === 0) { for (let i = 1; i <= 2; i++) { g.laserWarns.push({ id: nid(g), type: 'h', pos: BY + BH * (i / 3), width: 32, timer: 0.7, color: boss.color, fake: false }); g.laserWarns.push({ id: nid(g), type: 'v', pos: BX + BW * (i / 3), width: 32, timer: 0.7, color: boss.color2, fake: false }); } }
    for (const lw of g.laserWarns) lw.timer -= dt;
    g.phaseTimer += dt;
    if (g.phaseTimer >= 0.7) { for (const lw of g.laserWarns) g.lasers.push({ id: nid(g), type: lw.type, pos: lw.pos, width: 32, timer: 1.2, color: lw.color }); g.laserWarns = []; g.phase = 1; g.phaseTimer = 0; shake(g); }
  } else if (g.phase === 1) {
    for (const l of g.lasers) l.timer -= dt; g.lasers = g.lasers.filter(l => l.timer > 0);
    g.phaseTimer += dt; if (g.phaseTimer >= 1.5) { g.lasers = []; g.phase = 2; g.phaseTimer = 0; }
  } else if (g.phase === 2) {
    g.phaseTimer += dt;
    if (g.phaseTimer >= 0.4) { for (let i = 1; i <= 2; i++) { g.lasers.push({ id: nid(g), type: 'h', pos: BY + BH * (i === 1 ? 0.25 : 0.75), width: 32, timer: 1.2, color: boss.color }); g.lasers.push({ id: nid(g), type: 'v', pos: BX + BW * (i === 1 ? 0.25 : 0.75), width: 32, timer: 1.2, color: boss.color2 }); } shake(g); g.phase = 3; g.phaseTimer = 0; }
  } else if (g.phase === 3) {
    for (const l of g.lasers) l.timer -= dt; g.lasers = g.lasers.filter(l => l.timer > 0);
    g.phaseTimer += dt; if (g.phaseTimer >= 1.5) { g.lasers = []; g.phase = 4; g.phaseTimer = 0; }
  } else { g.phaseTimer += dt; if (g.phaseTimer >= 0.5) { g.phase = 0; g.phaseTimer = 0; } }
}
function doCrystalRepeat(g: GameData, dt: number, boss: BossConf) {
  const variant = g.phase < 3 ? 0 : 1;
  if (g.phase === 0 || g.phase === 3) {
    if (g.warnMarkers.length === 0) { const offset = variant === 1 ? BW * 0.15 : 0; for (let i = 0; i < 10; i++) g.warnMarkers.push({ id: nid(g), x: BX + offset + (BW - offset * 2) * (i / 9), y: BY, angle: Math.PI / 2, r: 5, color: boss.color, timer: 0.6, maxTimer: 0.6 }); }
    g.phaseTimer += dt; if (g.phaseTimer >= 0.6) { g.phase++; g.phaseTimer = 0; g.warnMarkers = []; }
  } else if (g.phase === 1 || g.phase === 4) {
    g.spawnTimer -= dt;
    if (g.spawnTimer <= 0) { g.spawnTimer = st(0.07, g); g.spawnCount++; const spd = sm(g); const x = rand(BX + (variant === 1 ? BW * 0.1 : 4), BX + BW - 4); g.bullets.push({ id: nid(g), x, y: BY - 6, vx: rand(-14, 14) * spd, vy: rand(150, 230) * spd, r: 4, color: boss.color, shape: 'circle', rot: 0, rotSpd: 0, frozen: false }); }
    moveBullets(g, dt); g.bullets = g.bullets.filter(b => b.y < BY + BH + 20);
    g.phaseTimer += dt; if (g.phaseTimer >= 1.8) { g.phase++; g.phaseTimer = 0; }
  } else if (g.phase === 2) {
    g.phaseTimer += dt; if (g.phaseTimer >= 0.5) { g.phase = 3; g.phaseTimer = 0; g.bullets = []; }
  } else { g.phaseTimer += dt; if (g.phaseTimer >= 0.6) { g.phase = 0; g.phaseTimer = 0; g.bullets = []; g.spawnCount = 0; } }
}

// Boss 19 — Lunara
function doStringPull(g: GameData, dt: number, boss: BossConf) {
  if (g.phase === 0) {
    if (g.warnMarkers.length === 0) {
      const diagX = Math.random() > 0.5 ? 1 : -1; const diagY = Math.random() > 0.5 ? 1 : -1;
      g.currentPullX = diagX * 18; g.currentPullY = diagY * 14;
      const a = Math.atan2(diagY, diagX);
      for (let i = 0; i < 5; i++) g.warnMarkers.push({ id: nid(g), x: BCX + Math.cos(a) * i * 45, y: BCY + Math.sin(a) * i * 45, angle: a, r: 8, color: boss.color, timer: 1.0, maxTimer: 1.0 });
    }
    g.phaseTimer += dt; if (g.phaseTimer >= 1.0) { g.phase = 1; g.phaseTimer = 0; g.warnMarkers = []; g.pullActive = true; g.spawnTimer = 0; }
  } else if (g.phase === 1) {
    g.player.x = Math.max(BX + P_HIT_R, Math.min(BX + BW - P_HIT_R, g.player.x + g.currentPullX));
    g.player.y = Math.max(BY + P_HIT_R, Math.min(BY + BH - P_HIT_R, g.player.y + g.currentPullY));
    g.spawnTimer -= dt;
    if (g.spawnTimer <= 0) {
      g.spawnTimer = st(0.18, g); const spd = sm(g); const len = Math.hypot(g.currentPullX, g.currentPullY);
      const a = Math.atan2(g.currentPullY, g.currentPullX);
      g.bullets.push({ id: nid(g), x: g.player.x - (g.currentPullX / len) * BW * 0.4, y: g.player.y - (g.currentPullY / len) * BH * 0.4, vx: Math.cos(a) * 160 * spd, vy: Math.sin(a) * 160 * spd, r: 6, color: boss.color, shape: 'circle', rot: 0, rotSpd: 0, frozen: false });
    }
    moveBullets(g, dt); g.bullets = g.bullets.filter(b => b.x > BX - 30 && b.x < BX + BW + 30 && b.y > BY - 30 && b.y < BY + BH + 30);
    g.phaseTimer += dt; if (g.phaseTimer >= 3.5) { g.pullActive = false; g.currentPullX = 0; g.currentPullY = 0; g.phase = 2; g.phaseTimer = 0; g.bullets = []; }
  } else { g.phaseTimer += dt; if (g.phaseTimer >= 0.6) { g.phase = 0; g.phaseTimer = 0; } }
}
function doPuppetDance(g: GameData, dt: number, boss: BossConf) {
  if (g.phase === 0) {
    if (g.laserWarns.length === 0) { const gapY = rand(BY + BH * 0.2, BY + BH * 0.7); g.spawnCount = Math.round(gapY); g.laserWarns.push({ id: nid(g), type: 'h', pos: gapY - 30, width: 35, timer: 0.9, color: boss.color, fake: false }); g.laserWarns.push({ id: nid(g), type: 'h', pos: gapY + 30, width: 35, timer: 0.9, color: boss.color2, fake: false }); }
    for (const lw of g.laserWarns) lw.timer -= dt;
    g.phaseTimer += dt;
    if (g.phaseTimer >= 0.9) { for (const lw of g.laserWarns) g.lasers.push({ id: nid(g), type: lw.type, pos: lw.pos, width: 35, timer: 3.0, color: lw.color }); g.laserWarns = []; g.phase = 1; g.phaseTimer = 0; shake(g); }
  } else if (g.phase === 1) {
    const spd = sm(g); for (const l of g.lasers) { l.pos += (l.pos < g.spawnCount ? 1 : -1) * 45 * spd * dt; l.timer -= dt; }
    g.lasers = g.lasers.filter(l => l.timer > 0 && Math.abs(l.pos - g.spawnCount) > 18);
    g.spawnTimer -= dt;
    if (g.spawnTimer <= 0) { g.spawnTimer = st(0.14, g); const bspd = sm(g); g.bullets.push({ id: nid(g), x: rand(BX + 5, BX + BW - 5), y: BY - 5, vx: rand(-10, 10) * bspd, vy: rand(130, 200) * bspd, r: 4, color: boss.color2, shape: 'circle', rot: 0, rotSpd: 0, frozen: false }); }
    moveBullets(g, dt); g.bullets = g.bullets.filter(b => b.y < BY + BH + 20);
    g.phaseTimer += dt; if (g.phaseTimer >= 3.0 || g.lasers.length === 0) { g.lasers = []; g.bullets = []; g.phase = 2; g.phaseTimer = 0; }
  } else { g.phaseTimer += dt; if (g.phaseTimer >= 0.5) { g.phase = 0; g.phaseTimer = 0; g.spawnCount = 0; } }
}
function doMoonDrop(g: GameData, dt: number, boss: BossConf) {
  if (g.phase === 0) {
    if (g.warnMarkers.length === 0) { const count = 2 + Math.floor(g.diffMult * 0.5); for (let i = 0; i < count; i++) { const x = rand(BX + 30, BX + BW - 30); g.warnMarkers.push({ id: nid(g), x, y: BCY, angle: 0, r: 28, color: boss.color, timer: 1.5, maxTimer: 1.5 }); g.starPoints.push({ id: nid(g), x, y: BCY }); } }
    g.phaseTimer += dt; if (g.phaseTimer >= 1.5) { g.phase = 1; g.phaseTimer = 0; g.warnMarkers = []; }
  } else if (g.phase === 1) {
    if (g.spawnCount < g.starPoints.length) { g.spawnTimer -= dt; if (g.spawnTimer <= 0) { g.spawnTimer = 0.3; const pt = g.starPoints[g.spawnCount]; g.bullets.push({ id: nid(g), x: pt.x, y: BY - 30, vx: 0, vy: 110, r: 22, color: boss.color, shape: 'circle', rot: 0, rotSpd: 0, frozen: false }); g.spawnCount++; } }
    moveBullets(g, dt); g.bullets = g.bullets.filter(b => b.y < BY + BH + 40);
    g.phaseTimer += dt; if (g.phaseTimer >= 3.5) { g.phase = 2; g.phaseTimer = 0; g.bullets = []; g.starPoints = []; }
  } else { g.phaseTimer += dt; if (g.phaseTimer >= 0.5) { g.phase = 0; g.phaseTimer = 0; g.spawnCount = 0; } }
}
function doBloodCurtain(g: GameData, dt: number, boss: BossConf) {
  if (g.phase === 0) {
    if (g.laserWarns.length === 0) g.laserWarns.push({ id: nid(g), type: 'h', pos: BY, width: 60, timer: 1.5, color: boss.color, fake: false });
    for (const lw of g.laserWarns) lw.timer -= dt;
    g.phaseTimer += dt;
    if (g.phaseTimer >= 1.5) { g.lasers.push({ id: nid(g), type: 'h', pos: BY, width: 60, timer: 5.0, color: boss.color }); g.laserWarns = []; g.phase = 1; g.phaseTimer = 0; shake(g); }
  } else if (g.phase === 1) {
    const spd = sm(g); for (const l of g.lasers) { l.pos += (BH + 80) / 1.2 * spd * dt; l.timer -= dt; }
    g.lasers = g.lasers.filter(l => l.pos < BY + BH + 60 && l.timer > 0);
    if (g.lasers.length === 0) { g.phase = 2; g.phaseTimer = 0; }
  } else if (g.phase === 2) {
    g.phaseTimer += dt;
    if (g.phaseTimer >= 0.25) { g.laserWarns.push({ id: nid(g), type: 'h', pos: BY + BH, width: 55, timer: 0.5, color: boss.color2, fake: false }); g.phase = 3; g.phaseTimer = 0; }
  } else if (g.phase === 3) {
    for (const lw of g.laserWarns) lw.timer -= dt;
    g.phaseTimer += dt;
    if (g.phaseTimer >= 0.5) { for (const lw of g.laserWarns) g.lasers.push({ id: nid(g), type: lw.type, pos: lw.pos, width: 55, timer: 5.0, color: lw.color }); g.laserWarns = []; g.phase = 4; g.phaseTimer = 0; shake(g); }
  } else if (g.phase === 4) {
    const spd = sm(g); for (const l of g.lasers) { l.pos -= (BH + 80) / 1.3 * spd * dt; l.timer -= dt; }
    g.lasers = g.lasers.filter(l => l.pos > BY - 60 && l.timer > 0);
    if (g.lasers.length === 0) { g.phase = 5; g.phaseTimer = 0; }
  } else { g.phaseTimer += dt; if (g.phaseTimer >= 0.6) { g.phase = 0; g.phaseTimer = 0; } }
}
function doMoonShatter(g: GameData, dt: number, boss: BossConf) {
  if (g.phase === 0) {
    if (g.warnMarkers.length === 0)
      for (let i = 0; i < 18; i++) { const a = (i / 18) * Math.PI * 2; g.warnMarkers.push({ id: nid(g), x: BCX + Math.cos(a) * 150, y: BCY + Math.sin(a) * 150, angle: a, r: 5, color: boss.color, timer: 0.8, maxTimer: 0.8 }); }
    g.phaseTimer += dt;
    if (g.phaseTimer >= 0.8) { const pAngle = Math.atan2(g.player.y - BCY, g.player.x - BCX); g.rings.push({ id: nid(g), cx: BCX, cy: BCY, r: 150, speed: -65 * sm(g), thick: 20, gaps: [pAngle], gapSz: 0.5, color: boss.color }); g.warnMarkers = []; g.phase = 1; g.phaseTimer = 0; }
  } else if (g.phase === 1) {
    for (const ring of g.rings) ring.r += ring.speed * dt;
    g.phaseTimer += dt;
    if (g.phaseTimer >= 1.8) {
      const spd = sm(g); const ring = g.rings[0]; if (ring) for (let i = 0; i < 24; i++) { const a = (i / 24) * Math.PI * 2; g.bullets.push({ id: nid(g), x: ring.cx + Math.cos(a) * ring.r, y: ring.cy + Math.sin(a) * ring.r, vx: Math.cos(a) * 160 * spd, vy: Math.sin(a) * 160 * spd, r: 6, color: boss.color, shape: 'circle', rot: 0, rotSpd: 0, frozen: false }); }
      g.rings = []; shake(g); g.phase = 2; g.phaseTimer = 0;
    }
  } else if (g.phase === 2) {
    moveBullets(g, dt); g.bullets = g.bullets.filter(b => b.x > -60 && b.x < W + 60 && b.y > -60 && b.y < H + 60);
    g.phaseTimer += dt; if (g.phaseTimer >= 2.5) { g.phase = 3; g.phaseTimer = 0; g.bullets = []; }
  } else { g.phaseTimer += dt; if (g.phaseTimer >= 0.6) { g.phase = 0; g.phaseTimer = 0; } }
}

// Boss 20 — Soulvex
function doRegretSpiral(g: GameData, dt: number, boss: BossConf) {
  if (g.phase === 0) {
    if (g.warnMarkers.length === 0)
      for (let i = 0; i < 24; i++) { const a = (i / 24) * Math.PI * 2; g.warnMarkers.push({ id: nid(g), x: BCX + Math.cos(a) * 20, y: BCY + Math.sin(a) * 20, angle: a, r: 5, color: boss.color, timer: 0.7, maxTimer: 0.7 }); }
    g.phaseTimer += dt; if (g.phaseTimer >= 0.7) { g.phase = 1; g.phaseTimer = 0; g.warnMarkers = []; }
  } else if (g.phase === 1) {
    g.spawnTimer -= dt;
    if (g.spawnTimer <= 0) {
      g.spawnTimer = st(0.055, g); g.spawnCount++; const spd = sm(g); const baseA = g.spawnCount * 0.2;
      for (let arm = 0; arm < 8; arm++) { const a = baseA + (arm / 8) * Math.PI * 2; g.bullets.push({ id: nid(g), x: BCX, y: BCY, vx: Math.cos(a) * 170 * spd, vy: Math.sin(a) * 170 * spd, r: 5, color: arm % 2 === 0 ? boss.color : boss.color2, shape: 'circle', rot: 0, rotSpd: 0, frozen: false }); }
    }
    moveBullets(g, dt); g.bullets = g.bullets.filter(b => b.x > -80 && b.x < W + 80 && b.y > -80 && b.y < H + 80);
    g.phaseTimer += dt; if (g.phaseTimer >= 4.0) { g.phase = 2; g.phaseTimer = 0; g.bullets = []; }
  } else { g.phaseTimer += dt; if (g.phaseTimer >= 0.6) { g.phase = 0; g.phaseTimer = 0; } }
}
function doBossMemoryChain(g: GameData, dt: number, boss: BossConf) {
  const CHAIN = ['crystalRain', 'bitStorm', 'haloSpiral', 'gearMaze', 'impossibleScript', 'currentSurge', 'boneRain', 'starfall', 'pistonCrush', 'finalRule'];
  const STEP_DUR = 2.5, WARN_DUR = 0.4;
  if (g.finalRuleStep >= CHAIN.length) { g.finalRuleStep = 0; g.finalRuleStepTimer = 0; g.phaseTimer += dt; if (g.phaseTimer >= 0.8) { g.phase = 0; g.phaseTimer = 0; clearEntities(g); } return; }
  g.finalRuleStepTimer += dt;
  if (g.finalRuleStepTimer < WARN_DUR) { if (g.warnMarkers.length === 0) for (let i = 0; i < 8; i++) g.warnMarkers.push({ id: nid(g), x: rand(BX, BX + BW), y: BY + rand(0, BH), angle: rand(0, Math.PI * 2), r: 5, color: boss.color, timer: WARN_DUR, maxTimer: WARN_DUR }); }
  else { g.warnMarkers = []; const subBoss: BossConf = { ...BOSSES[g.finalRuleStep % 10], attacks: [CHAIN[g.finalRuleStep]] }; const saved = g.atkIdx; g.atkIdx = 0; updateAttack(g, dt, subBoss); g.atkIdx = saved; }
  if (g.finalRuleStepTimer >= STEP_DUR) { g.finalRuleStep++; g.finalRuleStepTimer = 0; clearEntities(g); g.phase = 0; g.phaseTimer = 0; g.spawnTimer = 0; g.spawnCount = 0; }
}
function doBrokenControls(g: GameData, dt: number, boss: BossConf) {
  if (g.phase === 0) {
    if (g.warnMarkers.length === 0)
      for (let i = 0; i < 8; i++) g.warnMarkers.push({ id: nid(g), x: BCX + rand(-80, 80), y: BCY + rand(-50, 50), angle: rand(0, Math.PI * 2), r: 6, color: boss.color, timer: 1.0, maxTimer: 1.0 });
    g.phaseTimer += dt;
    if (g.phaseTimer >= 1.0) { g.ctrlFlipped = true; g.phase = 1; g.phaseTimer = 0; g.warnMarkers = []; }
  } else if (g.phase === 1) {
    g.spawnTimer -= dt;
    if (g.spawnTimer <= 0) { g.spawnTimer = st(0.1, g); const spd = sm(g); g.bullets.push({ id: nid(g), x: rand(BX + 5, BX + BW - 5), y: BY - 5, vx: rand(-20, 20) * spd, vy: rand(150, 260) * spd, r: 5, color: boss.color, shape: 'circle', rot: 0, rotSpd: 0, frozen: false }); }
    moveBullets(g, dt); g.bullets = g.bullets.filter(b => b.y < BY + BH + 20);
    g.phaseTimer += dt; if (g.phaseTimer >= 3.5) { g.ctrlFlipped = false; g.phase = 2; g.phaseTimer = 0; g.bullets = []; }
  } else { g.phaseTimer += dt; if (g.phaseTimer >= 0.6) { g.phase = 0; g.phaseTimer = 0; } }
}
function doSoulDuel(g: GameData, dt: number, boss: BossConf) {
  if (g.phase === 0) {
    if (g.warnMarkers.length === 0) g.warnMarkers.push({ id: nid(g), x: BCX + (BCX - g.player.x), y: BCY + (BCY - g.player.y), angle: 0, r: 10, color: boss.color2, timer: 1.0, maxTimer: 1.0 });
    g.phaseTimer += dt;
    if (g.phaseTimer >= 1.0) { g.mirrorSoulActive = true; g.mirrorSoulX = BCX + (BCX - g.player.x); g.mirrorSoulY = BCY + (BCY - g.player.y); g.mirrorSoulPulsing = true; g.phase = 1; g.phaseTimer = 0; g.warnMarkers = []; }
  } else if (g.phase === 1) {
    g.mirrorSoulX = BCX + (BCX - g.player.x); g.mirrorSoulY = BCY + (BCY - g.player.y);
    g.spawnTimer -= dt;
    if (g.spawnTimer <= 0) {
      g.spawnTimer = st(0.18, g); const spd = sm(g); const a = Math.atan2(g.player.y - g.mirrorSoulY, g.player.x - g.mirrorSoulX);
      for (let i = 0; i < 3; i++) { const spread = (i - 1) * 0.3; g.bullets.push({ id: nid(g), x: g.mirrorSoulX, y: g.mirrorSoulY, vx: Math.cos(a + spread) * 160 * spd, vy: Math.sin(a + spread) * 160 * spd, r: 6, color: boss.color2, shape: 'circle', rot: 0, rotSpd: 0, frozen: false }); }
    }
    moveBullets(g, dt); g.bullets = g.bullets.filter(b => b.x > -60 && b.x < W + 60 && b.y > -60 && b.y < H + 60);
    g.phaseTimer += dt; if (g.phaseTimer >= 4.0) { g.mirrorSoulActive = false; g.mirrorSoulPulsing = false; g.phase = 2; g.phaseTimer = 0; g.bullets = []; }
  } else { g.phaseTimer += dt; if (g.phaseTimer >= 0.7) { g.phase = 0; g.phaseTimer = 0; } }
}
function doFirstMistake(g: GameData, dt: number, boss: BossConf) {
  if (g.phase === 0) {
    if (g.warnMarkers.length === 0)
      for (let i = 0; i < 32; i++) { const a = (i / 32) * Math.PI * 2; g.warnMarkers.push({ id: nid(g), x: BCX + Math.cos(a) * 80, y: BCY + Math.sin(a) * 80, angle: a, r: 5, color: boss.color, timer: 1.0, maxTimer: 1.0 }); }
    g.phaseTimer += dt;
    if (g.phaseTimer >= 1.0) {
      const spd = sm(g);
      g.rings.push({ id: nid(g), cx: BCX, cy: BCY, r: 15, speed: 120 * spd, thick: 20, gaps: [Math.random() * Math.PI * 2, Math.random() * Math.PI * 2 + Math.PI], gapSz: 0.45, color: boss.color });
      g.rings.push({ id: nid(g), cx: BCX, cy: BCY, r: 100, speed: 100 * spd, thick: 16, gaps: [Math.random() * Math.PI * 2], gapSz: 0.5, color: boss.color2 });
      g.laserWarns.push({ id: nid(g), type: 'h', pos: BCY, width: 44, timer: 0.5, color: boss.color, fake: false });
      g.warnMarkers = []; g.phase = 1; g.phaseTimer = 0; shake(g); shake(g);
    }
  } else if (g.phase === 1) {
    for (const lw of g.laserWarns) lw.timer -= dt;
    if (g.laserWarns.length > 0 && g.laserWarns[0].timer <= 0) { for (const lw of g.laserWarns) g.lasers.push({ id: nid(g), type: lw.type, pos: lw.pos, width: 44, timer: 5.0, color: lw.color }); g.laserWarns = []; shake(g); }
    const spd = sm(g);
    for (const l of g.lasers) { l.pos += (BH + 80) / 2.0 * spd * dt; l.timer -= dt; } g.lasers = g.lasers.filter(l => l.pos < BY + BH + 60 && l.timer > 0);
    for (const ring of g.rings) { ring.r += ring.speed * dt; ring.gaps = ring.gaps.map(a => a + 1.4 * dt); } g.rings = g.rings.filter(r => r.r < 320);
    g.spawnTimer -= dt;
    if (g.spawnTimer <= 0) { g.spawnTimer = st(0.09, g); g.bullets.push({ id: nid(g), x: rand(BX + 4, BX + BW - 4), y: BY - 5, vx: rand(-16, 16) * spd, vy: rand(160, 260) * spd, r: 4, color: boss.color, shape: 'circle', rot: 0, rotSpd: 0, frozen: false }); const a = g.time * 3.0; g.bullets.push({ id: nid(g), x: BCX, y: BCY, vx: Math.cos(a) * 160 * spd, vy: Math.sin(a) * 160 * spd, r: 5, color: boss.color2, shape: 'diamond', rot: 0, rotSpd: rand(-3, 3), frozen: false }); }
    moveBullets(g, dt); g.bullets = g.bullets.filter(b => b.x > -60 && b.x < W + 60 && b.y > -60 && b.y < H + 60);
    g.phaseTimer += dt; if (g.phaseTimer >= 5.0) { g.rings = []; g.lasers = []; g.bullets = []; g.phase = 2; g.phaseTimer = 0; }
  } else { g.phaseTimer += dt; if (g.phaseTimer >= 0.7) { g.phase = 0; g.phaseTimer = 0; } }
}

// ================================================================
// BULLET MOVEMENT + WARN MARKERS
// ================================================================

function moveBullets(g: GameData, dt: number) {
  const sm = g.debugSpeedMult;
  for (const b of g.bullets) {
    if (!b.frozen) { b.x += b.vx * sm * dt; b.y += b.vy * sm * dt; }
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

  // ---- WAVE END — React overlay handles interaction ----
  if (g.state === 'waveEnd') return;

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
    // Shift+1-0 → bosses 11-20  (shifted chars: !@#$%^&*())
    const shift10Map: Record<string, number> = { '!': 10, '@': 11, '#': 12, '$': 13, '%': 14, '^': 15, '&': 16, '*': 17, '(': 18, ')': 19 };
    for (const [key, idx] of Object.entries(shift10Map)) {
      if (g.keys.has(key)) { jumpBoss(idx); g.keys.delete(key); return; }
    }
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

  if (g.speedBoostTimer > 0) g.speedBoostTimer -= cap;
  const spdMult = g.speedBoostTimer > 0 ? 2 : 1;
  const baseSpd = (g.timeDistorted ? P_SPEED * (0.55 + Math.abs(Math.sin(g.time * 4)) * 0.85) : P_SPEED) * spdMult;
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

  // Push player away from advancing piston slabs — 20px inset keeps player visible
  if (g.arenaShrunken) {
    for (const pb of g.pistonBlocks) {
      if (!pb.active) continue;
      if (pb.w >= BW * 0.6) {
        if (pb.y + pb.h / 2 < BCY) g.player.y = Math.max(g.player.y, pb.y + pb.h + 20);
        else                        g.player.y = Math.min(g.player.y, pb.y - 20);
      } else {
        if (pb.x + pb.w / 2 < BCX) g.player.x = Math.max(g.player.x, pb.x + pb.w + 20);
        else                        g.player.x = Math.min(g.player.x, pb.x - 20);
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
  if (checkHit(g) && !g.adminInvincible) {
    g.hitsThisWave++;
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

  // Count down main timer; when it runs out start a grace window (up to 2.5 s)
  // so the boss completes its current attack phase before the wave clears.
  // If the phase advances naturally before 2.5 s the wave ends immediately.
  g.atkTimer -= cap;
  if (g.atkTimer <= 0 && g.atkFinishTimer < 0) {
    g.atkFinishTimer = 2.5;
    g.phaseOnTimerZero = g.phase;
  }
  if (g.atkFinishTimer >= 0) {
    g.atkFinishTimer -= cap;
    const phaseAdvanced = g.phase > g.phaseOnTimerZero;
    if (g.atkFinishTimer < 0 || phaseAdvanced) {
      g.atkFinishTimer = -1;
      const waveHp    = Math.round(g.player.hp);
      const waveHits  = g.hitsThisWave;
      const prevBoss  = g.bossIdx;
      const prevWave  = g.atkIdx;
      g.hitsThisWave  = 0;
      g.atkIdx++;
      clearEntities(g);
      g.waveEndHp         = waveHp;
      g.waveEndHits       = waveHits;
      g.waveEndBossIdx    = prevBoss;
      g.waveEndWaveIdx    = prevWave;
      g.runScore += Math.round(waveHp * 10 - waveHits * 50 + 200);
      g.wavesCleared++;
      if (g.atkIdx >= boss.attacks.length) {
        // Final wave: still show wave-end overlay so the item drop can appear;
        // continueWave() will then transition to bossWin.
        g.waveEndIsBossWin = true;
      } else {
        g.waveEndIsBossWin = false;
        g.atkTimer = boss.atkDur;
        g.atkFinishTimer = -1;
        g.phase = 0; g.phaseTimer = 0; g.spawnTimer = 0; g.spawnCount = 0;
      }
      g.state = 'waveEnd';
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
  ctx.shadowBlur = 0; // skip per-bullet shadow blur for performance
  ctx.fillStyle = b.color;
  ctx.translate(b.x, b.y);
  ctx.rotate(b.rot);
  const vr = b.r * HAZARD_VISUAL_SCALE; // visual radius — hitbox b.r is unchanged
  if (b.shape === 'circle') {
    ctx.beginPath(); ctx.arc(0, 0, vr, 0, Math.PI * 2); ctx.fill();
  } else if (b.shape === 'square') {
    ctx.fillRect(-vr, -vr, vr * 2, vr * 2);
  } else {
    ctx.beginPath(); ctx.moveTo(0, -vr * 1.4); ctx.lineTo(vr * 0.9, 0); ctx.lineTo(0, vr * 1.4); ctx.lineTo(-vr * 0.9, 0); ctx.closePath(); ctx.fill();
  }
  ctx.restore();
}

function drawGear(ctx: CanvasRenderingContext2D, gear: Gear) {
  ctx.save();
  ctx.translate(gear.cx, gear.cy); ctx.rotate(gear.rot);
  ctx.shadowBlur = 14; ctx.shadowColor = gear.color;
  const vr = gear.r * HAZARD_VISUAL_SCALE; // visual radius — hitbox gear.r unchanged
  ctx.fillStyle = gear.color + '30'; ctx.strokeStyle = gear.color; ctx.lineWidth = 3;
  ctx.beginPath(); ctx.arc(0, 0, vr, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
  const teeth = 8;
  for (let i = 0; i < teeth; i++) {
    const a = (i * Math.PI * 2) / teeth;
    ctx.save(); ctx.translate(Math.cos(a) * vr, Math.sin(a) * vr); ctx.rotate(a);
    ctx.fillStyle = gear.color; ctx.fillRect(-4, -6, 8, 12); ctx.restore();
  }
  ctx.beginPath(); ctx.arc(0, 0, vr * 0.38, 0, Math.PI * 2); ctx.strokeStyle = gear.color; ctx.stroke();
  ctx.restore();
}

function drawWarnMarkers(ctx: CanvasRenderingContext2D, g: GameData) {
  for (const wm of g.warnMarkers) {
    const fade = wm.timer / wm.maxTimer;
    const pulse = 0.4 + 0.45 * Math.sin(g.time * 14);
    const vr = wm.r * HAZARD_VISUAL_SCALE; // visual radius — hitbox wm.r unchanged
    ctx.save();
    ctx.globalAlpha = pulse * fade;
    ctx.shadowBlur = 14; ctx.shadowColor = wm.color;
    ctx.fillStyle = wm.color;
    ctx.translate(wm.x, wm.y);
    ctx.rotate(wm.angle + Math.PI / 2);
    ctx.beginPath();
    ctx.moveTo(0, -vr * 1.3);
    ctx.lineTo(vr, vr * 0.8);
    ctx.lineTo(-vr, vr * 0.8);
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
// BOSS DRAW FUNCTIONS — BOSSES 11-20
// ================================================================

// Boss 11 — Vyrial (plague/spore)
function drawBoss11(ctx: CanvasRenderingContext2D, g: GameData, boss: BossConf) {
  ctx.save();
  ctx.translate(BCX, BY - 80 + Math.sin(g.time * 0.7) * 4);
  ctx.shadowBlur = 30; ctx.shadowColor = boss.color;
  const pulse = 1 + Math.sin(g.time * 3) * 0.08;
  // Organic blob outline
  ctx.strokeStyle = boss.color; ctx.lineWidth = 2.5;
  ctx.beginPath();
  for (let i = 0; i <= 32; i++) {
    const a = (i / 32) * Math.PI * 2;
    const r = 24 * pulse + Math.sin(a * 7 + g.time * 2) * 7;
    i === 0 ? ctx.moveTo(Math.cos(a) * r, Math.sin(a) * r) : ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r);
  }
  ctx.closePath(); ctx.stroke();
  ctx.fillStyle = boss.color + '22'; ctx.fill();
  // Nucleus
  ctx.fillStyle = boss.color; ctx.shadowBlur = 18;
  ctx.beginPath(); ctx.arc(0, 0, 9 * pulse, 0, Math.PI * 2); ctx.fill();
  // Orbiting spores
  for (let i = 0; i < 6; i++) {
    const sa = g.time * 1.2 + (i * Math.PI * 2) / 6;
    const sr = 44 + Math.sin(g.time * 2 + i) * 8;
    ctx.fillStyle = i % 2 === 0 ? boss.color : boss.color2; ctx.shadowColor = ctx.fillStyle;
    ctx.beginPath(); ctx.arc(Math.cos(sa) * sr, Math.sin(sa) * sr * 0.6, 4, 0, Math.PI * 2); ctx.fill();
  }
  ctx.restore();
}

// Boss 12 — Echora (sound/music)
function drawBoss12(ctx: CanvasRenderingContext2D, g: GameData, boss: BossConf) {
  ctx.save();
  ctx.translate(BCX, BY - 80 + Math.sin(g.time * 1.1) * 3);
  ctx.shadowBlur = 28; ctx.shadowColor = boss.color;
  // Concentric sound rings
  for (let i = 0; i < 3; i++) {
    const r = 16 + i * 14 + Math.sin(g.time * 4 + i) * 5;
    ctx.strokeStyle = i % 2 === 0 ? boss.color : boss.color2;
    ctx.lineWidth = 2.5 - i * 0.5; ctx.globalAlpha = 1 - i * 0.28;
    ctx.beginPath(); ctx.arc(0, 0, r, 0, Math.PI * 2); ctx.stroke();
  }
  ctx.globalAlpha = 1;
  // Diamond core
  ctx.fillStyle = boss.color; ctx.shadowBlur = 22; ctx.shadowColor = boss.color;
  ctx.beginPath();
  ctx.moveTo(0, -14); ctx.lineTo(10, 0); ctx.lineTo(0, 14); ctx.lineTo(-10, 0);
  ctx.closePath(); ctx.fill();
  // Waveform bars left + right
  ctx.fillStyle = boss.color2; ctx.globalAlpha = 0.7;
  for (let i = 0; i < 5; i++) {
    const h = 6 + Math.sin(g.time * 6 + i * 1.2) * 10;
    ctx.fillRect(26 + i * 8, -h / 2, 5, h);
    ctx.fillRect(-26 - i * 8 - 5, -h / 2, 5, h);
  }
  ctx.globalAlpha = 1;
  ctx.restore();
}

// Boss 13 — Vantus (void/gravity)
function drawBoss13(ctx: CanvasRenderingContext2D, g: GameData, boss: BossConf) {
  ctx.save();
  ctx.translate(BCX, BY - 80 + Math.sin(g.time * 0.5) * 2);
  ctx.shadowBlur = 40; ctx.shadowColor = boss.color;
  // Rotating gravity rings
  for (let i = 3; i >= 0; i--) {
    const r = 14 + i * 13;
    ctx.strokeStyle = i % 2 === 0 ? boss.color : boss.color2;
    ctx.lineWidth = 1.5; ctx.globalAlpha = 0.3 + (3 - i) * 0.2;
    ctx.save();
    ctx.rotate(g.time * (0.3 + i * 0.15) * (i % 2 === 0 ? 1 : -1));
    ctx.beginPath(); ctx.arc(0, 0, r, 0, Math.PI * 2); ctx.stroke();
    ctx.restore();
  }
  ctx.globalAlpha = 1;
  // Black hole core
  const grad = ctx.createRadialGradient(0, 0, 2, 0, 0, 12);
  grad.addColorStop(0, '#000000'); grad.addColorStop(1, boss.color + '55');
  ctx.fillStyle = grad;
  ctx.beginPath(); ctx.arc(0, 0, 12, 0, Math.PI * 2); ctx.fill();
  // Pulled star dots
  for (let i = 0; i < 5; i++) {
    const a = g.time * -0.8 + (i * Math.PI * 2) / 5;
    const r = 38 + Math.sin(g.time * 2 + i) * 6;
    ctx.fillStyle = boss.color2; ctx.shadowColor = boss.color2; ctx.globalAlpha = 0.8;
    ctx.beginPath(); ctx.arc(Math.cos(a) * r, Math.sin(a) * r * 0.7, 2.5, 0, Math.PI * 2); ctx.fill();
  }
  ctx.globalAlpha = 1;
  ctx.restore();
}

// Boss 14 — Caloric (wax/flame)
function drawBoss14(ctx: CanvasRenderingContext2D, g: GameData, boss: BossConf) {
  ctx.save();
  ctx.translate(BCX, BY - 80 + Math.sin(g.time * 0.9) * 2);
  ctx.shadowBlur = 35; ctx.shadowColor = boss.color;
  // Candle body
  ctx.strokeStyle = boss.color; ctx.lineWidth = 3;
  ctx.strokeRect(-10, -18, 20, 36);
  ctx.fillStyle = boss.color + '18'; ctx.fillRect(-10, -18, 20, 36);
  // Dripping wax drops
  for (let i = 0; i < 4; i++) {
    const dx = -8 + i * 5 + Math.sin(g.time * 1.5 + i) * 2;
    const dy = 18 + Math.sin(g.time * 2 + i * 0.8) * 5;
    ctx.fillStyle = boss.color + 'aa';
    ctx.beginPath(); ctx.arc(dx, dy, 4, 0, Math.PI * 2); ctx.fill();
  }
  // Flame layers top
  ctx.shadowColor = boss.color2; ctx.shadowBlur = 28;
  for (let fi = 0; fi < 3; fi++) {
    const fh = 18 + fi * 4 + Math.sin(g.time * 8 + fi) * 5;
    const fw = 8 - fi * 2;
    ctx.fillStyle = fi === 0 ? boss.color2 : fi === 1 ? boss.color : '#ffffff66';
    ctx.beginPath(); ctx.ellipse(0, -18 - fh / 2, fw * 0.6, fh / 2, 0, 0, Math.PI * 2); ctx.fill();
  }
  // Core
  ctx.fillStyle = boss.color; ctx.shadowColor = boss.color; ctx.shadowBlur = 18;
  ctx.beginPath(); ctx.arc(0, -4, 7, 0, Math.PI * 2); ctx.fill();
  ctx.restore();
}

// Boss 15 — Zylvira (web/crystal)
function drawBoss15(ctx: CanvasRenderingContext2D, g: GameData, boss: BossConf) {
  ctx.save();
  ctx.translate(BCX, BY - 80 + Math.sin(g.time * 0.6) * 3);
  ctx.shadowBlur = 30; ctx.shadowColor = boss.color;
  // Spider web arms + rings
  ctx.save(); ctx.rotate(g.time * 0.15);
  ctx.strokeStyle = boss.color; ctx.lineWidth = 1; ctx.globalAlpha = 0.55;
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2;
    ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(Math.cos(a) * 52, Math.sin(a) * 52); ctx.stroke();
  }
  for (let r = 14; r <= 52; r += 14) {
    ctx.beginPath(); ctx.arc(0, 0, r, 0, Math.PI * 2); ctx.stroke();
  }
  ctx.restore(); ctx.globalAlpha = 1;
  // Rotating hex-gem core
  ctx.shadowBlur = 22; ctx.fillStyle = boss.color;
  ctx.save(); ctx.rotate(g.time * 0.8);
  ctx.beginPath();
  ctx.moveTo(0, -13); ctx.lineTo(11, -6); ctx.lineTo(11, 6);
  ctx.lineTo(0, 13); ctx.lineTo(-11, 6); ctx.lineTo(-11, -6);
  ctx.closePath(); ctx.fill();
  ctx.restore();
  // Two orbiting crystals
  const ca = g.time * 2.5;
  ctx.fillStyle = boss.color2; ctx.shadowColor = boss.color2;
  ctx.beginPath(); ctx.arc(Math.cos(ca) * 38, Math.sin(ca) * 38, 4, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.arc(Math.cos(ca + Math.PI) * 38, Math.sin(ca + Math.PI) * 38, 4, 0, Math.PI * 2); ctx.fill();
  ctx.restore();
}

// Boss 16 — Atlas Minor (cosmic/asteroid)
function drawBoss16(ctx: CanvasRenderingContext2D, g: GameData, boss: BossConf) {
  ctx.save();
  ctx.translate(BCX, BY - 80 + Math.sin(g.time * 0.4) * 3);
  ctx.shadowBlur = 28; ctx.shadowColor = boss.color;
  // Rotating rocky body
  ctx.save(); ctx.rotate(g.time * 0.25);
  ctx.strokeStyle = boss.color; ctx.lineWidth = 2.5;
  const verts: [number, number][] = [[-22, -8], [-12, -24], [4, -20], [20, -12], [22, 6], [10, 22], [-8, 20], [-22, 10]];
  ctx.beginPath();
  verts.forEach(([x, y], i) => i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y));
  ctx.closePath(); ctx.stroke();
  ctx.fillStyle = boss.color + '22'; ctx.fill();
  // Crater arcs
  ctx.strokeStyle = boss.color2; ctx.lineWidth = 1.5;
  [[0, -6, 5], [-8, 6, 3], [8, 4, 4]].forEach(([cx, cy, r]) => {
    ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI); ctx.stroke();
  });
  ctx.restore();
  // Orbiting debris
  for (let i = 0; i < 4; i++) {
    const a = g.time * 1.3 + (i * Math.PI * 2) / 4;
    ctx.fillStyle = boss.color2; ctx.shadowColor = boss.color2;
    ctx.save();
    ctx.translate(Math.cos(a) * 44, Math.sin(a) * 28);
    ctx.rotate(g.time * 2 + i);
    ctx.fillRect(-3, -3, 6, 6);
    ctx.restore();
  }
  ctx.restore();
}

// Boss 17 — Xiu (paper/origami)
function drawBoss17(ctx: CanvasRenderingContext2D, g: GameData, boss: BossConf) {
  ctx.save();
  ctx.translate(BCX, BY - 80 + Math.sin(g.time * 0.8) * 3);
  ctx.shadowBlur = 30; ctx.shadowColor = boss.color;
  // Angular paper-crane pentagon
  ctx.strokeStyle = boss.color; ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(0, -22); ctx.lineTo(20, 4); ctx.lineTo(8, 22);
  ctx.lineTo(-8, 22); ctx.lineTo(-20, 4);
  ctx.closePath(); ctx.stroke();
  ctx.fillStyle = boss.color + '18'; ctx.fill();
  // Fold lines
  ctx.lineWidth = 1; ctx.globalAlpha = 0.45;
  ctx.strokeStyle = boss.color;
  ctx.beginPath(); ctx.moveTo(0, -22); ctx.lineTo(0, 22); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(-20, 4); ctx.lineTo(20, 4); ctx.stroke();
  ctx.globalAlpha = 1;
  // Red cut slash
  ctx.strokeStyle = boss.color2; ctx.lineWidth = 2.5; ctx.shadowColor = boss.color2; ctx.shadowBlur = 16;
  ctx.beginPath(); ctx.moveTo(-10, -4); ctx.lineTo(10, 4); ctx.stroke();
  // Wing tips
  ctx.save(); ctx.rotate(Math.sin(g.time * 2) * 0.18);
  ctx.strokeStyle = boss.color; ctx.lineWidth = 1.5; ctx.globalAlpha = 0.7;
  ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(34, -22); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(-34, -22); ctx.stroke();
  ctx.restore(); ctx.globalAlpha = 1;
  ctx.restore();
}

// Boss 18 — Mnemovex (memory/glitch)
function drawBoss18(ctx: CanvasRenderingContext2D, g: GameData, boss: BossConf) {
  ctx.save();
  ctx.translate(BCX, BY - 80 + Math.sin(g.time * 0.9) * 3);
  ctx.shadowBlur = 30; ctx.shadowColor = boss.color;
  // Stable glitch offset driven by time
  const glitchOn = Math.sin(g.time * 22) > 0.85;
  const glitchX = glitchOn ? Math.sin(g.time * 77) * 5 : 0;
  // Layered ghost rings
  for (let i = 0; i < 3; i++) {
    ctx.strokeStyle = i % 2 === 0 ? boss.color : boss.color2;
    ctx.lineWidth = 2; ctx.globalAlpha = 0.4 + i * 0.22;
    ctx.save(); ctx.translate(glitchX * (i % 2 === 0 ? 1 : -1), 0);
    ctx.beginPath(); ctx.arc(0, 0, 20 - i * 3, 0, Math.PI * 2); ctx.stroke();
    ctx.restore();
  }
  ctx.globalAlpha = 1;
  // Core + void eye
  ctx.fillStyle = boss.color; ctx.shadowBlur = 22;
  ctx.beginPath(); ctx.arc(0, 0, 9, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#000'; ctx.beginPath(); ctx.arc(0, 0, 4, 0, Math.PI * 2); ctx.fill();
  // Orbiting memory shards
  for (let i = 0; i < 5; i++) {
    const a = g.time * 1.5 + (i * Math.PI * 2) / 5;
    const rx = Math.cos(a) * 38, ry = Math.sin(a) * 32;
    ctx.fillStyle = i % 2 === 0 ? boss.color : boss.color2;
    ctx.globalAlpha = 0.6 + Math.sin(g.time * 5 + i) * 0.4;
    ctx.fillRect(rx - 3, ry - 3, 6, 6);
  }
  ctx.globalAlpha = 1;
  ctx.restore();
}

// Boss 19 — Lunara (moon/puppet)
function drawBoss19(ctx: CanvasRenderingContext2D, g: GameData, boss: BossConf) {
  ctx.save();
  ctx.translate(BCX, BY - 80 + Math.sin(g.time * 0.7) * 4);
  ctx.shadowBlur = 32; ctx.shadowColor = boss.color;
  // Crescent moon (filled arc minus overlap)
  ctx.fillStyle = boss.color;
  ctx.beginPath(); ctx.arc(0, 0, 22, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#000';
  ctx.beginPath(); ctx.arc(10, -4, 18, 0, Math.PI * 2); ctx.fill();
  // Marionette cross bar
  const sway = Math.sin(g.time * 1.5) * 8;
  ctx.strokeStyle = boss.color2; ctx.lineWidth = 1.5; ctx.shadowColor = boss.color2;
  ctx.beginPath(); ctx.moveTo(-20 + sway, -52); ctx.lineTo(20 + sway, -52); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(0 + sway, -52); ctx.lineTo(0 + sway, -36); ctx.stroke();
  // Puppet strings
  ctx.lineWidth = 0.8; ctx.globalAlpha = 0.55;
  ctx.beginPath(); ctx.moveTo(-14 + sway, -52); ctx.lineTo(-14, -22); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(14 + sway, -52); ctx.lineTo(14, -22); ctx.stroke();
  ctx.globalAlpha = 1;
  ctx.restore();
}

// Boss 20 — Soulvex (the final soul)
function drawBoss20(ctx: CanvasRenderingContext2D, g: GameData, boss: BossConf) {
  ctx.save();
  ctx.translate(BCX, BY - 80 + Math.sin(g.time * 0.3) * 2);
  ctx.shadowBlur = 50; ctx.shadowColor = boss.color;
  // Orbiting soul fragments — one per previous boss
  const orbitCols = ['#88ff44','#ff44aa','#8844ff','#ffaa22','#ff44ff','#cc8833','#ffffff','#44ccff','#cc2244'];
  for (let i = 0; i < 9; i++) {
    const a = g.time * 0.8 + (i * Math.PI * 2) / 9;
    ctx.fillStyle = orbitCols[i]; ctx.shadowColor = orbitCols[i]; ctx.globalAlpha = 0.75;
    ctx.beginPath(); ctx.arc(Math.cos(a) * 52, Math.sin(a) * 38, 4, 0, Math.PI * 2); ctx.fill();
  }
  ctx.globalAlpha = 1;
  // Cracked white sphere
  ctx.fillStyle = '#ffffff'; ctx.shadowColor = '#ffffff'; ctx.shadowBlur = 40;
  ctx.beginPath(); ctx.arc(0, 0, 20, 0, Math.PI * 2); ctx.fill();
  // Radiating red cracks
  ctx.strokeStyle = boss.color2; ctx.lineWidth = 1.5; ctx.shadowColor = boss.color2; ctx.shadowBlur = 12;
  const cracks: [number, number, number, number][] = [[0, 0, 14, -12], [0, 0, -10, 14], [0, 0, 16, 8], [0, 0, -14, -8]];
  cracks.forEach(([x1, y1, x2, y2]) => {
    ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke();
  });
  // Void eye at centre
  ctx.fillStyle = '#000';
  ctx.beginPath(); ctx.arc(0, 0, 6, 0, Math.PI * 2); ctx.fill();
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
  // Single pass scanline overlay — much cheaper than per-row fillRect loop
  ctx.fillStyle = 'rgba(0,0,0,0.08)';
  ctx.fillRect(0, 0, W, H);

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
    // Visual rect expanded from center; hitbox (pb.x/y/w/h) unchanged
    const vpx = pb.x - (pb.w * (HAZARD_VISUAL_SCALE - 1)) / 2;
    const vpy = pb.y - (pb.h * (HAZARD_VISUAL_SCALE - 1)) / 2;
    const vpw = pb.w * HAZARD_VISUAL_SCALE;
    const vph = pb.h * HAZARD_VISUAL_SCALE;
    ctx.save();
    if (pb.warnTimer > 0) {
      const flash = 0.3 + 0.3 * Math.sin(g.time * 14);
      ctx.globalAlpha = flash;
      ctx.fillStyle = boss.color;
      ctx.strokeStyle = boss.color; ctx.lineWidth = 3;
      ctx.fillRect(vpx, vpy, vpw, vph);
    } else if (pb.active) {
      ctx.shadowBlur = 18; ctx.shadowColor = boss.color;
      ctx.fillStyle = boss.color + 'cc'; ctx.strokeStyle = boss.color2; ctx.lineWidth = 3;
      ctx.fillRect(vpx, vpy, vpw, vph);
      ctx.strokeRect(vpx, vpy, vpw, vph);
      // Striped warning pattern
      ctx.globalAlpha = 0.25;
      ctx.fillStyle = '#ffff00';
      for (let i = 0; i < 8; i++) {
        if (i % 2 === 0) ctx.fillRect(vpx + i * (vpw / 8), vpy, vpw / 8, vph);
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
  drawHeart(ctx, g.mirrorSoulX, g.mirrorSoulY - 7 * HAZARD_VISUAL_SCALE, 7 * HAZARD_VISUAL_SCALE, g.mirrorSoulPulsing ? '#8888ff' : '#ffffff');
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
    ctx.beginPath(); ctx.arc(sp.x, sp.y, (5 + Math.sin(g.time * 6 + sp.id) * 2) * HAZARD_VISUAL_SCALE, 0, Math.PI * 2); ctx.fill();
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
    ctx.fillText(`1-9: boss 1-9  0: boss 10  shift+1-0: boss 11-20  E/F: difficulty`, HP_X, HP_Y + 70);
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
  const vlw = l.width * HAZARD_VISUAL_SCALE; // visual width only; hitbox unchanged
  // Soft glow fill
  ctx.globalAlpha = 0.18;
  ctx.fillStyle = l.color; ctx.shadowBlur = 32; ctx.shadowColor = l.color;
  if (l.type === 'h') ctx.fillRect(BX, l.pos - vlw / 2, BW, vlw);
  else ctx.fillRect(l.pos - vlw / 2, BY, vlw, BH);
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
    case 10: drawBoss11(ctx, g, boss); break;
    case 11: drawBoss12(ctx, g, boss); break;
    case 12: drawBoss13(ctx, g, boss); break;
    case 13: drawBoss14(ctx, g, boss); break;
    case 14: drawBoss15(ctx, g, boss); break;
    case 15: drawBoss16(ctx, g, boss); break;
    case 16: drawBoss17(ctx, g, boss); break;
    case 17: drawBoss18(ctx, g, boss); break;
    case 18: drawBoss19(ctx, g, boss); break;
    case 19: drawBoss20(ctx, g, boss); break;
  }

  drawBox(ctx, boss, g);
  drawDevourLanes(ctx, g);

  // Piston blocks
  drawPistonBlocks(ctx, g, boss);

  // Danger zones — visual rect expanded from center; hitbox (dz.x/y/w/h) unchanged
  for (const dz of g.dangerZones) {
    const vdx = dz.x - (dz.w * (HAZARD_VISUAL_SCALE - 1)) / 2;
    const vdy = dz.y - (dz.h * (HAZARD_VISUAL_SCALE - 1)) / 2;
    const vdw = dz.w * HAZARD_VISUAL_SCALE;
    const vdh = dz.h * HAZARD_VISUAL_SCALE;
    ctx.save();
    if (dz.warnTimer > 0) {
      ctx.globalAlpha = 0.3 + 0.3 * Math.sin(g.time * 11);
      ctx.fillStyle = dz.color; ctx.fillRect(vdx, vdy, vdw, vdh);
      ctx.strokeStyle = dz.color; ctx.lineWidth = 2; ctx.strokeRect(vdx, vdy, vdw, vdh);
    } else if (dz.activeTimer > 0) {
      ctx.fillStyle = dz.color + '55'; ctx.fillRect(vdx, vdy, vdw, vdh);
      ctx.shadowBlur = 20; ctx.shadowColor = dz.color; ctx.strokeStyle = dz.color; ctx.lineWidth = 3; ctx.strokeRect(vdx, vdy, vdw, vdh);
    }
    ctx.restore();
  }

  // Laser warnings — visual width scaled up; hitbox width unchanged
  for (const lw of g.laserWarns) {
    const alpha = 0.28 + 0.28 * Math.sin(g.time * 9);
    const vw = lw.width * HAZARD_VISUAL_SCALE;
    ctx.save(); ctx.globalAlpha = alpha;
    ctx.fillStyle = lw.fake ? '#664400' : '#ff3300';
    if (lw.type === 'h') ctx.fillRect(BX, lw.pos - vw / 2, BW, vw);
    else ctx.fillRect(lw.pos - vw / 2, BY, vw, BH);
    ctx.restore();
  }

  // Diagonal warnings — visual width scaled up; hitbox unchanged
  for (const dw of g.diagWarns) {
    const alpha = 0.28 + 0.24 * Math.sin(g.time * 9);
    ctx.save(); ctx.globalAlpha = alpha;
    ctx.strokeStyle = dw.fake ? '#554400' : '#ffaa00';
    ctx.lineWidth = dw.width * HAZARD_VISUAL_SCALE; ctx.lineCap = 'round'; ctx.shadowBlur = 12; ctx.shadowColor = dw.fake ? '#443300' : '#ffaa00';
    ctx.beginPath(); ctx.moveTo(dw.x1, dw.y1); ctx.lineTo(dw.x2, dw.y2); ctx.stroke();
    ctx.restore();
  }

  // Active lasers — Boss 6 (Nyxcoil) uses a jagged electric render; visual width scaled
  for (const l of g.lasers) {
    if (g.bossIdx === 5) {
      drawElectricLaser(ctx, l, g.time);
    } else {
      const vlw = l.width * HAZARD_VISUAL_SCALE;
      ctx.save(); ctx.shadowBlur = 22; ctx.shadowColor = l.color; ctx.fillStyle = l.color;
      if (l.type === 'h') ctx.fillRect(BX, l.pos - vlw / 2, BW, vlw);
      else ctx.fillRect(l.pos - vlw / 2, BY, vlw, BH);
      ctx.restore();
    }
  }

  // Diagonal lasers — visual width scaled; hitbox unchanged
  for (const dl of g.diagLasers) {
    ctx.save(); ctx.strokeStyle = dl.color; ctx.lineWidth = dl.width * HAZARD_VISUAL_SCALE; ctx.lineCap = 'round';
    ctx.shadowBlur = 28; ctx.shadowColor = dl.color;
    ctx.beginPath(); ctx.moveTo(dl.x1, dl.y1); ctx.lineTo(dl.x2, dl.y2); ctx.stroke();
    ctx.restore();
  }

  // Rings — visual thickness scaled; hitbox (ring.thick) unchanged
  for (const ring of g.rings) {
    ctx.save(); ctx.strokeStyle = ring.color; ctx.lineWidth = ring.thick * HAZARD_VISUAL_SCALE; ctx.shadowBlur = 16; ctx.shadowColor = ring.color;
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

  // Clock hands — visual width scaled; hitbox (hand.wid) unchanged for collision
  for (const hand of g.clockHands) {
    const ex2 = hand.cx + Math.cos(hand.angle) * hand.len;
    const ey2 = hand.cy + Math.sin(hand.angle) * hand.len;
    const vhw = hand.wid * HAZARD_VISUAL_SCALE;
    ctx.save(); ctx.strokeStyle = hand.color; ctx.lineWidth = vhw; ctx.lineCap = 'round';
    ctx.shadowBlur = hand.warming ? 6 : 22; ctx.shadowColor = hand.color;
    ctx.beginPath(); ctx.moveTo(hand.cx, hand.cy); ctx.lineTo(ex2, ey2); ctx.stroke();
    ctx.fillStyle = hand.color; ctx.beginPath(); ctx.arc(hand.cx, hand.cy, vhw * 0.7, 0, Math.PI * 2); ctx.fill();
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
    drawHeart(ctx, g.fakeSoul.x, g.fakeSoul.y - 6 * HAZARD_VISUAL_SCALE, 6 * HAZARD_VISUAL_SCALE, '#ff8833');
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
    case 'waveEnd':  renderPlaying(ctx, g, adminMode, diffIdx);  break; // frozen frame under the React overlay
    case 'bossWin':  renderBossWin(ctx, g);                      break;
    case 'gameOver': renderGameOver(ctx, g);                     break;
    case 'victory':       renderVictory(ctx, g.time);       break;
    case 'finalVictory':  renderFinalVictory(ctx, g.time); break;
  }
}

// ================================================================
// FAIRNESS VALIDATION
// ================================================================

interface FairnessIssue {
  type: 'warnTime' | 'safeGap' | 'layerCount' | 'bannedCombo' | 'missingWarning' | 'possiblyImpossible';
  message: string;
}

interface WaveFairnessResult {
  bossIdx: number;
  bossName: string;
  waveIdx: number;
  waveName: string;
  waveId: string;
  issues: FairnessIssue[];
  passed: boolean;
}

// Per-wave fairness check per the design doc rules.
// Reads wave.warnDuration, wave.safeGapFraction, and wave.layers computed by applyFairnessDebuffs.
// Returns only the list of issues found; call validateAllWaves() for the full audit.
function validateWaveFairness(wave: Wave, bossIdx: number): FairnessIssue[] {
  const issues: FairnessIssue[] = [];
  const tags = wave.patternTags ?? [];

  // ── Tier-specific thresholds ──────────────────────────────────
  const tier = bossIdx < 4 ? 0 : bossIdx < 7 ? 1 : bossIdx < 10 ? 2 : bossIdx < 15 ? 3 : 4;
  const minWarnSecs  = [0.90, 0.80, 0.70, 0.60, 0.50][tier];
  const minSafeGap   = [0.40, 0.34, 0.26, 0.20, 0.16][tier];
  const maxLayers    = [2, 3, 3, 4, 4][tier];

  // Use explicit computed fields from applyFairnessDebuffs (fallback to heuristics if missing)
  const warnDuration    = wave.warnDuration    ?? 0.50;
  const safeGapFraction = wave.safeGapFraction ?? Math.max(0, 1 - (wave.spawnRate * 12 / 438));
  const layerCount      = wave.layers          ?? tags.length;

  // ── 1. Missing warning ────────────────────────────────────────
  const hazardousTypes = ['laser', 'spiral', 'rain', 'ring', 'mirror', 'chain', 'chaos', 'pull', 'wall'];
  const isHazardousType = hazardousTypes.includes(wave.attackType);
  const hasNoWarning = wave.warningType === 'none';

  if (isHazardousType && hasNoWarning) {
    issues.push({
      type: 'missingWarning',
      message: `Attack type "${wave.attackType}" has warningType "none" — major hazards must have a visible warning`,
    });
  }
  if (wave.bulletSpeed > 160 && hasNoWarning && wave.spawnRate > 4) {
    issues.push({
      type: 'missingWarning',
      message: `Speed ${wave.bulletSpeed} + rate ${wave.spawnRate} with no warning — hazards may spawn before player can react`,
    });
  }

  // ── 2. Warning time (uses explicit warnDuration field) ────────
  if (warnDuration < minWarnSecs && isHazardousType) {
    issues.push({
      type: 'warnTime',
      message: `warnDuration ${warnDuration.toFixed(2)}s (from warningType "${wave.warningType}") is below tier-${tier + 1} minimum ${minWarnSecs}s`,
    });
  }
  // Also flag very short total wave duration regardless of warning type
  if (wave.duration < minWarnSecs * 2.5 && isHazardousType) {
    issues.push({
      type: 'warnTime',
      message: `Wave duration ${wave.duration}s too short at tier ${bossIdx + 1} for warn+react+avoid (need ≥ ${(minWarnSecs * 2.5).toFixed(1)}s)`,
    });
  }

  // ── 3. Layer count (uses explicit layers field) ───────────────
  if (layerCount > maxLayers) {
    issues.push({
      type: 'layerCount',
      message: `${layerCount} simultaneous mechanic layers exceeds tier-${tier + 1} max of ${maxLayers}`,
    });
  }

  // ── 4. Banned mechanic combos ────────────────────────────────
  const hasFlip    = tags.includes('flip')   || wave.arenaEffect === 'flip';
  const hasDense   = tags.includes('dense');
  const hasHoming  = tags.includes('homing');
  const hasFast    = wave.bulletSpeed > 175;
  const hasPull    = tags.includes('pull')   || wave.arenaEffect === 'pull';
  const hasLaser   = tags.includes('laser')  || wave.attackType === 'laser';
  const hasDark    = tags.includes('dark')   || wave.arenaEffect === 'dark';
  const hasFake    = tags.includes('fake');
  const hasShrink  = tags.includes('shrink') || wave.arenaEffect === 'shrink';
  const hasVoid    = tags.includes('void');
  const hasGlitch  = tags.includes('glitch') || wave.arenaEffect === 'glitch';
  const hasPoison  = tags.includes('poison');
  const hasDelay   = tags.includes('delay');
  const hasNarrow  = tags.includes('narrow');
  const hasChaos   = wave.attackType === 'chaos';

  if (hasFlip && hasDense) {
    issues.push({ type: 'bannedCombo', message: 'Banned: control flip + dense bullets (§design doc Mawbyte rule)' });
  }
  if (hasFlip && hasFast && wave.spawnRate >= 8) {
    issues.push({ type: 'bannedCombo', message: 'Banned: control flip + fast bullets + high spawn rate — no safe window' });
  }
  if (hasDark && hasFake && hasFast) {
    issues.push({ type: 'bannedCombo', message: 'Banned: visibility reduction + fake warnings + fast bullets simultaneously' });
  }
  if (hasPull && hasShrink && hasLaser) {
    issues.push({ type: 'bannedCombo', message: 'Banned: gravity pull + shrinking arena + dense lasers' });
  }
  if (hasPoison && hasFast && hasDense && hasGlitch) {
    issues.push({ type: 'bannedCombo', message: 'Banned: poison zones + fast bullets + dense spam + screen glitch' });
  }
  if (hasDelay && hasNarrow) {
    issues.push({ type: 'bannedCombo', message: 'Banned: delayed movement + narrow gaps — player cannot thread gap precisely' });
  }
  if (hasVoid && hasLaser && hasDense) {
    issues.push({ type: 'bannedCombo', message: 'Banned: void zones + lasers + dense bullets — too many coverage layers' });
  }

  // ── 5. Safe gap (uses explicit safeGapFraction field) ─────────
  if (safeGapFraction < minSafeGap) {
    issues.push({
      type: 'safeGap',
      message: `safeGapFraction ${safeGapFraction.toFixed(2)} < tier-${tier + 1} minimum ${minSafeGap.toFixed(2)} — bullet density may leave no escape lane`,
    });
  }
  if (hasHoming && wave.bulletSpeed > 175) {
    issues.push({
      type: 'safeGap',
      message: `Homing bullets at speed ${wave.bulletSpeed} may converge and eliminate safe gap`,
    });
  }

  // ── 6. Possibly impossible ────────────────────────────────────
  if (wave.bulletSpeed > 220 && !tags.includes('gap') && wave.attackType !== 'chain' && wave.attackType !== 'replay') {
    issues.push({
      type: 'possiblyImpossible',
      message: `Bullet speed ${wave.bulletSpeed} is extreme — verify a readable escape lane exists at all times`,
    });
  }
  if (hasChaos && wave.duration < 3.5) {
    issues.push({
      type: 'possiblyImpossible',
      message: `Chaos attack with only ${wave.duration}s — too short for the pattern to become readable`,
    });
  }
  if (wave.damage >= 40 && hasNoWarning) {
    issues.push({
      type: 'possiblyImpossible',
      message: `High damage (${wave.damage}) with no warning is extremely punishing`,
    });
  }

  return issues;
}

// Batch validation across all 20 bosses × all waves. Used by the admin audit button.
function validateAllWaves(): WaveFairnessResult[] {
  const results: WaveFairnessResult[] = [];
  for (let bi = 0; bi < BOSSES.length; bi++) {
    const boss = BOSSES[bi];
    const waves = boss.waves ?? [];
    for (let wi = 0; wi < waves.length; wi++) {
      const wave = waves[wi];
      const issues = validateWaveFairness(wave, bi);
      results.push({ bossIdx: bi, bossName: boss.name, waveIdx: wi, waveName: wave.name, waveId: wave.id, issues, passed: issues.length === 0 });
    }
  }
  return results;
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
  const [adminWaveBoss,  setAdminWaveBoss]  = useState(0);
  const [adminHpInput,   setAdminHpInput]   = useState('');
  const [adminInvPanel,  setAdminInvPanel]  = useState(false);
  const [adminSpeedMult, setAdminSpeedMult] = useState(1);

  type LbEntry = { name: string; hp: number; hits: number; ts: number };
  const [playerName,    setPlayerName]    = useState<string>(() => { try { return localStorage.getItem('soulrush_name') ?? 'PLAYER'; } catch { return 'PLAYER'; } });
  const [nameInput,     setNameInput]     = useState<string>('');
  const [waveEndVisible, setWaveEndVisible] = useState<boolean>(false);
  const [waveEndData,   setWaveEndData]   = useState<{ bossIdx: number; waveIdx: number; hp: number; hits: number } | null>(null);

  type LbRow = { id: number; playerName: string; score: number; wavesCleared: number; bossReached: number; isFullCompletion: boolean; createdAt: string };
  const [lbOpen,          setLbOpen]          = useState(false);
  const [lbRows,          setLbRows]          = useState<LbRow[]>([]);
  const [lbLoading,       setLbLoading]       = useState(false);
  const [lbHighlightName, setLbHighlightName] = useState('');
  const [congratsVisible, setCongratsVisible] = useState(false);
  const [congratsData,    setCongratsData]    = useState<{ name: string; score: number; wavesCleared: number } | null>(null);
  const finalVictoryShownRef  = useRef(false);
  const gameOverLbShownRef    = useRef(false);
  const [adminLbRows,      setAdminLbRows]      = useState<LbRow[]>([]);
  const [adminLbLoading,   setAdminLbLoading]   = useState(false);
  const [adminCompletions, setAdminCompletions] = useState<LbRow[]>([]);
  const [adminCompLoading, setAdminCompLoading] = useState(false);
  const [adminLbOpen,      setAdminLbOpen]      = useState(false);
  const [adminCompOpen,    setAdminCompOpen]    = useState(false);

  type FIssue = { type: string; message: string };
  type WFResult = { bossIdx: number; bossName: string; waveIdx: number; waveName: string; waveId: string; issues: FIssue[]; passed: boolean };
  const [fairnessResults, setFairnessResults] = useState<WFResult[]>([]);
  const [fairnessOpen,    setFairnessOpen]    = useState(false);

  type InvSlot = { id: string; stack: number };
  const [inventory,    setInventory]    = useState<InvSlot[]>([]);
  const [pendingItem,  setPendingItem]  = useState<Item | null>(null);
  const [itemToast,    setItemToast]    = useState<string>('');
  const inventoryRef = useRef<InvSlot[]>([]);
  inventoryRef.current = inventory;

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
    setInventory([]);
    setPendingItem(null);
  };

  const showToast = (msg: string) => {
    setItemToast(msg);
    setTimeout(() => setItemToast(''), 1200);
  };

  const useItem = (slotIndex: number) => {
    const inv = inventoryRef.current;
    if (slotIndex >= inv.length) return;
    const slot = inv[slotIndex];
    const itemDef = ITEMS.find(it => it.id === slot.id);
    if (!itemDef || !itemDef.usable) return;
    const g = gameRef.current;
    if (g.state !== 'playing') return;

    const newInv = inv.map((s, i) => i === slotIndex ? { ...s, stack: s.stack - 1 } : s).filter(s => s.stack > 0);
    setInventory(newInv);

    switch (itemDef.effect) {
      case 'heal8':
        g.player.hp = Math.min(P_MAX_HP, g.player.hp + 8);
        showToast('+8 HP');
        break;
      case 'heal12':
        g.player.hp = Math.min(P_MAX_HP, g.player.hp + 12);
        showToast('+12 HP');
        break;
      case 'invincible1s':
        g.player.invTimer = Math.max(g.player.invTimer, 1.5);
        showToast('Invincible!');
        break;
      case 'freezeBullets0.5s':
        g.bullets.forEach(b => { b.frozen = true; });
        setTimeout(() => { g.bullets.forEach(b => { b.frozen = false; }); }, 500);
        showToast('Bullets frozen!');
        break;
      case 'clearDangerZones':
        g.dangerZones = [];
        showToast('Danger zones cleared!');
        break;
      case 'speedBoost3s':
        g.speedBoostTimer = 3;
        showToast('Speed boost!');
        break;
      default:
        showToast('Used!');
        break;
    }
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
      if (e.key === 'q' || e.key === 'Q') { useItem(0); }
      if (e.key === 'z' || e.key === 'Z') { useItem(1); }
      if (e.key === 'Escape') { setAdminPanelOpen(false); }
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

  const ADMIN_TOKEN_VAL = 'Orcas@0112';

  const submitScoreToApi = (pName: string, score: number, waved: number, bossReached: number, isFullCompletion: boolean): Promise<LbRow | null> => {
    return fetch('/api/leaderboard', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ playerName: pName || 'PLAYER', score, wavesCleared: waved, bossReached, isFullCompletion }),
    }).then(r => r.ok ? r.json() : null).catch(() => null);
  };

  const openLeaderboard = (highlightName = '') => {
    setLbHighlightName(highlightName);
    setLbLoading(true);
    setLbOpen(true);
    fetch('/api/leaderboard')
      .then(r => r.json())
      .then((data: LbRow[]) => setLbRows(data))
      .catch(() => setLbRows([]))
      .finally(() => setLbLoading(false));
  };

  const fetchAdminLb = () => {
    setAdminLbLoading(true);
    fetch('/api/leaderboard')
      .then(r => r.json())
      .then((data: LbRow[]) => setAdminLbRows(data))
      .catch(() => setAdminLbRows([]))
      .finally(() => setAdminLbLoading(false));
  };

  const fetchAdminCompletions = () => {
    setAdminCompLoading(true);
    fetch('/api/leaderboard/completions', { headers: { 'x-admin-token': ADMIN_TOKEN_VAL } })
      .then(r => r.json())
      .then((data: LbRow[]) => setAdminCompletions(data))
      .catch(() => setAdminCompletions([]))
      .finally(() => setAdminCompLoading(false));
  };

  const continueWave = () => {
    const finalName = nameInput;
    try {
      localStorage.setItem('soulrush_name', finalName);
      if (waveEndData) {
        const key = `soulrush_lb_b${waveEndData.bossIdx}_w${waveEndData.waveIdx}`;
        const existing: LbEntry[] = JSON.parse(localStorage.getItem(key) ?? '[]');
        const updated = [...existing, { name: finalName, hp: waveEndData.hp, hits: waveEndData.hits, ts: Date.now() }]
          .sort((a, b) => b.hp - a.hp || a.hits - b.hits)
          .slice(0, 10);
        localStorage.setItem(key, JSON.stringify(updated));
      }
    } catch { /* ignore storage errors */ }
    setPlayerName(finalName);

    // Submit run score to public leaderboard (fire-and-forget)
    const g = gameRef.current;
    const currentScore = g.runScore;
    const currentWaves = g.wavesCleared;
    const currentBoss  = g.waveEndBossIdx;
    if (currentWaves > 0) {
      submitScoreToApi(finalName || 'PLAYER', currentScore, currentWaves, currentBoss, false);
    }

    // Apply pending item to inventory
    if (pendingItem) {
      setInventory(prev => {
        const existing = prev.find(s => s.id === pendingItem.id);
        if (existing && existing.stack < pendingItem.maxStack) {
          return prev.map(s => s.id === pendingItem.id ? { ...s, stack: s.stack + 1 } : s);
        } else if (!existing && prev.length < 6) {
          return [...prev, { id: pendingItem.id, stack: 1 }];
        }
        return prev;
      });
      setPendingItem(null);
    }

    setWaveEndVisible(false);
    setWaveEndData(null);
    const isBossWin = gameRef.current.waveEndIsBossWin;
    gameRef.current.waveEndIsBossWin = false;
    if (isBossWin) {
      gameRef.current.state = 'bossWin';
      gameRef.current.postBossTimer = 0;
    } else {
      gameRef.current.state = 'playing';
    }
    inputFocusedRef.current = false;
  };

  const jumpToBossWave = (bossIdx: number, waveIdx: number) => {
    const g = gameRef.current;
    jumpToBoss(g, bossIdx);
    g.atkIdx = Math.min(waveIdx, (BOSSES[bossIdx].waves?.length ?? 1) - 1);
    g.atkTimer = BOSSES[bossIdx].atkDur;
    g.phase = 0; g.phaseTimer = 0; g.spawnTimer = 0; g.spawnCount = 0;
    setInventory([]);
    setPendingItem(null);
    setWaveEndVisible(false);
  };

  const [, forceRender] = useState(0);
  const waveEndShownRef = useRef(false);
  useEffect(() => {
    const id = setInterval(() => {
      forceRender(n => n + 1);
      const g = gameRef.current;
      if (g.state === 'waveEnd' && !waveEndShownRef.current) {
        waveEndShownRef.current = true;
        const bIdx = g.waveEndBossIdx;
        const wIdx = g.waveEndWaveIdx;
        setWaveEndData({ bossIdx: bIdx, waveIdx: wIdx, hp: g.waveEndHp, hits: g.waveEndHits });
        setNameInput(prev => prev || playerName);
        setWaveEndVisible(true);

        // Award an item from this boss's rewardItemPool
        const bossConf = BOSSES[bIdx];
        const pool = bossConf.rewardItemPool ?? [];
        if (pool.length > 0) {
          const totalWaves = bossConf.attacks.length;
          const isLastWave = (wIdx === totalWaves - 1); // wIdx is 0-based index of wave just completed; last wave = totalWaves-1
          const chance = isLastWave ? 1.0 : 0.4;
          if (Math.random() < chance) {
            const pickedId = pool[Math.floor(Math.random() * pool.length)];
            const itemDef = ITEMS.find(it => it.id === pickedId);
            if (itemDef) setPendingItem(itemDef);
          }
        }
      }
      if (g.state !== 'waveEnd') {
        waveEndShownRef.current = false;
      }
      if (g.state === 'gameOver' || g.state === 'title') {
        setInventory([]);
        setPendingItem(null);
      }

      // finalVictory — show congratulations overlay and submit score once
      if (g.state === 'finalVictory' && !finalVictoryShownRef.current) {
        finalVictoryShownRef.current = true;
        const pName = g.state === 'finalVictory' ? (localStorage.getItem('soulrush_name') ?? 'PLAYER') : 'PLAYER';
        setCongratsData({ name: pName, score: g.runScore, wavesCleared: g.wavesCleared });
        setCongratsVisible(true);
        submitScoreToApi(pName, g.runScore, g.wavesCleared, BOSSES.length - 1, true);
      }
      if (g.state !== 'finalVictory') { finalVictoryShownRef.current = false; }

      // gameOver — auto-open leaderboard after 1.5 s delay
      if (g.state === 'gameOver' && g.gameOverTimer >= 1.5 && !gameOverLbShownRef.current) {
        gameOverLbShownRef.current = true;
        openLeaderboard(localStorage.getItem('soulrush_name') ?? '');
      }
      if (g.state !== 'gameOver') { gameOverLbShownRef.current = false; }
    }, 200);
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

        {/* Wave-end leaderboard overlay */}
        {waveEndVisible && waveEndData && (() => {
          const boss   = BOSSES[waveEndData.bossIdx];
          const lbKey  = `soulrush_lb_b${waveEndData.bossIdx}_w${waveEndData.waveIdx}`;
          let lbEntries: LbEntry[] = [];
          try { lbEntries = JSON.parse(localStorage.getItem(lbKey) ?? '[]'); } catch { /* ignore */ }
          const hpColor = waveEndData.hp > 60 ? '#44ff88' : waveEndData.hp > 30 ? '#ffcc00' : '#ff4444';
          return (
            <div style={OVERLAY_STYLE}>
              <div style={{ ...PANEL_STYLE, minWidth: 440, maxWidth: 540 }}>
                <div style={{ color: boss.color, fontSize: 13, fontWeight: 'bold', marginBottom: 4, textShadow: `0 0 12px ${boss.color}88` }}>
                  {boss.name}
                </div>
                <div style={{ marginBottom: 18 }}>
                  <div style={{ color: '#44ffaa', fontSize: 20, fontWeight: 'bold', letterSpacing: 3, textShadow: '0 0 16px #44ffaa88' }}>
                    WAVE {waveEndData.waveIdx + 1} SURVIVED
                  </div>
                  {boss.waves?.[waveEndData.waveIdx]?.name && (
                    <div style={{ color: boss.color, fontSize: 13, marginTop: 5, opacity: 0.85, letterSpacing: 1 }}>
                      {boss.waves[waveEndData.waveIdx].name}
                    </div>
                  )}
                </div>

                <div style={{ display: 'flex', gap: 16, marginBottom: 18, padding: '12px 16px', background: '#0a0a1a', borderRadius: 6, border: '1px solid #ffffff0f' }}>
                  <div style={{ textAlign: 'center', flex: 1 }}>
                    <div style={{ fontSize: 10, color: '#555', marginBottom: 4, letterSpacing: 1 }}>HP REMAINING</div>
                    <div style={{ fontSize: 28, fontWeight: 'bold', color: hpColor, textShadow: `0 0 12px ${hpColor}66` }}>{waveEndData.hp}</div>
                  </div>
                  <div style={{ width: 1, background: '#ffffff0f' }} />
                  <div style={{ textAlign: 'center', flex: 1 }}>
                    <div style={{ fontSize: 10, color: '#555', marginBottom: 4, letterSpacing: 1 }}>TIMES HIT</div>
                    <div style={{ fontSize: 28, fontWeight: 'bold', color: waveEndData.hits === 0 ? '#44ffaa' : '#ff8844' }}>
                      {waveEndData.hits}{waveEndData.hits === 0 ? ' ✦' : ''}
                    </div>
                  </div>
                  <div style={{ width: 1, background: '#ffffff0f' }} />
                  <div style={{ textAlign: 'center', flex: 1 }}>
                    <div style={{ fontSize: 10, color: '#555', marginBottom: 4, letterSpacing: 1 }}>RUN SCORE</div>
                    <div style={{ fontSize: 24, fontWeight: 'bold', color: '#aaccff', textShadow: '0 0 10px #aaccff66' }}>{gameRef.current.runScore}</div>
                  </div>
                </div>

                {lbEntries.length > 0 && (
                  <div style={{ marginBottom: 16 }}>
                    <div style={{ fontSize: 10, color: '#444', letterSpacing: 1, marginBottom: 6 }}>— BEST RUNS THIS WAVE —</div>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12, fontFamily: '"Courier New", monospace' }}>
                      <thead>
                        <tr style={{ color: '#444' }}>
                          <th style={{ textAlign: 'left', padding: '2px 6px', fontWeight: 'normal' }}>#</th>
                          <th style={{ textAlign: 'left', padding: '2px 6px', fontWeight: 'normal' }}>NAME</th>
                          <th style={{ textAlign: 'right', padding: '2px 6px', fontWeight: 'normal' }}>HP</th>
                          <th style={{ textAlign: 'right', padding: '2px 6px', fontWeight: 'normal' }}>HITS</th>
                        </tr>
                      </thead>
                      <tbody>
                        {lbEntries.slice(0, 5).map((e, i) => (
                          <tr key={i} style={{ color: i === 0 ? '#ffcc00' : '#777', borderTop: '1px solid #ffffff08' }}>
                            <td style={{ padding: '3px 6px' }}>{i + 1}</td>
                            <td style={{ padding: '3px 6px', maxWidth: 160, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{e.name}</td>
                            <td style={{ padding: '3px 6px', textAlign: 'right', color: e.hp > 60 ? '#44ff88' : e.hp > 30 ? '#ffcc00' : '#ff4444' }}>{e.hp}</td>
                            <td style={{ padding: '3px 6px', textAlign: 'right' }}>{e.hits}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}

                {pendingItem && (
                  <div style={{ marginBottom: 14, padding: '10px 14px', background: '#0a0a16', border: `1px solid ${pendingItem.themeColor}55`, borderRadius: 6, display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div style={{ width: 12, height: 12, borderRadius: '50%', background: pendingItem.themeColor, boxShadow: `0 0 8px ${pendingItem.themeColor}`, flexShrink: 0 }} />
                    <div>
                      <div style={{ fontSize: 10, color: '#555', letterSpacing: 1, marginBottom: 2 }}>✦ ITEM RECEIVED</div>
                      <div style={{ fontSize: 13, color: pendingItem.themeColor, fontWeight: 'bold', textShadow: `0 0 8px ${pendingItem.themeColor}88` }}>
                        {pendingItem.name} <span style={{ color: '#555', fontWeight: 'normal', fontSize: 11 }}>({pendingItem.rarity})</span>
                      </div>
                      <div style={{ fontSize: 10, color: '#666', marginTop: 2 }}>{pendingItem.description}</div>
                    </div>
                  </div>
                )}

                <div style={{ marginBottom: 14 }}>
                  <div style={{ fontSize: 10, color: '#444', letterSpacing: 1, marginBottom: 6 }}>YOUR NAME</div>
                  <input
                    type="text"
                    value={nameInput}
                    maxLength={20}
                    onChange={e => setNameInput(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter') continueWave(); }}
                    onFocus={() => { inputFocusedRef.current = true; }}
                    onBlur={() => { inputFocusedRef.current = false; }}
                    style={{ width: '100%', background: '#0a0a14', border: '1px solid #333', borderRadius: 4, color: '#aaccff', fontFamily: '"Courier New", monospace', fontSize: 14, padding: '8px 12px', outline: 'none', boxSizing: 'border-box' }}
                  />
                </div>

                <button
                  onClick={() => openLeaderboard(nameInput || playerName)}
                  style={{ ...btnStyle('#aaccff'), width: '100%', fontSize: 13, padding: '7px 0', marginBottom: 8, letterSpacing: 1 }}
                >
                  VIEW GLOBAL LEADERBOARD
                </button>

                <button
                  onClick={continueWave}
                  style={{ ...btnStyle('#44ffaa'), width: '100%', fontSize: 15, padding: '10px 0', fontWeight: 'bold', letterSpacing: 2, background: '#44ffaa11', textShadow: '0 0 10px #44ffaa88' }}
                >
                  CONTINUE ▶
                </button>
              </div>
            </div>
          );
        })()}

        {/* Title screen — LEADERBOARD button */}
        {gameRef.current.state === 'title' && (
          <div style={{ position: 'absolute', bottom: 28, left: '50%', transform: 'translateX(-50%)', display: 'flex', gap: 10 }}>
            <button
              onClick={() => openLeaderboard()}
              style={{ ...btnStyle('#ffcc00'), fontSize: 13, padding: '8px 22px', letterSpacing: 2, fontWeight: 'bold' }}
            >
              LEADERBOARD
            </button>
          </div>
        )}

        {/* Global Leaderboard overlay */}
        {lbOpen && (
          <div style={{ ...OVERLAY_STYLE, zIndex: 20 }}>
            <div style={{ ...PANEL_STYLE, minWidth: 520, maxWidth: 640 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                <div style={{ color: '#ffcc00', fontSize: 18, fontWeight: 'bold', letterSpacing: 2, textShadow: '0 0 16px #ffcc0066' }}>
                  GLOBAL LEADERBOARD
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                  {gameRef.current.state === 'gameOver' && (
                    <button
                      onClick={() => { setLbOpen(false); resetForBoss(gameRef.current, 0); gameRef.current.state = 'title'; }}
                      style={{ ...btnStyle('#44ffaa'), fontSize: 13, padding: '5px 16px', fontWeight: 'bold' }}
                    >
                      Play Again
                    </button>
                  )}
                  <button style={{ ...btnStyle('#555'), fontSize: 15, padding: '2px 10px' }} onClick={() => setLbOpen(false)}>✕</button>
                </div>
              </div>
              {lbLoading ? (
                <div style={{ textAlign: 'center', color: '#555', padding: 40, fontSize: 13 }}>Loading...</div>
              ) : lbRows.length === 0 ? (
                <div style={{ textAlign: 'center', color: '#444', padding: 40, fontSize: 13 }}>No entries yet. Be the first!</div>
              ) : (
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13, fontFamily: '"Courier New", monospace' }}>
                  <thead>
                    <tr style={{ color: '#444', borderBottom: '1px solid #ffffff0f' }}>
                      <th style={{ textAlign: 'left', padding: '4px 8px', fontWeight: 'normal' }}>#</th>
                      <th style={{ textAlign: 'left', padding: '4px 8px', fontWeight: 'normal' }}>NAME</th>
                      <th style={{ textAlign: 'right', padding: '4px 8px', fontWeight: 'normal' }}>SCORE</th>
                      <th style={{ textAlign: 'right', padding: '4px 8px', fontWeight: 'normal' }}>WAVES</th>
                      <th style={{ textAlign: 'right', padding: '4px 8px', fontWeight: 'normal' }}>DATE</th>
                    </tr>
                  </thead>
                  <tbody>
                    {lbRows.map((row, i) => {
                      const isHighlight = lbHighlightName && row.playerName === lbHighlightName;
                      return (
                        <tr key={row.id} style={{
                          color: isHighlight ? '#ffcc00' : i === 0 ? '#aaccff' : '#888',
                          background: isHighlight ? '#ffcc0010' : 'transparent',
                          borderTop: '1px solid #ffffff06',
                        }}>
                          <td style={{ padding: '4px 8px', fontWeight: i < 3 ? 'bold' : 'normal' }}>{i + 1}</td>
                          <td style={{ padding: '4px 8px', maxWidth: 180, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {row.isFullCompletion ? '★ ' : ''}{row.playerName}
                          </td>
                          <td style={{ padding: '4px 8px', textAlign: 'right', color: isHighlight ? '#ffcc00' : '#aaccff', fontWeight: 'bold' }}>{row.score.toLocaleString()}</td>
                          <td style={{ padding: '4px 8px', textAlign: 'right' }}>{row.wavesCleared}</td>
                          <td style={{ padding: '4px 8px', textAlign: 'right', color: '#555', fontSize: 11 }}>
                            {new Date(row.createdAt).toLocaleDateString()}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
              <div style={{ marginTop: 16, display: 'flex', justifyContent: 'center' }}>
                <button onClick={() => openLeaderboard(lbHighlightName)} style={{ ...btnStyle('#444'), fontSize: 12, padding: '5px 18px' }}>
                  ↻ Refresh
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Congratulations overlay — final victory */}
        {congratsVisible && congratsData && (
          <div style={{ ...OVERLAY_STYLE, zIndex: 30, background: 'rgba(0,0,0,0.97)', flexDirection: 'column', textAlign: 'center', fontFamily: '"Courier New", monospace' }}>
            {/* Rainbow flash */}
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} style={{ position: 'absolute', inset: 0, background: `hsla(${i * 45},100%,55%,0.018)`, pointerEvents: 'none' }} />
            ))}
            <div style={{ position: 'relative', maxWidth: 560, padding: '0 24px' }}>
              <div style={{ fontSize: 11, color: '#555', letterSpacing: 4, marginBottom: 14 }}>SOUL RUSH</div>
              <div style={{ fontSize: 42, fontWeight: 'bold', color: '#ffcc00', letterSpacing: 4, textShadow: '0 0 40px #ffcc0088, 0 0 80px #ffcc0044', marginBottom: 8 }}>
                CONGRATULATIONS
              </div>
              <div style={{ fontSize: 18, color: '#00ffcc', marginBottom: 6, textShadow: '0 0 20px #00ffcc66' }}>
                {congratsData.name}
              </div>
              <div style={{ fontSize: 13, color: '#555', marginBottom: 28 }}>You are a Soul Rush legend.</div>
              <div style={{ display: 'flex', gap: 20, justifyContent: 'center', marginBottom: 28 }}>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: 10, color: '#444', marginBottom: 4, letterSpacing: 1 }}>FINAL SCORE</div>
                  <div style={{ fontSize: 34, fontWeight: 'bold', color: '#ffcc00', textShadow: '0 0 20px #ffcc0066' }}>{congratsData.score.toLocaleString()}</div>
                </div>
                <div style={{ width: 1, background: '#333' }} />
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: 10, color: '#444', marginBottom: 4, letterSpacing: 1 }}>WAVES CLEARED</div>
                  <div style={{ fontSize: 34, fontWeight: 'bold', color: '#00ffcc', textShadow: '0 0 20px #00ffcc44' }}>{congratsData.wavesCleared}</div>
                </div>
              </div>
              <div style={{ display: 'flex', gap: 10, justifyContent: 'center' }}>
                <button
                  onClick={() => { setCongratsVisible(false); resetForBoss(gameRef.current, 0); gameRef.current.state = 'title'; }}
                  style={{ ...btnStyle('#44ffaa'), fontSize: 14, padding: '10px 28px', fontWeight: 'bold', letterSpacing: 2 }}
                >
                  Play Again
                </button>
                <button
                  onClick={() => { setCongratsVisible(false); openLeaderboard(congratsData.name); }}
                  style={{ ...btnStyle('#ffcc00'), fontSize: 14, padding: '10px 28px', fontWeight: 'bold', letterSpacing: 1 }}
                >
                  View Leaderboard
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Item HUD — bottom-right of arena, visible during playing & waveEnd */}
        {(gameRef.current.state === 'playing' || gameRef.current.state === 'waveEnd') && inventory.length > 0 && (
          <div style={{ position: 'absolute', bottom: 10, right: 10, display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4, pointerEvents: 'auto' }}>
            <div style={{ fontSize: 9, color: '#444', fontFamily: '"Courier New", monospace', letterSpacing: 1, marginBottom: 2 }}>
              ITEMS &nbsp;<span style={{ color: '#333' }}>[Q] slot 1 · [Z] slot 2</span>
            </div>
            <div style={{ display: 'flex', gap: 5 }}>
              {inventory.slice(0, 6).map((slot, i) => {
                const itemDef = ITEMS.find(it => it.id === slot.id);
                if (!itemDef) return null;
                return (
                  <div
                    key={slot.id}
                    title={`${itemDef.name}: ${itemDef.description}`}
                    onClick={() => useItem(i)}
                    style={{
                      width: 52, height: 52,
                      border: `2px solid ${itemDef.themeColor}`,
                      borderRadius: 6,
                      background: `${itemDef.themeColor}18`,
                      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                      cursor: itemDef.usable ? 'pointer' : 'default',
                      position: 'relative',
                      boxShadow: `0 0 8px ${itemDef.themeColor}44`,
                      opacity: itemDef.usable ? 1 : 0.6,
                    }}
                  >
                    {/* Icon shape */}
                    <svg width="20" height="20" viewBox="0 0 20 20" style={{ marginBottom: 2 }}>
                      {itemDef.iconShape === 'circle' && <circle cx="10" cy="10" r="7" fill="none" stroke={itemDef.themeColor} strokeWidth="2.5" />}
                      {itemDef.iconShape === 'ring' && <><circle cx="10" cy="10" r="8" fill="none" stroke={itemDef.themeColor} strokeWidth="1.5" /><circle cx="10" cy="10" r="4" fill="none" stroke={itemDef.themeColor} strokeWidth="1.5" /></>}
                      {itemDef.iconShape === 'drop' && <path d="M10 2 C10 2 4 9 4 13 a6 6 0 0 0 12 0 C16 9 10 2 10 2Z" fill="none" stroke={itemDef.themeColor} strokeWidth="2" />}
                      {itemDef.iconShape === 'star' && <polygon points="10,1 12.4,7.3 19,7.3 13.7,11.5 15.7,18 10,14 4.3,18 6.3,11.5 1,7.3 7.6,7.3" fill="none" stroke={itemDef.themeColor} strokeWidth="1.5" />}
                      {itemDef.iconShape === 'gem' && <polygon points="10,2 17,8 10,18 3,8" fill="none" stroke={itemDef.themeColor} strokeWidth="2" />}
                      {itemDef.iconShape === 'wave' && <path d="M2 10 Q5 4 8 10 Q11 16 14 10 Q17 4 18 8" fill="none" stroke={itemDef.themeColor} strokeWidth="2" strokeLinecap="round" />}
                      {itemDef.iconShape === 'wing' && <path d="M2 14 Q3 8 10 7 Q16 6 18 4 Q16 11 10 12 Q6 13 2 14Z" fill="none" stroke={itemDef.themeColor} strokeWidth="1.8" strokeLinejoin="round" />}
                      {itemDef.iconShape === 'cloud' && <path d="M5 13 Q3 13 3 11 Q3 9 5 9 Q5 6 8 6 Q10 4 12 6 Q15 6 15 9 Q17 9 17 11 Q17 13 15 13Z" fill="none" stroke={itemDef.themeColor} strokeWidth="1.8" />}
                      {itemDef.iconShape === 'mask' && <><path d="M4 7 Q4 3 10 3 Q16 3 16 7 L16 13 Q13 17 10 17 Q7 17 4 13Z" fill="none" stroke={itemDef.themeColor} strokeWidth="1.8" /><line x1="7" y1="9" x2="8" y2="9" stroke={itemDef.themeColor} strokeWidth="2" strokeLinecap="round" /><line x1="12" y1="9" x2="13" y2="9" stroke={itemDef.themeColor} strokeWidth="2" strokeLinecap="round" /></>}
                      {itemDef.iconShape === 'lens' && <><ellipse cx="10" cy="10" rx="7" ry="5" fill="none" stroke={itemDef.themeColor} strokeWidth="1.8" /><line x1="10" y1="5" x2="10" y2="15" stroke={itemDef.themeColor} strokeWidth="1.2" strokeDasharray="2 2" /></>}
                      {itemDef.iconShape === 'spark' && <path d="M10 2 L11.5 8 L17 6 L12.5 10 L17 14 L11.5 12 L10 18 L8.5 12 L3 14 L7.5 10 L3 6 L8.5 8Z" fill="none" stroke={itemDef.themeColor} strokeWidth="1.5" strokeLinejoin="round" />}
                      {itemDef.iconShape === 'tape' && <><rect x="3" y="6" width="14" height="9" rx="2" fill="none" stroke={itemDef.themeColor} strokeWidth="1.8" /><circle cx="7" cy="10.5" r="2" fill="none" stroke={itemDef.themeColor} strokeWidth="1.4" /><circle cx="13" cy="10.5" r="2" fill="none" stroke={itemDef.themeColor} strokeWidth="1.4" /><line x1="9" y1="10.5" x2="11" y2="10.5" stroke={itemDef.themeColor} strokeWidth="1.2" /></>}
                      {itemDef.iconShape === 'rock' && <path d="M5 15 Q3 12 4 9 Q6 5 10 4 Q14 4 16 8 Q18 12 16 15Z" fill="none" stroke={itemDef.themeColor} strokeWidth="1.8" />}
                      {itemDef.iconShape === 'bird' && <path d="M10 3 Q14 2 16 5 L13 7 Q14 10 12 12 L10 17 L8 12 Q6 10 7 7 L4 5 Q6 2 10 3Z" fill="none" stroke={itemDef.themeColor} strokeWidth="1.8" strokeLinejoin="round" />}
                      {itemDef.iconShape === 'key' && <><circle cx="7" cy="8" r="4" fill="none" stroke={itemDef.themeColor} strokeWidth="1.8" /><line x1="10" y1="9" x2="17" y2="16" stroke={itemDef.themeColor} strokeWidth="1.8" strokeLinecap="round" /><line x1="14" y1="13" x2="16" y2="15" stroke={itemDef.themeColor} strokeWidth="1.8" strokeLinecap="round" /></>}
                      {itemDef.iconShape === 'thread' && <><circle cx="10" cy="10" r="6" fill="none" stroke={itemDef.themeColor} strokeWidth="1.5" /><path d="M10 4 Q14 7 14 10 Q14 13 10 16 Q6 13 6 10 Q6 7 10 4Z" fill="none" stroke={itemDef.themeColor} strokeWidth="1.2" /><line x1="10" y1="1" x2="10" y2="4" stroke={itemDef.themeColor} strokeWidth="1.8" strokeLinecap="round" /></>}
                      {itemDef.iconShape === 'vial' && <><path d="M8 2 L8 11 Q8 16 10 16 Q12 16 12 11 L12 2Z" fill="none" stroke={itemDef.themeColor} strokeWidth="1.8" /><line x1="7" y1="2" x2="13" y2="2" stroke={itemDef.themeColor} strokeWidth="2" strokeLinecap="round" /><line x1="8" y1="12" x2="12" y2="12" stroke={itemDef.themeColor} strokeWidth="1.2" /></>}
                      {itemDef.iconShape === 'ghost' && <path d="M4 18 L4 9 Q4 3 10 3 Q16 3 16 9 L16 18 L13 15 L10 18 L7 15Z" fill="none" stroke={itemDef.themeColor} strokeWidth="1.8" strokeLinejoin="round" />}
                    </svg>
                    <div style={{ fontSize: 8, color: itemDef.themeColor, fontFamily: '"Courier New", monospace', letterSpacing: 0, textAlign: 'center', lineHeight: 1, maxWidth: 46, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {itemDef.name.length > 8 ? itemDef.name.slice(0, 8) : itemDef.name}
                    </div>
                    {/* Slot label for quick keys */}
                    {i < 2 && <div style={{ position: 'absolute', top: 2, left: 4, fontSize: 8, color: '#555', fontFamily: 'monospace' }}>{i === 0 ? 'Q' : 'Z'}</div>}
                    {/* Stack badge */}
                    {slot.stack > 1 && (
                      <div style={{ position: 'absolute', top: 2, right: 4, fontSize: 9, color: '#fff', fontFamily: 'monospace', fontWeight: 'bold' }}>
                        {slot.stack}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Item use toast */}
        {itemToast && (
          <div style={{ position: 'absolute', bottom: 70, right: 10, background: '#001a14', border: '1px solid #44ffaa', color: '#44ffaa', fontFamily: '"Courier New", monospace', fontSize: 13, fontWeight: 'bold', padding: '6px 14px', borderRadius: 4, letterSpacing: 1, boxShadow: '0 0 12px #44ffaa44' }}>
            {itemToast}
          </div>
        )}

        {/* Admin panel overlay */}
        {adminPanelOpen && (
          <div style={OVERLAY_STYLE}>
            <div style={{ ...PANEL_STYLE, padding: '12px 16px', minWidth: 460, maxWidth: 580, maxHeight: 'min(88vh, 560px)', overflowY: 'auto' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                <div style={{ color: '#00ffcc', fontSize: 16, fontWeight: 'bold', letterSpacing: 2, textShadow: '0 0 14px #00ffcc88' }}>
                  ⚙ ADMIN PANEL
                </div>
                <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                  <span style={{ color: '#333', fontSize: 10, fontFamily: 'monospace' }}>ESC to close</span>
                  <button style={{ ...btnStyle('#555'), fontSize: 13, padding: '1px 8px' }} onClick={() => setAdminPanelOpen(false)}>✕</button>
                </div>
              </div>

              <div style={{ background: '#0d0d1a', border: '1px solid #00ffcc33', borderRadius: 5, padding: '6px 12px', marginBottom: 10, textAlign: 'center' }}>
                <span style={{ color: '#666', fontSize: 11 }}>DIFFICULTY — </span>
                <span style={{ color: '#00ffcc', fontSize: 13, fontWeight: 'bold' }}>
                  {DIFF_LEVELS[diffIdx].label} &nbsp;{DIFF_LEVELS[diffIdx].mult}×
                </span>
              </div>

              <div style={{ display: 'flex', gap: 8, marginBottom: 10 }}>
                <button style={{ flex: 1, ...btnStyle('#44aaff'), fontSize: 12, padding: '6px 0', fontWeight: 'bold' }} onClick={() => { if (diffIdx > 0) setDiffIdx(diffIdx - 1); }}>◀ Easier</button>
                <button style={{ flex: 1, ...btnStyle('#ff4444'), fontSize: 12, padding: '6px 0', fontWeight: 'bold' }} onClick={() => { if (diffIdx < DIFF_LEVELS.length - 1) setDiffIdx(diffIdx + 1); }}>Harder ▶</button>
              </div>

              <div style={{ marginBottom: 10 }}>
                <div style={{ fontSize: 10, color: '#555', marginBottom: 5 }}>SELECT LEVEL</div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                  {DIFF_LEVELS.map((dl, i) => (
                    <button key={dl.label} style={{ ...btnStyle(i === diffIdx ? '#00ffcc' : '#444'), background: i === diffIdx ? '#00ffcc22' : 'transparent', fontSize: 11, padding: '4px 10px' }} onClick={() => setDiffIdx(i)}>
                      {dl.label} {dl.mult}×
                    </button>
                  ))}
                </div>
              </div>

              <div style={{ marginBottom: 10 }}>
                <div style={{ fontSize: 10, color: '#555', marginBottom: 5 }}>BOSS SELECT — click to jump (wave 1)</div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                  {BOSSES.map((b, i) => (
                    <button key={b.name} style={{ ...btnStyle(b.color), fontSize: 10, padding: '4px 8px', fontWeight: 'bold' }}
                      onClick={() => { setAdminWaveBoss(i); jumpBoss(i); }}>
                      {i + 1}. {b.name}
                    </button>
                  ))}
                </div>
              </div>

              {/* Wave Jump */}
              <div style={{ marginBottom: 10 }}>
                <div style={{ fontSize: 10, color: '#555', marginBottom: 4 }}>
                  WAVE JUMP — <span style={{ color: BOSSES[adminWaveBoss].color }}>{BOSSES[adminWaveBoss].name}</span>
                  {' · pick boss above'}
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                  {(BOSSES[adminWaveBoss].waves ?? []).map((_w, wi) => (
                    <button key={wi} style={{ ...btnStyle(BOSSES[adminWaveBoss].color), fontSize: 10, padding: '3px 7px', minWidth: 28, fontWeight: 'bold' }}
                      onClick={() => { jumpToBossWave(adminWaveBoss, wi); }}>
                      W{wi + 1}
                    </button>
                  ))}
                </div>
              </div>

              {/* Live controls */}
              <div style={{ marginBottom: 10, display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                <div style={{ fontSize: 10, color: '#555', width: '100%', marginBottom: 1 }}>LIVE CONTROLS</div>

                <button style={{ ...btnStyle(adminInvPanel ? '#00ff88' : '#444'), background: adminInvPanel ? '#00ff8822' : 'transparent', fontSize: 11, padding: '4px 10px', fontWeight: 'bold' }}
                  onClick={() => {
                    const next = !adminInvPanel;
                    setAdminInvPanel(next);
                    gameRef.current.adminInvincible = next;
                  }}>
                  {adminInvPanel ? '🛡 INV: ON' : '🛡 INV: off'}
                </button>

                <button style={{ ...btnStyle('#ff8844'), fontSize: 11, padding: '4px 10px', fontWeight: 'bold' }}
                  onClick={() => clearEntities(gameRef.current)}>
                  💥 Clear
                </button>

                <button style={{ ...btnStyle('#44ccff'), fontSize: 11, padding: '4px 10px', fontWeight: 'bold' }}
                  onClick={() => { const g = gameRef.current; g.atkTimer = 0; g.atkFinishTimer = 0; }}>
                  ⏭ Next Wave
                </button>

                <button style={{ ...btnStyle('#cc88ff'), fontSize: 11, padding: '4px 10px', fontWeight: 'bold' }}
                  onClick={() => {
                    const g = gameRef.current;
                    clearEntities(g);
                    g.atkTimer = BOSSES[g.bossIdx].atkDur;
                    g.phase = 0; g.phaseTimer = 0; g.spawnTimer = 0; g.spawnCount = 0;
                    g.hitsThisWave = 0; g.waveStartHp = g.player.hp;
                  }}>
                  🔄 Restart
                </button>

                <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
                  <input
                    type="number" min={1} max={100} placeholder="HP"
                    value={adminHpInput}
                    onChange={e => setAdminHpInput(e.target.value)}
                    onKeyDown={e => {
                      if (e.key === 'Enter') {
                        const v = Math.min(100, Math.max(1, Number(adminHpInput)));
                        if (!isNaN(v)) gameRef.current.player.hp = v;
                      }
                    }}
                    style={{ width: 50, background: '#0a0a14', border: '1px solid #333', borderRadius: 4, color: '#aac', fontFamily: 'monospace', fontSize: 11, padding: '4px 6px', outline: 'none' }}
                  />
                  <button style={{ ...btnStyle('#ff4466'), fontSize: 11, padding: '4px 8px' }}
                    onClick={() => { const v = Math.min(100, Math.max(1, Number(adminHpInput))); if (!isNaN(v)) gameRef.current.player.hp = v; }}>
                    Set HP
                  </button>
                  <button style={{ ...btnStyle('#ff4466'), fontSize: 11, padding: '4px 8px' }}
                    onClick={() => { gameRef.current.player.hp = 100; }}>
                    +100
                  </button>
                </div>
              </div>

              {/* Bullet speed */}
              <div style={{ marginBottom: 10 }}>
                <div style={{ fontSize: 10, color: '#555', marginBottom: 4 }}>BULLET SPEED</div>
                <div style={{ display: 'flex', gap: 5 }}>
                  {[0.5, 1, 2].map(m => (
                    <button key={m} style={{ ...btnStyle(adminSpeedMult === m ? '#ffff44' : '#444'), background: adminSpeedMult === m ? '#ffff4422' : 'transparent', fontSize: 11, padding: '4px 14px', fontWeight: 'bold' }}
                      onClick={() => { setAdminSpeedMult(m); gameRef.current.debugSpeedMult = m; }}>
                      {m === 0.5 ? '½×' : m === 1 ? '1×' : '2×'}
                    </button>
                  ))}
                </div>
              </div>

              {/* Leaderboard management */}
              <div style={{ marginBottom: 18 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                  <div style={{ fontSize: 11, color: '#555' }}>LEADERBOARD (TOP 20)</div>
                  <div style={{ display: 'flex', gap: 6 }}>
                    <button style={{ ...btnStyle('#aaccff'), fontSize: 11, padding: '3px 10px' }} onClick={() => { setAdminLbOpen(v => !v); if (!adminLbOpen) fetchAdminLb(); }}>
                      {adminLbOpen ? 'Hide' : 'Show'}
                    </button>
                    {adminLbOpen && <button style={{ ...btnStyle('#444'), fontSize: 11, padding: '3px 10px' }} onClick={fetchAdminLb}>↻</button>}
                    {adminLbOpen && (
                      <button style={{ ...btnStyle('#ff4444'), fontSize: 11, padding: '3px 10px' }} onClick={() => {
                        if (!confirm('Wipe entire leaderboard?')) return;
                        fetch('/api/leaderboard', { method: 'DELETE', headers: { 'x-admin-token': ADMIN_TOKEN_VAL } })
                          .then(() => fetchAdminLb()).catch(() => {});
                      }}>Clear All</button>
                    )}
                  </div>
                </div>
                {adminLbOpen && (
                  adminLbLoading ? <div style={{ color: '#555', fontSize: 12, padding: '8px 0' }}>Loading…</div> :
                  adminLbRows.length === 0 ? <div style={{ color: '#444', fontSize: 12, padding: '8px 0' }}>No entries.</div> :
                  <div style={{ maxHeight: 200, overflowY: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11, fontFamily: '"Courier New", monospace' }}>
                      <thead>
                        <tr style={{ color: '#444' }}>
                          <th style={{ textAlign: 'left', padding: '2px 6px', fontWeight: 'normal' }}>#</th>
                          <th style={{ textAlign: 'left', padding: '2px 6px', fontWeight: 'normal' }}>NAME</th>
                          <th style={{ textAlign: 'right', padding: '2px 6px', fontWeight: 'normal' }}>SCORE</th>
                          <th style={{ textAlign: 'right', padding: '2px 6px', fontWeight: 'normal' }}>W</th>
                          <th style={{ padding: '2px 4px' }}></th>
                        </tr>
                      </thead>
                      <tbody>
                        {adminLbRows.map((row, i) => (
                          <tr key={row.id} style={{ color: '#777', borderTop: '1px solid #ffffff06' }}>
                            <td style={{ padding: '2px 6px' }}>{i + 1}</td>
                            <td style={{ padding: '2px 6px', maxWidth: 120, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{row.isFullCompletion ? '★ ' : ''}{row.playerName}</td>
                            <td style={{ padding: '2px 6px', textAlign: 'right', color: '#aaccff' }}>{row.score.toLocaleString()}</td>
                            <td style={{ padding: '2px 6px', textAlign: 'right' }}>{row.wavesCleared}</td>
                            <td style={{ padding: '2px 4px' }}>
                              <button style={{ ...btnStyle('#ff4444'), fontSize: 10, padding: '1px 6px' }} onClick={() => {
                                fetch(`/api/leaderboard/${row.id}`, { method: 'DELETE', headers: { 'x-admin-token': ADMIN_TOKEN_VAL } })
                                  .then(() => fetchAdminLb()).catch(() => {});
                              }}>✕</button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              {/* Recent completions */}
              <div style={{ marginBottom: 18 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                  <div style={{ fontSize: 11, color: '#555' }}>RECENT FULL COMPLETIONS</div>
                  <div style={{ display: 'flex', gap: 6 }}>
                    <button style={{ ...btnStyle('#ffcc00'), fontSize: 11, padding: '3px 10px' }} onClick={() => { setAdminCompOpen(v => !v); if (!adminCompOpen) fetchAdminCompletions(); }}>
                      {adminCompOpen ? 'Hide' : 'Show'}
                    </button>
                    {adminCompOpen && <button style={{ ...btnStyle('#444'), fontSize: 11, padding: '3px 10px' }} onClick={fetchAdminCompletions}>↻</button>}
                  </div>
                </div>
                {adminCompOpen && (
                  adminCompLoading ? <div style={{ color: '#555', fontSize: 12, padding: '8px 0' }}>Loading…</div> :
                  adminCompletions.length === 0 ? <div style={{ color: '#444', fontSize: 12, padding: '8px 0' }}>No full completions yet.</div> :
                  <div>
                    {adminCompletions.map(row => (
                      <div key={row.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 8px', borderBottom: '1px solid #ffffff06', fontSize: 11, fontFamily: 'monospace' }}>
                        <span style={{ color: '#ffcc00', fontWeight: 'bold' }}>★ {row.playerName}</span>
                        <span style={{ color: '#aaccff' }}>{row.score.toLocaleString()}</span>
                        <span style={{ color: '#555' }}>{new Date(row.createdAt).toLocaleString()}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Fairness Audit */}
              <div style={{ marginBottom: 16 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                  <div style={{ fontSize: 11, color: '#555' }}>WAVE FAIRNESS AUDIT</div>
                  <div style={{ display: 'flex', gap: 6 }}>
                    <button
                      style={{ ...btnStyle('#cc88ff'), fontSize: 11, padding: '3px 10px' }}
                      onClick={() => {
                        const r = validateAllWaves();
                        setFairnessResults(r);
                        setFairnessOpen(true);
                      }}
                    >
                      Run Audit
                    </button>
                    {fairnessOpen && (
                      <button style={{ ...btnStyle('#444'), fontSize: 11, padding: '3px 10px' }} onClick={() => setFairnessOpen(v => !v)}>
                        {fairnessOpen ? 'Hide' : 'Show'}
                      </button>
                    )}
                    {fairnessResults.length > 0 && (
                      <button
                        style={{ ...btnStyle('#44aaff'), fontSize: 11, padding: '3px 10px' }}
                        onClick={() => {
                          const blob = new Blob([JSON.stringify(fairnessResults, null, 2)], { type: 'application/json' });
                          const url = URL.createObjectURL(blob);
                          const a = document.createElement('a');
                          a.href = url; a.download = 'soulrush-fairness-audit.json'; a.click();
                          URL.revokeObjectURL(url);
                        }}
                      >
                        Export JSON
                      </button>
                    )}
                  </div>
                </div>
                {fairnessOpen && fairnessResults.length > 0 && (() => {
                  const failing = fairnessResults.filter(r => !r.passed);
                  const passing = fairnessResults.filter(r => r.passed);
                  const allIssues = fairnessResults.flatMap(r => r.issues);
                  const totalIssues = allIssues.length;
                  const countOf = (t: string) => allIssues.filter(i => i.type === t).length;
                  const issueTypes: Array<{ type: string; label: string; color: string }> = [
                    { type: 'bannedCombo',       label: 'banned combos',      color: '#ff4444' },
                    { type: 'possiblyImpossible', label: 'impossible',         color: '#ff4444' },
                    { type: 'missingWarning',    label: 'no warning',         color: '#ffaa44' },
                    { type: 'warnTime',          label: 'short warn time',    color: '#ffaa44' },
                    { type: 'layerCount',        label: 'too many layers',    color: '#cc88ff' },
                    { type: 'safeGap',           label: 'no safe gap',        color: '#cc88ff' },
                  ];
                  return (
                    <div>
                      <div style={{ display: 'flex', gap: 12, marginBottom: 6, fontSize: 11, fontFamily: 'monospace', flexWrap: 'wrap' }}>
                        <span style={{ color: failing.length > 0 ? '#ff6644' : '#44ff88', fontWeight: 'bold' }}>
                          {fairnessResults.length} checked
                        </span>
                        <span style={{ color: '#555' }}>·</span>
                        <span style={{ color: failing.length > 0 ? '#ff6644' : '#44ff88', fontWeight: 'bold' }}>
                          {failing.length} flagged
                        </span>
                        <span style={{ color: '#555' }}>·</span>
                        <span style={{ color: '#44ff88' }}>{passing.length} clean</span>
                        <span style={{ color: '#555' }}>·</span>
                        <span style={{ color: '#cc88ff' }}>{totalIssues} issues total</span>
                      </div>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px 10px', marginBottom: 8, fontSize: 10, fontFamily: 'monospace', paddingLeft: 4 }}>
                        {issueTypes.filter(it => countOf(it.type) > 0).map(it => (
                          <span key={it.type} style={{ color: it.color }}>
                            {countOf(it.type)}× {it.label}
                          </span>
                        ))}
                      </div>
                      {failing.length === 0 ? (
                        <div style={{ color: '#44ff88', fontSize: 11, padding: '6px 0' }}>All waves passed fairness checks.</div>
                      ) : (
                        <div style={{ maxHeight: 220, overflowY: 'auto' }}>
                          {failing.map((r, i) => (
                            <div key={i} style={{ marginBottom: 8, padding: '6px 8px', background: '#140a0a', border: '1px solid #ff444422', borderRadius: 4 }}>
                              <div style={{ display: 'flex', gap: 6, marginBottom: 3 }}>
                                <span style={{ color: BOSSES[r.bossIdx].color, fontSize: 10, fontWeight: 'bold', fontFamily: 'monospace' }}>
                                  B{r.bossIdx + 1} W{r.waveIdx + 1}
                                </span>
                                <span style={{ color: '#888', fontSize: 10, fontFamily: 'monospace', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 200 }}>
                                  {r.waveName}
                                </span>
                              </div>
                              {r.issues.map((issue, j) => {
                                const issueColor = issue.type === 'bannedCombo' || issue.type === 'possiblyImpossible' ? '#ff4444' :
                                  issue.type === 'missingWarning' ? '#ffaa44' : '#cc88ff';
                                return (
                                  <div key={j} style={{ fontSize: 10, color: issueColor, fontFamily: 'monospace', marginTop: 2, paddingLeft: 8 }}>
                                    [{issue.type}] {issue.message}
                                  </div>
                                );
                              })}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })()}
              </div>

              <div style={{ fontSize: 11, color: '#444', borderTop: '1px solid #222', paddingTop: 12 }}>
                Keyboard: &nbsp;<span style={{ color: '#666' }}>1–9</span> boss · <span style={{ color: '#666' }}>shift+1–0</span> boss 11–20 · <span style={{ color: '#666' }}>E/F</span> diff · <span style={{ color: '#666' }}>I</span> inv · <span style={{ color: '#666' }}>C</span> clr · <span style={{ color: '#666' }}>H</span> hp · <span style={{ color: '#666' }}>N</span> next · <span style={{ color: '#666' }}>B</span> restart
              </div>
            </div>
          </div>
        )}

        {/* Boss guide overlay */}
        {bossGuideOpen && (
          <div style={OVERLAY_STYLE}>
            <div style={{ ...PANEL_STYLE, maxWidth: 560, maxHeight: '90vh', overflowY: 'auto' }}>
              <div style={{ color: '#cc44ff', fontSize: 18, marginBottom: 16, fontWeight: 'bold' }}>BOSS GUIDE — {BOSSES.length} BOSSES</div>
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
