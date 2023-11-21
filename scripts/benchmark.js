import path from "node:path";
import { parseArgs } from "node:util";

import { benchmark } from '../src/benchmark.js';

const options = {
  baseline: {
    type: "string",
  },
  target: {
    type: "string",
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
  }
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
    runs: Number(values.runs),
    baseline: values.baseline,
    target: values.target,
    fixture: positionals[0],
    verbose: values.verbose,
    output: values.output,
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
