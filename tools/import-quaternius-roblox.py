# 파일명: tools/import-quaternius-roblox.py
# [임포트] 승인된 CC0 원본 ZIP을 기존 로블록스 액터 소스와 등록 목록에 직접 반영한다.
import argparse
import hashlib
import json
import pathlib
import zipfile

# [설정] 사용자 제공 ZIP 원본의 정확한 해시와 공식 라이선스 출처
PACKS = {
    'monsters': {
        'sha256': '882a0410b643c8c7afd3e55fec9e722756e66e2cbc2112c9049d40208aed21e1',
        'source_url': 'https://quaternius.com/packs/ultimatemonsters.html',
        'folder': 'quaternius-ultimate-monsters',
        'count': 50,
    },
    'nature': {
        'sha256': '865e4ae735116181923fe6ace410da3cec29e814935dc90fb298e0af3a4ff869',
        'source_url': 'https://quaternius.com/packs/ultimatenature.html',
        'folder': 'quaternius-ultimate-nature',
        'count': 150,
    },
    'village': {
        'sha256': 'ee6f2b793a89b1d0ab64b7cfda9c253667fdb1d1aca0539ece4e3a64b3bb3286',
        'source_url': 'https://quaternius.com/packs/medievalvillage.html',
        'folder': 'quaternius-medieval-village',
        'count': 44,
    },
}


def digest(data):
    return hashlib.sha256(data).hexdigest()


# [메인] 기존 소스 경로·라이선스·SHA를 보존하고 사용 검증 전 상태로 등록

def import_packs(repo_root, zip_dir):
    manifest_path = repo_root / 'assets/roblox/actors/manifest.json'
    manifest = json.loads(manifest_path.read_text(encoding='utf-8'))
    if not isinstance(manifest.get('sources'), list):
        raise ValueError('기존 액터 등록 목록 형식이 달라')

    planned = []
    for name, config in PACKS.items():
        archive = zip_dir / (name + '.zip')
        if not archive.is_file():
            raise FileNotFoundError(str(archive))
        if digest(archive.read_bytes()) != config['sha256']:
            raise ValueError(name + '.zip 원본 해시 불일치')
        dest_root = pathlib.Path('assets/roblox/actors/sources') / config['folder']
        files = []
        with zipfile.ZipFile(archive) as z:
            if z.testzip() is not None:
                raise ValueError(name + '.zip CRC 오류')
            entries = [info for info in z.infolist() if not info.is_dir() and (
                info.filename.lower().endswith(('.fbx', '.png', '.jpg')) or
                pathlib.PurePosixPath(info.filename).name.lower() == 'license.txt'
            )]
            for info in entries:
                rel = pathlib.PurePosixPath(info.filename)
                if rel.is_absolute() or '..' in rel.parts:
                    raise ValueError('압축파일 경로 오류')
                output_rel = dest_root.joinpath(*rel.parts)
                raw = z.read(info)
                files.append((output_rel, raw))
        models = [(p, raw) for p, raw in files if p.suffix.lower() == '.fbx']
        if len(models) != config['count']:
            raise ValueError(name + ' FBX 모델 수 불일치')
        if not any(p.name.lower() == 'license.txt' for p, _ in files):
            raise ValueError(name + ' 라이선스 누락')
        entry = {
            'id': config['folder'],
            'creator': 'Quaternius',
            'sourceUrl': config['source_url'],
            'license': 'CC0-1.0',
            'modelCount': len(models),
            'models': [str(p.relative_to(dest_root)).replace('\\', '/') for p, _ in models],
            'sourceArchiveName': name + '.zip',
            'sourceArchiveSha256': config['sha256'],
            'sourceFiles': [
                {'path': p.as_posix(), 'sha256': digest(raw)} for p, raw in files
            ],
            'conversionState': 'FBX_SOURCE_IMPORTED_ROBLOX_STUDIO_PENDING',
            'productionVerified': False,
            'runtimeVerified': False,
            'universeUseGrant': 'REQUIRED_FOR_EACH_EXACT_PUBLISH_TARGET',
        }
        planned.append((entry, files))

    # [검증] 기존 파일 덮어쓰기·중복 등록을 방지한다.
    existing = {entry.get('id'): entry for entry in manifest['sources']}
    for entry, files in planned:
        if entry['id'] in existing and existing[entry['id']] != entry:
            raise ValueError(entry['id'] + ' 기존 등록 내용 충돌')
        for output_rel, raw in files:
            path = repo_root / output_rel
            if path.exists() and digest(path.read_bytes()) != digest(raw):
                raise ValueError(str(output_rel) + ' 기존 파일 충돌')

    # [저장] 모든 ZIP 검증 통과 후 기존 책임 디렉터리에만 반영한다.
    for entry, files in planned:
        for output_rel, raw in files:
            path = repo_root / output_rel
            path.parent.mkdir(parents=True, exist_ok=True)
            if not path.exists():
                path.write_bytes(raw)
        if entry['id'] not in existing:
            manifest['sources'].append(entry)
        print(entry['id'], entry['modelCount'], 'FBX 반영')
    manifest_path.write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
    print('총 244개 모델 소스 등록. 로블록스 스튜디오/배포 QA 미검증.')


if __name__ == '__main__':
    parser = argparse.ArgumentParser()
    parser.add_argument('--repo-root', type=pathlib.Path, default=pathlib.Path(__file__).resolve().parent.parent)
    parser.add_argument('--archive-dir', type=pathlib.Path, required=True)
    args = parser.parse_args()
    import_packs(args.repo_root.resolve(), args.archive_dir.resolve())