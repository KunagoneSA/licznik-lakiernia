import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

export interface Worker {
  id: string
  name: string
  hourly_rate: number
  active: boolean
  created_at: string
}

export function useWorkers() {
  const [workers, setWorkers] = useState<Worker[]>([])
  const [loading, setLoading] = useState(true)

  const fetch = useCallback(async () => {
    setLoading(true)
    const { data } = await supabase
      .from('workers')
      .select('*')
      .order('name')
    setWorkers((data as Worker[]) ?? [])
    setLoading(false)
  }, [])

  useEffect(() => { fetch() }, [fetch])

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
