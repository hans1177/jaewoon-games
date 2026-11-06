// 파일명: qa/vibe-agent-causality.mjs
// 역할: Vibe Agent의 동일 행동 결정론과 서로 다른 행동의 인과 ID 분리를 회귀 검증
// 규칙: 에이전트는 의도 후보만 만들며 실제 결과 권한은 엔진에 남긴다.
import {
  createVibeAgentState,
  decideVibeAgentAction,
  createVibeAgentResolutionRequest,
  resolveVibeAgentCandidate,
} from '../assets/vibe-orchestrator.js';

const assert = (condition, message) => {
  if (!condition) throw new Error(message);
};

const agent = createVibeAgentState({
  agentId: 'qa-agent',
  goals: [{ id: 'survive', type: 'survive', priority: 1, urgency: 1 }],
});

function resolve(opportunity) {
  const decision = decideVibeAgentAction(agent, { opportunities: [opportunity] });
  const request = createVibeAgentResolutionRequest(decision, { context: { scene: 'qa' } });
  return resolveVibeAgentCandidate(request, {
    accepted: true,
    outcome: { success: 1, benefit: 0.5, harm: 0 },
    timestamp: 12345,
    locationId: 'arena',
    system: 'agent',
  });
}

const first = resolve({ id: 'attack-a', type: 'attack', targetId: 'enemy-1', opportunity: 1 });
const repeat = resolve({ id: 'attack-a', type: 'attack', targetId: 'enemy-1', opportunity: 1 });
const differentId = resolve({ id: 'attack-b', type: 'attack', targetId: 'enemy-1', opportunity: 1 });
const differentType = resolve({ id: 'attack-a', type: 'retreat', targetId: 'enemy-1', opportunity: 1 });

assert(first.cause?.causeId, 'resolved action must have causality id');
assert(first.cause.causeId === repeat.cause.causeId, 'same action must produce deterministic causality id');
assert(first.cause.causeId !== differentId.cause.causeId, 'different action id must produce a different causality id');
assert(first.cause.causeId !== differentType.cause.causeId, 'different action type must produce a different causality id');
assert(first.authority === 'engine-resolved', 'resolved action must remain engine authoritative');

console.log('PASS agent causality determinism');
