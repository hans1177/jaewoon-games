from pathlib import Path
import json


def replace_exact(path, old, new):
    p=Path(path)
    text=p.read_text(encoding='utf-8')
    if text.count(old)!=1:
        raise SystemExit(f'PATCH_TARGET_COUNT:{path}:{text.count(old)}')
    p.write_text(text.replace(old,new),encoding='utf-8')

# Central policy mirror of the owner's latest homepage instruction.
replace_exact(
    'COMPANY_FLOW.md',
    '      displayFields:\n        - STATUS\n        - CURRENT_STEP\n        - SELECTED_PLATFORM\n',
    '      displayFields:\n        - STATUS\n        - CURRENT_STEP\n        - SELECTED_PLATFORM\n        - SCORE\n'
)
replace_exact(
    'COMPANY_FLOW.md',
    '      missingPlatformTestTargetDisablesOnlyPlatformButton: true\n',
    '      missingPlatformTestTargetDisablesOnlyPlatformButton: true\n      developmentScoreDisplayEnabled: true\n      developmentRanking: SCORE_DESC\n      unratedDevelopmentGamesLast: true\n'
)

p=Path('company-directive.json')
data=json.loads(p.read_text(encoding='utf-8'))
dev=data['homepageOperations']['developmentProgressDisplay']
fields=dev.setdefault('displayFields',[])
if 'score' not in fields: fields.append('score')
dev['scoreDisplayEnabled']=True
dev['ranking']='SCORE_DESC'
dev['unratedGamesLast']=True
p.write_text(json.dumps(data,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')

replace_exact(
    'HOMEPAGE_OPERATIONS.md',
    '- 표시 정보는 게임명과 `status`, `currentStep`, `selectedPlatform` 중심으로 제한한다.\n',
    '- 표시 정보는 게임명과 `status`, `currentStep`, `selectedPlatform`, 현재 개발 점수를 표시한다.\n- 개발게임은 현재 검증 점수 높은 순으로 자동 정렬하고, 점수가 아직 없는 게임은 아래에 둔다. 같은 점수면 ACTIVE 상태와 최근 업데이트 순을 보조 기준으로 사용한다.\n'
)

core_path=Path('assets/homepage-enhancements-core.js')
core=core_path.read_text(encoding='utf-8')
old="const developmentItems=queue=>(Array.isArray(queue?.items)?queue.items:[]).filter(row=>String(row?.productionClass||'').trim().toUpperCase()==='DEVELOPMENT_CONFIRMED'&&String(row?.status||'').trim().toUpperCase()!=='DISCARDED').sort((a,b)=>{const aa=String(a?.status||'').toUpperCase()==='ACTIVE'?0:1,bb=String(b?.status||'').toUpperCase()==='ACTIVE'?0:1;return aa-bb||String(b?.updatedAt||'').localeCompare(String(a?.updatedAt||''))||String(a?.gameId||'').localeCompare(String(b?.gameId||''));});\n"
new="const developmentScoreOf=row=>{for(const key of ['webStrictScore','strictImplementationScore','homepageTestScore','strictScore','reviewScore','totalScore','score']){const n=Number(row?.[key]);if(Number.isFinite(n))return n;}return null;};\nconst developmentItems=queue=>(Array.isArray(queue?.items)?queue.items:[]).filter(row=>String(row?.productionClass||'').trim().toUpperCase()==='DEVELOPMENT_CONFIRMED'&&String(row?.status||'').trim().toUpperCase()!=='DISCARDED').sort((a,b)=>{const sa=developmentScoreOf(a),sb=developmentScoreOf(b);if(sa!==null||sb!==null){if(sa===null)return 1;if(sb===null)return-1;if(sb!==sa)return sb-sa;}const aa=String(a?.status||'').toUpperCase()==='ACTIVE'?0:1,bb=String(b?.status||'').toUpperCase()==='ACTIVE'?0:1;return aa-bb||String(b?.updatedAt||'').localeCompare(String(a?.updatedAt||''))||String(a?.gameId||'').localeCompare(String(b?.gameId||''));});\n"
if core.count(old)!=1: raise SystemExit(f'PATCH_TARGET_COUNT:developmentItems:{core.count(old)}')
core=core.replace(old,new)
old_card="  const gameId=String(item?.gameId||'').trim();const source=catalogMap(catalog).get(gameId)||{};const name=source.name||item?.gameName||gameId;const selectedPlatform=getHomepagePlatform({...source,id:gameId,selectedPlatform:item?.selectedPlatform||item?.targetPlatform},status);const state=developmentStateLabel(item?.status);const step=developmentStepLabel(item?.currentStep||item?.canonicalState);const image=source.image||'assets/pwa-icon-512.png';const genre=Array.isArray(source.genre)&&source.genre.length?source.genre.join(' · '):'개발 게임';const webTarget=developmentWebTestTarget(item);const platformTarget=developmentPlatformTestTarget(item,status);const webAction=webTarget?`<a class=\"foldGameBtn\" href=\"${esc(webTarget)}\" data-development-web-test=\"true\">웹 테스트</a>`:'<span class=\"foldGameBtn off\" aria-disabled=\"true\">웹 테스트 준비 중</span>';const platform=String(item?.selectedPlatform||item?.targetPlatform||'').trim().toUpperCase();const platformName=platformLabel(platform);const platformAction=platform?(platformTarget?`<a class=\"foldGameBtn\" href=\"${esc(platformTarget)}\" data-development-platform-test=\"${esc(platform)}\">${esc(platformName)} 테스트</a>`:`<span class=\"foldGameBtn off\" aria-disabled=\"true\">${esc(platformName)} 테스트 준비 중</span>`):'';\n"
new_card="  const gameId=String(item?.gameId||'').trim();const source=catalogMap(catalog).get(gameId)||{};const name=source.name||item?.gameName||gameId;const selectedPlatform=getHomepagePlatform({...source,id:gameId,selectedPlatform:item?.selectedPlatform||item?.targetPlatform},status);const state=developmentStateLabel(item?.status);const step=developmentStepLabel(item?.currentStep||item?.canonicalState);const image=source.image||'assets/pwa-icon-512.png';const genre=Array.isArray(source.genre)&&source.genre.length?source.genre.join(' · '):'개발 게임';const devScore=developmentScoreOf(item);const scoreLabel=devScore===null?'점수 미평가':`점수 ${Math.round(devScore)}`;const webTarget=developmentWebTestTarget(item);const platformTarget=developmentPlatformTestTarget(item,status);const webAction=webTarget?`<a class=\"foldGameBtn\" href=\"${esc(webTarget)}\" data-development-web-test=\"true\">웹 테스트</a>`:'<span class=\"foldGameBtn off\" aria-disabled=\"true\">웹 테스트 준비 중</span>';const platform=String(item?.selectedPlatform||item?.targetPlatform||'').trim().toUpperCase();const platformName=platformLabel(platform);const platformAction=platform?(platformTarget?`<a class=\"foldGameBtn\" href=\"${esc(platformTarget)}\" data-development-platform-test=\"${esc(platform)}\">${esc(platformName)} 테스트</a>`:`<span class=\"foldGameBtn off\" aria-disabled=\"true\">${esc(platformName)} 테스트 준비 중</span>`):'';\n"
if core.count(old_card)!=1: raise SystemExit(f'PATCH_TARGET_COUNT:developmentCardHead:{core.count(old_card)}')
core=core.replace(old_card,new_card)
old_badges='<div class="foldBadges"><span class="foldBadge development">${esc(state)}</span><span class="foldBadge progress">${esc(platformLabel(selectedPlatform))}</span></div><p>현재 단계 · ${esc(step)}</p>'
new_badges='<div class="foldBadges"><span class="foldBadge development">${esc(state)}</span><span class="foldBadge progress">${esc(platformLabel(selectedPlatform))}</span><span class="foldBadge score" data-development-score="${devScore===null?\'UNRATED\':esc(devScore)}">${esc(scoreLabel)}</span></div><p>현재 단계 · ${esc(step)}</p>'
if core.count(old_badges)!=1: raise SystemExit(f'PATCH_TARGET_COUNT:developmentBadges:{core.count(old_badges)}')
core_path.write_text(core.replace(old_badges,new_badges),encoding='utf-8')

replace_exact('assets/homepage-enhancements.js',"import './homepage-enhancements-core.js?v=20260915-development-test-buttons';\n","import './homepage-enhancements-core.js?v=20260915-development-score-ranking';\n")

manager=Path('tools/homepage-manager.mjs')
text=manager.read_text(encoding='utf-8')
anchor="  developmentTestButtonsAvailable:operations.includes('`웹 테스트` 버튼')&&operations.includes('플랫폼 전용 테스트 버튼')&&includesAll(enhancementCore,['const developmentWebTestTarget=item=>','const developmentPlatformTestTarget=(item,status)=>','data-development-web-test=\\\"true\\\"','data-development-platform-test=']),\n"
addition="  developmentScoreRankingAvailable:operations.includes('검증 점수 높은 순')&&includesAll(enhancementCore,['const developmentScoreOf=row=>','if(sb!==sa)return sb-sa','data-development-score=','점수 미평가']),\n"
if text.count(anchor)!=1: raise SystemExit(f'PATCH_TARGET_COUNT:managerCheck:{text.count(anchor)}')
text=text.replace(anchor,anchor+addition)
old_log="console.log('HOMEPAGE_DEVELOPMENT_SOURCE=DEVELOPMENT_QUEUE');console.log('HOMEPAGE_DEVELOPMENT_VISIBILITY=PROGRESS_ONLY');console.log('HOMEPAGE_DEVELOPMENT_TEST_BUTTONS=WEB_AND_PLATFORM');console.log('HOMEPAGE_TOP30_SOURCE=CANONICAL_TOP30');"
new_log="console.log('HOMEPAGE_DEVELOPMENT_SOURCE=DEVELOPMENT_QUEUE');console.log('HOMEPAGE_DEVELOPMENT_VISIBILITY=PROGRESS_ONLY');console.log('HOMEPAGE_DEVELOPMENT_ORDER=SCORE_DESC');console.log('HOMEPAGE_DEVELOPMENT_SCORE_VISIBLE=YES');console.log('HOMEPAGE_DEVELOPMENT_TEST_BUTTONS=WEB_AND_PLATFORM');console.log('HOMEPAGE_TOP30_SOURCE=CANONICAL_TOP30');"
if text.count(old_log)!=1: raise SystemExit(f'PATCH_TARGET_COUNT:managerLog:{text.count(old_log)}')
manager.write_text(text.replace(old_log,new_log),encoding='utf-8')

qa=Path('qa/homepage-manager-publication-order.test.mjs')
text=qa.read_text(encoding='utf-8')
anchor="  assert.ok(homepageCore.includes('const developmentWebTestTarget=item=>'));\n"
addition="  assert.ok(homepageCore.includes('const developmentScoreOf=row=>'));\n  assert.ok(homepageCore.includes('if(sb!==sa)return sb-sa'));\n  assert.ok(homepageCore.includes('data-development-score='));\n  assert.ok(homepageCore.includes('점수 미평가'));\n"
if text.count(anchor)!=1: raise SystemExit(f'PATCH_TARGET_COUNT:qaCore:{text.count(anchor)}')
text=text.replace(anchor,addition+anchor)
anchor2="  assert.ok(manager.includes('HOMEPAGE_DEVELOPMENT_VISIBILITY=PROGRESS_ONLY'));\n"
addition2="  assert.ok(manager.includes('HOMEPAGE_DEVELOPMENT_ORDER=SCORE_DESC'));\n  assert.ok(manager.includes('HOMEPAGE_DEVELOPMENT_SCORE_VISIBLE=YES'));\n"
if text.count(anchor2)!=1: raise SystemExit(f'PATCH_TARGET_COUNT:qaManager:{text.count(anchor2)}')
qa.write_text(text.replace(anchor2,anchor2+addition2),encoding='utf-8')

print('PATCH_OK')
