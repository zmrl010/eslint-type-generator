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
function readDependencies(options: Options = {}) {
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
 * Get plugin name from module name
 */
function getPluginName(module: string): string {
  return module
    .replace(/^eslint-plugin-/u, "")
    .replace(/\/eslint-plugin$/u, "")
    .replace(/\/eslint-plugin-/u, "/");
}

async function loadPlugin(module: string): Promise<Plugin> {
  const name = getPluginName(module);

  const { rules } = (await loadModule(module)) as TSESLint.Linter.Plugin;

  return {
    name,
    module,
    rules,
  };
}

/**
 * Find Eslint plugin modules and return a list of promises that
 * resolve to a dynamically loaded module
 *
 * @returns array of all installed eslint plugins, including eslint core
 */
export function findPlugins(): Promise<Plugin>[] {
  const dependencies = readDependencies();

  return Object.keys(dependencies)
    .filter(isEslintPlugin)
    .map(loadPlugin)
    .concat(getEslintCoreAsPlugin());
}
