import { ROUNDS } from '../game/engine';

interface Props {
  score: number;
  round: number;
}

export function Hud({ score, round }: Props) {
  return (
    <div id="hud">
      <h1>
        OFFSIDE<span>!</span>
      </h1>
      <div id="hudRight">
        <div id="hudScore">{score}</div>
        <div id="hudSub">{`ROUND ${Math.min(round, ROUNDS)}/${ROUNDS}`}</div>
      </div>
    </div>
  );
}
