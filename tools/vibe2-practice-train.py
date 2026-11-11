# 파일명: tools/vibe2-practice-train.py
import argparse
import importlib.util
import json
import sys
import hashlib
from pathlib import Path


ALLOWED_LICENSES = {'MIT', 'APACHE-2.0', 'BSD-2-CLAUSE', 'BSD-3-CLAUSE'}


def load_base_trainer():
    source = Path(__file__).with_name('vibe2-train.py')
    spec = importlib.util.spec_from_file_location('vibe2_train_base', source)
    module = importlib.util.module_from_spec(spec)
    assert spec.loader is not None
    spec.loader.exec_module(module)
    return module


def practice_validate(args, manifest, train_rows, eval_rows):
    if int(manifest.get('version', 0)) < 4:
        raise RuntimeError('practice dataset manifest v4 or newer is required')
    if manifest.get('readyForTraining') is not True:
        raise RuntimeError('practice dataset is not readyForTraining')
    if manifest.get('authority') != 'PRACTICE_ONLY' or manifest.get('practiceOnly') is not True:
        raise RuntimeError('practice trainer accepts PRACTICE_ONLY dataset only')
    if manifest.get('runtimePromotionAllowed') is not False:
        raise RuntimeError('practice dataset must forbid runtime promotion')
    if manifest.get('targetTaskType') != args.task_type or args.task_type not in ('unity', 'roblox'):
        raise RuntimeError('practice trainer accepts taskType=unity or roblox only')
    if not train_rows or not eval_rows:
        raise RuntimeError('practice train and eval rows are required')
    stats = manifest.get('stats') or {}
    if int(stats.get('train', -1)) != len(train_rows) or int(stats.get('eval', -1)) != len(eval_rows):
        raise RuntimeError('practice dataset row counts do not match manifest')
    # [검증 보류셋] 로블록스 연습 v6부터는 학습·평가와 다른 문제 계열의 보류셋을 고정한다.
    holdout_rows = []
    if args.task_type == 'roblox' and int(manifest.get('version', 0)) >= 6:
        if (manifest.get('holdoutAuthority') != 'DISJOINT_FAMILIES_PRACTICE_ONLY' or
                manifest.get('independentExternalBenchmarkVerified') is not False):
            raise RuntimeError('Roblox holdout may be practice-only, never verified external benchmark')
        holdout_path = getattr(args, 'holdout', None)
        if not holdout_path or not Path(holdout_path).is_file():
            raise RuntimeError('Roblox practice holdout file required')
        holdout_rows = [json.loads(line) for line in Path(holdout_path).read_text(encoding='utf-8').splitlines() if line.strip()]
        held_hash = hashlib.sha256(('\n'.join(json.dumps(row, ensure_ascii=False,
            sort_keys=True, separators=(',', ':')) for row in holdout_rows)).encode('utf-8')).hexdigest()
        if held_hash != manifest.get('holdoutSha256') or len(holdout_rows) != int(stats.get('holdout', -1)):
            raise RuntimeError('Roblox practice holdout hash/count mismatch')
        groups = [{row.get('familyId') for row in part} for part in (train_rows, eval_rows, holdout_rows)]
        if any(None in group for group in groups) or any(groups[i] & groups[j]
                for i in range(3) for j in range(i + 1, 3)):
            raise RuntimeError('Roblox practice family leaked across train/eval/holdout')
        if (sum(r.get('sampleKind') == 'CODE_IMPLEMENTATION' for r in holdout_rows) < 2 or
                int(stats.get('codeImplementationHoldout', -1)) !=
                sum(r.get('sampleKind') == 'CODE_IMPLEMENTATION' for r in holdout_rows) or
                sum(r.get('sampleKind') == 'CODE_IMPLEMENTATION' for r in train_rows) < 10 or
                sum(r.get('sampleKind') == 'CODE_IMPLEMENTATION' for r in eval_rows) < 2):
            raise RuntimeError('Roblox implementation holdout stratification failed')
    elif args.task_type == 'roblox':
        raise RuntimeError('Roblox practice requires v6 disjoint holdout')
    if int(manifest.get('version', 0)) >= 5:
        for name, rows in [('train', train_rows), ('eval', eval_rows)]:
            payload = '\n'.join(json.dumps(row, ensure_ascii=False, sort_keys=True, separators=(',', ':')) for row in rows)
            if hashlib.sha256(payload.encode('utf-8')).hexdigest() != manifest.get(name + 'Sha256'):
                raise RuntimeError('practice ' + name + ' hash mismatch')
        train_families = {row.get('familyId') for row in train_rows}
        eval_families = {row.get('familyId') for row in eval_rows}
        if None in train_families | eval_families or train_families & eval_families:
            raise RuntimeError('practice exercise family leakage')
    # Roblox practice must exercise actual implementation in both disjoint splits.
    # A historical reference-only artifact is not a valid Roblox coding run.
    if args.task_type == 'roblox':
        for split, rows in (('Train', train_rows), ('Eval', eval_rows)):
            code_rows = sum(
                row.get('sampleKind') == 'CODE_IMPLEMENTATION'
                and row.get('sourceKind') == 'teacher'
                and row.get('synthetic') is True
                for row in rows
            )
            if code_rows < 1 or int(stats.get('codeImplementation' + split, -1)) != code_rows:
                raise RuntimeError('Roblox practice requires original Luau code samples in both train and eval')
        source_kinds = set(manifest.get('sourceKinds') or [])
        if not manifest.get('containsLicensedReference') or not {'teacher', 'licensed-reference'}.issubset(source_kinds):
            raise RuntimeError('Roblox practice requires original Luau exercises and licensed references')

    found_licensed = 0
    for row in train_rows + eval_rows + holdout_rows:
        if row.get('taskType') != args.task_type or row.get('practiceOnly') is not True:
            raise RuntimeError('non-matching practice row reached practice trainer')
        if row.get('runtimePromotionAllowed') is not False or row.get('lifecycle') != 'active':
            raise RuntimeError('unsafe or inactive practice row reached trainer')
        source_kind = row.get('sourceKind') or (row.get('provenance') or {}).get('sourceKind')
        if source_kind == 'teacher':
            if row.get('synthetic') is not True:
                raise RuntimeError('teacher practice row must be marked synthetic')
        elif source_kind == 'licensed-reference':
            if row.get('synthetic') is not False:
                raise RuntimeError('licensed reference must not be marked synthetic')
            provenance = row.get('provenance') or {}
            if '/' not in str(provenance.get('repository', '')):
                raise RuntimeError('licensed reference repository missing')
            commit = str(provenance.get('commit', ''))
            if len(commit) != 40 or any(ch not in '0123456789abcdefABCDEF' for ch in commit):
                raise RuntimeError('licensed reference exact commit missing')
            if str(provenance.get('licenseSpdx', '')).upper() not in ALLOWED_LICENSES:
                raise RuntimeError('licensed reference license is not allowed')
            if not provenance.get('sourcePaths') or (row.get('qa') or {}).get('licenseCheck') != 'PASS':
                raise RuntimeError('licensed reference source paths/license check missing')
            found_licensed += 1
        else:
            raise RuntimeError('unsupported practice sourceKind')
    if manifest.get('containsLicensedReference') is True and found_licensed == 0:
        raise RuntimeError('manifest says licensed references exist but rows contain none')


def find_paths(argv):
    parser = argparse.ArgumentParser(add_help=False)
    parser.add_argument('--output', required=True)
    parser.add_argument('--dataset-manifest', required=True)
    known, _ = parser.parse_known_args(argv)
    return Path(known.output), Path(known.dataset_manifest)


def main():
    output, dataset_manifest_path = find_paths(sys.argv[1:])
    trainer = load_base_trainer()
    trainer.validate_manifest = practice_validate
    trainer.main()
    metadata_file = output / 'training-metadata.json'
    metadata = json.loads(metadata_file.read_text(encoding='utf-8'))
    dataset_manifest = json.loads(dataset_manifest_path.read_text(encoding='utf-8'))
    stats = dataset_manifest.get('stats') or {}
    metadata['practiceOnly'] = True
    metadata['trainingAuthority'] = 'PRACTICE_ONLY'
    metadata['syntheticOnly'] = bool(dataset_manifest.get('syntheticOnly', False))
    metadata['containsSyntheticTeacherSamples'] = int(stats.get('syntheticTotal', 0)) > 0
    metadata['containsLicensedReference'] = bool(dataset_manifest.get('containsLicensedReference', False))
    metadata['practiceSourceKinds'] = dataset_manifest.get('sourceKinds', [])
    metadata['licensedReferenceSamples'] = int(stats.get('licensedReferenceTotal', 0))
    metadata['verifiedRealOnly'] = False
    metadata['verifiedProductionEvidence'] = False
    metadata['promotionState'] = 'UNVERIFIED'
    metadata['runtimePromotionAllowed'] = False
    metadata['requiredNextGate'] = 'VERIFIED_' + str(dataset_manifest['targetTaskType']).upper() + '_HOLDOUT_AB_AND_CANARY'
    metadata_file.write_text(json.dumps(metadata, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
    print(json.dumps({
        'practiceTraining': 'PASS',
        'adapterVersion': metadata.get('adapterVersion'),
        'promotionState': metadata['promotionState'],
        'runtimePromotionAllowed': metadata['runtimePromotionAllowed'],
        'containsLicensedReference': metadata['containsLicensedReference'],
        'licensedReferenceSamples': metadata['licensedReferenceSamples'],
        'verifiedRealOnly': metadata['verifiedRealOnly'],
        'verifiedProductionEvidence': metadata['verifiedProductionEvidence'],
        'requiredNextGate': metadata['requiredNextGate'],
        'trainLoss': (metadata.get('trainMetrics') or {}).get('train_loss'),
        'evalLoss': (metadata.get('evalMetrics') or {}).get('eval_loss'),
    }, ensure_ascii=False))


if __name__ == '__main__':
    main()
