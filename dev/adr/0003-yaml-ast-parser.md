# ADR-0003: Use yaml-ast-parser for line-aware YAML parsing

**Status:** Accepted
**Date:** 2024

## Context

The extension needs to parse YAML files in two contexts:
1. **Data extraction** - Reading values from YAML (schema definitions, config)
2. **Position-aware parsing** - Linking tree view items back to file locations for go-to-definition

The `yaml` npm package handles case 1 well but doesn't preserve source positions. VSCode language features (definition provider, document symbols) need line/column information.

## Decision

Use both `yaml` and `yaml-ast-parser`:
- `yaml` for standard parsing where positions aren't needed
- `yaml-ast-parser` for AST-based parsing where line numbers matter

## Consequences

### Positive
- Accurate source position mapping for language features
- Tree view items can navigate to exact file locations
- Go-to-definition works reliably with line number data

### Negative
- Two YAML parsing libraries in the dependency tree
- Need to understand which library to use in which context

### Neutral
- `yaml-ast-parser` is stable but not actively maintained; if it becomes a problem, alternatives like `yaml` package's own CST parser could be evaluated
