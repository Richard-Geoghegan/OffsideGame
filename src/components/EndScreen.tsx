import { useState } from 'react';
import { ROUNDS } from '../game/engine';

interface Props {
  score: number;
  best: number;
  level: number; // league level after this game
  promoted: boolean;
  onAgain: () => void;
  onMenu: () => void;
}

const ENGLAND_FLAG = '\u{1F3F4}\u{E0067}\u{E0062}\u{E0065}\u{E006E}\u{E0067}\u{E007F}';

function taunt(score: number): string {
  if (score === 10) return "You're wasted as a fan. Become a linesman.";
  if (score >= 7) return `Better than VAR ${ENGLAND_FLAG}`;
  if (score >= 4) return "Solid. Your team's VAR would take you.";
  return 'Congratulations. You are VAR.';
}

export function EndScreen({ score, best, level, promoted, onAgain, onMenu }: Props) {
  const [copied, setCopied] = useState(false);

  const shareText = `${score}/10 on Offside! ⚽ Can you do better? offsidegame.com #WorldCup`;

  const share = async () => {
    if (navigator.share) {
      try {
        await navigator.share({ text: shareText, url: 'https://offsidegame.com' });
        return;
      } catch {
        // fall through to clipboard
      }
    }
    try {
      await navigator.clipboard.writeText(shareText);
      setCopied(true);
      setTimeout(() => setCopied(false), 1400);
    } catch {
      // clipboard unavailable; nothing else to do
    }
  };

  return (
    <div className="screen">
      <div className="tagline">FULL TIME</div>
      <div id="endScore">
        You scored{' '}
        <span>
          {score} / {ROUNDS}
        </span>
      </div>
      <div id="endTaunt">{taunt(score)}</div>
      <div id="endBest">
        {promoted
          ? `PROMOTED — LEVEL ${level + 1}. THE LINE GETS MEANER.`
          : `BEST: ${best}${level > 0 ? ` · LEVEL ${level + 1}` : ''}`}
      </div>
      <button onClick={onAgain}>PLAY AGAIN</button>
      <button className="ghost" onClick={share}>
        {copied ? 'COPIED!' : 'SHARE RESULT'}
      </button>
      <button className="ghost dim" onClick={onMenu}>
        MENU
      </button>
      <div className="site">OFFSIDEGAME.COM</div>
    </div>
  );
}
