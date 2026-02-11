# ADR-0001: Use plain tsc instead of a bundler

**Status:** Accepted
**Date:** 2024

## Context

VSCode extensions can be built with plain TypeScript compilation or with bundlers like webpack/esbuild. Bundlers reduce package size and improve load times but add build complexity.

## Decision

Use plain `tsc` compilation without a bundler.

## Consequences

### Positive
- Simple build pipeline: `tsc -p ./` is the entire build step
- Easy debugging with source maps directly mapping to source
- No bundler configuration to maintain
- Fast compilation in watch mode

### Negative
- Larger extension package size (includes all dependency files)
- Slightly slower extension activation (more files to load)

### Neutral
- If the extension grows significantly, reconsidering a bundler would be reasonable
