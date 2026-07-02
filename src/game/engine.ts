// Core game logic. Framework-agnostic: no DOM, no React.
// Coordinates: logical pitch 100 wide x 150 tall, y=0 is the goal line (top).
// "Closer to goal" therefore means smaller y.

export type Screen = 'menu' | 'play' | 'end';
export type Phase = 'live' | 'result';

export interface Vec {
  x: number;
  y: number;
}

export interface DefenderState {
  xBase: number;
  off: number; // depth offset from the line; a big negative = laggard playing you onside
  phase: number;
  sway: number; // individual up-down restlessness
  x: number;
  y: number;
  num: number;
}

export interface RoundState {
  lineBase: number;
  // hold/push/drop: steady lines. trap: the line springs up to catch you.
  // feint: a fake trap — up, hold, back down — to punish panic taps.
  // squeeze: you START offside; the defenders drop back past you and you
  // must hit the brief window before you drift beyond them again.
  behavior: 'hold' | 'push' | 'drop' | 'trap' | 'feint' | 'squeeze';
  lineSpeed: number; // how fast this round's line moves when it moves
  trapAt: number;
  trapped: boolean;
  trapTarget: number;
  trapsLeft: number; // high levels can spring the trap twice
  feintAt: number;
  feintPhase: 0 | 1 | 2;
  feintBase: number;
  deadAt: number | null; // when the round became unwinnable (hopelessly offside)
  closing: boolean; // defenders are running out to close you down
  drift: number; // attacker auto-jockey speed, units/s
  att: Vec;
  gk: Vec;
  carrier: Vec;
  defs: DefenderState[];
  ball: Vec | null; // only set during the result animation
}

export interface ResultSnap {
  lineY: number; // second-last opponent at the moment of the pass
  tapY: number; // attacker at the moment of the pass
  onside: boolean;
  shown: boolean;
  shotDone: boolean;
  from: Vec; // ball at the teammate's feet
  to: Vec; // where the striker collects it
  shotX: number; // corner of the goal the shot goes to
}

export interface EngineEvents {
  onRoundStart: () => void;
  onFire: () => void;
  onShot: () => void;
  onVerdict: (onside: boolean) => void;
  onGameOver: () => void;
}

export const PW = 100;
export const PH = 150;
export const ROUNDS = 10;
export const ROUND_TIME = 5; // seconds before the pass auto-fires

const rand = (a: number, b: number) => a + Math.random() * (b - a);
const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v));

export class Engine {
  screen: Screen = 'menu';
  phase: Phase = 'live';
  round = 1;
  score = 0;
  level = 0; // persistent league level: every level makes all ten rounds harder
  t = 0; // time within the live phase
  rt = 0; // time within the result phase
  R!: RoundState;
  res: ResultSnap | null = null;
  events: Partial<EngineEvents> = {};
  showHints = false; // first-ever round: label YOU / TEAMMATE / THE LINE on the pitch

  constructor() {
    // An idle round plays behind the menu as a backdrop.
    this.round = 3;
    this.newRound();
    this.screen = 'menu';
    this.round = 1;
  }

  start() {
    this.round = 1;
    this.score = 0;
    this.screen = 'play';
    this.newRound();
  }

  private difficulty(): number {
    return Math.min(this.round + this.level, 16);
  }

  newRound() {
    const d = this.difficulty();
    const nDef = d <= 2 ? 1 : d <= 6 ? 2 : 3;
    const lineBase = rand(48, 76);
    const attX = rand(32, 68);

    // The behavior mix hardens with difficulty. Squeeze rounds exist to make
    // "tap instantly every round" a losing strategy.
    const squeezeP = d >= 5 ? Math.min(0.1 + (d - 5) * 0.07, 0.5) : 0;
    const feintP = d >= 4 ? 0.14 : 0;
    const trapP = Math.min(0.12 + d * 0.06, 0.55);
    const roll = Math.random();
    const behavior: RoundState['behavior'] =
      roll < squeezeP
        ? 'squeeze'
        : roll < squeezeP + trapP
          ? 'trap'
          : roll < squeezeP + trapP + feintP
            ? 'feint'
            : roll < squeezeP + trapP + feintP + 0.2
              ? 'push'
              : roll < squeezeP + trapP + feintP + 0.32
                ? 'drop'
                : 'hold';

    const lanes =
      nDef === 1
        ? [attX + rand(-10, 10)]
        : nDef === 2
          ? [rand(22, 40), rand(58, 78)]
          : [rand(16, 30), rand(42, 58), rand(70, 84)];
    const defs: DefenderState[] = lanes.map((x, i) => ({
      xBase: x,
      off: rand(-2, 3),
      phase: rand(0, 6),
      sway: rand(0.8, 1.8),
      x,
      y: lineBase,
      num: [4, 5, 6][i],
    }));
    // Sometimes one defender lags deep and plays everyone onside —
    // this is how the "second-last defender" lesson gets taught.
    // (Not in squeeze rounds, where the starting geometry is the whole point.)
    if (behavior !== 'squeeze' && nDef >= 2 && Math.random() < 0.35) {
      defs[Math.floor(rand(0, nDef))].off = -rand(8, 16);
    }

    // Position the striker relative to where the LINE actually is (the
    // shallowest defender), not the nominal lineBase.
    const minOff = Math.min(...defs.map((df) => df.off));
    const initLine = lineBase + minOff;
    // Normal rounds: the safe gap shrinks hard with difficulty.
    // Squeeze rounds: you begin PAST the line — caught if the ball comes now.
    const gap = behavior === 'squeeze' ? -rand(3, 10) : Math.max(4, 24 - d * 2);
    const att = { x: attX, y: clamp(initLine + gap, 16, 118) };

    this.R = {
      lineBase,
      behavior,
      lineSpeed:
        behavior === 'squeeze'
          ? 12 + d * 0.8
          : behavior === 'trap'
            ? 30 + d * 1.5
            : behavior === 'push'
              ? 5 + d * 0.5
              : 0,
      trapAt: rand(0.8, Math.max(1.6, 3.2 - d * 0.12)),
      trapped: false,
      // squeeze: the line will retreat to just goal-side of you, then hold
      trapTarget:
        behavior === 'squeeze' ? att.y - rand(5, Math.max(6, 10 - d * 0.2)) - minOff : 0,
      trapsLeft: behavior === 'trap' && d >= 8 && Math.random() < 0.45 ? 1 : 0,
      feintAt: rand(0.8, 2.4),
      feintPhase: 0,
      feintBase: lineBase,
      deadAt: null,
      closing: false,
      // your striker is rapid — and gets more rapid every level
      drift: behavior === 'squeeze' ? rand(2.5, 4.5) : Math.min(5 + d * 1.1, 20),
      att,
      gk: { x: 50, y: 6 },
      carrier: { x: clamp(attX + rand(-22, 22), 12, 88), y: clamp(att.y + 28, 60, 140) },
      defs,
      ball: null,
    };
    this.t = 0;
    this.res = null;
    this.phase = 'live';
    this.events.onRoundStart?.();
  }

  // The offside law: the line is the SECOND-last opponent (the keeper counts).
  // Level with the line = onside.
  offsideLine(): number {
    const ys = [this.R.gk.y, ...this.R.defs.map((p) => p.y)].sort((a, b) => a - b);
    return ys[1];
  }

  // Result timeline (seconds into the result phase). The move ALWAYS plays out
  // — even offside goals go in, and only then does the late whistle chalk it
  // off. That's how it works, and that's how the lesson lands.
  //   0.00  pass leaves the teammate's boot, aimed at the striker
  //   0.40  ball arrives at the striker's feet (PASS_T)
  //   0.55  ONSIDE verdict flashes here (play continues either way)
  //   0.80  after a short carry goalward, he shoots (SHOT_T)
  //   1.15  ball hits the net (GOAL_T)
  //   1.30  OFFSIDE verdict: flag up, whistle, goal disallowed
  static readonly PASS_T = 0.4;
  static readonly SHOT_T = 0.8;
  static readonly GOAL_T = 1.15;
  static readonly SPRINT = 40; // striker's carry speed with the ball, units/s
  static readonly RUN_IN = 5; // the short step he takes to meet the pass
  static readonly AT_FEET = 5.8; // ball offset ahead of his body, at the toes

  verdictT(): number {
    return this.res?.onside ? 0.55 : Engine.GOAL_T + 0.15;
  }

  // The striker's position at result-time `rt`: eases one step forward to
  // meet the pass, then bursts goalward once he has it.
  runY(rt: number): number {
    const r = this.res!;
    if (rt <= Engine.PASS_T) return r.tapY - Engine.RUN_IN * (rt / Engine.PASS_T);
    return Math.max(r.tapY - Engine.RUN_IN - Engine.SPRINT * (rt - Engine.PASS_T), 12);
  }

  fire() {
    if (this.screen !== 'play' || this.phase !== 'live') return;
    const lineY = this.offsideLine();
    const tapY = this.R.att.y;
    const att = this.R.att;
    this.res = {
      lineY,
      tapY,
      onside: tapY >= lineY - 0.01,
      shown: false,
      shotDone: false,
      from: { x: this.R.carrier.x + 4.4, y: this.R.carrier.y - 1.6 }, // ball sits at his feet
      to: { x: att.x, y: tapY - Engine.RUN_IN - Engine.AT_FEET }, // straight to his toes
      shotX: att.x < 50 ? 57 : 43, // shoot across the keeper, into the far side
    };
    this.phase = 'result';
    this.rt = 0;
    this.showHints = false;
    this.events.onFire?.();
  }

  // Ball position along the move at result-time `rt`. Pure, so the renderer
  // can also sample slightly-past times to draw a motion trail.
  ballPos(rt: number): Vec | null {
    const r = this.res;
    if (!r) return null;
    if (rt <= 0) return { ...r.from };
    // the pass: teammate's boot -> the striker's feet
    if (rt < Engine.PASS_T) {
      const k = rt / Engine.PASS_T;
      return { x: r.from.x + (r.to.x - r.from.x) * k, y: r.from.y + (r.to.y - r.from.y) * k };
    }
    // glued to his toes during the carry — follows him if he swerves
    if (rt <= Engine.SHOT_T) {
      return { x: this.R.att.x, y: this.runY(rt) - Engine.AT_FEET };
    }
    // the shot
    const sy = this.runY(Engine.SHOT_T) - Engine.AT_FEET;
    const k = clamp((rt - Engine.SHOT_T) / (Engine.GOAL_T - Engine.SHOT_T), 0, 1);
    return { x: r.to.x + (r.shotX - r.to.x) * k, y: sy + (2 - sy) * k };
  }

  tick(dt: number) {
    if (this.screen === 'play') {
      if (this.phase === 'live') this.updateLive(dt);
      else this.updateResult(dt);
    } else {
      // Idle backdrop behind menu/end screens: just let the dots breathe.
      this.t += dt;
      this.positions();
    }
  }

  private positions() {
    const R = this.R;
    for (const d of R.defs) {
      // two incommensurate sines = a loose wander instead of a metronome bob,
      // plus a shade across toward the runner they're marking
      const wander =
        Math.sin(this.t * 0.7 + d.phase) * 2.2 + Math.sin(this.t * 1.9 + d.phase * 1.7) * 1.1;
      const mark = clamp((R.att.x - d.xBase) * 0.12, -3.5, 3.5);
      d.x = d.xBase + wander + mark;
      d.y = clamp(R.lineBase + d.off + Math.sin(this.t * 1.6 + d.phase) * d.sway, 16, 122);
    }
    R.gk.x = 50 + Math.sin(this.t * 0.8) * 3;
  }

  // Nobody occupies the same patch of grass: the striker swerves laterally
  // around whoever is in his path instead of running through them.
  private steerClear(dt: number) {
    const att = this.R.att;
    const bodies = [
      { p: this.R.gk as Vec, gap: 9.2 },
      ...this.R.defs.map((d) => ({ p: d as Vec, gap: 8.2 })),
    ];
    for (const { p, gap } of bodies) {
      const dy = Math.abs(att.y - p.y);
      if (dy >= gap) continue;
      const need = Math.sqrt(gap * gap - dy * dy);
      const dx = att.x - p.x;
      if (Math.abs(dx) < need) {
        const dir = dx === 0 ? (att.x < 50 ? -1 : 1) : Math.sign(dx);
        att.x += dir * Math.min(need - Math.abs(dx), 40 * dt);
      }
    }
    att.x = clamp(att.x, 6, 94);
  }

  private updateLive(dt: number) {
    const R = this.R;
    this.t += dt;
    // The attacker jockeys forward on his own — you choose when the ball comes.
    R.att.y = Math.max(R.att.y - R.drift * dt, 12);

    switch (R.behavior) {
      case 'push':
        R.lineBase = Math.min(R.lineBase + R.lineSpeed * dt, 120);
        break;
      case 'drop':
        R.lineBase = Math.max(R.lineBase - 5 * dt, 24);
        break;
      case 'squeeze':
        // the defenders drop back past you — the moment the line crosses you
        // the window opens, and your own drift closes it again
        if (R.lineBase > R.trapTarget)
          R.lineBase = Math.max(R.lineBase - R.lineSpeed * dt, R.trapTarget);
        break;
      case 'trap':
        if (this.t >= R.trapAt && !R.trapped) {
          R.trapped = true;
          R.trapTarget = R.lineBase + rand(12, 20);
        }
        if (R.trapped && R.lineBase < R.trapTarget) {
          R.lineBase = Math.min(R.lineBase + R.lineSpeed * dt, R.trapTarget);
        } else if (R.trapped && R.trapsLeft > 0) {
          // high levels: the line resets and springs the trap AGAIN
          R.trapsLeft--;
          R.trapped = false;
          R.trapAt = this.t + rand(0.5, 1.1);
        }
        break;
      case 'feint': {
        // a fake trap: up, hold a beat, back down — don't panic-tap
        if (R.feintPhase === 0 && this.t >= R.feintAt) {
          R.feintPhase = 1;
          R.feintBase = R.lineBase;
          R.trapTarget = R.lineBase + rand(7, 12);
        }
        if (R.feintPhase === 1) {
          if (R.lineBase < R.trapTarget) R.lineBase = Math.min(R.lineBase + 42 * dt, R.trapTarget);
          else if (this.t >= R.feintAt + 0.7) R.feintPhase = 2;
        }
        if (R.feintPhase === 2 && R.lineBase > R.feintBase) {
          R.lineBase = Math.max(R.lineBase - 24 * dt, R.feintBase);
        }
        break;
      }
    }
    this.positions();
    this.steerClear(dt);

    // Ran way past everyone, or dawdled too long: the pass comes anyway.
    if (this.t >= ROUND_TIME || R.att.y < this.offsideLine() - 26) this.fire();
  }

  private updateResult(dt: number) {
    this.rt += dt;
    const r = this.res!;
    const R = this.R;
    // The striker plays to the whistle: he collects, carries and shoots
    // whatever the flag says. He pulls up just after striking the shot.
    const stopT = Engine.SHOT_T + 0.05;
    R.att.y = this.runY(Math.min(this.rt, stopT));
    if (this.rt < stopT) this.steerClear(dt);
    R.ball = this.ballPos(this.rt);
    // the shot: second kick, and the keeper dives — the wrong way, of course
    if (this.rt >= Engine.SHOT_T && !r.shotDone) {
      r.shotDone = true;
      r.to.x = R.att.x; // shoot from wherever the swerving run ended up
      this.events.onShot?.();
    }
    if (r.shotDone) {
      R.gk.x += (100 - r.shotX - R.gk.x) * Math.min(1, dt * 7);
    }
    // beaten defenders chase back until the whistle stops them
    if (this.rt > Engine.PASS_T + 0.1 && (r.onside || !r.shown)) {
      for (const d of R.defs) d.y = Math.max(d.y - 14 * dt, 16);
    }
    // the teammate jogs up in support
    if (this.rt > Engine.PASS_T) {
      R.carrier.y = Math.max(R.carrier.y - 8 * dt, 62);
    }
    if (this.rt >= this.verdictT() && !r.shown) {
      r.shown = true;
      this.events.onVerdict?.(r.onside);
    }
    if (this.rt >= this.verdictT() + 1.6) this.endRound();
  }

  private endRound() {
    if (this.res!.onside) this.score++;
    this.round++;
    if (this.round > ROUNDS) {
      this.screen = 'end';
      this.events.onGameOver?.();
    } else {
      this.newRound();
    }
  }
}
