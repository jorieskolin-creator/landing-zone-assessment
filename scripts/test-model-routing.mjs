import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { authorizeConfiguredDestination, authorizeDestination } from '../lib/governance.js';
import {
  AI_ROLES,
  MODEL_ROUTING_LABEL,
  MODEL_ROUTING_POLICY_VERSION,
  MODEL_ROUTING_TEST_LABEL,
  MODEL_STAGES,
  STAGE_ROLES,
  ModelRoutingConfigurationError,
  authorizedProfiles,
  resolveModelRouting,
  settingsForProfile,
} from '../lib/modelRoutingPolicy.js';

const key = name => `${name}_API_KEY`;
const env = {
  [key('OPENAI')]: 'synthetic-openai',
  [key('ANTHROPIC')]: 'synthetic-anthropic',
  [key('XAI')]: 'synthetic-xai',
  REASONER_PROVIDER: 'OPENAI',
  REASONER_MODEL: 'gpt-5.6-sol',
  REASONER_FALLBACK_PROVIDER: 'XAI',
  REASONER_FALLBACK_MODEL: 'grok-4.6',
  WORKHORSE_PROVIDER: 'ANTHROPIC',
  WORKHORSE_MODEL: 'claude-sonnet-5',
  WORKHORSE_FALLBACK_PROVIDER: 'XAI',
  WORKHORSE_FALLBACK_MODEL: 'grok-4.6',
  QUALITY_CHECKER_PROVIDER: 'XAI',
  QUALITY_CHECKER_MODEL: 'grok-4.6',
  QUALITY_CHECKER_FALLBACK_PROVIDER: 'ANTHROPIC',
  QUALITY_CHECKER_FALLBACK_MODEL: 'claude-sonnet-5',
};

const config = resolveModelRouting(env);
assert.equal(config.policy_version, 'ai_role_routing_v6');
assert.equal(config.policy_version, MODEL_ROUTING_POLICY_VERSION);
assert.equal(config.schema_version, 'model_routing_config_v2');
assert.equal(config.mode, 'role_policy');
assert.equal(config.label, MODEL_ROUTING_LABEL);
assert.deepEqual(config.stage_roles, STAGE_ROLES);
assert.deepEqual(Object.keys(config.roles).sort(), [...AI_ROLES].sort());

for (const stage of MODEL_STAGES) {
  const role = STAGE_ROLES[stage];
  const chain = config.routes[stage];
  assert.ok(role, `${stage} must have exactly one role`);
  assert.equal(chain.length, 2, `${stage} must have primary and fallback`);
  assert.deepEqual(
    chain.map(candidate => `${candidate.provider}:${candidate.id}`),
    config.roles[role].profiles.map(candidate => `${candidate.provider}:${candidate.id}`),
    `${stage} must preserve its role provider/model route`,
  );
  assert.notDeepEqual(chain[0], chain[1], `${stage} primary and fallback must differ`);
  for (const candidate of chain) {
    authorizeDestination(stage, candidate.provider, candidate.id, settingsForProfile(candidate));
    assert.doesNotThrow(() => authorizeConfiguredDestination(
      stage, candidate.provider, candidate.id, settingsForProfile(candidate), env,
    ));
  }
}

assert.equal(STAGE_ROLES.evidence_adjudication, 'REASONER');
assert.equal(STAGE_ROLES.evidence_gap_analysis, 'WORKHORSE');
assert.equal(STAGE_ROLES.synthesis_escalation, 'REASONER');
assert.equal(STAGE_ROLES.roadmap_synthesis, 'REASONER');
assert.equal(STAGE_ROLES.forensic_audit, 'WORKHORSE');
assert.equal(STAGE_ROLES.targeted_rescan, 'WORKHORSE');
assert.equal(STAGE_ROLES.evidence_check, 'QUALITY_CHECKER');
assert.equal(STAGE_ROLES.fact_check, 'QUALITY_CHECKER');
assert.equal(STAGE_ROLES.fact_check_high, 'QUALITY_CHECKER');
assert.equal(STAGE_ROLES.quality_gate, 'WORKHORSE', 'the model only explains the deterministic gate');
assert.deepEqual(config.routes.synthesis.map(value => `${value.provider}:${value.id}`), [
  'anthropic:claude-sonnet-5',
  'xai:grok-4.6',
]);
assert.deepEqual(config.routes.evidence_adjudication.map(value => `${value.provider}:${value.id}`), [
  'openai:gpt-5.6-sol',
  'xai:grok-4.6',
]);
assert.deepEqual(config.routes.fact_check.map(value => `${value.provider}:${value.id}`), [
  'xai:grok-4.6',
  'anthropic:claude-sonnet-5',
]);
assert.equal(config.routes.evidence_adjudication[0].reasoningEffort, 'high');
assert.equal(config.routes.fact_check[0].reasoningEffort, 'low', 'xAI Quality Checker normal pass uses low reasoning');
assert.equal(config.routes.fact_check_high[0].reasoningEffort, 'medium', 'xAI escalated fact-check steps up to medium, never high');
assert.equal(config.routes.synthesis[0].maxTokens, 24576, 'Anthropic synthesis receives 24K completion budget');
assert.equal(config.routes.synthesis[1].maxTokens, 32768, 'xAI synthesis receives 32K reasoning-completion headroom');
assert.equal(config.routes.forensic_audit[0].maxTokens, 16384, 'other Anthropic Workhorse stages retain their role default');
assert.equal(config.routes.forensic_audit[1].maxTokens, 32768, 'Grok forensic_audit receives reasoning-completion headroom');
assert.equal(config.routes.quality_gate[0].maxTokens, 16384, 'Quality Gate explanation retains its bounded Workhorse budget');
assert.equal(config.roles.WORKHORSE.profiles[0].maxTokens, 16384, 'the role default remains bounded outside the stage override');
assert.throws(() => authorizeConfiguredDestination(
  'synthesis', 'anthropic', 'claude-sonnet-5', { max_tokens: 16384 }, env,
), /DESTINATION_NOT_CONFIGURED/, 'the old synthesis budget must fail closed after the policy change');

// Verify the production Landing Zone routing decisions:
// REASONER:        GOOGLE gemini-4-carbon -> OPENAI gpt-6.2-sol
// WORKHORSE:       GOOGLE gemini-4-carbon -> OPENAI gpt-6.1-terra
// QUALITY_CHECKER: OPENAI gpt-6.1-terra   -> XAI grok-4.7
const productionEnv = {
  TEST_MODE: 'false',
  [key('GEMINI')]: 'synthetic-gemini',
  [key('OPENAI')]: 'synthetic-openai',
  [key('XAI')]: 'synthetic-xai',
  REASONER_PROVIDER: 'GOOGLE',
  REASONER_MODEL: 'gemini-4-carbon',
  REASONER_FALLBACK_PROVIDER: 'OPENAI',
  REASONER_FALLBACK_MODEL: 'gpt-6.2-sol',
  WORKHORSE_PROVIDER: 'GOOGLE',
  WORKHORSE_MODEL: 'gemini-4-carbon',
  WORKHORSE_FALLBACK_PROVIDER: 'OPENAI',
  WORKHORSE_FALLBACK_MODEL: 'gpt-6.1-terra',
  QUALITY_CHECKER_PROVIDER: 'OPENAI',
  QUALITY_CHECKER_MODEL: 'gpt-6.1-terra',
  QUALITY_CHECKER_FALLBACK_PROVIDER: 'XAI',
  QUALITY_CHECKER_FALLBACK_MODEL: 'grok-4.7',
};
const productionConfig = resolveModelRouting(productionEnv);
assert.deepEqual(productionConfig.routes.roadmap_synthesis.map(v => `${v.provider}:${v.id}`), [
  'google:gemini-4-carbon',
  'openai:gpt-6.2-sol',
]);
assert.deepEqual(settingsForProfile(productionConfig.routes.roadmap_synthesis[0]), {
  max_tokens: 49152,
  reasoning_effort: 'high',
});
assert.deepEqual(settingsForProfile(productionConfig.routes.synthesis_escalation[0]), {
  max_tokens: 49152,
  reasoning_effort: 'high',
});
assert.deepEqual(settingsForProfile(productionConfig.routes.evidence_adjudication[0]), {
  max_tokens: 32768,
  reasoning_effort: 'high',
});
assert.deepEqual(settingsForProfile(productionConfig.routes.roadmap_synthesis[1]), {
  max_tokens: 32768,
  reasoning_effort: 'high',
});
assert.deepEqual(productionConfig.routes.forensic_audit.map(v => `${v.provider}:${v.id}`), [
  'google:gemini-4-carbon',
  'openai:gpt-6.1-terra',
]);
assert.deepEqual(settingsForProfile(productionConfig.routes.forensic_audit[0]), {
  max_tokens: 32768,
  reasoning_effort: 'medium',
});
assert.deepEqual(settingsForProfile(productionConfig.routes.forensic_audit[1]), {
  max_tokens: 32768,
  reasoning_effort: 'medium',
});
assert.deepEqual(settingsForProfile(productionConfig.routes.synthesis[0]), {
  max_tokens: 32768,
  reasoning_effort: 'medium',
});
assert.deepEqual(settingsForProfile(productionConfig.routes.evidence_gap_analysis[0]), {
  max_tokens: 16384,
  reasoning_effort: 'medium',
});
assert.deepEqual(productionConfig.routes.evidence_check.map(v => `${v.provider}:${v.id}`), [
  'openai:gpt-6.1-terra',
  'xai:grok-4.7',
]);
assert.deepEqual(settingsForProfile(productionConfig.routes.evidence_check[0]), {
  max_tokens: 32768,
  reasoning_effort: 'medium',
});
assert.deepEqual(settingsForProfile(productionConfig.routes.evidence_check[1]), {
  max_tokens: 32768,
  reasoning_effort: 'low',
});
assert.deepEqual(settingsForProfile(productionConfig.routes.fact_check[0]), {
  max_tokens: 32768,
  reasoning_effort: 'medium',
});
assert.deepEqual(settingsForProfile(productionConfig.routes.fact_check[1]), {
  max_tokens: 32768,
  reasoning_effort: 'low',
});
assert.deepEqual(settingsForProfile(productionConfig.routes.fact_check_high[0]), {
  max_tokens: 32768,
  reasoning_effort: 'high',
});
assert.deepEqual(settingsForProfile(productionConfig.routes.fact_check_high[1]), {
  max_tokens: 32768,
  reasoning_effort: 'medium',
});

for (const stage of MODEL_STAGES) {
  for (const candidate of productionConfig.routes[stage]) {
    assert.doesNotThrow(() => authorizeConfiguredDestination(
      stage, candidate.provider, candidate.id, settingsForProfile(candidate), productionEnv,
    ), `production route ${candidate.provider}:${candidate.id} must satisfy ${stage}`);
  }
}

assert.throws(() => authorizeConfiguredDestination(
  'fact_check', 'openai', 'gpt-5.6-sol', { max_tokens: 32768, reasoning_effort: 'medium' }, productionEnv,
), /DESTINATION_NOT_CONFIGURED/, 'an authorized but unconfigured OpenAI model must remain unavailable');

// Verify Gemini 4 Neon & Hydrogen and GPT 6 Astra / 5.4 remain authorized in catalog.
assert.ok(authorizedProfiles('forensic_audit', 'google', 'gemini-4-neon').length, 'Gemini 4 Neon must be authorized');
assert.ok(authorizedProfiles('forensic_audit', 'google', 'gemini-4-hydrogen').length, 'Gemini 4 Hydrogen must be authorized');
assert.ok(authorizedProfiles('fact_check', 'openai', 'gpt-5.4').length, 'GPT 5.4 must be authorized for QUALITY_CHECKER');
assert.ok(authorizedProfiles('roadmap_synthesis', 'openai', 'gpt-6-astra').length, 'GPT 6 Astra must be authorized for REASONER');

// Verify META is completely removed and fails closed everywhere.
assert.deepEqual(authorizedProfiles('fact_check', 'meta', 'muse-spark-1.1'), []);
assert.deepEqual(authorizedProfiles('fact_check', 'meta', 'muse-spark-1.3-contributor'), []);
assert.throws(() => authorizeDestination(
  'fact_check', 'meta', 'muse-spark-1.1', { max_tokens: 16384, reasoning_effort: 'medium' },
), /DESTINATION_NOT_AUTHORIZED/);

for (const invalid of [
  {},
  { ...env, REASONER_MODEL: '' },
  { ...env, REASONER_PROVIDER: 'OTHER' },
  { ...env, REASONER_PROVIDER: 'META', REASONER_MODEL: 'muse-spark-1.1' },
  { ...env, QUALITY_CHECKER_PROVIDER: 'META', QUALITY_CHECKER_MODEL: 'muse-spark-1.1' },
  { ...env, REASONER_MODEL: 'unapproved-model' },
  { ...env, REASONER_FALLBACK_PROVIDER: 'OPENAI', REASONER_FALLBACK_MODEL: 'gpt-5.6-sol' },
  { ...env, PRIMARY_MODEL_PROVIDER: 'OPENAI' },
  { ...env, [key('XAI')]: '' },
]) {
  assert.throws(() => resolveModelRouting(invalid), ModelRoutingConfigurationError);
}

const googleKeyAliasEnv = {
  ...productionEnv,
  [key('GEMINI')]: '',
  [key('GOOGLE')]: 'synthetic-google-alias',
};
assert.doesNotThrow(() => resolveModelRouting(googleKeyAliasEnv));

const testModeEnv = {
  TEST_MODE: 'true',
  [key('GEMINI')]: 'synthetic-gemini',
  [key('XAI')]: 'synthetic-xai',
  REASONER_PROVIDER: 'OTHER',
  REASONER_MODEL: 'unapproved-model',
  REASONER_FALLBACK_PROVIDER: 'OPENAI',
  REASONER_FALLBACK_MODEL: 'gpt-5.6-sol',
  WORKHORSE_PROVIDER: 'OPENAI',
  WORKHORSE_MODEL: 'gpt-6.1-terra',
  WORKHORSE_FALLBACK_PROVIDER: 'ANTHROPIC',
  WORKHORSE_FALLBACK_MODEL: 'claude-sonnet-5',
  QUALITY_CHECKER_PROVIDER: 'OPENAI',
  QUALITY_CHECKER_MODEL: 'gpt-5.4',
  QUALITY_CHECKER_FALLBACK_PROVIDER: 'ANTHROPIC',
  QUALITY_CHECKER_FALLBACK_MODEL: 'claude-sonnet-5',
};
const testModeConfig = resolveModelRouting(testModeEnv);
assert.equal(testModeConfig.label, MODEL_ROUTING_TEST_LABEL);
assert.deepEqual(testModeConfig.routes.forensic_audit.map(value => `${value.provider}:${value.id}`), [
  'google:gemini-3.8-flash',
  'xai:grok-4.6',
]);
assert.deepEqual(testModeConfig.routes.evidence_adjudication.map(value => `${value.provider}:${value.id}`), [
  'xai:grok-4.6',
  'google:gemini-3.8-flash',
]);
assert.deepEqual(testModeConfig.routes.fact_check.map(value => `${value.provider}:${value.id}`), [
  'google:gemini-3.8-flash',
  'xai:grok-4.6',
]);
assert.equal(testModeConfig.routes.forensic_audit[0].maxTokens, 32768);
assert.equal(testModeConfig.routes.evidence_check[0].id, 'gemini-3.8-flash');
assert.equal(testModeConfig.routes.evidence_check[0].provider, 'google');
assert.equal(testModeConfig.routes.evidence_check[0].maxTokens, 32768);
assert.equal(testModeConfig.routes.evidence_check[1].id, 'grok-4.6');
assert.equal(testModeConfig.routes.evidence_check[1].reasoningEffort, 'low');
assert.equal(testModeConfig.routes.fact_check[0].maxTokens, 32768);
assert.equal(testModeConfig.routes.fact_check[1].maxTokens, 32768);
assert.doesNotThrow(() => authorizeConfiguredDestination(
  'fact_check', 'google', 'gemini-3.8-flash', { max_tokens: 32768, reasoning_effort: 'medium' }, testModeEnv,
));
assert.doesNotThrow(() => authorizeConfiguredDestination(
  'fact_check', 'xai', 'grok-4.6', { max_tokens: 32768, reasoning_effort: 'low' }, testModeEnv,
));
assert.doesNotThrow(() => authorizeConfiguredDestination(
  'evidence_check', 'google', 'gemini-3.8-flash', { max_tokens: 32768, reasoning_effort: 'medium' }, testModeEnv,
));
assert.throws(() => authorizeConfiguredDestination(
  'evidence_check', 'google', 'gemini-3.8-flash', { max_tokens: 16384, reasoning_effort: 'medium' }, testModeEnv,
), /DESTINATION_NOT_CONFIGURED/, 'Gemini evidence_check must use the 32K completion budget');
assert.throws(() => authorizeConfiguredDestination(
  'evidence_adjudication', 'openai', 'gpt-6-astra', { max_tokens: 32768, reasoning_effort: 'high' }, testModeEnv,
), /DESTINATION_NOT_CONFIGURED/, 'TEST_MODE must ignore production role variables');

const testModeWithoutRoleVars = resolveModelRouting({
  TEST_MODE: 'true',
  [key('GEMINI')]: 'synthetic-gemini',
  [key('XAI')]: 'synthetic-xai',
});
assert.equal(testModeWithoutRoleVars.label, MODEL_ROUTING_TEST_LABEL);
assert.equal(testModeWithoutRoleVars.routes.fact_check[0].id, 'gemini-3.8-flash');
assert.equal(resolveModelRouting({ ...env, TEST_MODE: 'false' }).label, MODEL_ROUTING_LABEL);

assert.throws(() => resolveModelRouting({ ...testModeEnv, [key('XAI')]: '' }), ModelRoutingConfigurationError);
assert.throws(() => resolveModelRouting({ ...testModeEnv, [key('GEMINI')]: '' }), ModelRoutingConfigurationError);
assert.throws(() => resolveModelRouting({ ...env, TEST_MODE: 'TRUE' }), ModelRoutingConfigurationError);
assert.throws(() => resolveModelRouting({ ...env, TEST_MODE: '1' }), ModelRoutingConfigurationError);
assert.throws(() => resolveModelRouting({ ...env, TEST_MODE: '' }), ModelRoutingConfigurationError);

const modelContracts = await readFile(new URL('../src/models.ts', import.meta.url), 'utf8');
const router = await readFile(new URL('../src/services/modelRouter.ts', import.meta.url), 'utf8');
const analysis = await readFile(new URL('../src/services/analysisService.ts', import.meta.url), 'utf8');
const orchestrator = await readFile(new URL('../src/orchestrator.ts', import.meta.url), 'utf8');
const server = await readFile(new URL('../server.js', import.meta.url), 'utf8');
assert.doesNotMatch(modelContracts, /cheap_test|VITE_FINOPS_MODEL_MODE|URLSearchParams|'meta'|'META'/);
assert.match(router, /fetch\('\/api\/model-routing'/);
assert.match(router, /ROLE_INSTRUCTIONS/);
assert.match(router, /await getModelRoutingConfig\(\)/);
assert.match(router, /'google'|\"google\"/);
assert.doesNotMatch(router, /'meta'|\"meta\"/);
assert.doesNotMatch(analysis, /runStage\(['"]preflight['"]/);
assert.match(analysis, /sanitizeEvidenceSources\(sources\)/);
assert.ok(analysis.indexOf('sanitizeEvidenceSources(sources)') < analysis.indexOf('runPhase1Audit('));
assert.ok(analysis.indexOf('buildEvidenceLaneStagePackets({') < analysis.indexOf('runPhase1Audit('));
assert.match(orchestrator, /<KNOWLEDGE_CONTEXT source_role="GOVERNED_KNOWLEDGE">/);
assert.match(orchestrator, /<EVIDENCE_CONTEXT source_role="CUSTOMER_EVIDENCE">/);
assert.match(orchestrator, /assertEvidenceLaneStagePacket\(packet\)/);
assert.doesNotMatch(modelContracts, /\| 'preflight'/);
assert.match(analysis, /model_mode: modelRoutingMode/);
assert.match(analysis, /evidence_density < EVIDENCE_DENSITY_BLOCK[\s\S]*?'EVIDENCE_DENSITY_BELOW_FLOOR'[\s\S]*?reason_code: deterministicBlockReason/);
assert.match(server, /inspectServerBoot\(process\.env\)/);
assert.doesNotMatch(server, /STARTUP_FAILED code=MODEL_ROUTING_CONFIGURATION_INVALID/);

console.log('AI role routing policy tests passed');
