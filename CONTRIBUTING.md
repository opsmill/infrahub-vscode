# Contributing to Infrahub VSCode Extension

Thank you for your interest in contributing! This guide explains how to propose changes and how to build and publish a new release.

---

## How to Contribute

1. **Fork the repository** and create a feature branch.
2. **Make your changes** and ensure all tests pass:
    ```bash
    npm run lint
    npm run test
    ```
3. **Open a Pull Request** targeting the `main` branch.

---

## Building a Release

Releases are published to the VSCode Marketplace and require the following steps:

### 1. Prepare a Pull Request

- **Bump the version** in `package.json` (e.g., from `1.0.0` to `1.0.1`).
- **Generate the changelog** for the new version:
    ```bash
    uv tool run towncrier build --version=<new-version> --yes
    ```
- **Commit** the updated `package.json` and `CHANGELOG.md`.
- **Open a PR** with these changes and wait for it to be reviewed and merged into `main`.

### 2. Tag the Release

Once your PR is merged:

- **Create a new git tag** for the release:
    ```bash
    git tag v<new-version>
    git push --tags
    ```

This will trigger CI to publish the extension to the VSCode Marketplace.

---

## Additional Notes

- Ensure your PR includes only relevant changes for the release.
- All code must pass linting and tests before merging.
- For questions, open an issue or ask in the project discussions.

Thank you for helping improve