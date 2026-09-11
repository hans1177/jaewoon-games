import argparse
import importlib.util
from pathlib import Path

MODULE_PATH = Path(__file__).resolve().parents[1] / 'tools' / 'vibe2-train.py'
spec = importlib.util.spec_from_file_location('vibe2_train', MODULE_PATH)
module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(module)

row = {
    'instruction': 'verify black-box runtime evidence',
    'input': 'observed external Android runtime',
    'output': 'bounded verified QA observation',
    'taskType': 'qa',
    'lifecycle': 'active',
    'synthetic': False,
    'qualityScore': 1.0,
    'qa': {
        'independentQa': 'BLACK_BOX_EVIDENCE_PASS',
        'browserQa': 'NOT_APPLICABLE',
        'runtime': 'PASS',
        'requirements': {'androidRuntimeRequired': False},
    },
    'provenance': {'sourceKind': 'external-black-box'},
    'verification': {'blackBoxEvidence': 'PASS', 'proprietaryExtraction': False},
}
train_rows = [row]
eval_rows = [dict(row)]
manifest = {
    'version': 3,
    'readyForTraining': True,
    'targetTaskType': 'qa',
    'seed': 20260910,
    'contamination': {'pass': True, 'contaminationRate': 0},
    'diversity': {'pass': True},
    'batching': {'pass': True},
    'taskTrainingPlan': {'qa': {'ready': True}},
    'policy': {'teacherOnlyDifficult': True},
    'stats': {'train': 1, 'eval': 1, 'syntheticTrain': 0, 'deprecatedUsed': False},
    'trainSha256': module.dataset_hash(train_rows),
    'evalSha256': module.dataset_hash(eval_rows),
}
args = argparse.Namespace(task_type='qa', seed=20260910)
module.validate_manifest(args, manifest, train_rows, eval_rows)
assert module.is_external_black_box_qa(row, row['qa']) is True

bad = dict(row)
bad['provenance'] = {'sourceKind': 'vibe2'}
bad_rows = [bad]
bad_manifest = dict(manifest)
bad_manifest['trainSha256'] = module.dataset_hash(bad_rows)
bad_manifest['stats'] = dict(manifest['stats'])
try:
    module.validate_manifest(args, bad_manifest, bad_rows, eval_rows)
except RuntimeError:
    pass
else:
    raise AssertionError('unverified sourceKind must not bypass browser QA')

print('PASS trainer external black-box QA contract')
