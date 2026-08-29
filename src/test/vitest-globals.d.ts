// vitest.config.ts sets `test.globals: true`, so test files use describe/it/
// expect/vi as ambient globals without importing them. Vitest's own type
// declarations for those globals only load when a test file imports from
// "vitest" directly — for files that don't (relying purely on the runtime
// globals), plain `tsc` has no idea these identifiers exist. This reference
// pulls in vitest's global type augmentation for the whole program, since
// this file is picked up automatically by tsconfig's `**/*.ts` include.
/// <reference types="vitest/globals" />
