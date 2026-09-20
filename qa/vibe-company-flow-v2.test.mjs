import assert from 'node:assert/strict';
import {
  classifyCompanyProposalApproval,
  createCompanyFlow,
  createCompanyProposal,
  createOwnerDevelopmentGate,
  DIRECTOR_MAJOR_CATEGORIES,
  OWNER_DECISION_CATEGORIES
} from '../assets/vibe-company-development-flow.js';

const pass=n=>console.log(`PASS ${n}`);

assert(DIRECTOR_MAJOR_CATEGORIES.includes('core-loop'));
assert(!OWNER_DECISION_CATEGORIES.includes('core-loop'));
assert(OWNER_DECISION_CATEGORIES.includes('final-public-release'));
pass('authority category split');

const major=createCompanyProposal({category:'core-loop',summary:'핵심루프 재설계',artbookLocked:true});
assert.equal(major.requiresOwnerApproval,false);
assert.equal(major.delegatedToDirector,true);
assert.equal(major.directorMajor,true);
assert.equal(classifyCompanyProposalApproval(major).approver,'director');
pass('game MAJOR delegated to JAY');

const release=createCompanyProposal({category:'final-public-release',summary:'최종 공개'});
assert.equal(release.requiresOwnerApproval,true);
assert.equal(classifyCompanyProposalApproval(release).approver,'owner');
pass('public release reserved for owner');

const flow=createCompanyFlow({gameId:'P0001'});
assert.equal(flow.proposalPolicy.gameMajorDelegatedToDirector,true);
assert.equal(flow.proposalPolicy.finalPublicReleaseRequiresOwnerApproval,true);
assert.equal(flow.vibe2Policy.stableAProtected,true);
assert.equal(flow.graphicsPolicy.motionEngine,'Jaewoon Motion Engine');
const playableDraft=flow.stages.find(stage=>stage.id==='playable-draft');
const graphicsUpgrade=flow.stages.find(stage=>stage.id==='graphics-upgrade');
assert.ok(playableDraft.outputs.includes('concept-visuals'));
assert.ok(playableDraft.outputs.includes('action-motion'));
assert.ok(playableDraft.outputs.includes('vfx-sfx-bgm'));
assert.ok(playableDraft.outputs.includes('mobile-ui-layout'));
assert.match(playableDraft.purpose,/Web.*액션 모션.*VFX\/SFX\/BGM.*모바일 UI/);
assert.match(graphicsUpgrade.purpose,/Web 개발판에서 이미 성립한/);
pass('company flow v4');

const review={ready:true,decision:'PASS'};
const jayGate=createOwnerDevelopmentGate({internalReview:review,directorDecision:'PASS'});
assert.equal(jayGate.approvedForFullDevelopment,true);
const ownerGate=createOwnerDevelopmentGate({internalReview:review,directorDecision:'PASS',ownerRequired:true,ownerDecision:'PENDING'});
assert.equal(ownerGate.approvedForFullDevelopment,false);
pass('compat gate honors owner only when reserved');
