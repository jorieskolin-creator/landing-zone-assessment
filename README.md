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
