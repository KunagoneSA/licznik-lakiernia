import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import type { WorkLog } from '../types/database'

export function useWorkLogs(orderId?: string | null) {
  const [logs, setLogs] = useState<WorkLog[]>([])
  const [loading, setLoading] = useState(true)

  const fetch = useCallback(async () => {
    setLoading(true)
    let query = supabase
      .from('work_logs')
      .select('*')
      .order('date', { ascending: false })

    if (orderId) {
      query = query.eq('order_id', orderId)
    }

    const { data } = await query
    setLogs((data as WorkLog[]) ?? [])
    setLoading(false)
  }, [orderId])

  useEffect(() => { fetch() }, [fetch])

  const addLog = useCallback(async (log: Omit<WorkLog, 'id' | 'created_at'>) => {
    const { error } = await supabase
      .from('work_logs')
      .insert(log)
    if (!error) await fetch()
    return error
  }, [fetch])

  return { logs, loading, refetch: fetch, addLog }
}
