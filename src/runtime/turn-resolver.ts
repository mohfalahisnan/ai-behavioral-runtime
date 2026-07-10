import type { CategoryId, ModifierId, JsonObject, ModelExecutor } from "../spec/index.js";

export interface ClassificationResult {
  readonly categoryId: CategoryId;
  readonly modifierIds: readonly ModifierId[];
  readonly confidence: number;
}

export interface TurnResolverOptions {
  readonly executor?: ModelExecutor | undefined;
  readonly categories: readonly { readonly id: CategoryId; readonly keywords: readonly string[] }[];
  readonly modifiers: readonly { readonly id: ModifierId; readonly keywords: readonly string[] }[];
}

export class TurnResolver {
  readonly #executor: ModelExecutor | undefined;
  readonly #categories: readonly { readonly id: CategoryId; readonly keywords: readonly string[] }[];
  readonly #modifiers: readonly { readonly id: ModifierId; readonly keywords: readonly string[] }[];

  constructor(options: TurnResolverOptions) {
    this.#executor = options.executor;
    this.#categories = options.categories;
    this.#modifiers = options.modifiers;
  }

  async resolve(turn: string, context?: JsonObject): Promise<ClassificationResult> {
    if (this.#executor) {
      try {
        const result = await this.#executor.execute({
          runId: `resolve-${Date.now()}`,
          phaseId: "classification",
          contract: {
            rules: [],
            step: {
              id: "classify-turn",
              kind: "reasoning",
              version: "1.0.0",
              objective: "Classify the user turn into category and modifiers.",
              inputContract: { description: "User turn text", requiredFields: [] },
              outputContract: {
                description: "Classification labels",
                requiredFields: ["categoryId", "modifierIds", "confidence"],
              },
              completionCriteria: [],
              allowedTransitions: [],
            },
            categoryId: "classification" as any,
            modifierIds: [],
            constraints: [],
            ignoredConstraints: [],
            constraintIdAliases: {},
            reasoning: { universal: [], category: [], strategies: [] },
          },
          context: {
            turn,
            categories: this.#categories.map((c) => c.id),
            modifiers: this.#modifiers.map((m) => m.id),
          },
        });

        const categoryId = String(result.output.categoryId);
        const modifierIds = Array.isArray(result.output.modifierIds)
          ? result.output.modifierIds.map(String)
          : [];
        const confidence = typeof result.output.confidence === "number" ? result.output.confidence : 1.0;

        return { categoryId, modifierIds, confidence };
      } catch (error) {
        // Fall back to heuristic classification
      }
    }

    // Heuristic Classification Fallback
    const lowerTurn = turn.toLowerCase();
    let bestCategory: CategoryId = "discussion";
    let maxMatches = 0;

    for (const cat of this.#categories) {
      let matches = 0;
      for (const keyword of cat.keywords) {
        if (lowerTurn.includes(keyword)) {
          matches++;
        }
      }
      if (matches > maxMatches) {
        maxMatches = matches;
        bestCategory = cat.id;
      }
    }

    const modifierIds: ModifierId[] = [];
    for (const mod of this.#modifiers) {
      for (const keyword of mod.keywords) {
        if (lowerTurn.includes(keyword)) {
          modifierIds.push(mod.id);
          break;
        }
      }
    }

    return {
      categoryId: bestCategory,
      modifierIds,
      confidence: maxMatches > 0 ? 0.7 : 0.5,
    };
  }
}
