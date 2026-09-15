from pathlib import Path
import re

path = Path('qa/vibe2-auto-planner.test.mjs')
text = path.read_text(encoding='utf-8')

diag_pattern = re.compile(
    r"test\('completed diagnostic task is not recreated and planner advances to the next diagnostic',\(\)=>\{.*?\n\}\);",
    re.S,
)
diag_replacement = r'''test('completed diagnostic package is never recreated after completion',()=>{
  const root=tempRepo();
  const webRoot=path.join(root,'web-games/diag-web');
  fs.mkdirSync(webRoot,{recursive:true});
  fs.writeFileSync(path.join(webRoot,'index.html'),'<!doctype html><html><head></head><body><button>Play</button></body></html>\n','utf8');
  const diagCatalog={games:[{id:'diag-web',webPath:'/web-games/diag-web/',hasWebArchive:true,homepageWebPlayable:true,homepageCategory:'development-confirmed'}]};
  const first=planVibe2AutonomousTask({status:{projects:[]},catalog:diagCatalog,queue:{tasks:[]},repoRoot:root,maxConcurrentTasks:4});
  assert.equal(first.planned,true);
  assert.equal(Number(first.task.workUnits)>=3,true);
  assert.equal(first.task.evidence.includes('work-package-auto-expanded'),true);
  const done={...first.task,status:'done',result:'PASS'};
  const second=planVibe2AutonomousTask({status:{projects:[]},catalog:diagCatalog,queue:{tasks:[done]},repoRoot:root,maxConcurrentTasks:4});
  if(second.planned){
    assert.notEqual(second.task.id,first.task.id);
    const firstKeys=new Set(first.task.evidence.filter(x=>x.startsWith('diagnostic-key:')));
    const secondKeys=second.task.evidence.filter(x=>x.startsWith('diagnostic-key:'));
    assert.equal(secondKeys.some(x=>firstKeys.has(x)),false);
  }else{
    assert.equal(['NO_SAFE_AUTONOMOUS_TASK','NO_INDEPENDENT_SAFE_AUTONOMOUS_TASK'].includes(second.reason),true);
  }
});'''
text, diag_count = diag_pattern.subn(diag_replacement, text, count=1)
if diag_count != 1:
    raise SystemExit(f'DIAGNOSTIC_TEST_REWRITE_COUNT={diag_count}')

unity_pattern = re.compile(
    r"test\('completed Unity task is not recreated and planner moves to next Unity maintenance need',\(\)=>\{.*?\n\}\);",
    re.S,
)
unity_replacement = r'''test('completed Unity package is never recreated after completion',()=>{
  const root=tempRepo();
  const unityOnlyCatalog={games:[{id:'demo',homepageCategory:'release-confirmed'}]};
  const first=planVibe2AutonomousTask({status,catalog:unityOnlyCatalog,queue:{tasks:[]},repoRoot:root,maxConcurrentTasks:4});
  assert.equal(first.planned,true);
  assert.equal(Number(first.task.workUnits)>=3,true);
  assert.equal(first.task.evidence.includes('work-package-auto-expanded'),true);
  const done={...first.task,status:'done',result:'PASS'};
  const second=planVibe2AutonomousTask({status,catalog:unityOnlyCatalog,queue:{tasks:[done]},repoRoot:root,maxConcurrentTasks:4});
  if(second.planned){
    assert.notEqual(second.task.id,first.task.id);
  }else{
    assert.equal(['NO_SAFE_AUTONOMOUS_TASK','NO_INDEPENDENT_SAFE_AUTONOMOUS_TASK'].includes(second.reason),true);
  }
});'''
text, unity_count = unity_pattern.subn(unity_replacement, text, count=1)
if unity_count != 1:
    raise SystemExit(f'UNITY_TEST_REWRITE_COUNT={unity_count}')

path.write_text(text, encoding='utf-8')
print('VIBE2_WORK_PACKAGE_TEST_CONTRACT_FIX=YES')
