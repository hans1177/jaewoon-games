import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(import.meta.dirname, '..');
const readJson = (p) => JSON.parse(fs.readFileSync(path.join(root, p), 'utf8'));
const policy = readJson('company-policy.json');
const directive = readJson('company-directive.json');
const handoff = readJson('project-handoff.json');
const parallel = readJson('vibe2-parallel-architecture.json');
const errors = [];
const expect = (ok, msg) => { if (!ok) errors.push(msg); };

expect(policy?._meta?.sourceOfTruth === true, 'company-policy.json must be sourceOfTruth');
expect(policy?._meta?.policyVersion === directive?.policyVersion, 'directive policyVersion mismatch');
expect(policy?.policy?.policy?.sourceOfTruth === 'company-policy.json', 'embedded policy sourceOfTruth mismatch');
expect(directive?.policyDocument === 'company-policy.json', 'directive policyDocument mismatch');
expect(handoff?.policyDocument === 'company-policy.json' && handoff?.policyAuthority === false, 'handoff authority mismatch');
expect(parallel?.policyDocument === 'company-policy.json' && parallel?.policyAuthority === false, 'parallel contract authority mismatch');

const ids = (policy._ruleIndex || []).map((r) => r.id);
expect(ids.length > 0, 'rule index missing');
expect(new Set(ids).size === ids.length, 'duplicate rule ids');

const ownerConcurrency = policy?.policy?.ownerCurrentProductionContract?.developmentConcurrency;
expect(ownerConcurrency?.concurrentGameWipTarget === 20, 'owner concurrentGameWipTarget must be 20');
expect(ownerConcurrency?.concurrentGameWipMax === 20, 'owner concurrentGameWipMax must be 20');
expect(ownerConcurrency?.webValidationParallelismTarget === 20, 'owner webValidationParallelismTarget must be 20');
expect(ownerConcurrency?.webValidationParallelismMax === 20, 'owner webValidationParallelismMax must be 20');
expect(policy?.policy?.production?.fixedClassCounts === false, 'fixed production class counts must stay false');
expect(policy?.policy?.ownerCurrentProductionContract?.categoryAndPlatform?.fixedSixCategoryProductionQuotaForbidden === true, 'fixed six-category quota must stay forbidden');
expect(parallel?.fixedProductionClassCountsForbidden === true, 'parallel contract must reject fixed class counts');
expect(directive?.developmentConcurrency?.concurrentGameWipMax === 20, 'directive concurrency mirror must be 20');

const forbiddenRefs = ['COMPANY_FLOW.md', 'VIBE2_PARALLEL_ARCHITECTURE.md', 'PROJECT_HANDOFF.md'];
const scanRoots = ['AGENTS.md', 'company-directive.json', 'project-handoff.json', 'vibe2-parallel-architecture.json'];
for (const file of scanRoots) {
  const text = fs.readFileSync(path.join(root, file), 'utf8');
  for (const ref of forbiddenRefs) expect(!text.includes(ref), `${file} still references ${ref}`);
}
for (const removed of forbiddenRefs) expect(!fs.existsSync(path.join(root, removed)), `${removed} should be removed`);

if (errors.length) {
  console.error('COMPANY_POLICY_VALIDATION=FAIL');
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}
console.log(`COMPANY_POLICY_VALIDATION=PASS rules=${ids.length} version=${policy._meta.policyVersion}`);
