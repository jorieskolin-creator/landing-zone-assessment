import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { inspectServerBoot } from '../lib/serverBoot.js';

const validEnv = {
  OPENAI_API_KEY: 'test-openai-key',
  ANTHROPIC_API_KEY: 'test-anthropic-key',
  XAI_API_KEY: 'test-xai-key',
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

const ready = inspectServerBoot(validEnv);
assert.equal(ready.serveHttp, true);
assert.equal(ready.modelRoutingReady, true);
assert.equal(ready.startWorkers, true);

const uiOnly = inspectServerBoot({});
assert.equal(uiOnly.serveHttp, true);
assert.equal(uiOnly.modelRoutingReady, false);
assert.equal(uiOnly.startWorkers, false);

const server = await readFile(new URL('../server.js', import.meta.url), 'utf8');
assert.match(server, /inspectServerBoot\(process\.env\)/);
assert.doesNotMatch(server, /STARTUP_FAILED code=MODEL_ROUTING_CONFIGURATION_INVALID/);
assert.match(server, /MODEL_ROUTING_UNAVAILABLE/);
assert.match(server, /boot\.startWorkers/);
assert.match(server, /publisher\?\.stop/);

console.log('server boot allows UI without model routing; analysis workers stay off');
