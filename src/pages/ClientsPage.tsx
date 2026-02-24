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
        <h1 className="text-xl font-bold text-gray-900">Klienci i cenniki</h1>
        <button onClick={() => setShowAdd(true)}
          className="flex items-center gap-2 rounded-lg bg-amber-500 px-4 py-2 text-sm font-medium text-white hover:bg-amber-400">
          <Plus className="h-4 w-4" /> Dodaj klienta
        </button>
      </div>

      {showAdd && (
        <div className="flex gap-2">
          <input type="text" value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="Nazwa klienta"
            className="flex-1 rounded-lg bg-white border border-gray-300 px-3 py-2 text-sm text-gray-800 outline-none focus:ring-2 focus:ring-amber-500/30" />
          <button onClick={handleAddClient} className="rounded-lg bg-amber-500 px-4 py-2 text-sm font-medium text-white hover:bg-amber-400">Dodaj</button>
          <button onClick={() => setShowAdd(false)} className="rounded-lg px-3 py-2 text-sm text-gray-500 hover:bg-gray-100">Anuluj</button>
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        {/* Client list */}
        <div className="space-y-1">
          {clients.map((c) => (
            <button key={c.id} onClick={() => setSelectedId(c.id)}
              className={`w-full text-left rounded-lg px-4 py-3 text-sm transition-colors ${
                selectedId === c.id ? 'bg-amber-50 text-amber-700' : 'bg-white text-gray-700 hover:bg-gray-50'
              }`}>
              <span className="font-medium">{c.name}</span>
              {c.access_code && <span className="ml-2 text-xs text-gray-400">PIN: {c.access_code}</span>}
            </button>
          ))}
          {clients.length === 0 && <p className="text-sm text-gray-400 py-4 text-center">Brak klientów</p>}
        </div>

        {/* Pricing table */}
        <div className="lg:col-span-2">
          {selectedId ? (
            <div className="rounded-lg border border-gray-200 bg-white overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-200 bg-gray-50">
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Wariant</th>
                    <th className="px-4 py-2 text-right text-xs font-medium text-gray-500">Domyślna</th>
                    <th className="px-4 py-2 text-right text-xs font-medium text-gray-500">Cena klienta</th>
                  </tr>
                </thead>
                <tbody>
                  {variants.map((v) => {
                    const custom = pricing.find((p) => p.variant_id === v.id)
                    return (
                      <tr key={v.id} className="border-b border-gray-100">
                        <td className="px-4 py-2 text-gray-800">{v.name}</td>
                        <td className="px-4 py-2 text-right text-gray-500">{v.default_price_per_m2} zl/m2</td>
                        <td className="px-4 py-2 text-right">
                          <input
                            type="number"
                            defaultValue={custom?.price_per_m2 ?? ''}
                            placeholder={String(v.default_price_per_m2)}
                            onBlur={(e) => handlePriceChange(v.id, e.target.value)}
                            className="w-24 rounded bg-white border border-gray-300 px-2 py-1 text-right text-sm text-gray-800 outline-none focus:ring-2 focus:ring-amber-500/30"
                          />
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="py-8 text-center text-gray-400 text-sm">Wybierz klienta, żeby zobaczyć cennik</p>
          )}
        </div>
      </div>
    </div>
  )
}
