# session-details

**See what's going on in your Claude Code session at a glance.** This mod adds
a live side pane to Claude Code, like the "session details" sidebar in the
Claude desktop app, so you don't have to type `/context` or scroll back through
the chat to find out where things stand.

## Why it's helpful

- **Know when you're running out of room.** Claude works within a context
  window. Once it fills up, the conversation gets compacted (summarised) and
  older detail is lost. The pane shows how full the window is all the time,
  so you can `/compact` or `/clear` on your own terms.
- **See what's taking up space.** The breakdown shows whether the system
  prompt, tools, memory files or the conversation itself is using the
  window.
- **Find the files Claude made.** Every file it wrote this session is listed,
  newest first.
- **Keep an eye on background work.** Commands, agents and monitors running in
  the background show with a live timer, and you can see when they finish or
  fail.

## What the pane shows

```
▾ Environment
○ Local terminal · /remote-control to connect

▾ Context
42% used                          84.2k / 200k
███████████████████░░░░░░░░░░░░░░░░░░░░░░░░░░░
■ System prompt              3.1k    1.6%
■ System tools              17.9k    9.0%
■ Memory files               1.2k    0.6%
■ Messages                  62.0k   31.0%
□ Free space                82.8k   41.4%
■ Autocompact buffer        33.0k   16.5%
■ MCP tools (deferred)       5.4k       —

▾ Outputs
▤ report.md
▤ chart.html

▾ Background tasks
▶ npm run dev  4m 12s
◇ 3 finished · 1 failed
```

Click a section's ▾/▸ header to collapse or expand it. The pane opens on its
own when a session starts, and `/session-details` reopens it.

### What the numbers mean

**Environment**
- `○ Local terminal`: the session runs only in this terminal.
- `● Remote Control · desktop`: the session is also open somewhere else (the
  desktop app, the phone app or VS Code) through Remote Control.

**Context**
- **`42% used`**: how much of the context window the session is using now.
- **`84.2k / 200k`**: tokens used, out of the most the window holds (k =
  thousand, M = million). A token is roughly ¾ of a word.
- **The bar**: the same window as one line. Each coloured run is one category
  and `░` is room left.
- **Each row**: the category, its tokens, and its share of the whole window.
  - `System prompt`, `System tools`, `Memory files`, `Messages`, etc.: what's
    taking up room. `Messages`, the conversation itself, usually grows the
    most.
  - `□ Free space`: room left before compaction.
  - `Autocompact buffer`: room held back so Claude can summarise the
    conversation when it fills up. You can't use it for chat.
  - Dimmed rows with `—`: tools that only load when needed. They don't count
    against the window until they're used.

The figures are estimates, the same ones `/context` shows. They refresh after
each turn.

**Outputs**
- `▤ name`: a file Claude wrote or edited this session (Write, NotebookEdit,
  Artifact), newest first. The 8 newest are listed, then `+N more`.

**Background tasks**
- `▶ task  4m 12s`: a task still running and how long it has been going.
- `◇ 3 finished · 1 failed`: tasks that have ended. Failed ones are counted in
  red.

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

The pane opens on its own only when the terminal is wide enough (about 110 to
144 columns). In a narrower terminal, run `/session-details`.

To update: `claude plugin update session-details`
