/**
 * Hard cap on how many rows a single read query returns to the caller. Used by
 * the read-only pool (as a post-fetch slice) and by the SQL validator (to
 * append a LIMIT when the generated query lacks one). Kept here, free of any
 * DB imports, so both can share it.
 */
export const MAX_ROWS = 1000;
