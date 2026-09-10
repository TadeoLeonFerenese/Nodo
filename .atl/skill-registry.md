# Skill Registry

**Delegator use only.** Any agent that launches sub-agents reads this registry to resolve compact rules, then injects them directly into sub-agent prompts. Sub-agents do NOT read this registry or individual SKILL.md files.

See `_shared/skill-resolver.md` for the full resolution protocol.

## User Skills

| Trigger | Skill | Path |
|---------|-------|------|
| When creating a pull request, opening a PR, or preparing changes for review | branch-pr | C:\Users\Tadeo Leon Ferense\.gemini\config\skills\branch-pr\SKILL.md |
| When writing Go tests, using teatest, or adding test coverage | go-testing | C:\Users\Tadeo Leon Ferense\.gemini\config\skills\go-testing\SKILL.md |
| When creating a GitHub issue, reporting a bug, or requesting a feature | issue-creation | C:\Users\Tadeo Leon Ferense\.gemini\config\skills\issue-creation\SKILL.md |
| When user says "judgment day", "judgment-day", "review adversarial", "dual review", "doble review", "juzgar", "que lo juzguen" | judgment-day | C:\Users\Tadeo Leon Ferense\.gemini\config\skills\judgment-day\SKILL.md |
| When user asks to create a new skill, add agent instructions, or document patterns for AI | skill-creator | C:\Users\Tadeo Leon Ferense\.gemini\config\skills\skill-creator\SKILL.md |
| Al planificar una feature, crear especificaciones o diseñar la arquitectura de contratos | spec-architect | C:\Users\Tadeo Leon Ferense\.gemini\config\skills\spec-architect\SKILL.md |
| Antes de dar por terminada una tarea, al verificar código o correr auditoría de calidad | strict-judge | C:\Users\Tadeo Leon Ferense\.gemini\config\skills\strict-judge\SKILL.md |
| Al implementar código, crear componentes o refactorizar siguiendo specs | worker-engineer | C:\Users\Tadeo Leon Ferense\.gemini\config\skills\worker-engineer\SKILL.md |

## Compact Rules

Pre-digested rules per skill. Delegators copy matching blocks into sub-agent prompts as `## Project Standards (auto-resolved)`.

### branch-pr
- Every PR MUST link an approved issue (status:approved) — no blank PRs
- Every PR MUST have exactly one `type:*` label
- Branch naming MUST match `^(feat|fix|chore|docs|style|refactor|perf|test|build|ci|revert)/[a-z0-9._-]+$`
- Conventional commits required; shellcheck on modified scripts
- Automated checks must pass before merge

### go-testing
- Use table-driven tests with `t.Run(tt.name, ...)`
- Bubbletea TUI testing: use `teatest` for model testing
- Assert expected errors with `(err != nil) != tt.wantErr`
- Golden file testing for large or visual outputs

### issue-creation
- Blank issues disabled — MUST use bug report or feature request template
- Issues receive `status:needs-review` automatically upon creation
- Maintainer MUST assign `status:approved` before any PR can be opened
- Questions go to Discussions, not issues

### judgment-day
- Blind parallel review with TWO independent sub-agents (never sequential)
- Pre-resolve skills before launching judges via Skill Resolver Protocol
- Orchestrator synthesizes findings into Confirmed, Suspect A, Suspect B, Contradiction
- Re-judges after fixes until pass or escalates after 2 iterations

### skill-creator
- Follow Agent Skills specification: `SKILL.md` with frontmatter (name, description, trigger)
- Only create skills for recurring patterns, non-standard conventions, or multi-step workflows
- Include Critical Patterns and concise rules; keep SKILL.md focused and actionable

### spec-architect
- Specify all functional behavior in Gherkin scenarios (`Given-When-Then`)
- Strict data contracts with TypeScript interfaces or Zod schemas — no `any`
- Enforce Atomic Design (`atoms/`, `molecules/`, `organisms/`)
- Strict separation between presentational (dumb) and container (logic/state) components

### strict-judge
- Clean compilation: run `tsc --noEmit` (0 errors)
- Linter & Formatter: ESLint/Biome/Prettier (0 warnings, 0 errors)
- 100% tests passing in green
- Audit Mobile-First approach (starts at 320px) and mathematical symmetry (4px/8px design tokens, zero magic numbers)

### worker-engineer
- Strict TDD (Red-Green-Refactor): write failing test first, make it green, then refactor
- Mobile-First design: base styling for 320px screens, responsive progressive breakpoints (`md:`, `lg:`)
- Mathematical symmetry: 4px/8px modular scale only, no magic pixel numbers
- Respect architecture: client-only local storage (SQLite/Zustand), no fake backend servers or unlisted dependencies

## Project Conventions

| File | Path | Notes |
|------|------|-------|
| AGENTS.md | c:/Users/Tadeo Leon Ferense/Desktop/Repositorios/Nodo/AGENTS.md | Core architecture, stack, UI/UX constraints |
