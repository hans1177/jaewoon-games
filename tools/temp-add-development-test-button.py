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

# Central policy: development visibility stays easy; owner gets direct Web test access without changing Top30 gates.
replace_exact(
    'COMPANY_FLOW.md',
    '      developmentCardMustNotClaimValidationOrRelease: true\n',
    '      developmentCardMustNotClaimValidationOrRelease: true\n      developmentTestButtonEnabled: true\n      developmentTestButtonLabel: 게임 테스트\n      developmentTestLinkSourcePriority:\n        - WEB_SOURCE_PATH\n        - SOURCE_PATH_IF_WEB_GAMES\n      missingWebDevelopmentPathDisablesTestButton: true\n'
)

# Directive mirrors the central contract.
p = Path('company-directive.json')
data = json.loads(p.read_text(encoding='utf-8'))
dev = data['homepageOperations']['developmentProgressDisplay']
dev['testButtonEnabled'] = True
dev['testButtonLabel'] = '게임 테스트'
dev['testLinkSourcePriority'] = ['webSourcePath', 'sourcePathIfWebGames']
dev['missingWebDevelopmentPathDisablesTestButton'] = True
p.write_text(json.dumps(data, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')

replace_exact(
    'HOMEPAGE_OPERATIONS.md',
    '- 개발 진행 카드는 출시 승인, Top30 통과, 플레이 가능을 의미하지 않는다.\n',
    '- 개발 진행 카드는 출시 승인, Top30 통과를 의미하지 않는다.\n- 각 개발 카드에 `게임 테스트` 버튼을 표시하고 현재 `webSourcePath` 또는 `web-games/...` `sourcePath`로 바로 접속한다.\n- Web 개발 경로가 아직 없으면 없는 링크를 만들지 않고 테스트 버튼을 비활성화한다.\n'
)

core_path = Path('assets/homepage-enhancements-core.js')
core = core_path.read_text(encoding='utf-8')
old = "const developmentStepLabel=value=>{const key=String(value||'').trim().toUpperCase();const labels={WEB_GAMEPLAY_AND_MUSIC_VALIDATION:'Web 개발/검증',TARGET_PLATFORM_RUNTIME:'플랫폼 실행 검증',TARGET_PLATFORM_QA:'플랫폼 QA',ROBLOX_POST_RUNTIME_QA:'Roblox 사후 QA',FINAL_CONTENT_DEPTH:'최종 콘텐츠 검증'};return labels[key]||key.replaceAll('_',' ')||'개발 단계 확인 중';};\n"
new = old + "const developmentTestTarget=item=>{const raw=String(item?.webSourcePath||item?.sourcePath||'').trim().replace(/^\\/+|\\/+$/g,'').replace(/\\/index\\.html$/i,'');if(!raw||raw.includes('..')||!/^web-games\\/[A-Za-z0-9._\\/-]+$/.test(raw))return'';return`/${raw}/`;};\n"
if old not in core or core.count(old) != 1:
    raise SystemExit('PATCH_TARGET_NOT_FOUND_OR_AMBIGUOUS:developmentStepLabel')
core = core.replace(old, new)
old_func = '''function buildDevelopmentCard(item,catalog,status){
  const gameId=String(item?.gameId||'').trim();const source=catalogMap(catalog).get(gameId)||{};const name=source.name||item?.gameName||gameId;const selectedPlatform=getHomepagePlatform({...source,id:gameId,selectedPlatform:item?.selectedPlatform||item?.targetPlatform},status);const state=developmentStateLabel(item?.status);const step=developmentStepLabel(item?.currentStep||item?.canonicalState);const image=source.image||'assets/pwa-icon-512.png';const genre=Array.isArray(source.genre)&&source.genre.length?source.genre.join(' · '):'개발 게임';
  return `<article class=\"foldGameCard developmentGameCard\" data-game-id=\"${esc(gameId)}\" data-homepage-game-source=\"DEVELOPMENT_QUEUE\" data-development-status=\"${esc(String(item?.status||''))}\"><div class=\"foldGameArt\"><img src=\"${esc(image)}\" alt=\"${esc(name)}\" loading=\"lazy\"><div class=\"foldGameTitle\"><b>${esc(name)}</b><small>${esc(genre)}</small></div></div><div class=\"foldGameBody\"><div class=\"foldBadges\"><span class=\"foldBadge development\">${esc(state)}</span><span class=\"foldBadge progress\">${esc(platformLabel(selectedPlatform))}</span></div><p>현재 단계 · ${esc(step)}</p><div class=\"foldGameMeta\">개발 진행 상태 자동 표시 · Top30 검증/출시 승인과 별도</div></div></article>`;
}
'''
new_func = '''function buildDevelopmentCard(item,catalog,status){
  const gameId=String(item?.gameId||'').trim();const source=catalogMap(catalog).get(gameId)||{};const name=source.name||item?.gameName||gameId;const selectedPlatform=getHomepagePlatform({...source,id:gameId,selectedPlatform:item?.selectedPlatform||item?.targetPlatform},status);const state=developmentStateLabel(item?.status);const step=developmentStepLabel(item?.currentStep||item?.canonicalState);const image=source.image||'assets/pwa-icon-512.png';const genre=Array.isArray(source.genre)&&source.genre.length?source.genre.join(' · '):'개발 게임';const testTarget=developmentTestTarget(item);const testAction=testTarget?`<a class=\"foldGameBtn\" href=\"${esc(testTarget)}\" data-development-test=\"true\">게임 테스트</a>`:'<span class=\"foldGameBtn off\" aria-disabled=\"true\">테스트 준비 중</span>';
  return `<article class=\"foldGameCard developmentGameCard\" data-game-id=\"${esc(gameId)}\" data-homepage-game-source=\"DEVELOPMENT_QUEUE\" data-development-status=\"${esc(String(item?.status||''))}\"><div class=\"foldGameArt\"><img src=\"${esc(image)}\" alt=\"${esc(name)}\" loading=\"lazy\"><div class=\"foldGameTitle\"><b>${esc(name)}</b><small>${esc(genre)}</small></div></div><div class=\"foldGameBody\"><div class=\"foldBadges\"><span class=\"foldBadge development\">${esc(state)}</span><span class=\"foldBadge progress\">${esc(platformLabel(selectedPlatform))}</span></div><p>현재 단계 · ${esc(step)}</p><div class=\"foldGameMeta\">개발 진행 상태 자동 표시 · Top30 검증/출시 승인과 별도</div><div class=\"foldGameActions\">${testAction}</div></div></article>`;
}
'''
if old_func not in core or core.count(old_func) != 1:
    raise SystemExit('PATCH_TARGET_NOT_FOUND_OR_AMBIGUOUS:buildDevelopmentCard')
core_path.write_text(core.replace(old_func, new_func), encoding='utf-8')

replace_exact(
    'assets/homepage-enhancements.js',
    "import './homepage-enhancements-core.js?v=20260915-development-progress';\n",
    "import './homepage-enhancements-core.js?v=20260915-development-test-button';\n"
)

manager = Path('tools/homepage-manager.mjs')
text = manager.read_text(encoding='utf-8')
old = "  developmentAndTop30PlacementDocumented:operations.includes('개발게임 자동 표시와 Top30 분리')&&operations.includes('`productionClass=DEVELOPMENT_CONFIRMED`이면 검증 점수와 무관하게 자동 표시')&&operations.includes('### canonical Web Top30'),\n"
new = old + "  developmentTestButtonAvailable:operations.includes('`게임 테스트` 버튼')&&includesAll(enhancementCore,['const developmentTestTarget=item=>','data-development-test=\\\"true\\\"','게임 테스트','테스트 준비 중']),\n"
if old not in text or text.count(old) != 1:
    raise SystemExit('PATCH_TARGET_NOT_FOUND_OR_AMBIGUOUS:manager-check')
text = text.replace(old, new)
old_log = "console.log('HOMEPAGE_DEVELOPMENT_SOURCE=DEVELOPMENT_QUEUE');console.log('HOMEPAGE_DEVELOPMENT_VISIBILITY=PROGRESS_ONLY');console.log('HOMEPAGE_TOP30_SOURCE=CANONICAL_TOP30');"
new_log = "console.log('HOMEPAGE_DEVELOPMENT_SOURCE=DEVELOPMENT_QUEUE');console.log('HOMEPAGE_DEVELOPMENT_VISIBILITY=PROGRESS_ONLY');console.log('HOMEPAGE_DEVELOPMENT_TEST_BUTTON=ENABLED');console.log('HOMEPAGE_TOP30_SOURCE=CANONICAL_TOP30');"
if old_log not in text or text.count(old_log) != 1:
    raise SystemExit('PATCH_TARGET_NOT_FOUND_OR_AMBIGUOUS:manager-log')
manager.write_text(text.replace(old_log,new_log), encoding='utf-8')

qa = Path('qa/homepage-manager-publication-order.test.mjs')
text = qa.read_text(encoding='utf-8')
old = "  assert.ok(homepageCore.includes('data-homepage-game-source=\\\"DEVELOPMENT_QUEUE\\\"'));\n"
new = old + "  assert.ok(homepageCore.includes('const developmentTestTarget=item=>'));\n  assert.ok(homepageCore.includes('data-development-test=\\\"true\\\"'));\n  assert.ok(homepageCore.includes('>게임 테스트</a>'));\n  assert.ok(homepageCore.includes('테스트 준비 중'));\n  assert.ok(homepageCore.includes(\"/^web-games\\\\/[A-Za-z0-9._\\\\/-]+$/\"));\n"
if old not in text or text.count(old) != 1:
    raise SystemExit('PATCH_TARGET_NOT_FOUND_OR_AMBIGUOUS:qa-homepageCore')
text = text.replace(old,new)
old2 = "  assert.ok(manager.includes('HOMEPAGE_DEVELOPMENT_VISIBILITY=PROGRESS_ONLY'));\n"
new2 = old2 + "  assert.ok(manager.includes('HOMEPAGE_DEVELOPMENT_TEST_BUTTON=ENABLED'));\n"
if old2 not in text or text.count(old2) != 1:
    raise SystemExit('PATCH_TARGET_NOT_FOUND_OR_AMBIGUOUS:qa-manager')
qa.write_text(text.replace(old2,new2), encoding='utf-8')

print('PATCH_OK')
