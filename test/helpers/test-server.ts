/**
 * Test utilities for async operations and timing
 */

/**
 * Wait for a specified number of milliseconds
 */
export const wait = (ms: number): Promise<void> => {
  return new Promise((resolve) => setTimeout(resolve, ms));
};

/**
 * Create a promise that rejects after a timeout
 */
export const timeoutPromise = (ms: number, message: string): Promise<never> => {
  return new Promise((_, reject) => {
    setTimeout(() => reject(new Error(message)), ms);
  });
};

/**
 * Race a promise against a timeout
 */
export const withTimeout = <T>(promise: Promise<T>, ms: number, message: string): Promise<T> => {
  return Promise.race([promise, timeoutPromise(ms, message)]);
};
