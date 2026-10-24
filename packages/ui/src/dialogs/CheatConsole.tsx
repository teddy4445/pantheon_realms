import { useEffect, useState } from 'react';
import { useStore } from '../app/context';
import { Button, Modal } from '../components/kit';
import { Icon } from '../assets/icons';
import { reducedMotion } from '../app/preferences';
import { CHEAT_ENTRIES, parseInvocation } from './cheatEntries';
import '../styles/grimoire.css';
export { parseInvocation } from './cheatEntries';

export function CheatConsole() {
  const store = useStore();
  const [text, setText] = useState('');
  const [message, setMessage] = useState('');
  const [book, setBook] = useState<'closed' | 'unlocking' | 'open'>('closed');
  const [page, setPage] = useState(0);
  const calm = reducedMotion(store.prefs);
  useEffect(() => {
    if (book !== 'unlocking') return;
    const timer = window.setTimeout(() => setBook('open'), calm ? 0 : 1500);
    return () => window.clearTimeout(timer);
  }, [book, calm]);
  if (book !== 'closed') return <Modal title="The Unsealed Grimoire" width="64rem" onClose={() => store.closeOverlay()} testId="cheat-grimoire">
    <div className={`grimoire ${calm ? 'is-calm' : ''}`}>
      {book === 'unlocking' ? <div className="grimoire__unlock" role="status" aria-label="Unlocking the grimoire">
        <div className="grimoire__seal">
          <svg viewBox="0 0 120 140" aria-hidden="true"><g className="grimoire__shackle"><path d="M36 62V38a24 24 0 0148 0v24" fill="none" stroke="#e8c777" strokeWidth="10"/></g><rect x="23" y="61" width="74" height="62" rx="9" fill="#213e50" stroke="#d9ae57" strokeWidth="3"/><path d="M29 70h62v44H29z" fill="none" stroke="#9c7c44"/><circle cx="60" cy="87" r="8" fill="#f4d588"/><path d="M57 91l-3 15h12l-3-15" fill="#f4d588"/></svg>
        </div><p>Alohomora</p><small>The forgotten words are yours again.</small>
      </div> : <>
        <header className="grimoire__heading"><span>✦ THE ORACLE’S PRIVATE LIBRARY ✦</span><h2>Words that bend the world</h2><p>Speak an invocation during your adventure turn. Its gifts belong to your empire alone.</p></header>
        <div className="grimoire__pages" key={page} data-testid="cheat-page" aria-live="polite">
          {CHEAT_ENTRIES.slice(page * 4, page * 4 + 4).map((entry, i) => <article className="grimoire__entry" key={entry.phrase}>
            <div className="grimoire__medallion"><Icon name={entry.icon} glyph/></div>
            <div><span className="grimoire__number">INVOCATION {String(page * 4 + i + 1).padStart(2, '0')}</span><h3>{entry.title}</h3><code>{entry.phrase}</code><p>{entry.description}</p>
              {entry.effect !== 'book' && <button className="grimoire__choose" onClick={() => {setText(entry.phrase);setMessage('The words are ready. Press Send to invoke them.');setBook('closed');}}>Prepare invocation <span aria-hidden="true">↗</span></button>}
            </div>
          </article>)}
        </div>
        <footer className="grimoire__footer"><Button icon="back" disabled={page === 0} onClick={() => setPage(p => p - 1)}>Previous</Button><span>Folio {page + 1} of {Math.ceil(CHEAT_ENTRIES.length / 4)}<small>Gifts persist in saved games.</small></span><Button disabled={(page + 1) * 4 >= CHEAT_ENTRIES.length} onClick={() => setPage(p => p + 1)}>Next page</Button></footer>
      </>}
    </div>
  </Modal>;
  return <Modal title="The Oracle" width="34rem" onClose={() => store.closeOverlay()} testId="oracle">
    <form className="oracle" onSubmit={e => {
      e.preventDefault();
      const effect = parseInvocation(text);
      if (!effect) { setMessage('The words fade into silence.'); return; }
      if (effect === 'book') { setPage(0);setBook(calm ? 'open' : 'unlocking');setText('');return; }
      if (store.presentationBusy) { setMessage('Wait for the current movement to finish.'); return; }
      const rejection = store.dispatch({ kind: 'InvokeCheat', effect });
      setMessage(rejection ? rejection.message : 'Your will is granted.');
      if (!rejection) setText('');
    }}>
      <div className="oracle__sigil" aria-hidden="true">✦</div>
      <label htmlFor="oracle-words">Speak your will</label>
      <div className="oracle__entry"><input id="oracle-words" autoFocus autoComplete="off" spellCheck={false} maxLength={120} value={text} onChange={e => setText(e.target.value)} /><Button type="submit" disabled={!text.trim()}>Send</Button></div>
      <p role="status">{message || '\u00a0'}</p>
    </form>
  </Modal>;
}
