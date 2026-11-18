import type { LzSourceKind } from '../../acquisition/landingZoneSourceClassification';
import expectations from './retrieval-expectations.json';
import { LANDING_ZONE_PACK } from '../loadLandingZonePack';

type RetrievalExpectation = { kinds: LzSourceKind[]; groups: string[][] };

export const normalizeRetrievalText = (value: string): string => value
  .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
  .toLowerCase()
  .normalize('NFKD')
  .replace(/[\u0300-\u036f]/g, '')
  .replace(/[^a-z0-9]+/g, ' ')
  .trim();

export const retrievalExpectation = (criterionId: string): RetrievalExpectation | undefined => {
  const criterion = LANDING_ZONE_PACK.criteria.find(item => item.id === criterionId);
  return criterion && (expectations as Record<string, RetrievalExpectation>)[criterion.intent_id];
};

export const termsForCoverageItem = (itemId: string): string[] => {
  const [criterionId, group] = itemId.split(':');
  return retrievalExpectation(criterionId)?.groups[Number(group)] || [];
};
