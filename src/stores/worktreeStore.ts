import { create } from 'zustand'
import type { CreateWorktreeRequest, WorktreeItem, WorktreeStagedInfo } from '../../shared/wtui-types'
import { apiDelete, apiGet, apiPost } from '@/utils/api'

type WorktreeState = {
  loading: boolean
  items: WorktreeItem[]
  selectedId?: string
  refresh: () => Promise<void>
  select: (id?: string) => void
  create: (req: CreateWorktreeRequest) => Promise<WorktreeItem | null>
  remove: (id: string, force?: boolean) => Promise<{ success: boolean; error?: string }>
  open: (id: string, type?: 'folder' | 'editor') => Promise<boolean>
  lock: (id: string) => Promise<boolean>
  unlock: (id: string) => Promise<boolean>
  prune: () => Promise<boolean>
  branches: string[]
  fetchBranches: () => Promise<void>
  fetchStagedDiff: (id: string) => Promise<WorktreeStagedInfo | null>
}

export const useWorktreeStore = create<WorktreeState>((set, get) => ({
  loading: false,
  items: [],
  branches: [],
  selectedId: undefined,
  select: (id) => set({ selectedId: id }),
  refresh: async () => {
    set({ loading: true })
    try {
      const r = await apiGet<WorktreeItem[]>('/api/worktrees')
      if (r.ok) {
        set({ items: r.data })
        const sel = get().selectedId
        if (sel && !r.data.some((x) => x.id === sel)) {
          set({ selectedId: undefined })
        }
      }
    } finally {
      set({ loading: false })
    }
  },
  create: async (req) => {
    const r = await apiPost<WorktreeItem, CreateWorktreeRequest>('/api/worktrees', req)
    if (!r.ok) return null
    await get().refresh()
    return r.data
  },
  remove: async (id, force) => {
    const url = force ? `/api/worktrees/${encodeURIComponent(id)}?force=1` : `/api/worktrees/${encodeURIComponent(id)}`
    const r = await apiDelete<{ removed: true }>(url)
    if (!r.ok) {
      const err = (r as { error: { message: string; details?: string } }).error
      return { success: false, error: err.details || err.message }
    }
    await get().refresh()
    return { success: true }
  },
  open: async (id, type) => {
    const r = await apiPost<{ launched: true }, { type?: 'folder' | 'editor' }>(
      `/api/worktrees/${encodeURIComponent(id)}/open`,
      { type: type || 'folder' },
    )
    return r.ok
  },
  lock: async (id) => {
    const r = await apiPost<{ locked: true }, Record<string, never>>(
      `/api/worktrees/${encodeURIComponent(id)}/lock`,
      {},
    )
    if (!r.ok) return false
    await get().refresh()
    return true
  },
  unlock: async (id) => {
    const r = await apiPost<{ unlocked: true }, Record<string, never>>(
      `/api/worktrees/${encodeURIComponent(id)}/unlock`,
      {},
    )
    if (!r.ok) return false
    await get().refresh()
    return true
  },
  prune: async () => {
    const r = await apiPost<{ pruned: true }, Record<string, never>>('/api/worktrees/prune', {})
    if (!r.ok) return false
    await get().refresh()
    return true
  },
  fetchBranches: async () => {
    const r = await apiGet<string[]>('/api/branches')
    if (r.ok) set({ branches: r.data })
  },
  fetchStagedDiff: async (id: string) => {
    const r = await apiGet<WorktreeStagedInfo>(`/api/worktrees/${encodeURIComponent(id)}/staged`)
    if (r.ok) return r.data
    return null
  },
}))
