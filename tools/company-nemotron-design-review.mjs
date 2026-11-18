// 파일명: tools/company-nemotron-design-review.mjs
// [임포트] 기존 Studio MCP 촬영본과 대항해시대 R15 주민 외형만 다룬다.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {pathToFileURL} from 'node:url';

// [정책] NVIDIA 무료 시험 엔드포인트. 결제·유료 대체·로컬 우회 금지.
const MODEL='nvidia/nemotron-3.5-super-vl-120b-a12b';
const ENDPOINT='https://integrate.api.nvidia.com/v1/chat/completions';
const FILE='roblox-games/mare-essentia/src/ReplicatedStorage/Shared/Pose.luau';
const FRAMES=['harbor_npc_face_front-0.jpg','harbor_motion_idle-0.jpg','harbor_npc_sparring_03-0.jpg'];
const RULES=Object.freeze({
  face_light_influence:{min:0.10,max:0.70,expression:/(gui\.LightInfluence = )([0-9.]+)/g},
  skirt_width:{min:0.94,max:1.24,expression:/(q\.Size = Vector3\.new\(len, lower\.Size\.X \* )([0-9.]+)/g},
  skirt_depth:{min:0.90,max:1.18,expression:/(q\.Size = Vector3\.new\(len, lower\.Size\.X \* [0-9.]+, lower\.Size\.X \* )([0-9.]+)/g},
  belt_height:{min:0.24,max:0.50,expression:/(if belt then )([0-9.]+)( else spec\[4\])/g},
  scalp_height:{min:0.28,max:0.52,expression:/(local scalp = piece\(Enum\.PartType\.Ball, Vector3\.new\(h\.X \* 1\.03, h\.Y \* )([0-9.]+)/g}
});
const digest=v=>crypto.createHash('sha256').update(v).digest('hex');
const trim=v=>String(v??'').trim();
const options=Object.fromEntries(process.argv.slice(2).filter(s=>s.startsWith('--')&&s.includes('=')).map(s=>[s.slice(2,s.indexOf('=')),s.slice(s.indexOf('=')+1)]));
const root=path.resolve(options.root||'main');
const framesRoot=path.resolve(options.frames||'.');
const reportPath=path.resolve(options.out||path.join(framesRoot,'nemotron-design-review.json'));
const sourcePath=path.resolve(root,FILE);
const categories=new Set(['npc-face','npc-hair','npc-clothing','material','ui','camera']);

function record(status,fields={}) {
  const report={version:1,provider:'NVIDIA',model:MODEL,gameId:'mare-essentia',
    sourceFile:FILE,sourceRevision:trim(process.env.GITHUB_SHA),status,...fields};
  fs.mkdirSync(path.dirname(reportPath),{recursive:true});
  fs.writeFileSync(reportPath,JSON.stringify(report,null,2)+'\n');
  console.log('NEMOTRON_DESIGN_STATUS='+status);
  return report;
}
function images() {
  const rows=[];
  for(const name of FRAMES){
    const file=path.join(framesRoot,name);
    if(!fs.existsSync(file)||!fs.statSync(file).isFile())continue;
    const bytes=fs.readFileSync(file);
    if(bytes.length<4096||bytes.length>2000000||bytes[0]!==255||bytes[1]!==216)continue;
    rows.push({name,sha256:digest(bytes),url:'data:image/jpeg;base64,'+bytes.toString('base64')});
  }
  return rows;
}
function strictJson(text) {
  if(typeof text!=='string'||Buffer.byteLength(text)>30000)throw Error('RESPONSE_INVALID_SIZE');
  const raw=text.trim(),tick=String.fromCharCode(96).repeat(3);
  let parsed=raw;
  if(raw.startsWith(tick)){
    const lines=raw.split('\n');
    if(lines.length<3||!lines[lines.length-1].startsWith(tick))throw Error('RESPONSE_FENCE_INVALID');
    parsed=lines.slice(1,-1).join('\n').trim();
  }
  return JSON.parse(parsed);
}
export function validateReview(value,frameNames) {
  const response=typeof value==='string'?strictJson(value):value;
  if(!response||!Array.isArray(response.issues)||!Array.isArray(response.edits)||
     response.issues.length>8||response.edits.length>3)throw Error('REVIEW_SCHEMA_INVALID');
  const allowed=new Set(frameNames);
  const issues=response.issues.map(row=>{
    if(!row||!categories.has(row.category)||!['low','medium','high'].includes(row.severity)||
      !allowed.has(row.screenshot)||typeof row.evidence!=='string'||
      row.evidence.trim().length<12||row.evidence.length>500)throw Error('ISSUE_EVIDENCE_INVALID');
    return {category:row.category,severity:row.severity,screenshot:row.screenshot,
      evidence:row.evidence.trim().slice(0,240)};
  });
  if(response.edits.length&&!issues.some(row=>row.severity!=='low'))throw Error('EDIT_WITHOUT_VISIBLE_ISSUE');
  const keys=new Set();
  const edits=response.edits.map(row=>{
    const r=RULES[row?.key];
    if(!r||keys.has(row.key)||!Number.isFinite(row.value)||row.value<r.min||row.value>r.max||
      Math.round(row.value*100)/100!==row.value)throw Error('EDIT_NOT_IN_WHITELIST');
    keys.add(row.key);return {key:row.key,value:row.value};
  });
  return {issues,edits};
}
export function applyVisualParameters(source,edits) {
  let content=source;
  const changed=[];
  for(const edit of edits){
    const rule=RULES[edit.key];
    if(!rule)throw Error('EDIT_NOT_ALLOWED');
    const matches=[...content.matchAll(rule.expression)];
    if(matches.length!==1)throw Error('SOURCE_ANCHOR_NOT_UNIQUE:'+edit.key);
    const before=Number(matches[0][2]);
    if(!Number.isFinite(before))throw Error('SOURCE_ANCHOR_INVALID');
    if(Math.abs(before-edit.value)<0.005)continue;
    content=content.replace(rule.expression,(match,a,b,c)=>a+edit.value+(c||''));
    changed.push({key:edit.key,before,after:edit.value});
  }
  if(changed.length&&(!content.includes('function Pose.createR15(')||
    !content.includes('function Pose.applyRegisteredMobOutfit(')||
    !content.includes('local NPC_REGISTERED_HAIR = {')))
    throw Error('GAME_SOURCE_GUARD');
  return {content,changed};
}

// [메인] 모델 자유문자열은 절대 소스에 실행·삽입하지 않는다. 숫자 파라미터만 후보 소스에 적용.
export async function reviewNemotron({fetchImpl=globalThis.fetch}={}) {
  const policy=JSON.parse(fs.readFileSync(path.join(root,'company-learning/external-ai-distillation-policy.json'),'utf8'));
  const contract=policy.directVisualDesign;
  if(!contract?.enabled||contract.model!==MODEL||!contract.gameIds?.includes('mare-essentia')||
    !contract.directMainWriteForbidden||!contract.directCandidateSourceEditAllowed||
    !contract.isolatedCandidateBranchRequired||
    contract.allowedSourceFiles?.length!==1||contract.allowedSourceFiles[0]!==FILE||
    contract.allowedEdits?.length!==Object.keys(RULES).length||
    Object.keys(RULES).some(key=>!contract.allowedEdits.includes(key)))
    throw Error('CANONICAL_DESIGN_POLICY_DENIED');
  const photos=images();
  const proofs=photos.map(({name,sha256})=>({name,sha256}));
  if(photos.length<2)return record('SKIPPED_STUDIO_IMAGES_UNAVAILABLE',{frames:proofs});
  if(trim(process.env.NVIDIA_FREE_TIER_VERIFIED)!=='YES')
    return record('SKIPPED_FREE_TIER_UNVERIFIED',{frames:proofs});
  const apiKey=trim(process.env.NVIDIA_API_KEY);
  if(!apiKey)return record('SKIPPED_API_KEY_MISSING',{frames:proofs});
  const prompt='Review REAL Roblox Studio NPC screenshots for visual defects only. '+
    'Never change gameplay, saves, rewards, mechanics, security, or networking. '+
    'Return STRICT JSON with fields "issues" and "edits" only. '+
    '"issues" is an array of {"category":"npc-face|npc-hair|npc-clothing|material|ui|camera",'+
    '"severity":"low|medium|high","screenshot":"one listed filename","evidence":"specific visible evidence"}. '+
    '"edits" is an array of {"key":"allowed key","value":number}. At most 3. '+
    'Allowed keys and ranges: face_light_influence 0.10..0.70, skirt_width 0.94..1.24, '+
    'skirt_depth 0.90..1.18, belt_height 0.24..0.50, scalp_height 0.28..0.52. '+
    'Only request edits when evidence visibly supports the issue. If uncertain, use empty edits. '+
    'No code, paths, commands or other fields. Screenshot filenames: '+photos.map(x=>x.name).join(', ');
  const controller=new AbortController();
  const timeout=setTimeout(()=>controller.abort(),90000);
  try{
    const response=await fetchImpl(ENDPOINT,{
      method:'POST',signal:controller.signal,
      headers:{Authorization:'Bearer '+apiKey,'Content-Type':'application/json'},
      body:JSON.stringify({model:MODEL,stream:false,max_tokens:1800,reasoning_effort:'none',
        messages:[{role:'user',content:[{type:'text',text:prompt},
          ...photos.map(x=>({type:'image_url',image_url:{url:x.url}}))]}]})
    });
    if(!response.ok)return record('UNVERIFIED_HTTP_'+response.status,{frames:proofs});
    const payload=await response.json();
    const raw=payload?.choices?.[0]?.message?.content;
    const {issues,edits}=validateReview(raw,photos.map(x=>x.name));
    const before=fs.readFileSync(sourcePath,'utf8');
    const candidate=applyVisualParameters(before,edits);
    const details={
      frames:proofs,rawResponseSha256:digest(trim(raw)),
      sourceBeforeSha256:digest(before),sourceAfterSha256:digest(candidate.content),
      issues,edits:candidate.changed,candidateOnly:true,
      independentQaPassed:false,afterStudioPassed:false,releasePassed:false
    };
    if(!candidate.changed.length)return record('REVIEWED_NO_EDIT',details);
    if(trim(process.env.NEMOTRON_DESIGN_CANDIDATE)!=='YES')
      return record('REVIEWED_EDIT_NOT_ENABLED',details);
    fs.writeFileSync(sourcePath,candidate.content);
    return record('CANDIDATE_EDITED',details);
  }catch(err){
    return record('UNVERIFIED_REVIEW_ERROR',{
      reason:trim(err?.message).slice(0,100).replace(/[^\w:-]/g,'_'),frames:proofs
    });
  }finally{clearTimeout(timeout);}
}
if(process.argv[1]&&import.meta.url===pathToFileURL(path.resolve(process.argv[1])).href){
  reviewNemotron().catch(()=>{console.log('NEMOTRON_DESIGN_STATUS=UNVERIFIED_INTERNAL_ERROR');process.exitCode=1;});
}
