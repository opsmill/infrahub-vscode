# Infrahub VSCode Extension

VSCode extension for Infrahub - provides YAML schema support, GraphQL query execution, branch management, and schema visualization for infrastructure automation.

## Quick Start

```bash
npm install
npm run compile
# Press F5 to launch Extension Development Host
```

## Key Concepts

- **Infrahub Server**: Infrastructure automation platform this extension connects to. See `dev/knowledge/server-communication.md`
- **Tree Views**: Three sidebar panels (Servers, Schema, YAML). See `dev/knowledge/tree-views.md`
- **Schema Files**: YAML definitions in `schemas/` validated against Infrahub schema. See `dev/knowledge/yaml-processing.md`
- **infrahub-sdk**: Official SDK for server API calls. See `dev/adr/0002-infrahub-sdk-integration.md`

## Architecture

Extension entry point is `src/extension.ts`. Commands in `src/common/commands.ts`, utilities in `src/common/`. Tree views in `src/treeview/`, language features at `src/` root level.

For details: `dev/knowledge/architecture.md`

## Coding Standards

- TypeScript: `dev/guidelines/typescript.md`
- Documentation (MDX): `dev/guidelines/documentation.md`
- Git workflow: `dev/guidelines/git-workflow.md`

## Critical Rules

- Extension activates on `.infrahub.yml` / `.infrahub.yaml` presence
- All disposables must be added to `context.subscriptions`
- API calls need timeout handling (5s for tree view refreshes)
- Never commit `.env` files or hardcoded API tokens
- Server tokens support `${env:VAR_NAME}` substitution

## Commands

```bash
npm run compile    # Build
npm run watch      # Build in watch mode
npm run lint       # ESLint
npm run test       # Run tests
npm run deploy     # Publish to marketplace
```

## Navigation

- How the system works: `dev/knowledge/`
- How to do things: `dev/guides/`
- Why we decided things: `dev/adr/`
- What rules to follow: `dev/guidelines/`
- What we're building: `dev/specs/`
