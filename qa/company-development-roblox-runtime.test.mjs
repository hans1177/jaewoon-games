

test('Roblox compiler is admitted by native platform design and does not consume Web handoff',()=>{
  const compiled=compileRobloxSource({gameId:'demo',gameName:'Demo',baseline,artbook:{},webHandoff:{stage:'INVALID_WEB_STAGE'}});
  assert.equal(compiled.validation.pass,true);
  assert.equal(compiled.webHandoff,null);
  assert.ok(compiled.result.sharedConfig.includes('DesignBaseline = {'));
  assert.ok(compiled.result.sharedConfig.includes('PlatformProfile = {'));
  assert.ok(compiled.result.sharedConfig.includes('AdmissionGate = "MINIMUM_DUAL_PLATFORM_DESIGN_READY"'));
});

test('central development orchestrator dispatches both native lanes without Web presentation gate',()=>{
  const workflow=fs.readFileSync(new URL('../.github/workflows/company-development-confirmed-runtime.yml',import.meta.url),'utf8');
  assert.match(workflow,/company-development-roblox-runtime\.yml/);
  assert.match(workflow,/company-development-unity-runtime\.yml/);
  assert.match(workflow,/UNITY_WEB_RUNTIME_DISPATCH=NO/);
  assert.doesNotMatch(workflow,/WEB_PRESENTATION_HANDOFF_REJECTED/);
});

test('owner-focused concurrent Roblox lane carries exact merged source revision into package without replacing canonical Unity',()=>{
  const workflow=fs.readFileSync(new URL('../.github/workflows/company-development-roblox-runtime.yml',import.meta.url),'utf8');
  assert.match(workflow,/merge_sha="\$\(gh pr view "\$pr_url".*\.mergeCommit\.oid/s);
  assert.match(workflow,/source_revision=\$merge_sha/);
  assert.match(workflow,/sourceRevision:\/\^\[0-9a-f\]\{40\}\$\/i/);
  assert.match(workflow,/ownerFocusRobloxSourceCommit:result\.sourceRevision/);