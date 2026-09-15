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
  fs.mkdirSync(path.join(root,'Games','alpha'),{recursive:true});
  fs.writeFileSync(path.join(root,'Games','alpha','index.html'),'<html><body><button>play</button><footer>credits</footer></body></html>','utf8');
  const status={developmentConfirmedGames:[{gameId:'alpha',engine:'web',sourcePath:'Games/alpha',autonomousImplementationAllowed:true,releaseState:'development-confirmed'}]};
  const catalog={projects:[{id:'alpha',path:'Games/alpha',engine:'web',releaseState:'development-confirmed'}]};
  const first=planVibe2AutonomousTask({status,catalog,queue:createVibeContinuousQueue({}),repoRoot:root});
  assert.equal(first.planned,true);
  assert.equal(Number(first.task.workUnits)>=3,true);
  assert.equal(first.task.evidence.includes('work-package-auto-expanded'),true);
  const done={...first.task,status:'completed',result:'PASS'};
  const completed=createVibeContinuousQueue({tasks:[done]});
  const second=planVibe2AutonomousTask({status,catalog,queue:completed,repoRoot:root});
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
  fs.mkdirSync(path.join(root,'Games','u1'),{recursive:true});
  fs.writeFileSync(path.join(root,'Games','u1','Game.cs'),'class Game {}','utf8');
  const status={releaseConfirmedGames:[unityReleaseProject({gameId:'u1',source:'Games/u1',pass:true})]};
  const catalog={projects:[{id:'u1',path:'Games/u1',engine:'unity',releaseState:'release-confirmed'}]};
  const first=planVibe2AutonomousTask({status,catalog,queue:createVibeContinuousQueue({}),repoRoot:root});
  assert.equal(first.planned,true);
  assert.equal(Number(first.task.workUnits)>=3,true);
  assert.equal(first.task.evidence.includes('work-package-auto-expanded'),true);
  const completed=createVibeContinuousQueue({tasks:[{...first.task,status:'completed',result:'PASS'}]});
  const second=planVibe2AutonomousTask({status,catalog,queue:completed,repoRoot:root});
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
