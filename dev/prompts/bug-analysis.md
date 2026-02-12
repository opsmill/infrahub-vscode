# Bug Analysis

## Gather Information

1. Reproduction steps (which VSCode actions trigger the bug?)
2. Expected vs. actual behavior
3. Extension Host output (Output panel > "Infrahub" or "Extension Host")
4. VSCode version and OS

## Analysis Framework

### Locate the Code Path
- Which command or provider is involved?
- Trace from `extension.ts` registration to the handler
- Check tree view providers for data issues
- Check `common/commands.ts` for command logic

### Identify Root Cause
- API communication failure (check infrahub-sdk calls, timeout handling)
- YAML parsing error (check yaml-ast-parser usage)
- VSCode API misuse (disposable lifecycle, event handling)
- Configuration issue (server settings, schema directory)

### Verify with Evidence
- Add `console.log` statements and check Extension Host output
- Write failing test in `src/test/`
- Test with Extension Development Host (F5)

## Output

```markdown
## Summary
[One sentence]

## Root Cause
[Explanation]

## Recommended Fix
[Code changes with file paths]

## Regression Test
[Test that catches this]
```
