export const MODEL_ROUTING_SCHEMA_VERSION = 'model_routing_config_v2';
export const MODEL_ROUTING_POLICY_VERSION = 'ai_role_routing_v5';
export const MODEL_ROUTING_LABEL = 'ai_role_policy';
export const MODEL_ROUTING_TEST_LABEL = 'ai_test_mode';

export const AI_ROLES = Object.freeze([
  'REASONER',
  'WORKHORSE',
  'QUALITY_CHECKER',
]);

export const MODEL_STAGES = Object.freeze([
  'forensic_audit',
  'evidence_gap_analysis',
  'targeted_rescan',
  'evidence_check',
  'evidence_adjudication',
  'synthesis',
  'roadmap_synthesis',
  'synthesis_escalation',
  'fact_check',
  'fact_check_high',
  'quality_gate',
]);

export const STAGE_ROLES = Object.freeze({
  forensic_audit: 'WORKHORSE',
  evidence_gap_analysis: 'WORKHORSE',
  targeted_rescan: 'WORKHORSE',
  evidence_check: 'QUALITY_CHECKER',
  evidence_adjudication: 'REASONER',
  synthesis: 'WORKHORSE',
  roadmap_synthesis: 'REASONER',
  synthesis_escalation: 'REASONER',
  fact_check: 'QUALITY_CHECKER',
  fact_check_high: 'QUALITY_CHECKER',
  // This call explains an authoritative deterministic gate decision. It does
  // not verify or alter that decision, so it remains ordinary bounded work.
  quality_gate: 'WORKHORSE',
});

const PROVIDERS = new Set(['ANTHROPIC', 'GOOGLE', 'META', 'OPENAI', 'XAI']);
const profile = (id, provider, options = {}) => Object.freeze({ id, provider, ...options });

const openaiModels = (reasoningEffort, maxTokens) => Object.freeze([
  profile('gpt-5.6-sol', 'openai', { reasoningEffort, maxTokens }),
  profile('gpt-5.6-terra', 'openai', { reasoningEffort, maxTokens }),
  profile('gpt-6-astra', 'openai', { reasoningEffort, maxTokens }),
  profile('gpt-5.4', 'openai', { reasoningEffort, maxTokens }),
]);

const anthropicModels = maxTokens => Object.freeze([
  profile('claude-sonnet-5', 'anthropic', { maxTokens }),
]);

const xaiModels = (reasoningEffort, maxTokens) => Object.freeze([
  profile('grok-4.6', 'xai', { reasoningEffort, maxTokens }),
]);

const googleModels = (reasoningEffort, maxTokens) => Object.freeze([
  profile('gemini-3.8-flash', 'google', { reasoningEffort, maxTokens }),
]);

const metaStandardModels = (reasoningEffort, maxTokens) => Object.freeze([
  profile('muse-spark-1.3', 'meta', { reasoningEffort, maxTokens }),
]);

const ROLE_PROVIDER_PROFILES = Object.freeze({
  REASONER: Object.freeze({
    OPENAI: openaiModels('high', 32768),
    ANTHROPIC: anthropicModels(32768),
    XAI: xaiModels('high', 32768),
    GOOGLE: googleModels('high', 32768),
    META: metaStandardModels('high', 32768),
  }),
  WORKHORSE: Object.freeze({
    OPENAI: openaiModels('medium', 16384),
    ANTHROPIC: anthropicModels(16384),
    XAI: xaiModels('medium', 16384),
    GOOGLE: googleModels('medium', 16384),
    META: metaStandardModels('medium', 16384),
  }),
  QUALITY_CHECKER: Object.freeze({
    OPENAI: openaiModels('medium', 16384),
    ANTHROPIC: anthropicModels(16384),
    XAI: xaiModels('medium', 16384),
    GOOGLE: googleModels('medium', 16384),
    META: Object.freeze([
      ...metaStandardModels('medium', 16384),
      profile('muse-spark-1.3-contributor', 'meta', { reasoningEffort: 'medium', maxTokens: 16384 }),
    ]),
  }),
});

const profilesForRole = role => Object.values(ROLE_PROVIDER_PROFILES[role]).flat();

const STAGE_PROFILE_OVERRIDES = Object.freeze({
  synthesis: Object.freeze({
    anthropic: Object.freeze({ maxTokens: 24576 }),
  }),
});

const profileForStage = (stage, candidate) => {
  const override = STAGE_PROFILE_OVERRIDES[stage]?.[candidate.provider];
  return override ? Object.freeze({ ...candidate, ...override }) : candidate;
};

const ROLE_ENV_FIELDS = Object.freeze(AI_ROLES.flatMap(role => [
  `${role}_PROVIDER`,
  `${role}_MODEL`,
  `${role}_FALLBACK_PROVIDER`,
  `${role}_FALLBACK_MODEL`,
]));

// TEST_MODE=true replaces the twelve role variables with this complete
// two-model chain. Fallbacks stay on the cheap authorized set.
const TEST_MODE_ASSIGNMENTS = Object.freeze({
  WORKHORSE: Object.freeze({
    primaryProvider: 'GOOGLE',
    primaryModel: 'gemini-3.8-flash',
    fallbackProvider: 'XAI',
    fallbackModel: 'grok-4.6',
  }),
  REASONER: Object.freeze({
    primaryProvider: 'XAI',
    primaryModel: 'grok-4.6',
    fallbackProvider: 'GOOGLE',
    fallbackModel: 'gemini-3.8-flash',
  }),
  QUALITY_CHECKER: Object.freeze({
    primaryProvider: 'META',
    primaryModel: 'muse-spark-1.3-contributor',
    fallbackProvider: 'GOOGLE',
    fallbackModel: 'gemini-3.8-flash',
  }),
});

export const providerCredentialConfigured = (provider, env = process.env) => {
  const normalized = String(provider || '').toUpperCase();
  if (normalized === 'OPENAI') return Boolean(env.GPT_API_KEY || env.OPENAI_API_KEY);
  if (normalized === 'ANTHROPIC') return Boolean(env.ANTHROPIC_API_KEY);
  if (normalized === 'XAI') return Boolean(env.XAI_API_KEY);
  if (normalized === 'GOOGLE') return Boolean(env.GEMINI_API_KEY || env.GOOGLE_API_KEY);
  if (normalized === 'META') return Boolean(env.META_API_KEY || env.MODEL_API_KEY);
  return false;
};

export class ModelRoutingConfigurationError extends Error {
  constructor() {
    super('MODEL_ROUTING_CONFIGURATION_INVALID');
    this.code = 'MODEL_ROUTING_CONFIGURATION_INVALID';
  }
}

const requiredValue = value => {
  if (typeof value !== 'string' || !value.trim()) throw new ModelRoutingConfigurationError();
  return value.trim();
};

const configuredProvider = value => {
  const normalized = requiredValue(value).toUpperCase();
  if (!PROVIDERS.has(normalized)) throw new ModelRoutingConfigurationError();
  return normalized;
};

const parseTestMode = env => {
  if (env.TEST_MODE === undefined) return false;
  if (env.TEST_MODE === 'true') return true;
  if (env.TEST_MODE === 'false') return false;
  throw new ModelRoutingConfigurationError();
};

const lookupRole = (role, primaryProvider, primaryModel, fallbackProvider, fallbackModel) => {
  const primary = ROLE_PROVIDER_PROFILES[role][primaryProvider]?.find(candidate => candidate.id === primaryModel);
  const fallback = ROLE_PROVIDER_PROFILES[role][fallbackProvider]?.find(candidate => candidate.id === fallbackModel);
  if (!primary || !fallback) {
    throw new ModelRoutingConfigurationError();
  }
  if (primary.provider === fallback.provider && primary.id === fallback.id) {
    throw new ModelRoutingConfigurationError();
  }
  return Object.freeze({
    role,
    primary_provider: primaryProvider,
    fallback_provider: fallbackProvider,
    profiles: [primary, fallback],
  });
};

const configuredRole = (role, env) => lookupRole(
  role,
  configuredProvider(env[`${role}_PROVIDER`]),
  requiredValue(env[`${role}_MODEL`]),
  configuredProvider(env[`${role}_FALLBACK_PROVIDER`]),
  requiredValue(env[`${role}_FALLBACK_MODEL`]),
);

const testModeRole = role => {
  const assignment = TEST_MODE_ASSIGNMENTS[role];
  return lookupRole(
    role,
    assignment.primaryProvider,
    assignment.primaryModel,
    assignment.fallbackProvider,
    assignment.fallbackModel,
  );
};

export const settingsForProfile = candidate => ({
  ...(candidate.maxTokens !== undefined ? { max_tokens: candidate.maxTokens } : {}),
  ...(candidate.reasoningEffort ? { reasoning_effort: candidate.reasoningEffort } : {}),
});

export function resolveModelRouting(env = process.env) {
  // A complete role policy is mandatory. Partial or legacy provider-level
  // configuration fails closed rather than silently selecting another model.
  if (env.PRIMARY_MODEL_PROVIDER !== undefined || env.FALLBACK_MODEL_PROVIDER !== undefined) {
    throw new ModelRoutingConfigurationError();
  }
  const testMode = parseTestMode(env);
  if (!testMode && ROLE_ENV_FIELDS.some(field => env[field] === undefined)) {
    throw new ModelRoutingConfigurationError();
  }

  const roles = Object.fromEntries(AI_ROLES.map(role => [role, testMode ? testModeRole(role) : configuredRole(role, env)]));
  const configuredProviders = new Set(Object.values(roles)
    .flatMap(role => role.profiles)
    .map(candidate => candidate.provider.toUpperCase()));
  if ([...configuredProviders].some(provider => !providerCredentialConfigured(provider, env))) {
    throw new ModelRoutingConfigurationError();
  }
  const routes = Object.fromEntries(MODEL_STAGES.map(stage => [
    stage,
    Object.freeze(roles[STAGE_ROLES[stage]].profiles.map(candidate => profileForStage(stage, candidate))),
  ]));
  return {
    schema_version: MODEL_ROUTING_SCHEMA_VERSION,
    policy_version: MODEL_ROUTING_POLICY_VERSION,
    mode: 'role_policy',
    label: testMode ? MODEL_ROUTING_TEST_LABEL : MODEL_ROUTING_LABEL,
    stage_roles: STAGE_ROLES,
    roles,
    routes,
  };
}

export function authorizedProfiles(stage, provider, model) {
  const role = STAGE_ROLES[stage];
  if (!role) return [];
  return profilesForRole(role)
    .filter(candidate => candidate.provider === provider && candidate.id === model)
    .map(candidate => profileForStage(stage, candidate));
}

export function configuredProfile(stage, provider, model, env = process.env) {
  return resolveModelRouting(env).routes[stage]?.find(candidate => candidate.provider === provider && candidate.id === model);
}
