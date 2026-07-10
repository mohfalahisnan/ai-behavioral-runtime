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

function aliasEntries(source: unknown): readonly (readonly [string, string])[] {
  if (source instanceof Map) {
    return [...source.entries()].filter(
      (entry): entry is [string, string] =>
        typeof entry[0] === "string" && typeof entry[1] === "string",
    );
  }
  if (!source || typeof source !== "object") return [];
  return Object.keys(source).flatMap((alias) => {
    const target = (source as Record<string, unknown>)[alias];
    return typeof target === "string" ? [[alias, target] as const] : [];
  });
}

function createAliasMap(source?: unknown): Record<string, string> {
  const aliases = Object.create(null) as Record<string, string>;
  for (const [alias, target] of aliasEntries(source)) aliases[alias] = target;
  return aliases;
}

function ownAlias(
  aliases: Readonly<Record<string, string>> | undefined,
  constraintId: string,
): string | undefined {
  return aliases && Object.prototype.hasOwnProperty.call(aliases, constraintId)
    ? aliases[constraintId]
    : undefined;
}

function compareConstraintIds(left: string, right: string): number {
  return left < right ? -1 : left > right ? 1 : 0;
}

function describeAliasCycle(cycle: readonly string[]): string {
  let firstIndex = 0;
  for (let index = 1; index < cycle.length; index += 1) {
    if (compareConstraintIds(cycle[index]!, cycle[firstIndex]!) < 0) {
      firstIndex = index;
    }
  }
  const ordered = [...cycle.slice(firstIndex), ...cycle.slice(0, firstIndex)];
  return [...ordered, ordered[0]].join(" -> ");
}

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
      constraintIdAliases: Object.freeze(createAliasMap()),
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
    const constraintIdAliases = createAliasMap(snapshot.constraintIdAliases);
    for (const constraint of registeredConstraints) {
      constraintIdAliases[constraint.id] ??= constraint.id;
    }
    const byId = new Map(
      registeredConstraints.map((constraint) => [constraint.id, constraint]),
    );
    const byCanonical = new Map(
      registeredConstraints.map((constraint) => [
        canonicalConstraintValue(constraint),
        constraint,
      ]),
    );
    const activeIds = new Set(constraints.map((constraint) => constraint.id));

    for (const candidate of incoming) {
      const canonicalValue = canonicalConstraintValue(candidate);
      const sameId = byId.get(ownAlias(constraintIdAliases, candidate.id) ?? candidate.id);
      if (sameId && canonicalConstraintValue(sameId) !== canonicalValue) {
        throw new ConstraintCollisionError(candidate.id);
      }
      const existing = sameId ?? byCanonical.get(canonicalValue);
      if (existing) {
        constraintIdAliases[candidate.id] = existing.id;
        history.push(
          this.#historyEntry(
            history.length + 1,
            candidate,
            phaseId,
            "reaffirmed",
            existing.id,
          ),
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
      byCanonical.set(canonicalValue, registered);
      constraintIdAliases[registered.id] = registered.id;
      activeIds.add(registered.id);
      history.push(
        this.#historyEntry(history.length + 1, candidate, phaseId, "registered"),
      );
    }

    return Object.freeze({
      constraints: Object.freeze(constraints),
      registeredConstraints: Object.freeze(registeredConstraints),
      constraintIdAliases: Object.freeze(constraintIdAliases),
      history: Object.freeze(history),
    });
  }

  activate(
    snapshot: ConstraintRegistrySnapshot,
    constraintIds: readonly string[],
  ): ConstraintRegistrySnapshot {
    const aliases = createAliasMap(snapshot.constraintIdAliases);
    if (Object.keys(aliases).length === 0) {
      for (const constraint of snapshot.registeredConstraints) {
        aliases[constraint.id] = constraint.id;
      }
    }
    const requested = new Set(this.resolveConstraintIds(snapshot, constraintIds));
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
      constraintIdAliases: Object.freeze(createAliasMap(aliases)),
      history: snapshot.history,
    });
  }

  normalize(snapshot: ConstraintRegistrySnapshot): ConstraintRegistrySnapshot {
    const sourceRegistered = snapshot.registeredConstraints ?? snapshot.constraints;
    const registeredConstraints: Constraint[] = [];
    const byCanonical = new Map<string, Constraint>();
    const canonicalById = new Map<string, string>();
    const constraintIdAliases = createAliasMap();

    for (const candidate of sourceRegistered) {
      const canonicalValue = canonicalConstraintValue(candidate);
      const priorCanonical = canonicalById.get(candidate.id);
      if (priorCanonical && priorCanonical !== canonicalValue) {
        throw new ConstraintCollisionError(candidate.id);
      }
      canonicalById.set(candidate.id, canonicalValue);
      const existing = byCanonical.get(canonicalValue);
      if (existing) {
        constraintIdAliases[candidate.id] = existing.id;
        continue;
      }
      registeredConstraints.push(candidate);
      byCanonical.set(canonicalValue, candidate);
      constraintIdAliases[candidate.id] = candidate.id;
    }

    const activeIds = new Set<string>();
    for (const constraint of snapshot.constraints) {
      const canonicalValue = canonicalConstraintValue(constraint);
      const priorCanonical = canonicalById.get(constraint.id);
      if (priorCanonical !== undefined && priorCanonical !== canonicalValue) {
        throw new ConstraintCollisionError(constraint.id);
      }
      const registered = byCanonical.get(canonicalValue);
      if (!registered) {
        throw new Error(
          `Active constraint '${constraint.id}' is not present in the registered constraint catalog`,
        );
      }
      canonicalById.set(constraint.id, canonicalValue);
      constraintIdAliases[constraint.id] = registered.id;
      activeIds.add(registered.id);
    }

    const providedAliases = snapshot.constraintIdAliases as unknown;
    const providedEntries = [...aliasEntries(providedAliases)].sort(([left], [right]) =>
      compareConstraintIds(left, right),
    );
    const providedByAlias = new Map(providedEntries);
    const canonicalIds = new Set(
      registeredConstraints.map((constraint) => constraint.id),
    );
    const derivedAliases = createAliasMap(constraintIdAliases);
    const resolvedAliases = new Map<string, string>();

    for (const [alias, target] of providedEntries) {
      if (canonicalIds.has(alias) && target !== alias) {
        throw new Error(
          `Canonical constraint ID '${alias}' cannot alias '${target}'`,
        );
      }
    }

    const resolveAlias = (alias: string): string => {
      const cached = resolvedAliases.get(alias);
      if (cached !== undefined) return cached;

      const path: string[] = [];
      const pathIndexes = new Map<string, number>();
      let current = alias;
      let canonicalId: string;

      while (true) {
        if (canonicalIds.has(current)) {
          canonicalId = current;
          break;
        }
        const resolved = resolvedAliases.get(current);
        if (resolved !== undefined) {
          canonicalId = resolved;
          break;
        }
        const derived = ownAlias(derivedAliases, current);
        const providedTarget = providedByAlias.get(current);
        if (
          derived !== undefined &&
          derived !== current &&
          providedTarget === current
        ) {
          canonicalId = derived;
          break;
        }
        if (!providedByAlias.has(current) && derived !== undefined) {
          canonicalId = derived;
          break;
        }
        const cycleIndex = pathIndexes.get(current);
        if (cycleIndex !== undefined) {
          throw new Error(
            `Constraint alias cycle detected: ${describeAliasCycle(path.slice(cycleIndex))}`,
          );
        }

        if (providedTarget === undefined) {
          throw new Error(
            `Constraint alias '${path.at(-1) ?? alias}' targets unknown constraint ID '${current}'`,
          );
        }
        pathIndexes.set(current, path.length);
        path.push(current);
        current = providedTarget;
      }

      for (const visited of path) resolvedAliases.set(visited, canonicalId);
      return canonicalId;
    };

    for (const [alias] of providedEntries) {
      const canonicalId = resolveAlias(alias);
      const derived = ownAlias(derivedAliases, alias);
      if (derived !== undefined && canonicalId !== derived) {
        throw new Error(
          `Constraint alias '${alias}' cannot resolve to '${canonicalId}'; canonical mapping is '${derived}'`,
        );
      }
      constraintIdAliases[alias] = canonicalId;
    }

    const constraints = registeredConstraints.filter((constraint) =>
      activeIds.has(constraint.id),
    );
    const aliasesMatch =
      Object.getPrototypeOf(snapshot.constraintIdAliases ?? {}) === null &&
      Object.keys(constraintIdAliases).length === aliasEntries(providedAliases).length &&
      Object.entries(constraintIdAliases).every(
        ([alias, target]) => ownAlias(snapshot.constraintIdAliases, alias) === target,
      );
    const registeredMatch =
      registeredConstraints.length === sourceRegistered.length &&
      registeredConstraints.every((constraint, index) => constraint === sourceRegistered[index]);
    const activeMatch =
      constraints.length === snapshot.constraints.length &&
      constraints.every((constraint, index) => constraint === snapshot.constraints[index]);
    if (aliasesMatch && registeredMatch && activeMatch) return snapshot;

    return Object.freeze({
      constraints: Object.freeze(constraints),
      registeredConstraints: Object.freeze(registeredConstraints),
      constraintIdAliases: Object.freeze(constraintIdAliases),
      history: snapshot.history,
    });
  }

  resolveConstraintIds(
    snapshot: ConstraintRegistrySnapshot,
    constraintIds: readonly string[],
  ): readonly string[] {
    const aliases = snapshot.constraintIdAliases;
    const resolved: string[] = [];
    for (const constraintId of constraintIds) {
      const canonicalId = ownAlias(aliases, constraintId) ?? constraintId;
      if (!resolved.includes(canonicalId)) resolved.push(canonicalId);
    }
    return Object.freeze(resolved);
  }

  resolveRegisteredIds(
    snapshot: ConstraintRegistrySnapshot,
    constraints: readonly Constraint[],
  ): readonly string[] {
    const byCanonical = new Map(
      snapshot.registeredConstraints.map((constraint) => [
        canonicalConstraintValue(constraint),
        constraint.id,
      ]),
    );
    const resolved: string[] = [];
    for (const constraint of constraints) {
      const registeredId = byCanonical.get(canonicalConstraintValue(constraint));
      if (!registeredId) {
        throw new Error(`Constraint is not registered: ${constraint.id}`);
      }
      if (!resolved.includes(registeredId)) resolved.push(registeredId);
    }
    return Object.freeze(resolved);
  }

  select(
    snapshot: ConstraintRegistrySnapshot,
    selector: ConstraintSelector | undefined,
    stepId: StepId,
  ): ConstraintSelection {
    const aliases = snapshot.constraintIdAliases;
    const resolveId = (constraintId: string): string =>
      ownAlias(aliases, constraintId) ?? constraintId;
    const include = new Set((selector?.include ?? []).map(resolveId));
    const exclude = new Set((selector?.exclude ?? []).map(resolveId));
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
    constraintId = constraint.id,
  ): ConstraintHistoryEntry {
    return Object.freeze({
      sequence,
      constraintId,
      phaseId,
      action,
      ...(constraint.origin
        ? { origin: Object.freeze({ ...constraint.origin }) }
        : {}),
    });
  }
}
