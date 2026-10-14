# Bootstrap Prompt for Existing Projects

Use this prompt with Codex or Claude CLI from the root of an existing project.

---

Initialize this repository within the approved project-centric agent orchestration and durable-memory system.

First inspect the repository without making substantive implementation changes.

## Objectives

1. Identify existing project instructions, status files, task files, decision logs, runbooks, session logs, and Git configuration.
2. Assign or confirm the canonical project key.
3. Determine the single authoritative operational-memory location.
4. Reconcile existing documentation with the standard scaffold.
5. Add only missing files and directories.
6. Never overwrite useful existing documentation blindly.
7. Run structural validation.
8. Produce an initialization report before implementation work begins.

## Required scaffold

- `AGENTS.md`
- `CLAUDE.md`
- `PROJECT.md`
- `STATE.md`
- `TASKS.md`
- `DECISIONS.md`
- `.agent/sessions/`
- `.agent/runbooks/`
- `.agent/verification/`
- `.agent/templates/RUN-CARD.md`
- `.agent/templates/CLOSEOUT.md`
- `.agent/templates/SESSION-HANDOFF.md`
- `scripts/Test-AgentProject.ps1`

## Authority rules

- `PROJECT.md` contains stable identity, scope, boundaries, and authority.
- `STATE.md` contains the short current project snapshot.
- `TASKS.md` contains the actionable work queue.
- `DECISIONS.md` is append-only.
- `.agent/sessions/` is append-only.
- Notion contains the human-readable metaview.
- Git contains implementation history and rollback.
- Conflicting state must be preserved and marked `Needs review`.

## Required vocabulary

Synchronization status must be one of:

- `Synced`
- `Local ahead`
- `Notion ahead`
- `Needs review`

## Security

Do not store or expose secrets. Do not modify real `.env` files. Do not install software, initialize Git, change remotes, commit, push, deploy, migrate data, or modify Notion unless separately authorized.

## Return

- Canonical project key.
- Existing relevant files found.
- Files created.
- Files modified.
- Files intentionally left unchanged.
- Conflicts or overlaps found.
- Validation result.
- Missing information.
- Recommended synchronization state.
- One next action.

Do not begin substantive implementation until this report is complete.
