import { useState } from 'react'
import { Pencil, Plus, Trash2 } from 'lucide-react'
import { useClients } from '../hooks/useClients'
import { usePaintingVariants } from '../hooks/usePaintingVariants'
import { useClientPricing } from '../hooks/useClientPricing'
import { supabase } from '../lib/supabase'
import { useToast } from '../contexts/ToastContext'

export default function ClientsPage() {
  const { clients, refetch: refetchClients } = useClients()
  const { variants } = usePaintingVariants()
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const { pricing } = useClientPricing(selectedId)
  const [showAdd, setShowAdd] = useState(false)
  const [newName, setNewName] = useState('')
  const [editingClient, setEditingClient] = useState(false)
  const [editName, setEditName] = useState('')
  const [editContact, setEditContact] = useState('')
  const { toast } = useToast()

  const startEditClient = () => {
    const c = clients.find(cl => cl.id === selectedId)
    if (!c) return
    setEditName(c.name)
    setEditContact(c.contact_info ?? '')
    setEditingClient(true)
  }

  const saveClient = async () => {
    if (!selectedId || !editName.trim()) return
    await supabase.from('clients').update({
      name: editName.trim(),
      contact_info: editContact.trim() || null,
    }).eq('id', selectedId)
    setEditingClient(false)
    toast('Klient zaktualizowany')
    refetchClients()
  }

  const handleAddClient = async () => {
    if (!newName.trim()) return
    await supabase.from('clients').insert({ name: newName.trim() })
    setNewName('')
    setShowAdd(false)
    toast('Klient dodany')
    refetchClients()
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
            <div key={c.id} className="flex items-center gap-1">
              <button onClick={() => setSelectedId(c.id)}
                className={`flex-1 text-left rounded-lg px-4 py-3 text-sm transition-colors ${
                  selectedId === c.id ? 'bg-amber-50 text-amber-700' : 'bg-white text-gray-700 hover:bg-gray-50'
                }`}>
                <span className="font-medium">{c.name}</span>

              </button>
              <button onClick={async () => {
                if (!confirm(`Usunąć klienta ${c.name}?`)) return
                await supabase.from('clients').delete().eq('id', c.id)
                if (selectedId === c.id) setSelectedId(null)
                toast('Klient usunięty')
                refetchClients()
              }} className="rounded-md p-2 text-gray-400 hover:text-red-500 hover:bg-red-50">
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          ))}
          {clients.length === 0 && <p className="text-sm text-gray-400 py-4 text-center">Brak klientów</p>}
        </div>

        {/* Pricing table */}
        <div className="lg:col-span-2">
          {selectedId ? (
            <div className="space-y-4">
              {editingClient ? (
                <div className="flex gap-2 items-end">
                  <div className="flex-1">
                    <label className="block text-xs font-medium text-gray-500 uppercase mb-1">Nazwa</label>
                    <input type="text" value={editName} onChange={(e) => setEditName(e.target.value)}
                      className="w-full rounded-lg bg-white border border-gray-300 px-3 py-2 text-sm text-gray-800 outline-none focus:ring-2 focus:ring-amber-500/30" />
                  </div>
                  <div className="flex-1">
                    <label className="block text-xs font-medium text-gray-500 uppercase mb-1">Kontakt</label>
                    <input type="text" value={editContact} onChange={(e) => setEditContact(e.target.value)} placeholder="Telefon, email..."
                      className="w-full rounded-lg bg-white border border-gray-300 px-3 py-2 text-sm text-gray-800 outline-none focus:ring-2 focus:ring-amber-500/30" />
                  </div>
                  <button onClick={saveClient} className="rounded-lg bg-amber-500 px-4 py-2 text-sm font-medium text-white hover:bg-amber-400">Zapisz</button>
                  <button onClick={() => setEditingClient(false)} className="rounded-lg px-3 py-2 text-sm text-gray-500 hover:bg-gray-100">Anuluj</button>
                </div>
              ) : (
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-lg font-semibold text-gray-900">{clients.find(c => c.id === selectedId)?.name}</h2>
                    {clients.find(c => c.id === selectedId)?.contact_info && (
                      <p className="text-sm text-gray-500">{clients.find(c => c.id === selectedId)?.contact_info}</p>
                    )}
                  </div>
                  <button onClick={startEditClient} className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium text-gray-500 hover:bg-gray-100 hover:text-gray-700">
                    <Pencil className="h-3.5 w-3.5" /> Edytuj
                  </button>
                </div>
              )}
              {(() => {
                const mdfVariants = new Map(
                  variants
                    .filter((v) => v.name.includes('(+ MDF)'))
                    .map((v) => [v.name.replace(' (+ MDF)', ''), v])
                )
                const mainVariants = variants.filter((v) => !v.name.includes('(+ MDF)'))
                const hasMdfCol = mdfVariants.size > 0
                return (
                  <div className="rounded-lg border border-gray-200 bg-white overflow-hidden max-w-lg">
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="border-b border-gray-200 bg-gray-50">
                          <th className="px-2 py-1.5 text-left text-[10px] font-medium text-gray-500 uppercase">Wariant</th>
                          <th className="px-2 py-1.5 text-right text-[10px] font-medium text-gray-500 uppercase">Cena/m²</th>
                          {hasMdfCol && (
                            <th className="px-2 py-1.5 text-right text-[10px] font-medium text-gray-500 uppercase">+ MDF</th>
                          )}
                          <th className="px-2 py-1.5 text-center text-[10px] font-medium text-gray-500 uppercase">Strony</th>
                        </tr>
                      </thead>
                      <tbody>
                        {mainVariants.map((v) => {
                          const mdfV = mdfVariants.get(v.name)
                          const custom = pricing.find((p) => p.variant_id === v.id)
                          const mdfCustom = mdfV ? pricing.find((p) => p.variant_id === mdfV.id) : null
                          return (
                            <tr key={v.id} className="border-b border-gray-100 hover:bg-gray-50">
                              <td className="px-2 py-1.5 text-gray-800 font-medium">{v.name}</td>
                              <td className="py-1.5 pr-5 text-right text-amber-600 font-semibold tabular-nums">
                                {custom?.price_per_m2 ?? v.default_price_per_m2}
                              </td>
                              {hasMdfCol && (
                                <td className="py-1.5 pr-5 text-right text-amber-600 font-semibold tabular-nums">
                                  {mdfV ? (mdfCustom?.price_per_m2 ?? mdfV.default_price_per_m2) : ''}
                                </td>
                              )}
                              <td className="px-2 py-1.5 text-center text-gray-500">{v.sides === 2 ? '1' : v.sides}</td>
                            </tr>
                          )
                        })}
                      </tbody>
                    </table>
                  </div>
                )
              })()}
            </div>
          ) : (
            <p className="py-8 text-center text-gray-400 text-sm">Wybierz klienta, żeby zobaczyć cennik</p>
          )}
        </div>
      </div>
    </div>
  )
}
