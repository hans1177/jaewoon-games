import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const config=fs.readFileSync('roblox-games/horror-escape-room/shared/GameConfig.luau','utf8');
const server=fs.readFileSync('roblox-games/horror-escape-room/server/Game.server.luau','utf8');
const client=fs.readFileSync('roblox-games/horror-escape-room/client/Game.client.luau','utf8');
const launch=JSON.parse(fs.readFileSync('roblox-games/horror-escape-room/launch-mvp.json','utf8'));

test('8명 4대4 시작과 AI 채움',()=>{
 assert.match(config,/TargetPopulation=8/);assert.match(config,/SurvivorSlots=4/);assert.match(config,/MonsterSlots=4/);
 assert.match(server,/local function selectStartingMonsters\(h\)/);
 assert.match(server,/monsterNeed=math\.max/);assert.match(server,/humanNeed=math\.max/);
 for(const gate of ['8-player logical population','4-human 4-monster opening composition','AI fills every missing team slot'])assert.ok(launch.releaseGates.includes(gate),gate);
});

test('인간 감염과 양 진영 0명 승리조건',()=>{
 assert.match(server,/local function infectPlayer\(p\)/);assert.match(server,/local function infectBot\(b\)/);
 assert.match(server,/setRole\(p,"MONSTER"\)/);assert.match(server,/FeedbackEvent","INFECT:/);
 assert.match(server,/if humans==0 then endRound\("MONSTER"\)/);assert.match(server,/if monsters==0 then endRound\("SURVIVOR"\)/);
 assert.match(server,/endRound\("DRAW"\)/);
});

test('HumanForms는 도구 패시브 감염능력으로 확장된다',()=>{
 assert.match(config,/HumanForms=/);
 for(const id of ['BROADCAST','ELECTRICIAN','COURIER','PHOTOGRAPHER','SECURITY'])assert.ok(config.includes('Id="'+id+'"'));
 for(const key of ['Tool=','Passive=','InfectedAbility='])assert.ok(config.includes(key));
 assert.match(server,/local function humanForm\(p\)/);assert.match(server,/local function nextHuman\(p\)/);
 assert.ok(client.includes('인간 변경'));assert.ok(launch.releaseGates.includes('expandable human-form roster'));
});

test('인간 정화공격은 몬스터를 제거한다',()=>{
 assert.match(config,/PurifyDistance=8/);assert.match(config,/PurifyCooldown=5/);
 assert.match(server,/local function purify\(p\)/);assert.match(server,/local function eliminateMonsterPlayer/);assert.match(server,/local function removeBot/);
 assert.ok(client.includes('정화 공격'));assert.match(client,/C\.Actions\.PURIFY/);
});

test('감염전 HUD는 현재 진영 인원을 표시한다',()=>{
 for(const marker of ['8인 감염전 · 인간 4 VS 몬스터 4','정화 공격','몬스터 변경','인간 변경','감염 완료'])assert.ok(client.includes(marker),marker);
 assert.match(client,/인간 %d : 몬스터 %d/);
 assert.match(client,/rescueButton\.Visible=running and role=="SURVIVOR"/);assert.match(client,/abilityButton\.Visible=running and role=="MONSTER"/);
});

test('세 맵 이벤트 오디오 보안은 유지된다',()=>{
 for(const id of ['SCHOOL','HOSPITAL','THEME_PARK'])assert.ok(config.includes('Id="'+id+'"'));
 for(const marker of ['ClassDesk','HospitalBed','CarouselRotor'])assert.ok(server.includes(marker));
 assert.match(server,/workspace:SetAttribute\("CurrentMapEventName"/);assert.match(client,/local function nearestMonsterDistance\(\)/);assert.match(client,/chase:Play\(\)/);
 assert.match(server,/allowedActions\[a\]~=true then return false/);assert.match(server,/horizontal<=C\.MaxHorizontalVelocity/);assert.match(server,/Magnitude<=C\.MaxTeleportStep/);
 for(const gate of ['3-map round rotation','remote action allowlist and spam rejection','teleport/speed/out-of-bounds abuse rejection','save/rejoin'])assert.ok(launch.releaseGates.includes(gate),gate);
});

test('한글 영문 유입 메타데이터',()=>{
 assert.equal(launch.gameTitleKo,'심야 감염전 [4대4]');
 assert.equal(launch.gameTitleEn,'Midnight Infection [4v4]');
 assert.ok(launch.gameDescriptionKo.includes('감염전'));assert.ok(launch.gameDescriptionEn.includes('infection'));
});
