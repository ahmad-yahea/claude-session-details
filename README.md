# session-details

A Claude Code mod: a live side pane that mirrors the Claude desktop app's
"session details" sidebar.

- **Environment**: Remote Control and the attached surfaces, or local terminal
- **Context**: % used, a segmented bar and a per-category breakdown
- **Outputs**: files written this session (Write, NotebookEdit, Artifact)
- **Background tasks**: running tasks with a live timer, finished/failed counts

Each section collapses from its ▾/▸ header. The pane opens on session start;
`/session-details` reopens it.

## Install

At the prompt of a Claude Code terminal session:

```
/plugin install session-details --marketplace ahmad-yahea/claude-session-details
```

Answer `y` to add the marketplace, then pick a scope (user scope makes it load
in every session).

From a shell:

```
claude plugin install session-details --marketplace ahmad-yahea/claude-session-details
```

In the desktop app, where `/plugin` does not run: click + next to the prompt
box, then Plugins, Add marketplace with `ahmad-yahea/claude-session-details`,
then Add plugin.
