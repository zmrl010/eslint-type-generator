import type { TSESLint } from "@typescript-eslint/utils";
import { mkdirp } from "mkdirp";
import path from "path";
import util from "util";
import { GeneratorContext, GeneratorOptions, setupContext } from "./context.js";
import { findPlugins, type Plugin } from "./find-plugins.js";
import { generateRuleTypes } from "./generate-rule-types.js";
import { Rule, RuleModule } from "./rule.js";
import { toPascalCase } from "./text-utils.js";

const debug = util.debuglog("generate-types");

/**
 * Coerce an eslint rule into an object if it is a function-defined rule by
 * assigning to `rule.meta.create` and setting default values for other
 * expected properties. If the rule is already an object, it will be returned
 * as is.
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

  return { ...rule, name };
}

function normalizeRules(initialRules: Plugin["rules"]): Rule[] {
  return Object.entries(initialRules ?? {})
    .map(([name, rule]) => coerceRuleObject(name, rule))
    .filter((rule) => rule.meta.deprecated !== true);
}

async function generatePluginIndexFile(
  context: GeneratorContext,
  plugin: Plugin,
  rules: Rule[]
) {
  const ruleNames = rules.map(({ name }) => ({
    name,
    safeName: toPascalCase(name.replace(`${plugin.shortName}/`, "")),
  }));

  const rulePrefix =
    plugin.shortName === "eslint" ? "" : `${plugin.shortName}/`;

  const filePath = path.resolve(context.outDir, plugin.shortName, "index.ts");

  const textContent = `
    ${ruleNames
      .map(
        (rule) => `import type { ${rule.safeName} } from './${rule.name}.js';`
      )
      .join("\n")}

    /**
     * ${plugin.name} Rules
     */
    export interface ${toPascalCase(plugin.shortName)} {
      ${ruleNames
        .map((rule) => `'${rulePrefix}${rule.name}': ${rule.safeName};`)
        .join("\n")}
    }
  `;

  await context.writeFormatted(filePath, textContent);

  debug("Wrote types for ", plugin.name);
}

async function processPlugin(context: GeneratorContext, plugin: Plugin) {
  debug(`processing plugin \`%s\``, plugin.name);

  if (!plugin.rules) {
    debug(`no rules found. skipping...`);
    return;
  }

  const rules = normalizeRules(plugin.rules);

  const pluginDir = path.resolve(context.outDir, plugin.shortName);

  await mkdirp(pluginDir);

  await generateRuleTypes(context, rules, pluginDir);

  await generatePluginIndexFile(context, plugin, rules);
}

export async function generatePluginTypes(
  options: GeneratorOptions
): Promise<void> {
  const context = setupContext(options);
  const plugins = findPlugins();

  for await (const plugin of plugins) {
    processPlugin(context, plugin);
  }

  console.info("Done!");
}
