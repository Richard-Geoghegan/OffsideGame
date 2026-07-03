import { Outcome } from '../game/engine';
import { COL } from '../render/draw';

interface Props {
  outcome: Outcome;
  id: number; // changes per verdict so the CSS animations restart
}

const LOOK: Record<Outcome, { col: string; text: string; mark: string; sub: string }> = {
  goal: { col: COL.green, text: 'ONSIDE', mark: '✓', sub: 'WHAT A RUN' },
  offside: { col: COL.red, text: 'OFFSIDE', mark: '✗', sub: 'GOAL DISALLOWED' },
  blocked: { col: '#FF8C42', text: 'BLOCKED', mark: '✗', sub: 'TOO EARLY — GET TIGHT TO THE LINE' },
};

export function Verdict({ outcome, id }: Props) {
  const v = LOOK[outcome];
  return (
    <>
      <div key={`f${id}`} className="flash" style={{ background: v.col }} />
      <div key={`v${id}`} className="verdict" style={{ color: v.col }}>
        <div className="verdictText">{v.text}</div>
        <div className="verdictMark">{v.mark}</div>
        <div className="verdictSub">{v.sub}</div>
      </div>
    </>
  );
}
