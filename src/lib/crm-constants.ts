/**
 * Shared CRM constants — single source of truth for journey stages
 * used by both server actions and API routes.
 */

export const CRM_JOURNEY_STAGES = [
  "visitor",
  "lead",
  "contacted",
  "qualified",
  "negotiation",
  "customer",
  "advocate",
] as const;

export type CrmJourneyStage = (typeof CRM_JOURNEY_STAGES)[number];
