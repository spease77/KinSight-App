export class OperationTimeoutError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "OperationTimeoutError";
  }
}

export async function withTimeout<T>(
  promise: Promise<T>,
  ms: number,
  message = "Operation timed out"
): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;

  try {
    return await Promise.race([
      promise,
      new Promise<never>((_, reject) => {
        timer = setTimeout(() => {
          reject(new OperationTimeoutError(message));
        }, ms);
      }),
    ]);
  } finally {
    if (timer) clearTimeout(timer);
  }
}
