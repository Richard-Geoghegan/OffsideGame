import { Engine, PW, PH } from '../game/engine';

export const COL = {
  grass: '#2D6A35',
  grassLight: '#30703A',
  gold: '#F5C518',
  red: '#E63946',
  green: '#00C48C',
  white: '#FFFFFF',
  bg: '#14181B',
};

// Top-down kits. The keeper gets his own colour so he's never mistaken
// for an outfield defender.
const KITS = {
  attacker: { body: '#F5C518', sleeve: '#D9A90F', num: '#241D07', skin: '#C68642' },
  defender: { body: '#E63946', sleeve: '#C22733', num: '#FFFFFF', skin: '#E8B080' },
  gk: { body: '#8E6BE8', sleeve: '#6F4FD0', num: '#FFFFFF', skin: '#F1C27D' },
  ref: { body: '#2B2F36', sleeve: '#20232A', num: '#F2E94E', skin: '#D9A066' },
} as const;
type Kit = keyof typeof KITS;

// One squad, many haircuts. `cut` is hair coverage: 1 = full head of hair,
// ~0.7 = crew cut, 0 = bald. Keyed by shirt number (0 = the linesman).
const LOOKS: Record<number, { hair: string; cut: number; skin?: string }> = {
  10: { hair: '#1C1008', cut: 1, skin: '#E8C08E' }, // you: the little maestro
  8: { hair: '#B9862F', cut: 1, skin: '#F1C27D' }, // the blond playmaker
  4: { hair: '#26160E', cut: 1 },
  5: { hair: '#3E2A16', cut: 0.7, skin: '#8D5524' }, // crew cut
  6: { hair: '#000000', cut: 0 }, // the bald enforcer
  1: { hair: '#121212', cut: 1 },
  0: { hair: '#3A3E44', cut: 0.55 }, // receding linesman
};

export interface Viewport {
  scale: number;
  ox: number;
  oy: number;
}

export function computeViewport(w: number, h: number): Viewport {
  const topPad = 72,
    botPad = 84,
    sidePad = 14;
  const scale = Math.min((w - sidePad * 2) / PW, (h - topPad - botPad) / PH);
  return {
    scale,
    ox: (w - PW * scale) / 2,
    oy: topPad + (h - topPad - botPad - PH * scale) / 2,
  };
}

const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v));
const TAU = Math.PI * 2;

export function render(
  ctx: CanvasRenderingContext2D,
  eng: Engine,
  vp: Viewport,
  w: number,
  h: number,
) {
  const X = (x: number) => vp.ox + x * vp.scale;
  const Y = (y: number) => vp.oy + y * vp.scale;
  const s = vp.scale;

  const label = (
    text: string,
    x: number,
    y: number,
    size: number,
    fill: string,
    align: CanvasTextAlign = 'center',
  ) => {
    ctx.font = `700 ${size}px "Space Grotesk",system-ui`;
    ctx.textAlign = align;
    ctx.textBaseline = 'alphabetic';
    ctx.lineWidth = size * 0.22;
    ctx.lineJoin = 'round';
    ctx.strokeStyle = 'rgba(0,0,0,.6)';
    ctx.strokeText(text, x, y);
    ctx.fillStyle = fill;
    ctx.fillText(text, x, y);
  };

  const player = (
    x: number,
    y: number,
    kit: Kit,
    num: number,
    facing: 1 | -1,
    r: number,
    kick = 0, // 0..1, extends the kicking boot toward the ball
    rot = 0, // radians; the keeper's dive tips him over
  ) => {
    const px = X(x),
      py = Y(y);
    // shadow, always flat on the grass
    ctx.beginPath();
    ctx.ellipse(px, py + r * 0.55 * s, r * 0.92 * s, r * 0.4 * s, 0, 0, TAU);
    ctx.fillStyle = 'rgba(0,0,0,.26)';
    ctx.fill();
    const K = KITS[kit];
    ctx.save();
    ctx.translate(px, py);
    if (rot) ctx.rotate(rot);
    // kicking boot, swinging out ahead of the body
    if (kick > 0.03) {
      ctx.beginPath();
      ctx.arc(0.3 * r * s, facing * r * (0.55 + 0.8 * kick) * s, r * 0.3 * s, 0, TAU);
      ctx.fillStyle = '#20160E';
      ctx.fill();
      ctx.lineWidth = Math.max(1, s * 0.35);
      ctx.strokeStyle = 'rgba(255,255,255,.4)';
      ctx.stroke();
    }
    // sleeves, tucked in tight
    for (const side of [-1, 1]) {
      ctx.beginPath();
      ctx.arc(side * r * 0.72 * s, 0, r * 0.34 * s, 0, TAU);
      ctx.fillStyle = K.sleeve;
      ctx.fill();
      ctx.lineWidth = Math.max(1, s * 0.35);
      ctx.strokeStyle = 'rgba(0,0,0,.25)';
      ctx.stroke();
    }
    // keeper gloves, held out in front
    if (kit === 'gk') {
      for (const side of [-1, 1]) {
        ctx.beginPath();
        ctx.arc(side * r * 0.9 * s, facing * r * 0.58 * s, r * 0.28 * s, 0, TAU);
        ctx.fillStyle = '#F2F2F2';
        ctx.fill();
        ctx.stroke();
      }
    }
    // torso: a slim ellipse, narrower than tall
    ctx.beginPath();
    ctx.ellipse(0, 0, r * 0.84 * s, r * s, 0, 0, TAU);
    ctx.fillStyle = K.body;
    ctx.fill();
    ctx.lineWidth = Math.max(1, s * 0.45);
    ctx.strokeStyle = 'rgba(0,0,0,.28)';
    ctx.stroke();
    // head: skin base, then this player's own haircut seen from above —
    // full hair leaves a face sliver at the front; smaller cuts show scalp
    const look = LOOKS[num] ?? { hair: '#221610', cut: 1 };
    const hy = facing * r * 0.3 * s;
    ctx.beginPath();
    ctx.arc(0, hy, r * 0.38 * s, 0, TAU);
    ctx.fillStyle = look.skin ?? K.skin;
    ctx.fill();
    ctx.lineWidth = Math.max(1, s * 0.25);
    ctx.strokeStyle = 'rgba(0,0,0,.25)';
    ctx.stroke();
    if (look.cut > 0) {
      ctx.beginPath();
      ctx.arc(0, hy - facing * r * 0.09 * look.cut * s, r * 0.38 * look.cut * s, 0, TAU);
      ctx.fillStyle = look.hair;
      ctx.fill();
    }
    // number on the back of the shirt
    if (num > 0) {
      ctx.fillStyle = K.num;
      ctx.font = `700 ${r * 0.8 * s}px "Space Grotesk",system-ui`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(String(num), 0, -facing * r * 0.46 * s);
    }
    ctx.restore();
  };

  const ball = (x: number, y: number, rot: number, lift = 0) => {
    const grow = 1 + lift * 0.32;
    const r = 1.9 * grow * s;
    const px = X(x),
      py = Y(y) - lift * 2.4 * s;
    // shadow stays on the grass while the ball lifts
    ctx.beginPath();
    ctx.ellipse(X(x) + 0.4 * s, Y(y) + 1.1 * s, 1.6 * s, 0.7 * s, 0, 0, TAU);
    ctx.fillStyle = 'rgba(0,0,0,.3)';
    ctx.fill();
    ctx.beginPath();
    ctx.arc(px, py, r, 0, TAU);
    ctx.fillStyle = '#FAFAFA';
    ctx.fill();
    ctx.lineWidth = Math.max(1, s * 0.4);
    ctx.strokeStyle = '#1E1E1E';
    ctx.stroke();
    // centre pentagon + rim patches, rotating in flight
    ctx.save();
    ctx.translate(px, py);
    ctx.beginPath();
    ctx.arc(0, 0, r, 0, TAU);
    ctx.clip();
    ctx.rotate(rot);
    ctx.beginPath();
    for (let i = 0; i < 5; i++) {
      const a = (i / 5) * TAU - Math.PI / 2;
      const vx = Math.cos(a) * r * 0.38,
        vy = Math.sin(a) * r * 0.38;
      i === 0 ? ctx.moveTo(vx, vy) : ctx.lineTo(vx, vy);
    }
    ctx.closePath();
    ctx.fillStyle = '#1E1E1E';
    ctx.fill();
    for (let i = 0; i < 5; i++) {
      const a = (i / 5) * TAU - Math.PI / 2;
      ctx.beginPath();
      ctx.arc(Math.cos(a) * r * 0.95, Math.sin(a) * r * 0.95, r * 0.3, 0, TAU);
      ctx.fillStyle = '#1E1E1E';
      ctx.fill();
    }
    ctx.restore();
    // clip anything that spilled outside the ball
    ctx.beginPath();
    ctx.arc(px, py, r, 0, TAU);
    ctx.lineWidth = Math.max(1, s * 0.4);
    ctx.strokeStyle = '#1E1E1E';
    ctx.stroke();
  };

  const res = eng.res;
  // goal-frame shake when the shot lands (offside goals go in too)
  let shake = 0;
  if (eng.phase === 'result' && res && eng.rt >= Engine.GOAL_T) {
    const k = (eng.rt - Engine.GOAL_T) / 0.4;
    if (k < 1) shake = Math.sin(eng.rt * 70) * (1 - k) * 1.4;
  }

  // ---------- backdrop + pitch ----------
  ctx.fillStyle = COL.bg;
  ctx.fillRect(0, 0, w, h);
  for (let i = 0; i < 10; i++) {
    ctx.fillStyle = i % 2 ? COL.grass : COL.grassLight;
    ctx.fillRect(X(0), Y(i * 15), PW * s, 15 * s + 1);
  }
  ctx.strokeStyle = 'rgba(255,255,255,.55)';
  ctx.lineWidth = Math.max(1.2, s * 0.9);
  ctx.strokeRect(X(0), Y(0), PW * s, PH * s);
  ctx.strokeRect(X(17), Y(0), 66 * s, 26 * s); // penalty area
  ctx.strokeRect(X(33), Y(0), 34 * s, 10 * s); // six-yard box
  ctx.beginPath(); // the D
  ctx.arc(X(50), Y(26), 12 * s, 0.25 * Math.PI, 0.75 * Math.PI);
  ctx.stroke();
  ctx.beginPath(); // halfway arc
  ctx.arc(X(50), Y(PH), 14 * s, Math.PI, 2 * Math.PI);
  ctx.stroke();
  ctx.beginPath(); // penalty spot
  ctx.arc(X(50), Y(18), s * 0.7, 0, TAU);
  ctx.fillStyle = 'rgba(255,255,255,.55)';
  ctx.fill();
  // goal: posts, crossbar and a proper net mesh (shakes when the shot lands)
  {
    const g0 = 38 + shake;
    const depth = 5;
    const gx = X(g0),
      gy = Y(0) - depth * s,
      gw = 24 * s;
    ctx.fillStyle = 'rgba(255,255,255,.07)';
    ctx.fillRect(gx, gy, gw, depth * s);
    ctx.strokeStyle = 'rgba(255,255,255,.3)';
    ctx.lineWidth = 1;
    for (let i = 1; i < 10; i++) {
      ctx.beginPath();
      ctx.moveTo(gx + i * 2.4 * s, gy);
      ctx.lineTo(gx + i * 2.4 * s, Y(0));
      ctx.stroke();
    }
    for (let j = 1; j < 3; j++) {
      ctx.beginPath();
      ctx.moveTo(gx, gy + j * (depth / 3) * s);
      ctx.lineTo(gx + gw, gy + j * (depth / 3) * s);
      ctx.stroke();
    }
    ctx.strokeStyle = 'rgba(255,255,255,.85)';
    ctx.lineWidth = Math.max(1.5, s * 0.7);
    ctx.strokeRect(gx, gy, gw, depth * s);
    for (const postX of [g0, g0 + 24]) {
      ctx.beginPath();
      ctx.arc(X(postX), Y(0), s * 0.9, 0, TAU);
      ctx.fillStyle = '#FFFFFF';
      ctx.fill();
    }
  }

  const R = eng.R;
  if (!R) return;

  // ---------- verdict lines ----------
  if (eng.phase === 'result' && res) {
    const snap = clamp(eng.rt / 0.08, 0, 1);
    ctx.save();
    ctx.strokeStyle = COL.white;
    ctx.lineWidth = Math.max(2, s * 1.1);
    ctx.shadowColor = 'rgba(255,255,255,.8)';
    ctx.shadowBlur = 8;
    ctx.beginPath();
    ctx.moveTo(X(0), Y(res.lineY));
    ctx.lineTo(X(PW * snap), Y(res.lineY));
    ctx.stroke();
    ctx.restore();
    ctx.save();
    ctx.strokeStyle = COL.gold;
    ctx.lineWidth = Math.max(2, s * 0.9);
    ctx.setLineDash([6, 5]);
    ctx.beginPath();
    ctx.moveTo(X(0), Y(res.tapY));
    ctx.lineTo(X(PW * snap), Y(res.tapY));
    ctx.stroke();
    ctx.restore();
    if (snap === 1) {
      label('LINE', X(2), Y(res.lineY) - 4, Math.max(10, s * 2.6), COL.white, 'left');
      label('YOU', X(2), Y(res.tapY) + s * 4, Math.max(10, s * 2.6), COL.gold, 'left');
    }
  }

  // ---------- first-round hints ----------
  if (eng.phase === 'live' && eng.showHints) {
    const lineY = eng.offsideLine();
    ctx.save();
    ctx.strokeStyle = 'rgba(255,255,255,.55)';
    ctx.lineWidth = Math.max(1.5, s * 0.7);
    ctx.setLineDash([4, 4]);
    ctx.beginPath();
    ctx.moveTo(X(0), Y(lineY));
    ctx.lineTo(X(PW), Y(lineY));
    ctx.stroke();
    ctx.restore();
    label('THE LINE — STAY BEHIND IT', X(50), Y(lineY) - s * 6.5, Math.max(11, s * 3), COL.white);
    label('YOU', X(R.att.x), Y(R.att.y) - s * 7, Math.max(12, s * 3.4), COL.gold);
    label(
      'YOUR TEAMMATE',
      X(R.carrier.x),
      Y(R.carrier.y) + s * 9.5,
      Math.max(11, s * 2.8),
      COL.white,
    );
  }

  // ---------- players ----------
  const inResult = eng.phase === 'result' && res;
  // teammate follows through on his pass
  const passKick = inResult ? Math.sin(clamp(eng.rt / 0.22, 0, 1) * Math.PI) : 0;
  player(R.carrier.x, R.carrier.y, 'attacker', 8, -1, 3.9, passKick);
  // beaten defenders turn and give chase until the whistle stops them
  const chasing =
    inResult && eng.rt > Engine.PASS_T + 0.1 && (res.onside || eng.rt < eng.verdictT());
  const defFacing: 1 | -1 = chasing ? -1 : 1;
  for (const d of R.defs) player(d.x, d.y, 'defender', d.num, defFacing, 3.9);
  // the defender who set the trap appeals to the linesman
  if (inResult && !res.onside && eng.rt > eng.verdictT() && R.defs.length) {
    const ap = R.defs.reduce((a, b) =>
      Math.abs(b.y - res.lineY) < Math.abs(a.y - res.lineY) ? b : a,
    );
    const ax = X(ap.x),
      ay = Y(ap.y),
      ar = 3.9 * s;
    ctx.strokeStyle = KITS.defender.sleeve;
    ctx.lineWidth = ar * 0.3;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(ax + ar * 0.75, ay);
    ctx.lineTo(ax + ar * 1.3, ay - ar * 1.25);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(ax + ar * 1.3, ay - ar * 1.25, ar * 0.26, 0, TAU);
    ctx.fillStyle = KITS.defender.skin;
    ctx.fill();
  }
  // keeper: dives (the wrong way) once the shot is away, tipping over as he goes
  const gkRot =
    inResult && eng.rt > Engine.SHOT_T
      ? Math.sign(50 - res.shotX) * Math.min((eng.rt - Engine.SHOT_T) / 0.3, 1) * 1.15
      : 0;
  player(R.gk.x, R.gk.y, 'gk', 1, 1, 4.6, 0, gkRot);

  // speed lines behind the striker's burst — only once he has the ball
  if (eng.phase === 'result' && res && eng.rt > Engine.PASS_T && eng.rt < Engine.SHOT_T) {
    ctx.strokeStyle = 'rgba(245,197,24,.4)';
    ctx.lineWidth = Math.max(1.5, s * 0.55);
    for (const [dx, len] of [
      [-2.1, 3.5],
      [0, 5],
      [2.1, 3.5],
    ]) {
      ctx.beginPath();
      ctx.moveTo(X(R.att.x + dx), Y(R.att.y + 4.5));
      ctx.lineTo(X(R.att.x + dx), Y(R.att.y + 4.5 + len));
      ctx.stroke();
    }
  }
  // you — with the boot swinging as you strike the shot
  const shotKick =
    inResult && eng.rt >= Engine.SHOT_T
      ? Math.sin(clamp((eng.rt - Engine.SHOT_T) / 0.22, 0, 1) * Math.PI)
      : 0;
  player(R.att.x, R.att.y, 'attacker', 10, -1, 3.9, shotKick);

  // ---------- linesman on the right touchline ----------
  // He shadows the second-last defender — watch him to read the line.
  {
    const ly = inResult ? res.lineY : eng.offsideLine();
    const lx = 97.6;
    player(lx, ly, 'ref', 0, 1, 3);
    const fx = X(lx),
      fy = Y(ly);
    // the real linesman's flag: red/yellow quartered fabric
    const flag = (tipX: number, tipY: number, angle: number, size: number) => {
      ctx.save();
      ctx.translate(tipX, tipY);
      ctx.rotate(angle);
      const q = size / 2;
      for (let i = 0; i < 2; i++) {
        for (let j = 0; j < 2; j++) {
          ctx.fillStyle = (i + j) % 2 ? '#FFDC00' : '#FF4136';
          ctx.fillRect(i * q, j * q, q, q);
        }
      }
      ctx.lineWidth = Math.max(1, s * 0.25);
      ctx.strokeStyle = 'rgba(0,0,0,.45)';
      ctx.strokeRect(0, 0, size, size);
      ctx.restore();
    };
    ctx.lineCap = 'round';
    ctx.strokeStyle = '#D9D9D9';
    ctx.lineWidth = Math.max(1.5, s * 0.45);
    if (inResult && !res.onside && eng.rt > eng.verdictT()) {
      // FLAG UP — the offside signal, thrust toward the pitch
      ctx.beginPath();
      ctx.moveTo(fx - 1.2 * s, fy);
      ctx.lineTo(fx - 6.5 * s, fy - 5 * s);
      ctx.stroke();
      // fabric hangs from the top of the pole
      flag(fx - 6.5 * s, fy - 5 * s, Math.atan2(5, 6.5), 4.4 * s);
    } else {
      // flag held down at his side
      ctx.beginPath();
      ctx.moveTo(fx + 1.1 * s, fy + 0.4 * s);
      ctx.lineTo(fx + 3 * s, fy + 3 * s);
      ctx.stroke();
      flag(fx + 3 * s, fy + 3 * s, Math.atan2(3, -1.9), 2.6 * s);
    }
  }
  // pulsing "this is you" ring while waiting
  if (eng.phase === 'live') {
    ctx.beginPath();
    ctx.arc(X(R.att.x), Y(R.att.y), (6.6 + Math.sin(eng.t * 5) * 0.5) * s, 0, TAU);
    ctx.strokeStyle = 'rgba(245,197,24,.55)';
    ctx.lineWidth = Math.max(1.5, s * 0.6);
    ctx.stroke();
  }

  // ---------- ball ----------
  if (eng.phase === 'result' && R.ball && res) {
    // airborne during the pass and during the shot; on the deck in between
    const passing = eng.rt < Engine.PASS_T;
    const shooting = eng.rt > Engine.SHOT_T && eng.rt < Engine.GOAL_T;
    if (passing || shooting) {
      for (let i = 1; i <= 3; i++) {
        const p = eng.ballPos(eng.rt - i * 0.045);
        if (!p) continue;
        ctx.beginPath();
        ctx.arc(X(p.x), Y(p.y), 1.5 * s, 0, TAU);
        ctx.fillStyle = `rgba(250,250,250,${0.22 - i * 0.06})`;
        ctx.fill();
      }
    }
    const legK = passing
      ? eng.rt / Engine.PASS_T
      : shooting
        ? clamp((eng.rt - Engine.SHOT_T) / (Engine.GOAL_T - Engine.SHOT_T), 0, 1)
        : 0;
    const lift = passing || shooting ? Math.sin(legK * Math.PI) : 0;
    ball(R.ball.x, R.ball.y, eng.rt * 14, lift);
    // kick flash at the teammate's boot when the pass leaves...
    if (eng.rt < 0.2) {
      const k = eng.rt / 0.2;
      ctx.beginPath();
      ctx.arc(X(res.from.x), Y(res.from.y), (2 + k * 16) * s * 0.35, 0, TAU);
      ctx.strokeStyle = `rgba(245,197,24,${0.55 * (1 - k)})`;
      ctx.lineWidth = Math.max(1.5, s * 0.7);
      ctx.stroke();
    }
    // ...and again at the striker's boot when he lets fly
    if (eng.rt >= Engine.SHOT_T && eng.rt < Engine.SHOT_T + 0.18) {
      const k = (eng.rt - Engine.SHOT_T) / 0.18;
      const p = eng.ballPos(Engine.SHOT_T)!;
      ctx.beginPath();
      ctx.arc(X(p.x), Y(p.y), (2 + k * 16) * s * 0.35, 0, TAU);
      ctx.strokeStyle = `rgba(245,197,24,${0.55 * (1 - k)})`;
      ctx.lineWidth = Math.max(1.5, s * 0.7);
      ctx.stroke();
    }
    // net ripple when the shot lands
    if (eng.rt >= Engine.GOAL_T) {
      const k = clamp((eng.rt - Engine.GOAL_T) / 0.4, 0, 1);
      for (const m of [0, 0.5]) {
        ctx.beginPath();
        ctx.arc(X(res.shotX), Y(0) - 2 * s, (3 + (k + m) * 6) * s, Math.PI, TAU);
        ctx.strokeStyle = `rgba(255,255,255,${Math.max(0, 0.6 * (1 - k - m))})`;
        ctx.lineWidth = Math.max(1.5, s * 0.6);
        ctx.stroke();
      }
    }
  } else {
    // at the teammate's feet, nudged toward you
    ball(R.carrier.x + 4.4, R.carrier.y - 1.6 + Math.sin(eng.t * 3) * 0.4, 0, 0);
  }
}
