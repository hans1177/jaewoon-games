from pathlib import Path
import json


def replace_exact(path, old, new):
    p = Path(path)
    text = p.read_text(encoding='utf-8')
    if old not in text:
        raise SystemExit(f'PATCH_TARGET_NOT_FOUND:{path}')
    if text.count(old) != 1:
        raise SystemExit(f'PATCH_TARGET_AMBIGUOUS:{path}:{text.count(old)}')
    p.write_text(text.replace(old, new), encoding='utf-8')

replace_exact(
    'COMPANY_FLOW.md',
    '      developmentCardMustNotClaimValidationOrRelease: true\n',
    '      developmentCardMustNotClaimValidationOrRelease: true\n      developmentWebTestButtonEnabled: true\n      developmentWebTestButtonLabel: 웹 테스트\n      developmentPlatformTestButtonEnabled: true\n      developmentPlatformTestButtonLabelMode: PLATFORM_NAME\n      developmentWebAndPlatformTestButtonsMustBeSeparate: true\n      missingPlatformTestTargetDisablesOnlyPlatformButton: true\n'
)

p = Path('company-directive.json')
data = json.loads(p.read_text(encoding='utf-8'))
dev = data['homepageOperations']['developmentProgressDisplay']
dev['webTestButtonEnabled'] = True
dev['webTestButtonLabel'] = '웹 테스트'
dev['platformTestButtonEnabled'] = True
dev['platformTestButtonLabelMode'] = 'PLATFORM_NAME'
dev['webAndPlatformTestButtonsMustBeSeparate'] = True
dev['missingPlatformTestTargetDisablesOnlyPlatformButton'] = True
p.write_text(json.dumps(data, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')

replace_exact(
    'HOMEPAGE_OPERATIONS.md',
    '- 개발 진행 카드는 출시 승인, Top30 통과, 플레이 가능을 의미하지 않는다.\n',
    '- 개발 진행 카드는 출시 승인, Top30 통과를 의미하지 않는다.\n- 모든 개발 카드에 `웹 테스트` 버튼을 별도로 표시하고 현재 Web 개발본으로 바로 접속한다.\n- 플랫폼 개발 게임은 Web 버튼과 별개로 `Unity 테스트`, `Roblox 테스트`, `Fortnite 테스트`처럼 플랫폼 전용 테스트 버튼을 표시한다.\n- Unity는 현재 회사 상태의 해당 게임 test build 다운로드가 있으면 그 APK를 직접 열고, 그 외 플랫폼은 명시적인 플랫폼 테스트 URL이 있을 때 해당 플랫폼 테스트로 연결한다.\n- 플랫폼 테스트 대상이 아직 없으면 Web 테스트는 그대로 유지하고 플랫폼 버튼만 `플랫폼 테스트 준비 중`으로 비활성화한다.\n'
)

core_path = Path('assets/homepage-enhancements-core.js')
core = core_path.read_text(encoding='utf-8')
step_line = "const developmentStepLabel=value=>{const key=String(value||'').trim().toUpperCase();const labels={WEB_GAMEPLAY_AND_MUSIC_VALIDATION:'Web 개발/검증',TARGET_PLATFORM_RUNTIME:'플랫폼 실행 검증',TARGET_PLATFORM_QA:'플랫폼 QA',ROBLOX_POST_RUNTIME_QA:'Roblox 사후 QA',FINAL_CONTENT_DEPTH:'최종 콘텐츠 검증'};return labels[key]||key.replaceAll('_',' ')||'개발 단계 확인 중';};\n"
insert = "const developmentWebTestTarget=item=>{const raw=String(item?.webSourcePath||item?.sourcePath||'').trim().replace(/^\\/+|\\/+$/g,'').replace(/\\/index\\.html$/i,'');if(!raw||raw.includes('..')||!/^web-games\\/[A-Za-z0-9._\\/-]+$/.test(raw))return'';return`/${raw}/`;};\nconst developmentPlatformTestTarget=(item,status)=>{const platform=String(item?.selectedPlatform||item?.targetPlatform||'').trim().toUpperCase();const explicit=String(item?.platformTestUrl||item?.testUrl||(platform==='ROBLOX'?item?.robloxTestUrl:'')||(platform==='UNITY'?item?.unityTestUrl:'')||(platform==='FORTNITE_UEFN'?item?.fortniteTestUrl:'')||'').trim();if(/^https?:\\/\\//i.test(explicit)||/^roblox:/i.test(explicit))return explicit;if(platform==='UNITY'){const builds=Array.isArray(status?.testBuilds)?status.testBuilds:[];const build=builds.find(entry=>String(entry?.gameId||'')===String(item?.gameId||'')&&String(entry?.status||'').toLowerCase()==='ready'&&typeof entry?.download==='string');if(build?.download)return build.download;}return'';};\n"
if core.count(step_line) != 1: raise SystemExit('PATCH_TARGET_NOT_FOUND_OR_AMBIGUOUS:developmentStepLabel')
core = core.replace(step_line, step_line + insert)
old_card = '''function buildDevelopmentCard(item,catalog,status){
  const gameId=String(item?.gameId||'').trim();const source=catalogMap(catalog).get(gameId)||{};const name=source.name||item?.gameName||gameId;const selectedPlatform=getHomepagePlatform({...source,id:gameId,selectedPlatform:item?.selectedPlatform||item?.targetPlatform},status);const state=developmentStateLabel(item?.status);const step=developmentStepLabel(item?.currentStep||item?.canonicalState);const image=source.image||'assets/pwa-icon-512.png';const genre=Array.isArray(source.genre)&&source.genre.length?source.genre.join(' · '):'개발 게임';
  return `<article class="foldGameCard developmentGameCard" data-game-id="${esc(gameId)}" data-homepage-game-source="DEVELOPMENT_QUEUE" data-development-status="${esc(String(item?.status||''))}"><div class="foldGameArt"><img src="${esc(image)}" alt="${esc(name)}" loading="lazy"><div class="foldGameTitle"><b>${esc(name)}</b><small>${esc(genre)}</small></div></div><div class="foldGameBody"><div class="foldBadges"><span class="foldBadge development">${esc(state)}</span><span class="foldBadge progress">${esc(platformLabel(selectedPlatform))}</span></div><p>현재 단계 · ${esc(step)}</p><div class="foldGameMeta">개발 진행 상태 자동 표시 · Top30 검증/출시 승인과 별도</div></div></article>`;
}
'''
new_card = '''function buildDevelopmentCard(item,catalog,status){
  const gameId=String(item?.gameId||'').trim();const source=catalogMap(catalog).get(gameId)||{};const name=source.name||item?.gameName||gameId;const selectedPlatform=getHomepagePlatform({...source,id:gameId,selectedPlatform:item?.selectedPlatform||item?.targetPlatform},status);const state=developmentStateLabel(item?.status);const step=developmentStepLabel(item?.currentStep||item?.canonicalState);const image=source.image||'assets/pwa-icon-512.png';const genre=Array.isArray(source.genre)&&source.genre.length?source.genre.join(' · '):'개발 게임';const webTarget=developmentWebTestTarget(item);const platformTarget=developmentPlatformTestTarget(item,status);const webAction=webTarget?`<a class="foldGameBtn" href="${esc(webTarget)}" data-development-web-test="true">웹 테스트</a>`:'<span class="foldGameBtn off" aria-disabled="true">웹 테스트 준비 중</span>';const platform=String(item?.selectedPlatform||item?.targetPlatform||'').trim().toUpperCase();const platformName=platformLabel(platform);const platformAction=platform?(platformTarget?`<a class="foldGameBtn" href="${esc(platformTarget)}" data-development-platform-test="${esc(platform)}">${esc(platformName)} 테스트</a>`:`<span class="foldGameBtn off" aria-disabled="true">${esc(platformName)} 테스트 준비 중</span>`):'';
  return `<article class="foldGameCard developmentGameCard" data-game-id="${esc(gameId)}" data-homepage-game-source="DEVELOPMENT_QUEUE" data-development-status="${esc(String(item?.status||''))}"><div class="foldGameArt"><img src="${esc(image)}" alt="${esc(name)}" loading="lazy"><div class="foldGameTitle"><b>${esc(name)}</b><small>${esc(genre)}</small></div></div><div class="foldGameBody"><div class="foldBadges"><span class="foldBadge development">${esc(state)}</span><span class="foldBadge progress">${esc(platformLabel(selectedPlatform))}</span></div><p>현재 단계 · ${esc(step)}</p><div class="foldGameMeta">개발 진행 상태 자동 표시 · Top30 검증/출시 승인과 별도</div><div class="foldGameActions">${webAction}${platformAction}</div></div></article>`;
}
'''
if core.count(old_card) != 1: raise SystemExit('PATCH_TARGET_NOT_FOUND_OR_AMBIGUOUS:buildDevelopmentCard')
core_path.write_text(core.replace(old_card, new_card), encoding='utf-8')
replace_exact('assets/homepage-enhancements.js',"import './homepage-enhancements-core.js?v=20260915-development-progress';\n","import './homepage-enhancements-core.js?v=20260915-development-test-buttons';\n")

manager=Path('tools/homepage-manager.mjs'); text=manager.read_text(encoding='utf-8')
anchor="  developmentAndTop30PlacementDocumented:operations.includes('개발게임 자동 표시와 Top30 분리')&&operations.includes('`productionClass=DEVELOPMENT_CONFIRMED`이면 검증 점수와 무관하게 자동 표시')&&operations.includes('### canonical Web Top30'),\n"
check="  developmentTestButtonsAvailable:operations.includes('`웹 테스트` 버튼')&&operations.includes('플랫폼 전용 테스트 버튼')&&includesAll(enhancementCore,['const developmentWebTestTarget=item=>','const developmentPlatformTestTarget=(item,status)=>','data-development-web-test=\\\"true\\\"','data-development-platform-test=']),\n"
if text.count(anchor)!=1: raise SystemExit('PATCH_TARGET_NOT_FOUND_OR_AMBIGUOUS:manager-check')
text=text.replace(anchor,anchor+check)
old_log="console.log('HOMEPAGE_DEVELOPMENT_SOURCE=DEVELOPMENT_QUEUE');console.log('HOMEPAGE_DEVELOPMENT_VISIBILITY=PROGRESS_ONLY');console.log('HOMEPAGE_TOP30_SOURCE=CANONICAL_TOP30');"
new_log="console.log('HOMEPAGE_DEVELOPMENT_SOURCE=DEVELOPMENT_QUEUE');console.log('HOMEPAGE_DEVELOPMENT_VISIBILITY=PROGRESS_ONLY');console.log('HOMEPAGE_DEVELOPMENT_TEST_BUTTONS=WEB_AND_PLATFORM');console.log('HOMEPAGE_TOP30_SOURCE=CANONICAL_TOP30');"
if text.count(old_log)!=1: raise SystemExit('PATCH_TARGET_NOT_FOUND_OR_AMBIGUOUS:manager-log')
manager.write_text(text.replace(old_log,new_log),encoding='utf-8')

qa=Path('qa/homepage-manager-publication-order.test.mjs'); text=qa.read_text(encoding='utf-8')
anchor="  assert.ok(homepageCore.includes(\"wrapper.id='homeDevelopmentGameCenter'\"));\n"
checks="  assert.ok(homepageCore.includes('const developmentWebTestTarget=item=>'));\n  assert.ok(homepageCore.includes('const developmentPlatformTestTarget=(item,status)=>'));\n  assert.ok(homepageCore.includes('data-development-web-test=\\\"true\\\"'));\n  assert.ok(homepageCore.includes('data-development-platform-test='));\n  assert.ok(homepageCore.includes('status?.testBuilds'));\n  assert.ok(homepageCore.includes('웹 테스트'));\n  assert.ok(homepageCore.includes('테스트 준비 중'));\n"
if text.count(anchor)!=1: raise SystemExit('PATCH_TARGET_NOT_FOUND_OR_AMBIGUOUS:qa-homepageCore')
text=text.replace(anchor,anchor+checks)
anchor2="  assert.ok(manager.includes('HOMEPAGE_DEVELOPMENT_VISIBILITY=PROGRESS_ONLY'));\n"
if text.count(anchor2)!=1: raise SystemExit('PATCH_TARGET_NOT_FOUND_OR_AMBIGUOUS:qa-manager')
text=text.replace(anchor2,anchor2+"  assert.ok(manager.includes('HOMEPAGE_DEVELOPMENT_TEST_BUTTONS=WEB_AND_PLATFORM'));\n")
qa.write_text(text,encoding='utf-8')
print('PATCH_OK')
