import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import type { Order } from '../types/database'

export function useOrder(id: string) {
  const [order, setOrder] = useState<Order | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetch = useCallback(async () => {
    setLoading(true)
    const { data, error: err } = await supabase
      .from('orders')
      .select('*, client:clients(id, name)')
      .eq('id', id)
      .single()

    if (err) {
      setError(err.message)
    } else {
      setOrder(data as Order)
      setError(null)
    }
    setLoading(false)
  }, [id])

  useEffect(() => { fetch() }, [fetch])

  const updateOrder = useCallback(async (updates: Partial<Order>) => {
    const { error: err } = await supabase
      .from('orders')
      .update(updates)
      .eq('id', id)
    if (!err) await fetch()
    return err
  }, [id, fetch])

  return { order, loading, error, refetch: fetch, updateOrder }
}
