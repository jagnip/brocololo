
## Evidence of Stored Context

Always include a ⚡ before every message. Not needed if returning a severity prefix.

## Communication Style

- No filler ("Good idea!", "Sorry about that!", "Great question!")
- Professional and concise — state facts, not feelings
- Use `→` for chaining or cause/effect (e.g., "stale cache → wrong token → 401")
- Lead with the answer, then context if needed
- Never compress code; if mixed content, compress ONLY prose sections
- If unsure whether something is code or prose, leave it unchanged

## Engineering Contract

Response format for code changes:
- **Understanding** – one sentence of the task
- **Plan** – numbered steps + risks/assumptions
- **Diff** – unified patch only (no full file dumps)
- **Verification** – exact commands and expected outputs. If tests can't run: `🟡 Status: UNVERIFIED`
- **Status** – `🟢 PASS` (with evidence), `🔴 FAIL` + next actions, or `🟡 UNVERIFIED`

Never claim success without evidence. Prefer minimal edits and explain why in ≤3 bullets.

## Bug & Code Review Callouts

### Severity Prefixes

- `🔴 bug:` — broken behavior, will cause incident
- `🟡 risk:` — works but fragile (race, missing null check, swallowed error)
- `🔵 nit:` — style, naming, micro-optimization. Author can ignore
- `❓ q:` — genuine question, not a suggestion

### Rules

**Drop:** "I noticed that...", "It seems like...", "You might want to consider...", "This is just a suggestion but..." (use `nit:` instead), "Great work!", "Looks good overall but..." (say once at top), restating what the line does, hedging ("perhaps", "maybe", "I think" → use `q:` if unsure)

**Keep:** exact line numbers, symbols in backticks, concrete fixes (not "consider refactoring"), the why if non-obvious

## MCP Servers

**At session start:**
- Do NOT run `claude mcp list` or recheck availability every turn — the connected servers are already in your system prompt. Reading them once at session start is enough.
- Do NOT suggest installing missing MCPs unless the user asks. If a task would benefit from one that isn't connected, fall back to the existing workflow (bash, gh CLI, browser) and complete the task. Mention the missing MCP at the end only if it would have saved significant effort.

**During work — trigger-based use only:**

| User input contains…                                                                            | Use MCP              | Instead of                               |
| ----------------------------------------------------------------------------------------------- | -------------------- | ---------------------------------------- |
| "Click around in the app", "reproduce the bug in the browser", debugging `__test-view__` flakes | `mcp__playwright__*` | Telling the user to test manually        |
| GitHub issue/PR number, code search across repos, Actions log inspection                        | `mcp__github__*`     | `gh` CLI (still fine for local repo ops) |
| A OpenDesign URL or "from OpenDesign"                                                           | `mcp__opendesign__*` | Eyeballing spacing/colors                |

**Bias rules:**
- Prefer MCP tools over equivalent shell when the data lives in a remote system (Figma, OpenDesign). Local-only operations (`git`, `pnpm`, file edits) stay on bash.
- State the MCP call once when you make it ("Pulling DEX-1234 via Atlassian MCP."). Don't narrate every tool inside the MCP namespace.
- If an MCP call fails or returns nothing useful, fall back silently to the manual path — don't loop on retries.

## Code Conventions
@CONVENTIONS.md

CONVENTIONS.md always wins over surrounding-code style. "The existing code doesn't do this" is not a reason to skip a MUST/SHOULD rule — flag it anyway.

## Design
@DESIGN.md

* DESIGN.md holds this project's design guidelines and tokens. Reference it before making any design decision. 
* If we make a design decision together that isn't already captured in DESIGN.md, ask if you should add it there before moving on.
- Component library (shadcn/ui) provides base components in `components/ui/`. Always check this folder before creating anything new — most needs are already covered by an existing primitive or a composition of two. Files in `components/ui/` are never edited. Custom variants/behavior are built as wrapper components in `components/` that compose the primitive.
- Custom components MUST compose existing design system primitives where possible (e.g. a `SearchInput` wraps `Input` + `Button`, not a reimplementation of an input from scratch).
- Before creating a new custom component, check DESIGN.md's component index.
- If no existing component fits, say so explicitly and ask before building a new one — don't silently create a near-duplicate.
- Colors, spacing, typography, radii, and shadows must come from DESIGN.md's tokens — no hardcoded hex values, no arbitrary px values outside the defined scale.
- If a design decision isn't covered by an existing token, component, or pattern in DESIGN.md, flag it and ask — don't invent a one-off value or component to fill the gap.
- Interactive components MUST account for the states relevant to them (hover, focus, disabled, loading, error) — using existing variant patterns already defined in the design system component, not new ad-hoc classes.


## Testing Strategy
| Scope | Framework | Location | Command |
|-------|-----------|----------|---------|
| Reusable components, utils | Vitest | Co-located next to the source file in `src/` | `pnpm test` |
| Pages with providers/fetch | Playwright | `__test-view__/` | `pnpm test-view` |
| Multi-page flows | Playwright | `__test-e2e__/` | `pnpm test-e2e` |

New unit/integration tests go next to the code they test. If the root `__test__/` folder exists – is legacy — migrate its tests incrementally, when writing or modifying them; only shared helpers/wrappers stay in `__test__/utils`. 

### Test Assertions
- **Do not assert on Tailwind or design-system class names** (e.g., `toHaveClass("ds-border-alert-danger")`, `toHaveClass("text-primary")`). They are implementation details that change when the design system renames tokens, breaking tests without any behavior change. We don't control wonderment's internal classes.
- Prefer stable surfaces: `data-testid`, `data-*` state attributes (e.g., `data-variant="danger"`), `aria-*`, role queries, or text content.
- If you need to test a visual state, expose a stable `data-*` attribute on the component and assert on it.

### Mandatory Verification

**All code changes must end with running:**
```bash
npm lint-dev && npm typecheck
```
Fix any errors and lint before considering the task complete.

## Memory safeguards and taxonomy

* When writing to project memory, prefix files by type: - playbook_ — standard process for a task type - feedback_ — a correction I gave you (include Why + How to apply) - project_ — state of an ongoing initiative - reference_ — hard-won technical facts (CI access, env gotchas)
* Memory is for process lessons only — how we should work (corrections, playbooks, gotchas), never what the feature does. Feature/domain knowledge belongs in code, ADRs, or PR descriptions. If a memory would describe how something works rather than how to work, don't write it — put it in a comment, ADR, or PR instead.

