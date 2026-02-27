import { useCallback, useEffect, useState } from 'react'
import { Plus, Trash2, X } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useOrders } from '../hooks/useOrders'
import { useToast } from '../contexts/ToastContext'
import { useModalKeys } from '../hooks/useModalKeys'
import type { PaintPurchase } from '../types/database'

export default function PaintPurchasesPage() {
  const [purchases, setPurchases] = useState<PaintPurchase[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const { orders } = useOrders()
  const { toast } = useToast()

  const fetch = useCallback(async () => {
    setLoading(true)
    const { data } = await supabase.from('paint_purchases').select('*, order:orders(number)').order('date', { ascending: false })
    setPurchases((data as PaintPurchase[]) ?? [])
    setLoading(false)
  }, [])

  useEffect(() => { fetch() }, [fetch])

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-gray-900">Zakupy lakierów</h1>
        <button onClick={() => setShowForm(true)}
          className="flex items-center gap-2 rounded-lg bg-amber-500 px-4 py-2 text-sm font-medium text-white hover:bg-amber-400">
          <Plus className="h-4 w-4" /> Dodaj zakup
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
              <tr className="border-b border-gray-200 bg-gray-50">
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Data</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Dostawca</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Produkt</th>
                <th className="px-4 py-2 text-right text-xs font-medium text-gray-500">Ilość</th>
                <th className="px-4 py-2 text-right text-xs font-medium text-gray-500">Cena jedn.</th>
                <th className="px-4 py-2 text-right text-xs font-medium text-gray-500">Suma</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Zamówienie</th>
                <th className="px-4 py-2 w-8"></th>
              </tr>
            </thead>
            <tbody>
              {purchases.map((p) => (
                <tr key={p.id} className="border-b border-gray-100">
                  <td className="px-4 py-2 text-gray-500">{new Date(p.date).toLocaleDateString('pl-PL')}</td>
                  <td className="px-4 py-2 text-gray-800">{p.supplier}</td>
                  <td className="px-4 py-2 text-gray-600">{p.product}</td>
                  <td className="px-4 py-2 text-right text-gray-600">{p.quantity} {p.unit}</td>
                  <td className="px-4 py-2 text-right text-gray-500">{Number(p.unit_price).toFixed(2)} zł</td>
                  <td className="px-4 py-2 text-right font-medium text-amber-600">{Number(p.total).toFixed(2)} zł</td>
                  <td className="px-4 py-2 text-gray-500">
                    {(p as any).order?.number ? `#${(p as any).order.number}` : '—'}
                  </td>
                  <td className="px-4 py-2">
                    <button onClick={async () => {
                      if (!confirm('Usunąć ten zakup?')) return
                      await supabase.from('paint_purchases').delete().eq('id', p.id)
                      toast('Zakup usunięty')
                      fetch()
                    }} className="rounded p-1 text-gray-400 hover:text-red-500 hover:bg-red-50">
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </td>
                </tr>
              ))}
              {purchases.length === 0 && (
                <tr><td colSpan={8} className="px-4 py-8 text-center text-gray-400">Brak zakupów</td></tr>
              )}
              {purchases.length > 0 && (
                <tr className="bg-gray-50 font-medium">
                  <td className="px-4 py-2 text-gray-600" colSpan={5}>Razem</td>
                  <td className="px-4 py-2 text-right font-medium text-amber-600">{purchases.reduce((s, p) => s + Number(p.total), 0).toFixed(2)} zł</td>
                  <td colSpan={2}></td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {showForm && <PurchaseFormModal orders={orders.map(o => ({ id: o.id, number: o.number }))} onClose={() => setShowForm(false)} onSaved={() => { setShowForm(false); toast('Zakup dodany'); fetch() }} />}
    </div>
  )
}

function PurchaseFormModal({ orders, onClose, onSaved }: { orders: { id: string; number: number }[]; onClose: () => void; onSaved: () => void }) {
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10))
  const [supplier, setSupplier] = useState('')
  const [product, setProduct] = useState('')
  const [quantity, setQuantity] = useState(0)
  const [unit, setUnit] = useState('kg')
  const [unitPrice, setUnitPrice] = useState(0)
  const [orderId, setOrderId] = useState<string>('')
  const [saving, setSaving] = useState(false)
  useModalKeys(onClose)

  const total = quantity * unitPrice

  const handleSave = async () => {
    if (!supplier || !product || !quantity) return
    setSaving(true)
    await supabase.from('paint_purchases').insert({
      date, supplier, product, quantity, unit, unit_price: unitPrice,
      total: Math.round(total * 100) / 100,
      order_id: orderId || null,
    })
    setSaving(false)
    onSaved()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4" onClick={onClose}>
      <div className="w-full max-w-md rounded-xl bg-white border border-gray-200 shadow-lg p-6" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900">Nowy zakup</h2>
          <button onClick={onClose} className="rounded-md p-1 text-gray-500 hover:bg-gray-100"><X className="h-5 w-5" /></button>
        </div>
        <div className="space-y-3">
          <div>
            <label className="block text-xs font-medium text-gray-500 uppercase mb-1">Data</label>
            <input type="date" value={date} onChange={(e) => setDate(e.target.value)}
              className="w-full rounded-lg bg-gray-50 border border-gray-300 px-3 py-2 text-sm text-gray-800 outline-none focus:ring-2 focus:ring-amber-500/30" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-500 uppercase mb-1">Dostawca</label>
              <input type="text" value={supplier} onChange={(e) => setSupplier(e.target.value)}
                className="w-full rounded-lg bg-gray-50 border border-gray-300 px-3 py-2 text-sm text-gray-800 outline-none focus:ring-2 focus:ring-amber-500/30" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 uppercase mb-1">Produkt</label>
              <input type="text" value={product} onChange={(e) => setProduct(e.target.value)}
                className="w-full rounded-lg bg-gray-50 border border-gray-300 px-3 py-2 text-sm text-gray-800 outline-none focus:ring-2 focus:ring-amber-500/30" />
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 uppercase mb-1">Zamówienie (opcj.)</label>
            <select value={orderId} onChange={(e) => setOrderId(e.target.value)}
              className="w-full rounded-lg bg-gray-50 border border-gray-300 px-3 py-2 text-sm text-gray-800 outline-none focus:ring-2 focus:ring-amber-500/30">
              <option value="">— brak —</option>
              {orders.map((o) => <option key={o.id} value={o.id}>#{o.number}</option>)}
            </select>
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <div>
              <label className="block text-xs font-medium text-gray-500 uppercase mb-1">Ilość</label>
              <input type="number" value={quantity || ''} onChange={(e) => setQuantity(Number(e.target.value))}
                className="w-full rounded-lg bg-gray-50 border border-gray-300 px-3 py-2 text-sm text-gray-800 outline-none focus:ring-2 focus:ring-amber-500/30" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 uppercase mb-1">Jednostka</label>
              <select value={unit} onChange={(e) => setUnit(e.target.value)}
                className="w-full rounded-lg bg-gray-50 border border-gray-300 px-3 py-2 text-sm text-gray-800 outline-none focus:ring-2 focus:ring-amber-500/30">
                <option value="kg">kg</option><option value="l">l</option><option value="szt">szt</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 uppercase mb-1">Cena jedn.</label>
              <input type="number" step="0.01" value={unitPrice || ''} onChange={(e) => setUnitPrice(Number(e.target.value))}
                className="w-full rounded-lg bg-gray-50 border border-gray-300 px-3 py-2 text-sm text-gray-800 outline-none focus:ring-2 focus:ring-amber-500/30" />
            </div>
          </div>
          <div className="rounded-lg bg-gray-50 p-3 text-sm">
            <span className="text-gray-500">Suma:</span> <span className="text-amber-600 font-bold">{total.toFixed(2)} zł</span>
          </div>
        </div>
        <div className="mt-4 flex justify-end gap-2">
          <button onClick={onClose} className="rounded-lg px-4 py-2 text-sm text-gray-500 hover:bg-gray-100">Anuluj</button>
          <button onClick={handleSave} disabled={!supplier || !product || !quantity || saving}
            className="rounded-lg bg-amber-500 px-4 py-2 text-sm font-medium text-white hover:bg-amber-400 disabled:opacity-50">
            {saving ? 'Zapisywanie...' : 'Dodaj'}
          </button>
        </div>
      </div>
    </div>
  )
}
