// 파일명: qa/fantasy-survival-roblox-ui.test.mjs
// 마력숲 네이티브 UI 메뉴·오른쪽 버튼·자원바의 실제 Luau 변수 범위 회귀 검사.
// 이 검사는 정적 코드 검증이며 Studio/모바일 실행 증거를 대체하지 않는다.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const client=fs.readFileSync('roblox-games/fantasy-survival/client/Game.client.luau','utf8');

test('mobile menu and stamina handles stay visible outside the original do block',()=>{
  assert.match(client,/local meadowVitalsGui, meadowPages, meadowMenu, energyFill, energyLabel\s*\n\s*do/);
  for(const assignment of [
    'meadowPages={}',
    'meadowMenu=CommonUI.AdaptActionMenu(',
    'energyFill=Instance.new("Frame")',
    'energyLabel=Instance.new("TextLabel")'
  ])assert.ok(client.includes(assignment),assignment);
  for(const shadow of [
    'local meadowPages={}',
    'local meadowMenu=CommonUI.AdaptActionMenu(',
    'local energyFill=Instance.new("Frame")',
    'local energyLabel=Instance.new("TextLabel")'
  ])assert.ok(!client.includes(shadow),'out-of-scope shadow: '+shadow);
  const boundary=client.indexOf('\nend\n\n-- [첫 화면]');
  assert.ok(boundary>0);
  const after=client.slice(boundary);
  assert.ok(after.includes('editLayoutButton.Parent=meadowPages[4]'));
  assert.ok(after.includes('if info[1]=="MEADOW_INVENTORY" then meadowMenu.open(2)'));
  assert.ok(after.includes('energyFill.Size=UDim2.fromScale'));
  assert.ok(after.includes('energyLabel.Text=ready and string.format'));
});

test('touch dock retains authoritative original actions and server request path',()=>{
  assert.match(client,/button\.Activated:Connect\(function\(\)\s*if gui:GetAttribute\("GameMenuOpen"\)==true then return end\s*activateMeadowAction\(skillActionId\)/);
  assert.match(client,/remote:FireServer\(actionId\)/);
  assert.match(client,/meadowRadar\.Name="MeadowExplorerRadar"/);
  for(const action of ['meadow-unarmed-rush','skill-meadow-dodge-left',
    'skill-meadow-guard','skill-meadow-heal','skill-meadow-sprint']){
    assert.ok(client.includes('"'+action+'"'),action);
  }
});
