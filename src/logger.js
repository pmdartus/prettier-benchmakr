import chalk from "chalk";

class Logger {
  #verbose;

  constructor({ verbose = false }) {
    this.#verbose = verbose;
  }

  log(...args) {
    console.log(...args);
  }

  warnings(...args) {
    console.log(chalk.yellow(...args));
  }

  error(...args) {
    console.error(chalk.red(...args));
  }

  debug(...args) {
    if (this.#verbose) {
      console.debug(chalk.gray(...args));
    }
  }
}

export function createLogger(options) {
  return new Logger(options);
}
