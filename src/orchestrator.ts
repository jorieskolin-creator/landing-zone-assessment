
import { generateBatchSystemInstruction, generateBatchUserPrompt, generateTargetedBatchUserPrompt } from './prompts';
import { BATCH_DEFINITIONS, BATCH_IDS, expectedBatchOutputIdsFor, knowledgeBaseService } from './knowledge_base';
import { runStage, serverLog, RunContext, StageExecutionError, StageExhaustedError } from './services/modelRouter';
import { StageId } from './models';
// @ts-expect-error Pure JS contracts are also consumed by the server-side worker.
import { OUTPUT_CONTRACT_IDS, assertForensicBatchIds, forensicBucketsFromContract, forensicClientFailureCode, validateOutputContractText } from '../lib/outputContracts.js';
import { EvidenceCheckItem, EvidenceCheckResult, EvidenceLaneStagePacket, ImageInput, SemanticGapRetrievalPassTrace, SemanticGapRetrievalTrace } from './types';
import { assertEvidenceLaneStagePacket } from './services/evidenceStagePacketService';
import {
  applyEvidenceCheckToBatch,
  BatchAuditResult,
  evidenceItemsNeedingRescan,
  mergeEvidenceCheckResults,
  runEvidenceCheck,
  summarizeEvidenceCheck
} from './services/evidenceCheckService';

export interface Phase1SourcePackets {
  packets: Record<string, EvidenceLaneStagePacket>;
  expandWeakEvidence?: (input: {
    batchId: string;
    items: EvidenceCheckItem[];
    pass: 1 | 2;
    seenTerms: Set<string>;
    packet: EvidenceLaneStagePacket;
  }) => Promise<{
    packet: EvidenceLaneStagePacket;
    trace: Omit<SemanticGapRetrievalPassTrace, 'evidence_status_after' | 'verdict_change'>;
  }>;
}

export interface Phase1Result {
  phase_1_audit_logs: {
    maturity: Record<string, any>;
    antipattern: Record<string, any>;
  };
  evidence_check: EvidenceCheckResult;
  failed_batches: string[];
  models_used: string[];
  targeted_rescan_models_used: string[];
  evidence_check_models_used: string[];
  evidence_adjudication_models_used: string[];
  evidence_gap_analysis_models_used: string[];
  semantic_gap_retrieval: SemanticGapRetrievalTrace;
  meta?: Record<string, any>;
}

const runSingleBatch = async (
  batchId: string,
  text: string,
  images: ImageInput[],
  ctx: RunContext,
  userPromptOverride?: string,
  stage: StageId = 'forensic_audit',
  expectedIds?: { maturity: string[]; antipattern: string[] },
): Promise<BatchAuditResult & { model_used?: string }> => {
  const definitions = BATCH_DEFINITIONS[batchId];
  const systemInstruction = generateBatchSystemInstruction(batchId, definitions.title);
  const userPrompt = userPromptOverride || generateBatchUserPrompt(batchId, definitions);
  const referenceKbContext = await knowledgeBaseService.fetchReferenceKnowledgeBaseContext({
    batchId,
    maxDocChars: userPromptOverride ? 1000 : 1400,
    label: userPromptOverride ? 'targeted_rescan' : 'forensic_audit',
  });

  const userText = `${userPrompt}

<KNOWLEDGE_CONTEXT source_role="GOVERNED_KNOWLEDGE">
${referenceKbContext}
</KNOWLEDGE_CONTEXT>

<EVIDENCE_CONTEXT source_role="CUSTOMER_EVIDENCE">
${text}
</EVIDENCE_CONTEXT>`;

  const expected = expectedIds || expectedBatchOutputIdsFor(batchId);
  const contractId = stage === 'targeted_rescan' ? OUTPUT_CONTRACT_IDS.targetedRescan : OUTPUT_CONTRACT_IDS.forensicAudit;
  const validateBatchOutput = (value: string): void => {
    try {
      assertForensicBatchIds(validateOutputContractText(contractId, value), expected);
    } catch (error: any) {
      const code = forensicClientFailureCode(error);
      throw Object.assign(new Error(code), { code });
    }
  };
  const response = await runStage(stage, {
    userText,
    systemInstruction,
    images,
    outputContract: contractId,
    validateOutput: validateBatchOutput,
  }, ctx);
  const parsed = forensicBucketsFromContract(validateOutputContractText(contractId, response.text));
  return { ...parsed, model_used: response.modelUsed.id };
};

const packetForBatch = (
  batchId: string,
  sourcePackets?: Phase1SourcePackets
): { text: string; images: ImageInput[]; packet: EvidenceLaneStagePacket } => {
  if (!sourcePackets) {
    throw new Error(`Governed source packets are required for batch ${batchId}.`);
  }
  const packet = sourcePackets?.packets?.[batchId];
  if (!packet) {
    throw new Error(`Governed source packet is missing for batch ${batchId}.`);
  }
  assertEvidenceLaneStagePacket(packet);
  return { text: packet.text, images: packet.images, packet };
};

const mergeBatchResult = (base: BatchAuditResult, patch: BatchAuditResult): BatchAuditResult => ({
  maturity: { ...(base.maturity || {}), ...(patch.maturity || {}) },
  antipattern: { ...(base.antipattern || {}), ...(patch.antipattern || {}) },
});

const batchFailureFields = (error: unknown): { error_code: string; failed_models?: string; failed_codes?: string } => {
  if (error instanceof StageExhaustedError) {
    return {
      error_code: error.code,
      failed_models: error.failed_models || undefined,
      failed_codes: error.failed_codes || undefined,
    };
  }
  if (error instanceof StageExecutionError) return { error_code: error.code };
  const named = typeof (error as { code?: unknown })?.code === 'string' ? (error as { code: string }).code : '';
  if (named.startsWith('INVALID_BATCH_OUTPUT_') || named === 'INVALID_OUTPUT_CONTRACT') return { error_code: named };
  const message = error instanceof Error ? error.message : '';
  if (message.includes('All models exhausted')) return { error_code: 'MODELS_EXHAUSTED' };
  if (message.includes('not valid JSON')) return { error_code: 'INVALID_MODEL_OUTPUT' };
  if (message.includes('empty result')) return { error_code: 'EMPTY_MODEL_OUTPUT' };
  if (message.includes('INVALID_BATCH_OUTPUT_IDS')) return { error_code: 'INVALID_BATCH_OUTPUT_IDS' };
  if (message.includes('INVALID_BATCH_OUTPUT_SCHEMA')) return { error_code: 'INVALID_BATCH_OUTPUT_SCHEMA' };
  if (message.includes('INVALID_BATCH_OUTPUT_PROVENANCE')) return { error_code: 'INVALID_BATCH_OUTPUT_PROVENANCE' };
  return { error_code: 'BATCH_PROCESSING_FAILED' };
};

const batchFailureCode = (error: unknown): string => batchFailureFields(error).error_code;

const unavailableEvidenceCheck = (batchId: string, failureCode: string): EvidenceCheckResult => {
  const expected = expectedBatchOutputIdsFor(batchId);
  const items: EvidenceCheckItem[] = (['maturity', 'antipattern'] as const).flatMap(stream =>
    expected[stream].map(id => ({
      stream,
      id,
      status: 'missing' as const,
      original_count: 0,
      verified_count: 0,
      rationale: 'Domain analysis was unavailable after retry; no evidence verdict was produced.',
      rescan_recommended: false,
      quote_supported: false,
      verification_unresolved: true,
      ...(stream === 'antipattern' ? {
        antipattern_absence_status: 'unknown_absent' as const,
        coverage_reason: 'Domain analysis was unavailable, so neither presence nor tested absence can be claimed.',
      } : {}),
    }))
  );
  return {
    ...summarizeEvidenceCheck(batchId, items, []),
    failed: true,
    failure_reason: `Domain analysis unavailable (${failureCode}).`,
  };
};

const feedbackForRescan = (items: EvidenceCheckItem[]): string => {
  return items
    .map(item => `${item.stream}.${item.id}: scanner=${item.original_count}, verifier=${item.verified_count}, status=${item.status}. ${item.rationale}`)
    .join('\n');
};

const runTargetedRescan = async (
  batchId: string,
  text: string,
  images: ImageInput[],
  ctx: RunContext,
  items: EvidenceCheckItem[]
): Promise<BatchAuditResult & { model_used?: string }> => {
  const definitions = BATCH_DEFINITIONS[batchId];
  const maturityIds = items.filter(i => i.stream === 'maturity').map(i => i.id);
  const antipatternIds = items.filter(i => i.stream === 'antipattern').map(i => i.id);
  const prompt = generateTargetedBatchUserPrompt(
    batchId,
    definitions,
    maturityIds,
    antipatternIds,
    feedbackForRescan(items)
  );
  let lastError: unknown;
  for (let attempt = 1; attempt <= 2; attempt++) {
    try {
      return await runSingleBatch(batchId, text, images, ctx, prompt, 'targeted_rescan', { maturity: maturityIds, antipattern: antipatternIds });
    } catch (error) {
      lastError = error;
    }
  }
  throw lastError;
};

export const runPhase1Audit = async (
  text: string,
  images: ImageInput[],
  onProgress: (completed: number, total: number, batchId?: string) => void,
  ctx: RunContext,
  sourcePackets?: Phase1SourcePackets,
  batchIds: string[] = BATCH_IDS,
): Promise<Phase1Result> => {
  const batches = batchIds.length > 0 ? batchIds : BATCH_IDS;
  const totalBatches = batches.length;

  const aggregated: Phase1Result = {
    phase_1_audit_logs: { maturity: {}, antipattern: {} },
    evidence_check: mergeEvidenceCheckResults([]),
    failed_batches: [],
    models_used: [],
    targeted_rescan_models_used: [],
    evidence_check_models_used: [],
    evidence_adjudication_models_used: [],
    evidence_gap_analysis_models_used: [],
    semantic_gap_retrieval: {
      schema_version: 'semantic_gap_retrieval_trace_v1',
      policy_version: 'weak_evidence_semantic_retrieval_v1',
      mode: 'active',
      scoring_authority: false,
      max_passes: 2,
      passes: []
    },
  };

  let completedCount = 0;
  const modelsSeen = new Set<string>();
  const targetedRescanModelsSeen = new Set<string>();
  const evidenceModelsSeen = new Set<string>();
  const evidenceAdjudicationModelsSeen = new Set<string>();
  const evidenceGapAnalysisModelsSeen = new Set<string>();
  const evidenceResults: EvidenceCheckResult[] = [];

  onProgress(0, totalBatches);

  const auditPromises = batches.map(async (batchId) => {
    const batchStarted = Date.now();
    let lastError: unknown = null;
    for (let attempt = 1; attempt <= 2; attempt++) {
      try {
        const packetInput = packetForBatch(batchId, sourcePackets);
        serverLog(ctx.runId, packetInput.packet.coverage.weak ? 'warn' : 'info', 'source_packet_used', {
          batch: batchId,
          chunks: packetInput.packet.coverage.included_chunks,
          candidates: packetInput.packet.coverage.candidate_chunks,
          weak_coverage: packetInput.packet.coverage.weak,
          fallback: 'none',
          chars: packetInput.text.length,
          images: packetInput.images.length,
          evidence_stage_packet_hash: packetInput.packet.integrity_hash,
        });

        let batchResult = await runSingleBatch(batchId, packetInput.text, packetInput.images, ctx);
        if (!batchResult.maturity && !batchResult.antipattern) {
          throw new Error('Batch returned empty result (no maturity or antipattern keys).');
        }
        if (batchResult.model_used) modelsSeen.add(batchResult.model_used);

        let evidenceCheck = await runEvidenceCheck(batchId, batchResult, packetInput.text, packetInput.images, ctx);
        if (evidenceCheck.model_used) evidenceModelsSeen.add(evidenceCheck.model_used);
        if (evidenceCheck.adjudication_model_used) evidenceAdjudicationModelsSeen.add(evidenceCheck.adjudication_model_used);
        const rescannedKeys = new Set<string>();
        const preRescanCounts = new Map<string, number>();
        const seenTerms = new Set<string>();
        let currentPacket = packetInput.packet;
        for (let pass = 1 as 1 | 2; pass <= 2; pass = (pass + 1) as 1 | 2) {
          const needsRescan = evidenceItemsNeedingRescan(evidenceCheck);
          if (evidenceCheck.failed || needsRescan.length === 0 || !sourcePackets?.expandWeakEvidence) break;
          const expansion = await sourcePackets.expandWeakEvidence({ batchId, items: needsRescan, pass, seenTerms, packet: currentPacket });
          const trace = expansion.trace;
          if (trace.gap_analysis_model) evidenceGapAnalysisModelsSeen.add(trace.gap_analysis_model);
          if (trace.selected_chunk_ids.length === 0) {
            aggregated.semantic_gap_retrieval.passes.push({
              ...trace,
              evidence_status_after: { ...trace.evidence_status_before },
              verdict_change: 'unchanged'
            });
            break;
          }
          currentPacket = expansion.packet;
          serverLog(ctx.runId, 'warn', 'evidence_check_targeted_rescan', {
            batch: batchId,
            criteria_count: needsRescan.length,
            semantic_pass: pass,
            new_chunks: trace.selected_chunk_ids.length,
          });
          try {
            const rescanResult = await runTargetedRescan(batchId, currentPacket.text, currentPacket.images, ctx, needsRescan);
            if (rescanResult.model_used) {
              targetedRescanModelsSeen.add(rescanResult.model_used);
              serverLog(ctx.runId, 'info', 'targeted_rescan_model_used', {
                batch: batchId,
                model: rescanResult.model_used,
                criteria_count: needsRescan.length,
                semantic_pass: pass,
              });
            }
            const rescannedBatchResult = mergeBatchResult(batchResult, rescanResult) as BatchAuditResult & { model_used?: string };
            const rescannedEvidenceCheck = await runEvidenceCheck(batchId, rescannedBatchResult, currentPacket.text, currentPacket.images, ctx);
            if (rescannedEvidenceCheck.failed) {
              aggregated.semantic_gap_retrieval.passes.push({
                ...trace,
                evidence_status_after: { ...trace.evidence_status_before },
                verdict_change: 'verification_unavailable'
              });
              serverLog(ctx.runId, 'warn', 'targeted_rescan_verification_unavailable', {
                batch: batchId,
                criteria_count: needsRescan.length,
                semantic_pass: pass,
                error_code: rescannedEvidenceCheck.failure_reason || 'EVIDENCE_CHECK_FAILED',
                fallback: 'previous_verified_result',
              });
              break;
            }
            batchResult = rescannedBatchResult;
            evidenceCheck = rescannedEvidenceCheck;
            needsRescan.forEach(i => {
              const key = `${i.stream}.${i.id}`;
              rescannedKeys.add(key);
              if (!preRescanCounts.has(key)) preRescanCounts.set(key, i.original_count);
            });
            const evidenceStatusAfter = Object.fromEntries(needsRescan.map(item => {
              const key = `${item.stream}.${item.id}`;
              return [key, evidenceCheck.items.find(candidate => `${candidate.stream}.${candidate.id}` === key)?.status || item.status];
            }));
            const statusRank = { missing: 0, unsupported: 1, weak: 2, supported: 3 } as const;
            const statusDeltas = Object.entries(trace.evidence_status_before).map(([key, before]) =>
              statusRank[evidenceStatusAfter[key]] - statusRank[before]);
            aggregated.semantic_gap_retrieval.passes.push({
              ...trace,
              evidence_status_after: evidenceStatusAfter,
              verdict_change: statusDeltas.some(delta => delta > 0) ? 'improved'
                : statusDeltas.some(delta => delta < 0) ? 'regressed' : 'unchanged'
            });
            if (evidenceCheck.model_used) evidenceModelsSeen.add(evidenceCheck.model_used);
            if (evidenceCheck.adjudication_model_used) evidenceAdjudicationModelsSeen.add(evidenceCheck.adjudication_model_used);
          } catch (error) {
            aggregated.semantic_gap_retrieval.passes.push({
              ...trace,
              evidence_status_after: { ...trace.evidence_status_before },
              verdict_change: 'verification_unavailable'
            });
            serverLog(ctx.runId, 'warn', 'targeted_rescan_unavailable', {
              batch: batchId,
              criteria_count: needsRescan.length,
              semantic_pass: pass,
              error_code: batchFailureCode(error),
              fallback: 'verified_downgrades',
            });
            break;
          }
        }

        if (evidenceCheck.items.length > 0) {
          const evidenceFailure = evidenceCheck.failed;
          const evidenceFailureReason = evidenceCheck.failure_reason;
          const checked = applyEvidenceCheckToBatch(batchResult, evidenceCheck, rescannedKeys);
          batchResult = checked.batch as BatchAuditResult & { model_used?: string };
          const adjustments = checked.adjustments.map(a => {
            const original = preRescanCounts.get(`${a.stream}.${a.id}`);
            return original === undefined ? a : { ...a, original_count: original };
          });
          evidenceCheck = {
            ...summarizeEvidenceCheck(batchId, evidenceCheck.items, adjustments),
            model_used: evidenceCheck.model_used,
            adjudication_model_used: evidenceCheck.adjudication_model_used,
            failed: evidenceFailure,
            failure_reason: evidenceFailureReason,
          };
        }
        evidenceResults.push(evidenceCheck);

        if (batchResult.maturity) Object.assign(aggregated.phase_1_audit_logs.maturity, batchResult.maturity);
        if (batchResult.antipattern) Object.assign(aggregated.phase_1_audit_logs.antipattern, batchResult.antipattern);
        serverLog(ctx.runId, 'info', 'batch_complete', {
          batch: batchId,
          attempt,
          model: batchResult.model_used,
          evidence_check_model: evidenceCheck.model_used || 'n/a',
          evidence_adjudication_model: evidenceCheck.adjudication_model_used || 'n/a',
          evidence_downgrades: evidenceCheck.downgraded_count,
          evidence_rescans: evidenceCheck.rescan_count,
          duration_ms: Date.now() - batchStarted,
        });
        lastError = null;
        break;
      } catch (error: any) {
        lastError = error;
        const failure = batchFailureFields(error);
        console.warn(`[Landing Zone] [${ctx.runId}] Batch ${batchId} attempt ${attempt} failed with error_code=${failure.error_code}.`);
        serverLog(ctx.runId, 'warn', 'batch_attempt_failed', {
          batch: batchId,
          attempt,
          ...failure,
        });
      }
    }
    if (lastError) {
      const failure = batchFailureFields(lastError);
      console.error(`[Landing Zone] [${ctx.runId}] Batch ${batchId} failed after retry. Marking as failed.`);
      aggregated.failed_batches.push(batchId);
      evidenceResults.push(unavailableEvidenceCheck(batchId, failure.error_code));
      serverLog(ctx.runId, 'error', 'batch_failed', { batch: batchId, ...failure });
    }
    completedCount++;
    onProgress(completedCount, totalBatches, batchId);
  });

  await Promise.all(auditPromises);
  aggregated.models_used = Array.from(modelsSeen).sort();
  aggregated.targeted_rescan_models_used = Array.from(targetedRescanModelsSeen).sort();
  aggregated.evidence_check_models_used = Array.from(evidenceModelsSeen).sort();
  aggregated.evidence_adjudication_models_used = Array.from(evidenceAdjudicationModelsSeen).sort();
  aggregated.evidence_gap_analysis_models_used = Array.from(evidenceGapAnalysisModelsSeen).sort();
  aggregated.semantic_gap_retrieval.passes.sort((a, b) =>
    a.domain_id.localeCompare(b.domain_id) || a.pass - b.pass
  );
  aggregated.evidence_check = mergeEvidenceCheckResults(evidenceResults.sort((a, b) => (a.batch_id || '').localeCompare(b.batch_id || '')));
  return aggregated;
};
