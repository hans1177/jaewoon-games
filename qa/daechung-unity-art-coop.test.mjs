// 파일명: daechung-unity-art-coop.test.mjs
// 역할: 기존 대충 RPG 저장·모바일 전투 회귀 및 Unity 아트/협동 전송 계약 검증.
// 범위: 소스·WebGL 브리지·아트 유효성 정적 테스트. 실제 2인 접속 PASS 근거가 아니다.

import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';

const root = path.resolve(import.meta.dirname, '..');
const unity = path.join(root, 'unity-games', 'daechung-rpg', 'Assets');
const read = (...parts) => fs.readFileSync(path.join(unity, ...parts), 'utf8');
const visuals = read('Scripts', 'PrototypeAnimatedVisuals.cs');
const gameplay = read('Scripts', 'RuntimeBootstrap.cs');
const networking = read('Scripts', 'MultiplayerSession.cs');
const core = read('Scripts', 'GameCore.cs');

test('원본 저장 키 및 서버 미검증 보상 정책을 그대로 보존한다', () => {
    assert.match(core, /daechung-rpg-save-v1/);
    assert.match(gameplay, /private void RewardEnemyDefeat\(EnemyDefinition defeated\)/);
    assert.match(gameplay, /_core\.Save\(\)/);
    assert.match(networking, /원격 이벤트는 표시 전용/);
    assert.doesNotMatch(networking, /currentHp\s*[-+]=|gold\s*\+=|experience\s*\+=/);
    assert.doesNotMatch(networking, /authoritativeSync\s*=\s*true/);
});

test('실제 제작 애니메이션 시트의 크기와 비어 있지 않은 픽셀을 검사한다', () => {
    const dir = path.join(unity, 'Art', 'Resources', 'DaechungArt');
    const actors = ['hero', 'green-slime', 'blue-slime', 'boar'];
    const actions = ['idle', 'walk', 'attack', 'hurt', 'death'];
    for (const actor of actors) {
        for (const action of actions) {
            const file = path.join(dir, actor + '-' + action + '.tga');
            const data = fs.readFileSync(file);
            assert.equal(data[2], 2, 'uncompressed TGA');
            assert.equal(data.readUInt16LE(12), 192);
            assert.equal(data.readUInt16LE(14), 56);
            assert.equal(data[16], 32);
            assert.equal(data.length, 18 + 192 * 56 * 4);
            let opaque = 0;
            for (let i = 21; i < data.length; i += 4) if (data[i] > 0) opaque++;
            assert.ok(opaque > 100, actor + ':' + action + ' empty art');
        }
    }
    assert.match(visuals, /Resources\.Load<Texture2D>\("DaechungArt\//);
    assert.match(visuals, /SetRegionVisual/);
    assert.match(visuals, /SetEnemyIdentity/);
    assert.match(visuals, /Shader\.Find\("Jaewoon\/DaechungPixelArt"\)/);
});

test('2.5D 카메라·실제 공간 지형·지역별 깊이 표현과 WebGL 성능 게이트를 유지한다', () => {
    assert.match(visuals, /camera\.orthographic\s*=\s*false/);
    assert.match(visuals, /camera\.transform\.LookAt/);
    assert.match(visuals, /_sceneCamera\.fieldOfView = Mathf\.Clamp/);
    assert.match(visuals, /_lastCameraAspect = _sceneCamera\.aspect/);
    assert.match(visuals, /new GameObject\("DaechungDepthGround"\)/);
    assert.match(visuals, /new GameObject\("DaechungDepthPath"\)/);
    assert.match(visuals, /AddComponent<MeshFilter>\(\)/);
    assert.match(visuals, /new Vector3\(-24f, -1\.85f, 8f\)/);
    assert.match(visuals, /new Vector3\(-24f, -1\.85f, -8f\)/);
    assert.match(visuals, /_depthGround\.sharedMaterial\.color/);
    assert.match(visuals, /QualitySettings\.SetQualityLevel\(0, true\)/);
    assert.match(visuals, /Resources\.Load<Texture2D>\("DaechungArt\/hero-idle"\) != null/);
    const validator = fs.readFileSync(path.join(root,
        'tools', 'company-unity-web-gameplay-validation.mjs'), 'utf8');
    assert.match(validator, /framePacing\.medianFrameMs>38\|\|framePacing\.p95FrameMs>100/);
});

test('WebGL 브리지가 서버 이벤트를 Unity 본체에 전달하고 재접속용 소켓을 바꾼다', () => {
    const source = read('Plugins', 'WebGL', 'DaechungSocket.jslib');
    const events = [];
    const sockets = [];
    class FakeWebSocket {
        constructor(url) { this.url = url; this.readyState = 0; this.sent = []; sockets.push(this); }
        send(data) { this.sent.push(data); }
        close() { this.readyState = 3; if (this.onclose) this.onclose(); }
    }
    FakeWebSocket.OPEN = 1;
    const sandbox = {
        LibraryManager: { library: {} },
        mergeInto: (target, addition) => Object.assign(target, addition),
        UTF8ToString: text => text,
        Module: {},
        WebSocket: FakeWebSocket,
        SendMessage: (...args) => events.push(args)
    };
    vm.runInNewContext(source, sandbox);
    const functions = sandbox.LibraryManager.library;
    functions.DaechungWsOpen('wss://example.test/room/123', 'RuntimeBootstrap');
    assert.equal(sockets.length, 1);
    assert.equal(sockets[0].url, 'wss://example.test/room/123');
    sockets[0].readyState = 1;
    sockets[0].onopen();
    sockets[0].onmessage({data:'{"type":"connected","userId":"test"}'});
    functions.DaechungWsSend('RuntimeBootstrap', '{"type":"state"}');
    assert.deepEqual(sockets[0].sent, ['{"type":"state"}']);
    assert.equal(events.at(-1)[1], 'OnMultiplayerSocket');
    assert.match(events.at(-1)[2], /connected/);
    functions.DaechungWsOpen('wss://example.test/room/123', 'RuntimeBootstrap');
    assert.equal(sockets.length, 2);
    assert.equal(sockets[0].readyState, 3);
    functions.DaechungWsClose('RuntimeBootstrap');
    assert.equal(sockets[1].readyState, 3);
    assert.match(networking, /private void SendState\(\)/);
    assert.match(gameplay, /SetCoopParty/);
    assert.match(gameplay, /PlayCoopAction/);
});

test('기존 모바일 전투 버튼과 비정식 공개 테스트 빌드 요청을 보존한다', () => {
    assert.match(gameplay, /private void DrawPrimaryCombatActionButton\(\)/);
    assert.match(gameplay, /MOBILE_TARGET game=daechung-rpg role=action/);
    assert.match(gameplay, /MOBILE_INPUT game=daechung-rpg role=action status=PASS/);
    const buildRequest = JSON.parse(fs.readFileSync(path.join(root,
        '.build-requests', 'unity-web', 'daechung-rpg.json'), 'utf8'));
    assert.equal(buildRequest.sourceCommit, '');
    assert.equal(buildRequest.buildMethod, 'JaewoonGames.DaechungRpg.Editor.AndroidTestBuild.BuildWeb');
    assert.match(buildRequest.purpose, /PUBLIC_BROWSER_TEST/);
});
