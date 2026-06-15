# Safe Refactor Skill

Use this skill when refactoring existing code.

## Rules
- Preserve current behavior unless explicitly told otherwise.
- Do not rename public APIs without documenting impact.
- Do not change styling and logic at the same time unless necessary.
- Make small logical patches.
- Before editing, identify dependent files.
- After editing, run relevant tests, lint or build.
- If tests do not exist, propose minimal verification steps.

## Required workflow
1. Inspect current behavior
2. Identify dependencies
3. Propose small refactor plan
4. Apply targeted changes
5. Verify
6. Summarize impact
