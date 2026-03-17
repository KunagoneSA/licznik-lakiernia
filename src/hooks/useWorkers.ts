import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

export interface Worker {
  id: string
  name: string
  hourly_rate: number
  active: boolean
  created_at: string
}

// Module-level cache
let cachedWorkers: Worker[] | null = null
let cachePromise: Promise<Worker[]> | null = null

async function fetchWorkersData(): Promise<Worker[]> {
  if (cachedWorkers) return cachedWorkers
  if (cachePromise) return cachePromise
  cachePromise = supabase
    .from('workers')
    .select('*')
    .order('name')
    .then(({ data }) => {
      cachedWorkers = (data as Worker[]) ?? []
      cachePromise = null
      return cachedWorkers
    }) as Promise<Worker[]>
  return cachePromise!
}

export function useWorkers() {
  const [workers, setWorkers] = useState<Worker[]>(cachedWorkers ?? [])
  const [loading, setLoading] = useState(!cachedWorkers)

  const fetch = useCallback(async () => {
    cachedWorkers = null
    setLoading(true)
    const data = await fetchWorkersData()
    setWorkers(data)
    setLoading(false)
  }, [])

  useEffect(() => {
    if (cachedWorkers) {
      setWorkers(cachedWorkers)
      setLoading(false)
      return
    }
    fetchWorkersData().then((data) => {
      setWorkers(data)
      setLoading(false)
    })
  }, [])

  const addWorker = useCallback(async (name: string, hourlyRate: number) => {
    const { error } = await supabase
      .from('workers')
      .insert({ name, hourly_rate: hourlyRate })
    if (!error) await fetch()
    return error
  }, [fetch])

  const updateWorker = useCallback(async (id: string, updates: Partial<Worker>) => {
    const { error } = await supabase
      .from('workers')
      .update(updates)
      .eq('id', id)
    if (!error) await fetch()
    return error
  }, [fetch])

  const deleteWorker = useCallback(async (id: string) => {
    const { error } = await supabase
      .from('workers')
      .delete()
      .eq('id', id)
    if (!error) await fetch()
    return error
  }, [fetch])

  return { workers, loading, refetch: fetch, addWorker, updateWorker, deleteWorker }
}
