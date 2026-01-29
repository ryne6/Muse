import { create } from 'zustand'

interface LoadingStore {
  global: boolean
  local: Record<string, boolean>
  setGlobal: (value: boolean) => void
  setLocal: (key: string, value: boolean) => void
  clearLocal: (key: string) => void
}

export const useLoadingStore = create<LoadingStore>((set) => ({
  global: false,
  local: {},
  setGlobal: (value) => set({ global: value }),
  setLocal: (key, value) =>
    set((state) => ({ local: { ...state.local, [key]: value } })),
  clearLocal: (key) =>
    set((state) => {
      const next = { ...state.local }
      delete next[key]
      return { local: next }
    }),
}))
