import os from "node:os";
import path from "node:path";
import fs from "node:fs/promises";
import { Writable } from "node:stream";

import { execa } from "execa";
import chalk from "chalk";

import { createLogger } from "./logger.js";
import { getFixtures } from "./fixtures.js";
import * as format from "./format.js";

const EXIT_CODE_SUCCESS = 0;
const EXIT_CODE_ERROR = 1;

export async function benchmark(options) {
  const logger = createLogger({ verbose: options.verbose });

  if (!options.baseline) {
    logger.error("Missing baseline binary. Use --baseline to specify it.");
    return EXIT_CODE_ERROR;
  }

  const fixtures = getFixtures({ name: options.fixture });
  if (fixtures.length === 0) {
    logger.warnings(`No fixture found for "${options.fixture}"`);
    return EXIT_CODE_ERROR;
  }

  const config = await createConfig(options);

  const results = [];

  for (const fixture of fixtures) {
    logger.log(`Running benchmark for "${fixture.name}"`);

    const result = await benchmarkFixture(fixture, config);
    results.push(result);
  }

  await exportReport(logger, options, {
    config,
    benchmarks: results,
  });

  return EXIT_CODE_SUCCESS;
}

async function benchmarkFixture(fixture, config) {
  const args = [];

  args.push("--runs", config.runs);
  args.push("--warmup", config.warmup);

  // Certain fixtures have parsing error. Ignore them.
  args.push("--ignore-failure");

  if (config.verbose) {
    args.push("--show-output");
  } else {
    args.push("--style", "basic");
  }

  // Export the result to JSON.
  const resultFilename = path.resolve(
    config.outputDirectory,
    `${fixture.name}.json`
  );
  args.push("--export-json", resultFilename);

  for (const binary of config.binaries) {
    args.push(`"${path.resolve(binary.filename)} ${fixture.options}"`);
    args.push("--command-name", binary.name);
  }

  const hyperfineOptions = {
    cwd: fixture.dirname,
    shell: true,
  };

  // Pipe stdout to process.stdout and format it in gray color.
  const stdoutStream = new Writable({
    write(chunk, encoding, callback) {
      const formattedChunk = chalk.gray(chunk.toString());
      process.stdout.write(formattedChunk, undefined, callback);
    },
  });

  // Run hyperfine and pipe the output to stdout.
  await execa("hyperfine", args, hyperfineOptions).pipeStdout(stdoutStream);

  // Read the benchmark from the file system.
  const results = JSON.parse(await fs.readFile(resultFilename, "utf8"));

  return {
    name: fixture.name,
    args,
    ...results,
  };
}

async function createConfig(options) {
  const binaries = [];

  const prefix = path.resolve(os.tmpdir(), "prettier-benchmark");
  const outputDirectory = await fs.mkdtemp(prefix);

  const baselineConfig = await getBinaryConfig({
    name: "baseline",
    filename: options.baseline,
  });
  binaries.push(baselineConfig);

  if (options.target) {
    const targetConfig = await getBinaryConfig({
      name: "target",
      filename: options.target,
    });
    binaries.push(targetConfig);
  }

  return {
    runs: options.runs,
    warmup: options.warmup,
    verbose: options.verbose,
    outputDirectory,
    binaries,
  };
}

async function getBinaryConfig({ name, filename }) {
  let version;
  try {
    const result = await execa(filename, ["--version"]);
    version = result.stdout.trim();
  } catch (error) {
    throw new Error(`Failed to get version for "${filename}"`, {
      cause: error,
    });
  }

  return {
    name,
    filename,
    version,
  };
}

async function exportReport(logger, options, report) {
  if (options.exportJson) {
    const output = format.toJson(report);

    logger.debug("Exporting result to", options.exportJson);

    await fs.mkdir(path.dirname(options.exportJson), { recursive: true });
    await fs.writeFile(options.exportJson, output, "utf8");
  }

  if (options.exportMarkdown) {
    const output = format.toMarkdown(report);

    logger.debug("Exporting result to", options.exportMarkdown);

    await fs.mkdir(path.dirname(options.exportMarkdown), { recursive: true });
    await fs.writeFile(options.exportMarkdown, output, "utf8");
  }
}

