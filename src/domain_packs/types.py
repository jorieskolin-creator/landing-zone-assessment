"""Typed shapes for AssessmentDomainPack. Runtime validation lives in validate.py."""

from __future__ import annotations

from typing import Any, TypedDict


class PackInvariants(TypedDict, total=False):
    designAreaCount: int
    pairsPerDesignArea: int
    subCriteriaPerCriterion: int
    capabilityCount: int
    antipatternCount: int
    criterionCount: int
    questionnaireCount: int
    providers: list[str]


class AssessmentDomainPack(TypedDict):
    packId: str
    version: str
    schemaVersion: str
    designAreas: list[dict[str, Any]]
    criteria: list[dict[str, Any]]
    pairs: list[dict[str, Any]]
    providers: dict[str, Any]
    evidenceTaxonomy: dict[str, Any]
    routingPolicy: dict[str, Any]
    validationRules: dict[str, Any]
    personas: dict[str, Any]
    knowledgeBase: dict[str, Any]
    tactics: list[dict[str, Any]]
    tacticBindings: list[dict[str, Any]]
    scoringPolicy: dict[str, Any]
    qualityGatePolicy: dict[str, Any]
    reportVocabulary: dict[str, Any]
    questionnaire: list[dict[str, Any]]
    prompts: list[dict[str, Any]]
    invariants: PackInvariants
    sourceDirectory: str
