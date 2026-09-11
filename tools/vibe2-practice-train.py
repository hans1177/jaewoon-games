# 파일명: tools/vibe2-practice-train.py
import argparse
import importlib.util
import json
import sys
from pathlib import Path


def load_base_trainer():
    source = Path(__file__).with_name('vibe2-train.py')
    spec = importlib.util.spec_from_file_location('vibe2_train_base', source)
    module = importlib.util.module_from_spec(spec)
    assert spec.loader is not None
    spec.loader.exec_module(module)
    return module


def practice_validate(args, manifest, train_rows, eval_rows):
    if int(manifest.get('version', 0)) < 3:
        raise RuntimeError('practice dataset manifest v3 or newer is required')
    if manifest.get('readyForTraining') is not True:
        raise RuntimeError('practice dataset is not readyForTraining')
    if manifest.get('authority') != 'PRACTICE_ONLY' or manifest.get('practiceOnly') is not True:
        raise RuntimeError('practice trainer accepts PRACTICE_ONLY dataset only')
    if manifest.get('syntheticOnly') is not True:
        raise RuntimeError('practice dataset must be syntheticOnly')
    if manifest.get('runtimePromotionAllowed') is not False:
        raise RuntimeError('practice dataset must forbid runtime promotion')
    if manifest.get('targetTaskType') != args.task_type or args.task_type != 'unity':
        raise RuntimeError('practice trainer accepts taskType=unity only')
    if not train_rows or not eval_rows:
        raise RuntimeError('practice train and eval rows are required')
    stats = manifest.get('stats') or {}
    if int(stats.get('train', -1)) != len(train_rows) or int(stats.get('eval', -1)) != len(eval_rows):
        raise RuntimeError('practice dataset row counts do not match manifest')
    for row in train_rows + eval_rows:
        if row.get('taskType') != 'unity':
            raise RuntimeError('non-Unity row reached practice trainer')
        if row.get('synthetic') is not True or row.get('practiceOnly') is not True:
            raise RuntimeError('non-practice row reached practice trainer')
        if row.get('sourceKind') != 'teacher' and (row.get('provenance') or {}).get('sourceKind') != 'teacher':
            raise RuntimeError('practice row must come from teacher')
        if row.get('runtimePromotionAllowed') is not False:
            raise RuntimeError('practice row attempted runtime promotion')
        if row.get('lifecycle') != 'active':
            raise RuntimeError('inactive practice row reached trainer')


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
    metadata['practiceOnly'] = True
    metadata['trainingAuthority'] = 'PRACTICE_ONLY'
    metadata['syntheticOnly'] = True
    metadata['promotionState'] = 'UNVERIFIED'
    metadata['runtimePromotionAllowed'] = False
    metadata['requiredNextGate'] = 'VERIFIED_UNITY_HOLDOUT_AB_AND_CANARY'
    metadata_file.write_text(json.dumps(metadata, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
    print(json.dumps({
        'practiceTraining': 'PASS',
        'adapterVersion': metadata.get('adapterVersion'),
        'promotionState': metadata['promotionState'],
        'runtimePromotionAllowed': metadata['runtimePromotionAllowed'],
        'requiredNextGate': metadata['requiredNextGate'],
        'trainLoss': (metadata.get('trainMetrics') or {}).get('train_loss'),
        'evalLoss': (metadata.get('evalMetrics') or {}).get('eval_loss'),
    }, ensure_ascii=False))


if __name__ == '__main__':
    main()
