import type { TSESLint } from "@typescript-eslint/utils";
import { Options, readPackageUpSync } from "read-pkg-up";
import { loadModule } from "./load-module.js";

type PluginRules = TSESLint.Linter.Plugin["rules"] | null;

export type Plugin = {
  name: string;
  module: string;
  rules: PluginRules;
};

async function getEslintCoreAsPlugin(): Promise<Plugin> {
  const { builtinRules } = await import("eslint/use-at-your-own-risk");

  return {
    module: "eslint",
    rules: Object.fromEntries(builtinRules.entries()),
    name: "eslint",
  };
}

/**
 * Read dependencies from the closest packageJson
 */
function readPackageDependencies(options: Options = {}) {
  return readPackageUpSync(options)?.packageJson?.dependencies ?? {};
}

/**
 * Test if a module is an eslint-plugin based on it's name
 *
 * @param module name of module to test
 */
function isEslintPlugin(module: string): boolean {
  return (
    module.startsWith("eslint-plugin-") ||
    module.endsWith("/eslint-plugin") ||
    module.includes("/eslint-plugin-")
  );
}

/**
 * Derive plugin name by removing the eslint-plugin identifier
 */
function cleanPluginName(module: string): string {
  return module
    .replace(/^eslint-plugin-/u, "")
    .replace(/\/eslint-plugin$/u, "")
    .replace(/\/eslint-plugin-/u, "/");
}

/**
 * Find Eslint plugin modules and return a list of promises that
 * resolve to a dynamically loaded module
 *
 * @returns array of all installed eslint plugins, including eslint core
 */
export function loadEslintPlugins(): Promise<Plugin>[] {
  const dependencies = readPackageDependencies();

  return Object.keys(dependencies)
    .filter(isEslintPlugin)
    .map(async (module) => {
      const name = cleanPluginName(module);

      const plugin = (await loadModule(module)) as TSESLint.Linter.Plugin;

      return {
        name,
        module,
        rules: plugin.rules ? { ...plugin.rules } : null,
      } as Plugin;
    })
    .concat(getEslintCoreAsPlugin());
}
