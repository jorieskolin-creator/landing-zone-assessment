import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import {
  DEFAULT_LZ_KB_BLOB_PREFIX,
  isRejectedFinopsBlobPrefix,
  resolveLzKbBlobPrefix,
} from '../lib/lzKbBlobPrefix.js';

assert.equal(DEFAULT_LZ_KB_BLOB_PREFIX, 'Landing Zone Knowledge Base/');
assert.equal(resolveLzKbBlobPrefix({}), DEFAULT_LZ_KB_BLOB_PREFIX);
assert.equal(resolveLzKbBlobPrefix({ LZ_KB_BLOB_PREFIX: 'Landing Zone Knowledge Base' }), DEFAULT_LZ_KB_BLOB_PREFIX);
assert.equal(
  resolveLzKbBlobPrefix({
    LZ_KB_BLOB_PREFIX: 'Landing Zone Knowledge Base/',
    LANDING_ZONE_KB_PREFIX: 'Knowledge Base/',
  }),
  DEFAULT_LZ_KB_BLOB_PREFIX,
);
assert.equal(
  resolveLzKbBlobPrefix({ LANDING_ZONE_KB_PREFIX: 'Knowledge Base/' }),
  DEFAULT_LZ_KB_BLOB_PREFIX,
  'FinOps LANDING_ZONE_KB_PREFIX must not become the LZ ingest prefix',
);

assert.equal(isRejectedFinopsBlobPrefix('Knowledge Base/'), true);
assert.equal(isRejectedFinopsBlobPrefix('Knowledge Base'), true);
assert.equal(isRejectedFinopsBlobPrefix('Landing Zone Knowledge Base/'), false);

const api = await readFile(new URL('../api/kb-index.js', import.meta.url), 'utf8');
assert.match(api, /resolveLzKbBlobPrefix/);
assert.match(api, /isRejectedFinopsBlobPrefix/);
assert.doesNotMatch(api, /process\.env\.LANDING_ZONE_KB_PREFIX/);

const layout = execFileSync(process.execPath, [fileURLToPath(new URL('./print-lz-kb-blob-layout.mjs', import.meta.url))], {
  encoding: 'utf8',
});
assert.match(layout, /Landing Zone Knowledge Base\/Tenant, billing & organization construct\//);
assert.match(layout, /A - Tenant, billing & organization construct - A1 - Authoritative organization root\.pdf/);
assert.match(layout, /A - Tenant, billing & organization construct - AP-A1 - Shadow tenants and unmanaged orgs\.pdf/);
assert.match(layout, /H - Platform automation & DevOps - H5 - Platform change management\.pdf/);
assert.match(layout, /count=80/);

console.log('lz kb blob prefix and layout tests passed');
