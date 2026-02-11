# Developer Documentation

Internal context for developers and AI agents working on the Infrahub VSCode Extension.

> **For user-facing docs**, see `docs/`. This directory is for *developers of* the extension, not *users of* it.

## Navigation

| Directory | Question It Answers | Target |
|-----------|-------------------|--------|
| [knowledge/](knowledge/) | "How does this work?" | AI + Human |
| [guidelines/](guidelines/) | "What rules should I follow?" | AI |
| [guides/](guides/) | "How do I do X?" | AI + Human |
| [adr/](adr/) | "Why was this decided?" | Human |
| [specs/](specs/) | "What are we building?" | Human |
| [explorations/](explorations/) | "What are we thinking about?" | Human |
| [commands/](commands/) | "Run this for me" | AI |
| [prompts/](prompts/) | "Help me think about X" | Human |

## Document Lifecycle

```
explorations/  ->  specs/  ->  knowledge/ or guidelines/
   (rough)       (approved)      (stable)
```

## Key Files

- **Architecture overview:** [knowledge/architecture.md](knowledge/architecture.md)
- **TypeScript conventions:** [guidelines/typescript.md](guidelines/typescript.md)
- **Adding commands:** [guides/add-command.md](guides/add-command.md)
- **Git & releases:** [guidelines/git-workflow.md](guidelines/git-workflow.md)
- **Documentation writing:** [guidelines/documentation.md](guidelines/documentation.md)
