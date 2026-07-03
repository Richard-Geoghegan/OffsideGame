interface Props {
  onStart: () => void;
  onHowTo: () => void;
}

export function Menu({ onStart, onHowTo }: Props) {
  return (
    <div className="screen">
      <h1>
        OFFSIDE<span>!</span>
      </h1>
      <div className="tagline">Time your run. Beat the line.</div>
      <button onClick={onStart}>PLAY</button>
      <div className="modeSub">10 ROUNDS</div>
      <button className="ghost" onClick={onHowTo}>
        INSTRUCTIONS
      </button>
    </div>
  );
}
