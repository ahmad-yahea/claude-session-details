import { atom, read, update } from 'claude-code'
import type { EngineInterface, Register } from 'claude-code'

import type { BackgroundTask, ContextView } from '../types'
import {
  backgroundId,
  barRuns,
  basename,
  clip,
  fmtElapsed,
  fmtPercent,
  fmtTokens,
  outputPath,
  parseNotifications,
  pushOutput,
  taskLabel,
  textOf,
} from './lib'

const PANE = 'session-details'
const MAX_OUTPUTS = 8

const collapsed = atom({ plugin: 'session-details', key: 'collapsed' } as const, {})
const env = atom({ plugin: 'session-details', key: 'env' } as const, { surfaces: [] })
const context = atom({ plugin: 'session-details', key: 'context' } as const, null)
const outputs = atom({ plugin: 'session-details', key: 'outputs' } as const, [])
const tasks = atom({ plugin: 'session-details', key: 'tasks' } as const, [])
const now = atom({ plugin: 'session-details', key: 'now' } as const, 0)

const isRunning = (t: BackgroundTask) => t.status === 'running'

async function refreshEnv($: EngineInterface) {
  try {
    const surfaces = [...(await $.session.surfaces())]
    await update($, env, () => ({ surfaces }))
  } catch {}
}

async function refreshContext($: EngineInterface) {
  try {
    const usage = await $.session.usage({ breakdown: 'summary' })
    const b = usage.context.breakdown
    if (!b) return
    const view: ContextView = {
      categories: b.categories.map(c => ({
        name: c.name,
        tokens: c.tokens,
        color: c.color,
        kind: c.kind,
      })),
      totalTokens: b.totalTokens,
      rawMaxTokens: b.rawMaxTokens,
      percentage: b.percentage,
    }
    await update($, context, () => view)
  } catch {}
}

export const register: Register = on => {
  on('session.start', async ($, e, next) => {
    await $.command.register({
      name: 'session-details',
      description: 'Open the session details pane',
    })
    void $.ui.open({ id: PANE, title: 'Session' })
    await Promise.all([refreshEnv($), refreshContext($)])

    // Ticks only redraw while something runs.
    $.clock.every(1000, async () => {
      if ((await read($, tasks)).some(isRunning)) {
        const at = await $.clock.now()
        await update($, now, () => at)
      }
    })

    return next(e)
  })

  on('command.run', { command: 'session-details' }, async $ => {
    await $.ui.open({ id: PANE, title: 'Session' })

    return { text: 'Session details pane opened.' }
  })

  on('session.attach', async ($, e, next) => {
    const ran = await next(e)
    await refreshEnv($)

    return ran
  })

  on('session.detach', async ($, e, next) => {
    const ran = await next(e)
    await refreshEnv($)

    return ran
  })

  on('session.measure', async ($, e, next) => {
    const ran = await next(e)
    await refreshContext($)

    return ran
  })

  on('tool.call', async ($, e, next) => {
    const ran = await next(e)
    try {
      if (ran.result === undefined || ran.isError) return ran
      const input: unknown = e
      const at = await $.clock.now()

      if (e.agentId === undefined) {
        const path = outputPath(e.tool, input)
        if (path) await update($, outputs, list => pushOutput(list, path))
      }

      const id = backgroundId(e.tool, ran.result)
      if (id) {
        const task: BackgroundTask = {
          id,
          label: taskLabel(input),
          startedAt: at,
          status: 'running',
        }
        await update($, tasks, list => [...list.filter(t => t.id !== id), task].slice(-200))
        await update($, now, () => at)
      }

      if (e.tool === 'TaskStop') {
        const stopped = (input as { task_id?: unknown }).task_id
        if (typeof stopped === 'string') {
          await update($, tasks, list =>
            list.map(t => (t.id === stopped && isRunning(t) ? { ...t, status: 'stopped' } : t)),
          )
        }
      }
    } catch {}

    return ran
  })

  on('session.append', async ($, e, next) => {
    const ran = await next(e)
    try {
      const text = textOf(e.message.content)
      if (text.includes('<task-id>')) {
        const done = parseNotifications(text)
        if (done.length > 0) {
          await update($, tasks, list =>
            list.map(t => {
              const hit = done.find(d => d.id === t.id)

              return hit && isRunning(t) ? { ...t, status: hit.status } : t
            }),
          )
        }
      }
    } catch {}

    return ran
  })

  on('ui.render', { component: 'Pane', requestId: PANE }, async ($, e) => {
    const { Box, Button, Text } = $.ui.resolve(e)
    const width = Math.max(10, e.props.bodyColumns)
    const fold = await read($, collapsed)
    const surfaces = (await read($, env)).surfaces
    const ctx = await read($, context)
    const files = await read($, outputs)
    const list = await read($, tasks)
    const clock = await read($, now)

    const header = (id: string, title: string) => (
      <Button
        key={`toggle-${id}`}
        label={`${fold[id] ? '▸' : '▾'} ${title}`}
        onPress={() => update($, collapsed, m => ({ ...m, [id]: !m[id] }))}
      />
    )

    const remote = surfaces.filter(s => s !== 'terminal')
    const environment =
      remote.length > 0 ? (
        <Text color="success">{clip(`● Remote Control · ${remote.join(', ')}`, width)}</Text>
      ) : (
        <Text dimColor>{clip('○ Local terminal · /remote-control to connect', width)}</Text>
      )

    const contextBody = () => {
      if (!ctx) return <Text dimColor>No context data yet.</Text>
      const max = ctx.rawMaxTokens
      const { runs, rest } = barRuns(ctx.categories, max, width)
      const numW = 7
      const pctW = 7
      const nameW = Math.max(4, width - 2 - numW - pctW)
      const shown = ctx.categories.filter(c => c.kind !== 'deferred')
      const deferred = ctx.categories.filter(c => c.kind === 'deferred')
      const row = (c: (typeof ctx.categories)[number]) => {
        const isDeferred = c.kind === 'deferred'
        const mark = c.kind === 'free' ? '□' : '■'
        const pct = isDeferred ? '—' : fmtPercent(c.tokens, max)
        const rest = `${clip(c.name, nameW).padEnd(nameW)}${fmtTokens(c.tokens).padStart(numW)}${pct.padStart(pctW)}`

        return isDeferred ? (
          <Text dimColor>{`${mark} ${rest}`}</Text>
        ) : (
          <Text>
            <Text color={c.color}>{mark}</Text>
            {` ${rest}`}
          </Text>
        )
      }

      return (
        <Box flexDirection="column">
          <Box width={width} justifyContent="space-between">
            <Text>{`${Math.round(ctx.percentage)}% used`}</Text>
            <Text>{`${fmtTokens(ctx.totalTokens)} / ${fmtTokens(max)}`}</Text>
          </Box>
          <Text>
            {runs.map(r => (
              <Text color={r.color}>{'█'.repeat(r.n)}</Text>
            ))}
            <Text dimColor>{'░'.repeat(rest)}</Text>
          </Text>
          {shown.map(row)}
          {deferred.map(row)}
        </Box>
      )
    }

    const outputsBody = () => {
      if (files.length === 0) return <Text dimColor>Nothing written yet.</Text>
      const more = files.length - MAX_OUTPUTS

      return (
        <Box flexDirection="column">
          {files.slice(0, MAX_OUTPUTS).map(p => (
            <Text>{clip(`▤ ${basename(p)}`, width)}</Text>
          ))}
          {more > 0 && <Text dimColor>{`+${more} more`}</Text>}
        </Box>
      )
    }

    const tasksBody = () => {
      const running = list.filter(isRunning)
      const failed = list.filter(t => t.status === 'failed').length
      const finished = list.length - running.length
      if (list.length === 0) return <Text dimColor>No background tasks.</Text>

      return (
        <Box flexDirection="column">
          {running.map(t => {
            const age = fmtElapsed(clock - t.startedAt)
            const label = clip(t.label, Math.max(4, width - age.length - 4))

            return <Text>{`▶ ${label}  ${age}`}</Text>
          })}
          {finished > 0 &&
            (failed > 0 ? (
              <Text dimColor>
                {`◇ ${finished} finished`}
                <Text color="error">{` · ${failed} failed`}</Text>
              </Text>
            ) : (
              <Text dimColor>{`◇ ${finished} finished`}</Text>
            ))}
        </Box>
      )
    }

    const section = (id: string, title: string, body: () => ReturnType<typeof tasksBody>) => (
      <Box flexDirection="column">
        {header(id, title)}
        {!fold[id] && body()}
      </Box>
    )

    return (
      <Box flexDirection="column" width={width} gap={1}>
        {section('environment', 'Environment', () => environment)}
        {section('context', 'Context', contextBody)}
        {section('outputs', 'Outputs', outputsBody)}
        {section('tasks', 'Background tasks', tasksBody)}
      </Box>
    )
  })
}
