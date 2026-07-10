import type {
  ConstraintId,
  ConstraintKind,
  ConstraintSource,
  ExplicitConstraintInput,
  ExtractedConstraint,
  StepId,
} from "../spec/index.js";

export type ConstraintIdGenerator = (canonicalValue: string) => ConstraintId;

interface CanonicalConstraintInput {
  readonly kind: ConstraintKind;
  readonly rule: string;
  readonly source: ConstraintSource;
  readonly appliesTo?: readonly StepId[];
}

export function normalizeConstraintInstruction(instruction: string): string {
  return instruction.trim().replace(/\s+/gu, " ");
}

export function normalizeConstraintApplicability(
  appliesTo: readonly StepId[] | undefined,
): readonly StepId[] | undefined {
  return appliesTo === undefined
    ? undefined
    : [...new Set(appliesTo)].sort((left, right) =>
        left < right ? -1 : left > right ? 1 : 0,
      );
}

/** Canonical semantic value used for stable IDs and collision checks. */
export function canonicalConstraintValue(input: CanonicalConstraintInput): string {
  const appliesTo = normalizeConstraintApplicability(input.appliesTo);
  return JSON.stringify([
    input.kind,
    normalizeConstraintInstruction(input.rule),
    input.source,
    appliesTo ?? null,
  ]);
}

export const generateConstraintId: ConstraintIdGenerator = (canonicalValue) => {
  let hash = 0xcbf29ce484222325n;
  for (const byte of new TextEncoder().encode(canonicalValue)) {
    hash ^= BigInt(byte);
    hash = BigInt.asUintN(64, hash * 0x100000001b3n);
  }
  return `constraint_${hash.toString(16).padStart(16, "0")}`;
};

export class ConstraintExtractor {
  constructor(private readonly idGenerator: ConstraintIdGenerator = generateConstraintId) {}

  extract(input: ExplicitConstraintInput): ExtractedConstraint {
    const rule = normalizeConstraintInstruction(input.instruction);
    if (rule.length === 0) {
      throw new Error("Explicit constraint instruction cannot be empty");
    }

    const appliesTo = normalizeConstraintApplicability(input.appliesTo);
    const id = this.idGenerator(
      canonicalConstraintValue({
        kind: input.kind,
        rule,
        source: input.source,
        ...(appliesTo !== undefined ? { appliesTo } : {}),
      }),
    );
    if (id.length === 0) {
      throw new Error("Constraint ID generator returned an empty ID");
    }

    return {
      id,
      kind: input.kind,
      rule,
      source: input.source,
      priority: input.priority ?? 100,
      overridable: input.overridable ?? false,
      ...(appliesTo !== undefined ? { appliesTo } : {}),
      origin: {
        originalInstruction: input.instruction,
        normalizedInstruction: rule,
      },
    };
  }
}
