import { useCallback, useEffect, useRef, useState } from 'react'
import { Plus, Trash2, Check, X } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useToast } from '../contexts/ToastContext'
import type { Product, Supplier } from '../types/database'

export default function ProductsPage() {
  const [products, setProducts] = useState<Product[]>([])
  const [suppliers, setSuppliers] = useState<Supplier[]>([])
  const [loading, setLoading] = useState(true)
  const [editingId, setEditingId] = useState<string | null>(null)
  const { toast } = useToast()

  // Editing state
  const [pName, setPName] = useState('')
  const [pUnit, setPUnit] = useState('kg')
  const [pPrice, setPPrice] = useState('')
  const [pSupplierId, setPSupplierId] = useState('')
  const [pFreq, setPFreq] = useState('')

  const fetchProducts = useCallback(async () => {
    setLoading(true)
    const { data } = await supabase.from('products').select('*, default_supplier:suppliers(id, name)').order('name')
    setProducts(data ?? [])
    setLoading(false)
  }, [])

  const fetchSuppliers = useCallback(async () => {
    const { data } = await supabase.from('suppliers').select('*').order('name')
    setSuppliers(data ?? [])
  }, [])

  useEffect(() => { fetchProducts() }, [fetchProducts])
  useEffect(() => { fetchSuppliers() }, [fetchSuppliers])

  const startEdit = (p: Product) => {
    setEditingId(p.id)
    setPName(p.name); setPUnit(p.unit ?? 'kg'); setPPrice(String(p.default_price ?? ''))
    setPSupplierId(p.default_supplier_id ?? ''); setPFreq(p.order_frequency ?? '')
  }

  const save = async () => {
    if (!editingId || !pName.trim()) return
    await supabase.from('products').update({
      name: pName.trim(), unit: pUnit, default_price: Number(pPrice) || null,
      default_supplier_id: pSupplierId || null, order_frequency: pFreq || null,
    }).eq('id', editingId)
    setEditingId(null); fetchProducts()
  }

  const add = async () => {
    const { data } = await supabase.from('products').insert({ name: 'Nowy materiał' }).select('*').single()
    if (data) { await fetchProducts(); startEdit(data as Product) }
  }

  const remove = async (id: string) => {
    const { error } = await supabase.from('products').delete().eq('id', id)
    if (error) { toast('Nie można usunąć — materiał jest używany', 'error'); return }
    if (editingId === id) setEditingId(null)
    fetchProducts()
  }

  const editRowRef = useRef<HTMLTableRowElement>(null)

  const handleRowBlur = (e: React.FocusEvent) => {
    const row = editRowRef.current
    if (!row) return
    if (e.relatedTarget && row.contains(e.relatedTarget as Node)) return
    requestAnimationFrame(() => {
      if (row.contains(document.activeElement)) return
      save()
    })
  }

  const ic = "w-full rounded border border-gray-300 px-2 py-1.5 text-sm text-gray-800 outline-none focus:ring-2 focus:ring-amber-500/30"

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-gray-900">Materiały</h1>
        <button onClick={add}
          className="flex items-center gap-2 rounded-lg bg-amber-500 px-4 py-2 text-sm font-medium text-white hover:bg-amber-400">
          <Plus className="h-4 w-4" /> Dodaj materiał
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
                <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 w-20">Jednostka</th>
                <th className="px-3 py-2 text-right text-xs font-medium text-gray-500 w-32">Cena domyślna</th>
                <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">Domyślny dostawca</th>
                <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 w-36">Częstotliwość</th>
                <th className="px-1 py-2 w-16"></th>
              </tr>
            </thead>
            <tbody>
              {products.map(p => {
                const isEd = editingId === p.id
                if (isEd) {
                  const kd = (e: React.KeyboardEvent) => { if (e.key === 'Enter') save(); if (e.key === 'Escape') setEditingId(null) }
                  return (
                    <tr key={p.id} ref={editRowRef} className="border-b border-gray-100 bg-amber-50/30" onBlur={handleRowBlur}>
                      <td className="px-3 py-1.5"><input value={pName} onChange={e => setPName(e.target.value)} className={ic} onKeyDown={kd} autoFocus /></td>
                      <td className="px-3 py-1.5">
                        <select value={pUnit} onChange={e => setPUnit(e.target.value)} className={ic} onKeyDown={kd}>
                          <option value="kg">kg</option><option value="l">l</option><option value="szt">szt</option>
                        </select>
                      </td>
                      <td className="px-3 py-1.5"><input type="number" step="0.01" value={pPrice} onChange={e => setPPrice(e.target.value)} className={`${ic} text-right`} onKeyDown={kd} placeholder="0.00" /></td>
                      <td className="px-3 py-1.5">
                        <select value={pSupplierId} onChange={e => setPSupplierId(e.target.value)} className={ic} onKeyDown={kd}>
                          <option value="">— brak —</option>
                          {suppliers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                        </select>
                      </td>
                      <td className="px-3 py-1.5">
                        <select value={pFreq} onChange={e => setPFreq(e.target.value)} className={ic} onKeyDown={kd}>
                          <option value="">— brak —</option>
                          <option value="co tydzień">co tydzień</option>
                          <option value="co 2 tygodnie">co 2 tygodnie</option>
                          <option value="co 4 tygodnie">co 4 tygodnie</option>
                          <option value="rzadziej">rzadziej</option>
                        </select>
                      </td>
                      <td className="px-1 py-1.5 flex gap-1">
                        <button onClick={save} className="rounded p-1 text-emerald-500 hover:text-emerald-700"><Check className="h-4 w-4" /></button>
                        <button onClick={() => setEditingId(null)} className="rounded p-1 text-gray-400 hover:text-gray-600"><X className="h-4 w-4" /></button>
                      </td>
                    </tr>
                  )
                }
                return (
                  <tr key={p.id} className="border-b border-gray-100 hover:bg-gray-50 cursor-pointer" onClick={() => startEdit(p)}>
                    <td className="px-3 py-2 font-medium text-gray-800">{p.name}</td>
                    <td className="px-3 py-2 text-gray-500">{p.unit ?? 'kg'}</td>
                    <td className="px-3 py-2 text-right text-gray-500">{p.default_price ? Number(p.default_price).toFixed(2) + ' zł' : '—'}</td>
                    <td className="px-3 py-2 text-gray-500">{p.default_supplier?.name ?? '—'}</td>
                    <td className="px-3 py-2 text-gray-500">{p.order_frequency || '—'}</td>
                    <td className="px-1 py-2" onClick={e => e.stopPropagation()}>
                      <button onClick={() => remove(p.id)} className="rounded p-1 text-gray-300 hover:text-red-500 hover:bg-red-50">
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </td>
                  </tr>
                )
              })}
              {products.length === 0 && (
                <tr><td colSpan={6} className="px-4 py-8 text-center text-gray-400">Brak materiałów</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
