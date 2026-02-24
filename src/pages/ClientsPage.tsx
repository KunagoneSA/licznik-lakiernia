import { useState } from 'react'
import { Plus } from 'lucide-react'
import { useClients } from '../hooks/useClients'
import { usePaintingVariants } from '../hooks/usePaintingVariants'
import { useClientPricing } from '../hooks/useClientPricing'
import { supabase } from '../lib/supabase'

export default function ClientsPage() {
  const { clients, refetch: refetchClients } = useClients()
  const { variants } = usePaintingVariants()
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const { pricing, upsertPricing } = useClientPricing(selectedId)
  const [showAdd, setShowAdd] = useState(false)
  const [newName, setNewName] = useState('')

  const handleAddClient = async () => {
    if (!newName.trim()) return
    const code = String(Math.floor(1000 + Math.random() * 9000))
    await supabase.from('clients').insert({ name: newName.trim(), access_code: code })
    setNewName('')
    setShowAdd(false)
    refetchClients()
  }

  const handlePriceChange = async (variantId: string, value: string) => {
    const price = Number(value)
    if (!price || price <= 0) return
    await upsertPricing(variantId, price)
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-zinc-100">Klienci i cenniki</h1>
        <button onClick={() => setShowAdd(true)}
          className="flex items-center gap-2 rounded-lg bg-amber-500 px-4 py-2 text-sm font-medium text-zinc-900 hover:bg-amber-400">
          <Plus className="h-4 w-4" /> Dodaj klienta
        </button>
      </div>

      {showAdd && (
        <div className="flex gap-2">
          <input type="text" value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="Nazwa klienta"
            className="flex-1 rounded-lg bg-zinc-800 border border-zinc-700 px-3 py-2 text-sm text-zinc-200 outline-none focus:ring-2 focus:ring-amber-500/50" />
          <button onClick={handleAddClient} className="rounded-lg bg-amber-500 px-4 py-2 text-sm font-medium text-zinc-900 hover:bg-amber-400">Dodaj</button>
          <button onClick={() => setShowAdd(false)} className="rounded-lg px-3 py-2 text-sm text-zinc-400 hover:bg-zinc-700">Anuluj</button>
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        {/* Client list */}
        <div className="space-y-1">
          {clients.map((c) => (
            <button key={c.id} onClick={() => setSelectedId(c.id)}
              className={`w-full text-left rounded-lg px-4 py-3 text-sm transition-colors ${
                selectedId === c.id ? 'bg-amber-500/20 text-amber-400' : 'bg-zinc-800 text-zinc-200 hover:bg-zinc-700'
              }`}>
              <span className="font-medium">{c.name}</span>
              {c.access_code && <span className="ml-2 text-xs text-zinc-500">PIN: {c.access_code}</span>}
            </button>
          ))}
          {clients.length === 0 && <p className="text-sm text-zinc-500 py-4 text-center">Brak klientów</p>}
        </div>

        {/* Pricing table */}
        <div className="lg:col-span-2">
          {selectedId ? (
            <div className="rounded-lg border border-zinc-800 overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-zinc-800 bg-zinc-800/50">
                    <th className="px-4 py-2 text-left text-xs font-medium text-zinc-400">Wariant</th>
                    <th className="px-4 py-2 text-right text-xs font-medium text-zinc-400">Domyślna</th>
                    <th className="px-4 py-2 text-right text-xs font-medium text-zinc-400">Cena klienta</th>
                  </tr>
                </thead>
                <tbody>
                  {variants.map((v) => {
                    const custom = pricing.find((p) => p.variant_id === v.id)
                    return (
                      <tr key={v.id} className="border-b border-zinc-800/50">
                        <td className="px-4 py-2 text-zinc-200">{v.name}</td>
                        <td className="px-4 py-2 text-right text-zinc-400">{v.default_price_per_m2} zl/m2</td>
                        <td className="px-4 py-2 text-right">
                          <input
                            type="number"
                            defaultValue={custom?.price_per_m2 ?? ''}
                            placeholder={String(v.default_price_per_m2)}
                            onBlur={(e) => handlePriceChange(v.id, e.target.value)}
                            className="w-24 rounded bg-zinc-900 border border-zinc-700 px-2 py-1 text-right text-sm text-zinc-200 outline-none focus:ring-2 focus:ring-amber-500/50"
                          />
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="py-8 text-center text-zinc-500 text-sm">Wybierz klienta, żeby zobaczyć cennik</p>
          )}
        </div>
      </div>
    </div>
  )
}
