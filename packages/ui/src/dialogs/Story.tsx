/**
 * Story dialogue window (campaign doc: "a text-first dialogue overlay with
 * portraits, subtitles, Backlog and Continue"), and the contextual tip panel.
 *
 * Both are presentation only. Story scenes are recorded by the rules when
 * their trigger fires; this window shows their lines one at a time. The AI
 * waits while a scene is open. All lines stay readable without audio.
 */
import { useEffect, useRef, useState } from 'react';
import type { DialogueLine } from '@pr/rules';
import { useStore } from '../app/context';
import { HINTS } from '../app/hints';
import { Button } from '../components/kit';
import { HeroPortrait, StoryPortrait } from '../components/art';

function Portrait({ line, size }: { line: DialogueLine; size: string }) {
  const catalog = useStore().catalog;
  const heroDef = Object.values(catalog.heroes).find((h) => h.name === line.speaker);
  return heroDef ? <HeroPortrait catalog={catalog} definitionId={heroDef.id} size={size} /> : <StoryPortrait name={line.speaker} size={size} />;
}

export function StoryLayer() {
  const store = useStore();
  const entry = store.story[0];
  const [index, setIndex] = useState(0);
  const [backlog, setBacklog] = useState(false);
  const logRef = useRef<HTMLDivElement>(null);
  const key = entry?.key ?? '';
  useEffect(() => {
    setIndex(0);
    setBacklog(false);
  }, [key]);
  useEffect(() => {
    if (backlog && logRef.current) logRef.current.scrollTop = logRef.current.scrollHeight;
  }, [backlog]);
  const lines = entry?.lines ?? [];
  const line = lines[Math.min(index, lines.length - 1)];
  const last = index >= lines.length - 1;
  const advance = () => {
    if (!entry) return;
    if (last) store.closeStory();
    else setIndex((i) => i + 1);
  };
  useEffect(() => {
    if (!entry) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        e.stopPropagation();
        if (backlog) setBacklog(false);
        else advance();
      } else if (e.key === 'Escape') {
        e.preventDefault();
        e.stopPropagation();
        if (backlog) setBacklog(false);
        else store.closeStory();
      } else if (e.key.toLowerCase() === 'l') {
        e.preventDefault();
        e.stopPropagation();
        setBacklog((b) => !b);
      }
    };
    window.addEventListener('keydown', onKey, true);
    return () => window.removeEventListener('keydown', onKey, true);
  });
  if (!entry || !line) return null;
  const history = [...store.storyLog, ...lines.slice(0, index + 1)];
  return (
    <div className="story-layer" role="dialog" aria-modal="true" aria-label={entry.title ?? 'Story'} data-testid="story-dialogue">
      {backlog ? (
        <div className="story-backlog panel" data-testid="story-backlog">
          <div className="story-backlog__head">
            <span className="story-backlog__title">Backlog</span>
            <span className="grow" />
            <Button size="small" onClick={() => setBacklog(false)} autoFocus>
              Back to the scene
            </Button>
          </div>
          <div className="story-backlog__list scroll" ref={logRef}>
            {history.map((l, i) => (
              <div key={i} className="dialogue__line">
                <Portrait line={l} size="2.6rem" />
                <div>
                  <div className="dialogue__speaker">{l.speaker}</div>
                  <div className="dialogue__text">{l.text}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : null}
      <div className="story-box panel">
        {entry.title ? <div className="story-box__title">{entry.title}</div> : null}
        <div className="story-box__body">
          <Portrait line={line} size="7rem" />
          <div className="story-box__text">
            <div className="story-box__speaker">{line.speaker}</div>
            <p aria-live="polite">{line.text}</p>
          </div>
        </div>
        <div className="story-box__footer">
          <span className="faint small">
            {index + 1} / {lines.length}
          </span>
          <span className="grow" />
          <Button size="small" variant="ghost" onClick={() => setBacklog((b) => !b)} data-testid="story-backlog-toggle" title="Backlog (L)">
            Backlog
          </Button>
          {!last ? (
            <Button size="small" variant="ghost" onClick={() => store.closeStory()} title="Skip the rest of this scene (Esc)">
              Skip
            </Button>
          ) : null}
          <Button variant="primary" onClick={advance} autoFocus data-testid="story-continue" title="Continue (Enter)">
            {last ? 'Close' : 'Continue'}
          </Button>
        </div>
      </div>
    </div>
  );
}

export function HintPanel() {
  const store = useStore();
  const id = store.hints[0];
  const hint = id ? HINTS[id] : undefined;
  // Tips belong to play: not on menus, setup, summary or settings screens.
  const playScreens = ['adventure', 'battle', 'battle-result', 'town', 'recruitment', 'hero', 'level-up', 'pantheon'];
  if (!hint || store.story.length > 0 || !store.session || !playScreens.includes(store.screen.id)) return null;
  return (
    <aside className="hint-panel panel" role="note" aria-label={`Tip: ${hint.title}`} data-testid="hint-panel" data-hint={hint.id}>
      <div className="hint-panel__title">Tip · {hint.title}</div>
      <p>{hint.text}</p>
      <div className="row gap">
        <Button size="small" variant="ghost" onClick={() => store.disableHints()} title="You can turn tips back on in Settings → Gameplay">
          Turn off tips
        </Button>
        <span className="grow" />
        <Button size="small" variant="primary" onClick={() => store.dismissHint(hint.id)} data-testid="hint-dismiss">
          Got it
        </Button>
      </div>
    </aside>
  );
}
