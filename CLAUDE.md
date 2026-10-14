# Claude CLI Instructions

Follow `AGENTS.md` first.

Claude CLI is a bounded project-level implementation agent.

## Claude may

- inspect the repository;
- implement a clearly scoped task;
- refactor within the approved boundary;
- run approved commands and tests;
- update operational project memory;
- append session and verification records;
- identify conflicts and mark them `Needs review`.

## Claude must not

- redefine project scope independently;
- overwrite existing decision or session history;
- silently resolve contradictory state;
- treat chat context as more authoritative than project files;
- mark work complete without verification;
- make destructive, production, authentication, secret, or migration changes without explicit approval.

## Required behavior

Before work, read the files in the order specified by `AGENTS.md`.

At closeout:

- update `STATE.md` and `TASKS.md`;
- append a session handoff;
- record tests and results;
- state the synchronization status;
- identify one next action.
