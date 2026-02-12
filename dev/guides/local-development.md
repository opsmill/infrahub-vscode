# Local Development Setup

## Prerequisites

- Node.js 20.x
- npm
- VSCode (version 1.99.0+)
- A running Infrahub server (optional, for testing server features)

## Setup

```bash
git clone https://github.com/opsmill/infrahub-vscode.git
cd infrahub-vscode
npm install
```

## Development Cycle

### Watch mode

Start TypeScript compilation in watch mode:

```bash
npm run watch
```

### Run the extension

Press **F5** in VSCode (or use Run > Start Debugging). This:
1. Compiles the extension
2. Opens a new VSCode window (Extension Development Host)
3. Loads the extension from `out/`
4. Attaches the debugger

### Test with an Infrahub server

In the Extension Development Host window:
1. Open a workspace containing `.infrahub.yml`
2. Configure a server in Settings > Infrahub > Servers
3. The Infrahub sidebar should populate with server data

### Without a server

You can develop YAML-related features without a server. The extension will show servers as offline but YAML parsing, schema validation, and language features still work.

## Commands

```bash
npm run compile   # One-time compilation
npm run watch     # Watch mode
npm run lint      # Run ESLint
npm run test      # Run tests (compiles first)
```

## Debugging

- Set breakpoints in TypeScript source files
- Extension Host output: View > Output > select "Infrahub" or "Extension Host"
- Use `console.log()` - output appears in the Debug Console
- Reload Extension Development Host: Ctrl+Shift+P > "Developer: Reload Window"

## Project Structure

See [dev/knowledge/architecture.md](../knowledge/architecture.md) for the full component map.
