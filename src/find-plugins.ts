import type { TSESLint } from "@typescript-eslint/utils";
import { Options, readPackageUpSync } from "read-pkg-up";
import { loadModule } from "./load-module.js";

/**
 * Eslint plugin object
 *
 * @example
 * const sveltePlugin = {
 *   name: 'eslint-plugin-svelte',
 *   shortName: 'svelte'
 *   rules: {...}
 * } satisfies Plugin
 */
export type Plugin = {
  /**
   * Shortened plugin name (if applicable)
   */
  shortName: string;
  /**
   * Plugin name - should match module name
   */
  name: string;
  rules: TSESLint.Linter.Plugin["rules"];
};

/**
 * Get core rules in the same shape as a plugin with rules
 */
async function getEslintCoreAsPlugin(): Promise<Plugin> {
  const { builtinRules } = await import("eslint/use-at-your-own-risk");

  return {
    name: "eslint",
    rules: Object.fromEntries(builtinRules.entries()),
    shortName: "eslint",
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
 * Get plugin name stripped of generic plugin naming conventions
 */
function stripPluginName(name: string): string {
  return name
    .replace(/^eslint-plugin-/u, "")
    .replace(/\/eslint-plugin$/u, "")
    .replace(/\/eslint-plugin-/u, "/");
}

async function loadPlugin(name: string): Promise<Plugin> {
  const shortName = stripPluginName(name);

  const { rules } = (await loadModule(name)) as TSESLint.Linter.Plugin;

  return {
    shortName,
    name,
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
