interface RetryConfig {
  maxRetries: number;
  baseDelay: number; // in ms
  timeoutMs: number; // in ms
}

/**
 * Executes a task with a forced timeout.
 */
async function withTimeout<T>(task: () => Promise<T>, ms: number): Promise<T> {
  const timeout = new Promise<never>((_, reject) =>
    setTimeout(() => reject(new Error("Timeout")), ms)
  );
  return Promise.race([task(), timeout]);
}

/**
 * Executes a task with exponential backoff, jitter, and timeouts. [1]
 */
export async function withResilience<T>(
  task: () => Promise<T>,
  config: RetryConfig
): Promise<T> {
  let lastError: Error | unknown;

  for (let attempt = 0; attempt <= config.maxRetries; attempt++) {
    try {
      // Step 1: Execute task with the specified timeout [1]
      return await withTimeout(task, config.timeoutMs);
    } catch (err) {
      lastError = err;

      // If we have retries left, wait before next attempt
      if (attempt < config.maxRetries) {
        /**
         * Step 2: Exponential Backoff + Jitter [1]
         * Formula: (baseDelay * 2^attempt) + random jitter
         */
        const backoff = config.baseDelay * Math.pow(2, attempt);
        const jitter = Math.random() * backoff; 
        const delay = backoff + jitter;

        console.log(`Attempt ${attempt + 1} failed. Retrying in ${Math.round(delay)}ms...`);
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }
  }

  throw lastError;
}