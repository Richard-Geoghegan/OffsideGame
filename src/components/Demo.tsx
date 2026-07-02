interface Props {
  onDone: () => void;
}

// Three-step instructions shown before the very first game (and any time
// from the menu's INSTRUCTIONS button). All diagrams are inline SVG.
export function Demo({ onDone }: Props) {
  return (
    <div className="screen demo">
      <div className="tagline">HOW TO PLAY</div>

      <div className="demoRow">
        <svg viewBox="0 0 120 96" width="104" height="84">
          <rect x="4" y="2" width="112" height="92" rx="4" fill="#2D6A35" />
          <rect x="44" y="2" width="32" height="5" fill="#fff" opacity=".9" />
          <circle cx="60" cy="16" r="8" fill="#8E6BE8" stroke="rgba(0,0,0,.3)" />
          <text x="60" y="19" textAnchor="middle" fontSize="8" fontWeight="700" fill="#fff">1</text>
          {[30, 60, 90].map((x) => (
            <circle key={x} cx={x} cy="38" r="7" fill="#E63946" stroke="rgba(0,0,0,.3)" />
          ))}
          <circle cx="55" cy="62" r="7" fill="#F5C518" stroke="rgba(0,0,0,.3)" />
          <text x="55" y="65" textAnchor="middle" fontSize="7" fontWeight="700" fill="#241D07">10</text>
          <circle cx="55" cy="62" r="11" fill="none" stroke="#F5C518" strokeOpacity=".6" strokeDasharray="3 2" />
          <circle cx="40" cy="84" r="7" fill="#F5C518" stroke="rgba(0,0,0,.3)" />
          <circle cx="48" cy="80" r="3" fill="#fff" stroke="#222" />
        </svg>
        <p>
          You're <b className="gold">gold&nbsp;#10</b>, attacking the top goal. Your teammate has
          the ball behind you.
        </p>
      </div>

      <div className="demoRow">
        <svg viewBox="0 0 120 96" width="104" height="84">
          <rect x="4" y="2" width="112" height="92" rx="4" fill="#2D6A35" />
          <circle cx="60" cy="66" r="8" fill="#F5C518" stroke="rgba(0,0,0,.3)" />
          <circle cx="60" cy="66" r="14" fill="none" stroke="#fff" strokeOpacity=".7" />
          <circle cx="60" cy="66" r="20" fill="none" stroke="#fff" strokeOpacity=".35" />
          <path d="M60 50 L60 22 M52 30 L60 20 L68 30" stroke="#F5C518" strokeWidth="4" fill="none" strokeLinecap="round" />
        </svg>
        <p>
          <b>TAP once</b> — the pass fires that instant. Where you're standing right then is all
          that counts.
        </p>
      </div>

      <div className="demoRow">
        <svg viewBox="0 0 120 96" width="104" height="84">
          <rect x="4" y="2" width="53" height="92" rx="4" fill="#2D6A35" />
          <rect x="63" y="2" width="53" height="92" rx="4" fill="#2D6A35" />
          <line x1="8" y1="38" x2="53" y2="38" stroke="#fff" strokeWidth="3" />
          <circle cx="30" cy="56" r="7" fill="#F5C518" stroke="rgba(0,0,0,.3)" />
          <text x="30" y="86" textAnchor="middle" fontSize="15" fontWeight="700" fill="#00C48C">✓</text>
          <line x1="67" y1="38" x2="112" y2="38" stroke="#fff" strokeWidth="3" />
          <circle cx="89" cy="22" r="7" fill="#F5C518" stroke="rgba(0,0,0,.3)" />
          <text x="89" y="86" textAnchor="middle" fontSize="15" fontWeight="700" fill="#E63946">✗</text>
        </svg>
        <p>
          Behind the <b>2nd-last defender</b> = <b className="green">ONSIDE ✓</b>. Past him ={' '}
          <b className="red">OFFSIDE</b> — you'll still score, but the flag chalks it off. Careful:
          some rounds you <b>start</b> caught out — wait for the defenders to drop back past you.
        </p>
      </div>

      <button onClick={onDone}>GOT IT — PLAY</button>
    </div>
  );
}
