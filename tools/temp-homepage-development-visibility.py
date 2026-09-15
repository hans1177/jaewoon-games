from pathlib import Path
import json,re

def replace_once(text, old, new, label):
    count=text.count(old)
    if count!=1:
        raise SystemExit(f'{label}: expected 1 occurrence, got {count}')
    return text.replace(old,new,1)

# 1) Central policy: development visibility is independent of Top30 promotion gates.
p=Path('COMPANY_FLOW.md')
s=p.read_text()
s=replace_once(s,
"  homepageTesting:\n    ownerMayTestBeforeFinalPromotion: true\n    prePromotionDisplay: COMPACT_TEST_GAME_SHELF_ONLY\n",
"  homepageTesting:\n    developmentProgressDisplay:\n      source: COMPANY_RUNTIME_DEVELOPMENT_QUEUE\n      autoRegisterDevelopmentConfirmed: true\n      visibilityRequiresDevelopmentProgressOnly: true\n      homepageTestEligibleRequired: false\n      webStrictScoreRequired: false\n      finalThirtyMinuteContentDepthPassRequired: false\n      artbookRequired: false\n      promotionAndTop30RemainSeparate: true\n      displayFields:\n        - STATUS\n        - CURRENT_STEP\n        - SELECTED_PLATFORM\n      developmentCardMustNotClaimValidationOrRelease: true\n    ownerMayTestBeforeFinalPromotion: true\n    prePromotionDisplay: DEVELOPMENT_PROGRESS_SHELF_PLUS_SEPARATE_TOP30_TEST_SHELF\n",
'COMPANY_FLOW homepageTesting')
p.write_text(s)

# 2) Executable mirror.
p=Path('company-directive.json')
data=json.loads(p.read_text())
data['revision']=int(data.get('revision',0))+1
data['updatedAt']='2026-09-15'
home=data.setdefault('homepageOperations',{})
home['developmentProgressDisplay']={
  'source':'COMPANY_RUNTIME_DEVELOPMENT_QUEUE',
  'autoRegisterProductionClass':'DEVELOPMENT_CONFIRMED',
  'requiresHomepageTestEligible':False,
  'requiresWebValidation':False,
  'requiresFinalThirtyMinuteContentDepth':False,
  'requiresArtbook':False,
  'displayFields':['status','currentStep','selectedPlatform'],
  'separateFromTop30Promotion':True,
  'mustNotClaimValidationOrRelease':True
}
p.write_text(json.dumps(data,ensure_ascii=False,indent=2)+'\n')

# 3) Human operations mirror.
p=Path('HOMEPAGE_OPERATIONS.md')
s=p.read_text()
s=replace_once(s,
"중앙정책 + 실제 상태/빌드/런타임 근거\n→ Web 강심사/하드게이트 통과 후보를 canonical Top30으로 순위화\n→ 홈페이지의 게임 구현 영역이 canonical Top30을 그대로 실시간 미러\n→ Homepage Manager self-QA",
"중앙정책 + 실제 개발 상태/빌드/런타임 근거\n→ DEVELOPMENT_CONFIRMED 게임은 개발 진행 목록에 즉시 자동 표시\n→ Web 강심사/하드게이트 통과 후보만 별도 canonical Top30으로 순위화\n→ Homepage Manager self-QA",
'operations flow')
pattern=r"## 홈페이지 게임 구현 = Top30[\s\S]*?## APK 설치 배치"
new="""## 개발게임 자동 표시와 Top30 분리

홈페이지에는 **개발 진행 목록**과 **Top30 승격 목록**을 분리한다.

### 개발 진행 목록

- 입력 원본: `company-runtime:development-queue.json`
- `productionClass=DEVELOPMENT_CONFIRMED`이면 검증 점수와 무관하게 자동 표시한다.
- `homepageTestEligible`, Web strict 점수, 30분 최종검증, 아트북은 개발 진행 목록의 등록 조건이 아니다.
- 표시 정보는 게임명과 `status`, `currentStep`, `selectedPlatform` 중심으로 제한한다.
- 검증 실패/대기 상태여도 개발게임 카드는 유지하며 현재 진행 상태를 표시한다.
- 개발 진행 카드는 출시 승인, Top30 통과, 플레이 가능을 의미하지 않는다.
- `company-runtime` 전체를 main에 복사하지 않고 브라우저가 개발 큐를 읽어 필요한 표시 필드만 사용한다.

### canonical Web Top30

- 입력 원본: `test-game-candidates.json`
- 최대 표시: 30개
- 최소 Web strict 점수: 80
- 하드게이트: 전부 통과 필수
- 최종 30분 콘텐츠 깊이 검증과 아트북 등 기존 승격 조건을 그대로 유지한다.
- 정렬: `STRICT_IMPLEMENTATION_SCORE_DESC`
- Top30 검증 기준은 개발 진행 목록 노출 여부에 영향을 주지 않는다.
- Top30 후보는 정식 `homepageOfficialCard` 승격과 별개이며 승격 전에는 테스트/후보 상태를 명확히 표시한다.
- 히어로/대표 게임은 canonical Top30의 현재 1위 후보를 우선 사용할 수 있다.

## APK 설치 배치"""
s2,n=re.subn(pattern,new,s,count=1)
if n!=1: raise SystemExit(f'operations main section: {n}')
s=s2
s=s.replace("2. 홈페이지 주 게임 구현은 `test-game-candidates.json` canonical Top30을 읽는다.\n3. `game-catalog.json`과 `company-status.json`은 Top30 카드의 이름/이미지/플랫폼/빌드 등 보조 메타데이터에 사용하며, 독립 게임 목록을 만들지 않는다.",
"2. 개발 진행 목록은 `company-runtime:development-queue.json`에서 `DEVELOPMENT_CONFIRMED` 상태를 읽고 검증 게이트와 무관하게 표시한다.\n3. Top30은 `test-game-candidates.json` canonical manifest를 읽으며 기존 승격 게이트를 유지한다. `game-catalog.json`과 `company-status.json`은 이름/이미지/플랫폼 등 보조 메타데이터에 사용한다.")
s=s.replace("- `test-game-candidates.json` — 홈페이지 주 게임 구현 원본인 canonical Top30\n",
"- `company-runtime:development-queue.json` — 개발 진행 목록 원본; 상태/단계/플랫폼만 공개 표시\n- `test-game-candidates.json` — 검증된 canonical Top30 원본\n")
s=s.replace("- Top30 밖 게임을 홈페이지 주 게임 영역에 별도 카탈로그로 섞기\n","- 개발 진행 카드를 Top30 통과 또는 출시 승인 카드처럼 표시하기\n")
s=s.replace("3. 홈페이지 주 게임 카드의 source가 전부 canonical Top30인지 확인\n",
"3. 개발 진행 카드는 `DEVELOPMENT_QUEUE`, Top30 카드는 `CANONICAL_TOP30` source인지 확인\n")
s=s.replace("- 홈페이지 주 게임 구현이 canonical Top30과 일치\n",
"- 개발 진행 목록이 DEVELOPMENT_CONFIRMED 큐와 일치하고 Top30 승격 목록은 canonical Top30과 일치\n")
s=s.replace("canonical Top30 → 홈페이지 주 게임 구현 실시간 미러 + APK 설치 컨트롤 비대문 배치",
"DEVELOPMENT_CONFIRMED → 개발 진행 목록 즉시 미러 + canonical Top30 별도 승격 미러 + APK 설치 컨트롤 비대문 배치")
p.write_text(s)

# 4) Frontend core: render development progress independently from Top30 eligibility.
p=Path('assets/homepage-enhancements-core.js')
s=p.read_text()
anchor="function top30Candidates(manifest){return (Array.isArray(manifest?.candidates)?manifest.candidates:[]).filter(top30Eligible).slice(0,TOP30_LIMIT);}\n"
addition=anchor+"""
const developmentItems=queue=>(Array.isArray(queue?.items)?queue.items:[]).filter(row=>String(row?.productionClass||'').trim().toUpperCase()==='DEVELOPMENT_CONFIRMED'&&String(row?.status||'').trim().toUpperCase()!=='DISCARDED').sort((a,b)=>{const aa=String(a?.status||'').toUpperCase()==='ACTIVE'?0:1,bb=String(b?.status||'').toUpperCase()==='ACTIVE'?0:1;return aa-bb||String(b?.updatedAt||'').localeCompare(String(a?.updatedAt||''))||String(a?.gameId||'').localeCompare(String(b?.gameId||''));});
const developmentStateLabel=value=>{const key=String(value||'ACTIVE').trim().toUpperCase();return ({ACTIVE:'개발 진행중',HOLD:'개발 보류',BLOCKED:'개발 막힘',WAITING:'개발 대기'}[key]||key.replaceAll('_',' '));};
const developmentStepLabel=value=>{const key=String(value||'').trim().toUpperCase();const labels={WEB_GAMEPLAY_AND_MUSIC_VALIDATION:'Web 개발/검증',TARGET_PLATFORM_RUNTIME:'플랫폼 실행 검증',TARGET_PLATFORM_QA:'플랫폼 QA',ROBLOX_POST_RUNTIME_QA:'Roblox 사후 QA',FINAL_CONTENT_DEPTH:'최종 콘텐츠 검증'};return labels[key]||key.replaceAll('_',' ')||'개발 단계 확인 중';};
"""
s=replace_once(s,anchor,addition,'core development helpers')
style_anchor="#homeTop30GameCenter{margin:0 14px 14px}.top30Head{display:flex;align-items:flex-end;justify-content:space-between;gap:10px;padding:4px 2px 12px}.top30Head h2{margin:0;font-size:25px;color:#155e9f;font-weight:1000}.top30Head p{margin:3px 0 0;color:#5f7a8d;font-size:10px;font-weight:800}.top30Count{flex:0 0 auto;padding:7px 10px;border-radius:999px;background:#102d42;color:#fff;font-size:10px;font-weight:1000}.top30Grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px}.top30Empty{grid-column:1/-1;padding:24px 12px;text-align:center;border:1px dashed #bdd4e2;border-radius:13px;background:#f8fcff;color:#67869b;font-size:11px;font-weight:800}\n"
style_add=style_anchor+"#homeDevelopmentGameCenter{margin:0 14px 14px}.developmentGameCard .foldGameArt{height:118px}.developmentGameCard .foldGameBody p{min-height:0}.foldBadge.development{background:#dcecff;color:#185f93}.foldBadge.progress{background:#eef8ff;color:#1767a9}\n"
s=replace_once(s,style_anchor,style_add,'core development styles')
center_anchor="function buildGameCenter(catalog,status,baselines,artbooks,top30Manifest){\n"
development_funcs="""function buildDevelopmentCard(item,catalog,status){
  const gameId=String(item?.gameId||'').trim();const source=catalogMap(catalog).get(gameId)||{};const name=source.name||item?.gameName||gameId;const selectedPlatform=getHomepagePlatform({...source,id:gameId,selectedPlatform:item?.selectedPlatform||item?.targetPlatform},status);const state=developmentStateLabel(item?.status);const step=developmentStepLabel(item?.currentStep||item?.canonicalState);const image=source.image||'assets/pwa-icon-512.png';const genre=Array.isArray(source.genre)&&source.genre.length?source.genre.join(' · '):'개발 게임';
  return `<article class="foldGameCard developmentGameCard" data-game-id="${esc(gameId)}" data-homepage-game-source="DEVELOPMENT_QUEUE" data-development-status="${esc(String(item?.status||''))}"><div class="foldGameArt"><img src="${esc(image)}" alt="${esc(name)}" loading="lazy"><div class="foldGameTitle"><b>${esc(name)}</b><small>${esc(genre)}</small></div></div><div class="foldGameBody"><div class="foldBadges"><span class="foldBadge development">${esc(state)}</span><span class="foldBadge progress">${esc(platformLabel(selectedPlatform))}</span></div><p>현재 단계 · ${esc(step)}</p><div class="foldGameMeta">개발 진행 상태 자동 표시 · Top30 검증/출시 승인과 별도</div></div></article>`;
}
function buildDevelopmentCenter(catalog,status,queue){
  const hub=document.getElementById('gameHub');if(!hub)return;document.getElementById('homeDevelopmentGameCenter')?.remove();const rows=developmentItems(queue);const wrapper=document.createElement('section');wrapper.id='homeDevelopmentGameCenter';wrapper.dataset.homepageGameSource='DEVELOPMENT_QUEUE';wrapper.innerHTML=`<div class="top30Head"><div><h2>개발 중 게임</h2><p>개발 시작 즉시 자동 등록 · 검증 통과 여부와 별도</p></div><span class="top30Count">${rows.length}개</span></div><div class="top30Grid">${rows.length?rows.map(row=>buildDevelopmentCard(row,catalog,status)).join(''):'<div class="top30Empty">현재 개발 진행 중인 게임이 없어.</div>'}</div>`;const top30=document.getElementById('homeTop30GameCenter');const grid=document.getElementById('gameGrid');hub.insertBefore(wrapper,top30||grid||null);document.documentElement.dataset.homeDevelopmentCount=String(rows.length);
}

"""+center_anchor
s=replace_once(s,center_anchor,development_funcs,'core development center')
old="""    const [catalog,status,baselines,artbooks,top30Manifest]=await Promise.all([getJson('/game-catalog.json',{runtime:true}),getJson('/company-status.json',{runtime:true}),getJson('/public-release-baselines.json'),getJson('/game-artbooks.json'),getJson('/test-game-candidates.json')]);
    if(top30Manifest){
      const catalogSafe=catalog||{games:[]};const statusSafe=status||{};const signature=JSON.stringify([top30Manifest,catalogSafe,statusSafe,baselines||{},artbooks||{}]);
      if(signature!==lastDataSignature){buildFocus(catalogSafe,statusSafe,artbooks||{},top30Manifest);buildGameCenter(catalogSafe,statusSafe,baselines||{},artbooks||{},top30Manifest);lastDataSignature=signature;}
      document.documentElement.dataset.homeSyncSource='canonical-top30-main+company-runtime-metadata';
    }else document.documentElement.dataset.homeSyncSource='offline';
"""
new="""    const [catalog,status,baselines,artbooks,top30Manifest,developmentQueue]=await Promise.all([getJson('/game-catalog.json',{runtime:true}),getJson('/company-status.json',{runtime:true}),getJson('/public-release-baselines.json'),getJson('/game-artbooks.json'),getJson('/test-game-candidates.json'),getJson('/development-queue.json',{runtime:true})]);
    const catalogSafe=catalog||{games:[]};const statusSafe=status||{};const queueSafe=developmentQueue||{items:[]};const signature=JSON.stringify([top30Manifest||{},queueSafe,catalogSafe,statusSafe,baselines||{},artbooks||{}]);
    if(signature!==lastDataSignature){if(top30Manifest){buildFocus(catalogSafe,statusSafe,artbooks||{},top30Manifest);buildGameCenter(catalogSafe,statusSafe,baselines||{},artbooks||{},top30Manifest);}buildDevelopmentCenter(catalogSafe,statusSafe,queueSafe);lastDataSignature=signature;}
    document.documentElement.dataset.homeSyncSource=top30Manifest?'development-queue+canonical-top30+company-runtime-metadata':'development-queue+company-runtime-metadata';
"""
s=replace_once(s,old,new,'core refresh')
p.write_text(s)

# 5) Publication guard: allow development progress cards without making them Top30/direct-play cards.
p=Path('assets/homepage-enhancements.js')
s=p.read_text()
s=s.replace("import './homepage-enhancements-core.js?v=20260914-top30-primary';","import './homepage-enhancements-core.js?v=20260915-development-progress';")
old="""    const canonical=card.classList.contains('top30GameCard')&&card.dataset?.homepageGameSource==='CANONICAL_TOP30'&&rank>=1&&rank<=TEST_SHELF_LIMIT&&score>=TEST_SHELF_MIN_SCORE;
    card.style.display=canonical?'':'none';
"""
new="""    const canonical=card.classList.contains('top30GameCard')&&card.dataset?.homepageGameSource==='CANONICAL_TOP30'&&rank>=1&&rank<=TEST_SHELF_LIMIT&&score>=TEST_SHELF_MIN_SCORE;
    const development=card.classList.contains('developmentGameCard')&&card.dataset?.homepageGameSource==='DEVELOPMENT_QUEUE';
    card.style.display=(canonical||development)?'':'none';
"""
s=replace_once(s,old,new,'entry visibility guard')
p.write_text(s)

# 6) Regression test updates.
p=Path('qa/homepage-manager-publication-order.test.mjs')
s=p.read_text()
pattern=r"test\('homepage primary game implementation is canonical Top30, not the legacy catalog',[\s\S]*?\n\}\);\n\ntest\('APK install control"
replacement="""test('development games auto-display from runtime progress while Top30 promotion stays separately gated',()=>{
  assert.ok(operations.includes('개발게임 자동 표시와 Top30 분리'));
  assert.ok(operations.includes('`productionClass=DEVELOPMENT_CONFIRMED`이면 검증 점수와 무관하게 자동 표시'));
  assert.ok(homepageCore.includes('const developmentItems=queue=>'));
  assert.ok(homepageCore.includes("productionClass||'').trim().toUpperCase()==='DEVELOPMENT_CONFIRMED'"));
  assert.ok(homepageCore.includes("getJson('/development-queue.json',{runtime:true})"));
  assert.ok(homepageCore.includes("wrapper.id='homeDevelopmentGameCenter'"));
  assert.ok(homepageCore.includes('class="foldGameCard developmentGameCard"'));
  assert.ok(homepageCore.includes('data-homepage-game-source="DEVELOPMENT_QUEUE"'));
  const devFilter=homepageCore.slice(homepageCore.indexOf('const developmentItems=queue=>'),homepageCore.indexOf('const developmentStateLabel='));
  assert.ok(!devFilter.includes('homepageTestEligible'));
  assert.ok(homepageCore.includes('const TOP30_LIMIT=30;'));
  assert.ok(homepageCore.includes('const TOP30_MIN_SCORE=80;'));
  assert.ok(homepageCore.includes("getJson('/test-game-candidates.json')"));
  assert.ok(homepageCore.includes("wrapper.id='homeTop30GameCenter'"));
  assert.ok(homepageCore.includes('data-homepage-game-source="CANONICAL_TOP30"'));
  assert.ok(homepageEntry.includes("card.dataset?.homepageGameSource==='DEVELOPMENT_QUEUE'"));
  assert.ok(homepageEntry.includes("card.dataset?.homepageGameSource==='CANONICAL_TOP30'"));
  assert.ok(manager.includes('HOMEPAGE_PRIMARY_GAME_SOURCE=CANONICAL_TOP30'));
});

test('APK install control"""
s2,n=re.subn(pattern,replacement,s,count=1)
if n!=1: raise SystemExit(f'qa test block replace={n}')
p.write_text(s2)

# 7) Homepage workflow self-QA recognizes the new independent development source.
p=Path('.github/workflows/homepage-manager.yml')
s=p.read_text()
old="""          grep -Fq 'homepageOperations:' COMPANY_FLOW.md
          grep -Fq 'maxVisibleTestCandidates: 30' COMPANY_FLOW.md
"""
new="""          grep -Fq 'homepageOperations:' COMPANY_FLOW.md
          grep -Fq 'autoRegisterDevelopmentConfirmed: true' COMPANY_FLOW.md
          grep -Fq 'homepageTestEligibleRequired: false' COMPANY_FLOW.md
          grep -Fq \"getJson('/development-queue.json',{runtime:true})\" assets/homepage-enhancements-core.js
          grep -Fq 'DEVELOPMENT_QUEUE' assets/homepage-enhancements-core.js
          grep -Fq 'maxVisibleTestCandidates: 30' COMPANY_FLOW.md
"""
s=replace_once(s,old,new,'workflow self qa')
p.write_text(s)

print('PATCH_OK')
