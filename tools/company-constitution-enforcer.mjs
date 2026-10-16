// 파일명: tools/company-constitution-enforcer.mjs
// 임포트
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

// 메인: 검증 가능한 중앙정책이 없으면 권한을 임의로 부여하지 않는다.
export function enforceConstitution({phase = 'runtime', root = process.cwd(), policy} = {}) {
  const errors = [];
  let directive;
  try {
    directive = JSON.parse(fs.readFileSync(path.join(root, 'company-directive.json'), 'utf8'));
  } catch {
    errors.push('OWNER_DIRECTIVE_UNAVAILABLE');
  }

  const policyPath = 'company-learning/platform-release-roadmap.json';
  const exists = fs.existsSync(path.join(root, policyPath));
  if (directive) {
    if (directive.policyDocument !== null ||
        directive.documentationSynchronization?.centralPolicyPath !== null) {
      errors.push('OWNER_DIRECTIVE_POLICY_SOURCE_MISMATCH');
    }
    if (directive.status !== 'MINIMAL_SUMMARY_NOT_REPLACEMENT_POLICY' ||
        directive.execution?.centralPolicyMissing !== 'FAIL_CLOSED' ||
        directive.execution?.workerBeforeSourceWriteRequired !== true ||
        directive.execution?.unverifiedClaimsForbidden !== true) {
      errors.push('OWNER_DIRECTIVE_MINIMAL_CONTRACT_INVALID');
    }
    if (exists) errors.push('DELETED_POLICY_REAPPEARED_REQUIRES_OWNER_REVIEW');
  }
  if (policy !== undefined) errors.push('DELETED_CONSTITUTION_CANNOT_BE_REINSTATED_BY_CALLER');
  errors.push('CONSTITUTION_AUTHORITY_UNAVAILABLE');
  return {
    pass: false,
    phase,
    errors,
    constitutionFingerprint: null,
    orderedRuleIds: [],
    enforcedRuleCount: 0,
    enforcementSchemaVersion: 0
  };
}

// 로그
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const phaseArg = process.argv.slice(2).find(value => value.startsWith('--phase='));
  const result = enforceConstitution({phase: phaseArg ? phaseArg.slice(8) : 'runtime'});
  console.log('CONSTITUTION_ENFORCEMENT=BLOCKED');
  console.log('CONSTITUTION_PHASE=' + result.phase);
  console.log('CONSTITUTION_FAILURE_STAGE=CANONICAL_AUTHORITY');
  console.log('CONSTITUTION_FAILURE_SIGNATURE=' + result.errors.join(','));
  process.exitCode = 1;
}
