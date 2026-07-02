import { useEffect, useRef, useState } from 'react';
import { Engine, Screen } from './game/engine';
import { ensureAudio, sndCheer, sndThwack, sndWhistle } from './game/audio';
import { store } from './game/store';
import { GameCanvas } from './components/GameCanvas';
import { Hud } from './components/Hud';
import { Menu } from './components/Menu';
import { Verdict } from './components/Verdict';
import { EndScreen } from './components/EndScreen';
import { Demo } from './components/Demo';

const PROMOTE_AT = 7; // score this or better and the next league level unlocks

export default function App() {
  const engineRef = useRef<Engine | null>(null);
  if (!engineRef.current) {
    engineRef.current = new Engine();
    engineRef.current.level = store.level;
  }
  const engine = engineRef.current;

  const [screen, setScreen] = useState<Screen | 'demo'>('menu');
  const startAfterDemo = useRef(false);
  const [hud, setHud] = useState({ score: 0, round: 1 });
  const [ctaVisible, setCtaVisible] = useState(false);
  const [verdict, setVerdict] = useState<{ onside: boolean; id: number } | null>(null);
  const [best, setBest] = useState(store.best);
  const [promoted, setPromoted] = useState(false);

  useEffect(() => {
    engine.events = {
      onRoundStart: () => {
        setVerdict(null);
        setCtaVisible(true);
        setHud({ score: engine.score, round: engine.round });
      },
      onFire: () => {
        setCtaVisible(false);
        sndThwack();
      },
      onShot: () => {
        sndThwack();
      },
      onVerdict: (onside) => {
        setVerdict({ onside, id: Date.now() });
        if (onside) sndCheer();
        else sndWhistle();
      },
      onGameOver: () => {
        setVerdict(null);
        setCtaVisible(false);
        const didPromote = engine.score >= PROMOTE_AT;
        if (didPromote) {
          store.level = store.level + 1;
          engine.level = store.level;
        }
        setPromoted(didPromote);
        if (engine.score > store.best) store.best = engine.score;
        setBest(store.best);
        setHud({ score: engine.score, round: engine.round });
        setScreen('end');
      },
    };
    return () => {
      engine.events = {};
    };
  }, [engine]);

  const begin = (hints = false) => {
    ensureAudio();
    engine.showHints = hints;
    engine.start();
    setScreen('play');
  };

  // First game ever: show the instructions before kickoff.
  const start = () => {
    if (!store.seenDemo) {
      startAfterDemo.current = true;
      setScreen('demo');
      return;
    }
    begin();
  };

  const demoDone = () => {
    store.seenDemo = true;
    if (startAfterDemo.current) {
      startAfterDemo.current = false;
      begin(true);
    } else {
      setScreen('menu');
    }
  };

  const tap = () => {
    if (engine.screen !== 'play') return;
    ensureAudio();
    engine.fire();
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.code === 'Space' && !e.repeat) {
        e.preventDefault();
        tap();
      }
    };
    const block = (e: Event) => e.preventDefault();
    addEventListener('keydown', onKey);
    document.addEventListener('contextmenu', block);
    document.addEventListener('dblclick', block);
    return () => {
      removeEventListener('keydown', onKey);
      document.removeEventListener('contextmenu', block);
      document.removeEventListener('dblclick', block);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <>
      <GameCanvas engine={engine} onTap={tap} />
      {screen === 'play' && <Hud score={hud.score} round={hud.round} />}
      {screen === 'play' && ctaVisible && (
        <div id="cta">TAP TO RUN &nbsp;&rarr;&rarr;&rarr;</div>
      )}
      {verdict && <Verdict onside={verdict.onside} id={verdict.id} />}
      {screen === 'menu' && (
        <Menu
          level={engine.level}
          onStart={start}
          onHowTo={() => {
            startAfterDemo.current = false;
            setScreen('demo');
          }}
        />
      )}
      {screen === 'demo' && <Demo onDone={demoDone} />}
      {screen === 'end' && (
        <EndScreen
          score={hud.score}
          best={best}
          level={engine.level}
          promoted={promoted}
          onAgain={() => begin()}
          onMenu={() => {
            engine.screen = 'menu';
            setScreen('menu');
          }}
        />
      )}
    </>
  );
}
