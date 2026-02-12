# Documentation Writing Guidelines

**Applies to:** All MDX files in `docs/` (`**/*.mdx`)

## Framework

Documentation follows the [Diataxis framework](https://diataxis.fr/):

- **Tutorials** (learning-oriented) - `docs/docs/tutorials/`
- **How-to guides** (task-oriented) - `docs/docs/guides/`
- **Explanation** (understanding-oriented) - `docs/docs/topics/`
- **Reference** (information-oriented) - `docs/docs/reference/`

## Tone and Style

- Professional but approachable: avoid jargon unless well defined
- Concise and direct: prefer short, active sentences
- Informative over promotional: explain how and why, not marketing
- Consistent and structured: follow predictable patterns

## For Guides

- Use conditional imperatives: "If you want X, do Y. To achieve W, do Z."
- Focus on practical tasks, not the tools themselves
- Address the user directly: "Configure...", "Create...", "Deploy..."
- Maintain focus on the goal without digressing
- Clear titles that state what the guide accomplishes

## For Topics

- Discursive, reflective tone that invites understanding
- Include context, background, and rationale
- Make connections to users' existing knowledge
- Present alternative perspectives where appropriate
- Use analogies and examples to deepen understanding

## Terminology

- Define new terms when first used
- Use domain-relevant language (playbooks, branches, schemas, commits)
- Follow naming conventions from Infrahub's data model and UI

## How-to Guide Structure

```
Title ("How to...")
Introduction (problem/goal, use case, what user will achieve)
Prerequisites
Step-by-Step Instructions (code, screenshots, callouts)
Validation/Verification
Advanced Usage (optional)
Related Resources
```

## Topic Structure

```
Title ("About..." or "Understanding...")
Introduction (overview, why it matters, questions answered)
Concepts & Definitions
Background & Context
Architecture & Design
Mental Models
Connection to Other Concepts
Further Reading
```

## Quality Checklist

- Content accurate for latest Infrahub version
- Clear step-by-step guidance
- Correct markdown/MDX formatting
- Spelling and grammar checked
- Guides: specific problem, logical sequence, validation steps
- Topics: bounded scope, genuine understanding, "why" not just "what"

## Reference Files

- Vale styles: `.vale/styles/`
- Markdown linting: `.markdownlint.yaml`
