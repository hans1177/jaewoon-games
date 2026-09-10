// 역할: 로컬/CI에서 유료 AI 없이 게임 소스의 제작 근거를 먼저 구조화한다.
import fs from 'node:fs';
import path from 'node:path';
import { gunzipSync } from 'node:zlib';

const clean=v=>String(v??'').replace(/\s+/g,' ').trim();
const read=file=>{try{return fs.readFileSync(file,'utf8');}catch{return'';}};
const writeJson=(file,value)=>{fs.mkdirSync(path.dirname(file),{recursive:true});fs.writeFileSync(file,JSON.stringify(value,null,2)+'\n');};
function kstDate(){const p=new Intl.DateTimeFormat('en-US',{timeZone:'Asia/Seoul',year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(new Date());const g=t=>p.find(x=>x.type===t)?.value||'';return`${g('year')}-${g('month')}-${g('day')}`;}
function list(root,exts,max=40){const out=[];if(!fs.existsSync(root))return out;const walk=d=>{for(const e of fs.readdirSync(d,{withFileTypes:true})){if(out.length>=max)return;const p=path.join(d,e.name);if(e.isDirectory())walk(p);else if(exts.some(x=>e.name.toLowerCase().endsWith(x)))out.push(p.replaceAll('\\','/'));}};walk(root);return out;}
const TOPICS={
  gameplayLoop:/start|restart|spawn|wave|quest|craft|collect|attack|damage|enemy|boss|gameover|시작|웨이브|퀘스트|제작|수집|공격|보스/i,
  input:/touch|pointer|mouse|keyboard|keydown|keyup|joystick|button|input|터치|조이스틱|입력/i,
  combat:/hp|health|damage|attack|enemy|monster|boss|cooldown|projectile|체력|데미지|공격|적|몬스터|보스/i,
  progression:/level|xp|gold|reward|price|upgrade|unlock|stage|레벨|골드|보상|가격|강화|해금/i,
  persistence:/localStorage|sessionStorage|indexedDB|saveGame|loadGame|saveData|loadData|persist|serialize|JSON\.stringify|저장|불러오기/i,
  uiArt:/sprite|image|background|canvas|hud|ui|color|animation|vfx|이미지|배경|애니메이션/i,
  risk:/catch|error|null|undefined|setInterval|setTimeout|viewport|mobile|오류|모바일/i
};
const MAX_PACKED_BASE64=4*1024*1024;
const MAX_UNPACKED_TEXT=8*1024*1024;
const packedAtobRegex=()=>/atob\(\s*['"]([A-Za-z0-9+/=]+)['"]\s*\)/g;
function sourceTexts(files){
  const out=[];
  for(const file of files){
    const text=read(file);
    const isHtml=file.toLowerCase().endsWith('.html');
    const scanText=isHtml?text.replace(packedAtobRegex(),(whole,payload)=>whole.replace(payload,'[PACKED_BASE64_MASKED]')):text;
    out.push({source:file,text:scanText,kind:'file'});
    if(!isHtml)continue;
    const re=packedAtobRegex();
    let match,index=0;
    while((match=re.exec(text))){
      if(match[1].length>MAX_PACKED_BASE64)continue;
      try{
        const bytes=Buffer.from(match[1],'base64');
        if(bytes.length<2||bytes[0]!==0x1f||bytes[1]!==0x8b)continue;
        const unpacked=gunzipSync(bytes,{maxOutputLength:MAX_UNPACKED_TEXT}).toString('utf8');
        if(!unpacked.trim())continue;
        index+=1;
        out.push({source:`${file}#embedded-gzip-${index}`,text:unpacked,kind:'embedded-gzip',container:file});
      }catch{}
    }
  }
  return out;
}
function snippets(sources,pattern,max=18){
  const out=[];
  for(const source of sources){
    const lines=source.text.split(/\r?\n/);
    for(let i=0;i<lines.length&&out.length<max;i++){
      const flags=pattern.flags.includes('g')?pattern.flags:`${pattern.flags}g`;
      const matcher=new RegExp(pattern.source,flags);
      let match;
      while((match=matcher.exec(lines[i]))&&out.length<max){
        const column=(match.index||0)+1;
        const start=Math.max(0,column-1-80);
        out.push({source:source.source,line:i+1,column,text:clean(lines[i].slice(start,start+300)).slice(0,220)});
        if(match[0].length===0)matcher.lastIndex+=1;
      }
    }
    if(out.length>=max)break;
  }
  return out;
}
const queue=JSON.parse(read('artbook-submission-queue.json')||'{}');
const gameId=clean(process.env.ARTBOOK_GAME_ID||queue.currentDailyTarget||process.argv.find(x=>x.startsWith('--game='))?.split('=')[1]);
const date=clean(process.env.ARTBOOK_DATE||kstDate());
if(!gameId)throw new Error('ARTBOOK_GAME_ID is required');
const unity=list(`unity-games/${gameId}/Assets/Scripts`,['.cs']);
const web=list(`web-games/${gameId}`,['.html','.js','.css','.json']);
const files=[...unity,...web];
const sources=sourceTexts(files);
const decodedSources=sources.filter(x=>x.kind==='embedded-gzip');
const topics=Object.fromEntries(Object.entries(TOPICS).map(([key,pattern])=>[key,snippets(sources,pattern)]));
const missing=Object.entries(topics).filter(([,rows])=>rows.length===0).map(([key])=>key);
const pack={version:3,gameId,date,generatedBy:'deterministic-source-scan',paidApi:false,sourceMode:unity.length&&web.length?'UNITY_PLUS_WEB_ARCHIVE':unity.length?'UNITY':web.length?'WEB_ARCHIVE_READ_ONLY':'METADATA_ONLY',sourceFiles:files,decodedSources:decodedSources.map(x=>({source:x.source,container:x.container,encoding:'gzip-base64'})),topics,missingEvidence:missing,contracts:{factsAreEvidenceOnly:true,proposalsForbidden:true,numericChangesForbidden:true,approvedBaselineOverwriteForbidden:true,packedSourceDecodeBounded:true,packedSourceExecuted:false,packedLiteralMasked:true,persistenceRequiresStorageEvidence:true,multipleMatchesPerLine:true}};
const output=`artbook-submissions/${gameId}/${date}/fact-pack.json`;
writeJson(output,pack);
console.log(`ARTBOOK_FACT_PACK=${output}`);
console.log(`ARTBOOK_FACT_SOURCE_MODE=${pack.sourceMode}`);
console.log(`ARTBOOK_FACT_DECODED_SOURCES=${decodedSources.length}`);
console.log(`ARTBOOK_FACT_TOPICS=${Object.values(topics).filter(x=>x.length).length}/${Object.keys(topics).length}`);
