import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import type { OrderItem } from '../types/database'

export function useOrderItems(orderId: string) {
  const [items, setItems] = useState<OrderItem[]>([])
  const [loading, setLoading] = useState(true)

  const fetch = useCallback(async () => {
    setLoading(true)
    const { data } = await supabase
      .from('order_items')
      .select('*, variant:painting_variants(id, name, sides)')
      .eq('order_id', orderId)
      .order('id')
    setItems((data as OrderItem[]) ?? [])
    setLoading(false)
  }, [orderId])

  useEffect(() => { fetch() }, [fetch])

  const addItem = useCallback(async (item: Omit<OrderItem, 'id' | 'order_id' | 'variant'>) => {
    const { error } = await supabase
      .from('order_items')
      .insert({ ...item, order_id: orderId })
    if (!error) await fetch()
    return error
  }, [orderId, fetch])

  const updateItem = useCallback(async (id: string, updates: Partial<OrderItem>) => {
    const { error } = await supabase
      .from('order_items')
      .update(updates)
      .eq('id', id)
    if (!error) await fetch()
    return error
  }, [fetch])

  const deleteItem = useCallback(async (id: string) => {
    const { error } = await supabase
      .from('order_items')
      .delete()
      .eq('id', id)
    if (!error) await fetch()
    return error
  }, [fetch])

  return { items, loading, refetch: fetch, addItem, updateItem, deleteItem }
}
