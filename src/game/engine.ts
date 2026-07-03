// Core game logic. Framework-agnostic: no DOM, no React.
// Coordinates: logical pitch 100 wide x 150 tall, y=0 is the goal line (top).
// "Closer to goal" therefore means smaller y.

export type Screen = 'menu' | 'play' | 'end';
export type Phase = 'live' | 'result';
export type Outcome = 'goal' | 'offside' | 'blocked';

export interface Vec {
  x: number;
  y: number;
}

export interface DefenderState {
  xBase: number;
  off: number; // depth offset from the line; a big negative = laggard playing you onside
  phase: number;
  sway: number; // individual up-down restlessness
  markX: number; // smoothed lateral shift toward the ball and the runner
  x: number;
  y: number;
  num: number;
}

export interface RoundState {
  lineBase: number;
  // hold/push/drop: steady lines. trap: the line springs up to catch you.
  // feint: a fake trap — up, hold, back down — to punish panic taps.
  behavior: 'hold' | 'push' | 'drop' | 'trap' | 'feint';
  lineSpeed: number; // how fast this round's line moves when it moves
  trapAt: number;
  trapped: boolean;
  trapTarget: number;
  trapsLeft: number; // high levels can spring the trap twice
  feintAt: number;
  feintPhase: 0 | 1 | 2;
  feintBase: number;
  drift: number; // striker's top jockeying speed, units/s
  // The striker's dart-and-check-back rhythm, relative to the moving line:
  // he oscillates between `oscMid+oscAmp` behind it and `oscMid-oscAmp`
  // beyond it. Higher difficulty = less time spent onside, faster cycles.
  oscMid: number;
  oscAmp: number;
  oscW: number;
  oscPhi: number;
  reach: number; // max distance behind the line a pass can find you un-blocked
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
  blocked: boolean; // tapped too deep: a defender cuts the pass out
  shown: boolean;
  shotDone: boolean;
  from: Vec; // ball at the teammate's feet
  to: Vec; // where the striker collects it
  shotX: number; // corner of the goal the shot goes to
  blockPt: Vec | null; // where the interception happens
  blockDef: number; // which defender steps across
}

export interface EngineEvents {
  onRoundStart: () => void;
  onFire: () => void;
  onShot: () => void;
  onVerdict: (outcome: Outcome) => void;
  onGameOver: () => void;
}

export const PW = 100;
export const PH = 150;
export const ROUNDS = 10;
export const ROUND_TIME = 5; // the shot clock: pass auto-fires when it hits zero

const rand = (a: number, b: number) => a + Math.random() * (b - a);
const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v));
const TAU = Math.PI * 2;

export class Engine {
  screen: Screen = 'menu';
  phase: Phase = 'live';
  round = 1;
  score = 0;
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
    return Math.min(this.round * 1.4, 16);
  }

  newRound() {
    const d = this.difficulty();
    const nDef = d <= 2 ? 1 : d <= 5.5 ? 2 : 3;
    const lineBase = rand(48, 76);
    const attX = rand(32, 68);

    const trapP = Math.min(0.18 + d * 0.06, 0.65);
    const feintP = d >= 2 ? 0.16 : 0;
    const roll = Math.random();
    const behavior: RoundState['behavior'] =
      roll < trapP
        ? 'trap'
        : roll < trapP + feintP
          ? 'feint'
          : roll < trapP + feintP + 0.18
            ? 'push'
            : roll < trapP + feintP + 0.3
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
      markX: 0,
      x,
      y: lineBase,
      num: [4, 5, 6][i],
    }));
    // Sometimes one defender lags deep and plays everyone onside —
    // this is how the "second-last defender" lesson gets taught.
    if (nDef >= 2 && Math.random() < 0.35) {
      defs[Math.floor(rand(0, nDef))].off = -rand(8, 16);
    }

    // The striker's rhythm: how far behind the line he checks back to, and
    // how far past it his darts carry him. Harder = less onside time.
    const behind = Math.max(4, 15 - d * 0.75);
    const beyond = 4 + Math.min(d * 0.6, 10);
    const oscMid = (behind - beyond) / 2;
    const oscAmp = (behind + beyond) / 2;
    const period = Math.max(1.0, 2.2 - d * 0.08);
    const oscPhi = rand(0, TAU); // some rounds you START caught out

    const minOff = Math.min(...defs.map((df) => df.off));
    const initLine = lineBase + minOff;
    const att = {
      x: attX,
      y: clamp(initLine + oscMid + oscAmp * Math.sin(oscPhi), 16, 118),
    };

    this.R = {
      lineBase,
      behavior,
      lineSpeed: behavior === 'trap' ? 34 + d * 1.6 : behavior === 'push' ? 6 + d * 0.6 : 0,
      trapAt: rand(0.7, Math.max(1.4, 3.0 - d * 0.14)),
      trapped: false,
      trapTarget: 0,
      trapsLeft: behavior === 'trap' && d >= 7 && Math.random() < 0.5 ? 1 : 0,
      feintAt: rand(0.8, 2.4),
      feintPhase: 0,
      feintBase: lineBase,
      drift: 16 + d * 1.3,
      oscMid,
      oscAmp,
      oscW: TAU / period,
      oscPhi,
      reach: Math.max(6, behind * 0.8),
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
  // Level with the line = onside. Judged the instant the ball is KICKED.
  offsideLine(): number {
    const ys = [this.R.gk.y, ...this.R.defs.map((p) => p.y)].sort((a, b) => a - b);
    return ys[1];
  }

  // Result timeline (seconds into the result phase). Goals and offside goals
  // both play out in full — the flag only comes after the ball is in.
  //   0.00  pass leaves the teammate's boot, aimed at the striker
  //   0.25  BLOCKED rounds: a defender cuts it out here
  //   0.40  ball arrives at the striker's feet (PASS_T)
  //   0.55  ONSIDE / BLOCKED verdicts flash here
  //   0.80  after a short carry goalward, he shoots (SHOT_T)
  //   1.15  ball hits the net (GOAL_T)
  //   1.30  OFFSIDE verdict: flag up, whistle, goal disallowed
  static readonly PASS_T = 0.4;
  static readonly BLOCK_K = 0.62; // fraction of the pass where it's cut out
  static readonly SHOT_T = 0.8;
  static readonly GOAL_T = 1.15;
  static readonly SPRINT = 40; // striker's carry speed with the ball, units/s
  static readonly RUN_IN = 5; // the short step he takes to meet the pass
  static readonly AT_FEET = 5.8; // ball offset ahead of his body, at the toes

  outcome(): Outcome {
    const r = this.res!;
    return r.blocked ? 'blocked' : r.onside ? 'goal' : 'offside';
  }

  verdictT(): number {
    return this.res && !this.res.onside ? Engine.GOAL_T + 0.15 : 0.55;
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
    const onside = tapY >= lineY - 0.01;
    // Called for it too deep AND a defender is close enough to your lane to
    // read the pass? He steps out and cuts it. No defender near = you got
    // away with it — the pass finds the gap.
    const tooDeep = onside && tapY - lineY > this.R.reach;
    let blockDef = -1;
    if (tooDeep) {
      let bestDist = Infinity;
      this.R.defs.forEach((df, i) => {
        const dist = Math.abs(df.x - att.x);
        if (dist < bestDist) {
          bestDist = dist;
          blockDef = i;
        }
      });
      if (bestDist > 16) blockDef = -1; // nobody home: lucky
    }
    const blocked = tooDeep && blockDef >= 0;
    const from = { x: this.R.carrier.x + 4.4, y: this.R.carrier.y - 1.6 };
    const to = { x: att.x, y: tapY - Engine.RUN_IN - Engine.AT_FEET };
    const blockPt: Vec | null = blocked
      ? {
          x: from.x + (to.x - from.x) * Engine.BLOCK_K,
          y: from.y + (to.y - from.y) * Engine.BLOCK_K,
        }
      : null;
    this.res = {
      lineY,
      tapY,
      onside,
      blocked,
      shown: false,
      shotDone: false,
      from,
      to,
      shotX: att.x < 50 ? 57 : 43, // shoot across the keeper, into the far side
      blockPt,
      blockDef,
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
    // blocked: the pass dies at the interceptor's feet
    if (r.blocked) {
      const ti = Engine.PASS_T * Engine.BLOCK_K;
      if (rt >= ti) return { ...r.blockPt! };
      const k = rt / Engine.PASS_T;
      return { x: r.from.x + (r.to.x - r.from.x) * k, y: r.from.y + (r.to.y - r.from.y) * k };
    }
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
      this.positions(dt);
    }
  }

  private positions(dt: number) {
    const R = this.R;
    const d0 = this.difficulty();
    // where the danger is: mostly the runner, partly the ball
    const focusX = R.att.x * 0.6 + R.carrier.x * 0.4;
    const markGain = Math.min(0.18 + d0 * 0.015, 0.45);
    for (const d of R.defs) {
      // two incommensurate sines = a loose wander instead of a metronome bob
      const wander =
        Math.sin(this.t * 0.7 + d.phase) * 2.2 + Math.sin(this.t * 1.9 + d.phase * 1.7) * 1.1;
      // ...plus an eased slide across toward the play, so the cover moves
      // like a defender shuffling, not a dot snapping
      const markTarget = clamp((focusX - d.xBase) * markGain, -8, 8);
      d.markX += (markTarget - d.markX) * Math.min(1, dt * 2.2);
      d.x = d.xBase + wander + d.markX;
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

    switch (R.behavior) {
      case 'push':
        R.lineBase = Math.min(R.lineBase + R.lineSpeed * dt, 120);
        break;
      case 'drop':
        R.lineBase = Math.max(R.lineBase - 5 * dt, 24);
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
    this.positions(dt);

    // The striker darts at the line and checks back off it, over and over,
    // tracking it as it moves. Your job is to catch him in the right beat.
    const lineY = this.offsideLine();
    const desired = lineY + R.oscMid + R.oscAmp * Math.sin(R.oscW * this.t + R.oscPhi);
    const step = clamp(desired - R.att.y, -R.drift * dt, R.drift * dt);
    R.att.y = clamp(R.att.y + step, 14, 122);
    this.steerClear(dt);

    // Shot clock expired: the pass comes wherever you're standing.
    if (this.t >= ROUND_TIME) this.fire();
  }

  private updateResult(dt: number) {
    this.rt += dt;
    const r = this.res!;
    const R = this.R;
    // He plays to the whistle — collects, carries, shoots — unless the pass
    // never reaches him (blocked), in which case he pulls up.
    const stopT = r.blocked ? 0.5 : Engine.SHOT_T + 0.05;
    R.att.y = this.runY(Math.min(this.rt, stopT));
    if (this.rt < stopT) this.steerClear(dt);
    R.ball = this.ballPos(this.rt);
    // the shot: second kick, and the keeper dives — the wrong way, of course
    if (!r.blocked && this.rt >= Engine.SHOT_T && !r.shotDone) {
      r.shotDone = true;
      r.to.x = R.att.x; // shoot from wherever the swerving run ended up
      this.events.onShot?.();
    }
    if (r.shotDone) {
      R.gk.x += (100 - r.shotX - R.gk.x) * Math.min(1, dt * 7);
    }
    // the interceptor steps onto the loose ball
    if (r.blocked && r.blockPt && r.blockDef >= 0) {
      const d = R.defs[r.blockDef];
      const k = Math.min(1, dt * 8);
      d.x += (r.blockPt.x - d.x) * k;
      d.y += (r.blockPt.y + 3.5 - d.y) * k;
    }
    // beaten defenders chase back until the whistle stops them
    if (!r.blocked && this.rt > Engine.PASS_T + 0.1 && (r.onside || !r.shown)) {
      for (const d of R.defs) d.y = Math.max(d.y - 14 * dt, 16);
    }
    // the teammate jogs up in support
    if (!r.blocked && this.rt > Engine.PASS_T) {
      R.carrier.y = Math.max(R.carrier.y - 8 * dt, 62);
    }
    if (this.rt >= this.verdictT() && !r.shown) {
      r.shown = true;
      this.events.onVerdict?.(this.outcome());
    }
    if (this.rt >= this.verdictT() + 1.6) this.endRound();
  }

  private endRound() {
    if (this.outcome() === 'goal') this.score++;
    this.round++;
    if (this.round > ROUNDS) {
      this.screen = 'end';
      this.events.onGameOver?.();
    } else {
      this.newRound();
    }
  }
}
