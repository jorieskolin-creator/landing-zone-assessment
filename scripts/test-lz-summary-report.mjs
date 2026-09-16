import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const html = await readFile(new URL('../public/Landing_Zone_Assessment_Summary_Report.html', import.meta.url), 'utf8');

assert.match(html, /Landing Zone Assessment Summary/);
assert.match(html, /Quality Gate WARN/);
assert.match(html, /Maturity band Pilot/);
assert.match(html, /CONDITIONAL_GO/);
assert.match(html, /TAC-ORG-AP-A1-01/);
assert.match(html, /TAC-IDENTITY-AP-B1-01/);
assert.match(html, /TAC-RESOURCE-C4-01/);
assert.match(html, /TAC-GOVERNANCE-G3-01/);
assert.match(html, /Tenant, billing &amp; organization construct/);
assert.match(html, /Platform automation/);
assert.match(html, /CISO and leadership/);
assert.match(html, /compact-heatmap-panel/);
assert.match(html, /AP-A1/);
assert.match(html, /Landing Zone Engine v\.2\.0\.0/);
assert.doesNotMatch(html, /simulat/i);
assert.doesNotMatch(html, /fictional/i);
assert.doesNotMatch(html, /Northstar/i);
assert.doesNotMatch(html, /demo pack/i);
assert.doesNotMatch(html, /placeholder/i);
assert.doesNotMatch(html, /FinOps Summary Report/);

console.log('landing zone summary report HTML contract passed');
