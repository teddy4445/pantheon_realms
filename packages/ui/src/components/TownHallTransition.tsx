import { useLayoutEffect, useRef, useState } from 'react';

/** Keep the old painting until the new town stage is decoded, then reveal it. */
export function TownHallTransition({ url, level, calm }: { url: string; level: number; calm: boolean }) {
  const previous = useRef({ url, level });
  const [transition, setTransition] = useState<{ from: string; ready: boolean } | null>(null);
  useLayoutEffect(() => {
    const before = previous.current;
    previous.current = { url, level };
    if (calm || level <= before.level || !before.url || before.url === url) {
      setTransition(null);
      return;
    }
    let alive = true;
    let timer: ReturnType<typeof setTimeout>;
    const painting = new Image();
    setTransition({ from: before.url, ready: false });
    painting.src = url;
    void painting.decode().then(() => {
      if (!alive) return;
      setTransition({ from: before.url, ready: true });
      timer = setTimeout(() => setTransition(null), 2200);
    }).catch(() => { if (alive) setTransition(null); });
    return () => { alive = false; clearTimeout(timer); };
  }, [url, level, calm]);
  if (!transition) return null;
  return <>
    <div className={`town-evolution__previous ${transition.ready ? 'is-revealing' : ''}`} style={{ backgroundImage: `url(${transition.from})` }} aria-hidden="true" />
    {transition.ready ? <div className="town-evolution" data-testid="town-hall-transition">
      <div className="town-evolution__light" aria-hidden="true" />
      <div className="town-evolution__title" role="status"><span>Town hall upgraded</span><strong>A new age for your city</strong></div>
    </div> : null}
  </>;
}
