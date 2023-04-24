import type { JSONSchema } from "@typescript-eslint/utils";
import { compile } from "json-schema-to-typescript";
import path from "path";
import type { GeneratorContext } from "./context.js";
import type { Rule } from "./rule.js";
import { toPascalCase } from "./text-utils.js";

type Schema = JSONSchema.JSONSchema4;

async function compileSchema(
  typeName: string,
  schema: Schema
): Promise<string> {
  const code = await compile(schema, typeName, {
    bannerComment: "",
    format: false,
    strictIndexSignatures: true,
    enableConstEnums: false,
  });

  return code.replace(`${typeName} =`, `${typeName} = 'off' |`);
}

const ruleLevelString = {
  enum: ["off", "error", "warn"],
};

function adjustSchema(schema: Schema): Schema {
  if (schema.anyOf != null) {
    for (const subSchema of schema.anyOf) {
      adjustSchema(subSchema);
    }

    return schema;
  }

  if (Array.isArray(schema.prefixItems)) {
    // some rules use prefixItems instead of items. we can treat them as items
    schema.items = [schema.prefixItems, schema.items ?? []].flat();
  }

  if (Array.isArray(schema.items)) {
    // work around shared / nested schemas
    if (schema.items[0] !== ruleLevelString) {
      schema.items.unshift(ruleLevelString);
    }
  } else if (schema.items !== undefined) {
    if (schema.items.oneOf != null || schema.items.anyOf != null) {
      const additionalItems = schema.items;
      schema.items = [ruleLevelString];
      schema.additionalItems = additionalItems;
    } else {
      schema.items = [ruleLevelString, schema.items];
    }
  } else {
    schema = {
      type: "array",
      items: [ruleLevelString, schema],
    };
  }

  if (typeof schema.minItems === "number") {
    schema.minItems += 1;
  } else {
    schema.minItems = 1;
  }

  if (typeof schema.maxItems === "number") {
    schema.maxItems += 1;
  }

  return schema;
}

function isRefValue(val: unknown): val is string {
  return typeof val === "string" && val.startsWith("#/");
}

function recursivelyFixRefs(
  schema: Schema | string | null | boolean,
  index: number
): void {
  if (schema == null || typeof schema !== "object") {
    return;
  }

  for (const key in schema) {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment -- known safe
    const current = schema[key];
    if (current == null) {
      continue;
    }

    if (Array.isArray(current)) {
      current.forEach((subSchema, i) => {
        recursivelyFixRefs(subSchema, i);
      });
    } else if (key === "$ref" && isRefValue(current)) {
      schema[key] = `#/items/${index + 1}/${current.substring(2)}`;
    } else if (typeof current === "object") {
      recursivelyFixRefs(current, index);
    }
  }
}

type RuleSchema = Schema | readonly Schema[];

function normalizeSchema(schema: RuleSchema): Schema {
  if (Array.isArray(schema)) {
    const schemaArray: Schema[] = schema;

    schema.forEach((ref, i) => {
      recursivelyFixRefs(ref, i);
    });

    return {
      type: "array",
      items: [ruleLevelString, ...schemaArray],
      minItems: 1,
    };
  }

  return adjustSchema(schema);
}

/**
 * Generate rule type definitions as a string
 */
async function generateRuleTypeDef(rule: Rule): Promise<string> {
  const typeName = toPascalCase(rule.name);
  const schema = normalizeSchema(rule.meta?.schema ?? []);

  const { docs } = rule.meta;
  if (docs) {
    schema.description = docs.description;

    if (docs.url) {
      schema.description += `\n@see${docs.url}`;
    }
  }

  return compileSchema(typeName, schema);
}

export async function generateRuleTypes(
  context: GeneratorContext,
  rules: Rule[],
  directory: string
): Promise<void> {
  for await (const rule of rules) {
    const ruleTypeDef = await generateRuleTypeDef(rule);

    const filepath = path.resolve(directory, `${rule.name}.ts`);

    context.writeFormatted(filepath, ruleTypeDef);

    console.info(
      "Successfully wrote ",
      rule.name,
      " types to:\n",
      path.relative(context.cwd, filepath)
    );
  }
}
