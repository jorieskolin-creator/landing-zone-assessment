import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { spawn } from 'node:child_process';
import { setTimeout as delay } from 'node:timers/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const port = 38765;
const env = { ...process.env, PORT: String(port) };
delete env.DATABASE_URL;
delete env.REDIS_URL;

const child = spawn(process.execPath, ['server.js'], {
  cwd: new URL('..', import.meta.url),
  env,
  stdio: ['ignore', 'pipe', 'pipe'],
});

let output = '';
child.stdout.on('data', chunk => { output += chunk.toString(); });
child.stderr.on('data', chunk => { output += chunk.toString(); });

const waitForListen = async () => {
  for (let i = 0; i < 40; i += 1) {
    if (output.includes('Listening on')) return;
    if (child.exitCode !== null) {
      throw new Error(`server exited ${child.exitCode}\n${output}`);
    }
    await delay(250);
  }
  throw new Error(`server did not listen\n${output}`);
};

try {
  await waitForListen();
  assert.match(output, /INFRASTRUCTURE_UNAVAILABLE/);
  assert.doesNotMatch(output, /STARTUP_FAILED/);

  const livez = await fetch(`http://127.0.0.1:${port}/livez`);
  assert.equal(livez.status, 200);
  assert.equal((await livez.json()).status, 'live');

  const readyz = await fetch(`http://127.0.0.1:${port}/readyz`);
  assert.equal(readyz.status, 200);
  const body = await readyz.json();
  assert.equal(body.status, 'ready');
  assert.equal(body.mode, 'ui_only');

  const home = await fetch(`http://127.0.0.1:${port}/`);
  const distIndex = path.join(fileURLToPath(new URL('..', import.meta.url)), 'dist', 'index.html');
  assert.equal(home.status, existsSync(distIndex) ? 200 : 404);
} finally {
  child.kill('SIGTERM');
  await delay(500);
  if (child.exitCode === null) child.kill('SIGKILL');
}

console.log('ui-only HTTP boot serves /livez and /readyz without Postgres or Redis');
