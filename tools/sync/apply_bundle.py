#!/usr/bin/env python3
"""
Apply a cloud-session file bundle to the owner's checkout (development tool; never packaged).

The bundle is a folder (or .tgz unpacked) holding `bundle.json` and a `files/`
tree. For every listed file:

  * text files are compared with line endings ignored; the file written keeps the
    line endings of the file already in the checkout (CRLF when it had CRLF), and a
    new source file under packages/, tests/, tools/ or apps/ (or a top-level .md) is
    written with CRLF; kit documents are written byte for byte;
  * binary files are compared byte for byte;
  * a file that already matches is left alone;
  * a file in the checkout changed AFTER the cutoff (someone edited it since the
    last sync) and different from the bundle is NOT overwritten: it is listed as a
    conflict for a manual merge; a cutoff of `after-sync:<label>` is the time in
    this checkout's `sync-report-<label>.json` (the end of the previous sync here);
  * `alsoTo` copies a file to a second path (the kit's PNGs go to both
    assets-source/ and assets-runtime/);
  * `fromKit` takes the file from a delivered kit folder instead of the bundle
    (`--kit DIR`; checked against the same hash), so large art already on the
    machine is not transferred again.

Nothing is ever deleted. Default is a dry run; pass --apply to write.
After writing, every file is verified against the bundle's hash.

Usage:
  python tools/sync/apply_bundle.py BUNDLE_DIR [--root CHECKOUT] [--kit KIT_DIR] [--apply]
"""
from __future__ import annotations

import argparse
import hashlib
import json
import os
import shutil
import sys
from datetime import datetime, timezone
from pathlib import Path

TEXT_EXT = {'.ts', '.tsx', '.js', '.mjs', '.cjs', '.json', '.md', '.txt', '.css', '.html', '.py', '.cmd', '.yml', '.yaml'}
CRLF_NEW_PREFIXES = ('packages/', 'tests/', 'tools/', 'apps/')


def is_text(rel: str) -> bool:
    return Path(rel).suffix.lower() in TEXT_EXT


def norm(b: bytes) -> bytes:
    return b.replace(b'\r\n', b'\n')


def sha(b: bytes) -> str:
    return hashlib.sha256(b).hexdigest()


def target_bytes(rel: str, data: bytes, existing: bytes | None) -> bytes:
    if not is_text(rel):
        return data
    lf = norm(data)
    if existing is not None:
        crlf = b'\r\n' in existing
    else:
        crlf = rel.startswith(CRLF_NEW_PREFIXES) or ('/' not in rel and rel.endswith('.md'))
        if rel.startswith('docs/campaign-v2/'):
            return data  # kit documents: byte for byte
    return lf.replace(b'\n', b'\r\n') if crlf else lf


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument('bundle')
    ap.add_argument('--root', default='.')
    ap.add_argument('--kit', default=None)
    ap.add_argument('--apply', action='store_true')
    args = ap.parse_args()

    bundle = Path(args.bundle)
    root = Path(args.root).resolve()
    meta = json.loads((bundle / 'bundle.json').read_text(encoding='utf-8'))
    pkg = root / 'package.json'
    if not pkg.exists() or '"pantheon-realms"' not in pkg.read_text(encoding='utf-8'):
        print(f'{root} is not the pantheon_realms checkout (package.json name).')
        return 2
    cut = meta['cutoff']
    if cut.startswith('after-sync:'):
        # The end of the previous sync on THIS machine (its report's time): a file
        # changed here after it is someone's edit since then, never the last sync's own write.
        prev = root / f'sync-report-{cut.split(":", 1)[1]}.json'
        if not prev.exists():
            print(f'{prev.name} is missing: apply the previous bundle first (its report sets the conflict cutoff).')
            return 2
        cutoff = datetime.fromisoformat(json.loads(prev.read_text(encoding='utf-8'))['at']).timestamp() + 5
        print(f'Conflict cutoff: the end of the previous sync ({prev.name}).')
    else:
        cutoff = datetime.fromisoformat(cut.replace('Z', '+00:00')).timestamp()
    need = sum(f['size'] * (2 if f.get('alsoTo') else 1) for f in meta['files'])
    free = shutil.disk_usage(root).free
    print(f'Bundle {meta["label"]}: {len(meta["files"])} files, about {need / 1e6:.0f} MB; free on disk {free / 1e6:.0f} MB.')
    if args.apply and free < need + 200e6:
        print('Not enough free disk space (needs the bundle size plus 200 MB). Nothing written.')
        return 3

    report = {'written': [], 'same': [], 'conflicts': [], 'verifyFailed': []}
    for f in meta['files']:
        rel = f['path']
        if f.get('fromKit'):
            if not args.kit:
                print(f'{rel} comes from the kit folder: pass --kit DIR')
                return 2
            data = (Path(args.kit) / f['fromKit']).read_bytes()
        else:
            data = (bundle / 'files' / rel).read_bytes()
        want = f['sha256']  # of the normalized (LF) text, or of the raw bytes for binaries
        got = sha(norm(data) if is_text(rel) else data)
        if got != want:
            print(f'Bundle file damaged: {rel}')
            return 4
        for dest_rel in [rel, *([f['alsoTo']] if f.get('alsoTo') else [])]:
            dest = root / dest_rel
            existing = dest.read_bytes() if dest.exists() else None
            if existing is not None and sha(norm(existing) if is_text(dest_rel) else existing) == want:
                report['same'].append(dest_rel)
                continue
            if existing is not None and dest.stat().st_mtime > cutoff:
                report['conflicts'].append(dest_rel)
                continue
            if args.apply:
                dest.parent.mkdir(parents=True, exist_ok=True)
                tmp = dest.with_name(dest.name + '.sync-tmp')
                tmp.write_bytes(target_bytes(dest_rel, data, existing))
                os.replace(tmp, dest)
                written = dest.read_bytes()
                if sha(norm(written) if is_text(dest_rel) else written) != want:
                    report['verifyFailed'].append(dest_rel)
            report['written'].append(dest_rel)

    verb = 'Written' if args.apply else 'Would write'
    print(f'{verb}: {len(report["written"])} · already identical: {len(report["same"])} · conflicts (changed here after {meta["cutoff"]}, left alone): {len(report["conflicts"])}')
    for c in report['conflicts']:
        print(f'  conflict: {c}')
    if report['verifyFailed']:
        print('VERIFY FAILED:')
        for c in report['verifyFailed']:
            print(f'  {c}')
    out = root / f'sync-report-{meta["label"]}.json'
    if args.apply:
        out.write_text(json.dumps({**report, 'at': datetime.now(timezone.utc).isoformat()}, indent=2), encoding='utf-8')
        print(f'Report: {out.name}')
    return 1 if report['verifyFailed'] else 0


if __name__ == '__main__':
    sys.exit(main())
