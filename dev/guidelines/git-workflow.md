# Git Workflow

## Branching

1. Fork the repository and create a feature branch from `main`
2. Make changes and ensure lint + tests pass
3. Open a PR targeting `main`

## Changelog

This project uses [towncrier](https://towncrier.readthedocs.io/) for changelog management.

### Adding Changelog Entries

Create a fragment file in `changelog/`:

```bash
# Format: changelog/<issue-or-pr-number>.<type>
# Types: added, changed, deprecated, removed, fixed, security
echo "Description of the change." > changelog/42.added
```

### Generating Changelog

```bash
uv tool run towncrier build --version=<new-version> --yes
```

## Releasing

1. Bump version in `package.json`
2. Generate changelog: `uv tool run towncrier build --version=<version> --yes`
3. Commit `package.json` and `CHANGELOG.md`
4. Open PR, get review, merge to `main`
5. Tag: `git tag v<version> && git push --tags`
6. CI publishes to VSCode Marketplace automatically

## Commits

- Use conventional commit prefixes: `feat:`, `fix:`, `docs:`, `refactor:`, `test:`, `chore:`
- Keep commits focused on a single change
- Include relevant file changes in the commit (don't bundle unrelated changes)

## Pre-merge Checks

```bash
npm run lint    # ESLint passes
npm run test    # Tests pass
npm run compile # TypeScript compiles without errors
```
