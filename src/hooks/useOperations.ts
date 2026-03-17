import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

export interface Operation {
  id: string
  name: string
  sort_order: number
  active: boolean
  created_at: string
}

// Module-level cache
let cachedOps: Operation[] | null = null
let cachePromise: Promise<Operation[]> | null = null

async function fetchOpsData(): Promise<Operation[]> {
  if (cachedOps) return cachedOps
  if (cachePromise) return cachePromise
  cachePromise = new Promise<Operation[]>(async (resolve) => {
    const { data } = await supabase
      .from('operations')
      .select('*')
      .order('sort_order', { ascending: true })
    cachedOps = (data as Operation[]) ?? []
    cachePromise = null
    resolve(cachedOps)
  })
  return cachePromise
}

export function useOperations() {
  const [operations, setOperations] = useState<Operation[]>(cachedOps ?? [])
  const [loading, setLoading] = useState(!cachedOps)

  const refetch = useCallback(async () => {
    cachedOps = null
    setLoading(true)
    const data = await fetchOpsData()
    setOperations(data)
    setLoading(false)
  }, [])

  useEffect(() => {
    if (cachedOps) {
      setOperations(cachedOps)
      setLoading(false)
      return
    }
    fetchOpsData().then((data) => {
      setOperations(data)
      setLoading(false)
    })
  }, [])

  const addOperation = useCallback(async (name: string) => {
    const maxSort = operations.reduce((m, o) => Math.max(m, o.sort_order ?? 0), 0)
    const { error } = await supabase
      .from('operations')
      .insert({ name, sort_order: maxSort + 1 })
    if (!error) await refetch()
    return error
  }, [operations, refetch])

  const updateOperation = useCallback(async (id: string, updates: Partial<Operation>) => {
    const { error } = await supabase
      .from('operations')
      .update(updates)
      .eq('id', id)
    if (!error) await refetch()
    return error
  }, [refetch])

  const deleteOperation = useCallback(async (id: string) => {
    const { error } = await supabase
      .from('operations')
      .delete()
      .eq('id', id)
    if (!error) await refetch()
    return error
  }, [refetch])

  return { operations, loading, refetch, addOperation, updateOperation, deleteOperation }
}
