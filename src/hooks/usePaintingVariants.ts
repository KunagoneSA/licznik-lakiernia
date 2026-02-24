import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import type { PaintingVariant } from '../types/database'

export function usePaintingVariants() {
  const [variants, setVariants] = useState<PaintingVariant[]>([])
  const [loading, setLoading] = useState(true)

  const fetch = useCallback(async () => {
    setLoading(true)
    const { data } = await supabase
      .from('painting_variants')
      .select('*')
      .order('name')
    setVariants((data as PaintingVariant[]) ?? [])
    setLoading(false)
  }, [])

  useEffect(() => { fetch() }, [fetch])

  return { variants, loading, refetch: fetch }
}
