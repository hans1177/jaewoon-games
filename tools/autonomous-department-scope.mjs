// 파일명: tools/autonomous-department-scope.mjs
// 역할: 파일명만 보지 않고 코드 내용과 부서 목표를 함께 읽어 병렬 부서별 책임 파일을 정한다.
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import Graphics from '../assets/jaewoon-graphics-engine.js';
import { rankAdaptiveContextCandidates } from './vibe2-development-intelligence.mjs';

const ROLE_ORDER=['development','graphics','qa','balance'];
const ROLES=new Set(ROLE_ORDER);
const EXTENSIONS=new Set(['.html','.htm','.js','.mjs','.cjs','.css','.json','.svg']);
const clean=v=>String(v??'').replace(/\s+/g,' ').trim();
const posix=v=>String(v??'').replaceAll('\\','/').replace(/^\.\//,'').replace(/\/+$/,'');
const exists=file=>{try{return fs.statSync(file),true;}catch{return false;}};
const readJson=(file,fallback={})=>{try{return JSON.parse(fs.readFileSync(file,'utf8'));}catch{return fallback;}};
const isGeneratedBundle=rel=>/^assets\/(?:.*\/)?[^/]+-[A-Za-z0-9_-]{6,}\.(?:js|mjs|cjs|css)$/i.test(posix(rel));

const SIGNALS={
  development:{path:/(?:^|\/)(?:main|game|app|index|player|world|core)|\.(?:js|mjs|cjs|html?)$/i,code:/\b(?:function|class|requestAnimationFrame|addEventListener|player|state|update|spawn|collision|canvas|getContext)\b/i},
  graphics:{path:/\.(?:css|svg)$|(?:ui|style|view|render|effect|vfx|animation|sprite|asset|hud|menu)/i,code:/(?:<canvas\b|<svg\b|\b(?:drawImage|fillRect|strokeRect|fillText|classList|style\.|animation|transform|sprite|render|particle|effect|hud|menu|modal)\b|#[\w-]+\s*\{|\.[\w-]+\s*\{)/i},
  qa:{path:/(?:^|\/)(?:test|tests|qa|spec)(?:\/|\.|-|_)|\.(?:test|spec)\./i,code:/\b(?:console\.(?:error|warn)|try\s*\{|catch\s*\(|throw\s+new|requestfailed|error|loading|localStorage|sessionStorage|getElementById|addEventListener|fetch\s*\()\b/i},
  balance:{path:/\.json$|(?:balance|economy|reward|wave|stat|difficulty|enemy|loot)/i,code:/\b(?:hp|health|maxHp|maxHealth|damage|attack|enemy|boss|wave|reward|gold|coin|xp|level|speed|difficulty|loot|drop|cooldown|stun|crit|spawnRate)\b/i},
};
const IMPLEMENTATION_ACTION=/(?:수정|구현|추가|변경|적용|연결|교체|제거|작성|조정|튜닝|개선|고치|fix(?:es|ed|ing)?|implement(?:s|ed|ing)?|add(?:s|ed|ing)?|change(?:s|d|ing)?|update(?:s|d|ing)?|wire(?:s|d|ing)?|replace(?:s|d|ing)?|remove(?:s|d|ing)?|tune(?:s|d|ing)?|improve(?:s|d|ing)?)/i;
const IMPLEMENTATION_TARGETS={
  graphics:/(?:\b(?:css|style|ui|hud|render|sprite|asset|animation|effect|vfx|canvas|svg)\b|그래픽|화면|렌더|스타일|애니메이션|이펙트|스프라이트|이미지)/i,
  qa:/(?:\b(?:assert|guard|fallback|exception|error handling|test code|spec file)\b|테스트\s*코드|검증\s*코드|오류\s*처리|에러\s*처리|예외\s*처리|가드|폴백)/i,
  balance:/(?:\b(?:hp|health|damage|attack|enemy|boss|wave|reward|gold|coin|xp|level|speed|difficulty|loot|drop|cooldown|stun|crit|spawn(?:rate)?)\b|수치|체력|공격|데미지|적|보스|웨이브|보상|난이도|드롭|쿨다운|기절|치명타|스폰)/i,
};

function listFiles(sourcePath){
  const rows=[];
  const walk=current=>{
    for(const entry of fs.readdirSync(current,{withFileTypes:true}).sort((a,b)=>a.name.localeCompare(b.name))){
      if(rows.length>=80)return;
      if(entry.name.startsWith('.')||entry.name==='node_modules')continue;
      const full=path.join(current,entry.name);
      if(entry.isDirectory())walk(full);
      else if(EXTENSIONS.has(path.extname(entry.name).toLowerCase())){
        const rel=posix(path.relative(sourcePath,full));
        if(isGeneratedBundle(rel))continue;
        rows.push({path:rel,full});
      }
    }
  };
  if(exists(sourcePath))walk(sourcePath);
  return rows;
}
function graphicsPlanFor({sourcePath,goal='',diagnostic=null,departmentResult=null,files=null}={}){
  const rows=files||listFiles(sourcePath);
  const visualText=[goal,diagnostic?.type,diagnostic?.message,diagnostic?.needle,departmentResult?.summary,departmentResult?.nextAction].map(clean).filter(Boolean).join(' ');
  const anomalies=Graphics.inferVisualAnomalies(visualText);
  return Graphics.planGraphicsImplementation({anomalies,files:rows.map(row=>({path:row.path,score:Number(row.score||0)})),goal:visualText,deviceTier:'MID',maxFiles:2});
}
function hasFunctionalResponsibility(role,departmentResult,context={}){
  if(role==='development')return true;
  const text=clean(departmentResult?.nextAction||departmentResult?.summary);
  if(!text)return true;
  if(IMPLEMENTATION_ACTION.test(text)&&IMPLEMENTATION_TARGETS[role].test(text))return true;
  if(role==='graphics'){
    const plan=graphicsPlanFor({...context,departmentResult});
    return plan.run&&plan.anomalies.length>0;
  }
  return false;
}
function normalizeRefs(sourcePath,refs=[]){
  const source=posix(sourcePath);
  return [...new Set(refs.map(posix).map(rel=>rel.startsWith(`${source}/`)?rel.slice(source.length+1):rel).filter(rel=>rel&&!isGeneratedBundle(rel)&&exists(path.join(sourcePath,rel))))];
}
function scoreFile(role,row,{refs=[],focus=''}){
  const signal=SIGNALS[role],text=fs.readFileSync(row.full,'utf8').slice(0,120000),lowerFocus=focus.toLowerCase();
  let score=0;
  if(signal.path.test(row.path))score+=6;
  if(signal.code.test(text))score+=7;
  if(refs.includes(row.path)&&score>0)score+=12;
  if(role==='development'&&refs.includes(row.path)&&score>0)score+=8;
  const roleWords={development:['개발','구현','logic','runtime'],graphics:['그래픽','ui','화면','render','asset','animation'],qa:['qa','오류','에러','검증','test','runtime'],balance:['밸런스','난이도','보상','전투','damage','wave','enemy']}[role];
  if(roleWords.some(word=>lowerFocus.includes(word)))score+=2;
  if(/(?:save|storage|persist)/i.test(row.path)&&role!=='qa')score-=3;
  return score;
}
function singleFileOwner(row,{refs=[],focus=''}){
  const ranked=ROLE_ORDER.map((role,index)=>({role,index,score:scoreFile(role,row,{refs,focus})}))
    .filter(item=>item.score>0)
    .sort((a,b)=>b.score-a.score||a.index-b.index);
  return ranked[0]?.role||'development';
}

export function resolveDepartmentScope({role,sourcePath,responsibilityFiles=[],diagnostic=null,goal='',departmentResult=null,repairMode='MODEL',workLane='FULL'}={}){
  if(!ROLES.has(role))throw new Error(`unsupported department role: ${role}`);
  const source=posix(sourcePath);
  if(!source.startsWith('web-games/')||!exists(source))return {run:false,scope:[],reason:'UNSUPPORTED_SOURCE'};
  if(clean(workLane).toUpperCase()==='FAST'&&role!=='development')return {run:false,scope:[],reason:'FAST_LANE_DEVELOPMENT_ONLY'};
  const diagPath=posix(diagnostic?.file||diagnostic?.path||'');
  const refs=normalizeRefs(source,[...responsibilityFiles,diagPath]);
  if(String(repairMode).toUpperCase()==='RULE_PATCH'){
    if(role!=='development')return {run:false,scope:[],reason:'RULE_PATCH_DEVELOPMENT_ONLY'};
    return {run:refs.length>0,scope:refs.slice(0,1),reason:refs.length?'RULE_PATCH_EXACT_SCOPE':'RULE_PATCH_NO_SCOPE'};
  }
  const files=listFiles(source);
  if(!hasFunctionalResponsibility(role,departmentResult,{sourcePath:source,goal,diagnostic,files}))return {run:false,scope:[],reason:'NO_FUNCTIONAL_RESPONSIBILITY'};
  const ownerFocus=[goal,diagnostic?.type,diagnostic?.message].map(clean).filter(Boolean).join(' ');
  const focus=[ownerFocus,departmentResult?.summary,departmentResult?.nextAction].map(clean).filter(Boolean).join(' ');
  if(refs.length===1){
    const row=files.find(item=>item.path===refs[0]);
    if(row){
      const owner=singleFileOwner(row,{refs,focus:ownerFocus});
      if(role!==owner)return {run:false,scope:[],reason:`SINGLE_FILE_MICROTASK_OWNED_BY_${owner.toUpperCase()}`,scores:[{path:row.path,score:scoreFile(role,row,{refs,focus:ownerFocus})}]};
    }
  }
  let ranked=files.map(row=>({...row,score:scoreFile(role,row,{refs,focus})})).filter(row=>row.score>0).sort((a,b)=>b.score-a.score||a.path.localeCompare(b.path));
  const adaptive=rankAdaptiveContextCandidates({files:ranked.map(row=>({path:row.path,baseScore:row.score,content:fs.readFileSync(row.full,'utf8').slice(0,8000)})),diagnostic,responsibilityFiles:refs,role});
  const adaptiveOrder=new Map(adaptive.map((row,index)=>[row.path,index]));
  ranked.sort((a,b)=>(adaptiveOrder.get(a.path)??999)-(adaptiveOrder.get(b.path)??999)||b.score-a.score||a.path.localeCompare(b.path));
  const threshold=role==='development'?5:7;
  let scope=ranked.filter(row=>row.score>=threshold).slice(0,2).map(row=>row.path);
  let graphicsPlan=null;
  if(role==='graphics'){
    graphicsPlan=graphicsPlanFor({sourcePath:source,goal,diagnostic,departmentResult,files:ranked});
    if(graphicsPlan.run){
      const planned=graphicsPlan.scope.filter(rel=>ranked.some(row=>row.path===rel));
      if(planned.length)scope=planned.slice(0,2);
    }
  }
  if(role==='development'&&!scope.length&&refs.length)scope=refs.slice(0,1);
  if(role==='development'&&!scope.length&&ranked.length)scope=[ranked[0].path];
  return {run:scope.length>0,scope,reason:scope.length?(role==='graphics'&&graphicsPlan?.run?'GRAPHICS_ENGINE_ACTIONABLE_SCOPE':'CONTENT_AWARE_SCOPE'):'NO_ROLE_SIGNAL',scores:ranked.slice(0,5).map(({path,score})=>({path,score})),adaptiveContextOrder:adaptive.slice(0,8).map(row=>row.path),graphicsPlan:role==='graphics'?graphicsPlan:undefined};
}

export function bindDepartmentScope({role=process.env.ROLE||process.env.AUTONOMOUS_DEPARTMENT_ROLE,baseCandidateId=process.env.BASE_CANDIDATE_ID,orderFile='.autonomous/work-order.json',cycleFile='department-cycle.json'}={}){
  const order=readJson(orderFile),cycle=readJson(cycleFile),result=(cycle.results||[]).find(x=>x.role===role)||{};
  const resolved=resolveDepartmentScope({role,sourcePath:order.sourcePath,responsibilityFiles:order.responsibilityFiles||[],diagnostic:order.diagnosticTopIssue,goal:cycle.finalGoal||order.goal,departmentResult:result,repairMode:order.repairMode||'MODEL',workLane:order.workLane||'FULL'});
  order.responsibilityFiles=resolved.scope;
  order.vibe2ContextPlan={version:1,role,adaptiveContextOrder:resolved.adaptiveContextOrder||[],scopeReason:resolved.reason,graphicsPlan:role==='graphics'?resolved.graphicsPlan||null:null};
  fs.writeFileSync(orderFile,JSON.stringify(order,null,2)+'\n');
  const candidateId=`${baseCandidateId}-${role}`;
  const goal=`${cycle.finalGoal||order.goal} ${role}부 구현 책임: ${result.nextAction||result.summary||'자기 전문영역의 최소 변경만 수행한다.'}`;
  const put=(k,v)=>process.env.GITHUB_OUTPUT&&fs.appendFileSync(process.env.GITHUB_OUTPUT,`${k}=${String(v??'').replaceAll('\n',' ')}\n`);
  put('run',resolved.run?'true':'false');put('scope',resolved.scope.join(','));put('repair_mode',order.repairMode||'MODEL');put('candidate_id',candidateId);put('scope_reason',resolved.reason);
  if(process.env.GITHUB_ENV){
    fs.appendFileSync(process.env.GITHUB_ENV,`AUTONOMOUS_DEPARTMENT_ROLE=${role}\nAUTONOMOUS_GAME_ID=${order.gameId}\nAUTONOMOUS_GAME_SLUG=${order.gameSlug}\nAUTONOMOUS_SOURCE_PATH=${order.sourcePath}\nAUTONOMOUS_CANDIDATE_ID=${candidateId}\nAUTONOMOUS_REPAIR_MODE=${order.repairMode||'MODEL'}\nAUTONOMOUS_PROTECTED_VALUES=${(order.protectedValues||[]).join(',')}\n`);
    fs.appendFileSync(process.env.GITHUB_ENV,`AUTONOMOUS_GOAL<<JAEWOON_GOAL\n${String(goal).replaceAll('\r',' ')}\nJAEWOON_GOAL\n`);
  }
  console.log(JSON.stringify({role,...resolved,candidateId},null,2));
  return resolved;
}

if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){try{bindDepartmentScope();}catch(error){console.error(error.stack||error.message);process.exitCode=1;}}
