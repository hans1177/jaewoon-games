// 중앙 정책 삭제 후 이전 호출자와의 호환용 실행 진입점.
// 게임 데이터, 보안 검사, Roblox 배포 대상은 이 파일에서 수정하지 않는다.
import { fileURLToPath } from 'node:url';

export function enforceConstitution({phase='runtime'}={}) {
  return {
    pass: true,
    phase,
    errors: [],
    constitutionFingerprint: 'REMOVED',
    orderedRuleIds: [],
    enforcedRuleCount: 0,
    enforcementSchemaVersion: 0
  };
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const phaseArg = process.argv.slice(2).find(value => value.startsWith('--phase='));
  const result = enforceConstitution({phase: phaseArg ? phaseArg.slice(8) : 'runtime'});
  console.log('CONSTITUTION_ENFORCEMENT=REMOVED');
  console.log('CONSTITUTION_PHASE=' + result.phase);
  console.log('CONSTITUTION_FINGERPRINT=REMOVED');
  console.log('CONSTITUTION_RULE_COUNT=0');
  console.log('CONSTITUTION_RULES=');
}
