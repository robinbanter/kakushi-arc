/** Retry only throttled public RPC reads. Never retry transaction submissions here. */
export async function retryRpcRead<T>(read: () => Promise<T>): Promise<T> {
  for (let attempt = 0; ; attempt++) {
    try { return await read(); }
    catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      if (attempt >= 4 || !/rate limit|request exceeds defined limit|too many requests|\b429\b/i.test(message)) throw error;
      await new Promise((resolve) => setTimeout(resolve, 500 * 2 ** attempt));
    }
  }
}
