#!/usr/bin/env ts-node

import { generateRuleTypes } from "../src/generate-rule-types.js";

function parseArgs() {
  const [_execPath, _filePath, outDir] = process.argv;

  return { outDir };
}

export async function main() {
  const args = parseArgs();

  try {
    await generateRuleTypes(args);
  } catch (e) {
    console.error(e);
    process.exit(1);
  }

  process.exit(0);
}

void main();
