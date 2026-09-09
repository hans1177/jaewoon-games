const CLEAN_RE=/\s+/g;
const TECH_RE=/device\s*pixel\s*ratio|devicePixelRatio|imageSmoothing|requestAnimationFrame|addEventListener|window\.resize|viewport|renderer|rendering|pixel\s*ratio|ctx\.|getContext\(|canvas\.|css\b|dom\b/i;
const GAME_RE=/quest|mission|boss|enemy|monster|npc|dialog|story|world|region|area|chapter|portal|surviv|craft|food|hunger|stamina|health|attack|weapon|resource|wave|level|skill|reward|gold|coin|save|load|upgrade|tower|퀘스트|미션|보스|적|몬스터|대사|스토리|세계|지역|챕터|포탈|생존|제작|먹이|배고픔|체력|공격|무기|자원|웨이브|레벨|스킬|보상|골드|저장|강화|타워/i;

const CATEGORY_RULES={
  GOAL:/goal|objective|victory|win\b|clear\b|target|목표|승리|클리어|방어|탈출/i,
  CORE_LOOP:/wave|spawn|attack|fight|collect|craft|build|place|defend|surviv|battle|전투|공격|수집|제작|건설|배치|방어|생존|웨이브/i,
  COMBAT:/damage|attack|health|hp\b|armor|critical|stun|cooldown|projectile|데미지|공격|체력|방어력|치명타|기절|쿨타임|투사체/i,
  ENEMIES:/enemy|monster|mob|zombie|wolf|bear|insect|적|몬스터|좀비|늑대|곰|곤충/i,
  BOSSES:/boss|finalboss|elite|보스|최종보스|정예/i,
  PROGRESSION:/level|xp\b|exp\b|upgrade|unlock|stage|floor|chapter|progress|레벨|경험치|강화|해금|스테이지|층|챕터|진행/i,
  RESOURCES:/gold|coin|money|energy|resource|material|food|wood|stone|crystal|골드|코인|돈|에너지|자원|재료|먹이|나무|돌|수정/i,
  EQUIPMENT:/weapon|armor|item|sword|spear|hammer|bow|gun|rod|무기|방어구|아이템|검|창|해머|활|총|낚싯대/i,
  REGIONS:/region|area|map|zone|village|forest|snow|garden|dungeon|지역|구역|맵|마을|숲|설원|정원|던전/i,
  SPECIAL_MECHANICS:/chance|random|combo|skill|ability|buff|debuff|stun|critical|확률|랜덤|콤보|스킬|능력|버프|디버프|기절|치명타/i,
  SAVE_RULES:/localStorage|save|load|persist|storage|저장|불러오기|세이브/i,
  STORY_FACTS:/story|dialog|npc|quest|mission|ending|intro|world|lore|스토리|대사|npc|퀘스트|미션|엔딩|인트로|세계관/i,
};
const GENERIC_TERMS=new Set(['game','player','enemy','monster','boss','wave','level','skill','attack','health','start','button','canvas','save','load','게임','플레이어','적','몬스터','보스','웨이브','레벨','스킬','공격','체력','시작','버튼','저장','불러오기','전투','목표','지역']);

const clean=v=>String(v??'').replace(CLEAN_RE,' ').trim();
const clip=(v,n=220)=>{const s=clean(v);return s.length>n?s.slice(0,n-1)+'…':s;};
const norm=v=>clean(v).toLowerCase().replace(/[^a-z0-9가-힣]+/g,'');
function stripMarkup(value){return clean(String(value??'').replace(/<style\b[\s\S]*?<\/style>/gi,' ').replace(/<svg\b[\s\S]*?<\/svg>/gi,' ').replace(/<[^>]+>/g,' '));}
function technicalOnly(value){const s=clean(value);return TECH_RE.test(s)&&!GAME_RE.test(s);}
function contextAround(text,index,length,radius=150){return clip(stripMarkup(String(text??'').slice(Math.max(0,index-radius),Math.min(String(text??'').length,index+length+radius))),260);}
function evidenceForRule(file,rule,max=6){
  const text=String(file?.text??''),rows=[];
  const re=new RegExp(rule.source,rule.flags.includes('g')?rule.flags:`${rule.flags}g`);
  let m;
  while((m=re.exec(text))&&rows.length<max*5){
    const statement=contextAround(text,m.index,m[0].length);
    if(statement.length<16||technicalOnly(statement))continue;
    const key=norm(statement).slice(0,120);
    if(!key||rows.some(x=>x.key===key))continue;
    rows.push({key,source:String(file?.path||'unknown'),statement,confidence:'SOURCE_EVIDENCE'});
  }
  return rows.slice(0,max).map(({key,...row})=>row);
}
function termCandidates(file){
  const text=String(file?.text??''),out=[];
  const quoted=/["'`]([^"'`\n]{2,40})["'`]/g;
  let m;
  while((m=quoted.exec(text))&&out.length<160){
    const term=clean(m[1]);
    if(!term||TECH_RE.test(term)||/^https?:/i.test(term)||/[{}();=<>{}]/.test(term))continue;
    if(!/[가-힣A-Za-z]/.test(term))continue;
    out.push(term);
  }
  const ids=text.match(/\b[A-Za-z][A-Za-z0-9_]{2,36}\b/g)||[];
  for(const id of ids.slice(0,600))if(GAME_RE.test(id))out.push(id.replaceAll('_',' '));
  return out;
}
function uniqueTerms(files,gameName){
  const seen=new Set(),out=[];
  for(const raw of [gameName,...files.flatMap(termCandidates)]){
    const term=clip(raw,40),key=norm(term);
    if(key.length<2||GENERIC_TERMS.has(key)||seen.has(key))continue;
    if(/^(true|false|null|undefined|function|return|const|class|style|script)$/i.test(key))continue;
    seen.add(key);out.push(term);
    if(out.length>=24)break;
  }
  return out;
}
export function buildGameFactPack({gameId='',gameName='',genreText='',files=[]}={}){
  const normalizedFiles=(Array.isArray(files)?files:[]).map(f=>({path:String(f?.path||''),text:String(f?.text||'')})).filter(f=>f.text);
  const categories={};
  for(const [category,rule] of Object.entries(CATEGORY_RULES))categories[category]=normalizedFiles.flatMap(file=>evidenceForRule(file,rule,3)).slice(0,6);
  const totalEvidence=Object.values(categories).reduce((n,rows)=>n+rows.length,0);
  const unknownAreas=Object.entries(categories).filter(([,rows])=>rows.length===0).map(([key])=>key);
  const gameSpecificTerms=uniqueTerms(normalizedFiles,gameName);
  return {
    version:1,gameId,gameName,genreText,
    evidencePolicy:{sourcePriority:['EXECUTION_LOGIC','GAME_DATA_CONSTANTS','SAVE_STRUCTURE','VISIBLE_UI_TEXT','COMMENTS_OR_DOCS','IDENTIFIER_ONLY'],technicalImplementationExcluded:true,unsupportedLoreBecomesProposal:true},
    categories,gameSpecificTerms,unknownAreas,
    stats:{sourceFiles:normalizedFiles.length,totalEvidence,categoriesWithEvidence:Object.values(categories).filter(rows=>rows.length>0).length,gameSpecificTerms:gameSpecificTerms.length}
  };
}
export function factPackPromptView(pack,{perCategory=2,maxTerms=16}={}){
  const categories={};
  for(const [key,rows] of Object.entries(pack?.categories||{}))if(rows.length)categories[key]=rows.slice(0,perCategory).map(row=>({source:row.source,statement:clip(row.statement,180)}));
  return {gameSpecificTerms:(pack?.gameSpecificTerms||[]).slice(0,maxTerms),categories,unknownAreas:(pack?.unknownAreas||[]).slice(0,12),stats:pack?.stats||{}};
}
function draftText(draft){
  const phases=Array.isArray(draft?.phasePlans)?draft.phasePlans:[];
  return [draft?.playerMotivation,draft?.centralConflict,draft?.twist,draft?.endgame,draft?.postgame,...phases.flatMap(p=>[p.region,p.quest,p.cause,p.playerAction,p.result,p.nextHook])].map(clean).filter(Boolean).join(' ');
}
function phaseComposite(p){return clean([p?.region,p?.quest,p?.cause,p?.playerAction,p?.result].join(' '));}
function tokens(text){return new Set(clean(text).toLowerCase().match(/[a-z0-9가-힣]{2,}/g)||[]);}
function jaccard(a,b){const A=tokens(a),B=tokens(b);if(!A.size||!B.size)return 0;let hit=0;for(const x of A)if(B.has(x))hit++;return hit/(A.size+B.size-hit);}
export function draftSemanticProblems(draft,{factPack=null,generationMode=''}={}){
  const problems=[],phases=Array.isArray(draft?.phasePlans)?draft.phasePlans:[];
  if(String(generationMode||draft?.generationMode||'').toUpperCase()==='DETERMINISTIC_FALLBACK')problems.push('deterministic-fallback-needs-validation');
  if(Number(factPack?.stats?.totalEvidence||0)<4)problems.push('fact-pack-evidence-insufficient');
  const composites=phases.map(phaseComposite).filter(Boolean),unique=new Set(composites.map(norm));
  if(composites.length===6&&unique.size<5)problems.push('phase-content-too-repetitive');
  let similarPairs=0;
  for(let i=0;i<composites.length;i++)for(let j=i+1;j<composites.length;j++)if(jaccard(composites[i],composites[j])>=0.72)similarPairs++;
  if(similarPairs>=2)problems.push('phase-semantic-similarity-too-high');
  const genericHits=composites.filter(v=>/전략적\s*(계획|이해)|초기\s*단계에서\s*전략|\bsurvival\b/i.test(v)).length;
  if(genericHits>=3)problems.push('generic-planning-language-dominates');
  const joined=draftText(draft),terms=(factPack?.gameSpecificTerms||[]).filter(t=>norm(t).length>=2);
  if(terms.length>=4){
    const grounded=[...new Set(terms.filter(term=>joined.toLowerCase().includes(clean(term).toLowerCase())))];
    if(grounded.length<2)problems.push('game-specific-fact-grounding-too-low');
    const phaseGrounded=composites.filter(text=>terms.some(term=>text.toLowerCase().includes(clean(term).toLowerCase()))).length;
    if(phaseGrounded<2)problems.push('game-specific-phase-grounding-too-low');
  }
  if(TECH_RE.test(joined))problems.push('technical-implementation-leaked-into-narrative');
  return [...new Set(problems)];
}
