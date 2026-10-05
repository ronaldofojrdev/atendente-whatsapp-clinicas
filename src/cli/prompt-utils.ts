import { createInterface } from "node:readline";

// readline/promises' rl.question() perde linhas ja bufferizadas quando o stdin
// (pipe, script de teste, etc.) fecha antes da proxima pergunta ser feita. Este
// helper consome as linhas por um listener persistente, que nao sofre desse problema
// nem em stdin interativo nem em stdin via pipe.
export function createPrompter() {
  const rl = createInterface({ input: process.stdin, output: process.stdout, terminal: false });
  const queue: string[] = [];
  const waiters: Array<(line: string) => void> = [];

  rl.on("line", (line) => {
    const waiter = waiters.shift();
    if (waiter) waiter(line);
    else queue.push(line);
  });

  function ask(prompt: string): Promise<string> {
    process.stdout.write(prompt);
    if (queue.length) return Promise.resolve(queue.shift()!);
    return new Promise((resolve) => waiters.push(resolve));
  }

  return {
    ask,
    close: () => rl.close(),
  };
}
