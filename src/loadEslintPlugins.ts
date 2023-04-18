import type { TSESLint } from '@typescript-eslint/utils';
import { readPackageUpSync } from 'read-pkg-up';

export type Plugin = {
  name: string;
  rules: Record<string, TSESLint.RuleModule<string, unknown[]>>;
  shortName: string;
};

export type PendingPlugin = {
  name: string;
  rules: TSESLint.Linter.Plugin['rules'] | null;
  shortName: string;
};

async function getEslintCoreAsPlugin(): Promise<PendingPlugin> {
  const { builtinRules: eslintRules } = await import(
    'eslint/use-at-your-own-risk'
  );

  return {
    name: 'eslint',
    rules: Object.fromEntries(eslintRules.entries()),
    shortName: 'eslint',
  };
}

function getPackageDependencies() {
  return readPackageUpSync()?.packageJson?.dependencies ?? {};
}

async function loadPluginModule(
  pluginName: string
): Promise<TSESLint.Linter.Plugin> {
  const module = await import(pluginName);
  return module?.default ?? module;
}

/**
 * @returns array of all installed eslint plugins, including eslint core
 */
export function loadEslintPlugins(): Promise<PendingPlugin>[] {
  return Object.keys(getPackageDependencies())
    .filter(
      (d) =>
        d.startsWith('eslint-plugin-') ||
        d.endsWith('/eslint-plugin') ||
        d.includes('/eslint-plugin-')
    )
    .map<Promise<PendingPlugin>>(async (pluginName) => {
      const plugin = await loadPluginModule(pluginName);

      return {
        rules: plugin.rules ? { ...plugin.rules } : null,
        name: pluginName,
        shortName: pluginName
          .replace(/^eslint-plugin-/u, '')
          .replace(/\/eslint-plugin$/u, '')
          .replace(/\/eslint-plugin-/u, '/'),
      };
    })
    .concat(getEslintCoreAsPlugin());
}
