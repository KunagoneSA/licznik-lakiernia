import { useCallback, useRef, useState } from 'react'
import { Building2, Check, Plus, Trash2, User, X } from 'lucide-react'
import { useClients } from '../hooks/useClients'
import { usePaintingVariants } from '../hooks/usePaintingVariants'
import { useClientPricing } from '../hooks/useClientPricing'
import { supabase } from '../lib/supabase'
import { useToast } from '../contexts/ToastContext'
import type { Client, ClientType } from '../types/database'

export default function ClientsPage() {
  const { clients, refetch: refetchClients } = useClients()
  const { variants } = usePaintingVariants()
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const { pricing, loading: pricingLoading, upsertPricing } = useClientPricing(selectedId)
  const [showAdd, setShowAdd] = useState<ClientType | null>(null)
  const [newName, setNewName] = useState('')
  const [newContactName, setNewContactName] = useState('')
  const [newPhone, setNewPhone] = useState('')
  const [newEmail, setNewEmail] = useState('')
  const { toast } = useToast()

  // Inline editing state
  const [editingId, setEditingId] = useState<string | null>(null)
  const [eName, setEName] = useState('')
  const [eContact, setEContact] = useState('')
  const [ePhone, setEPhone] = useState('')
  const [eEmail, setEEmail] = useState('')

  const companies = clients.filter((c) => c.type === 'company')
  const individuals = clients.filter((c) => c.type === 'individual')

  const startEdit = (c: Client) => {
    setEditingId(c.id)
    setSelectedId(c.id)
    setEName(c.name)
    setEContact(c.contact_name ?? '')
    setEPhone(c.phone ?? '')
    setEEmail(c.email ?? '')
  }

  const saveEdit = useCallback(async () => {
    if (!editingId || !eName.trim()) return
    await supabase.from('clients').update({
      name: eName.trim(),
      contact_name: eContact.trim() || null,
      phone: ePhone.trim() || null,
      email: eEmail.trim() || null,
    }).eq('id', editingId)
    setEditingId(null)
    refetchClients()
  }, [editingId, eName, eContact, ePhone, eEmail, refetchClients])

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
    if (editingId === id) setEditingId(null)
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

  const editRowRef = useRef<HTMLTableRowElement>(null)
  const editIndRef = useRef<HTMLDivElement>(null)

  const handleCompanyRowBlur = (e: React.FocusEvent) => {
    const row = editRowRef.current
    if (!row) return
    if (e.relatedTarget && row.contains(e.relatedTarget as Node)) return
    requestAnimationFrame(() => {
      if (row.contains(document.activeElement)) return
      saveEdit()
    })
  }

  const handleIndRowBlur = (e: React.FocusEvent) => {
    const row = editIndRef.current
    if (!row) return
    if (e.relatedTarget && row.contains(e.relatedTarget as Node)) return
    requestAnimationFrame(() => {
      if (row.contains(document.activeElement)) return
      saveEdit()
    })
  }

  const ic = "w-full rounded border border-gray-300 px-2 py-1.5 text-sm text-gray-800 outline-none focus:ring-2 focus:ring-amber-500/30"
  const inputClassAdd = "w-full rounded bg-white border border-gray-300 px-2 py-1.5 text-xs text-gray-800 outline-none focus:ring-2 focus:ring-amber-500/30"

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-bold text-gray-900">Klienci i cenniki</h1>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_280px]">
        {/* Companies — table with inline edit */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-1.5">
              <Building2 className="h-4 w-4 text-blue-500" />
              <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Firmy</h2>
              <span className="text-[10px] text-gray-400">({companies.length})</span>
            </div>
            <button onClick={() => setShowAdd('company')}
              className="flex items-center gap-1 rounded-md bg-amber-50 px-2 py-1 text-[11px] font-medium text-amber-600 hover:bg-amber-100">
              <Plus className="h-3 w-3" /> Dodaj
            </button>
          </div>

          <div className="overflow-x-auto rounded-lg border border-gray-200 bg-white">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200 bg-gray-50">
                  <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">Nazwa firmy</th>
                  <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">Osoba kontaktowa</th>
                  <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">Telefon</th>
                  <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">Email</th>
                  <th className="px-1 py-2 w-16"></th>
                </tr>
              </thead>
              <tbody>
                {companies.map((c) => {
                  const isEd = editingId === c.id
                  if (isEd) {
                    const kd = (e: React.KeyboardEvent) => { if (e.key === 'Enter') saveEdit(); if (e.key === 'Escape') setEditingId(null) }
                    return (
                      <tr key={c.id} ref={editRowRef} className="border-b border-gray-100 bg-amber-50/30" onBlur={handleCompanyRowBlur}>
                        <td className="px-3 py-1.5"><input value={eName} onChange={e => setEName(e.target.value)} className={ic} onKeyDown={kd} autoFocus /></td>
                        <td className="px-3 py-1.5"><input value={eContact} onChange={e => setEContact(e.target.value)} className={ic} onKeyDown={kd} placeholder="osoba kontaktowa" /></td>
                        <td className="px-3 py-1.5"><input value={ePhone} onChange={e => setEPhone(e.target.value)} className={ic} onKeyDown={kd} placeholder="telefon" /></td>
                        <td className="px-3 py-1.5"><input value={eEmail} onChange={e => setEEmail(e.target.value)} className={ic} onKeyDown={kd} placeholder="email" /></td>
                        <td className="px-1 py-1.5 flex gap-1">
                          <button onClick={saveEdit} className="rounded p-1 text-emerald-500 hover:text-emerald-700"><Check className="h-4 w-4" /></button>
                          <button onClick={() => setEditingId(null)} className="rounded p-1 text-gray-400 hover:text-gray-600"><X className="h-4 w-4" /></button>
                        </td>
                      </tr>
                    )
                  }
                  return (
                    <tr key={c.id}
                      onClick={() => { setSelectedId(c.id); setEditingId(null) }}
                      onDoubleClick={() => { startEdit(c) }}
                      className={`border-b border-gray-100 cursor-pointer transition-colors ${
                        selectedId === c.id ? 'bg-amber-50' : 'hover:bg-gray-50'
                      }`}>
                      <td className="px-3 py-2 font-medium text-gray-800">{c.name}</td>
                      <td className="px-3 py-2 text-gray-500">{c.contact_name || '—'}</td>
                      <td className="px-3 py-2 text-gray-500">{c.phone || '—'}</td>
                      <td className="px-3 py-2 text-gray-500">{c.email || '—'}</td>
                      <td className="px-1 py-2" onClick={(e) => e.stopPropagation()}>
                        <button onClick={() => handleDeleteClient(c.id, c.name)}
                          className="rounded p-1 text-gray-300 hover:text-red-500 hover:bg-red-50">
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </td>
                    </tr>
                  )
                })}
                {companies.length === 0 && (
                  <tr><td colSpan={5} className="px-4 py-6 text-center text-gray-400 text-xs">Brak firm</td></tr>
                )}
              </tbody>
            </table>
          </div>

          {showAdd === 'company' && (
            <div className="mt-2 space-y-2 rounded-lg border border-amber-200 bg-amber-50/50 p-3">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[10px] font-medium text-gray-500 uppercase mb-0.5">Nazwa firmy</label>
                  <input type="text" value={newName} onChange={(e) => setNewName(e.target.value)}
                    className={inputClassAdd} autoFocus />
                </div>
                <div>
                  <label className="block text-[10px] font-medium text-gray-500 uppercase mb-0.5">Osoba kontaktowa</label>
                  <input type="text" value={newContactName} onChange={(e) => setNewContactName(e.target.value)}
                    className={inputClassAdd} placeholder="Imię i nazwisko" />
                </div>
                <div>
                  <label className="block text-[10px] font-medium text-gray-500 uppercase mb-0.5">Telefon</label>
                  <input type="tel" value={newPhone} onChange={(e) => setNewPhone(e.target.value)}
                    className={inputClassAdd} placeholder="+48..." />
                </div>
                <div>
                  <label className="block text-[10px] font-medium text-gray-500 uppercase mb-0.5">Email</label>
                  <input type="email" value={newEmail} onChange={(e) => setNewEmail(e.target.value)}
                    className={inputClassAdd} placeholder="email@..." />
                </div>
              </div>
              <div className="flex gap-2">
                <button onClick={() => handleAddClient('company')}
                  className="rounded bg-amber-500 px-3 py-1.5 text-xs font-medium text-white hover:bg-amber-400">Dodaj</button>
                <button onClick={resetAddForm}
                  className="rounded px-3 py-1.5 text-xs text-gray-500 hover:bg-gray-100">Anuluj</button>
              </div>
            </div>
          )}
        </div>

        {/* Individuals — compact list with inline edit */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-1.5">
              <User className="h-4 w-4 text-violet-500" />
              <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Indywidualni</h2>
              <span className="text-[10px] text-gray-400">({individuals.length})</span>
            </div>
            <button onClick={() => setShowAdd('individual')}
              className="flex items-center gap-1 rounded-md bg-amber-50 px-2 py-1 text-[11px] font-medium text-amber-600 hover:bg-amber-100">
              <Plus className="h-3 w-3" /> Dodaj
            </button>
          </div>
          <div className="space-y-0.5">
            {individuals.map((c) => {
              const isEd = editingId === c.id
              if (isEd) {
                const kd = (e: React.KeyboardEvent) => { if (e.key === 'Enter') saveEdit(); if (e.key === 'Escape') setEditingId(null) }
                return (
                  <div key={c.id} ref={editIndRef} onBlur={handleIndRowBlur}
                    className="rounded-lg border border-amber-200 bg-amber-50/30 p-2 space-y-1.5">
                    <input value={eName} onChange={e => setEName(e.target.value)} className={ic + ' text-xs'} onKeyDown={kd} autoFocus placeholder="Imię i nazwisko" />
                    <input value={ePhone} onChange={e => setEPhone(e.target.value)} className={ic + ' text-xs'} onKeyDown={kd} placeholder="Telefon" />
                    <input value={eEmail} onChange={e => setEEmail(e.target.value)} className={ic + ' text-xs'} onKeyDown={kd} placeholder="Email" />
                    <div className="flex gap-1">
                      <button onClick={saveEdit} className="rounded p-1 text-emerald-500 hover:text-emerald-700"><Check className="h-3.5 w-3.5" /></button>
                      <button onClick={() => setEditingId(null)} className="rounded p-1 text-gray-400 hover:text-gray-600"><X className="h-3.5 w-3.5" /></button>
                    </div>
                  </div>
                )
              }
              return (
                <div key={c.id} className="flex items-center gap-1">
                  <button onClick={() => { setSelectedId(c.id); setEditingId(null) }}
                    onDoubleClick={() => startEdit(c)}
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
              )
            })}
            {individuals.length === 0 && <p className="text-xs text-gray-400 py-3 text-center">Brak</p>}
          </div>

          {showAdd === 'individual' && (
            <div className="mt-2 space-y-2 rounded-lg border border-amber-200 bg-amber-50/50 p-3">
              <div>
                <label className="block text-[10px] font-medium text-gray-500 uppercase mb-0.5">Imię i nazwisko</label>
                <input type="text" value={newName} onChange={(e) => setNewName(e.target.value)}
                  className={inputClassAdd} autoFocus />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[10px] font-medium text-gray-500 uppercase mb-0.5">Telefon</label>
                  <input type="tel" value={newPhone} onChange={(e) => setNewPhone(e.target.value)}
                    className={inputClassAdd} placeholder="+48..." />
                </div>
                <div>
                  <label className="block text-[10px] font-medium text-gray-500 uppercase mb-0.5">Email</label>
                  <input type="email" value={newEmail} onChange={(e) => setNewEmail(e.target.value)}
                    className={inputClassAdd} placeholder="email@..." />
                </div>
              </div>
              <div className="flex gap-2">
                <button onClick={() => handleAddClient('individual')}
                  className="rounded bg-amber-500 px-3 py-1.5 text-xs font-medium text-white hover:bg-amber-400">Dodaj</button>
                <button onClick={resetAddForm}
                  className="rounded px-3 py-1.5 text-xs text-gray-500 hover:bg-gray-100">Anuluj</button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Pricing table for selected client */}
      {selectedId && (() => {
        const sel = clients.find((c) => c.id === selectedId)
        if (!sel) return null
        const mdfVariants = new Map(
          variants
            .filter((v) => v.name.includes('(+ MDF)'))
            .map((v) => [v.name.replace(' (+ MDF)', ''), v])
        )
        const mainVariants = variants.filter((v) => !v.name.includes('(+ MDF)'))
        const hasMdfCol = mdfVariants.size > 0
        return (
          <div key={selectedId} className="space-y-3 border-t border-gray-200 pt-4">
            <div className="flex items-center gap-2">
              {sel.type === 'company' ? <Building2 className="h-4 w-4 text-blue-500" /> : <User className="h-4 w-4 text-violet-500" />}
              <h2 className="text-sm font-semibold text-gray-700">Cennik — {sel.name}</h2>
            </div>
            {pricingLoading ? (
              <div className="flex justify-center py-6">
                <div className="h-5 w-5 animate-spin rounded-full border-2 border-gray-300 border-t-amber-500" />
              </div>
            ) : (
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
                      const currentPrice = custom?.price_per_m2 ?? v.default_price_per_m2
                      const mdfPrice = mdfV ? (mdfCustom?.price_per_m2 ?? mdfV.default_price_per_m2) : null
                      const inputCls = "w-20 rounded border border-gray-200 px-2 py-1 text-right text-xs text-amber-600 font-semibold tabular-nums outline-none focus:ring-2 focus:ring-amber-500/30 focus:border-amber-300"
                      return (
                        <tr key={v.id} className="border-b border-gray-100 hover:bg-gray-50">
                          <td className="px-2 py-1.5 text-gray-800 font-medium">{v.name}</td>
                          <td className="px-1.5 py-1">
                            <input
                              key={`${selectedId}-${v.id}-${currentPrice}`}
                              type="number"
                              defaultValue={currentPrice}
                              onBlur={async (e) => {
                                const val = Number(e.target.value)
                                if (val === currentPrice) return
                                await upsertPricing(v.id, val)
                                toast('Cennik zapisany')
                              }}
                              onKeyDown={(e) => { if (e.key === 'Enter') (e.target as HTMLInputElement).blur() }}
                              className={inputCls}
                            />
                          </td>
                          {hasMdfCol && (
                            <td className="px-1.5 py-1">
                              {mdfV ? (
                                <input
                                  key={`${selectedId}-${mdfV.id}-${mdfPrice}`}
                                  type="number"
                                  defaultValue={mdfPrice ?? ''}
                                  onBlur={async (e) => {
                                    const val = Number(e.target.value)
                                    if (val === mdfPrice) return
                                    await upsertPricing(mdfV.id, val)
                                    toast('Cennik zapisany')
                                  }}
                                  onKeyDown={(e) => { if (e.key === 'Enter') (e.target as HTMLInputElement).blur() }}
                                  className={inputCls}
                                />
                              ) : ''}
                            </td>
                          )}
                          <td className="px-2 py-1.5 text-center text-gray-500">{v.sides}</td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )
      })()}

      {!selectedId && (
        <p className="py-8 text-center text-gray-400 text-sm border-t border-gray-200 mt-4">Wybierz klienta, żeby zobaczyć cennik</p>
      )}
    </div>
  )
}
