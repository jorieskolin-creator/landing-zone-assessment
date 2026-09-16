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
assert.match(server, /boot\.startWorkers && infrastructure/);
assert.match(server, /publisher\?\.stop/);
assert.doesNotMatch(server, /STARTUP_FAILED code=\$\{code==='INTERNAL_ERROR'\?'INFRASTRUCTURE_UNAVAILABLE'/);
assert.match(server, /INFRASTRUCTURE_UNAVAILABLE code=/);
assert.match(server, /serving UI; workers not started/);
assert.match(server, /mode:'ui_only'/);

const railway = await readFile(new URL('../railway.json', import.meta.url), 'utf8');
assert.match(railway, /"healthcheckPath": "\/livez"/);
assert.doesNotMatch(railway, /preDeployCommand/);

console.log('server boot allows UI without model routing; analysis workers stay off');
