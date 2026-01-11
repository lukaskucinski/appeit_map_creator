# Claude Code Skills Directory

This directory contains custom skills for the PEIT Map Creator project.

## What are Skills?

Skills are reusable commands that extend Claude Code's capabilities. They can be invoked using slash commands (e.g., `/skill-name`) or called programmatically.

## Directory Structure

Each skill should be in its own subdirectory:

```
skills/
├── skill-name/
│   ├── index.ts (or index.js)
│   ├── package.json
│   └── README.md
```

## Creating a Custom Skill

1. Create a new directory for your skill
2. Add a `package.json` with the skill metadata
3. Implement the skill logic in `index.ts`
4. Document usage in `README.md`

## Example Skills for This Project

Potential skills that would be useful for PEIT Map Creator:

- **`/add-layer`** - Interactive wizard to add new environmental layers to config
- **`/test-layer`** - Test a FeatureServer URL before adding to config
- **`/update-docs`** - Auto-update CLAUDE.md when architecture changes
- **`/deploy-modal`** - Deploy Modal backend with validation
- **`/sync-types`** - Sync TypeScript types between frontend and backend

## Permissions

Skills are granted permissions in `.claude/settings.local.json`. The current configuration allows all skills:

```json
{
  "permissions": {
    "allow": ["@skill{*}"]
  }
}
```

For more information, see the [Claude Code documentation](https://docs.anthropic.com/claude/docs/claude-code).
