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
    const deleted = products.find(p => p.id === id)
    const { error } = await supabase.from('products').delete().eq('id', id)
    if (error) { toast('Nie można usunąć — materiał jest używany', 'error'); return }
    if (editingId === id) setEditingId(null)
    fetchProducts()
    toast('Materiał usunięty', 'success', {
      label: 'Cofnij',
      onClick: async () => {
        if (!deleted) return
        const { id: _id, default_supplier, created_at, ...rest } = deleted as any
        await supabase.from('products').insert(rest)
        fetchProducts()
        toast('Materiał przywrócony')
      },
    })
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

  const ic = "w-full rounded border border-gray-300 px-1.5 py-0.5 text-xs text-gray-800 outline-none focus:ring-2 focus:ring-amber-500/30"

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-sm font-bold text-gray-900">Materiały</h1>
        <button onClick={add}
          className="flex items-center gap-1 rounded-md bg-amber-500 px-2.5 py-1 text-xs font-medium text-white hover:bg-amber-400">
          <Plus className="h-3 w-3" /> Dodaj
        </button>
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-gray-300 border-t-amber-500" />
        </div>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-gray-200 bg-white max-w-5xl">
          <table className="w-full text-xs table-fixed">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                <th className="px-2 py-1.5 text-left text-[10px] font-medium text-gray-500 w-[35%]">Nazwa</th>
                <th className="px-2 py-1.5 text-left text-[10px] font-medium text-gray-500 w-[7%]">Jedn.</th>
                <th className="px-2 py-1.5 text-right text-[10px] font-medium text-gray-500 w-[12%]">Cena</th>
                <th className="px-2 py-1.5 text-left text-[10px] font-medium text-gray-500 w-[25%]">Dostawca</th>
                <th className="px-2 py-1.5 text-left text-[10px] font-medium text-gray-500 w-[14%]">Częstotl.</th>
                <th className="px-1 py-1.5 w-[7%]"></th>
              </tr>
            </thead>
            <tbody>
              {products.map(p => {
                const isEd = editingId === p.id
                if (isEd) {
                  const kd = (e: React.KeyboardEvent) => { if (e.key === 'Enter') save(); if (e.key === 'Escape') setEditingId(null) }
                  return (
                    <tr key={p.id} ref={editRowRef} className="border-b border-gray-100 bg-amber-50/30" onBlur={handleRowBlur}>
                      <td className="px-2 py-0.5"><input value={pName} onChange={e => setPName(e.target.value)} className={ic} onKeyDown={kd} autoFocus /></td>
                      <td className="px-2 py-0.5">
                        <select value={pUnit} onChange={e => setPUnit(e.target.value)} className={ic} onKeyDown={kd}>
                          <option value="kg">kg</option><option value="l">l</option><option value="szt">szt</option>
                        </select>
                      </td>
                      <td className="px-2 py-0.5"><input type="number" step="0.01" value={pPrice} onChange={e => setPPrice(e.target.value)} className={`${ic} text-right`} onKeyDown={kd} placeholder="0,00" /></td>
                      <td className="px-2 py-0.5">
                        <select value={pSupplierId} onChange={e => setPSupplierId(e.target.value)} className={ic} onKeyDown={kd}>
                          <option value="">— brak —</option>
                          {suppliers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                        </select>
                      </td>
                      <td className="px-2 py-0.5">
                        <select value={pFreq} onChange={e => setPFreq(e.target.value)} className={ic} onKeyDown={kd}>
                          <option value="">— brak —</option>
                          <option value="co tydzień">co tydzień</option>
                          <option value="co 2 tygodnie">co 2 tygodnie</option>
                          <option value="co 4 tygodnie">co 4 tygodnie</option>
                          <option value="rzadziej">rzadziej</option>
                        </select>
                      </td>
                      <td className="px-1 py-0.5">
                        <div className="flex gap-0.5">
                          <button onMouseDown={e => { e.preventDefault(); save() }} className="rounded p-1 text-emerald-500 hover:text-emerald-700 hover:bg-emerald-50"><Check className="h-3.5 w-3.5" /></button>
                          <button onMouseDown={e => { e.preventDefault(); setEditingId(null) }} className="rounded p-1 text-gray-400 hover:text-gray-600 hover:bg-gray-100"><X className="h-3.5 w-3.5" /></button>
                        </div>
                      </td>
                    </tr>
                  )
                }
                return (
                  <tr key={p.id} className="border-b border-gray-100 hover:bg-gray-50 cursor-pointer" onClick={() => startEdit(p)}>
                    <td className="px-2 py-1 font-medium text-gray-800 truncate">{p.name}</td>
                    <td className="px-2 py-1 text-gray-500">{p.unit ?? 'kg'}</td>
                    <td className="px-2 py-1 text-right text-gray-500 tabular-nums">{p.default_price ? Number(p.default_price).toFixed(2).replace('.', ',') : '—'}</td>
                    <td className="px-2 py-1 text-gray-500 truncate">{p.default_supplier?.name ?? '—'}</td>
                    <td className="px-2 py-1 text-gray-500">{p.order_frequency || '—'}</td>
                    <td className="px-1 py-1" onClick={e => e.stopPropagation()}>
                      <button onMouseDown={e => { e.preventDefault(); e.stopPropagation(); remove(p.id) }} className="rounded p-0.5 text-gray-300 hover:text-red-500 hover:bg-red-50">
                        <Trash2 className="h-3 w-3" />
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
