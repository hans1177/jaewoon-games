from pathlib import Path
import json


def replace_exact(path, old, new):
    p=Path(path)
    text=p.read_text(encoding='utf-8')
    count=text.count(old)
    if count!=1:
        raise SystemExit(f'PATCH_TARGET_COUNT:{path}:{count}')
    p.write_text(text.replace(old,new),encoding='utf-8')

# Owner policy: development score shown on homepage must represent current validated play evidence,
# not a stale/historical partial score left in the runtime queue.
replace_exact(
    'COMPANY_FLOW.md',
    '      developmentScoreDisplayEnabled: true\n      developmentRanking: SCORE_DESC\n      unratedDevelopmentGamesLast: true\n',
    '      developmentScoreDisplayEnabled: true\n      developmentScoreSource: CURRENT_WEB_INITIAL_CYCLE_STRICT_SCORE\n      developmentScoreRequiresInitialCyclePass: true\n      developmentScoreRequiresSchema13: true\n      developmentScoreRequiresMusicPass: true\n      developmentScoreRequiresCurrentSourceAndBaselineBindingWhenAvailable: true\n      reworkOrRevalidationScoresNotShownAsCurrent: true\n      developmentRanking: SCORE_DESC\n      unratedDevelopmentGamesLast: true\n'
)

p=Path('company-directive.json')
data=json.loads(p.read_text(encoding='utf-8'))
dev=data['homepageOperations']['developmentProgressDisplay']
dev['scoreSource']='CURRENT_WEB_INITIAL_CYCLE_STRICT_SCORE'
dev['scoreRequiresInitialCyclePass']=True
dev['scoreRequiresSchema13']=True
dev['scoreRequiresMusicPass']=True
dev['scoreRequiresCurrentSourceAndBaselineBindingWhenAvailable']=True
dev['reworkOrRevalidationScoresNotShownAsCurrent']=True
p.write_text(json.dumps(data,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')

replace_exact(
    'HOMEPAGE_OPERATIONS.md',
    '- 표시 정보는 게임명과 `status`, `currentStep`, `selectedPlatform`, 현재 개발 점수를 표시한다.\n- 개발게임은 현재 검증 점수 높은 순으로 자동 정렬하고, 점수가 아직 없는 게임은 아래에 둔다. 같은 점수면 ACTIVE 상태와 최근 업데이트 순을 보조 기준으로 사용한다.\n',
    '- 표시 정보는 게임명과 `status`, `currentStep`, `selectedPlatform`, **현재 유효한 플레이 검증 점수**를 표시한다.\n- 개발 점수는 현재 소스/설계에 연결된 schema13 `webInitialCycleStrictScore`만 사용하며, 초기 플레이 사이클·음악 검증이 통과한 경우에만 현재 점수로 인정한다.\n- 재작업/재검증 상태의 과거 `webStrictScore`, `strictImplementationScore`, `homepageTestScore`는 현재 개발 점수로 표시하지 않고 `재검증 필요`로 표시한다.\n- 개발게임은 현재 유효한 점수 높은 순으로 자동 정렬하고, 재검증 필요/미평가 게임은 아래에 둔다. 같은 점수면 ACTIVE 상태와 최근 업데이트 순을 보조 기준으로 사용한다.\n'
)

core_path=Path('assets/homepage-enhancements-core.js')
core=core_path.read_text(encoding='utf-8')
old="const developmentScoreOf=row=>{for(const key of ['webStrictScore','strictImplementationScore','homepageTestScore','strictScore','reviewScore','totalScore','score']){const n=Number(row?.[key]);if(Number.isFinite(n))return n;}return null;};\n"
new="const developmentScoreState=row=>{const canonical=String(row?.canonicalState||'').trim().toUpperCase();const verdict=String(row?.homepageTestVerdict||'').trim().toUpperCase();const blockers=Array.isArray(row?.routingBlockers)?row.routingBlockers.join(' ').toUpperCase():'';const revalidation=/(REWORK|REVALIDATION|RETURN_TO_WEB_DEVELOPMENT)/.test(`${canonical} ${verdict} ${blockers}`);const raw=row?.webInitialCycleStrictScore;const score=raw===null||raw===undefined||raw===''?null:Number(raw);const schema=Number(row?.webInitialCycleValidationSchemaVersion);const sourceHash=String(row?.webSourceIndexSha256||'').trim();const scoredSourceHash=String(row?.webInitialCycleSourceIndexSha256||'').trim();const baselineHash=String(row?.webDesignBaselineSha256||'').trim();const scoredBaselineHash=String(row?.webInitialCycleDesignBaselineSha256||'').trim();const sourceFresh=!sourceHash||!scoredSourceHash||sourceHash===scoredSourceHash;const baselineFresh=!baselineHash||!scoredBaselineHash||baselineHash===scoredBaselineHash;const valid=!revalidation&&row?.webInitialCyclePassed===true&&schema>=13&&row?.webInitialCycleMusicValidationPassed===true&&Boolean(String(row?.webInitialCycleStrictReviewPath||'').trim())&&Number.isFinite(score)&&sourceFresh&&baselineFresh;return{score:valid?score:null,label:revalidation?'재검증 필요':valid?`현재 검증 ${Math.round(score)}`:'점수 미평가',state:revalidation?'REVALIDATION':valid?'CURRENT':'UNRATED'};};\nconst developmentScoreOf=row=>developmentScoreState(row).score;\n"
if core.count(old)!=1: raise SystemExit(f'PATCH_TARGET_COUNT:developmentScoreOf:{core.count(old)}')
core=core.replace(old,new)
old_card="const devScore=developmentScoreOf(item);const scoreLabel=devScore===null?'점수 미평가':`점수 ${Math.round(devScore)}`;"
new_card="const scoreState=developmentScoreState(item);const devScore=scoreState.score;const scoreLabel=scoreState.label;"
if core.count(old_card)!=1: raise SystemExit(f'PATCH_TARGET_COUNT:developmentCardScore:{core.count(old_card)}')
core=core.replace(old_card,new_card)
old_attr="data-development-score=\"${devScore===null?'UNRATED':esc(devScore)}\""
new_attr="data-development-score=\"${devScore===null?scoreState.state:esc(devScore)}\""
if core.count(old_attr)!=1: raise SystemExit(f'PATCH_TARGET_COUNT:developmentScoreAttr:{core.count(old_attr)}')
core_path.write_text(core.replace(old_attr,new_attr),encoding='utf-8')

replace_exact(
    'assets/homepage-enhancements.js',
    "import './homepage-enhancements-core.js?v=20260915-development-score-ranking';\n",
    "import './homepage-enhancements-core.js?v=20260915-current-development-score';\n"
)

manager=Path('tools/homepage-manager.mjs')
text=manager.read_text(encoding='utf-8')
old="  developmentScoreRankingAvailable:operations.includes('검증 점수 높은 순')&&includesAll(enhancementCore,['const developmentScoreOf=row=>','if(sb!==sa)return sb-sa','data-development-score=','점수 미평가']),\n"
new="  developmentCurrentScoreRankingAvailable:operations.includes('현재 유효한 플레이 검증 점수')&&operations.includes('`재검증 필요`')&&includesAll(enhancementCore,['const developmentScoreState=row=>','webInitialCycleStrictScore','webInitialCyclePassed===true','webInitialCycleValidationSchemaVersion','webInitialCycleMusicValidationPassed===true','REVALIDATION','if(sb!==sa)return sb-sa','data-development-score=','재검증 필요','점수 미평가']),\n"
if text.count(old)!=1: raise SystemExit(f'PATCH_TARGET_COUNT:homepageManagerCheck:{text.count(old)}')
text=text.replace(old,new)
old_log="console.log('HOMEPAGE_DEVELOPMENT_ORDER=SCORE_DESC');console.log('HOMEPAGE_DEVELOPMENT_SCORE_VISIBLE=YES');console.log('HOMEPAGE_DEVELOPMENT_TEST_BUTTONS=WEB_AND_PLATFORM');"
new_log="console.log('HOMEPAGE_DEVELOPMENT_ORDER=SCORE_DESC');console.log('HOMEPAGE_DEVELOPMENT_SCORE_VISIBLE=YES');console.log('HOMEPAGE_DEVELOPMENT_SCORE_SOURCE=CURRENT_INITIAL_CYCLE');console.log('HOMEPAGE_DEVELOPMENT_STALE_SCORE_POLICY=REVALIDATION_NOT_CURRENT');console.log('HOMEPAGE_DEVELOPMENT_TEST_BUTTONS=WEB_AND_PLATFORM');"
if text.count(old_log)!=1: raise SystemExit(f'PATCH_TARGET_COUNT:homepageManagerLog:{text.count(old_log)}')
manager.write_text(text.replace(old_log,new_log),encoding='utf-8')

qa=Path('qa/homepage-manager-publication-order.test.mjs')
text=qa.read_text(encoding='utf-8')
old="  assert.ok(homepageCore.includes('const developmentScoreOf=row=>'));\n  assert.ok(homepageCore.includes('if(sb!==sa)return sb-sa'));\n  assert.ok(homepageCore.includes('data-development-score='));\n  assert.ok(homepageCore.includes('점수 미평가'));\n"
new="  assert.ok(homepageCore.includes('const developmentScoreState=row=>'));\n  assert.ok(homepageCore.includes('const developmentScoreOf=row=>developmentScoreState(row).score'));\n  assert.ok(homepageCore.includes('webInitialCycleStrictScore'));\n  assert.ok(homepageCore.includes('webInitialCyclePassed===true'));\n  assert.ok(homepageCore.includes('webInitialCycleValidationSchemaVersion'));\n  assert.ok(homepageCore.includes('webInitialCycleMusicValidationPassed===true'));\n  assert.ok(homepageCore.includes(\"revalidation?'재검증 필요'\"));\n  assert.ok(homepageCore.includes('if(sb!==sa)return sb-sa'));\n  assert.ok(homepageCore.includes('data-development-score='));\n  assert.ok(homepageCore.includes('점수 미평가'));\n"
if text.count(old)!=1: raise SystemExit(f'PATCH_TARGET_COUNT:homepageQaScore:{text.count(old)}')
text=text.replace(old,new)
old2="  assert.ok(manager.includes('HOMEPAGE_DEVELOPMENT_SCORE_VISIBLE=YES'));\n"
new2=old2+"  assert.ok(manager.includes('HOMEPAGE_DEVELOPMENT_SCORE_SOURCE=CURRENT_INITIAL_CYCLE'));\n  assert.ok(manager.includes('HOMEPAGE_DEVELOPMENT_STALE_SCORE_POLICY=REVALIDATION_NOT_CURRENT'));\n"
if text.count(old2)!=1: raise SystemExit(f'PATCH_TARGET_COUNT:homepageQaManager:{text.count(old2)}')
qa.write_text(text.replace(old2,new2),encoding='utf-8')

# Real evidence serialization bug: strict review used a non-existent hard-gate key.
replace_exact(
    'tools/company-strict-production-review.mjs',
    'initialPlayableCyclePassed:webScore.hardGates.COMPLETE_PLAYABLE_CYCLE_REQUIRED===true',
    'initialPlayableCyclePassed:webScore.hardGates.COMPLETE_PLAYABLE_GAMEPLAY_CYCLE===true'
)

Path('qa/company-strict-production-cycle-key.test.mjs').write_text("""import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const review=fs.readFileSync('tools/company-strict-production-review.mjs','utf8');
const evidence=fs.readFileSync('tools/company-web-validation-evidence-contract.mjs','utf8');

test('strict review persists the canonical complete playable gameplay cycle hard gate',()=>{
  assert.match(evidence,/COMPLETE_PLAYABLE_GAMEPLAY_CYCLE/);
  assert.match(review,/webScore\\.hardGates\\.COMPLETE_PLAYABLE_GAMEPLAY_CYCLE===true/);
  assert.doesNotMatch(review,/COMPLETE_PLAYABLE_CYCLE_REQUIRED/);
});
""",encoding='utf-8')

print('PATCH_OK')
