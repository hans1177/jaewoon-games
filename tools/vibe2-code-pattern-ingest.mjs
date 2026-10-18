// 파일명: tools/vibe2-code-pattern-ingest.mjs
// 역할: 검증된 training sample에서 raw 코드 없이 재사용 가능한 내부 구현 패턴만 추출한다.

import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const clean=v=>String(v??'').trim();
const upper=v=>clean(v).toUpperCase();
const uniq=v=>[...new Set((v||[]).map(clean).filter(Boolean))];
const readJson=(file,fallback={})=>fs.existsSync(file)?JSON.parse(fs.readFileSync(file,'utf8')):fallback;
const writeJson=(file,value)=>{fs.mkdirSync(path.dirname(file),{recursive:true});fs.writeFileSync(file,JSON.stringify(value,null,2)+'\n','utf8');};
const hash=s=>{let h=2166136261;for(const ch of String(s)){h^=ch.charCodeAt(0);h=Math.imul(h,16777619);}return(h>>>0).toString(36);};

const CLASSIFIERS=[
  ['SAVE_PERSISTENCE',/save|load|restore|localStorage|sessionStorage|datastore|persist|migration/i],
  ['INPUT_EVENT_BINDING',/addEventListener|onclick|pointer|touch|keydown|keyup|input/i],
  ['STATE_MACHINE',/state|phase|win|fail|retry|restart|objective|progress/i],
  ['AI_INTENT',/enemy|npc|opponent|pathfind|\bai\b|intent/i],
  ['COMBAT_RESOLUTION',/combat|attack|damage|hit|weapon|skill|boss/i],
  ['ECONOMY_TRANSACTION',/econom|currency|gold|coin|cost|price|shop|resource|reward/i],
  ['FRAME_LOOP_PERFORMANCE',/requestAnimationFrame|setInterval|performance|pool|fps|frame/i],
  ['MOBILE_UI_FLOW',/mobile|touch|responsive|hud|menu|ui|button/i],
  ['REGRESSION_REPAIR',/regression|bug|repair|failure|fix|causal/i],
  ['DAMAGE_POPUP_POOL',/damage.?popup|damage.?number|floating.?combat.?text|데미지.?숫자|피해.?숫자/i],
  ['TOOLTIP_PLACEMENT',/tooltip.?placement|tooltip.?overlap|도움창.?위치|툴팁.?배치/i],
  ['ICON_STATE_MOTION',/animated.?icon|icon.?animation|moving.?icon|아이콘.?애니|움직이는.?아이콘/i],
  ['CONTEXTUAL_HUD',/contextual.?hud|adaptive.?hud|상황별.?hud|전투.?hud/i],
  ['NINE_SLICE_SURFACE',/nine.?slice|9.?slice|프레임.?분할|nine.?patch/i],
  ['MATERIAL_HARMONIZATION',/material.?harmoni|material.?style.?lock|재질.?통일|재질.?조화/i],
  ['SCREEN_LAYOUT_OPTIMIZER',/layout.?optimi|screen.?composition|배치.?최적화|화면.?구도/i],
  ['NOTIFICATION_STACK',/notification.?stack|toast.?queue|알림.?스택|알림.?중복/i],
  ['STATUS_DURATION_TRACK',/status.?duration|buff.?timer|상태.?지속.?시간|버프.?타이머/i],
  ['ITEM_VISUAL_PREVIEW',/3d.?item.?preview|item.?turntable|장비.?미리보기|아이템.?회전/i],
  ['BOSS_PHASE_PRESENTATION',/boss.?phase.?strip|보스.?체력바|페이즈.?표시/i],
  ['VISUAL_EFFECT_BUDGET',/effect.?budget|popup.?pool|ui.?performance|이펙트.?제한/i]
];


const VISUAL_CODING_RECIPES=Object.freeze({
  DAMAGE_POPUP_POOL:{source:'JaewoonGraphicsEngine.createWebPresentationController.showDamage / RobloxCommonUI.CreateVisualFeedbackController.ShowDamage',proof:['CONFIRMED_GAME_EVENT','EVENT_DEDUP','WORLD_TO_VIEWPORT','POPUP_CAP','SOURCE_BOUND_RUNTIME_CAPTURE']},
  TOOLTIP_PLACEMENT:{source:'placeVibeTooltip / PositionTooltip / showTooltip',proof:['SAFE_AREA','ANCHOR_VISIBLE','EDGE_FLIP','NO_CRITICAL_INPUT_COVER']},
  ICON_STATE_MOTION:{source:'animateIcon / AnimateIcon',proof:['SOURCE_STATE_BOUND','CANCEL_PREVIOUS_TWEEN','REDUCED_MOTION','NO_GAMEPLAY_MUTATION']},
  CONTEXTUAL_HUD:{source:'buildVibePresentationCraft / optimizeVibeScreenLayout',proof:['VIEWPORT_BOUNDS','FOCAL_OCCLUSION','MOBILE_TOUCH','STATE_PRESERVATION']},
  NINE_SLICE_SURFACE:{source:'RobloxCommonUI.CreatePanel surfaceTexture/sliceCenter; existing web CSS border-image',proof:['REAL_VERIFIED_TEXTURE_ASSET','SOURCE_IMAGE_PROVENANCE','FRAME_CORNERS_UNSTRETCHED']},
  MATERIAL_HARMONIZATION:{source:'createVibeVisualMaterialRecipe / existing native authoring',proof:['VERIFIED_ASSET_MATERIAL_SLOTS','STYLE_LOCK','ORIGINAL_ASSET_IMMUTABLE']},
  SCREEN_LAYOUT_OPTIMIZER:{source:'optimizeVibeScreenLayout',proof:['POSITIVE_VIEWPORT','NO_UNRESOLVED_OCCLUSION','PORTRAIT_LANDSCAPE']},
  NOTIFICATION_STACK:{source:'notify / Notify',proof:['ACTIVE_BUDGET','REENTRANT_EVENTS','VISIBLE_POSITION','CLEANUP']},
  STATUS_DURATION_TRACK:{source:'updateStatusIcon / UpdateStatusIcon',proof:['AUTHORITATIVE_REMAINING_DURATION','ZERO_STATE','STACKS_DISPLAY']},
  ITEM_VISUAL_PREVIEW:{source:'existing game native model camera and render target',proof:['REAL_BOUND_MODEL','VALID_CAMERA','MOBILE_BUDGET']},
  BOSS_PHASE_PRESENTATION:{source:'existing boss phase system plus client-only progress rendering',proof:['ACTUAL_BOSS_PHASE_STATE','NO_CLIENT_DAMAGE_AUTHORITY']},
  VISUAL_EFFECT_BUDGET:{source:'existing game renderer presentation pool/caps',proof:['MAX_ACTIVE_EFFECTS','NO_INPUT_OCCLUSION','PERFORMANCE_CAPTURE']}
});

function engineOf(sample={}){
  if(clean(sample?.taskType)==='roblox')return'roblox';
  const source=clean(sample?.input||'')+' '+clean(sample?.instruction||'');
  if(/roblox-games\//i.test(source)||/roblox|luau|studio/i.test(source))return'roblox';
  if(/unity-games\//i.test(source)||/unity|c#/i.test(source))return'unity';
  return'web';
}

function sampleVerified(sample={}){
  if(!['coding','bugfix','unity','roblox'].includes(clean(sample.taskType)))return false;
  // Roblox 고유 작업은 Web QA로 대체하지 않고 실제 네이티브 런타임 근거를 요구한다.
  if(clean(sample.taskType)==='roblox'&&upper(sample.runtime||sample.verification?.runtime||sample.qa?.runtime)!=='PASS')return false;
  if(upper(sample.independentQa)!=='PASS')return false;
  const browser=upper(sample.browserQa);
  if(browser&& !['PASS','NOT_APPLICABLE'].includes(browser))return false;
  if(sample.verification?.fullRegression&&upper(sample.verification.fullRegression)!=='PASS')return false;
  return Boolean(clean(sample.sourceRevision||sample.sourceCommit||sample.provenance?.sourceRevision));
}

export function deriveVerifiedCodePatterns(sample={},sourcePath=''){
  if(!sampleVerified(sample))return[];
  const text=[
    sample.instruction,sample.input,
    ...(sample.verification?.proposedTests||[]),
    clean(sample.output).split('검증된 패치:')[0]
  ].filter(Boolean).join(' ');
  const systems=CLASSIFIERS.filter(([,re])=>re.test(text)).map(([name])=>name);
  const sourceRevision=clean(sample.sourceRevision||sample.sourceCommit||sample.provenance?.sourceRevision);
  const gameId=clean(sample.gameId||sample.project)||null;
  const engine=engineOf(sample);
  const taskType=clean(sample.taskType);
  return systems.map(system=>({
    id:`pat_${hash([gameId,engine,taskType,system,sourceRevision].join('|'))}`,
    gameId,engine,taskType,system,
    problem:clean(sample.instruction).slice(0,220),
    pattern:`VERIFIED_${system}_SMALLEST_RESPONSIBLE_CHANGE_WITH_REGRESSION`,
    ...(VISUAL_CODING_RECIPES[system]?{implementationRecipe:VISUAL_CODING_RECIPES[system]}:{}),
    tags:uniq([system,taskType,engine,'verified','smallest-responsible-change','regression-bound']),
    verified:true,
    sourceRevision,
    evidencePath:sourcePath,
    rawCodeStored:false,
    independentQa:'PASS',
    browserQa:upper(sample.browserQa)||'NOT_APPLICABLE',
    authority:'verified-internal-code-pattern'
  }));
}

export function ingestVerifiedCodePatterns({samplesDir='company-learning/training-samples',libraryInput={}}={}){
  const byId=new Map((libraryInput?.patterns||[]).filter(x=>x?.verified===true).map(x=>[clean(x.id),x]));
  let examined=0,added=0;
  if(fs.existsSync(samplesDir)){
    for(const entry of fs.readdirSync(samplesDir,{withFileTypes:true}).filter(x=>x.isFile()&&x.name.endsWith('.json')).sort((a,b)=>a.name.localeCompare(b.name))){
      const file=path.join(samplesDir,entry.name);let sample;try{sample=readJson(file,null);}catch{continue;} examined++;
      for(const pattern of deriveVerifiedCodePatterns(sample,file)){
        if(!byId.has(pattern.id))added++;
        byId.set(pattern.id,pattern);
      }
    }
  }
  return {
    version:1,kind:'vibe2-verified-code-pattern-library',
    patterns:[...byId.values()].sort((a,b)=>String(a.system).localeCompare(String(b.system))||String(a.id).localeCompare(String(b.id))).slice(-1000),
    policy:{verifiedEvidenceRequired:true,rawCodeStored:false,wholeGameCopyForbidden:true,unauthorizedExternalCodeForbidden:true},
    stats:{examined,added,total:byId.size},
    updatedAt:new Date().toISOString()
  };
}

function args(argv=process.argv.slice(2)){const out={};for(const raw of argv){if(!raw.startsWith('--'))continue;const i=raw.indexOf('=');if(i<0)out[raw.slice(2)]=true;else out[raw.slice(2,i)]=raw.slice(i+1);}return out;}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){
  const a=args();const samples=clean(a.samples)||'company-learning/training-samples';const output=clean(a.output)||'.vibe2/code-pattern-library.json';
  const result=ingestVerifiedCodePatterns({samplesDir:samples,libraryInput:readJson(output,{patterns:[]})});
  writeJson(output,result);
  console.log('VIBE2_CODE_PATTERN_INGEST=PASS');
  console.log(`VIBE2_CODE_PATTERN_ADDED=${result.stats.added}`);
  console.log(`VIBE2_CODE_PATTERN_TOTAL=${result.stats.total}`);
  console.log('VIBE2_RAW_CODE_STORED=NO');
}
