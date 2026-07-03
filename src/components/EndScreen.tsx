import { useState } from 'react';
import { ROUNDS } from '../game/engine';

interface Props {
  score: number;
  best: number;
  onAgain: () => void;
  onMenu: () => void;
}

const GAME_URL = 'https://offside-game.vercel.app/';
const ENGLAND_FLAG = '\u{1F3F4}\u{E0067}\u{E0062}\u{E0065}\u{E006E}\u{E0067}\u{E007F}';

function taunt(score: number): string {
  if (score === 10) return "You're wasted as a fan. Become a linesman.";
  if (score >= 7) return `Better than VAR ${ENGLAND_FLAG}`;
  if (score >= 4) return "Solid. Your team's VAR would take you.";
  return 'Congratulations. You are VAR.';
}

export function EndScreen({ score, best, onAgain, onMenu }: Props) {
  const [copied, setCopied] = useState(false);

  const shareText = `${score}/10 on Offside! ⚽ Can you do better? ${GAME_URL} #WorldCup`;

  const share = async () => {
    if (navigator.share) {
      try {
        await navigator.share({ text: shareText, url: GAME_URL });
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
      <div id="endBest">BEST: {best}</div>
      <button onClick={onAgain}>PLAY AGAIN</button>
      <button className="ghost" onClick={share}>
        {copied ? 'COPIED!' : 'SHARE RESULT'}
      </button>
      <button className="ghost dim" onClick={onMenu}>
        MENU
      </button>
    </div>
  );
}
