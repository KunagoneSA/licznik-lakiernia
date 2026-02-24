import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import type { ClientPricing, PaintingVariant } from '../types/database'

export function useClientPricing(clientId: string | null) {
  const [pricing, setPricing] = useState<ClientPricing[]>([])
  const [loading, setLoading] = useState(false)

  const fetch = useCallback(async () => {
    if (!clientId) { setPricing([]); return }
    setLoading(true)
    const { data } = await supabase
      .from('client_pricing')
      .select('*')
      .eq('client_id', clientId)
    setPricing((data as ClientPricing[]) ?? [])
    setLoading(false)
  }, [clientId])

  useEffect(() => { fetch() }, [fetch])

  const getPriceForVariant = useCallback((variantId: string, variants: PaintingVariant[]): number => {
    const custom = pricing.find((p) => p.variant_id === variantId)
    if (custom) return custom.price_per_m2
    const variant = variants.find((v) => v.id === variantId)
    return variant?.default_price_per_m2 ?? 0
  }, [pricing])

  const upsertPricing = useCallback(async (variantId: string, pricePerM2: number) => {
    if (!clientId) return
    const existing = pricing.find((p) => p.variant_id === variantId)
    if (existing) {
      await supabase.from('client_pricing').update({ price_per_m2: pricePerM2 }).eq('id', existing.id)
    } else {
      await supabase.from('client_pricing').insert({ client_id: clientId, variant_id: variantId, price_per_m2: pricePerM2 })
    }
    await fetch()
  }, [clientId, pricing, fetch])

  return { pricing, loading, refetch: fetch, getPriceForVariant, upsertPricing }
}
