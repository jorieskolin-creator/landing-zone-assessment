import assert from 'node:assert/strict';
import { invokeProvider } from '../lib/providerInvocation.js';
import { OUTPUT_CONTRACT_IDS } from '../lib/outputContracts.js';

const packet = {
  provider: 'xai',
  model: 'grok-4.6',
  system_instruction: 'Return valid JSON only.',
  parts: [{ type: 'text', text: 'Return {"ok":true}.' }],
  settings: { max_tokens: 16384, reasoning_effort: 'medium' },
};

let request;
const result = await invokeProvider(packet, {
  env: { XAI_API_KEY: 'test-key-not-a-real-secret' },
  fetchFn: async (url, options) => {
    request = { url, options, body: JSON.parse(options.body) };
    return {
      ok: true,
      json: async () => ({
        choices: [{ finish_reason: 'stop', message: { content: '{"ok":true}' } }],
        usage: {
          prompt_tokens: 12,
          completion_tokens: 4,
          completion_tokens_details: { reasoning_tokens: 0 },
        },
      }),
    };
  },
});

assert.equal(request.url, 'https://api.x.ai/v1/chat/completions');
assert.equal(request.options.headers.Authorization, 'Bearer test-key-not-a-real-secret');
assert.equal(request.body.model, 'grok-4.6');
assert.equal(request.body.max_completion_tokens, 16384);
assert.equal(request.body.reasoning_effort, 'medium');
assert.deepEqual(request.body.response_format, { type: 'json_object' });
assert.match(request.body.messages.map(message => message.content).join('\n'), /JSON/i);
assert.equal(result.text, '{"ok":true}');
assert.deepEqual(result.usage, { input_tokens: 12, output_tokens: 4, reasoning_tokens: 0 });

await assert.rejects(
  invokeProvider(packet, { env: {}, fetchFn: async () => { throw new Error('must not dispatch'); } }),
  /PROVIDER_NOT_CONFIGURED/,
);

await assert.rejects(
  invokeProvider({ ...packet, provider: 'openai', model: 'gpt-5.6-sol' }, {
    env: { OPENAI_API_KEY: 'test-key' },
    fetchFn: async () => ({
      ok: false,
      status: 400,
      headers: { get: name => name === 'x-request-id' ? 'req_safe-123' : null },
      json: async () => ({
        error: {
          code: 'unsupported_parameter',
          message: 'raw provider response must never propagate',
        },
      }),
    }),
  }),
  error => error?.code === 'UPSTREAM_HTTP_ERROR'
    && error?.providerHttpStatus === 400
    && error?.providerErrorCode === 'unsupported_parameter'
    && error?.providerRequestId === 'req_safe-123'
    && !String(error?.message).includes('raw provider response'),
);

await assert.rejects(
  invokeProvider(packet, {
    env: { XAI_API_KEY: 'test-key' },
    fetchFn: async () => ({
      ok: false,
      status: 429,
      headers: { get: () => 'invalid request id with spaces and source text' },
      json: async () => ({ error: { code: 'invalid code with spaces', message: 'private response content' } }),
    }),
  }),
  error => error?.code === 'UPSTREAM_HTTP_ERROR'
    && error?.providerHttpStatus === 429
    && error?.providerErrorCode === undefined
    && error?.providerRequestId === undefined,
);

await assert.rejects(
  invokeProvider(packet, {
    env: { XAI_API_KEY: 'test-key' },
    fetchFn: async () => ({
      ok: true,
      json: async () => ({ choices: [{ finish_reason: 'length', message: { content: '{"ok"' } }] }),
    }),
  }),
  error => error?.code === 'INCOMPLETE_RESPONSE' && error?.terminationReason === 'MAX_OUTPUT_TOKENS',
);

await assert.rejects(
  invokeProvider(packet, {
    env: { XAI_API_KEY: 'test-key' },
    fetchFn: async () => ({
      ok: true,
      json: async () => ({ choices: [{ finish_reason: 'stop', message: { content: '', refusal: 'cannot comply' } }] }),
    }),
  }),
  error => error?.code === 'INCOMPLETE_RESPONSE' && error?.terminationReason === 'PROVIDER_REFUSAL',
);

await assert.rejects(
  invokeProvider({ ...packet, provider: 'anthropic', model: 'claude-sonnet-5', settings: { max_tokens: 16384 } }, {
    env: { ANTHROPIC_API_KEY: 'test-key' },
    fetchFn: async () => ({ ok: true, json: async () => ({ stop_reason: 'max_tokens', content: [] }) }),
  }),
  error => error?.code === 'INCOMPLETE_RESPONSE' && error?.terminationReason === 'MAX_OUTPUT_TOKENS',
);

await assert.rejects(
  invokeProvider({ ...packet, provider: 'anthropic', model: 'claude-sonnet-5', settings: { max_tokens: 16384 } }, {
    env: { ANTHROPIC_API_KEY: 'test-key' },
    fetchFn: async () => ({ ok: true, json: async () => ({ stop_reason: 'model_context_window_exceeded', content: [] }) }),
  }),
  error => error?.code === 'INCOMPLETE_RESPONSE' && error?.terminationReason === 'CONTEXT_WINDOW_EXCEEDED',
);

for (const provider of ['openai', 'anthropic', 'xai']) {
  let structuredRequest;
  const structuredPacket = {
    ...packet,
    stage: 'synthesis',
    provider,
    model: provider === 'openai' ? 'gpt-5.6-sol' : provider === 'xai' ? 'grok-4.6' : 'claude-sonnet-5',
    output_contract: OUTPUT_CONTRACT_IDS.evidenceSynthesis,
    settings: { max_tokens: 8192 },
  };
  await invokeProvider(structuredPacket, {
    env: provider === 'openai'
      ? { OPENAI_API_KEY: 'test-key' }
      : provider === 'xai'
        ? { XAI_API_KEY: 'test-key' }
        : { ANTHROPIC_API_KEY: 'test-key' },
    fetchFn: async (_url, options) => {
      structuredRequest = JSON.parse(options.body);
      return {
        ok: true,
        json: async () => provider === 'openai'
          ? { status: 'completed', output_text: '{"phase_3_strategy":{}}' }
          : provider === 'xai'
            ? { choices: [{ finish_reason: 'stop', message: { content: '{"phase_3_strategy":{}}' } }] }
            : { stop_reason: 'end_turn', content: [{ type: 'text', text: '{"phase_3_strategy":{}}' }] },
      };
    },
  });
  const format = provider === 'openai'
    ? structuredRequest.text.format
    : provider === 'xai'
      ? structuredRequest.response_format
      : structuredRequest.output_config.format;
  const schema = provider === 'xai' ? format.json_schema.schema : format.schema;
  assert.equal(format.type, 'json_schema');
  assert.equal(schema.additionalProperties, false);
  assert.deepEqual(schema.required, ['phase_3_strategy']);
  if (provider === 'openai' || provider === 'xai') {
    const namedFormat = provider === 'xai' ? format.json_schema : format;
    assert.equal(namedFormat.name, OUTPUT_CONTRACT_IDS.evidenceSynthesis);
    assert.equal(namedFormat.strict, true);
  }
}

let anthropicFindingsRequest;
await invokeProvider({
  ...packet,
  stage: 'synthesis',
  provider: 'anthropic',
  model: 'claude-sonnet-5',
  output_contract: OUTPUT_CONTRACT_IDS.findingsSynthesis,
  settings: { max_tokens: 8192 },
}, {
  env: { ANTHROPIC_API_KEY: 'test-key' },
  fetchFn: async (_url, options) => {
    anthropicFindingsRequest = JSON.parse(options.body);
    return {
      ok: true,
      json: async () => ({ stop_reason: 'end_turn', content: [{ type: 'text', text: '{}' }] }),
    };
  },
});
const anthropicSchemaText = JSON.stringify(anthropicFindingsRequest.output_config.format.schema);
assert.doesNotMatch(anthropicSchemaText, /"(?:minimum|maximum|maxItems|minLength|maxLength)"/);
assert.doesNotMatch(anthropicSchemaText, /"minItems"/);

let googleRequest;
const googleResult = await invokeProvider({
  ...packet,
  stage: 'synthesis',
  provider: 'google',
  model: 'gemini-3.8-flash',
  output_contract: OUTPUT_CONTRACT_IDS.evidenceSynthesis,
  settings: { max_tokens: 8192, reasoning_effort: 'medium' },
}, {
  env: { GEMINI_API_KEY: 'test-gemini-key' },
  fetchFn: async (url, options) => {
    googleRequest = { url, headers: options.headers, body: JSON.parse(options.body) };
    return {
      ok: true,
      json: async () => ({
        candidates: [{
          finishReason: 'STOP',
          content: { parts: [{ thought: true, text: 'hidden' }, { text: '{"phase_3_strategy":{}}' }] },
        }],
        usageMetadata: { promptTokenCount: 9, candidatesTokenCount: 5, thoughtsTokenCount: 3 },
      }),
    };
  },
});
assert.equal(googleRequest.url, 'https://generativelanguage.googleapis.com/v1beta/models/gemini-3.8-flash:generateContent');
assert.equal(googleRequest.headers['x-goog-api-key'], 'test-gemini-key');
assert.equal(googleRequest.body.generationConfig.thinkingConfig.thinkingLevel, 'medium');
assert.equal(googleRequest.body.generationConfig.maxOutputTokens, 8192);
assert.equal(googleRequest.body.generationConfig.responseMimeType, 'application/json');
assert.equal(googleRequest.body.generationConfig.responseJsonSchema.additionalProperties, false);
assert.deepEqual(googleRequest.body.generationConfig.responseJsonSchema.required, ['phase_3_strategy']);
assert.equal(googleRequest.body.systemInstruction.parts[0].text, packet.system_instruction);
assert.equal(googleResult.text, '{"phase_3_strategy":{}}');
assert.deepEqual(googleResult.usage, { input_tokens: 9, output_tokens: 5, reasoning_tokens: 3 });

await invokeProvider({
  ...packet,
  provider: 'google',
  model: 'gemini-3.8-flash',
  settings: { max_tokens: 8192, reasoning_effort: 'low' },
}, {
  env: { GOOGLE_API_KEY: 'alias-google-key' },
  fetchFn: async (_url, options) => {
    assert.equal(options.headers['x-goog-api-key'], 'alias-google-key');
    return {
      ok: true,
      json: async () => ({ candidates: [{ finishReason: 'STOP', content: { parts: [{ text: '{}' }] } }] }),
    };
  },
});

await assert.rejects(
  invokeProvider({
    ...packet,
    provider: 'google',
    model: 'gemini-3.8-flash',
    settings: { max_tokens: 8192, reasoning_effort: 'medium' },
  }, {
    env: { GEMINI_API_KEY: 'test-key' },
    fetchFn: async () => ({
      ok: true,
      json: async () => ({ candidates: [{ finishReason: 'MAX_TOKENS', content: { parts: [{ text: '{"ok"' }] } }] }),
    }),
  }),
  error => error?.code === 'INCOMPLETE_RESPONSE' && error?.terminationReason === 'MAX_OUTPUT_TOKENS',
);

let metaRequest;
const metaResult = await invokeProvider({
  ...packet,
  stage: 'fact_check',
  provider: 'meta',
  model: 'muse-spark-1.3',
  output_contract: OUTPUT_CONTRACT_IDS.summaryFactCheck,
  settings: { max_tokens: 8192, reasoning_effort: 'medium' },
}, {
  env: { META_API_KEY: 'test-meta-key' },
  fetchFn: async (url, options) => {
    metaRequest = { url, headers: options.headers, body: JSON.parse(options.body) };
    return {
      ok: true,
      json: async () => ({
        choices: [{ finish_reason: 'stop', message: { content: '{"schema_version":"ok"}' } }],
        usage: { prompt_tokens: 11, completion_tokens: 6, completion_tokens_details: { reasoning_tokens: 2 } },
      }),
    };
  },
});
assert.equal(metaRequest.url, 'https://api.meta.ai/v1/chat/completions');
assert.equal(metaRequest.headers.Authorization, 'Bearer test-meta-key');
assert.equal(metaRequest.body.model, 'muse-spark-1.3');
assert.equal(metaRequest.body.max_completion_tokens, 8192);
assert.equal(metaRequest.body.reasoning_effort, 'medium');
assert.equal(metaRequest.body.response_format.type, 'json_schema');
assert.equal(metaRequest.body.response_format.json_schema.name, OUTPUT_CONTRACT_IDS.summaryFactCheck);
assert.equal(metaRequest.body.response_format.json_schema.strict, true);
assert.equal(metaResult.text, '{"schema_version":"ok"}');
assert.deepEqual(metaResult.usage, { input_tokens: 11, output_tokens: 6, reasoning_tokens: 2 });

let metaKeyRequest;
await invokeProvider({
  ...packet,
  provider: 'meta',
  model: 'muse-spark-1.3-contributor',
  settings: { max_tokens: 8192, reasoning_effort: 'medium' },
}, {
  env: { MODEL_API_KEY: 'preferred-model-key', META_API_KEY: 'legacy-meta-key' },
  fetchFn: async (_url, options) => {
    metaKeyRequest = JSON.parse(options.body);
    assert.equal(options.headers.Authorization, 'Bearer preferred-model-key');
    return {
      ok: true,
      json: async () => ({ choices: [{ finish_reason: 'stop', message: { content: '{}' } }] }),
    };
  },
});
assert.equal(metaKeyRequest.model, 'muse-spark-1.3-contributor');
assert.equal(metaKeyRequest.response_format, undefined, 'Meta without an output contract must not send json_object');

let contributorEvidenceRequest;
await invokeProvider({
  ...packet,
  stage: 'evidence_check',
  provider: 'meta',
  model: 'muse-spark-1.3-contributor',
  output_contract: OUTPUT_CONTRACT_IDS.evidenceCheck,
  settings: { max_tokens: 32768, reasoning_effort: 'medium' },
}, {
  env: { MODEL_API_KEY: 'alias-model-key' },
  fetchFn: async (_url, options) => {
    contributorEvidenceRequest = JSON.parse(options.body);
    assert.equal(options.headers.Authorization, 'Bearer alias-model-key');
    return {
      ok: true,
      json: async () => ({ choices: [{ finish_reason: 'stop', message: { content: '{"items":[]}' } }] }),
    };
  },
});
assert.equal(contributorEvidenceRequest.model, 'muse-spark-1.3-contributor');
assert.equal(contributorEvidenceRequest.max_completion_tokens, 32768);
assert.equal(contributorEvidenceRequest.response_format.type, 'json_schema');
assert.equal(contributorEvidenceRequest.response_format.json_schema.name, OUTPUT_CONTRACT_IDS.evidenceCheck);
assert.equal(contributorEvidenceRequest.response_format.json_schema.schema.properties.items.minItems, 10);

await assert.rejects(
  invokeProvider({
    ...packet,
    provider: 'meta',
    model: 'muse-spark-1.3',
    settings: { max_tokens: 8192, reasoning_effort: 'medium' },
  }, {
    env: { META_API_KEY: 'test-key' },
    fetchFn: async () => ({
      ok: true,
      json: async () => ({ choices: [{ finish_reason: 'length', message: { content: '{"ok"' } }] }),
    }),
  }),
  error => error?.code === 'INCOMPLETE_RESPONSE' && error?.terminationReason === 'MAX_OUTPUT_TOKENS',
);

await assert.rejects(
  invokeProvider({
    ...packet,
    provider: 'google',
    model: 'gemini-3.8-flash',
    settings: { max_tokens: 8192, reasoning_effort: 'medium' },
  }, {
    env: { GEMINI_API_KEY: 'test-key' },
    fetchFn: async () => ({
      ok: false,
      status: 400,
      headers: { get: () => null },
      json: async () => ({
        error: {
          code: 400,
          message: 'Invalid JSON payload with optional properties must never propagate',
          status: 'INVALID_ARGUMENT',
        },
      }),
    }),
  }),
  error => error?.code === 'UPSTREAM_HTTP_ERROR'
    && error?.providerHttpStatus === 400
    && error?.providerErrorCode === 'INVALID_ARGUMENT'
    && !String(error?.message).includes('optional properties'),
);

let googleForensicRequest;
await invokeProvider({
  ...packet,
  stage: 'forensic_audit',
  provider: 'google',
  model: 'gemini-3.8-flash',
  output_contract: OUTPUT_CONTRACT_IDS.forensicAudit,
  settings: { max_tokens: 8192, reasoning_effort: 'medium' },
}, {
  env: { GEMINI_API_KEY: 'test-gemini-key' },
  fetchFn: async (_url, options) => {
    googleForensicRequest = JSON.parse(options.body);
    return {
      ok: true,
      json: async () => ({ candidates: [{ finishReason: 'STOP', content: { parts: [{ text: '{"items":[]}' }] } }] }),
    };
  },
});
const googleForensicQuote = googleForensicRequest.generationConfig.responseJsonSchema
  .properties.items.items.properties.evidence_quotes.items;
assert.equal(googleForensicQuote.properties.page_number, undefined);
assert.deepEqual(Object.keys(googleForensicQuote.properties).sort(), googleForensicQuote.required.sort());

await assert.rejects(
  invokeProvider({
    ...packet,
    provider: 'google',
    model: 'gemini-3.8-flash',
    settings: { max_tokens: 8192, reasoning_effort: 'xhigh' },
  }, {
    env: { GEMINI_API_KEY: 'test-key' },
    fetchFn: async () => { throw new Error('must not dispatch'); },
  }),
  /PROVIDER_NOT_CONFIGURED/,
);

console.log('provider invocation behavioral tests passed');
