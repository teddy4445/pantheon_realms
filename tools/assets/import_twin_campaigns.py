"""Import approved Confluence art unchanged; retain source metadata outside runtime."""
import argparse
import hashlib
import json
from pathlib import Path
import shutil

root = Path(__file__).resolve().parents[2]
parser = argparse.ArgumentParser()
parser.add_argument('--kit', required=True, type=Path)
args = parser.parse_args()
kit = args.kit.resolve()
manifest = json.loads((kit / 'asset-manifest.json').read_text(encoding='utf-8-sig'))
runtime = root / 'assets-runtime/twin-campaigns-v1'
source = root / 'assets-source/art/twin-campaigns-v1'
docs = root / 'docs/twin-campaigns-v1'

def copy_verified(src, dst, digest=None):
    actual = hashlib.sha256(src.read_bytes()).hexdigest()
    if digest and actual != digest:
        raise ValueError(f'Source hash mismatch: {src}')
    if dst.exists() and hashlib.sha256(dst.read_bytes()).hexdigest() != actual:
        raise ValueError(f'Refusing to overwrite changed asset: {dst}')
    dst.parent.mkdir(parents=True, exist_ok=True)
    if not dst.exists():
        shutil.copy2(src, dst)

entries = []
for entry in manifest['assets']:
    path = (kit / entry['file']).resolve()
    if not path.is_relative_to(kit):
        raise ValueError('Invalid source path')
    rel = Path(entry['file']).relative_to('assets')
    copy_verified(path, runtime / rel, entry['sha256'])
    copy_verified(path, source / 'assets' / rel, entry['sha256'])
    entries.append({k: v for k, v in entry.items() if k != 'source'})
runtime.mkdir(parents=True, exist_ok=True)
(runtime / 'manifest.json').write_text(json.dumps({**manifest, 'assets': entries}, indent=2) + '\n', encoding='utf-8')
for name in ['sprite-frames.json', 'chapter-art-bindings.json', 'world-state-bindings.json']:
    copy_verified(kit / name, runtime / name)
for path in kit.glob('*'):
    if path.is_file() and path.suffix in ('.txt', '.json'):
        copy_verified(path, docs / path.name)
for path in (kit / 'design').rglob('*'):
    if path.is_file() and path.suffix in ('.json', '.txt', '.md'):
        copy_verified(path, docs / 'design' / path.relative_to(kit / 'design'))
print(f'Imported {len(entries)} native images, manifests and design documents.')
