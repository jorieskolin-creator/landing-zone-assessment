# Assessment knowledge surface

Production domain content is the Landing Zone pack loaded by `src/domain-packs/loadLandingZonePack.ts`.

JSON files named `finops_*.json` in this directory are **copied baseline fixtures**. They exist so kernel characterization tests can lock inherited behavior. They must not be used as the live assessment pack, and missing Landing Zone Knowledge Base or Tactic Playbook content must fail visibly rather than fall back to these files.
