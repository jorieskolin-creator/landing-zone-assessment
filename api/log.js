// Minimal client→server logger. The client posts pipeline events here so
// they appear in Railway's log stream alongside the proxy call logs.
// Session-gated so random scanners can't pollute the logs.

import { requireSession } from "../lib/auth.js";
import { resolveClientOperationalLog, safeOperationalIdentifier } from "../lib/operationalLogPolicy.js";

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }
  if (!requireSession(req)) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  const { runId, level, event, ...rest } = req.body || {};
  const normalizedLevel = level === 'error' || level === 'warn' ? level : 'info';
  const ts = new Date().toISOString();
  const safeRunId = safeOperationalIdentifier(runId);
  const resolved = resolveClientOperationalLog(event, rest);
  const safeEvent = resolved.event;
  const fields = resolved.fields;
  const tag = `[${ts}] [run=${safeRunId}]`;
  const line = `${tag} level=${normalizedLevel} event=${safeEvent} ${formatFields(fields)}`;

  if (normalizedLevel === 'error') console.error(line);
  else console.log(line);

  return res.status(204).end();
}

function formatFields(obj) {
  return Object.entries(obj)
    .map(([k, v]) => `${k}=${typeof v === 'object' ? JSON.stringify(v) : v}`)
    .join(' ');
}
