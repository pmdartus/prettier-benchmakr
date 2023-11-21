import path from "node:path";
import fs from "node:fs/promises";
import { Writable } from "node:stream";

import { execa } from "execa";
import chalk from "chalk";

import { createLogger } from "./logger.js";
import { getFixtures } from "./fixtures.js";

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

  for (const fixture of fixtures) {
    logger.log(`Running benchmark for "${fixture.name}"`);
    await runFixture(logger, fixture, options);
  }
}

async function runFixture(logger, fixture, options) {
  const args = [];

  // Certain fixtures have parsing error. Ignore them.
  args.push("--ignore-failure");

  // Warm up disk cache and fix formatting error for the given fixture.
  args.push("--warmup", "1");

  args.push("--runs", options.runs);

  if (options.verbose) {
    args.push("--show-output");
  } else {
    args.push("--style", "basic");
  }
  if (options.output) {
    args.push("--export-json", `${path.resolve(options.output)}/${fixture.name}.json`);
    args.push("--export-markdown", `${path.resolve(options.output)}/${fixture.name}.md`);
  }

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

  // Pipe stdout to process.stdout and format it in gray color.
  const stdoutStream = new Writable({
    write(chunk, encoding, callback) {
      const formattedChunk = chalk.gray(chunk.toString());
      process.stdout.write(formattedChunk, undefined, callback);
    },
  });

  return execa("hyperfine", args, {
    cwd: fixture.dirname,
    shell: true,
  }).pipeStdout(stdoutStream);
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
