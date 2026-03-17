import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import type { PaintingVariant } from '../types/database'

// Module-level cache — shared across all components, survives re-renders
let cachedVariants: PaintingVariant[] | null = null
let cachePromise: Promise<PaintingVariant[]> | null = null

async function fetchVariants(): Promise<PaintingVariant[]> {
  if (cachedVariants) return cachedVariants
  if (cachePromise) return cachePromise
  cachePromise = new Promise<PaintingVariant[]>(async (resolve) => {
    const { data } = await supabase
      .from('painting_variants')
      .select('*')
      .order('sort_order', { ascending: true, nullsFirst: false })
    cachedVariants = (data as PaintingVariant[]) ?? []
    cachePromise = null
    resolve(cachedVariants)
  })
  return cachePromise
}

export function usePaintingVariants() {
  const [variants, setVariants] = useState<PaintingVariant[]>(cachedVariants ?? [])
  const [loading, setLoading] = useState(!cachedVariants)

  const refetch = useCallback(async () => {
    cachedVariants = null // invalidate cache
    setLoading(true)
    const data = await fetchVariants()
    setVariants(data)
    setLoading(false)
  }, [])

  useEffect(() => {
    if (cachedVariants) {
      setVariants(cachedVariants)
      setLoading(false)
      return
    }
    fetchVariants().then((data) => {
      setVariants(data)
      setLoading(false)
    })
  }, [])

  return { variants, loading, refetch }
}
