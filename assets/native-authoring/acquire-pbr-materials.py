"""Acquire unchanged CC0 PBR sources for the existing GRAPHICS_PRODUCTION library.

This only records source acquisition. It cannot approve native imports or visual QA.
"""
import concurrent.futures
import datetime
import hashlib
import io
import json
from pathlib import Path
import urllib.request
import zipfile

from PIL import Image

ROOT = Path(__file__).resolve().parents[2]
OUT = ROOT / 'assets/roblox/common-materials-v1'
IDS = ['WoodFloor051', 'Wood062', 'Wood066', 'Metal032', 'Metal046A',
       'MetalPlates006', 'Bricks079', 'Bricks059', 'Concrete034', 'Concrete046',
       'Rock030', 'Rock035', 'Ground037', 'Ground054', 'Grass001', 'Fabric030',
       'Fabric026', 'Leather026', 'Leather008', 'Marble012', 'Tiles074']
CHANNELS = {'Color': 'color', 'NormalGL': 'normal', 'Roughness': 'roughness',
            'Metalness': 'metalness'}


def get(url):
    request = urllib.request.Request(url, headers={'User-Agent': 'Vibe-asset-library/1.0'})
    with urllib.request.urlopen(request, timeout=90) as response:
        if response.status != 200:
            raise RuntimeError('MATERIAL_SOURCE_HTTP_FAILURE')
        return response.read(64 * 1024 * 1024 + 1)


def acquire(asset):
    asset_id = asset['assetId']
    downloads = asset['downloadFolders']['default']['downloadFiletypeCategories']['zip']['downloads']
    source = next(d for d in downloads if d['attribute'] == '1K-PNG')
    url = source['downloadLink']
    if not url.startswith('https://ambientcg.com/get?file='):
        raise RuntimeError('UNEXPECTED_MATERIAL_DOWNLOAD_HOST')
    cache = Path('/tmp/vibe-pbr-downloads') / source['fileName']
    cache.parent.mkdir(parents=True, exist_ok=True)
    data = cache.read_bytes() if cache.is_file() else get(url)
    cache.write_bytes(data)
    if len(data) != source['size']:
        raise RuntimeError('MATERIAL_ARCHIVE_SIZE_MISMATCH:' + asset_id)
    files = {}
    with zipfile.ZipFile(io.BytesIO(data)) as archive:
        for entry in archive.infolist():
            basename = Path(entry.filename).name
            channel = next((v for k, v in CHANNELS.items() if basename.endswith('_' + k + '.png')), None)
            if channel is None:
                continue
            if entry.file_size > 16 * 1024 * 1024:
                raise RuntimeError('MATERIAL_MAP_TOO_LARGE')
            pixels = archive.read(entry)
            with Image.open(io.BytesIO(pixels)) as image:
                image.load()
                if max(image.size) != 1024 or min(image.size) < 128 or any(v & (v - 1) for v in image.size):
                    raise RuntimeError('MATERIAL_MAP_DIMENSIONS_INVALID:' + asset_id + ':' + str(image.size))
                dimensions = list(image.size)
                mode = image.mode
            target = OUT / 'sources' / asset_id / basename
            target.parent.mkdir(parents=True, exist_ok=True)
            target.write_bytes(pixels)
            files[channel] = {'path': target.relative_to(ROOT).as_posix(),
                              'sha256': hashlib.sha256(pixels).hexdigest(),
                              'bytes': len(pixels), 'dimensions': dimensions, 'mode': mode,
                              'colorSpace': 'SRGB' if channel == 'color' else 'LINEAR',
                              'sourceArchiveEntry': entry.filename}
    if not {'color', 'normal', 'roughness'}.issubset(files):
        raise RuntimeError('MATERIAL_CHANNEL_MISSING:' + asset_id)
    result = {'id': asset_id, 'sourceUrl': 'https://ambientcg.com/a/' + asset_id,
              'downloadUrl': url, 'sourceArchiveSha256': hashlib.sha256(data).hexdigest(),
              'sourceArchiveBytes': len(data), 'license': 'CC0-1.0',
              'licenseEvidenceUrl': 'https://docs.ambientcg.com/license/',
              'normalConvention': 'OPENGL_TANGENT_SPACE', 'resolution': 1024,
              'sourceFilesUnchanged': True, 'maps': files,
              'nativeAssetIds': None, 'productionVerified': False,
              'runtimeVisualReview': 'PENDING_NATIVE_IMPORT'}
    if len({tuple(row['dimensions']) for row in files.values()}) != 1:
        raise RuntimeError('MATERIAL_CHANNEL_DIMENSIONS_MISMATCH:' + asset_id)
    print('ACQUIRED', asset_id, len(files), flush=True)
    return result


if __name__ == '__main__':
    OUT.mkdir(parents=True, exist_ok=True)
    metadata = json.loads(get('https://ambientcg.com/api/v2/full_json?id=' + ','.join(IDS) +
                              '&include=downloadData,displayData,dimensionsData,mapData'))
    assets = metadata['foundAssets']
    if {a['assetId'] for a in assets} != set(IDS):
        raise RuntimeError('MATERIAL_SOURCE_CATALOG_INCOMPLETE')
    with concurrent.futures.ThreadPoolExecutor(max_workers=3) as pool:
        results = sorted(pool.map(acquire, assets), key=lambda a: a['id'])
    manifest = {'version': 1, 'acquiredAt': datetime.datetime.now(datetime.timezone.utc).isoformat(),
                'materials': results, 'materialCount': len(results),
                'mapCount': sum(len(a['maps']) for a in results),
                'productionVerified': False, 'authority': 'GRAPHICS_PRODUCTION'}
    (OUT / 'manifest.json').write_text(json.dumps(manifest, indent=2) + '\n')
    (OUT / 'LICENSE.txt').write_text('ambientCG assets: Creative Commons CC0 1.0 Universal.\n'
        'Source and license evidence: https://docs.ambientcg.com/license/\n'
        'License text: https://creativecommons.org/publicdomain/zero/1.0/legalcode\n'
        'Original downloaded map bytes are preserved; per-file SHA256 is in manifest.json.\n')
