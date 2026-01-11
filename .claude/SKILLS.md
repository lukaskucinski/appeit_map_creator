# Recommended Skills for PEIT Map Creator

This document lists recommended Claude Code skills that enhance development workflows for this project.

## Installing Skills

Skills are installed globally via Claude Code's plugin marketplace and are NOT committed to the repository (they're user-specific preferences).

### Installation Commands

```bash
# Add the marketplace (if not already added)
/plugin marketplace add anthropics/claude-code

# Install recommended skills
/plugin install content-research-writer@claude-code-plugins
/plugin install domain-name-brainstormer@claude-code-plugins
/plugin install lead-research-assistant@claude-code-plugins
/plugin install skill-creator@claude-code-plugins
/plugin install stripe-integration@claude-code-plugins
/plugin install frontend-design@claude-code-plugins
```

**Note:** After installation, restart Claude Code to load the new skills.

## Recommended Skills

### 1. content-research-writer
**Purpose:** Research and writing assistance with citations, real-time feedback, and iterative editing

**Use cases:**
- Writing documentation for new features
- Researching environmental data sources
- Creating technical blog posts

**Invoke with:** `/content-research-writer`

---

### 2. domain-name-brainstormer
**Purpose:** Generate creative domain names and check availability across multiple TLDs

**Use cases:**
- Finding domain names for new features/projects
- Brainstorming naming conventions

**Invoke with:** `/domain-name-brainstormer`

---

### 3. lead-research-assistant
**Purpose:** Identify high-quality leads for sales and business development

**Use cases:**
- Finding potential users for PEIT Map Creator
- Identifying government agencies that might benefit from the tool
- Research for partnerships

**Invoke with:** `/lead-research-assistant`

---

### 4. skill-creator
**Purpose:** Guide and tools for creating custom Claude Code skills

**Use cases:**
- Creating project-specific skills (e.g., `/add-layer`, `/test-layer`)
- Building automation workflows
- Packaging reusable commands

**Includes helper scripts:**
- `init_skill.py` - Generate new skill from template
- `package_skill.py` - Package skills for distribution
- `quick_validate.py` - Validate skill structure

**Invoke with:** `/skill-creator`

---

### 5. stripe-integration
**Purpose:** Implement Stripe payment processing with checkout, subscriptions, and webhooks

**Use cases:**
- Implementing paid features for PEIT Map Creator
- Building subscription models
- Processing payments securely

**Invoke with:** `/stripe-integration`

---

### 6. frontend-design
**Purpose:** Create distinctive, production-grade frontend interfaces with high design quality

**Use cases:**
- Building new UI components for the Next.js frontend
- Designing landing pages
- Creating polished web interfaces

**Invoke with:** `/frontend-design`

---

## Custom Project Skills

For project-specific skills (like `/add-layer` for PEIT Map Creator), create them in `.claude/skills/` and they WILL be committed to the repository since they're part of the project.

Example custom skills we could create:
- `/add-layer` - Interactive wizard to add environmental layers to config
- `/test-layer` - Test FeatureServer URL before adding to config
- `/deploy-modal` - Deploy Modal backend with validation
- `/sync-types` - Sync TypeScript types between frontend and backend

Use the `skill-creator` skill to build these!
