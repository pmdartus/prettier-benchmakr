#! /usr/bin/env node

import { parseArgs } from "node:util";

import { benchmark } from '../src/benchmark.js';

const options = {
  baseline: {
    type: "string",
  },
  target: {
    type: "string",
  },
  warmup: {
    type: "string",
    default: "1",
  },
  runs: {
    type: "string",
    default: "10",
  },
  verbose: {
    type: "boolean",
    default: false,
  },
  output: {
    short: "o",
    type: "string",
  },
  "export-json": {
    type: "string",
  },
  "export-markdown": {
    type: "string",
  },
};

function parseArguments() {
  const args = process.argv.slice(2);

  const { values, positionals } = parseArgs({
    args,
    options,
    strict: true,
    allowPositionals: true,
  });

  return {
    fixture: positionals[0],
    runs: Number(values.runs),
    warmup: Number(values.warmup),
    baseline: values.baseline,
    target: values.target,
    verbose: values.verbose,
    output: values.output,
    exportJson: values["export-json"],
    exportMarkdown: values["export-markdown"],
  };
}

try {
  const options = parseArguments();

  const exitCode = await benchmark(options);
  process.exit(exitCode);
} catch (error) {
  console.log(error);
  process.exit(1);
}
