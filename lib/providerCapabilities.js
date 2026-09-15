export const PROVIDER_CAPABILITIES = Object.freeze({
  openai: Object.freeze({
    supports_strict_schema: true,
    supports_reasoning_with_structured_output: true,
    supports_streaming: true,
    max_output_tokens: 128000,
    reasoning_effort_support: Object.freeze(['none', 'low', 'medium', 'high', 'xhigh', 'max']),
  }),
  anthropic: Object.freeze({
    supports_strict_schema: true,
    supports_reasoning_with_structured_output: true,
    supports_streaming: true,
    max_output_tokens: 128000,
    reasoning_effort_support: Object.freeze([]),
  }),
  xai: Object.freeze({
    supports_strict_schema: true,
    supports_reasoning_with_structured_output: true,
    supports_streaming: true,
    max_output_tokens: 131072,
    reasoning_effort_support: Object.freeze(['low', 'medium', 'high']),
  }),
  google: Object.freeze({
    supports_strict_schema: true,
    supports_reasoning_with_structured_output: true,
    supports_streaming: true,
    max_output_tokens: 65536,
    reasoning_effort_support: Object.freeze(['low', 'medium', 'high']),
  }),
  meta: Object.freeze({
    supports_strict_schema: true,
    supports_reasoning_with_structured_output: true,
    supports_streaming: true,
    max_output_tokens: 128000,
    reasoning_effort_support: Object.freeze(['low', 'medium', 'high', 'xhigh', 'max']),
  }),
});

export function providerCapabilities(provider) {
  return PROVIDER_CAPABILITIES[provider];
}
