# YAML Processing

## Overview

The extension processes YAML in several contexts:
1. **Schema files** - Files in `schemas/` or `models/` directories
2. **Infrahub config** - `.infrahub.yml` / `.infrahub.yaml` project config
3. **Language features** - Go-to-definition and document outline

## Libraries

### `yaml` (npm package)
Used for standard YAML parsing and stringification. Returns JavaScript objects.

### `yaml-ast-parser`
Used when line number information is needed (e.g., tree view items that link back to file positions). Returns an AST with position data.

See [ADR-0003](../adr/0003-yaml-ast-parser.md) for why both libraries are used.

## Schema Validation

The extension registers YAML validation rules in `package.json`:

```json
"yamlValidation": [{
  "fileMatch": ["models/**/*.yml", "models/**/*.yaml", "schemas/**/*.yml", "schemas/**/*.yaml"],
  "url": "https://schema.infrahub.app/infrahub/schema/latest.json"
}]
```

This works with the `redhat.vscode-yaml` extension (declared as an `extensionDependency`) to provide inline validation.

## Schema File Discovery

`common/infrahub.ts:findSchemaFiles()` discovers schema files:
1. Reads `schemaDirectory` setting
2. Globs for `*.yml` and `*.yaml` files
3. Returns file paths for schema operations

## Go-to-Definition

`YamlDefinitionProvider.ts` provides go-to-definition for schema references:
1. Extracts the word under cursor
2. Searches all schema files for matching node/generic definitions
3. Returns location of the definition

## Document Symbols

`YamlDocumentSymbolProvider.ts` provides document outline:
1. Parses YAML file structure
2. Creates hierarchical `DocumentSymbol` entries for nodes, generics, attributes, relationships
3. Supports the Outline panel and breadcrumb navigation

## GraphQL File Processing

`common/infrahub.ts` also handles GraphQL files referenced from `.infrahub.yml`:
- `parseGraphQLVariables()` - Extracts variable definitions from `.gql` files
- Used for prompting users for query variables before execution
