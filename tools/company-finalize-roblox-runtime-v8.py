from pathlib import Path
import re

parent_path = Path('.github/workflows/company-development-roblox-runtime.yml')
cont_path = Path('.github/workflows/company-development-roblox-runtime-continuation.yml')
parent_test_path = Path('qa/company-development-roblox-runtime.test.mjs')
cont_test_path = Path('qa/company-development-roblox-runtime-continuation.test.mjs')
persist_helper_path = Path('tools/company-development-roblox-runtime-persist.mjs')

parent = parent_path.read_text(encoding='utf-8')
cont = cont_path.read_text(encoding='utf-8')
parent_test = parent_test_path.read_text(encoding='utf-8')
cont_test = cont_test_path.read_text(encoding='utf-8')


def replace_one(text: str, old: str, new: str, label: str) -> str:
    count = text.count(old)
    if count != 1:
        raise SystemExit(f'{label}: expected exactly one match, got {count}')
    return text.replace(old, new, 1)


# Harness v8 invalidates the old v7 false-positive checkpoint semantics.
parent = replace_one(
    parent,
    "ROBLOX_RUNTIME_HARNESS_VERSION: '7'",
    "ROBLOX_RUNTIME_HARNESS_VERSION: '8'",
    'parent harness',
)
cont = replace_one(
    cont,
    "ROBLOX_RUNTIME_HARNESS_VERSION: '7'",
    "ROBLOX_RUNTIME_HARNESS_VERSION: '8'",
    'continuation harness',
)
parent_test = replace_one(
    parent_test,
    "ROBLOX_RUNTIME_HARNESS_VERSION: '7'",
    "ROBLOX_RUNTIME_HARNESS_VERSION: '8'",
    'parent test harness',
)
cont_test = replace_one(
    cont_test,
    "ROBLOX_RUNTIME_HARNESS_VERSION: '7'",
    "ROBLOX_RUNTIME_HARNESS_VERSION: '8'",
    'continuation test harness',
)
parent_test = parent_test.replace(
    'wakes harness v7 continuation',
    'wakes harness v8 continuation',
)

# The parent must wake a continuation when a recorded PASS came from a stale harness.
parent = replace_one(
    parent,
    "}else if(item.robloxBuildPreflightPassed===true&&item.robloxRuntimePassed!==true){",
    "}else if(item.robloxBuildPreflightPassed===true&&(item.robloxRuntimePassed!==true||String(item.robloxRuntimeHarnessVersion||'')!==harnessVersion)){",
    'parent stale-harness readiness',
)

# The continuation must actually select old PASS checkpoints for revalidation.
cont = replace_one(
    cont,
    "if(item.robloxBuildPreflightPassed!==true||item.robloxRuntimePassed===true||(item.robloxRuntimeFailedAt&&!retryableInstallFailure&&!retryableRuntimeFailure&&!retryableMissingEvidence&&!retryableAuthMigration))continue;",
    "if(item.robloxBuildPreflightPassed!==true||(item.robloxRuntimePassed===true&&sameHarness)||(item.robloxRuntimeFailedAt&&!retryableInstallFailure&&!retryableRuntimeFailure&&!retryableMissingEvidence&&!retryableAuthMigration))continue;",
    'continuation stale pass selection',
)
cont = replace_one(
    cont,
    "const runtimePending=exact&&item.robloxBuildPreflightPassed===true&&item.robloxRuntimePassed!==true&&(!item.robloxRuntimeFailedAt||retryableInstallFailure||retryableRuntimeFailure||retryableMissingEvidence||retryableAuthMigration);",
    "const runtimePending=exact&&item.robloxBuildPreflightPassed===true&&(item.robloxRuntimePassed!==true||!sameHarness)&&(!item.robloxRuntimeFailedAt||retryableInstallFailure||retryableRuntimeFailure||retryableMissingEvidence||retryableAuthMigration);",
    'continuation remaining stale pass',
)

# Fail closed: source echo must never satisfy runtime success. Require an exact
# multiplayer round-trip result plus exact sentinel lines emitted by execution.
cont = replace_one(
    cont,
    "if ($combined -notmatch 'ROBLOX_RUNTIME_SMOKE=PASS') { throw 'Runtime PASS sentinel missing' }\n          if ($combined -notmatch 'ROBLOX_SERVER_CLIENT_BOUNDARY_PASS=YES') { throw 'Server/client boundary sentinel missing' }",
    "if ($combined -notmatch '(?m)^ROBLOX_RUNTIME_RESULT=PASS:PLAYER_CHARACTER_CLIENT_SERVER_ROUNDTRIP\\r?$') { throw 'Runtime roundtrip PASS result missing' }\n          if ($combined -notmatch '(?m)^ROBLOX_RUNTIME_SMOKE=PASS\\r?$') { throw 'Runtime PASS sentinel missing' }\n          if ($combined -notmatch '(?m)^ROBLOX_SERVER_CLIENT_BOUNDARY_PASS=YES\\r?$') { throw 'Server/client boundary sentinel missing' }",
    'anchored runtime evidence',
)

# Persist through a helper that recursively consumes merged artifact layouts and
# binds evidence to the exact requested harness version.
persist_pattern = re.compile(
    r"(      - name: Persist exact actual-runtime state\n"
    r"        if: needs\.runtime-plan\.outputs\.count != '0'\n"
    r"        env:\n"
    r"          EXPECTED_TARGETS_JSON: \$\{\{ needs\.runtime-plan\.outputs\.targets_json \}\}\n"
    r"        shell: bash\n"
    r"        run: \|\n).*?"
    r"(?=      - name: Dispatch next continuation slice when eligible work remains)",
    re.S,
)
match = persist_pattern.search(cont)
if not match:
    raise SystemExit('runtime persist block not found')

persist_body = """          set -euo pipefail
          git config user.name 'jaewoon-roblox-runtime'
          git config user.email 'actions@users.noreply.github.com'
          persisted=0
          for attempt in 1 2 3 4 5; do
            git fetch --no-tags origin \"$COMPANY_RUNTIME_BRANCH\"
            git reset --hard \"origin/$COMPANY_RUNTIME_BRANCH\"
            node tools/company-development-roblox-runtime-persist.mjs development-queue.json /tmp/roblox-runtime-batch
            git add development-queue.json
            git diff --cached --check
            if git diff --cached --quiet; then
              persisted=1
              break
            fi
            git commit -m 'runtime: persist actual Roblox Studio checkpoint [skip ci]'
            if git push origin HEAD:\"$COMPANY_RUNTIME_BRANCH\"; then
              persisted=1
              break
            fi
            echo \"ROBLOX_RUNTIME_PERSIST_RETRY=$attempt\"
            sleep $((attempt*2))
          done
          if [[ \"$persisted\" != '1' ]]; then
            echo 'ROBLOX_RUNTIME_PERSIST=FAIL'
            exit 1
          fi
          echo 'ROBLOX_RUNTIME_PERSIST=PASS'
"""
cont = cont[:match.start()] + match.group(1) + persist_body + cont[match.end():]

cont = replace_one(
    cont,
    "          node --check tools/vibe3-roblox-platform.mjs\n",
    "          node --check tools/vibe3-roblox-platform.mjs\n          node --check tools/company-development-roblox-runtime-persist.mjs\n",
    'persist helper contract check',
)

new_test_assertions = """  assert.ok(smoke.includes('ROBLOX_SERVER_CLIENT_BOUNDARY_PASS" .. "=YES'));
  assert.ok(smoke.includes('PASS:PLAYER_CHARACTER_CLIENT_SERVER_ROUNDTRIP'));
  assert.ok(!smoke.includes('print("ROBLOX_RUNTIME_SMOKE=PASS")'));
  assert.ok(workflow.includes("(item.robloxRuntimePassed===true&&sameHarness)"));
  assert.ok(workflow.includes("(item.robloxRuntimePassed!==true||!sameHarness)"));
  assert.ok(workflow.includes('company-development-roblox-runtime-persist.mjs'));"""
cont_test = replace_one(
    cont_test,
    "  assert.ok(smoke.includes('ROBLOX_SERVER_CLIENT_BOUNDARY_PASS=YES'));",
    new_test_assertions,
    'smoke fail-closed test',
)

persist_helper_path.write_text(r'''import fs from 'node:fs';
import path from 'node:path';

const queuePath=process.argv[2]||'development-queue.json';
const root=process.argv[3]||'/tmp/roblox-runtime-batch';
const expected=JSON.parse(process.env.EXPECTED_TARGETS_JSON||'[]');
const queue=JSON.parse(fs.readFileSync(queuePath,'utf8').replace(/^\uFEFF/,''));
const resultFiles=[];
const walk=dir=>{
  for(const entry of fs.readdirSync(dir,{withFileTypes:true})){
    const full=path.join(dir,entry.name);
    if(entry.isDirectory()) walk(full);
    else if(entry.isFile()&&entry.name.endsWith('.runtime.json')) resultFiles.push(full);
  }
};
if(fs.existsSync(root)) walk(root);
const results=resultFiles.sort().map(file=>JSON.parse(fs.readFileSync(file,'utf8').replace(/^\uFEFF/,'')));
console.log(`ROBLOX_RUNTIME_CHECKPOINT_FILES=${resultFiles.length}`);
const byId=new Map(results.map(x=>[x.gameId,x]));
const stamp=new Date().toISOString();
let pass=0,fail=0;
for(const target of expected){
  const item=(queue.items||[]).find(x=>x.gameId===target.gameId);
  if(!item) throw new Error(`queue item missing: ${target.gameId}`);
  const r=byId.get(target.gameId);
  const exact=r?.sourceRevision===item.robloxSourceCommit&&r?.artifactIdentity===item.robloxBuildArtifactIdentity;
  const expectedHarness=String(target.runtimeHarnessVersion||'');
  const resultHarness=String(r?.runtimeHarnessVersion||'');
  const harnessExact=Boolean(expectedHarness)&&resultHarness===expectedHarness;
  if(r?.runtimePassed===true&&r?.actualStudioRuntime===true&&r?.serverClientBoundaryPassed===true&&exact&&harnessExact){
    Object.assign(item,{
      robloxRuntimePassed:true,robloxRuntimePassedAt:stamp,robloxRuntimeFailedAt:null,robloxRuntimeEvidence:r,
      robloxRuntimeRetryCount:0,robloxRuntimeHarnessVersion:resultHarness,robloxServerClientBoundaryPassed:true,
      robloxDatastoreRejoinPassed:r.datastoreRejoinPassed===true,robloxMobileControlUiPassed:r.mobileControlUiPassed===true,
      robloxIndependentQaPassed:false,robloxIndependentQaPassedAt:null,robloxRegressionPassed:false,robloxRegressionPassedAt:null,
      robloxFinalReviewPassed:false,robloxFinalReviewPassedAt:null,robloxPostRuntimeQaEvidence:null,
      robloxLastSuccessfulStage:'TARGET_PLATFORM_RUNTIME',robloxFailureStage:'INDEPENDENT_QA',
      robloxFailureSignature:'ROBLOX_INDEPENDENT_QA_PENDING',routingBlockers:['roblox-independent-qa-pending'],updatedAt:stamp,
    });
    pass++;
  }else{
    const failure=r?.failure||(!harnessExact?'ROBLOX_RUNTIME_HARNESS_MISMATCH':'ROBLOX_RUNTIME_RESULT_MISSING');
    const retryableFailure=['roblox-studio-install-failed','roblox-studio-runtime-failed','roblox-studio-runtime-timeout','ROBLOX_RUNTIME_RESULT_MISSING'].includes(failure);
    const sameHarness=String(item.robloxRuntimeHarnessVersion||'')===resultHarness;
    const baseRetryCount=sameHarness?Number(item.robloxRuntimeRetryCount||0):0;
    const retryCount=retryableFailure?baseRetryCount+1:0;
    Object.assign(item,{
      robloxRuntimePassed:false,robloxRuntimeFailedAt:stamp,robloxRuntimeEvidence:r||null,robloxRuntimeRetryCount:retryCount,
      robloxRuntimeHarnessVersion:resultHarness||expectedHarness,robloxServerClientBoundaryPassed:false,
      robloxIndependentQaPassed:false,robloxIndependentQaPassedAt:null,robloxRegressionPassed:false,robloxRegressionPassedAt:null,
      robloxFinalReviewPassed:false,robloxFinalReviewPassedAt:null,robloxPostRuntimeQaEvidence:null,
      robloxFailureStage:'TARGET_PLATFORM_RUNTIME',robloxFailureSignature:failure,
      routingBlockers:[`roblox-runtime:${failure}`],updatedAt:stamp,
    });
    fail++;
  }
}
queue.updatedAt=stamp;
fs.writeFileSync(queuePath,JSON.stringify(queue,null,2)+'\n');
console.log(`ROBLOX_ACTUAL_RUNTIME_PASS_COUNT=${pass}`);
console.log(`ROBLOX_ACTUAL_RUNTIME_FAIL_COUNT=${fail}`);
console.log('ROBLOX_OTHER_GAME_PROMOTION_BLOCKED=NO');
console.log('ROBLOX_INDEPENDENT_QA_PASS=NO');
console.log('ROBLOX_RELEASE_CLAIM=NO');
''', encoding='utf-8')

parent_path.write_text(parent, encoding='utf-8')
cont_path.write_text(cont, encoding='utf-8')
parent_test_path.write_text(parent_test, encoding='utf-8')
cont_test_path.write_text(cont_test, encoding='utf-8')

print('ROBLOX_RUNTIME_V8_MIGRATION_PATCH=PASS')
