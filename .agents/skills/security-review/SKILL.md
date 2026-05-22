# Security Review Skill

Use this skill before deployment, authentication changes, database changes, payment changes, admin panels, or environment variable changes.

## Rules
- Never expose secrets.
- Never hardcode API keys.
- Check .env usage.
- Check client/server boundaries.
- Check authentication flow.
- Check authorization rules.
- Check form validation.
- Check dangerous terminal commands.
- Check dependency risks.
- Check public routes and private routes.
- Check file upload risks if present.

## Required output
1. Risk level: low, medium, high
2. Files inspected
3. Issues found
4. Required fixes
5. Recommended fixes
6. What not to deploy yet
