/**
 * SaveManager: slot policy (5 manual, 3 rotating autosaves, 1 pre-encounter
 * checkpoint), metadata listing with compatibility status, Continue target,
 * export/import. Persistence goes through the platform SaveRepository.
 * A read failure never deletes or overwrites the failed file.
 */
import type { ContentCatalog } from '@pr/rules';
import type { SaveRepository } from '@pr/platform';
import { createEnvelope, parseEnvelope, serializeEnvelope, type SaveCompatibility, type SaveEnvelope, type SaveKind, type SaveMetadata, type SaveSnapshot } from '@pr/session';

export const MANUAL_SLOTS = ['manual-1', 'manual-2', 'manual-3', 'manual-4', 'manual-5'] as const;
export const AUTO_SLOTS = ['auto-1', 'auto-2', 'auto-3'] as const;
export const CHECKPOINT_SLOT = 'checkpoint';

export interface SlotInfo {
  readonly id: string;
  readonly kind: SaveKind;
  readonly name: string;
  readonly savedAt: string | null;
  readonly metadata: SaveMetadata | null;
  readonly compatibility: SaveCompatibility;
  readonly bytes: number;
  readonly envelope: SaveEnvelope | null;
}

export class SaveManager {
  constructor(
    private readonly catalog: ContentCatalog,
    private readonly repo: SaveRepository,
  ) {}

  get kind() {
    return this.repo.kind;
  }

  availability() {
    return this.repo.availability();
  }

  async list(): Promise<SlotInfo[]> {
    const stored = await this.repo.list();
    return stored
      .map((s): SlotInfo => {
        const { envelope, compatibility } = parseEnvelope(this.catalog, s.text);
        const kind: SaveKind = s.id.startsWith('auto') ? 'auto' : s.id === CHECKPOINT_SLOT ? 'checkpoint' : 'manual';
        return {
          id: s.id,
          kind,
          name: envelope && typeof envelope === 'object' && 'name' in envelope ? String(envelope.name) : s.id,
          savedAt: envelope && typeof envelope.savedAt === 'string' ? envelope.savedAt : null,
          metadata: envelope && envelope.metadata ? envelope.metadata : null,
          compatibility,
          bytes: s.bytes,
          envelope: compatibility.status === 'ok' ? envelope : null,
        };
      })
      .sort((a, b) => (b.savedAt ?? '').localeCompare(a.savedAt ?? ''));
  }

  /** Most recent compatible playable save (manual, auto or checkpoint). */
  async continueTarget(): Promise<SlotInfo | null> {
    const all = await this.list();
    return all.find((s) => s.compatibility.status === 'ok' && s.envelope && s.envelope.snapshot.match.outcome.status === 'running' && !s.envelope.snapshot.match.battle) ?? null;
  }

  async write(id: string, kind: SaveKind, name: string, snapshot: SaveSnapshot): Promise<SaveEnvelope> {
    const env = createEnvelope(this.catalog, snapshot, { id, kind, name, savedAt: new Date().toISOString() });
    await this.repo.write(id, serializeEnvelope(env));
    return env;
  }

  /** Rotating autosave into the oldest of the three auto slots. */
  async autosave(snapshot: SaveSnapshot, label: string): Promise<SaveEnvelope> {
    const existing = (await this.list()).filter((s) => s.kind === 'auto');
    const used = new Map(existing.map((s) => [s.id, s.savedAt ?? '']));
    const free = AUTO_SLOTS.find((id) => !used.has(id));
    const target = free ?? [...AUTO_SLOTS].sort((a, b) => (used.get(a) ?? '').localeCompare(used.get(b) ?? ''))[0]!;
    return this.write(target, 'auto', label, snapshot);
  }

  async checkpoint(snapshot: SaveSnapshot, label: string): Promise<SaveEnvelope> {
    return this.write(CHECKPOINT_SLOT, 'checkpoint', label, snapshot);
  }

  async read(id: string): Promise<{ envelope: SaveEnvelope | null; compatibility: SaveCompatibility }> {
    const text = await this.repo.read(id);
    if (text === null) return { envelope: null, compatibility: { status: 'corrupt', reason: 'Save not found' } };
    return parseEnvelope(this.catalog, text);
  }

  remove(id: string) {
    return this.repo.remove(id);
  }

  exportSave(id: string, name: string) {
    return this.repo.exportSave(id, name.replace(/[^A-Za-z0-9 _-]/g, '').slice(0, 48) || 'pantheon-save');
  }

  /** Import validates the file as untrusted data before storing it in a free manual slot. */
  async importSave(): Promise<{ ok: boolean; message: string }> {
    const text = await this.repo.importSave();
    if (text === null) return { ok: false, message: 'Import cancelled' };
    const { envelope, compatibility } = parseEnvelope(this.catalog, text);
    if (compatibility.status !== 'ok' || !envelope) return { ok: false, message: `Not imported: ${compatibility.status === 'ok' ? 'unknown error' : compatibility.reason}` };
    const used = new Set((await this.list()).map((s) => s.id));
    const slot = MANUAL_SLOTS.find((id) => !used.has(id));
    if (!slot) return { ok: false, message: 'All manual slots are in use. Delete one first.' };
    await this.write(slot, 'manual', `${envelope.name} (imported)`, envelope.snapshot);
    return { ok: true, message: `Imported into ${slot}` };
  }
}
