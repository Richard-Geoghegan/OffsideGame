interface Props {
  onDone: () => void;
}

// Three steps, minimal words, zero football knowledge assumed.
export function Demo({ onDone }: Props) {
  return (
    <div className="screen demo">
      <div className="tagline">HOW TO PLAY</div>

      <div className="demoRow">
        <svg viewBox="0 0 120 96" width="96" height="77">
          <rect x="4" y="2" width="112" height="92" rx="4" fill="#2D6A35" />
          <circle cx="60" cy="66" r="8" fill="#F5C518" stroke="rgba(0,0,0,.3)" />
          <circle cx="60" cy="66" r="14" fill="none" stroke="#fff" strokeOpacity=".7" />
          <circle cx="60" cy="66" r="20" fill="none" stroke="#fff" strokeOpacity=".35" />
          <path d="M60 50 L60 22 M52 30 L60 20 L68 30" stroke="#F5C518" strokeWidth="4" fill="none" strokeLinecap="round" />
          <rect x="14" y="86" width="60" height="4" rx="2" fill="#F5C518" />
          <text x="86" y="91" fontSize="9" fontWeight="700" fill="#fff">5s</text>
        </svg>
        <p>
          <b className="head">Tap to get the ball</b>
          <span className="sub">
            You're <b className="gold">gold #10</b>. Your teammate kicks it the instant you tap.
            5 seconds.
          </span>
        </p>
      </div>

      <div className="demoRow">
        <svg viewBox="0 0 120 96" width="96" height="77">
          <rect x="4" y="2" width="53" height="92" rx="4" fill="#2D6A35" />
          <rect x="63" y="2" width="53" height="92" rx="4" fill="#2D6A35" />
          <circle cx="18" cy="38" r="6" fill="#E63946" stroke="rgba(0,0,0,.3)" />
          <line x1="8" y1="38" x2="53" y2="38" stroke="#fff" strokeWidth="3" />
          <circle cx="36" cy="52" r="6" fill="#F5C518" stroke="rgba(0,0,0,.3)" />
          <text x="30" y="86" textAnchor="middle" fontSize="15" fontWeight="700" fill="#00C48C">✓</text>
          <circle cx="77" cy="38" r="6" fill="#E63946" stroke="rgba(0,0,0,.3)" />
          <line x1="67" y1="38" x2="112" y2="38" stroke="#fff" strokeWidth="3" />
          <circle cx="95" cy="24" r="6" fill="#F5C518" stroke="rgba(0,0,0,.3)" />
          <text x="89" y="86" textAnchor="middle" fontSize="15" fontWeight="700" fill="#E63946">✗</text>
        </svg>
        <p>
          <b className="head">
            Behind the reds = <span className="green">goal</span>
          </b>
          <span className="sub">
            Past them when it's kicked = <b className="red">OFFSIDE</b>. No goal.
          </span>
        </p>
      </div>

      <div className="demoRow">
        <svg viewBox="0 0 120 96" width="96" height="77">
          <rect x="4" y="2" width="112" height="92" rx="4" fill="#2D6A35" />
          <line x1="8" y1="30" x2="112" y2="30" stroke="#fff" strokeWidth="3" />
          <rect x="4" y="30" width="112" height="26" fill="#F5C518" opacity=".18" />
          <circle cx="60" cy="44" r="7" fill="#F5C518" stroke="rgba(0,0,0,.3)" />
          <text x="60" y="47" textAnchor="middle" fontSize="7" fontWeight="700" fill="#241D07">10</text>
          <text x="60" y="80" textAnchor="middle" fontSize="10" fontWeight="700" fill="#F5C518">TAP HERE</text>
        </svg>
        <p>
          <b className="head">Tap inside the glowing zone</b>
          <span className="sub">Too far back = the pass gets cut out.</span>
        </p>
      </div>

      <button onClick={onDone}>GOT IT — PLAY</button>
    </div>
  );
}
