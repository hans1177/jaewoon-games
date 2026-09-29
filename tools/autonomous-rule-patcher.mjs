// 파일명: tools/autonomous-rule-patcher.mjs
// 역할: 진단기가 안전하다고 증명한 소수의 수정만 모델 없이 exact edit 후보로 만든다.
import fs from 'node:fs';
import path from 'node:path';

const clean=v=>String(v??'').trim();
const posix=v=>String(v??'').replaceAll('\\','/').replace(/^\.\//,'');
const count=(text,needle)=>{let n=0,from=0;while(needle&&((from=text.indexOf(needle,from))>=0)){n++;from+=needle.length;}return n;};

function readSource(sourcePath,relative){
  const rel=posix(relative);
  if(!rel||rel.split('/').includes('..'))throw new Error(`규칙 패치 경로 오류: ${relative}`);
  const file=path.join(sourcePath,rel);
  if(!fs.existsSync(file)||!fs.statSync(file).isFile())throw new Error(`규칙 패치 대상 없음: ${rel}`);
  return {rel,file,text:fs.readFileSync(file,'utf8')};
}

function insertViewport(sourcePath,patch){
  const {rel,text}=readSource(sourcePath,patch.path);
  if(/<meta\b[^>]*name\s*=\s*["']viewport["']/i.test(text))throw new Error('viewport가 이미 존재함');
  const match=text.match(/<head\b[^>]*>/i);
  if(!match)throw new Error('head 태그 없음');
  if(count(text,match[0])!==1)throw new Error('head 태그 exact edit가 유일하지 않음');
  const meta='<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">';
  return {
    summary:'모바일 viewport 메타를 결정론적으로 추가',
    expectedEffect:'모바일 화면 비율과 초기 확대 동작을 명시적으로 고정',
    tests:['viewport meta 1개 확인','기존 게임 로직/저장키 무변경'],
    edits:[{path:rel,find:match[0],replace:`${match[0]}\n  ${meta}`}],
    ruleId:'INSERT_VIEWPORT'
  };
}
function removeAdjacentDuplicateListener(sourcePath,patch){
  const {rel,text}=readSource(sourcePath,patch.path);
  const nl=text.includes('\r\n')?'\r\n':'\n';
  const previous=String(patch.previous??''),current=String(patch.current??'');
  if(!previous||!current||previous.trim()!==current.trim()||!/\.addEventListener\s*\(/.test(previous))throw new Error('중복 이벤트 규칙 근거 오류');
  const find=`${previous}${nl}${current}`;
  if(count(text,find)!==1)throw new Error('중복 이벤트 exact edit가 유일하지 않음');
  return {
    summary:'연속 중복 이벤트 리스너 1개를 결정론적으로 제거',
    expectedEffect:'동일 사용자 입력이 두 번 처리되는 위험 감소',
    tests:['동일 addEventListener 문장 연속 중복 제거 확인','기존 저장키 무변경'],
    edits:[{path:rel,find,replace:previous}],
    ruleId:'REMOVE_ADJACENT_DUPLICATE_EVENT_LISTENER'
  };
}

export function buildRuleCandidate(sourcePath,diagnostic){
  const patch=diagnostic?.autoPatch||diagnostic;
  const type=clean(patch?.type);
  if(type==='INSERT_VIEWPORT')return insertViewport(sourcePath,patch);
  if(type==='REMOVE_ADJACENT_DUPLICATE_EVENT_LISTENER')return removeAdjacentDuplicateListener(sourcePath,patch);
  throw new Error(`지원되지 않는 규칙 패치: ${type||'NONE'}`);
}

export const SAFE_RULE_PATCH_TYPES=Object.freeze(['INSERT_VIEWPORT','REMOVE_ADJACENT_DUPLICATE_EVENT_LISTENER']);
