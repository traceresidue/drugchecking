# Structural Validation Checklist

A project passes Phase 1 structural validation when:

## Required files

- [ ] `AGENTS.md`
- [ ] `CLAUDE.md`
- [ ] `PROJECT.md`
- [ ] `STATE.md`
- [ ] `TASKS.md`
- [ ] `DECISIONS.md`
- [ ] `.agent/templates/RUN-CARD.md`
- [ ] `.agent/templates/CLOSEOUT.md`
- [ ] `.agent/templates/SESSION-HANDOFF.md`
- [ ] `scripts/Test-AgentProject.ps1`

## Required directories

- [ ] `.agent/sessions/`
- [ ] `.agent/runbooks/`
- [ ] `.agent/verification/`
- [ ] `.agent/templates/`

## Required content

- [ ] `PROJECT.md` contains a canonical key.
- [ ] `STATE.md` contains status, health, progress, sync state, repository status, current objective, blockers, and one next action.
- [ ] Repository status records Git initialization, branch, remote, working tree, and baseline commit.
- [ ] `TASKS.md` contains Now, Next, Later, Waiting, and Completed.
- [ ] `AGENTS.md` defines reading order, approval boundaries, security, closeout, and conflict handling.
- [ ] Synchronization vocabulary includes Synced, Local ahead, Notion ahead, and Needs review.
- [ ] Contradictions are explicitly preserved and escalated.
- [ ] Secrets are prohibited.
- [ ] Session and decision history are append-only.

## Security review before first commit

- [ ] `.gitignore` excludes `.env` and common secret files.
- [ ] No raw credentials or secrets appear in tracked files.
- [ ] Generated dependencies and build artifacts are excluded where appropriate.
- [ ] The remote repository is appropriate for the sensitivity of the project.

## Functional smoke test

Structural validation is necessary but not sufficient. Before real work:

- [ ] Codex reads the project state and appends a bounded handoff.
- [ ] Claude CLI reads and accurately summarizes the handoff.
- [ ] Claude CLI appends a response.
- [ ] Codex rereads and verifies it.
- [ ] Existing content remains intact.
- [ ] A deliberate contradiction is preserved and marked Needs review.
