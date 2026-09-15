/**
 * Optional workshop session fields for the Landing Zone Engine intake.
 *
 * These match the questionnaire's session metadata (facilitator, date,
 * times, reference, participants). They are not scoring inputs and must
 * not be stored on AssessmentScope or passed into lockScope.
 *
 * Overlapping playing-field fields (customer, clouds, tenant, design areas,
 * live inventory) map onto AssessmentScope instead.
 */
export const LZ_ENGINE_WORKSHOP_SESSION_SCHEMA = "lz_engine_workshop_session_v1" as const;

export type WorkshopInventoryChoice = "yes" | "partial" | "no";

export interface LzEngineWorkshopSession {
  schema_version: typeof LZ_ENGINE_WORKSHOP_SESSION_SCHEMA;
  date?: string;
  start_time?: string;
  end_time?: string;
  facilitator?: string;
  reference?: string;
  participants?: string;
}

const trim = (value: unknown): string => (typeof value === "string" ? value.trim() : "");

export const emptyWorkshopSession = (): LzEngineWorkshopSession => ({
  schema_version: LZ_ENGINE_WORKSHOP_SESSION_SCHEMA,
});

/**
 * Questionnaire Live inventory Yes / Partial / No maps to the Step 0
 * inventory-exports boolean. Yes and Partial mean file-set inventory is
 * included. This is never a live cloud API read.
 */
export const inventoryExportsIncludedFromChoice = (choice: WorkshopInventoryChoice): boolean =>
  choice === "yes" || choice === "partial";

export const workshopInventoryChoiceFromExports = (included: boolean): WorkshopInventoryChoice =>
  included ? "yes" : "no";

export const normalizeWorkshopSession = (
  raw?: Partial<LzEngineWorkshopSession> | null,
): LzEngineWorkshopSession | undefined => {
  if (!raw) return undefined;
  const session: LzEngineWorkshopSession = {
    schema_version: LZ_ENGINE_WORKSHOP_SESSION_SCHEMA,
    ...(trim(raw.date) ? { date: trim(raw.date) } : {}),
    ...(trim(raw.start_time) ? { start_time: trim(raw.start_time) } : {}),
    ...(trim(raw.end_time) ? { end_time: trim(raw.end_time) } : {}),
    ...(trim(raw.facilitator) ? { facilitator: trim(raw.facilitator) } : {}),
    ...(trim(raw.reference) ? { reference: trim(raw.reference) } : {}),
    ...(trim(raw.participants) ? { participants: trim(raw.participants) } : {}),
  };
  return workshopSessionHasContent(session) ? session : undefined;
};

export const workshopSessionHasContent = (session?: LzEngineWorkshopSession | null): boolean =>
  Boolean(
    session &&
      (trim(session.date) ||
        trim(session.start_time) ||
        trim(session.end_time) ||
        trim(session.facilitator) ||
        trim(session.reference) ||
        trim(session.participants)),
  );
