import { resolveModelRouting } from './modelRoutingPolicy.js';

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
