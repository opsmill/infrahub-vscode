# ADR-0002: Use infrahub-sdk for server communication

**Status:** Accepted
**Date:** 2024

## Context

The extension needs to communicate with Infrahub servers for branch management, GraphQL execution, and schema operations. Options included direct HTTP/REST calls or using the official SDK.

## Decision

Use `infrahub-sdk` (official Infrahub JavaScript/TypeScript SDK) for all server communication.

## Consequences

### Positive
- Consistent API surface matching Infrahub server capabilities
- Automatic handling of authentication, headers, and request formatting
- Type definitions for API responses
- Maintained by the Infrahub team, stays in sync with server changes

### Negative
- Dependency on SDK release cycle for new server features
- SDK bugs affect the extension

### Neutral
- Some operations (schema check/load, transforms) still use `infrahubctl` CLI via terminal because the SDK doesn't cover all CLI functionality
