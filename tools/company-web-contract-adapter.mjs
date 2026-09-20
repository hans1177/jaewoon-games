// 파일명: tools/company-web-contract-adapter.mjs
// 실제 Web 게임의 기존 입력/핸들러/상태 신호를 승인 scope와 연결하는 비파괴 분석기.
// 이 파일은 게임 소스를 수정하거나 PASS를 결정하지 않는다.

import {approvedScopeRequirement} from './company-approved-scope-contract.mjs';

const clean=value=>String(value??'').replace(/\s+/g,' ').trim();
const lower=value=>clean(value).toLowerCase();
const uniq=values=>[...new Set((values||[]).map(clean).filter(Boolean))];

const FAMILY_KEYWORDS=Object.freeze({
  COMBAT:['attack','combat','fight','hit','shoot','skill','enemy','boss','damage','공격','전투','타격','적','보스','스킬'],
  GATHER:['gather','collect','harvest','mine','chop','resource','loot','pickup','채집','수집','채광','벌목','자원','전리품','줍'],
  CRAFT:['craft','build','forge','smelt','cook','recipe','bench','제작','건설','제련','요리','제작대'],
  INVENTORY:['inventory','equip','weapon','armor','item','bag','가방','인벤','장착','무기','방어구','아이템'],
  PROGRESSION:['upgrade','level','reward','quest','progress','unlock','exp','xp','성장','레벨','보상','퀘스트','진행','해금','경험치'],
  MOVEMENT:['move','walk','run','jump','dash','joystick','stick','dpad','map','explore','travel','이동','걷','달리','점프','대시','조이스틱','지도','탐험'],
  INTERACTION:['interact','talk','open','activate','use','npc','object','상호작용','대화','열기','사용','작동','오브젝트'],
  AUDIO:['music','bgm','audio','sound','mute','volume','음악','브금','오디오','소리','볼륨'],
  MULTIPLAYER:['multi','room','network','sync','remote','host','player','멀티','방','동기화','호스트','플레이어'],
  OBJECTIVE:['goal','objective','victory','defeat','survive','ending','목표','승리','패배','생존','엔딩']
});

function attrsOf(raw=''){
  const attrs={};
  for(const match of String(raw).matchAll(/([:\w-]+)\s*=\s*["']([^"']*)["']/g))attrs[match[1].toLowerCase()]=clean(match[2]);
  return attrs;
}
function familyRows(text=''){
  const source=lower(text),rows=[];
  for(const [family,words] of Object.entries(FAMILY_KEYWORDS)){
    let score=0;
    for(const word of words)if(source.includes(word))score++;
    if(score)rows.push({family,score});
  }
  return rows.sort((a,b)=>b.score-a.score||a.family.localeCompare(b.family));
}
function scopeFamily(item={}){
  const requirement=approvedScopeRequirement(item),path=clean(item.path),text=lower(path+' '+clean(item.label));
  if(requirement==='SPATIAL_WORLD')return'MOVEMENT';
  if(requirement==='ENTITY_INTERACTION')return'INTERACTION';
  if(requirement==='TOWER_PLACEMENT')return'CRAFT';
  if(requirement==='STRATEGIC_CHOICE')return'PROGRESSION';
  if(/^coreFun$/i.test(path))return'CORE';
  if(/^coreLoop\[\d+\]/i.test(path)&&/(?:upgrade|reward|experience|\bexp\b|\bxp\b|progression|stronger build|성장|보상|경험치|진행|강화)/i.test(text))return'PROGRESSION';
  return familyRows(text)[0]?.family||'OBJECTIVE';
}
function nearbyHandlerSource(source,id,offset){
  const chunks=[];
  if(id){
    for(const needle of ["getElementById('"+id+"')",'getElementById("'+id+'")',"#"+id]){
      const at=source.indexOf(needle);
      if(at>=0)chunks.push(source.slice(Math.max(0,at-120),Math.min(source.length,at+520)));
    }
  }
  chunks.push(source.slice(Math.max(0,offset-120),Math.min(source.length,offset+520)));
  return clean(chunks.join(' ')).slice(0,1200);
}
function candidateLabel(tag,attrs,nearby){
  return clean([
    attrs.id,attrs['aria-label'],attrs.title,attrs.name,attrs.class,
    attrs['data-mechanic-id'],attrs['data-gameplay-action'],
    nearby.slice(0,180)
  ].filter(Boolean).join(' '))||tag;
}
function directCandidateText(source,tag,attrs,offset,openTagLength){
  const contentStart=offset+openTagLength;
  const tail=source.slice(contentStart,Math.min(source.length,contentStart+220));
  const innerText=(tag==='button'||tag==='a')?(tail.match(/^([^<]{0,120})<\//i)?.[1]||''):'';
  return clean([
    attrs.id,attrs['aria-label'],attrs.title,attrs.name,attrs.class,attrs.value,
    attrs['data-mechanic-id'],attrs['data-gameplay-action'],innerText
  ].filter(Boolean).join(' '));
}
export function extractWebGameplayCandidates(html=''){
  const source=String(html??''),rows=[],seen=new Set();
  const tagRe=/<(button|input|select|textarea|canvas|a|div)\b([^>]*)>/gi;
  for(const match of source.matchAll(tagRe)){
    const tag=lower(match[1]),attrs=attrsOf(match[2]),offset=Number(match.index)||0,id=clean(attrs.id);
    const spatialControl=tag==='div'&&(
      attrs['data-joystick']!=null||attrs['data-dpad']!=null||attrs['data-touch-control']!=null||
      /(?:^|\s)(?:joystick|stick|dpad|touch-controls|mobile-controls)(?:\s|$)/i.test(clean(attrs.class))||
      /^(?:joystick|stick|dpad)$/i.test(id)
    );
    if(tag==='div'&&!spatialControl)continue;
    const nearby=nearbyHandlerSource(source,id,offset);
    const key=id?'id:'+id:'offset:'+offset;
    if(seen.has(key))continue;
    seen.add(key);
    const label=candidateLabel(tag,attrs,nearby);
    const directText=directCandidateText(source,tag,attrs,offset,match[0].length);
    const semanticText=label+' '+nearby;
    rows.push({
      key,tag,id:id||null,label,
      existingScopeId:clean(attrs['data-scope-id'])||null,
      existingMechanicId:clean(attrs['data-mechanic-id'])||null,
      gameplayAction:attrs['data-gameplay-action']!=null,
      spatialControl,
      directFamilies:familyRows(directText),
      families:familyRows(semanticText),
      directSemanticText:directText.slice(0,500),
      semanticText:clean(semanticText).slice(0,1400),
      sourceOffset:offset
    });
  }
  return rows.slice(0,180);
}
function tokenList(text=''){
  return uniq(lower(text).split(/[^a-z0-9가-힣_-]+/).filter(token=>token.length>=3));
}
function scoreCandidate(item,candidate){
  const family=scopeFamily(item),requirement=approvedScopeRequirement(item);
  const candidateFamilies=new Map((candidate.families||[]).map(row=>[row.family,row.score]));
  const directFamilies=new Map((candidate.directFamilies||[]).map(row=>[row.family,row.score]));
  let score=0;const evidence=[];
  if(candidate.existingScopeId===item.id){score+=100;evidence.push('existing-scope-binding');}
  if(family==='CORE'&&candidate.tag==='canvas'){score+=90;evidence.push('core-gameplay-surface');}
  if(family==='CORE'){
    const preferred=['GATHER','CRAFT','COMBAT','MOVEMENT','INTERACTION'],direct=preferred.filter(name=>directFamilies.has(name)).sort((a,b)=>(directFamilies.get(b)||0)-(directFamilies.get(a)||0))[0];
    if(direct){score+=54+Math.min(12,(directFamilies.get(direct)||0)*4);evidence.push('direct-core-family:'+direct);}
    else{const nearby=preferred.find(name=>candidateFamilies.has(name));if(nearby){score+=20;evidence.push('nearby-core-family:'+nearby);}}
  }else if(directFamilies.has(family)){
    score+=48+Math.min(16,(directFamilies.get(family)||0)*4);
    evidence.push('direct-family:'+family);
  }else if(candidateFamilies.has(family)){
    score+=18+Math.min(9,(candidateFamilies.get(family)||0)*2);
    evidence.push('nearby-family:'+family);
  }
  if(family==='PROGRESSION'&&directFamilies.has('INVENTORY')){score+=58;evidence.push('build-selection-inventory');}
  else if(family==='PROGRESSION'&&directFamilies.has('CRAFT')){score+=48;evidence.push('build-progression-craft');}
  else if(family==='PROGRESSION'&&directFamilies.has('GATHER')&&/(?:collect|reward|resource|수집|보상|자원)/i.test(lower(item.label))){score+=34;evidence.push('progression-resource-collection');}
  if((family==='PROGRESSION'||family==='CORE')&&(directFamilies.has('AUDIO')||directFamilies.has('MULTIPLAYER'))){score-=44;evidence.push('non-core-utility-penalty');}
  const shared=tokenList(clean(item.path)+' '+clean(item.label)).filter(token=>lower(candidate.semanticText).includes(token));
  if(shared.length){score+=Math.min(20,shared.length*4);evidence.push('shared:'+shared.slice(0,4).join(','));}
  if(requirement==='SPATIAL_WORLD'&&candidateFamilies.has('MOVEMENT')){score+=18;evidence.push('spatial-input');}
  if(requirement==='SPATIAL_WORLD'&&candidate.spatialControl){score+=42;evidence.push('direct-spatial-control');}
  if(requirement==='SPATIAL_WORLD'&&!candidate.spatialControl&&/(?:^|\s)(?:map|지도)(?:\s|$)/i.test(lower(candidate.directSemanticText))){score-=24;evidence.push('map-is-not-movement-input');}
  if(requirement==='ENTITY_INTERACTION'&&candidateFamilies.has('INTERACTION')){score+=18;evidence.push('entity-interaction');}
  if(requirement==='TOWER_PLACEMENT'&&(candidate.tag==='canvas'||candidateFamilies.has('CRAFT'))){score+=16;evidence.push('placement-surface');}
  if(requirement==='STRATEGIC_CHOICE'&&(candidateFamilies.has('PROGRESSION')||candidateFamilies.has('COMBAT'))){score+=12;evidence.push('strategic-choice');}
  if(candidate.existingMechanicId){score+=7;evidence.push('existing-mechanic');}
  if(candidate.gameplayAction){score+=4;evidence.push('gameplay-action');}
  return{score,evidence,family,requirement};
}
function mechanicIdFor(item,candidate,index){
  if(candidate.existingMechanicId)return candidate.existingMechanicId;
  const family=(scopeFamily(item)==='CORE'?'core':scopeFamily(item).toLowerCase());
  const id=lower(candidate.id||'').replace(/[^a-z0-9_-]+/g,'-').replace(/^-+|-+$/g,'');
  return (id?family+'-'+id:family+'-action-'+String(index+1)).slice(0,64);
}
function scopeMatchPriority(item={},index=0){
  const path=clean(item.path);
  const requirement=approvedScopeRequirement(item);
  let priority=50;
  if(/^coreLoop\[\d+\]/.test(path))priority=10;
  else if(/^mobileUx(?:\b|\.)/i.test(path))priority=20;
  else if(requirement&&requirement!=='GENERIC')priority=25;
  else if(/^coreFun$/i.test(path))priority=90;
  return{item,index,priority};
}
export function buildWebContractAdapterPlan({html='',inventory=[]}={}){
  const candidates=extractWebGameplayCandidates(html),used=new Set(),bindings=[],ambiguous=[],unmapped=[];
  const ordered=(inventory||[]).map((item,index)=>scopeMatchPriority(item,index))
    .sort((a,b)=>a.priority-b.priority||a.index-b.index);
  for(const {item,index} of ordered){
    const ranked=candidates
      .filter(candidate=>!used.has(candidate.key)||candidate.existingScopeId===item.id)
      .map(candidate=>({candidate,...scoreCandidate(item,candidate)}))
      .sort((a,b)=>b.score-a.score||a.candidate.sourceOffset-b.candidate.sourceOffset);
    const best=ranked[0],second=ranked[1];
    if(!best||best.score<14){
      unmapped.push({scopeId:item.id,path:item.path,label:item.label,family:scopeFamily(item),requirement:approvedScopeRequirement(item),reason:'NO_CONFIDENT_REAL_CONTROL'});
      continue;
    }
    const margin=best.score-(second?.score||0);
    const confidence=best.score>=58&&margin>=12?'HIGH':best.score>=36&&margin>=7?'MEDIUM':'LOW';
    const row={
      scopeId:item.id,path:item.path,label:item.label,family:best.family,requirement:best.requirement,
      candidateKey:best.candidate.key,selector:best.candidate.id?'#'+best.candidate.id:null,
      tag:best.candidate.tag,controlId:best.candidate.id,
      currentMechanicId:best.candidate.existingMechanicId,
      proposedMechanicId:mechanicIdFor(item,best.candidate,index),
      confidence,score:best.score,margin,evidence:best.evidence,
      sourceOffset:best.candidate.sourceOffset
    };
    bindings.push(row);
    if(confidence==='LOW'){
      ambiguous.push({...row,alternatives:ranked.slice(1,4).map(other=>({
        candidateKey:other.candidate.key,selector:other.candidate.id?'#'+other.candidate.id:null,
        label:other.candidate.label,score:other.score,family:other.family,evidence:other.evidence
      }))});
    }else used.add(best.candidate.key);
  }
  return{
    version:1,kind:'web-contract-adapter-plan',
    sourceWrite:false,gateWeakening:false,syntheticGameplayEvidence:false,
    candidateCount:candidates.length,scopeCount:(inventory||[]).length,mappedCount:bindings.length,
    highConfidenceCount:bindings.filter(row=>row.confidence==='HIGH').length,
    mediumConfidenceCount:bindings.filter(row=>row.confidence==='MEDIUM').length,
    ambiguousCount:ambiguous.length,unmappedCount:unmapped.length,
    bindings:bindings.sort((a,b)=>{
      const ai=(inventory||[]).findIndex(item=>item.id===a.scopeId),bi=(inventory||[]).findIndex(item=>item.id===b.scopeId);
      return ai-bi;
    }),
    ambiguous:ambiguous.sort((a,b)=>{
      const ai=(inventory||[]).findIndex(item=>item.id===a.scopeId),bi=(inventory||[]).findIndex(item=>item.id===b.scopeId);
      return ai-bi;
    }),
    unmapped:unmapped.sort((a,b)=>{
      const ai=(inventory||[]).findIndex(item=>item.id===a.scopeId),bi=(inventory||[]).findIndex(item=>item.id===b.scopeId);
      return ai-bi;
    }),
    externalAiReviewRequired:ambiguous.length>0||unmapped.length>0,
    authorityExpanded:false
  };
}
function escapeRegExp(value=''){return String(value).replace(/[.*+?^$()|[\]\\{}]/g,'\\$&');}
function bindTagAttribute(tag,name,value){
  const attr=new RegExp('\\s'+escapeRegExp(name)+'=(?:"[^"]*"|\\\'[^\\\']*\\\')','i'),safe=String(value??'').replaceAll('"','&quot;');
  if(attr.test(tag))return tag.replace(attr,' '+name+'="'+safe+'"');
  return tag.replace(/^<([a-z0-9-]+)/i,'<$1 '+name+'="'+safe+'"');
}
export function applyWebContractAdapterBindings({html='',inventory=[]}={}){
  let out=String(html??'');const plan=buildWebContractAdapterPlan({html:out,inventory}),applied=[];
  for(const row of plan.bindings||[]){
    if(!row.controlId||!['HIGH','MEDIUM'].includes(clean(row.confidence).toUpperCase()))continue;
    const id=escapeRegExp(row.controlId),tagRe=new RegExp('<[a-z0-9-]+\\b[^>]*\\bid=(?:"'+id+'"|\\''+id+'\\')[^>]*>','i'),before=out;
    out=out.replace(tagRe,tag=>{let next=bindTagAttribute(tag,'data-scope-id',row.scopeId);next=bindTagAttribute(next,'data-mechanic-id',row.proposedMechanicId||row.currentMechanicId||'gameplay-action');if(!/\\sdata-gameplay-action=/i.test(next))next=bindTagAttribute(next,'data-gameplay-action',row.family.toLowerCase());if(row.requirement==='SPATIAL_WORLD')next=bindTagAttribute(next,'data-spatial-input','true');return next;});
    if(out!==before)applied.push({scopeId:row.scopeId,controlId:row.controlId,mechanicId:row.proposedMechanicId,confidence:row.confidence});
  }
  const count=String((inventory||[]).length);
  if(/data-approved-scope-count=(?:"[^"]*"|'[^']*')/i.test(out))out=out.replace(/data-approved-scope-count=(?:"[^"]*"|'[^']*')/i,'data-approved-scope-count="'+count+'"');
  else if(/<main\\b/i.test(out))out=out.replace(/<main\\b/i,'<main data-approved-scope-count="'+count+'"');
  else if(/<body\\b/i.test(out))out=out.replace(/<body\\b/i,'<body data-approved-scope-count="'+count+'"');
  return{html:out,plan,applied,appliedCount:applied.length,complete:applied.length===(inventory||[]).length&&!plan.unmappedCount&&!plan.ambiguousCount};
}
export function webContractAdapterGuidance(plan={}){
  const lines=[
    '[WEB_CONTRACT_ADAPTER]',
    '기존 실제 기능을 먼저 재사용한다. 검증용 가짜 기능이나 숨은 버튼을 만들지 않는다.',
    'data-scope-id와 data-mechanic-id는 실제 입력 컨트롤 또는 실제 gameplay surface에만 바인딩한다.'
  ];
  for(const row of plan.bindings||[]){
    lines.push('- '+row.scopeId+' -> '+(row.selector||row.candidateKey)+' | mechanic='+row.proposedMechanicId+' | family='+row.family+' | confidence='+row.confidence+' | evidence='+(row.evidence||[]).join(','));
  }
  for(const row of plan.unmapped||[]){
    lines.push('- UNMAPPED '+row.scopeId+' | '+row.family+'/'+row.requirement+' | 실제 기능이 있으면 찾아 바인딩하고, 없을 때만 승인 설계 범위 안에서 구현한다.');
  }
  if(plan.externalAiReviewRequired)lines.push('EXTERNAL_AI_ADVISORY=AMBIGUOUS_ONLY; 외부 AI는 제안만 하며 실제 소스/런타임 QA가 최종 확인한다.');
  return lines.join('\n');
}
