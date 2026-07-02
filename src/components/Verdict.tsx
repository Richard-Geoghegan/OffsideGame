import { COL } from '../render/draw';

interface Props {
  onside: boolean;
  id: number; // changes per verdict so the CSS animations restart
}

export function Verdict({ onside, id }: Props) {
  const col = onside ? COL.green : COL.red;
  return (
    <>
      <div key={`f${id}`} className="flash" style={{ background: col }} />
      <div key={`v${id}`} className="verdict" style={{ color: col }}>
        <div className="verdictText">{onside ? 'ONSIDE' : 'OFFSIDE'}</div>
        <div className="verdictMark">{onside ? '✓' : '✗'}</div>
        <div className="verdictSub">{onside ? 'WHAT A RUN' : 'GOAL DISALLOWED'}</div>
      </div>
    </>
  );
}
