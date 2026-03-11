import { useState } from 'react'
import { Building2, Pencil, Plus, Trash2, User } from 'lucide-react'
import { useClients } from '../hooks/useClients'
import { usePaintingVariants } from '../hooks/usePaintingVariants'
import { useClientPricing } from '../hooks/useClientPricing'
import { supabase } from '../lib/supabase'
import { useToast } from '../contexts/ToastContext'
import type { ClientType } from '../types/database'

export default function ClientsPage() {
  const { clients, refetch: refetchClients } = useClients()
  const { variants } = usePaintingVariants()
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const { pricing } = useClientPricing(selectedId)
  const [showAdd, setShowAdd] = useState<ClientType | null>(null)
  const [newName, setNewName] = useState('')
  const [newContactName, setNewContactName] = useState('')
  const [newPhone, setNewPhone] = useState('')
  const [newEmail, setNewEmail] = useState('')
  const [editingClient, setEditingClient] = useState(false)
  const [editName, setEditName] = useState('')
  const [editContactName, setEditContactName] = useState('')
  const [editPhone, setEditPhone] = useState('')
  const [editEmail, setEditEmail] = useState('')
  const { toast } = useToast()

  const companies = clients.filter((c) => c.type === 'company')
  const individuals = clients.filter((c) => c.type === 'individual')
  const selectedClient = clients.find((c) => c.id === selectedId)

  const startEditClient = () => {
    if (!selectedClient) return
    setEditName(selectedClient.name)
    setEditContactName(selectedClient.contact_name ?? '')
    setEditPhone(selectedClient.phone ?? '')
    setEditEmail(selectedClient.email ?? '')
    setEditingClient(true)
  }

  const saveClient = async () => {
    if (!selectedId || !editName.trim()) return
    await supabase.from('clients').update({
      name: editName.trim(),
      contact_name: editContactName.trim() || null,
      phone: editPhone.trim() || null,
      email: editEmail.trim() || null,
    }).eq('id', selectedId)
    setEditingClient(false)
    toast('Klient zaktualizowany')
    refetchClients()
  }

  const handleAddClient = async (type: ClientType) => {
    if (!newName.trim()) return
    await supabase.from('clients').insert({
      name: newName.trim(),
      type,
      contact_name: newContactName.trim() || null,
      phone: newPhone.trim() || null,
      email: newEmail.trim() || null,
    })
    setNewName('')
    setNewContactName('')
    setNewPhone('')
    setNewEmail('')
    setShowAdd(null)
    toast('Klient dodany')
    refetchClients()
  }

  const handleDeleteClient = async (id: string, name: string) => {
    if (!confirm(`Usunąć klienta ${name}?`)) return
    await supabase.from('clients').delete().eq('id', id)
    if (selectedId === id) setSelectedId(null)
    toast('Klient usunięty')
    refetchClients()
  }

  const resetAddForm = () => {
    setNewName('')
    setNewContactName('')
    setNewPhone('')
    setNewEmail('')
    setShowAdd(null)
  }

  const inputClass = "w-full rounded bg-white border border-gray-300 px-2 py-1.5 text-xs text-gray-800 outline-none focus:ring-2 focus:ring-amber-500/30"

  const renderAddForm = (type: ClientType) => (
    <div className="mt-2 space-y-2 rounded-lg border border-amber-200 bg-amber-50/50 p-3">
      <div>
        <label className="block text-[10px] font-medium text-gray-500 uppercase mb-0.5">
          {type === 'company' ? 'Nazwa firmy' : 'Imię i nazwisko'}
        </label>
        <input type="text" value={newName} onChange={(e) => setNewName(e.target.value)}
          className={inputClass} autoFocus />
      </div>
      {type === 'company' && (
        <div>
          <label className="block text-[10px] font-medium text-gray-500 uppercase mb-0.5">Osoba kontaktowa</label>
          <input type="text" value={newContactName} onChange={(e) => setNewContactName(e.target.value)}
            className={inputClass} placeholder="Imię i nazwisko" />
        </div>
      )}
      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="block text-[10px] font-medium text-gray-500 uppercase mb-0.5">Telefon</label>
          <input type="tel" value={newPhone} onChange={(e) => setNewPhone(e.target.value)}
            className={inputClass} placeholder="+48..." />
        </div>
        <div>
          <label className="block text-[10px] font-medium text-gray-500 uppercase mb-0.5">Email</label>
          <input type="email" value={newEmail} onChange={(e) => setNewEmail(e.target.value)}
            className={inputClass} placeholder="email@..." />
        </div>
      </div>
      <div className="flex gap-2">
        <button onClick={() => handleAddClient(type)}
          className="rounded bg-amber-500 px-3 py-1.5 text-xs font-medium text-white hover:bg-amber-400">Dodaj</button>
        <button onClick={resetAddForm}
          className="rounded px-3 py-1.5 text-xs text-gray-500 hover:bg-gray-100">Anuluj</button>
      </div>
    </div>
  )

  const renderClientList = (list: typeof clients, type: ClientType, icon: React.ReactNode, title: string) => (
    <div>
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-1.5">
          {icon}
          <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wide">{title}</h2>
          <span className="text-[10px] text-gray-400">({list.length})</span>
        </div>
        <button onClick={() => setShowAdd(type)}
          className="flex items-center gap-1 rounded-md bg-amber-50 px-2 py-1 text-[11px] font-medium text-amber-600 hover:bg-amber-100">
          <Plus className="h-3 w-3" /> Dodaj
        </button>
      </div>
      <div className="space-y-0.5">
        {list.map((c) => (
          <div key={c.id} className="flex items-center gap-1">
            <button onClick={() => setSelectedId(c.id)}
              className={`flex-1 text-left rounded-lg px-3 py-2 text-xs transition-colors ${
                selectedId === c.id ? 'bg-amber-50 text-amber-700 border border-amber-200' : 'bg-white text-gray-700 hover:bg-gray-50 border border-transparent'
              }`}>
              <span className="font-medium">{c.name}</span>
              {c.phone && <span className="ml-2 text-gray-400">{c.phone}</span>}
            </button>
            <button onClick={() => handleDeleteClient(c.id, c.name)}
              className="rounded-md p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50">
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          </div>
        ))}
        {list.length === 0 && <p className="text-xs text-gray-400 py-3 text-center">Brak</p>}
      </div>
      {showAdd === type && renderAddForm(type)}
    </div>
  )

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold text-gray-900">Klienci i cenniki</h1>

      {/* Two-column client lists */}
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        {renderClientList(companies, 'company', <Building2 className="h-4 w-4 text-blue-500" />, 'Firmy')}
        {renderClientList(individuals, 'individual', <User className="h-4 w-4 text-violet-500" />, 'Klienci indywidualni')}
      </div>

      {/* Selected client details + pricing */}
      {selectedClient && (
        <div className="space-y-4 border-t border-gray-200 pt-4">
          {editingClient ? (
            <div className="grid grid-cols-2 gap-3 rounded-lg bg-gray-50 p-3 max-w-2xl">
              <div>
                <label className="block text-[10px] font-medium text-gray-500 uppercase mb-0.5">
                  {selectedClient.type === 'company' ? 'Nazwa firmy' : 'Imię i nazwisko'}
                </label>
                <input type="text" value={editName} onChange={(e) => setEditName(e.target.value)} className={inputClass} />
              </div>
              {selectedClient.type === 'company' && (
                <div>
                  <label className="block text-[10px] font-medium text-gray-500 uppercase mb-0.5">Osoba kontaktowa</label>
                  <input type="text" value={editContactName} onChange={(e) => setEditContactName(e.target.value)} className={inputClass} />
                </div>
              )}
              <div>
                <label className="block text-[10px] font-medium text-gray-500 uppercase mb-0.5">Telefon</label>
                <input type="tel" value={editPhone} onChange={(e) => setEditPhone(e.target.value)} className={inputClass} />
              </div>
              <div>
                <label className="block text-[10px] font-medium text-gray-500 uppercase mb-0.5">Email</label>
                <input type="email" value={editEmail} onChange={(e) => setEditEmail(e.target.value)} className={inputClass} />
              </div>
              <div className="col-span-2 flex gap-2">
                <button onClick={saveClient} className="rounded bg-amber-500 px-3 py-1.5 text-xs font-medium text-white hover:bg-amber-400">Zapisz</button>
                <button onClick={() => setEditingClient(false)} className="rounded px-3 py-1.5 text-xs text-gray-500 hover:bg-gray-100">Anuluj</button>
              </div>
            </div>
          ) : (
            <div className="flex items-start justify-between max-w-2xl">
              <div>
                <div className="flex items-center gap-2">
                  {selectedClient.type === 'company' ? <Building2 className="h-4 w-4 text-blue-500" /> : <User className="h-4 w-4 text-violet-500" />}
                  <h2 className="text-lg font-semibold text-gray-900">{selectedClient.name}</h2>
                </div>
                <div className="mt-1 flex flex-wrap gap-x-4 gap-y-0.5 text-xs text-gray-500">
                  {selectedClient.contact_name && <span>Kontakt: {selectedClient.contact_name}</span>}
                  {selectedClient.phone && <span>Tel: {selectedClient.phone}</span>}
                  {selectedClient.email && <span>Email: {selectedClient.email}</span>}
                </div>
              </div>
              <button onClick={startEditClient}
                className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium text-gray-500 hover:bg-gray-100 hover:text-gray-700">
                <Pencil className="h-3.5 w-3.5" /> Edytuj
              </button>
            </div>
          )}

          {/* Pricing table */}
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
      )}

      {!selectedClient && (
        <p className="py-8 text-center text-gray-400 text-sm border-t border-gray-200 mt-4">Wybierz klienta, żeby zobaczyć cennik</p>
      )}
    </div>
  )
}
