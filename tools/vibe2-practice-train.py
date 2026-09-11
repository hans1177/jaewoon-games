# 파일명: tools/vibe2-practice-train.py
import argparse
import importlib.util
import json
import sys
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
    if manifest.get('targetTaskType') != args.task_type or args.task_type != 'unity':
        raise RuntimeError('practice trainer accepts taskType=unity only')
    if not train_rows or not eval_rows:
        raise RuntimeError('practice train and eval rows are required')
    stats = manifest.get('stats') or {}
    if int(stats.get('train', -1)) != len(train_rows) or int(stats.get('eval', -1)) != len(eval_rows):
        raise RuntimeError('practice dataset row counts do not match manifest')
    found_licensed = 0
    for row in train_rows + eval_rows:
        if row.get('taskType') != 'unity' or row.get('practiceOnly') is not True:
            raise RuntimeError('non-Unity practice row reached practice trainer')
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


def find_output(argv):
    parser = argparse.ArgumentParser(add_help=False)
    parser.add_argument('--output', required=True)
    known, _ = parser.parse_known_args(argv)
    return Path(known.output)


def main():
    output = find_output(sys.argv[1:])
    trainer = load_base_trainer()
    trainer.validate_manifest = practice_validate
    trainer.main()
    metadata_file = output / 'training-metadata.json'
    metadata = json.loads(metadata_file.read_text(encoding='utf-8'))
    dataset_manifest = metadata.get('datasetManifest') or {}
    metadata['practiceOnly'] = True
    metadata['trainingAuthority'] = 'PRACTICE_ONLY'
    metadata['syntheticOnly'] = bool(dataset_manifest.get('syntheticOnly', False))
    metadata['containsLicensedReference'] = bool(dataset_manifest.get('containsLicensedReference', False))
    metadata['promotionState'] = 'UNVERIFIED'
    metadata['runtimePromotionAllowed'] = False
    metadata['requiredNextGate'] = 'VERIFIED_UNITY_HOLDOUT_AB_AND_CANARY'
    metadata_file.write_text(json.dumps(metadata, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
    print(json.dumps({
        'practiceTraining': 'PASS',
        'adapterVersion': metadata.get('adapterVersion'),
        'promotionState': metadata['promotionState'],
        'runtimePromotionAllowed': metadata['runtimePromotionAllowed'],
        'containsLicensedReference': metadata['containsLicensedReference'],
        'requiredNextGate': metadata['requiredNextGate'],
        'trainLoss': (metadata.get('trainMetrics') or {}).get('train_loss'),
        'evalLoss': (metadata.get('evalMetrics') or {}).get('eval_loss'),
    }, ensure_ascii=False))


if __name__ == '__main__':
    main()
