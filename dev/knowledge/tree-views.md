# Tree Views

## Overview

The extension contributes three tree views in the "Infrahub" activity bar container:

1. **Infrahub Servers** (`infrahubServerTreeView`) - Server connections and branches
2. **Infrahub Schema** (`infrahubSchemaTreeView`) - Schema file navigation
3. **Infrahub YAML** (`infrahubYamlTreeView`) - `.infrahub.yml` structure

## Infrahub Servers Tree View

**File:** `src/treeview/InfrahubServerTreeViewProvider.ts`

### Hierarchy
```
Server (online/offline)
├── Branch (default)
├── Branch (with data indicator)
└── Branch (with data indicator)
```

### Data Flow
1. Reads server configs from VSCode settings
2. Creates `InfrahubClient` per server
3. Fetches branch list with 5-second timeout
4. Caches branch data between refreshes
5. Auto-refreshes every 10 seconds

### Context Values (for menu contributions)
- `infrahubServer:online` - Server that responded successfully
- `infrahubServer:offline` - Server that timed out or errored
- `infrahubBranch:default` - The main branch
- `infrahubBranch:notDefault` - Non-default branches

## Infrahub Schema Tree View

**File:** `src/treeview/infrahubSchemaTreeViewProvider.ts`

### Hierarchy
```
Schema File (filename.yml)
├── Node: NodeName
│   ├── attribute: type
│   └── relationship: kind
└── Generic: GenericName
    ├── attribute: type
    └── relationship: kind
```

### Data Flow
1. Reads `schemaDirectory` setting (default: `"schemas"`)
2. Finds all `.yml`/`.yaml` files in that directory
3. Parses YAML to extract node and generic definitions
4. Displays hierarchical structure with attributes and relationships

## Infrahub YAML Tree View

**File:** `src/treeview/infrahubYamlTreeViewProvider.ts`

### Hierarchy
```
.infrahub.yml
├── queries
│   ├── QueryName (path/to/query.gql)
│   └── QueryName (path/to/query.gql)
├── jinja2_transforms
│   ├── TransformName
│   └── TransformName
├── python_transforms
│   ├── TransformName
│   └── TransformName
├── artifact_definitions
│   └── ArtifactName
└── generator_definitions
    └── GeneratorName
```

### Data Flow
1. Finds `.infrahub.yml` or `.infrahub.yaml` in workspace root
2. Parses YAML structure with `yaml-ast-parser` for line-aware parsing
3. Groups items by type (queries, transforms, artifacts, generators)
4. Resolves GraphQL file paths for queries
5. Detects transform type (Jinja2 vs Python) from file content

### Context Values (for menu contributions)
- Items with `queries` in context: show execute and edit buttons
- Items with `transforms` in context: show run button
