import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const html = await readFile(new URL('../public/Landing_Zone_Assessment_Master_Data_Report.html', import.meta.url), 'utf8');
const summary = await readFile(new URL('../public/Landing_Zone_Assessment_Summary_Report.html', import.meta.url), 'utf8');

assert.match(html, /Landing Zone Assessment Master Data/);
assert.match(html, /Quality Gate Status: WARN/);
assert.match(html, /Pilot/);
assert.match(html, /CONDITIONAL GO/);
assert.match(html, /TAC-ORG-AP-A1-01/);
assert.match(html, /TAC-IDENTITY-AP-B1-01/);
assert.match(html, /TAC-RESOURCE-C4-01/);
assert.match(html, /TAC-AUTOMATION-AP-H2-01/);
assert.match(html, /TAC-GOVERNANCE-G3-01/);
assert.match(html, /Tenant, billing &amp; organization construct/);
assert.match(html, /Platform automation/);
assert.match(html, /Forensic Audit: Landing Zone Maturity/);
assert.match(html, /Forensic Audit: Anti-Patterns/);
assert.match(html, /Evidence Check/);
assert.match(html, /Quality &amp; Strategy Hygiene Appendix/);
assert.match(html, /Acquisition Quality/);
assert.match(html, /Source Registry &amp; Context Packets/);
assert.match(html, /RunTrace Provenance/);
assert.match(html, /lz-2026-09-16-0842/);
assert.match(html, /mg-platform/);
assert.match(html, /o-7n4k/);
assert.match(html, /Landing Zone Engine v\.2\.0\.0/);
assert.match(html, /forensic-card/);

const forensicCards = html.match(/class="forensic-card"/g) || [];
assert.equal(forensicCards.length, 80, `expected 80 forensic cards, got ${forensicCards.length}`);

const packetDomains = [...html.matchAll(/<td><strong>([A-H])<\/strong>/g)].map(match => match[1]);
assert.deepEqual([...new Set(packetDomains)].sort(), ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H']);

assert.doesNotMatch(html, /simulat/i);
assert.doesNotMatch(html, /fictional/i);
assert.doesNotMatch(html, /Northstar/i);
assert.doesNotMatch(html, /demo pack/i);
assert.doesNotMatch(html, /placeholder/i);
assert.doesNotMatch(html, /FinOps Master Data/);
assert.doesNotMatch(html, /FinOps Engine/);
assert.doesNotMatch(html, /FinOps Summary Report/);

assert.match(summary, /Authoritative organization root/);
assert.match(html, /Authoritative organization root/);
assert.match(summary, /CONDITIONAL_GO/);
assert.match(html, /16 September 2026, 08:42 UTC/);
assert.match(summary, /16 September 2026, 08:42 UTC/);

console.log('landing zone master data report HTML contract passed');
