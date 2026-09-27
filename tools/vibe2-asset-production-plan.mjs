// 파일명: tools/vibe2-asset-production-plan.mjs
// 역할: Vibe 게임 구현 작업이 필요한 에셋을 직접 제작/검증 자산 재사용/별도 authoring 요청 중에서 선택할 수 있도록 기계 계획을 만든다.
// 원칙: Vibe2/Vibe3가 게임 구현 주체다. 고정 라이선스/성능/QA 규칙은 학습이나 자동화가 우회하지 못한다.

import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { planAssetApplication } from '../assets/asset-selector.js';

const clean=value=>String(value??'').trim();
const freeze=value=>Object.freeze(value);
const freezeList=value=>freeze([...(value||[])]);
const unique=value=>[...new Set((value||[]).map(clean).filter(Boolean))];
const readJson=(file,fallback={})=>fs.existsSync(file)?JSON.parse(fs.readFileSync(file,'utf8')):fallback;

const WEB_DIRECT_AUTHORING=freeze([
  'svg-final-art',
  'css-presentation',
  'canvas-art-and-effects',
  'procedural-javascript-visuals',
  'web-audio-sfx',
  'motion-engine-animation'
]);

const BINARY_AUTHORING_KINDS=freeze([
  'raster-image-or-sprite-sheet',
  'audio-file-or-bgm',
  '3d-model-or-rig',
  'engine-native-binary-asset'
]);

function matchedForType(selector={},type=''){
  return freezeList((selector.matched||[])
    .filter(row=>clean(row.type)===clean(type))
    .map(row=>freeze({
      id:clean(row.id),
      path:clean(row.path)||null,
      license:clean(row.license)||null,
      source:clean(row.source)||null,
      downloaded:row.downloaded!==false,
      animated:row.animated===true,
      motionMode:clean(row.motionMode)||null
    })));
}

function directAuthoringFor(target='',type=''){
  if(clean(target).toLowerCase()!=='web') return freezeList([]);
  const actor=/character|player|enemy|boss|npc|animation/i.test(clean(type));
  const audio=/audio|sound|music|bgm|sfx/i.test(clean(type));
  if(audio) return freezeList(['web-audio-sfx']);
  if(actor) return freezeList(['svg-final-art','canvas-art-and-effects','motion-engine-animation']);
  return WEB_DIRECT_AUTHORING;
}

function decisionFor(selector={},target='',binding={}){
  const type=clean(binding.type);
  const reuseCandidates=matchedForType(selector,type);
  const directAuthoring=directAuthoringFor(target,type);
  const decisionOrder=unique([
    reuseCandidates.length?'REUSE_VERIFIED_COMPANY_ASSET':'',
    directAuthoring.length?'VIBE_DIRECT_AUTHOR':'',
    'AUTHORING_GENERATOR_REQUEST'
  ]);
  return freeze({
    type,
    required:binding.required!==false,
    targetStates:freezeList(binding.targetStates||[]),
    reuseCandidates,
    directAuthoring,
    decisionOrder:freezeList(decisionOrder),
    generatorFallback:freeze({
      route:'AUTHORING_GENERATOR_REQUEST',
      requestedKinds:BINARY_AUTHORING_KINDS,
      onlyWhenReuseAndDirectAuthoringCannotMeetQuality:true,
      directBinaryTextEditForbidden:true,
      paidToolAutoInstallForbidden:true
    })
  });
}

export function buildVibeAssetProductionPlan({
  task={},
  target='',
  repoRoot=process.cwd(),
  manifest=null,
  presetCatalog=null
}={}){
  const resolvedTarget=clean(target||task.target).toLowerCase()||'web';
  const manifestInput=manifest||readJson(path.join(repoRoot,'assets','asset-manifest.json'),{version:0,assets:[]});
  const presetInput=presetCatalog||readJson(path.join(repoRoot,'assets','prototype-asset-presets.json'),{version:0,presets:[]});
  const request=clean(task.goal||task.request||task.gameId||'game asset production');
  const selector=planAssetApplication({
    prompt:request,
    manifest:manifestInput,
    presetCatalog:presetInput,
    rebuild:/FULL_WEB_GAME_REBUILD/i.test(request)
  });
  const decisions=freezeList((selector.binding||[]).map(binding=>decisionFor(selector,resolvedTarget,binding)));
  const directCount=decisions.filter(row=>row.directAuthoring.length>0).length;
  const reuseCount=decisions.filter(row=>row.reuseCandidates.length>0).length;
  return freeze({
    version:1,
    kind:'vibe2-asset-production-plan',
    gameId:clean(task.gameId)||null,
    target:resolvedTarget,
    implementationOwner:'VIBE2_VIBE3',
    selectorVersion:Number(selector.version||0),
    presetId:clean(selector.prototypePreset?.id)||null,
    productionProfile:selector.production||null,
    requestedTypes:freezeList(selector.requestedTypes||[]),
    missingTypes:freezeList(selector.missingTypes||[]),
    decisions,
    capabilities:freeze({
      webDirectAuthoring:WEB_DIRECT_AUTHORING,
      binaryAuthoringKinds:BINARY_AUTHORING_KINDS,
      canChooseReuse:true,
      canChooseDirectAuthoring:resolvedTarget==='web',
      canRequestGenerator:true
    }),
    summary:freeze({
      decisionCount:decisions.length,
      reuseCandidateTypes:reuseCount,
      directAuthorableTypes:directCount,
      missingSelectorTypes:(selector.missingTypes||[]).length
    }),
    policy:freeze({
      qualityAndGameIdentityFirst:true,
      artDirectionStyleLockRequiredBeforeAssetChoice:true,
      backgroundMustMatchWorldRegionAndNarrativeContext:true,
      monsterVisualMustMatchWorldEcologyAndCombatRole:true,
      actionActorStateSetRequired:freezeList(['IDLE','MOVE','ATTACK','HIT','DEATH']),
      webPresentationMustPassBeforeNativeHandoff:true,
      noPlaceholderMonsterOrCharacter:true,
      noContextMismatchBackground:true,
      existingAssetIsCandidateNotMandatory:true,
      licenseAndCommercialUseGateRequired:true,
      animationEvidenceRequiredForActors:true,
      mobilePerformanceRequired:true,
      noEmojiPlaceholder:true,
      noGeometricPlaceholder:true,
      directAuthoredSvgCanvasMustBeFinalQualityNotPlaceholder:true,
      binaryAssetsDirectTextEditForbidden:true,
      gameplaySaveProgressionEconomyMutationForbiddenForAssetReasons:true,
      sourceAndTransformProvenanceRequiredForReuse:true,
      authoringGeneratorRequestDoesNotCountAsAssetCompleted:true,
      assetUseRequiresRuntimeVisualQa:true
    }),
    authority:'vibe-game-implementation-asset-production-advisory'
  });
}

export function assetProductionGuidance(plan={}){
  if(plan?.kind!=='vibe2-asset-production-plan') return '';
  const lines=[
    '[VIBE ASSET PRODUCTION - implementation owner decision]',
    'Vibe2/Vibe3가 게임 구현 주체이며 현재 게임 정체성과 실제 화면 품질을 기준으로 필요한 에셋 방식을 직접 선택한다.',
    '에셋 선택 전에 승인 설계·최신 아트북에서 게임별 아트 방향과 Style Lock을 먼저 확정한다.',
    '배경은 세계관·지역·서사 맥락에 맞고 몬스터는 생태·전투 역할이 읽혀야 하며 액션 배우는 Web부터 IDLE/MOVE/ATTACK/HIT/DEATH 상태를 실제 게임 상태에 연결한다.',
    '임시 모형 몹·단순 도형·무맥락 배경은 PASS 근거가 아니며 Web 표현 런타임 통과 후 native 플랫폼으로 이어간다.',
    '선택 순서 후보: 검증된 회사 에셋 재사용 / Vibe 직접 제작 / 별도 authoring generator 요청. 기존 에셋 재사용은 강제가 아니다.',
    'Web에서 SVG/CSS/Canvas/절차적 JavaScript/WebAudio/Motion Engine으로 최종 품질을 만들 수 있으면 Vibe가 직접 제작한다.',
    '이모지/단순 도형/검증용 임시 그래픽을 최종 에셋으로 사용하지 않는다.',
    'PNG/WebP 스프라이트시트, 고품질 음원, 3D 모델처럼 binary authoring이 필요한데 현재 worker가 만들 수 없으면 가짜 파일을 쓰지 말고 authoring generator 요청으로 분리한다.',
    '에셋 이유로 게임 규칙, 세이브 의미, 진행, 경제 수치를 바꾸지 않는다.',
    `preset=${clean(plan.presetId)||'none'}; reuseCandidateTypes=${plan.summary?.reuseCandidateTypes||0}; directAuthorableTypes=${plan.summary?.directAuthorableTypes||0}; missingTypes=${(plan.missingTypes||[]).join(',')||'none'}`
  ];
  for(const row of (plan.decisions||[]).slice(0,12)){
    const reuse=(row.reuseCandidates||[]).slice(0,4).map(x=>x.id).join('|')||'none';
    const direct=(row.directAuthoring||[]).join('|')||'none';
    lines.push(`- type=${row.type}; reuse=${reuse}; direct=${direct}; fallback=AUTHORING_GENERATOR_REQUEST`);
  }
  return lines.join('\n');
}

if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){
  const args=Object.fromEntries(process.argv.slice(2).filter(x=>x.startsWith('--')&&x.includes('=')).map(x=>{const [k,...v]=x.slice(2).split('=');return[k,v.join('=')]}));
  const task={gameId:clean(args.game),goal:clean(args.goal),target:clean(args.target)||'web'};
  const result=buildVibeAssetProductionPlan({task,target:task.target,repoRoot:clean(args.root)||process.cwd()});
  console.log(JSON.stringify(result,null,2));
}
