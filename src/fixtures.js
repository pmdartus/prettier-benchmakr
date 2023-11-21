import path from "node:path";
import { fileURLToPath } from "node:url";

const FIXTURE_DIRNAME = fileURLToPath(import.meta.resolve("../fixtures"));

const FIXTURES = [
  {
    name: "vue",
    options: ["--write '**/*.[tj]s?(x)'"],
    dirname: path.resolve(FIXTURE_DIRNAME, "vue"),
  },
  {
    name: "material-ui",
    options: ["--write . --ignore-path .eslintignore"],
    dirname: path.resolve(FIXTURE_DIRNAME, "material-ui"),
  },
  {
    name: "next.js",
    options: ["--write ."],
    dirname: path.resolve(FIXTURE_DIRNAME, "next.js"),
  },
  {
    name: "babel",
    options: ["--write ."],
    dirname: path.resolve(FIXTURE_DIRNAME, "babel"),
  },
];

export function getFixtures({ name }) {
  return FIXTURES.filter((fixture) => {
    return !name || fixture.name === name;
  });
}