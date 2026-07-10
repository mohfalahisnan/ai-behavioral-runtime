import type {
  Constraint,
  ConstraintHistoryEntry,
  ConstraintRegistrySnapshot,
  ConstraintSelection,
  ConstraintSelector,
  IgnoredConstraintSelection,
  PhaseId,
  StepId,
} from "../spec/index.js";
import { canonicalConstraintValue } from "./extractor.js";

export class ConstraintCollisionError extends Error {
  constructor(constraintId: string) {
    super(`Constraint ID collision detected for '${constraintId}'`);
    this.name = "ConstraintCollisionError";
  }
}

export class ConstraintRegistry {
  empty(): ConstraintRegistrySnapshot {
    return Object.freeze({
      constraints: Object.freeze([]),
      registeredConstraints: Object.freeze([]),
      history: Object.freeze([]),
    });
  }

  register(
    snapshot: ConstraintRegistrySnapshot,
    incoming: readonly Constraint[],
    phaseId: PhaseId,
  ): ConstraintRegistrySnapshot {
    const constraints = [...snapshot.constraints];
    const registeredConstraints = [...snapshot.registeredConstraints];
    const history = [...snapshot.history];
    const byId = new Map(
      registeredConstraints.map((constraint) => [constraint.id, constraint]),
    );
    const activeIds = new Set(constraints.map((constraint) => constraint.id));

    for (const candidate of incoming) {
      const existing = byId.get(candidate.id);
      if (existing) {
        if (canonicalConstraintValue(existing) !== canonicalConstraintValue(candidate)) {
          throw new ConstraintCollisionError(candidate.id);
        }
        history.push(
          this.#historyEntry(history.length + 1, candidate, phaseId, "reaffirmed"),
        );
        if (!activeIds.has(existing.id)) {
          constraints.push(existing);
          activeIds.add(existing.id);
        }
        continue;
      }

      const registered = this.#copyConstraint(candidate);
      constraints.push(registered);
      registeredConstraints.push(registered);
      byId.set(registered.id, registered);
      activeIds.add(registered.id);
      history.push(
        this.#historyEntry(history.length + 1, candidate, phaseId, "registered"),
      );
    }

    return Object.freeze({
      constraints: Object.freeze(constraints),
      registeredConstraints: Object.freeze(registeredConstraints),
      history: Object.freeze(history),
    });
  }

  activate(
    snapshot: ConstraintRegistrySnapshot,
    constraintIds: readonly string[],
  ): ConstraintRegistrySnapshot {
    const requested = new Set(constraintIds);
    const knownIds = new Set(
      snapshot.registeredConstraints.map((constraint) => constraint.id),
    );
    const unknown = [...requested].filter((constraintId) => !knownIds.has(constraintId));
    if (unknown.length > 0) {
      throw new Error(`Cannot activate unknown constraints: ${unknown.join(", ")}`);
    }

    return Object.freeze({
      constraints: Object.freeze(
        snapshot.registeredConstraints.filter((constraint) => requested.has(constraint.id)),
      ),
      registeredConstraints: snapshot.registeredConstraints,
      history: snapshot.history,
    });
  }

  select(
    snapshot: ConstraintRegistrySnapshot,
    selector: ConstraintSelector | undefined,
    stepId: StepId,
  ): ConstraintSelection {
    const include = new Set(selector?.include ?? []);
    const exclude = new Set(selector?.exclude ?? []);
    const includeAllApplicable = selector?.includeAllApplicable ?? true;
    const relevant: Constraint[] = [];
    const ignored: IgnoredConstraintSelection[] = [];

    for (const constraint of snapshot.constraints) {
      if (exclude.has(constraint.id)) {
        ignored.push({
          constraintId: constraint.id,
          reason: "explicitly_excluded",
        });
        continue;
      }
      if (include.has(constraint.id)) {
        relevant.push(constraint);
        continue;
      }
      if (!includeAllApplicable) {
        ignored.push({
          constraintId: constraint.id,
          reason: "include_all_applicable_disabled",
        });
        continue;
      }
      if (constraint.appliesTo === undefined || constraint.appliesTo.includes(stepId)) {
        relevant.push(constraint);
        continue;
      }
      ignored.push({
        constraintId: constraint.id,
        reason: "not_applicable_to_step",
      });
    }

    return {
      relevant: Object.freeze(relevant),
      ignored: Object.freeze(ignored),
    };
  }

  #copyConstraint(constraint: Constraint): Constraint {
    return Object.freeze({
      ...constraint,
      ...(constraint.appliesTo !== undefined
        ? { appliesTo: Object.freeze([...constraint.appliesTo]) }
        : {}),
      ...(constraint.origin
        ? { origin: Object.freeze({ ...constraint.origin }) }
        : {}),
    });
  }

  #historyEntry(
    sequence: number,
    constraint: Constraint,
    phaseId: PhaseId,
    action: ConstraintHistoryEntry["action"],
  ): ConstraintHistoryEntry {
    return Object.freeze({
      sequence,
      constraintId: constraint.id,
      phaseId,
      action,
      ...(constraint.origin
        ? { origin: Object.freeze({ ...constraint.origin }) }
        : {}),
    });
  }
}
