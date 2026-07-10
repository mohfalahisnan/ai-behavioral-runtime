import type { JsonArray, JsonObject } from "../src/spec/index.js";

const nestedArray: JsonArray = [
  "text",
  42,
  true,
  null,
  ["nested", { safe: "value" }],
];

const nestedObject: JsonObject = {
  name: "runtime",
  enabled: true,
  metadata: {
    version: 3,
    tags: ["declarative", "portable"],
  },
  values: nestedArray,
};

void nestedObject;

// @ts-expect-error Functions are not JSON values.
const functionValue: JsonObject = { invalid: () => "not json" };

// @ts-expect-error Undefined is not a JSON value.
const undefinedValue: JsonObject = { invalid: undefined };

// @ts-expect-error Mutable Map instances are not plain JSON objects.
const mutableNonJsonValue: JsonObject = { invalid: new Map([["key", "value"]]) };

void functionValue;
void undefinedValue;
void mutableNonJsonValue;
