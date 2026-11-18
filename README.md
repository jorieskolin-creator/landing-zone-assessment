# Landing Zone Assessment

Independent Landing Zone Assessment. The governed execution kernel is a source copy of a recorded FinOps Engine baseline, owned and evolved in this repository.

Production domain content is the Landing Zone pack under `src/domain-packs/landing-zone/`. FinOps JSON retained under `src/knowledge_base/` is characterization fixture data only.

See `Landing_Zone_Assessment_Implementation_Plan.md` and `src/knowledge_base/KERNEL_BASELINE.md`.

## Local development

```bash
npm ci
cp .env.example .env.local
npm test
```


### Existing Redis namespace

Set `LZ_REDIS_NAMESPACE=landing-zone:v1` for a new execution plane. Existing deployments without this setting keep their stored attempts and checkpoints in the current namespace. To transition an existing deployment, stop admitting runs, drain in-flight attempts, and let retained checkpoints expire before setting the same namespace on every replica. The maximum run and checkpoint lifetime is 24 hours.

Railway runs the registered PostgreSQL migrations before starting the app. Migration 010 accepts Landing Zone telemetry and preserves historical telemetry rows.
