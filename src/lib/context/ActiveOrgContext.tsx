import { createContext, useContext, useState, useCallback } from 'react'

interface ActiveOrgContextValue {
  activeOrgId: string | null
  activeOrgName: string | null
  setActiveOrg: (orgId: string, orgName: string) => void
  clearActiveOrg: () => void
}

const STORAGE_KEY = 'howard_active_org'

const ActiveOrgContext = createContext<ActiveOrgContextValue | null>(null)

export function ActiveOrgProvider({ children }: { children: React.ReactNode }) {
  const [activeOrg, setActiveOrgState] = useState<{ id: string; name: string } | null>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY)
      return stored ? JSON.parse(stored) : null
    } catch {
      return null
    }
  })

  const setActiveOrg = useCallback((orgId: string, orgName: string) => {
    const val = { id: orgId, name: orgName }
    setActiveOrgState(val)
    localStorage.setItem(STORAGE_KEY, JSON.stringify(val))
  }, [])

  const clearActiveOrg = useCallback(() => {
    setActiveOrgState(null)
    localStorage.removeItem(STORAGE_KEY)
  }, [])

  return (
    <ActiveOrgContext.Provider value={{
      activeOrgId: activeOrg?.id ?? null,
      activeOrgName: activeOrg?.name ?? null,
      setActiveOrg,
      clearActiveOrg,
    }}>
      {children}
    </ActiveOrgContext.Provider>
  )
}

export function useActiveOrg() {
  const ctx = useContext(ActiveOrgContext)
  if (!ctx) throw new Error('useActiveOrg must be used within ActiveOrgProvider')
  return ctx
}
