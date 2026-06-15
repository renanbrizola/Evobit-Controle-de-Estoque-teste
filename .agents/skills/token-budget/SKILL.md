# Token Budget Skill

Use this skill whenever the task involves reading, editing, refactoring, reviewing, or planning code.

## Goal
Reduce unnecessary context usage and avoid wasteful agent behavior.

## Rules
- Do not read the entire codebase unless necessary.
- First inspect the file tree.
- Then identify the smallest relevant set of files.
- Prefer search before opening large files.
- Summarize findings before editing.
- Do not rewrite full files when a focused patch is enough.
- Do not repeat project context already available in /docs.
- Ask for approval before broad refactors.
- Keep explanations concise.
- Return targeted changes instead of full file dumps when possible.

## Required behavior
Before implementing, state:
1. Files likely needed
2. Why each file is needed
3. Whether the change is local, medium, or broad
4. Estimated risk level

## Avoid
- Reading unrelated files
- Generating large boilerplate
- Rebuilding components from scratch without reason
- Repeating the same explanation across messages
