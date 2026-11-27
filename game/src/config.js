// Every tuned number for Turkey Run: the logical canvas, the turkey's arc, the farmer's pursuit,
// the three legs of the escape (farmyard, barn, kitchen) and the autumn palette.
// Plain data only, so the simulation, the renderer and the screenshot scenes all read the same table.

/** Logical playfield, drawn 1:1 then scaled to fit the window. */
export const FIELD = {
  width: 1280,
  height: 800,
  /** The ground line: everything below is dirt, straw or kitchen tile. */
  groundY: 660,
};

export const GROUND_Y = FIELD.groundY;

/** Fixed simulation step; the loop runs whole steps of this length. */
export const STEP = 1 / 120;

/** World pixels per metre of the distance readout. */
export const PX_PER_METRE = 14;

/** The turkey runs in place at a fixed screen x while the world scrolls past it. */
export const TURKEY = {
  screenX: 330,
  bodyW: 92,
  bodyH: 96,
  crouchH: 52,
  gravity: 2600,
  /** Negative is up: about 224 px of lift and 0.83 s in the air. */
  jumpVelocity: -1080,
  /** A slide keeps its full length after a tap, so a quick press is enough. */
  slideHold: 0.55,
  strideRate: 14,
};

/** The farmer behind the turkey; `gap` is how far his pitchfork stays from the turkey's tail. */
export const FARMER = {
  startGap: 124,
  minGap: 34,
  catchGap: 26,
  /** Ground he takes back each time the turkey clips something. */
  crashShock: 26,
  stumble: 0.9,
  /** Metres per second he closes while the turkey runs clean. */
  creeping: 5.0,
  /** Metres per second the turkey pulls away when it is running well. */
  release: 3.6,
};

export const RULES = {
  lives: 3,
  /** Blinking safety after a hit, so one mistake is never two. */
  mercySeconds: 1.2,
  /** The treeline past the kitchen: reaching it is the escape. */
  finishMetres: 1500,
  cornValue: 25,
  /** The kitchen oven breathes flame on this cycle. */
  flamePeriod: 2.6,
  flameSeconds: 0.9,
};

/**
 * The three stages. Each sets its scrolling speed and how fast it ramps up (`ramps`, px/s per
 * metre into the stage), its spawn cadence for obstacles, knives and corn, the shapes it throws,
 * how often one hangs high enough to slide under (`highs`), and how hard the farmer presses:
 * `creeping` closes the gap faster and `gapCeiling` is the furthest back he will let himself fall.
 */
export const STAGES = [
  {
    key: 'farmyard',
    name: 'The Farmyard',
    subtitle: 'Out of the pen, past the fence',
    start: 0,
    end: 450,
    speed: 322,
    ramps: 0.10,
    obstacleGap: 1.90,
    knifeGap: 3.30,
    cornGap: 1.70,
    highs: 0.12,
    lowShapes: ['fence', 'hay', 'crate', 'sack'],
    highShapes: ['gate'],
    gapCeiling: 134,
    creeping: 4.5,
  },
  {
    key: 'barn',
    name: 'The Barn',
    subtitle: 'Through the dark, over the straw',
    start: 450,
    end: 1000,
    speed: 366,
    ramps: 0.12,
    obstacleGap: 1.55,
    knifeGap: 2.50,
    cornGap: 1.60,
    highs: 0.30,
    lowShapes: ['hay', 'crate', 'sack'],
    highShapes: ['beam', 'gate'],
    gapCeiling: 118,
    creeping: 5.3,
  },
  {
    key: 'kitchen',
    name: 'The Kitchen',
    subtitle: 'Past the oven, before the carving',
    start: 1000,
    end: 1500,
    speed: 408,
    ramps: 0.16,
    obstacleGap: 1.28,
    knifeGap: 1.95,
    cornGap: 1.45,
    highs: 0.40,
    lowShapes: ['oven', 'crate', 'sack'],
    highShapes: ['rack', 'beam'],
    gapCeiling: 104,
    creeping: 6.1,
  },
];

/** Which stage a distance in metres belongs to. */
export function stageIndex(metres) {
  for (let index = STAGES.length - 1; index > 0; index -= 1) {
    if (metres >= STAGES[index].start) return index;
  }
  return 0;
}

/** The stage record for a distance in metres. */
export function stageAt(metres) {
  return STAGES[stageIndex(metres)];
}

/** Autumn afternoon: amber haze, burnt-orange hills, barn wood, straw and firelight. */
export const PALETTE = {
  sky: '#f6c98a',
  skyLow: '#e9a35b',
  backdrop: '#c07a3e',
  hillFar: '#b06a34',
  hillNear: '#8d4f26',
  ground: '#6f4522',
  groundLine: '#4d2e15',
  straw: '#d9a441',
  barn: '#8e3b28',
  panel: '#2a1a0e',
  panelEdge: '#f2b544',
  text: '#fff3d6',
  muted: '#c9a97a',
  player: '#6b3a1e',
  playerDark: '#4a2712',
  head: '#8a5a2f',
  wattle: '#c0392b',
  beak: '#e8a13a',
  tail: ['#b23a2a', '#d9762b', '#f2c14e', '#8d5b2b', '#a8412c'],
  corn: '#f2c14e',
  cornLeaf: '#7d8f3a',
  knife: '#d7dfe4',
  handle: '#4a2c14',
  fire: '#f28c28',
  fireHot: '#ffe270',
  gold: '#f2b544',
  orange: '#e07b2f',
  brown: '#7a4a22',
  danger: '#d2452f',
  good: '#8fb03f',
  cream: '#ffeacb',
  ink: '#2a150a',
};

/** Local font stack only: the game loads no font files. */
export const FONT = "'Trebuchet MS', 'Segoe UI', Verdana, sans-serif";

/** Lives in the HUD; kept as a constant for the renderer's row of hearts. */
export const LIVES = RULES.lives;

/** localStorage key for the best run so far. */
export const BEST_KEY = 'turkey-run.best.v1';
