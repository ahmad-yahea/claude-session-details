import { describe, expect, test } from 'claude-code/testing'

import {
  backgroundId,
  barRuns,
  fmtElapsed,
  fmtPercent,
  fmtTokens,
  outputPath,
  parseNotifications,
  pushOutput,
  taskLabel,
} from '../hooks/lib'

describe('formatters', () => {
  test('tokens', () => {
    expect(fmtTokens(950)).toBe('950')
    expect(fmtTokens(160300)).toBe('160.3k')
    expect(fmtTokens(200000)).toBe('200k')
    expect(fmtTokens(1000000)).toBe('1M')
    expect(fmtTokens(1250000)).toBe('1.3M')
  })

  test('elapsed and percent', () => {
    expect(fmtElapsed(5400)).toBe('5s')
    expect(fmtElapsed(123000)).toBe('2m 03s')
    expect(fmtElapsed(3720000)).toBe('1h 02m')
    expect(fmtPercent(50, 200)).toBe('25.0%')
  })

  test('bar never overshoots', () => {
    const cats = [
      { name: 'a', tokens: 100, color: 'x', kind: 'used' as const },
      { name: 'b', tokens: 300, color: 'y', kind: 'used' as const },
      { name: 'f', tokens: 600, color: 'z', kind: 'free' as const },
    ]
    const { runs, rest } = barRuns(cats, 1000, 20)
    expect(runs).toEqual([
      { color: 'x', n: 2 },
      { color: 'y', n: 6 },
    ])
    expect(rest).toBe(12)
  })
})

describe('bookkeeping', () => {
  test('output paths', () => {
    expect(outputPath('Write', { file_path: '/a/b.md' })).toBe('/a/b.md')
    expect(outputPath('NotebookEdit', { notebook_path: '/n.ipynb' })).toBe('/n.ipynb')
    expect(outputPath('Bash', { file_path: '/x' })).toBe(undefined)
    expect(pushOutput(['/a', '/b'], '/b')).toEqual(['/b', '/a'])
  })

  test('background ids', () => {
    expect(backgroundId('Bash', { backgroundTaskId: 'b1' })).toBe('b1')
    expect(backgroundId('Bash', { stdout: '' })).toBe(undefined)
    expect(backgroundId('Monitor', { taskId: 'm1' })).toBe('m1')
    expect(backgroundId('Agent', { status: 'async_launched', agentId: 'a1' })).toBe('a1')
    expect(backgroundId('Agent', { status: 'remote_launched', taskId: 't1' })).toBe('t1')
    expect(backgroundId('Agent', { status: 'completed', agentId: 'a2' })).toBe(undefined)
  })

  test('labels', () => {
    expect(taskLabel({ description: 'd', command: 'c' })).toBe('d')
    expect(taskLabel({ command: 'c', prompt: 'p' })).toBe('c')
    expect(taskLabel({ prompt: 'p' })).toBe('p')
  })

  test('notifications', () => {
    const one = '<task-notification><task-id>b1</task-id><status>failed</status></task-notification>'
    expect(parseNotifications(one)).toEqual([{ id: 'b1', status: 'failed' }])
    const two = `${one}<task-notification><task-id>b2</task-id><status>killed</status></task-notification>`
    expect(parseNotifications(two)).toEqual([
      { id: 'b1', status: 'failed' },
      { id: 'b2', status: 'stopped' },
    ])
    expect(parseNotifications('<task-id>c</task-id><status>completed</status>')).toEqual([
      { id: 'c', status: 'completed' },
    ])
    expect(parseNotifications('nothing here')).toEqual([])
  })
})
