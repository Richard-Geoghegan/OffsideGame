import { useEffect, useRef, useState } from 'react';
import { Engine, Outcome, Screen } from './game/engine';
import { ensureAudio, sndBlock, sndCheer, sndThwack, sndWhistle } from './game/audio';
import { store } from './game/store';
import { GameCanvas } from './components/GameCanvas';
import { Hud } from './components/Hud';
import { Menu } from './components/Menu';
import { Verdict } from './components/Verdict';
import { EndScreen } from './components/EndScreen';
import { Demo } from './components/Demo';

// Coarse pointer = touch device; otherwise assume mouse + keyboard.
export const isTouch =
  typeof matchMedia !== 'undefined' && matchMedia('(pointer: coarse)').matches;

export default function App() {
  const engineRef = useRef<Engine | null>(null);
  if (!engineRef.current) engineRef.current = new Engine();
  const engine = engineRef.current;

  const [screen, setScreen] = useState<Screen | 'demo'>('menu');
  const startAfterDemo = useRef(false);
  const [hud, setHud] = useState({ score: 0, round: 1 });
  const [ctaVisible, setCtaVisible] = useState(false);
  const [verdict, setVerdict] = useState<{ outcome: Outcome; id: number } | null>(null);
  const [best, setBest] = useState(store.best);

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
      onVerdict: (outcome) => {
        setVerdict({ outcome, id: Date.now() });
        if (outcome === 'goal') sndCheer();
        else if (outcome === 'offside') sndWhistle();
        else sndBlock();
      },
      onGameOver: () => {
        setVerdict(null);
        setCtaVisible(false);
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
        <div id="cta">{isTouch ? 'TAP' : 'CLICK'} TO PASS &nbsp;&rarr;&rarr;&rarr;</div>
      )}
      {verdict && <Verdict outcome={verdict.outcome} id={verdict.id} />}
      {screen === 'menu' && (
        <Menu
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
