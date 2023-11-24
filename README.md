# Prettier performance benchmark

Checkout and build locally different versions of Prettier, and compare the performance of multiple CLI version against large JavaScript / TypeScript repositories. The performance comparison is done using [hyperfine](https://github.com/sharkdp/hyperfine).

## Scripts

### `scripts/setup-prettier.sh`

**Description:** Install and build a specific version of prettier.

**Usage:** `./scripts/setup-prettier.sh <directory> <github-reference>`

**Arguments:**

- `directory`: The prettier installation directory.
- `github-reference`: The github shorthand reference of a prettier repository.

**Example:**

```sh
$ ./scripts/setup-prettier.sh baseline "prettier/prettier#main"
```

### `scripts/benchmark.js`

**Description:** Run Prettier CLI performance benchmark

**Usage:** `./scripts/benchmark.js [options] [name]`

**Arguments:**
- `name`: The name of the benchmark to run. If omitted, the CLI runs all the benchmarks.

**Options:**

- `--baseline <filename>`: The baseline Prettier CLI filename. (required)
- `--target <filename>`: The target Prettier CLI filename.
- `--runs <number>`: Number of iteration to perform for each benchmark. (default: `10`)
- `--verbose`: Print debug logs and Prettier CLI output.

**Example:**
```sh
$ ./scripts/benchmark.js \
    --baseline ./node_modules/prettier/bin/prettier.cjs \
    --runs 5 \
    vue
```