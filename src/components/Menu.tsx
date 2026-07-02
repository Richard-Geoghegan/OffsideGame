interface Props {
  level: number;
  onStart: () => void;
  onHowTo: () => void;
}

export function Menu({ level, onStart, onHowTo }: Props) {
  return (
    <div className="screen">
      <h1>
        OFFSIDE<span>!</span>
      </h1>
      <div className="tagline">Time your run. Beat the line.</div>
      <button onClick={onStart}>PLAY</button>
      <div className="modeSub">{level > 0 ? `10 ROUNDS · LEVEL ${level + 1}` : '10 ROUNDS'}</div>
      <button className="ghost" onClick={onHowTo}>
        INSTRUCTIONS
      </button>
      <div className="site">OFFSIDEGAME.COM</div>
    </div>
  );
}
