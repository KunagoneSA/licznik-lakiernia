import { useCallback, useEffect, useState } from 'react'
import { Plus, Trash2, Check, X } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useToast } from '../contexts/ToastContext'
import type { Supplier } from '../types/database'

export default function SuppliersPage() {
  const [suppliers, setSuppliers] = useState<Supplier[]>([])
  const [loading, setLoading] = useState(true)
  const [editingId, setEditingId] = useState<string | null>(null)
  const { toast } = useToast()

  // Editing state
  const [sName, setSName] = useState('')
  const [sPhone, setSPhone] = useState('')
  const [sEmail, setSEmail] = useState('')
  const [sContact, setSContact] = useState('')
  const [sDefault, setSDefault] = useState(false)
  const [sFreq, setSFreq] = useState('')

  const fetchSuppliers = useCallback(async () => {
    setLoading(true)
    const { data } = await supabase.from('suppliers').select('*').order('name')
    setSuppliers(data ?? [])
    setLoading(false)
  }, [])

  useEffect(() => { fetchSuppliers() }, [fetchSuppliers])

  const startEdit = (s: Supplier) => {
    setEditingId(s.id)
    setSName(s.name); setSPhone(s.phone ?? ''); setSEmail(s.email ?? '')
    setSContact(s.contact_person ?? ''); setSDefault(s.is_default); setSFreq(s.order_frequency ?? '')
  }

  const save = async () => {
    if (!editingId || !sName.trim()) return
    await supabase.from('suppliers').update({
      name: sName.trim(), phone: sPhone || null, email: sEmail || null,
      contact_person: sContact || null, is_default: sDefault, order_frequency: sFreq || null,
    }).eq('id', editingId)
    setEditingId(null); fetchSuppliers()
  }

  const add = async () => {
    const { data } = await supabase.from('suppliers').insert({ name: 'Nowy dostawca' }).select('*').single()
    if (data) { await fetchSuppliers(); startEdit(data as Supplier) }
  }

  const remove = async (id: string) => {
    const { error } = await supabase.from('suppliers').delete().eq('id', id)
    if (error) { toast('Nie można usunąć — dostawca jest używany', 'error'); return }
    if (editingId === id) setEditingId(null)
    fetchSuppliers()
  }

  const ic = "w-full rounded border border-gray-300 px-2 py-1.5 text-sm text-gray-800 outline-none focus:ring-2 focus:ring-amber-500/30"

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-gray-900">Dostawcy</h1>
        <button onClick={add}
          className="flex items-center gap-2 rounded-lg bg-amber-500 px-4 py-2 text-sm font-medium text-white hover:bg-amber-400">
          <Plus className="h-4 w-4" /> Dodaj dostawcę
        </button>
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-gray-300 border-t-amber-500" />
        </div>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-gray-200 bg-white">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">Nazwa</th>
                <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">Telefon</th>
                <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">Email</th>
                <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">Osoba kontaktowa</th>
                <th className="px-3 py-2 text-center text-xs font-medium text-gray-500 w-20">Domyślny</th>
                <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">Częstotliwość</th>
                <th className="px-1 py-2 w-16"></th>
              </tr>
            </thead>
            <tbody>
              {suppliers.map(s => {
                const isEd = editingId === s.id
                if (isEd) {
                  const kd = (e: React.KeyboardEvent) => { if (e.key === 'Enter') save(); if (e.key === 'Escape') setEditingId(null) }
                  return (
                    <tr key={s.id} className="border-b border-gray-100 bg-amber-50/30">
                      <td className="px-3 py-1.5"><input value={sName} onChange={e => setSName(e.target.value)} className={ic} onKeyDown={kd} autoFocus /></td>
                      <td className="px-3 py-1.5"><input value={sPhone} onChange={e => setSPhone(e.target.value)} className={ic} onKeyDown={kd} placeholder="nr telefonu" /></td>
                      <td className="px-3 py-1.5"><input value={sEmail} onChange={e => setSEmail(e.target.value)} className={ic} onKeyDown={kd} placeholder="email" /></td>
                      <td className="px-3 py-1.5"><input value={sContact} onChange={e => setSContact(e.target.value)} className={ic} onKeyDown={kd} placeholder="osoba kontaktowa" /></td>
                      <td className="px-3 py-1.5 text-center"><input type="checkbox" checked={sDefault} onChange={e => setSDefault(e.target.checked)} className="h-4 w-4 rounded border-gray-300 text-amber-500 focus:ring-amber-500/30" /></td>
                      <td className="px-3 py-1.5"><input value={sFreq} onChange={e => setSFreq(e.target.value)} className={ic} onKeyDown={kd} placeholder="np. co tydzień" /></td>
                      <td className="px-1 py-1.5 flex gap-1">
                        <button onClick={save} className="rounded p-1 text-emerald-500 hover:text-emerald-700"><Check className="h-4 w-4" /></button>
                        <button onClick={() => setEditingId(null)} className="rounded p-1 text-gray-400 hover:text-gray-600"><X className="h-4 w-4" /></button>
                      </td>
                    </tr>
                  )
                }
                return (
                  <tr key={s.id} className="border-b border-gray-100 hover:bg-gray-50 cursor-pointer" onClick={() => startEdit(s)}>
                    <td className="px-3 py-2 font-medium text-gray-800">{s.name}</td>
                    <td className="px-3 py-2 text-gray-500">{s.phone || '—'}</td>
                    <td className="px-3 py-2 text-gray-500">{s.email || '—'}</td>
                    <td className="px-3 py-2 text-gray-500">{s.contact_person || '—'}</td>
                    <td className="px-3 py-2 text-center">{s.is_default ? <span className="text-emerald-600 font-bold">✓</span> : ''}</td>
                    <td className="px-3 py-2 text-gray-500">{s.order_frequency || '—'}</td>
                    <td className="px-1 py-2" onClick={e => e.stopPropagation()}>
                      <button onClick={() => remove(s.id)} className="rounded p-1 text-gray-300 hover:text-red-500 hover:bg-red-50">
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </td>
                  </tr>
                )
              })}
              {suppliers.length === 0 && (
                <tr><td colSpan={7} className="px-4 py-8 text-center text-gray-400">Brak dostawców</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
