import { resolveModelRouting } from './modelRoutingPolicy.js';

const configured = value => typeof value === 'string' && value.trim().length > 0;

export function deploymentExpectsInfrastructure(env = process.env) {
  return configured(env.DATABASE_URL) || configured(env.REDIS_URL);
}

export function inspectServerBoot(env = process.env) {
  let modelRoutingReady = false;
  try {
    resolveModelRouting(env);
    modelRoutingReady = true;
  } catch {
    modelRoutingReady = false;
  }
  return {
    serveHttp: true,
    modelRoutingReady,
    startWorkers: modelRoutingReady,
  };
}

// A process with no database and no Redis is the UI-only boot and stays ready.
// A full deployment that configured either dependency, then failed to connect,
// is not ready. /livez stays the process health check.
export function readyzResponse({
  accepting,
  infrastructureReady,
  dependencyReady,
  modelRoutingReady,
  expectsInfrastructure,
}) {
  if (!accepting) return { status: 503, body: { status: 'not_ready', code: 'SHUTTING_DOWN' } };
  if (!infrastructureReady) {
    if (expectsInfrastructure) {
      return { status: 503, body: { status: 'not_ready', mode: 'full', code: 'INFRASTRUCTURE_UNAVAILABLE' } };
    }
    return { status: 200, body: { status: 'ready', mode: 'ui_only' } };
  }
  if (!dependencyReady) {
    return { status: 503, body: { status: 'not_ready', mode: 'full', code: 'DEPENDENCY_UNAVAILABLE' } };
  }
  return {
    status: 200,
    body: { status: 'ready', mode: modelRoutingReady ? 'full' : 'ui_only' },
  };
}
