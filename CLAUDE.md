# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is the Infrahub VSCode Extension - a Visual Studio Code extension that provides development tools for working with Infrahub, an open-source infrastructure automation platform. The extension connects to Infrahub servers and provides YAML schema support, GraphQL query execution, and branch management.

## Development Commands

### Build and Compile
```bash
npm run compile       # Compile TypeScript to JavaScript (output to out/)
npm run watch        # Compile in watch mode for development
```

### Linting
```bash
npm run lint         # Run ESLint on src/ directory
```

### Testing
```bash
npm run test         # Run tests with vscode-test
npm run pretest      # Compile and lint before testing
```

### Publishing
```bash
npm run vscode:prepublish  # Prepare for publishing (runs compile)
npm run deploy             # Publish extension using vsce
```

### Development Workflow
```bash
# Start development with watch mode
npm run watch

# Run extension in VSCode (F5 or use launch.json configuration)
# This opens a new VSCode window with the extension loaded
```

## Architecture

### Extension Entry Point
- `src/extension.ts` - Main activation point that registers all providers, commands, and views

### Core Components

1. **Tree View Providers** (`src/treeview/`)
   - `InfrahubServerTreeViewProvider.ts` - Manages server connections and displays branches
   - `infrahubYamlTreeViewProvider.ts` - Visualizes .infrahub.yml/.yaml file structure

2. **Language Features**
   - `YamlDefinitionProvider.ts` - Go-to-definition for YAML schema references
   - `YamlDocumentSymbolProvider.ts` - Document symbols/outline for YAML files

3. **Common Utilities** (`src/common/`)
   - `commands.ts` - Command implementations (GraphQL execution, branch management)
   - `infrahub.ts` - Infrahub-specific utilities and helpers
   - `utilities.ts` - General utility functions

### Key Dependencies
- `infrahub-sdk` - Official SDK for interacting with Infrahub servers
- `yaml` - YAML parsing and manipulation
- `graphql` - GraphQL query handling

### Extension Configuration
The extension uses VSCode settings to store:
- `infrahub-vscode.servers` - Array of server configurations with name, address, and optional API token
- `infrahub-vscode.schemaDirectory` - Path to schema files directory

### Extension Activation
Activates when workspace contains `.infrahub.yml` or `.infrahub.yaml` files

### Status Bar
Updates every 10 seconds showing Infrahub server version and connection status

### Tree Views
- **Infrahub Servers** - Shows configured servers and their branches, refreshes every 10 seconds
- **Infrahub YAML** - Displays structure of Infrahub YAML configuration files

## TypeScript Configuration

- Target: ES2022
- Module: Node16
- Strict mode enabled
- Source maps enabled for debugging
- Output directory: `out/`

## Development Notes

### Environment Variable Substitution
Server API tokens support environment variable substitution using `${env:VAR_NAME}` syntax

### GraphQL Query Execution
Queries can be executed from the tree view with:
- Required and optional variable prompting
- Server and branch selection
- Results displayed in webview panel

### Branch Management
Supports creating and deleting branches directly from the extension UI

### YAML Schema Validation
Automatically validates YAML files in `models/` and `schemas/` directories against Infrahub schema

## Documentation Writing Guidelines

**Applies to:** All MDX files (`**/*.mdx`)

**Role:** Expert Technical Writer and MDX Generator with:

- Deep understanding of Infrahub and its capabilities
- Expertise in network automation and infrastructure management
- Proficiency in writing structured MDX documents
- Awareness of developer ergonomics

**Documentation Purpose:**

- Guide users through installing, configuring, and using Infrahub in real-world workflows
- Explain concepts and system architecture clearly, including new paradigms introduced by Infrahub
- Support troubleshooting and advanced use cases with actionable, well-organized content
- Enable adoption by offering approachable examples and hands-on guides that lower the learning curve

**Structure:** Follows [Diataxis framework](https://diataxis.fr/)

- **Tutorials** (learning-oriented)
- **How-to guides** (task-oriented)
- **Explanation** (understanding-oriented)
- **Reference** (information-oriented)

**Tone and Style:**

- Professional but approachable: Avoid jargon unless well defined. Use plain language with technical precision
- Concise and direct: Prefer short, active sentences. Reduce fluff
- Informative over promotional: Focus on explaining how and why, not on marketing
- Consistent and structured: Follow a predictable pattern across sections and documents

**For Guides:**

- Use conditional imperatives: "If you want X, do Y. To achieve W, do Z."
- Focus on practical tasks and problems, not the tools themselves
- Address the user directly using imperative verbs: "Configure...", "Create...", "Deploy..."
- Maintain focus on the specific goal without digressing into explanations
- Use clear titles that state exactly what the guide shows how to accomplish

**For Topics:**

- Use a more discursive, reflective tone that invites understanding
- Include context, background, and rationale behind design decisions
- Make connections between concepts and to users' existing knowledge
- Present alternative perspectives and approaches where appropriate
- Use illustrative analogies and examples to deepen understanding

**Terminology and Naming:**

- Always define new terms when first used. Use callouts or glossary links if possible
- Prefer domain-relevant language that reflects the user's perspective (e.g., playbooks, branches, schemas, commits)
- Be consistent: follow naming conventions established by Infrahub's data model and UI

**Reference Files:**

- Documentation guidelines: `docs/docs/development/docs.mdx`
- Vale styles: `.vale/styles/`
- Markdown linting: `.markdownlint.yaml`

### Document Structure Patterns (Following Diataxis)

**How-to Guides Structure (Task-oriented, practical steps):**

```markdown
- Title and Metadata
    - Title should clearly state what problem is being solved (YAML frontmatter)
    - Begin with "How to..." to signal the guide's purpose
    - Optional: Imports for components (e.g., Tabs, TabItem, CodeBlock, VideoPlayer)
- Introduction
    - Brief statement of the specific problem or goal this guide addresses
    - Context or real-world use case that frames the guide
    - Clearly indicate what the user will achieve by following this guide
    - Optional: Links to related topics or more detailed documentation
- Prerequisites / Assumptions
    - What the user should have or know before starting
    - Environment setup or requirements
    - What prior knowledge is assumed
- Step-by-Step Instructions
    - Step 1: [Action/Goal]
        - Clear, actionable instructions focused on the task
        - Code snippets (YAML, GraphQL, shell commands, etc.)
        - Screenshots or images for visual guidance
        - Tabs for alternative methods (e.g., Web UI, GraphQL, Shell/cURL)
        - Notes, tips, or warnings as callouts
    - Step 2: [Action/Goal]
        - Repeat structure as above for each step
    - Step N: [Action/Goal]
        - Continue as needed
- Validation / Verification
    - How to check that the solution worked as expected
    - Example outputs or screenshots
    - Potential failure points and how to address them
- Advanced Usage / Variations
    - Optional: Alternative approaches for different circumstances
    - Optional: How to adapt the solution for related problems
    - Optional: Ways to extend or optimize the solution
- Related Resources
    - Links to related guides, reference materials, or explanation topics
    - Optional: Embedded videos or labs for further learning
```

**Topics Structure (Understanding-oriented, theoretical knowledge):**

```markdown
- Title and Metadata
    - Title should clearly indicate the topic being explained (YAML frontmatter)
    - Consider using "About..." or "Understanding..." in the title
    - Optional: Imports for components (e.g., Tabs, TabItem, CodeBlock, VideoPlayer)
- Introduction
    - Brief overview of what this explanation covers
    - Why this topic matters in the context of Infrahub
    - Questions this explanation will answer
- Main Content Sections
    - Concepts & Definitions
        - Clear explanations of key terms and concepts
        - How these concepts fit into the broader system
    - Background & Context
        - Historical context or evolution of the concept/feature
        - Design decisions and rationale behind implementations
        - Technical constraints or considerations
    - Architecture & Design (if applicable)
        - Diagrams, images, or explanations of structure
        - How components interact or relate to each other
    - Mental Models
        - Analogies and comparisons to help understanding
        - Different ways to think about the topic
    - Connection to Other Concepts
        - How this topic relates to other parts of Infrahub
        - Integration points and relationships
    - Alternative Approaches
        - Different perspectives or methodologies
        - Pros and cons of different approaches
- Further Reading
    - Links to related topics, guides, or reference materials
    - External resources for deeper understanding
```

### Quality and Clarity Checklist

**General Documentation:**

- Content is accurate and reflects the latest version of Infrahub
- Instructions are clear, with step-by-step guidance where needed
- Markdown formatting is correct and compliant with Infrahub's style
- Spelling and grammar are checked

**For Guides:**

- The guide addresses a specific, practical problem or task
- The title clearly indicates what will be accomplished
- Steps follow a logical sequence that maintains flow
- Each step focuses on actions, not explanations
- The guide omits unnecessary details that don't serve the goal
- Validation steps help users confirm their success
- The guide addresses real-world complexity rather than oversimplified scenarios

**For Topics:**

- The explanation is bounded to a specific topic area
- Content provides genuine understanding, not just facts
- Background and context are included to deepen understanding
- Connections are made to related concepts and the bigger picture
- Different perspectives or approaches are acknowledged where relevant
- The content remains focused on explanation without drifting into tutorial or reference material
- The explanation answers "why" questions, not just "what" or "how"
