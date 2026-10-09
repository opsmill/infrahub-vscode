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

Dispatch `auto-bump.yml` on `main` when the branch is ready to ship. It uses
the merged PR labels to propose a version, or accepts an explicit `version`
input. It updates `package.json` and `package-lock.json`, builds the Towncrier
changelog, and opens a release PR. The workflow uses the same pinned
Towncrier version as `poetry.lock`.

Add the release-notes page to that PR and review the version and changelog.
Merging the PR creates the `v<version>` tag. The existing `publish.yml`
workflow then publishes to Visual Studio Marketplace and Open VSX and creates
the GitHub Release. Do not create a tag by hand for a prepared release.

---

## Additional Notes

- Ensure your PR includes only relevant changes for the release.
- All code must pass linting and tests before merging.
- For questions, open an issue or ask in the project discussions.

Thank you for helping improve
