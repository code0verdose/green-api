/** Messages browsers use when a lazily loaded chunk is gone (e.g. replaced by a new deploy). */
const STALE_CHUNK_MESSAGE =
  /Failed to fetch dynamically imported module|error loading dynamically imported module|Importing a module script failed/i;

export const isStaleChunkError = (error: unknown) =>
  error instanceof Error && STALE_CHUNK_MESSAGE.test(error.message);
