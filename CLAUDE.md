# Handcraft UI

Hand-drawn React component library. Two-tier render: tier 1 pure CSS, tier 2 rough.js SVG geometry.
Tier 2 is the default. Distributed shadcn-style so users own the source.

**The bar: roughViz should look like nothing in front of us.**

## Read first

| File                                | What                                                                                                    |
| ----------------------------------- | ------------------------------------------------------------------------------------------------------- |
| `.claude/doctrine/PRINCIPLES.md`    | Permanent law — mission, locked decisions, engine invariants, responsiveness, accessibility, escalation |
| `.claude/doctrine/CODE-CONTRACT.md` | How components are written, gates, traps                                                                |
| `.claude/doctrine/QA-CONTRACT.md`   | What "verified" means                                                                                   |
| `.claude/state/INDEX.md`            | What exists and where — read this instead of re-exploring                                               |
| `TESTING.md`                        | Human testing walkthrough                                                                               |

## Gates

```bash
pnpm test  pnpm typecheck  pnpm lint  pnpm build  pnpm registry:build
```

## Layout

```
packages/core      @handcraft/core — engine, provider, hooks, tokens, stylesheet
registry/          component source + scripts/build-registry.ts
apps/playground    Next.js harness, port 4321, URL-addressable state
.claude/agents/    the build team
.claude/doctrine/  the law
```

## Communication protocol

All internal natural language is caveman (`.claude/skills/caveman/SKILL.md`), level `full`.

**Four carve-outs stay normal prose**: shipped code comments, `hc-writer` output, project memory, and
root-cause evidence chains. Full reasoning in `PRINCIPLES.md`.

## Skills

Project skills live in `.claude/skills/` and are **gitignored** — 4 of the 6 ship no redistribution
licence. Reinstall after a fresh clone:

```bash
npx skills add juliusbrussee/caveman --skill caveman
npx skills add anthropics/skills --skill frontend-design
npx skills add nextlevelbuilder/ui-ux-pro-max-skill --skill ui-ux-pro-max
npx skills add addyosmani/web-quality-skills --skill accessibility
npx skills add shadcn/ui --skill shadcn
npx skills add shadcn/ui --skill migrate-radix-to-base
```

`skills-lock.json` currently tracks only the first three. The other three are installed but untracked.

`ui-ux-pro-max` documents its search tool as `${CLAUDE_PLUGIN_ROOT}/...`, which is **empty for
project-scoped skills** and fails silently. Use the absolute path:

```
python "/Users/atharvvani/Developer/libararies/js/handcraft-ui/.claude/skills/ui-ux-pro-max/scripts/search.py"
```
