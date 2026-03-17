import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import type { Order } from '../types/database'

const CACHE_KEY = 'orders_cache'

function getCached(): Order[] {
  try {
    const raw = localStorage.getItem(CACHE_KEY)
    return raw ? JSON.parse(raw) : []
  } catch { return [] }
}

function setCache(orders: Order[]) {
  try { localStorage.setItem(CACHE_KEY, JSON.stringify(orders)) } catch {}
}

export function useOrders() {
  const cached = getCached()
  const [orders, setOrders] = useState<Order[]>(cached)
  const [loading, setLoading] = useState(cached.length === 0)
  const [error, setError] = useState<string | null>(null)

  const fetch = useCallback(async () => {
    if (orders.length === 0) setLoading(true)
    const { data, error: err } = await supabase
      .from('orders')
      .select('*, client:clients(name, type), order_items(total_price, m2, quantity, has_handle, has_wplyka, color_surcharge, painting_variant_id)')
      .order('number', { ascending: false })

    if (err) {
      setError(err.message)
    } else {
      const fresh = (data as Order[]) ?? []
      setOrders(fresh)
      setCache(fresh)
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
