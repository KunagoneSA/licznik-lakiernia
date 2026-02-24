import { useCallback, useEffect, useState } from 'react'
import { Plus, X } from 'lucide-react'
import { supabase } from '../lib/supabase'
import type { PaintPurchase } from '../types/database'

export default function PaintPurchasesPage() {
  const [purchases, setPurchases] = useState<PaintPurchase[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)

  const fetch = useCallback(async () => {
    setLoading(true)
    const { data } = await supabase.from('paint_purchases').select('*').order('date', { ascending: false })
    setPurchases((data as PaintPurchase[]) ?? [])
    setLoading(false)
  }, [])

  useEffect(() => { fetch() }, [fetch])

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-slate-100">Zakupy lakierow</h1>
        <button onClick={() => setShowForm(true)}
          className="flex items-center gap-2 rounded-lg bg-amber-500 px-4 py-2 text-sm font-medium text-slate-900 hover:bg-amber-400">
          <Plus className="h-4 w-4" /> Dodaj zakup
        </button>
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-slate-700 border-t-amber-500" />
        </div>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-slate-800">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-800 bg-slate-800/50">
                <th className="px-4 py-2 text-left text-xs font-medium text-slate-400">Data</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-slate-400">Dostawca</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-slate-400">Produkt</th>
                <th className="px-4 py-2 text-right text-xs font-medium text-slate-400">Ilosc</th>
                <th className="px-4 py-2 text-right text-xs font-medium text-slate-400">Cena jedn.</th>
                <th className="px-4 py-2 text-right text-xs font-medium text-slate-400">Suma</th>
              </tr>
            </thead>
            <tbody>
              {purchases.map((p) => (
                <tr key={p.id} className="border-b border-slate-800/50">
                  <td className="px-4 py-2 text-slate-400">{new Date(p.date).toLocaleDateString('pl-PL')}</td>
                  <td className="px-4 py-2 text-slate-200">{p.supplier}</td>
                  <td className="px-4 py-2 text-slate-300">{p.product}</td>
                  <td className="px-4 py-2 text-right text-slate-300">{p.quantity} {p.unit}</td>
                  <td className="px-4 py-2 text-right text-slate-400">{Number(p.unit_price).toFixed(2)} zl</td>
                  <td className="px-4 py-2 text-right font-medium text-amber-400">{Number(p.total).toFixed(2)} zl</td>
                </tr>
              ))}
              {purchases.length === 0 && (
                <tr><td colSpan={6} className="px-4 py-8 text-center text-slate-500">Brak zakupow</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {showForm && <PurchaseFormModal onClose={() => setShowForm(false)} onSaved={() => { setShowForm(false); fetch() }} />}
    </div>
  )
}

function PurchaseFormModal({ onClose, onSaved }: { onClose: () => void; onSaved: () => void }) {
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10))
  const [supplier, setSupplier] = useState('')
  const [product, setProduct] = useState('')
  const [quantity, setQuantity] = useState(0)
  const [unit, setUnit] = useState('kg')
  const [unitPrice, setUnitPrice] = useState(0)
  const [saving, setSaving] = useState(false)

  const total = quantity * unitPrice

  const handleSave = async () => {
    if (!supplier || !product || !quantity) return
    setSaving(true)
    await supabase.from('paint_purchases').insert({
      date, supplier, product, quantity, unit, unit_price: unitPrice,
      total: Math.round(total * 100) / 100,
    })
    setSaving(false)
    onSaved()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" onClick={onClose}>
      <div className="w-full max-w-md rounded-xl bg-slate-800 border border-slate-700 p-6" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-slate-100">Nowy zakup</h2>
          <button onClick={onClose} className="rounded-md p-1 text-slate-400 hover:bg-slate-700"><X className="h-5 w-5" /></button>
        </div>
        <div className="space-y-3">
          <div>
            <label className="block text-xs font-medium text-slate-400 uppercase mb-1">Data</label>
            <input type="date" value={date} onChange={(e) => setDate(e.target.value)}
              className="w-full rounded-lg bg-slate-900 border border-slate-700 px-3 py-2 text-sm text-slate-200 outline-none focus:ring-2 focus:ring-amber-500/50" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-400 uppercase mb-1">Dostawca</label>
              <input type="text" value={supplier} onChange={(e) => setSupplier(e.target.value)}
                className="w-full rounded-lg bg-slate-900 border border-slate-700 px-3 py-2 text-sm text-slate-200 outline-none focus:ring-2 focus:ring-amber-500/50" />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-400 uppercase mb-1">Produkt</label>
              <input type="text" value={product} onChange={(e) => setProduct(e.target.value)}
                className="w-full rounded-lg bg-slate-900 border border-slate-700 px-3 py-2 text-sm text-slate-200 outline-none focus:ring-2 focus:ring-amber-500/50" />
            </div>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-400 uppercase mb-1">Ilosc</label>
              <input type="number" value={quantity || ''} onChange={(e) => setQuantity(Number(e.target.value))}
                className="w-full rounded-lg bg-slate-900 border border-slate-700 px-3 py-2 text-sm text-slate-200 outline-none focus:ring-2 focus:ring-amber-500/50" />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-400 uppercase mb-1">Jednostka</label>
              <select value={unit} onChange={(e) => setUnit(e.target.value)}
                className="w-full rounded-lg bg-slate-900 border border-slate-700 px-3 py-2 text-sm text-slate-200 outline-none focus:ring-2 focus:ring-amber-500/50">
                <option value="kg">kg</option><option value="l">l</option><option value="szt">szt</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-400 uppercase mb-1">Cena jedn.</label>
              <input type="number" step="0.01" value={unitPrice || ''} onChange={(e) => setUnitPrice(Number(e.target.value))}
                className="w-full rounded-lg bg-slate-900 border border-slate-700 px-3 py-2 text-sm text-slate-200 outline-none focus:ring-2 focus:ring-amber-500/50" />
            </div>
          </div>
          <div className="rounded-lg bg-slate-900 p-3 text-sm">
            <span className="text-slate-500">Suma:</span> <span className="text-amber-400 font-bold">{total.toFixed(2)} zl</span>
          </div>
        </div>
        <div className="mt-4 flex justify-end gap-2">
          <button onClick={onClose} className="rounded-lg px-4 py-2 text-sm text-slate-400 hover:bg-slate-700">Anuluj</button>
          <button onClick={handleSave} disabled={!supplier || !product || !quantity || saving}
            className="rounded-lg bg-amber-500 px-4 py-2 text-sm font-medium text-slate-900 hover:bg-amber-400 disabled:opacity-50">
            {saving ? 'Zapisywanie...' : 'Dodaj'}
          </button>
        </div>
      </div>
    </div>
  )
}
