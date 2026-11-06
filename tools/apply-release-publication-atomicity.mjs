// 파일명: tools/apply-release-publication-atomicity.mjs
// 역할: 검증된 플랫폼 출시가 개발 상태에 고립되지 않도록 중앙정책·출시승격·홈페이지 표시 계약을 기존 흐름에 직접 반영한다.
import fs from 'node:fs';

const read=file=>fs.readFileSync(file,'utf8');
const write=(file,text)=>fs.writeFileSync(file,text.endsWith('\n')?text:`${text}\n`);
const patch=(file,fn)=>{const before=read(file);const after=fn(before);if(after!==before)write(file,after);};
const replaceOnce=(text,from,to,label)=>{
  if(text.includes(to))return text;
  if(!text.includes(from))throw new Error(`${label}_ANCHOR_MISSING`);
  return text.replace(from,to);
};

patch('COMPANY_FLOW.md',text=>{
  const homepageFrom=`  evidenceBoundPromotionRequired: true\n  fixedFunctionProtection:`;
  const homepageTo=`  evidenceBoundPromotionRequired: true\n  releasePublicationAtomicity:\n    enabled: true\n    canonicalReleaseTruthRequiresVerifiedNativePublication: true\n    successfulVerifiedNativePublicationMustFinalizeReleaseConfirmed: true\n    finalizationMustSynchronize:\n      - COMPANY_RUNTIME_DEVELOPMENT_QUEUE_PRODUCTION_CLASS\n      - COMPANY_RUNTIME_GAME_CATALOG\n      - CANONICAL_GAME_CATALOG\n      - VERIFIED_PLATFORM_LAUNCH_TARGET\n      - HOMEPAGE_OFFICIAL_RELEASE_CARD\n    partialReleaseStateForbidden: true\n    verifiedPublicationMustNotRemainDevelopmentOnly: true\n    staleDevelopmentValidationStateMustNotMaskVerifiedReleaseTruth: true\n    homepageManagerMayMirrorVerifiedReleaseTruthButMustNotInventIt: true\n    releasedGamePrimaryActionLabel: 게임 시작\n    releasedGamePrimaryActionMustUseVerifiedPlatformTarget: true\n    releaseCardIndependentFromTop30Ranking: true\n    releaseCardIndependentFromDevelopmentShelf: true\n    platformLaunchTarget:\n      ROBLOX: VERIFIED_ROBLOX_PUBLICATION_TARGET_PLACE_ID\n      UNITY: VERIFIED_RELEASE_ARTIFACT_OR_STORE_TARGET\n      FORTNITE_UEFN: VERIFIED_EXPERIENCE_OR_RELEASE_TARGET\n    recovery:\n      verifiedPublicationEvidenceMustBePreservedOnSyncFailure: true\n      retryFinalizationWithoutRepublishingWhenPublicationAlreadyProven: true\n      repairExistingCanonicalReleasePipelineAtFailurePoint: true\n  fixedFunctionProtection:`;
  text=replaceOnce(text,homepageFrom,homepageTo,'CENTRAL_HOMEPAGE_RELEASE_ATOMICITY');

  const promotionFrom=`  DEVELOPMENT_CONFIRMED_TO_RELEASE_CONFIRMED:\n    requires:\n      - DEVELOPMENT_BASELINE_READY\n      - REAL_PLAY_EVIDENCE\n      - REAL_SELECTED_PLATFORM_EVIDENCE\n      - CURRENT_WEB_COMPANION_RUNTIME_PASS\n      - APPROVED_SCOPE_FULLY_IMPLEMENTED\n  classMovementNeverUsedToSatisfyCountQuota: true`;
  const promotionTo=`  DEVELOPMENT_CONFIRMED_TO_RELEASE_CONFIRMED:\n    requires:\n      - DEVELOPMENT_BASELINE_READY\n      - REAL_PLAY_EVIDENCE\n      - REAL_SELECTED_PLATFORM_EVIDENCE\n      - CURRENT_WEB_COMPANION_RUNTIME_PASS\n      - APPROVED_SCOPE_FULLY_IMPLEMENTED\n  releasePublicationFinalization:\n    appliesAfterVerifiedNativePublication: true\n    verifiedPublicationEvidenceRequired: true\n    verifiedPlatformLaunchTargetRequired: true\n    releaseGateOrEquivalentFinalReviewMustAlreadyPass: true\n    ifCanonicalClassStillDevelopmentConfirmedPromoteTo: RELEASE_CONFIRMED\n    productionClassAndCatalogAndHomepageMustConvergeInSameCanonicalReleaseFlow: true\n    publishedGameMustLeaveDevelopmentShelf: true\n    publishedGameMustAppearInOfficialReleaseShelf: true\n    publishedGamePrimaryAction: 게임 시작\n    staleWebRevalidationOrHomepageTestFieldsCannotDemoteVerifiedReleaseTruth: true\n    publicationAlreadyProvenMustNotRequireRepublishForStateRepair: true\n  classMovementNeverUsedToSatisfyCountQuota: true`;
  return replaceOnce(text,promotionFrom,promotionTo,'CENTRAL_RELEASE_FINALIZATION');
});

patch('company-directive.json',text=>{
  const data=JSON.parse(text);
  data.revision=Math.max(Number(data.revision)||0,40)+1;
  data.updatedAt='2026-09-17';
  data.homepageOperations ||= {};
  data.homepageOperations.releasePublicationAtomicity={
    enabled:true,
    canonicalReleaseTruthRequiresVerifiedNativePublication:true,
    successfulVerifiedNativePublicationMustFinalizeReleaseConfirmed:true,
    finalizationMustSynchronize:[
      'COMPANY_RUNTIME_DEVELOPMENT_QUEUE_PRODUCTION_CLASS',
      'COMPANY_RUNTIME_GAME_CATALOG',
      'CANONICAL_GAME_CATALOG',
      'VERIFIED_PLATFORM_LAUNCH_TARGET',
      'HOMEPAGE_OFFICIAL_RELEASE_CARD'
    ],
    partialReleaseStateForbidden:true,
    verifiedPublicationMustNotRemainDevelopmentOnly:true,
    staleDevelopmentValidationStateMustNotMaskVerifiedReleaseTruth:true,
    homepageManagerMayMirrorVerifiedReleaseTruthButMustNotInventIt:true,
    releasedGamePrimaryActionLabel:'게임 시작',
    releasedGamePrimaryActionMustUseVerifiedPlatformTarget:true,
    releaseCardIndependentFromTop30Ranking:true,
    releaseCardIndependentFromDevelopmentShelf:true,
    platformLaunchTarget:{
      ROBLOX:'VERIFIED_ROBLOX_PUBLICATION_TARGET_PLACE_ID',
      UNITY:'VERIFIED_RELEASE_ARTIFACT_OR_STORE_TARGET',
      FORTNITE_UEFN:'VERIFIED_EXPERIENCE_OR_RELEASE_TARGET'
    },
    recovery:{
      verifiedPublicationEvidenceMustBePreservedOnSyncFailure:true,
      retryFinalizationWithoutRepublishingWhenPublicationAlreadyProven:true,
      repairExistingCanonicalReleasePipelineAtFailurePoint:true
    }
  };
  data.production ||= {};
  data.production.releasePublicationFinalization={
    appliesAfterVerifiedNativePublication:true,
    verifiedPublicationEvidenceRequired:true,
    verifiedPlatformLaunchTargetRequired:true,
    releaseGateOrEquivalentFinalReviewMustAlreadyPass:true,
    ifCanonicalClassStillDevelopmentConfirmedPromoteTo:'RELEASE_CONFIRMED',
    productionClassAndCatalogAndHomepageMustConvergeInSameCanonicalReleaseFlow:true,
    publishedGameMustLeaveDevelopmentShelf:true,
    publishedGameMustAppearInOfficialReleaseShelf:true,
    publishedGamePrimaryAction:'게임 시작',
    staleWebRevalidationOrHomepageTestFieldsCannotDemoteVerifiedReleaseTruth:true,
    publicationAlreadyProvenMustNotRequireRepublishForStateRepair:true
  };
  return JSON.stringify(data,null,2)+'\n';
});

patch('assets/homepage-enhancements-core.js',text=>{
  const itemsFrom=`const developmentScoreOf=row=>developmentScoreState(row).score;\nconst developmentItems=queue=>`;
  const itemsTo=`const developmentScoreOf=row=>developmentScoreState(row).score;\nconst releaseItems=queue=>(Array.isArray(queue?.items)?queue.items:[]).filter(row=>String(row?.productionClass||'').trim().toUpperCase()==='RELEASE_CONFIRMED'&&String(row?.status||'').trim().toUpperCase()!=='DISCARDED').sort((a,b)=>String(b?.robloxReleasePublishedAt||b?.updatedAt||'').localeCompare(String(a?.robloxReleasePublishedAt||a?.updatedAt||''))||String(a?.gameId||'').localeCompare(String(b?.gameId||'')));\nconst developmentItems=queue=>`;
  text=replaceOnce(text,itemsFrom,itemsTo,'HOMEPAGE_RELEASE_ITEMS');

  const stylesFrom=`#homeDevelopmentGameCenter{margin:0 14px 14px}.developmentGameCard .foldGameArt{height:118px}.developmentGameCard .foldGameBody p{min-height:0}.foldBadge.development{background:#dcecff;color:#185f93}.foldBadge.progress{background:#eef8ff;color:#1767a9}`;
  const stylesTo=`#homeReleaseGameCenter{margin:0 14px 14px}.releaseGameCard .foldGameArt{height:145px}.foldBadge.release{background:#d9f4e4;color:#197340}.foldBadge.live{background:#e7f7ff;color:#1767a9}\n#homeDevelopmentGameCenter{margin:0 14px 14px}.developmentGameCard .foldGameArt{height:118px}.developmentGameCard .foldGameBody p{min-height:0}.foldBadge.development{background:#dcecff;color:#185f93}.foldBadge.progress{background:#eef8ff;color:#1767a9}`;
  text=replaceOnce(text,stylesFrom,stylesTo,'HOMEPAGE_RELEASE_STYLES');

  const cardAnchor=`function buildDevelopmentCard(item,catalog,status){`;
  const releaseFns=`function releaseLaunchTarget(item,status){\n  const platform=String(item?.selectedPlatform||item?.targetPlatform||'').trim().toUpperCase();\n  const explicit=String(item?.platformLaunchUrl||item?.releaseUrl||item?.officialPlayUrl||'').trim();\n  if(/^https?:\\/\\//i.test(explicit)||/^roblox:/i.test(explicit))return explicit;\n  return developmentPlatformTestTarget(item,status);\n}\nfunction buildReleaseCard(item,catalog,status){\n  const gameId=String(item?.gameId||'').trim();const source=catalogMap(catalog).get(gameId)||{};const name=source.name||item?.robloxPublicationTarget?.displayName||item?.gameName||gameId;const selectedPlatform=getHomepagePlatform({...source,id:gameId,selectedPlatform:item?.selectedPlatform||item?.targetPlatform},status);const image=source.image||'assets/pwa-icon-512.png';const genre=Array.isArray(source.genre)&&source.genre.length?source.genre.join(' · '):'출시 게임';const launch=releaseLaunchTarget(item,status);const publishedAt=formatDate(item?.robloxReleasePublishedAt||item?.robloxReleaseEvidence?.publishedAt||item?.robloxPublicationTarget?.verifiedAt||item?.updatedAt);const launchAction=launch?\`<a class="foldGameBtn" href="\${esc(launch)}" data-release-game-start="true">게임 시작</a>\`:'<span class="foldGameBtn off" aria-disabled="true">실행 주소 확인 중</span>';\n  return \`<article class="foldGameCard releaseGameCard" data-game-id="\${esc(gameId)}" data-homepage-game-source="RELEASE_CONFIRMED_QUEUE" data-release-platform="\${esc(String(selectedPlatform))}"><div class="foldGameArt"><img src="\${esc(image)}" alt="\${esc(name)}" loading="lazy"><div class="foldGameTitle"><b>\${esc(name)}</b><small>\${esc(genre)}</small></div></div><div class="foldGameBody"><div class="foldBadges"><span class="foldBadge release">정식 출시</span><span class="foldBadge live">\${esc(platformLabel(selectedPlatform))}</span></div><p>검증된 플랫폼 출시 게임</p><div class="foldGameMeta">출시 확인 \${esc(publishedAt)} · Top30/개발 진행 선반과 별도</div><div class="foldGameActions">\${launchAction}</div></div></article>\`;\n}\nfunction buildReleaseCenter(catalog,status,queue){\n  const hub=document.getElementById('gameHub');if(!hub)return;document.getElementById('homeReleaseGameCenter')?.remove();const rows=releaseItems(queue);const wrapper=document.createElement('section');wrapper.id='homeReleaseGameCenter';wrapper.dataset.homepageGameSource='RELEASE_CONFIRMED_QUEUE';wrapper.innerHTML=\`<div class="top30Head"><div><h2>출시 게임</h2><p>검증된 플랫폼 출시 · 공식 실행 링크</p></div><span class="top30Count">\${rows.length}개</span></div><div class="top30Grid">\${rows.length?rows.map(row=>buildReleaseCard(row,catalog,status)).join(''):'<div class="top30Empty">현재 정식 출시로 동기화된 게임이 없어.</div>'}</div>\`;const top30=document.getElementById('homeTop30GameCenter');const grid=document.getElementById('gameGrid');hub.insertBefore(wrapper,top30||grid||null);document.documentElement.dataset.homeReleaseCount=String(rows.length);\n}\n\nfunction buildDevelopmentCard(item,catalog,status){`;
  text=replaceOnce(text,cardAnchor,releaseFns,'HOMEPAGE_RELEASE_CARD');

  const refreshFrom=`if(signature!==lastDataSignature){if(top30Manifest){buildFocus(catalogSafe,statusSafe,artbooks||{},top30Manifest);buildGameCenter(catalogSafe,statusSafe,baselines||{},artbooks||{},top30Manifest);}buildDevelopmentCenter(catalogSafe,statusSafe,queueSafe);lastDataSignature=signature;}`;
  const refreshTo=`if(signature!==lastDataSignature){if(top30Manifest){buildFocus(catalogSafe,statusSafe,artbooks||{},top30Manifest);buildGameCenter(catalogSafe,statusSafe,baselines||{},artbooks||{},top30Manifest);}buildReleaseCenter(catalogSafe,statusSafe,queueSafe);buildDevelopmentCenter(catalogSafe,statusSafe,queueSafe);lastDataSignature=signature;}`;
  return replaceOnce(text,refreshFrom,refreshTo,'HOMEPAGE_RELEASE_REFRESH');
});

patch('.github/workflows/company-development-roblox-release-promotion.yml',text=>{
  const onFrom=`on:\n  workflow_dispatch:\n    inputs:`;
  const onTo=`on:\n  push:\n    branches: [main]\n    paths:\n      - 'company-release-promotion.request'\n  workflow_dispatch:\n    inputs:`;
  text=replaceOnce(text,onFrom,onTo,'ROBLOX_RELEASE_REQUEST_TRIGGER');

  const concurrencyFrom=`  group: company-development-roblox-release-promotion-\${{ inputs.game_id }}`;
  const concurrencyTo=`  group: company-development-roblox-release-promotion-\${{ inputs.game_id || github.ref_name }}`;
  text=replaceOnce(text,concurrencyFrom,concurrencyTo,'ROBLOX_RELEASE_CONCURRENCY');

  const requestedFrom=`          REQUESTED_GAME_ID: \${{ inputs.game_id }}`;
  const requestedTo=`          REQUESTED_GAME_ID: \${{ inputs.game_id }}\n          REQUEST_FILE: company-release-promotion.request`;
  text=replaceOnce(text,requestedFrom,requestedTo,'ROBLOX_RELEASE_REQUEST_ENV');

  const gameIdFrom=`          const gameId=String(process.env.REQUESTED_GAME_ID||'').trim();`;
  const gameIdTo=`          const requested=String(process.env.REQUESTED_GAME_ID||'').trim();\n          const requestFile=String(process.env.REQUEST_FILE||'').trim();\n          const gameId=requested||((requestFile&&fs.existsSync(requestFile))?String(fs.readFileSync(requestFile,'utf8')).trim().split(/\\s+/)[0]:'');`;
  text=replaceOnce(text,gameIdFrom,gameIdTo,'ROBLOX_RELEASE_REQUEST_RESOLVE');

  const currentReleaseFrom=`          if(currentRelease){\n            put('skip','true');put('skip_reason','already-published');\n            console.log(\`ROBLOX_RELEASE_ALREADY_PUBLISHED=\${gameId}\`);\n            process.exit(0);\n          }`;
  const currentReleaseTo=`          if(currentRelease){\n            const existingTarget=item.robloxPublicationTarget||item.robloxReleaseEvidence||{};\n            put('skip','true');put('skip_reason','already-published');\n            put('game_id',gameId);\n            put('source_revision',revision);\n            put('artifact_identity',artifact);\n            put('artifact_run_id',artifactRunId);\n            put('source_root',sourceRoot);\n            put('universe_id',existingTarget.universeId||'');\n            put('place_id',existingTarget.placeId||'');\n            put('publication_target_source',existingTarget.source||'existing-release-evidence');\n            console.log(\`ROBLOX_RELEASE_ALREADY_PUBLISHED=\${gameId}\`);\n            process.exit(0);\n          }`;
  text=replaceOnce(text,currentReleaseFrom,currentReleaseTo,'ROBLOX_RELEASE_SKIP_OUTPUTS');

  const summaryAnchor=`      - name: Release promotion summary\n        if: always()`;
  const finalizeSteps=`      - name: Finalize RELEASE_CONFIRMED runtime state and runtime catalog\n        if: steps.target.outputs.game_id != '' && (steps.target.outputs.skip == 'true' || (steps.publish.outcome == 'success' && steps.publish.outputs.deferred != 'true'))\n        working-directory: runtime\n        env:\n          GAME_ID: \${{ steps.target.outputs.game_id }}\n        shell: bash\n        run: |\n          set -euo pipefail\n          git fetch --no-tags origin "$COMPANY_RUNTIME_BRANCH"\n          git reset --hard "origin/$COMPANY_RUNTIME_BRANCH"\n          node <<'NODE'\n          const fs=require('fs');\n          const q=JSON.parse(fs.readFileSync('development-queue.json','utf8'));\n          const item=(q.items||[]).find(row=>row.gameId===process.env.GAME_ID);\n          if(!item)throw new Error(\`release finalization queue item missing: \${process.env.GAME_ID}\`);\n          const target=item.robloxPublicationTarget||{};\n          const evidence=item.robloxReleaseEvidence||{};\n          const validId=value=>/^[1-9][0-9]*$/.test(String(value||'').trim());\n          if(item.robloxReleaseClaim!==true||evidence.published!==true)throw new Error('verified publication evidence missing before release finalization');\n          if(target.verified!==true||!validId(target.universeId)||!validId(target.placeId))throw new Error('verified launch target missing before release finalization');\n          if(String(evidence.universeId)!==String(target.universeId)||String(evidence.placeId)!==String(target.placeId))throw new Error('release evidence target mismatch');\n          const stamp=new Date().toISOString();\n          const launchUrl=\`https://www.roblox.com/games/\${String(target.placeId).trim()}\`;\n          item.productionClass='RELEASE_CONFIRMED';\n          item.productionClassSource='VERIFIED_NATIVE_PUBLICATION';\n          item.currentStep='RELEASE_CONFIRMED';\n          item.canonicalState='RELEASE_CONFIRMED';\n          item.homepageOfficialCard=true;\n          item.homepageTestCandidate=false;\n          item.homepageTestVerdict='RELEASE_CONFIRMED';\n          item.platformLaunchUrl=launchUrl;\n          item.routingBlockers=(item.routingBlockers||[]).filter(value=>value!=='roblox-release-promotion-pending');\n          item.updatedAt=stamp;\n          q.updatedAt=stamp;\n          const catalogPath='game-catalog.json';\n          const catalog=fs.existsSync(catalogPath)?JSON.parse(fs.readFileSync(catalogPath,'utf8')):{version:1,games:[]};\n          catalog.games=Array.isArray(catalog.games)?catalog.games:[];\n          let game=catalog.games.find(row=>String(row?.id||'')===item.gameId);\n          if(!game){game={id:item.gameId,name:target.displayName||item.gameName||item.gameId,genre:[]};catalog.games.push(game);}\n          Object.assign(game,{\n            name:game.name||target.displayName||item.gameName||item.gameId,\n            productionClass:'RELEASE_CONFIRMED',\n            productionClassSource:'VERIFIED_NATIVE_PUBLICATION',\n            homepageCategory:'release-confirmed',\n            homepageStage:'출시확정 · Roblox',\n            homepageOfficialCard:true,\n            selectedPlatform:'ROBLOX',\n            productionTarget:'roblox',\n            platformLaunchUrl:launchUrl,\n            robloxPublicationTarget:{...target},\n            updatedAt:stamp,\n          });\n          catalog.updatedAt=stamp;\n          fs.writeFileSync('development-queue.json',JSON.stringify(q,null,2)+'\\n');\n          fs.writeFileSync(catalogPath,JSON.stringify(catalog,null,2)+'\\n');\n          console.log('ROBLOX_RELEASE_FINALIZATION=RELEASE_CONFIRMED');\n          console.log(\`ROBLOX_RELEASE_LAUNCH_URL=\${launchUrl}\`);\n          NODE\n          git config user.name 'jaewoon-roblox-runtime'\n          git config user.email 'actions@users.noreply.github.com'\n          git add development-queue.json game-catalog.json\n          git diff --cached --check\n          if ! git diff --cached --quiet; then\n            git commit -m 'runtime: finalize verified Roblox release state [skip ci]'\n            pushed=0\n            for attempt in 1 2 3 4; do\n              if git push origin HEAD:"$COMPANY_RUNTIME_BRANCH"; then pushed=1; break; fi\n              git fetch --no-tags origin "$COMPANY_RUNTIME_BRANCH"\n              git rebase "origin/$COMPANY_RUNTIME_BRANCH" || { git rebase --abort || true; exit 1; }\n              sleep $((attempt*2))\n            done\n            test "$pushed" = '1'\n          fi\n          echo 'ROBLOX_RELEASE_RUNTIME_FINALIZATION=PASS'\n\n      - name: Synchronize canonical main game catalog from verified release\n        if: steps.target.outputs.game_id != '' && (steps.target.outputs.skip == 'true' || (steps.publish.outcome == 'success' && steps.publish.outputs.deferred != 'true'))\n        working-directory: main\n        env:\n          GAME_ID: \${{ steps.target.outputs.game_id }}\n        shell: bash\n        run: |\n          set -euo pipefail\n          git config user.name 'jaewoon-release-catalog'\n          git config user.email 'actions@users.noreply.github.com'\n          for attempt in 1 2 3 4; do\n            git fetch --no-tags origin main "$COMPANY_RUNTIME_BRANCH"\n            git reset --hard origin/main\n            git show "origin/$COMPANY_RUNTIME_BRANCH:development-queue.json" > /tmp/release-development-queue.json\n            node <<'NODE'\n          const fs=require('fs');\n          const q=JSON.parse(fs.readFileSync('/tmp/release-development-queue.json','utf8'));\n          const item=(q.items||[]).find(row=>row.gameId===process.env.GAME_ID);\n          if(!item||item.productionClass!=='RELEASE_CONFIRMED'||item.robloxReleaseClaim!==true)throw new Error('runtime release finalization missing');\n          const target=item.robloxPublicationTarget||{};\n          if(target.verified!==true||!/^[1-9][0-9]*$/.test(String(target.placeId||'')))throw new Error('verified Roblox launch target missing');\n          const stamp=new Date().toISOString();\n          const launchUrl=item.platformLaunchUrl||\`https://www.roblox.com/games/\${String(target.placeId).trim()}\`;\n          const catalog=JSON.parse(fs.readFileSync('game-catalog.json','utf8'));\n          catalog.games=Array.isArray(catalog.games)?catalog.games:[];\n          let game=catalog.games.find(row=>String(row?.id||'')===item.gameId);\n          if(!game){game={id:item.gameId,name:target.displayName||item.gameName||item.gameId,genre:[]};catalog.games.push(game);}\n          Object.assign(game,{\n            name:game.name||target.displayName||item.gameName||item.gameId,\n            productionClass:'RELEASE_CONFIRMED',\n            productionClassSource:'VERIFIED_NATIVE_PUBLICATION',\n            homepageCategory:'release-confirmed',\n            homepageStage:'출시확정 · Roblox',\n            homepageOfficialCard:true,\n            selectedPlatform:'ROBLOX',\n            productionTarget:'roblox',\n            platformLaunchUrl:launchUrl,\n            robloxPublicationTarget:{...target},\n            updatedAt:stamp,\n          });\n          catalog.updatedAt=stamp;\n          fs.writeFileSync('game-catalog.json',JSON.stringify(catalog,null,2)+'\\n');\n          console.log('ROBLOX_RELEASE_CANONICAL_CATALOG_SYNC=PASS');\n          NODE\n            git add game-catalog.json\n            git diff --cached --check\n            if git diff --cached --quiet; then echo 'ROBLOX_RELEASE_CANONICAL_CATALOG_NO_CHANGES=YES'; exit 0; fi\n            git commit -m 'catalog: register verified Roblox release [skip ci]'\n            if git push origin HEAD:main; then echo 'ROBLOX_RELEASE_CANONICAL_CATALOG_PUSH=PASS'; exit 0; fi\n            sleep $((attempt*2))\n          done\n          echo 'ROBLOX_RELEASE_CANONICAL_CATALOG_PUSH=FAIL' >&2\n          exit 1\n\n      - name: Release promotion summary\n        if: always()`;
  return replaceOnce(text,summaryAnchor,finalizeSteps,'ROBLOX_RELEASE_FINALIZATION_STEPS');
});

const qa=`import test from 'node:test';\nimport assert from 'node:assert/strict';\nimport fs from 'node:fs';\n\nconst flow=fs.readFileSync('COMPANY_FLOW.md','utf8');\nconst directive=JSON.parse(fs.readFileSync('company-directive.json','utf8'));\nconst homepage=fs.readFileSync('assets/homepage-enhancements-core.js','utf8');\nconst releaseWorkflow=fs.readFileSync('.github/workflows/company-development-roblox-release-promotion.yml','utf8');\n\ntest('central policy requires atomic verified release publication finalization',()=>{\n  for(const token of ['releasePublicationAtomicity:','verifiedPublicationMustNotRemainDevelopmentOnly: true','releasedGamePrimaryActionLabel: 게임 시작','releasePublicationFinalization:','publicationAlreadyProvenMustNotRequireRepublishForStateRepair: true'])assert.equal(flow.includes(token),true,token);\n  assert.equal(directive.homepageOperations?.releasePublicationAtomicity?.enabled,true);\n  assert.equal(directive.production?.releasePublicationFinalization?.ifCanonicalClassStillDevelopmentConfirmedPromoteTo,'RELEASE_CONFIRMED');\n});\n\ntest('homepage has a separate RELEASE_CONFIRMED shelf with official start action',()=>{\n  for(const token of ['const releaseItems=queue=>','function buildReleaseCenter(','RELEASE_CONFIRMED_QUEUE','data-release-game-start=','게임 시작'])assert.equal(homepage.includes(token),true,token);\n});\n\ntest('Roblox release promotion finalizes runtime class, runtime catalog, canonical catalog and supports repair without republish',()=>{\n  for(const token of [\"item.productionClass='RELEASE_CONFIRMED'\",'game-catalog.json','ROBLOX_RELEASE_RUNTIME_FINALIZATION=PASS','ROBLOX_RELEASE_CANONICAL_CATALOG_SYNC=PASS','company-release-promotion.request','already-published'])assert.equal(releaseWorkflow.includes(token),true,token);\n});\n`;
write('qa/release-publication-atomicity.test.mjs',qa);
console.log('RELEASE_PUBLICATION_ATOMICITY_MIGRATION=PASS');
