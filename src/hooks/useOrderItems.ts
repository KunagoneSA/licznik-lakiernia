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
      .order('sort_order', { ascending: true })
      .order('created_at', { ascending: true })
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

  const reorderItems = useCallback(async (orderedIds: string[]) => {
    // Optimistic update
    setItems(prev => {
      const map = new Map(prev.map(i => [i.id, i]))
      return orderedIds.map((id, idx) => ({ ...map.get(id)!, sort_order: idx }))
    })
    // Persist to DB
    await Promise.all(orderedIds.map((id, idx) =>
      supabase.from('order_items').update({ sort_order: idx }).eq('id', id)
    ))
  }, [])

  return { items, loading, refetch: fetch, addItem, updateItem, deleteItem, reorderItems }
}
