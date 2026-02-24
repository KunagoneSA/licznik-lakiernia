import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import type { Client } from '../types/database'

export function useClients() {
  const [clients, setClients] = useState<Client[]>([])
  const [loading, setLoading] = useState(true)

  const fetch = useCallback(async () => {
    setLoading(true)
    const { data } = await supabase
      .from('clients')
      .select('*')
      .order('name')
    setClients((data as Client[]) ?? [])
    setLoading(false)
  }, [])

  useEffect(() => { fetch() }, [fetch])

  return { clients, loading, refetch: fetch }
}
