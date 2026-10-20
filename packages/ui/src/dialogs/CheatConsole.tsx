import { useState } from 'react';
import type { CheatEffect } from '@pr/rules';
import { useStore } from '../app/context';
import { Button, Modal } from '../components/kit';

const invocations: Record<string, CheatEffect> = {
  'blessed by the gods': 'resources',
  'hermes wings': 'movement',
  'atlantis': 'buildings',
  'i am a monster': 'creatures',
  'eyes of olympus': 'explore',
  'ambrosia': 'mana',
  'age of heroes': 'upgrades',
};
export function parseInvocation(value: string): CheatEffect | null {
  return Object.hasOwn(invocations, value.trim().toLowerCase().replace(/\s+/g, ' '))
    ? invocations[value.trim().toLowerCase().replace(/\s+/g, ' ')]! : null;
}

export function CheatConsole() {
  const store = useStore();
  const [text, setText] = useState('');
  const [message, setMessage] = useState('');
  return <Modal title="The Oracle" width="34rem" onClose={() => store.closeOverlay()} testId="oracle">
    <form className="oracle" onSubmit={e => {
      e.preventDefault();
      const effect = parseInvocation(text);
      if (!effect) { setMessage('The words fade into silence.'); return; }
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
