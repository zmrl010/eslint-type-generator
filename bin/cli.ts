#!/usr/bin/env ts-node

import { generatePluginTypes } from "../src/generate-plugin-types.js";

function parseArgs() {
  const [_execPath, _filePath, outDir] = process.argv;

  return { outDir };
}

export async function main() {
  const args = parseArgs();

  try {
    await generatePluginTypes(args);
  } catch (e) {
    console.error(e);
    process.exit(1);
  }

  process.exit(0);
}

void main();
