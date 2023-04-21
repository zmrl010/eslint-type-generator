import type { TSESLint } from "@typescript-eslint/utils";
import { mkdirp } from "mkdirp";
import path from "path";
import util from "util";
import { GeneratorContext, GeneratorOptions, setupContext } from "./context.js";
import { findPlugins, type Plugin } from "./find-plugins.js";
import { generateRuleTypeFiles } from "./generate-rule-type-files.js";
import { toPascalCase } from "./text-utils.js";

const debug = util.debuglog("generate-types");

export type RuleModule = TSESLint.RuleModule<string, unknown[]>;
export type Rule = RuleModule & {
  name: string;
};
export type RuleRecord = Record<string, Rule>;

function isRuleDeprecated(rule: {
  meta: { deprecated?: boolean };
}): rule is { meta: { deprecated: true } } {
  return rule.meta.deprecated === true;
}

/**
 * Coerce an eslint rule into an object if it is a function-defined rule by
 * assigning to `rule.meta.create` and setting default values for other
 * expected properties. If it is already an object, it will be returned as is.
 *
 * Function rule definitions are technically deprecated by Eslint but
 * its still possible we could import one.
 */
function coerceRuleObject(
  name: string,
  rule: RuleModule | TSESLint.RuleCreateFunction
): Rule {
  if (typeof rule === "function") {
    return {
      name,
      defaultOptions: [],
      meta: {
        messages: {},
        schema: {},
        type: "suggestion",
      },
      create: rule,
    };
  }
  return {
    ...rule,
    name,
  };
}

function normalizeRules(initialRules: Plugin["rules"]): Rule[] {
  return Object.entries(initialRules ?? {})
    .map(([name, rule]) => coerceRuleObject(name, rule))
    .filter((rule) => !isRuleDeprecated(rule));
}

async function generatePluginIndexFile(
  context: GeneratorContext,
  plugin: Plugin,
  rules: Rule[]
) {
  const ruleNames = rules.map(({ name }) => ({
    name,
    safeName: toPascalCase(name.replace(`${plugin.name}/`, "")),
  }));

  const rulePrefix = plugin.name === "eslint" ? "" : `${plugin.name}/`;

  const filePath = path.resolve(context.outDir, plugin.name, "index.ts");

  const textContent = `
    ${ruleNames
      .map(
        (rule) =>
          `import type { ${rule.safeName} } from '../${plugin.name}/${rule.name}.js';`
      )
      .join("\n")}

    /**
     * ${plugin.module} Rules
     */
    export interface ${toPascalCase(plugin.name)} {
      ${ruleNames
        .map((rule) => `'${rulePrefix}${rule.name}': ${rule.safeName};`)
        .join("\n")}
    }
  `;

  await context.writeFormatted(filePath, textContent);

  debug("Wrote types for ", plugin.module);
}

async function processPlugin(context: GeneratorContext, plugin: Plugin) {
  debug(`processing plugin \`%s\``, plugin.module);

  if (!plugin.rules) {
    debug(`no rules found. skipping...`);
    return;
  }

  const rules = normalizeRules(plugin.rules);

  const pluginDir = path.resolve(context.outDir, plugin.name);

  await mkdirp(pluginDir);

  await generateRuleTypeFiles(context, rules, pluginDir);

  await generatePluginIndexFile(context, plugin, rules);
}

export async function generateRuleTypes(
  options: GeneratorOptions
): Promise<void> {
  const context = setupContext(options);
  const plugins = findPlugins();

  for await (const plugin of plugins) {
    processPlugin(context, plugin);
  }

  console.info("Done!");
}
