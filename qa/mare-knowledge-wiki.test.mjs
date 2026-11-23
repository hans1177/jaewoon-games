import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const root = 'roblox-games/mare-essentia/src/ReplicatedStorage/Shared';
const read = (f) => fs.readFileSync(path.join(root, f), 'utf8');

test('백과 위키식 해설은 기존 지식카드 id·Articles 주제와 일치하고 비어 있지 않다', () => {
  const wiki = read('KnowledgeWiki.luau');
  const cards = read('KnowledgeCards.luau');
  const ids = [...wiki.matchAll(/\n\t(\w+) = \{\n\t\ttopic = "(\w+)"/g)];
  assert.ok(ids.length >= 5, '시험 5장 이상');
  for (const [, id, topic] of ids) {
    assert.ok(cards.includes(`\t${id} = { topic = "${topic}"`), `Articles 주제 불일치: ${id}`);
    assert.ok(new RegExp(`\\n\\t${id} = \\{[\\s\\S]*?summary = "[^"]{10,}"`).test(wiki), `요약 누락: ${id}`);
  }
  const bodies = [...wiki.matchAll(/body = "([^"]+)"/g)].map((m) => m[1]);
  assert.ok(bodies.length >= ids.length * 3, '카드당 섹션 3개 이상');
  assert.ok(bodies.every((b) => b.length >= 60), '섹션 본문은 충분히 길어야 함');
  assert.ok(wiki.includes('CC BY-SA'), '출처 라이선스 표기');
});

test('카드 상세는 위키 해설·접는 섹션·세로 7:10 원화 틀을 쓴다', () => {
  const client = fs.readFileSync('roblox-games/mare-essentia/src/StarterPlayer/Game.client.luau', 'utf8');
  assert.match(client, /KnowledgeWiki"\)\)\.Wiki\[card\.id\]/);
  assert.match(client, /UDim2\.fromOffset\(math\.floor\(artH \* 0\.7\), artH\)/, '원화 틀 7:10');
  assert.match(client, /\(if txt\.Visible then "▾ " else "▸ "\)/, '접는 섹션');
  assert.match(client, /CC BY-SA 4\.0/);
});

test('읽기 퀴즈는 서버가 판정하고 보상은 카드당 한 번이다', () => {
  const wiki = read('KnowledgeWiki.luau');
  const codex = fs.readFileSync('roblox-games/mare-essentia/src/ServerScriptService/Services/Codex.luau', 'utf8');
  const state = fs.readFileSync('roblox-games/mare-essentia/src/ServerScriptService/Services/State.luau', 'utf8');
  const client = fs.readFileSync('roblox-games/mare-essentia/src/StarterPlayer/Game.client.luau', 'utf8');
  const entries = [...wiki.matchAll(/\n\t(\w+) = \{\n\t\ttopic = /g)].length;
  const questions = [...wiki.matchAll(/answer = (\d+) \}/g)];
  assert.equal(questions.length, entries * 3, '카드당 3문제');
  for (const m of wiki.matchAll(/options = \{([^}]*)\}, answer = (\d+)/g)) {
    const n = m[1].split('", "').length;
    assert.ok(Number(m[2]) >= 1 && Number(m[2]) <= n, '정답 번호가 보기 범위 안');
  }
  assert.match(wiki, /QUIZ_REWARD = \{ coins = 30, fame = 1 \}/);
  assert.match(codex, /function handlers\.WikiQuiz\(state: any, p: any\)/);
  assert.match(codex, /D\.Cards\.GradeQuiz\(state, p\)/);
  assert.match(wiki, /if state\.wikiQuiz\[id\] then/, '중복 보상 차단');
  assert.match(wiki, /not state\.discovered\[id\]/, '미발견 카드 차단');
  assert.match(state, /\(s :: any\)\.wikiQuiz = quizDone/);
  assert.match(state, /wikiQuiz = \(state :: any\)\.wikiQuiz/);
  assert.match(client, /call\("WikiQuiz"/);
});
