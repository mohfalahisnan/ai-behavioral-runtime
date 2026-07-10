import type {
  CategoryId,
  Confidence,
  ModifierId,
  PhaseId,
} from "./primitives.js";

export type PhaseStatus = "pending" | "active" | "blocked" | "completed";

export interface InteractionPhase {
  readonly id: PhaseId;
  readonly categoryId: CategoryId;
  readonly modifierIds?: readonly ModifierId[];
  readonly status: PhaseStatus;
  readonly objective: string;
  readonly confidence?: Confidence;
  readonly blockedReason?: string;
}

export interface PhaseResolution {
  readonly phases: readonly InteractionPhase[];
}
