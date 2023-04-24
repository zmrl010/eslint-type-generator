import { TSESLint } from "@typescript-eslint/utils";

export type RuleModule = TSESLint.RuleModule<string, unknown[]>;

export type Rule = RuleModule & {
  name: string;
};

export type RuleRecord = Record<string, Rule>;
