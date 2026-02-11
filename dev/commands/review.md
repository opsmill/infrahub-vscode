# Code Review

Review changes for correctness, style compliance, and test coverage.

## Steps

1. Identify changed files with `git diff --name-only`
2. Check against guidelines in `dev/guidelines/`
3. Look for:
   - Logic errors and edge cases
   - Security issues (injection, auth bypass)
   - Performance concerns
   - Missing tests
   - VSCode API misuse (disposable leaks, missing deactivation cleanup)
4. Verify TypeScript strict mode compliance
5. Provide specific, actionable feedback

## Output Format

### Summary
One paragraph overview.

### Issues
- **Critical**: Must fix before merge
- **Warning**: Should fix
- **Suggestion**: Nice to have

### What's Good
Highlight positive aspects.
