export type ContextRow = {
  name: string
  tokens: number
  color: string
  kind: 'used' | 'free' | 'buffer' | 'deferred'
}

export type ContextView = {
  categories: ContextRow[]
  totalTokens: number
  rawMaxTokens: number
  percentage: number
}

export type TaskStatus = 'running' | 'completed' | 'failed' | 'stopped'

export type BackgroundTask = {
  id: string
  label: string
  startedAt: number
  status: TaskStatus
}

export type EnvView = { surfaces: string[] }

declare module 'claude-code' {
  interface PluginState {
    'session-details': {
      collapsed: Record<string, boolean>
      env: EnvView
      context: ContextView | null
      outputs: string[]
      tasks: BackgroundTask[]
      now: number
    }
  }
}
