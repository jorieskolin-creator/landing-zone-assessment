/**
 * Tactic ID capture for Landing Zone playbook IDs and FinOps characterization stubs.
 * LZ: TAC-ORG-A1-01 / TAC-IDENTITY-AP-B1-01
 * Characterization: TAC-GOV-001 / TAC-VIS-001-XXX
 */
export const TACTIC_ID_CAPTURE_SOURCE =
  "\\[(TAC-[A-Z]+-(?:AP-[A-H][1-5]|[A-H][1-5]|\\d+)(?:-\\d{2}|-[A-Z]+)?)\\]";

export const tacticIdCaptureRx = (): RegExp => new RegExp(TACTIC_ID_CAPTURE_SOURCE, "g");

export const LANDING_ZONE_TACTIC_ID_PATTERN =
  "TAC-(ORG|IDENTITY|RESOURCE|NETWORK|SECURITY|OPERATIONS|GOVERNANCE|AUTOMATION)-(AP-)?[A-H][1-5]-01";
