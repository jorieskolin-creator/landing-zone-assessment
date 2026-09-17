export const DEFAULT_LZ_KB_BLOB_PREFIX = 'Landing Zone Knowledge Base/';

const normalize = (prefix) => {
  const value = String(prefix || DEFAULT_LZ_KB_BLOB_PREFIX).trim() || DEFAULT_LZ_KB_BLOB_PREFIX;
  return value.endsWith('/') ? value : `${value}/`;
};

export function isRejectedFinopsBlobPrefix(prefix) {
  const value = normalize(prefix).toLowerCase();
  return value === 'knowledge base/'
    || value.startsWith('knowledge base/')
    || value.includes('finops knowledge');
}

export function resolveLzKbBlobPrefix(env = process.env) {
  // Do not read LANDING_ZONE_KB_PREFIX. That FinOps Engine variable name
  // currently points at Knowledge Base/ and must not become LZ ingest.
  return normalize(env.LZ_KB_BLOB_PREFIX || DEFAULT_LZ_KB_BLOB_PREFIX);
}
