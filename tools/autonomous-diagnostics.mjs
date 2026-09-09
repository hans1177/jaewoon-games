// 파일명: tools/autonomous-diagnostics.mjs
// 역할: 모델 호출 전에 Web 게임 소스를 결정론적으로 검사해 작은 개발 작업을 만든다.
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const TEXT_EXTENSIONS=new Set(['.html','.htm','.js','.mjs','.cjs','.css','.json','.svg']);
const MAX_SCAN_FILES=80;
const MAX_FILE_BYTES=1_600_000;
const LARGE_FILE_BYTES=500_000;
const SEVERITY_SCORE={critical:4,high:3,medium:2,low:1};

const clean=v=>String(v??'').trim();
const posix=v=>String(v??'').replaceAll('\\','/').replace(/^\.\//,'');
const exists=(filesystem,file)=>{try{return filesystem.statSync(file),true;}catch{return false;}};

function listTextFiles(root,filesystem=fs){
  const rows=[];
  if(!exists(filesystem,root))return rows;
  const walk=current=>{
    for(const entry of filesystem.readdirSync(current,{withFileTypes:true}).sort((a,b)=>a.name.localeCompare(b.name))){
      if(rows.length>=MAX_SCAN_FILES)return;
      if(entry.name==='.git'||entry.name==='node_modules'||entry.name==='.autonomous-candidates')continue;
      const full=path.join(current,entry.name);
      if(entry.isDirectory())walk(full);
      else if(TEXT_EXTENSIONS.has(path.extname(entry.name).toLowerCase()))rows.push({full,relative:posix(path.relative(root,full)),size:filesystem.statSync(full).size});
    }
  };
  walk(root);
  return rows;
}
function readBounded(file,filesystem=fs){
  const buf=filesystem.readFileSync(file);
  return buf.subarray(0,Math.min(buf.length,MAX_FILE_BYTES)).toString('utf8');
}
function issue(type,severity,file,message,extra={}){
  return {type,severity,file:posix(file),message:clean(message),...extra};
}
function localReferences(text){
  const out=[];
  const re=/(?:src|href)\s*=\s*["']([^"']+)["']/gi;
  let match;
  while((match=re.exec(text))){
    const value=clean(match[1]);
    if(!value||/^(?:https?:|data:|blob:|javascript:|mailto:|tel:|#|\/\/)/i.test(value))continue;
    out.push(value.split(/[?#]/)[0]);
  }
  return [...new Set(out.filter(Boolean))];
}
function resolveLocalReference(root,file,reference){
  if(reference.startsWith('/'))return null;
  return path.normalize(path.resolve(path.dirname(file),reference));
}
function adjacentDuplicateListener(text){
  const lines=String(text).split(/\r?\n/);
  for(let i=1;i<lines.length;i++){
    const current=lines[i].trim(),previous=lines[i-1].trim();
    if(current&&current===previous&&/\.addEventListener\s*\(/.test(current)&&current.length>=24){
      return {line:i+1,previous:lines[i-1],current:lines[i]};
    }
  }
  return null;
}
function diagnoseFile(root,row,filesystem=fs){
  const results=[];
  const text=readBounded(row.full,filesystem);
  const ext=path.extname(row.relative).toLowerCase();
  if(row.size>=LARGE_FILE_BYTES)results.push(issue('LARGE_SINGLE_FILE','high',row.relative,`단일 파일이 ${row.size} bytes라 전체 자유생성보다 주변 코드 단위 수정이 필요함`,{microTask:'대형 파일 전체를 다시 쓰지 말고 책임 코드 영역 1개만 찾아 최소 수정한다.'}));

  if(ext==='.html'||ext==='.htm'){
    if(/<head\b/i.test(text)&&!/<meta\b[^>]*name\s*=\s*["']viewport["']/i.test(text)){
      results.push(issue('MISSING_VIEWPORT','high',row.relative,'모바일 viewport meta가 없어 화면 비율/확대 동작이 불안정할 수 있음',{
        repairMode:'RULE_PATCH',
        autoPatch:{type:'INSERT_VIEWPORT',path:row.relative},
        microTask:`${row.relative}의 <head>에 viewport meta 1개만 추가한다.`
      }));
    }
    for(const reference of localReferences(text)){
      const resolved=resolveLocalReference(root,row.full,reference);
      if(resolved&&resolved.startsWith(path.resolve(root))&&!exists(filesystem,resolved)){
        results.push(issue('BROKEN_LOCAL_PATH','high',row.relative,`존재하지 않는 로컬 경로: ${reference}`,{reference,microTask:`${row.relative}에서 깨진 경로 ${reference} 1개를 실제 존재하는 경로로 복구한다.`}));
      }
    }
    const imgTags=text.match(/<img\b[^>]*>/gi)||[];
    if(imgTags.some(tag=>!(/\balt\s*=/.test(tag))))results.push(issue('IMG_ALT_MISSING','low',row.relative,'alt 없는 이미지가 있어 접근성/대체표시가 약함',{microTask:`${row.relative}의 의미 있는 이미지 1개에 실제 내용과 맞는 alt를 추가한다.`}));
  }

  if(/\.(?:js|mjs|cjs|html|htm)$/i.test(row.relative)){
    if(/JSON\.parse\s*\(\s*(?:localStorage|sessionStorage)\.getItem\s*\(/.test(text))results.push(issue('UNGUARDED_SAVE_PARSE','high',row.relative,'저장 데이터 JSON.parse가 직접 호출되어 손상 저장값에서 예외가 날 수 있음',{microTask:`${row.relative}의 저장 JSON.parse 1곳에 기존 저장 의미를 유지하는 실패 방어를 추가한다.`}));
    if(/document\.getElementById\s*\([^\n;]+\)\s*\.addEventListener\s*\(/.test(text))results.push(issue('DOM_NULL_EVENT_BIND','medium',row.relative,'DOM 조회 직후 null 확인 없이 이벤트를 연결하는 경로가 있음',{microTask:`${row.relative}의 DOM 이벤트 연결 1곳에 존재 확인을 추가한다.`}));
    const duplicate=adjacentDuplicateListener(text);
    if(duplicate)results.push(issue('ADJACENT_DUPLICATE_EVENT_LISTENER','high',row.relative,`동일 이벤트 리스너 문장이 ${duplicate.line-1}/${duplicate.line}행에 연속 중복됨`,{
      repairMode:'RULE_PATCH',
      autoPatch:{type:'REMOVE_ADJACENT_DUPLICATE_EVENT_LISTENER',path:row.relative,previous:duplicate.previous,current:duplicate.current},
      microTask:`${row.relative}의 연속 중복 이벤트 리스너 1개만 제거한다.`
    }));
    const setIntervals=(text.match(/\bsetInterval\s*\(/g)||[]).length;
    const clearIntervals=(text.match(/\bclearInterval\s*\(/g)||[]).length;
    if(setIntervals>0&&clearIntervals===0)results.push(issue('INTERVAL_CLEANUP_RISK','medium',row.relative,`setInterval ${setIntervals}개가 보이지만 clearInterval 근거가 없음`,{microTask:`${row.relative}에서 반복 타이머 1개의 생명주기와 중복 실행 여부를 확인해 필요한 경우 해제 경로를 추가한다.`}));
  }
  return results;
}

export function diagnoseGame(sourcePath,{filesystem=fs,maxIssues=30}={}){
  const root=path.resolve(sourcePath);
  const files=listTextFiles(sourcePath,filesystem);
  const issues=[];
  let hasTouchSignal=false,hasTouchAction=false;
  for(const row of files){
    const text=readBounded(row.full,filesystem);
    if(/touchstart|touchend|pointerdown|pointerup|<canvas\b|<button\b/i.test(text))hasTouchSignal=true;
    if(/touch-action\s*:/i.test(text))hasTouchAction=true;
    issues.push(...diagnoseFile(root,row,filesystem));
  }
  if(hasTouchSignal&&!hasTouchAction){
    const first=files.find(x=>/\.css$/i.test(x.relative))||files.find(x=>/\.html?$/i.test(x.relative))||files[0];
    if(first)issues.push(issue('TOUCH_ACTION_UNSPECIFIED','medium',first.relative,'터치/포인터 입력 근거는 있으나 touch-action 정책이 확인되지 않음',{microTask:`${first.relative}에서 실제 조작 영역 1개의 touch-action 필요 여부를 확인하고 모바일 스크롤 충돌만 최소 수정한다.`}));
  }
  issues.sort((a,b)=>(SEVERITY_SCORE[b.severity]||0)-(SEVERITY_SCORE[a.severity]||0)||String(a.file).localeCompare(String(b.file))||String(a.type).localeCompare(String(b.type)));
  const limited=issues.slice(0,Math.max(1,maxIssues));
  const counts={critical:0,high:0,medium:0,low:0};for(const row of limited)counts[row.severity]=(counts[row.severity]||0)+1;
  return {version:1,sourcePath:posix(sourcePath),filesScanned:files.length,issues:limited,counts,topIssue:limited[0]||null,hasActionableIssue:limited.length>0};
}

export function microTaskFromIssue(row){
  if(!row)return null;
  return {type:row.type,severity:row.severity,file:row.file,goal:clean(row.microTask)||`${row.file}의 ${row.type} 문제 1개만 수정한다.`,repairMode:row.repairMode||'MODEL',autoPatch:row.autoPatch||null};
}

async function main(){
  const sourcePath=process.argv.find(x=>x.startsWith('--source='))?.slice(9)||process.env.AUTONOMOUS_SOURCE_PATH;
  if(!sourcePath)throw new Error('--source 또는 AUTONOMOUS_SOURCE_PATH 필요');
  console.log(JSON.stringify(diagnoseGame(sourcePath),null,2));
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href)main().catch(error=>{console.error(error.stack||error.message);process.exitCode=1;});

export { LARGE_FILE_BYTES, SEVERITY_SCORE };
