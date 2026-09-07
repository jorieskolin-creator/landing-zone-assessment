
import { ScanResult } from '../types';
import { FINOPS_KEYWORDS } from '../knowledge_base';

export const sanitizeInput = (text: string): string => {
  let clean = text;
  clean = clean.replace(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g, '[EMAIL_REDACTED]');
  clean = clean.replace(/\b\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}\b/g, '[IP_REDACTED]');
  clean = clean.replace(/(?:\+?\d{1,3}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}/g, '[PHONE_REDACTED]');
  clean = clean.replace(/AKIA[0-9A-Z]{16}/g, '[AWS_KEY_REDACTED]');
  clean = clean.replace(/(?:sk-|pk_)[a-zA-Z0-9]{20,}/g, '[API_KEY_REDACTED]');
  return clean;
};

export const scanInputText = (text: string): ScanResult => {
  const cleanText = text.trim();
  const wordCount = cleanText.split(/\s+/).length;

  if (wordCount === 0) {
    return { score: 0, status: 'Insufficient', message: "Waiting for input...", details: [], canRun: false };
  }

  if (wordCount < 50) {
    return { score: 10, status: 'Insufficient', message: "Input too short", details: [`Word count: ${wordCount} (Min: 50).`], canRun: false };
  }

  const lowerText = cleanText.toLowerCase();
  const uniqueKeywords = new Set<string>();
  let weightedScore = 0;

  const categories = FINOPS_KEYWORDS.categories as Record<string, { keywords?: string[]; weight?: number }>;
  const categoryList = Object.values(categories);

  for (const category of categoryList) {
    for (const keyword of category.keywords || []) {
      if (lowerText.includes(keyword)) {
        uniqueKeywords.add(keyword);
        weightedScore += category.weight || 1;
      }
    }
  }

  let structureBonus = 0;
  const foundHeaders: string[] = [];
  for (const header of FINOPS_KEYWORDS.structural_headers) {
    if (lowerText.includes(header)) {
      structureBonus += 5;
      foundHeaders.push(header);
    }
  }
  structureBonus = Math.min(structureBonus, 20);

  let score = 0;
  const details: string[] = [];

  if (wordCount > 100) score += 10;
  if (wordCount > 500) score += 10;

  const keywordScore = Math.min(weightedScore, 60);
  score += keywordScore;
  score += structureBonus;
  score = Math.min(score, 100);

  const coreKeywords = categories.landing_zone_routing?.keywords
    || categories.core_finops_vocabulary?.keywords
    || [];
  const coreCount = coreKeywords.filter((k: string) => lowerText.includes(k)).length;
  const hasCoreTerm = coreCount > 0;

  let status: ScanResult['status'] = 'Insufficient';
  let message = "Irrelevant Content";
  let canRun = false;
  let confidence_warning: string | undefined;

  if (score >= 60 && hasCoreTerm) {
    status = 'Ready';
    message = "High Quality Landing Zone Signal";
    details.push(`Detected ${uniqueKeywords.size} landing-zone-relevant topics (${coreCount} core terms)`);
    if (foundHeaders.length > 0) details.push(`Identified document structure (${foundHeaders.length} headers)`);
    canRun = true;
  } else if (score >= 30) {
    status = hasCoreTerm ? 'Weak' : 'PassWithWarning';
    message = hasCoreTerm ? "Weak Landing Zone Signal" : "Partial Relevance Detected";
    details.push("Some relevant keywords found, but landing-zone context may be thin.");
    if (!hasCoreTerm) {
      confidence_warning = "No core landing-zone terms detected. Document may be tangentially relevant but not a landing-zone artifact.";
      details.push(confidence_warning);
    }
    canRun = true;
  } else {
    status = 'Insufficient';
    message = "Noise Detected";
    details.push("Document appears irrelevant to Landing Zone Assessment (e.g., unrelated business content, personal data, or generic text).");
    canRun = false;
  }

  return { score, status, message, details, canRun, confidence_warning };
};
