// 파일명: tools/company-constitution-enforcer.mjs
// 임포트
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

// 메인: 삭제된 헌법을 임의 복구하거나 유효하다고 가장하지 않는다.
export function enforceConstitution({phase = 'runtime', root = process.cwd(), policy} = {}) {
  const errors = [];
  const directivePath = path.join(root, 'company-directive.json');
  let directive;
  try {
    directive = JSON.parse(fs.readFileSync(directivePath, 'utf8'));
  } catch {
    errors.push('OWNER_DIRECTIVE_UNAVAILABLE');
  }

  if (directive && (directive.policyDocument !== null || directive.documentationSynchronization?.centralPolicyPath !== null)) {
    errors.push('OWNER_DIRECTIVE_POLICY_SOURCE_MISMATCH');
  }
  if (directive && !String(directive.instruction || '').includes('f2d13b369e27b8344342da025513687388011f8d')) {
    errors.push('OWNER_DIRECTIVE_POLICY_DELETION_UNVERIFIED');
  }
  if (policy !== undefined) {
    errors.push('DELETED_CONSTITUTION_CANNOT_BE_REINSTATED_BY_CALLER');
  }
  // 중앙 헌법 규칙의 검증 가능한 정본이 없다. PASS를 발급하지 않는다.
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
