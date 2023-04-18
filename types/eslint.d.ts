declare module "eslint" {
  import type { TSESLint } from "@typescript-eslint/utils";

  export namespace Rule {
    export type RuleModule = TSESLint.RuleModule<string, unknown[]>;
  }
}

declare module "eslint/use-at-your-own-risk" {
  import type { TSESLint } from "@typescript-eslint/utils";

  type Rule = TSESLint.RuleModule<string, unknown[]>;

  class LazyLoadingRuleMap extends Map<string, Rule> {
    public constructor(loaders: Array<[string, () => Rule]>);
  }

  export const builtinRules: LazyLoadingRuleMap;
}
