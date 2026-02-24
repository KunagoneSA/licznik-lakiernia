import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import type { Order } from '../types/database'

export function useOrders() {
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetch = useCallback(async () => {
    setLoading(true)
    const { data, error: err } = await supabase
      .from('orders')
      .select('*, client:clients(name), order_items(total_price)')
      .order('number', { ascending: false })

    if (err) {
      setError(err.message)
    } else {
      setOrders((data as Order[]) ?? [])
      setError(null)
    }
    setLoading(false)
  }, [])

  useEffect(() => {
    fetch()

    const channel = supabase
      .channel('orders-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, () => {
        fetch()
      })
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [fetch])

  return { orders, loading, error, refetch: fetch }
}
