import path, { format } from "node:path";
import fs from "node:fs/promises";
import { Writable } from "node:stream";

import { execa } from "execa";
import chalk from "chalk";

import { createLogger } from "./logger.js";
import { getFixtures } from "./fixtures.js";

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

  let binaryVersions;
  try {
    logger.debug("Getting binary versions");
    binaryVersions = await getVersions(options);
  } catch (error) {
    logger.error(error.message);
    return EXIT_CODE_ERROR;
  }

  if (options.output) {
    logger.debug(`Cleaning up "${options.output}"`);
    await cleanupDirectory(options.output);
  }

  const results = [];

  for (const fixture of fixtures) {
    logger.log(`Running benchmark for "${fixture.name}"`);
    const result = await benchmarkFixture(logger, fixture, options);

    results.push(result);
  }

  formatResults(logger, results, binaryVersions);

  return EXIT_CODE_SUCCESS;
}

async function benchmarkFixture(logger, fixture, options) {
  const args = [];

  args.push("--runs", options.runs);

  // Certain fixtures have parsing error. Ignore them.
  args.push("--ignore-failure");

  // Warm up disk cache and fix formatting error for the given fixture.
  args.push("--warmup", "1");

  if (options.verbose) {
    args.push("--show-output");
  } else {
    args.push("--style", "basic");
  }

  // Create a temporary directory for storing the benchmark result if no output is specified.
  const outputDirectory = options.output ?? await fs.mkdtemp(`prettier-benchmark-${fixture.name}`);
  if (!options.output) {
    logger.debug("Storing benchmark result in", outputDirectory);
  }

  // Export the result to JSON and Markdown.
  const jsonFilename = path.resolve(outputDirectory, `${fixture.name}.json`);
  const markdownFilename = path.resolve(outputDirectory, `${fixture.name}.md`);
  args.push("--export-json", jsonFilename);
  args.push("--export-markdown", markdownFilename);

  // Add labels to the result for better visualization.
  args.push(
    `"${options.baseline} ${fixture.options}"`,
    "--command-name",
    "baseline"
  );
  if (options.target) {
    args.push(
      `${options.target} ${fixture.options}`,
      "--command-name",
      "target"
    );
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
  const rawResult = JSON.parse(await fs.readFile(jsonFilename, "utf8"));
  const formattedResult = await fs.readFile(markdownFilename, "utf8");

  return {
    name: fixture.name,
    results: {
      raw: rawResult,
      formatted: formattedResult, 
    }
  }
}

async function getVersions(options) {
  let hyperfine = await getBinaryVersion("hyperfine");
  hyperfine = hyperfine.replace(/^hyperfine /, "");

  const baseline = await getBinaryVersion(options.baseline);
  const target = options.target ? await getBinaryVersion(options.target) : null;

  return {
    hyperfine,
    baseline,
    target,
  };
}

async function getBinaryVersion(bin) {
  try {
    const result = await execa(bin, ["--version"]);
    return result.stdout.trim();
  } catch (error) {
    throw new Error(`Failed to get version for "${bin}"`, {
      cause: error,
    });
  }
}

async function cleanupDirectory(dirname) {
  try {
    await fs.rm(dirname, { recursive: true });
  } catch {
    // Ignore if missing
  }

  return fs.mkdir(dirname, { recursive: true });
}
