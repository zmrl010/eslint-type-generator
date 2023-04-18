#!/usr/bin/env ts-node

import { generateRuleTypes } from "../src/generateRuleTypes.js";

function parseArgs() {
  const [_execPath, _filePath, target] = process.argv;

  return { target };
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
