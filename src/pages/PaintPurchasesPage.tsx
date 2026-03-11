import { useCallback, useEffect, useRef, useState } from 'react'
import { Plus, Trash2, X, ChevronDown, ChevronLeft, ChevronRight } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useToast } from '../contexts/ToastContext'
import { useModalKeys } from '../hooks/useModalKeys'
import type { PaintPurchase, Supplier, Product, PurchaseStatus } from '../types/database'

const STATUS_CONFIG: Record<PurchaseStatus, { label: string; color: string }> = {
  do_zamowienia: { label: 'Do zamówienia', color: 'bg-orange-100 text-orange-700' },
  zamowione: { label: 'Zamówione', color: 'bg-blue-100 text-blue-700' },
  dostarczone: { label: 'Dostarczone', color: 'bg-emerald-100 text-emerald-700' },
  faktura: { label: 'Faktura', color: 'bg-violet-100 text-violet-700' },
}

export default function PaintPurchasesPage() {
  const [purchases, setPurchases] = useState<PaintPurchase[]>([])
  const [suppliers, setSuppliers] = useState<Supplier[]>([])
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const now = new Date()
  const thisMonthStart = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`
  const thisMonthEnd = (() => { const last = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate(); return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(last).padStart(2, '0')}` })()
  const [dateFrom, setDateFrom] = useState(thisMonthStart)
  const [dateTo, setDateTo] = useState(thisMonthEnd)
  const { toast } = useToast()

  // Inline editing state
  const [editingId, setEditingId] = useState<string | null>(null)
  const [eDate, setEDate] = useState('')
  const [eSupplierId, setESupplierId] = useState('')
  const [eProductId, setEProductId] = useState('')
  const [eProductName, setEProductName] = useState('')
  const [eQuantity, setEQuantity] = useState('')
  const [eUnit, setEUnit] = useState('')
  const [eUnitPrice, setEUnitPrice] = useState('')
  const [eStatus, setEStatus] = useState<PurchaseStatus>('zamowione')
  const [eColor, setEColor] = useState('')
  const [eNotes, setENotes] = useState('')
  const editRowRef = useRef<HTMLTableRowElement>(null)

  const fetchSuppliers = useCallback(async () => {
    const { data } = await supabase.from('suppliers').select('*').order('name')
    setSuppliers(data ?? [])
  }, [])

  const fetchProducts = useCallback(async () => {
    const { data } = await supabase.from('products').select('*, default_supplier:suppliers(id, name)').order('name')
    setProducts(data ?? [])
  }, [])

  const fetchPurchases = useCallback(async () => {
    setLoading(true)
    let query = supabase.from('paint_purchases').select('*, supplier:suppliers(id, name), product_ref:products(id, name)').order('date', { ascending: false })
    if (dateFrom) query = query.gte('date', dateFrom)
    if (dateTo) query = query.lte('date', dateTo)
    const { data } = await query
    setPurchases((data as any[])?.map(d => ({ ...d, supplier: d.supplier ?? undefined, product_ref: d.product_ref ?? undefined })) ?? [])
    setLoading(false)
  }, [dateFrom, dateTo])

  useEffect(() => { fetchSuppliers() }, [fetchSuppliers])
  useEffect(() => { fetchProducts() }, [fetchProducts])
  useEffect(() => { fetchPurchases() }, [fetchPurchases])

  const startEdit = (p: PaintPurchase) => {
    if (editingId === p.id) return
    if (editingId) saveEdit()
    setEditingId(p.id)
    setEDate(p.date)
    setESupplierId(p.supplier_id)
    setEProductId(p.product_id)
    setEProductName((p as any).product_ref?.name ?? p.product)
    setEQuantity(String(p.quantity))
    setEUnit(p.unit)
    setEUnitPrice(String(p.unit_price))
    setEStatus(p.status)
    setEColor(p.color ?? '')
    setENotes(p.notes ?? '')
  }

  const saveEdit = useCallback(async () => {
    if (!editingId) return
    const qty = Number(eQuantity)
    const price = Number(eUnitPrice)
    const total = Math.round(qty * price * 100) / 100
    const productName = products.find(p => p.id === eProductId)?.name ?? eProductName
    await supabase.from('paint_purchases').update({
      date: eDate,
      supplier_id: eSupplierId,
      product_id: eProductId,
      product: productName,
      quantity: qty,
      unit: eUnit,
      unit_price: price,
      total,
      status: eStatus,
      color: eColor.trim() || null,
      notes: eNotes.trim() || null,
    }).eq('id', editingId)
    setEditingId(null)
    fetchPurchases()
  }, [editingId, eDate, eSupplierId, eProductId, eProductName, eQuantity, eUnit, eUnitPrice, eStatus, eColor, eNotes, products, fetchPurchases])

  const cancelEdit = () => { setEditingId(null) }

  const handleRowBlur = useCallback((e: React.FocusEvent) => {
    const row = editRowRef.current
    if (!row) return
    if (e.relatedTarget && row.contains(e.relatedTarget as Node)) return
    requestAnimationFrame(() => {
      if (row.contains(document.activeElement)) return
      saveEdit()
    })
  }, [saveEdit])

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') { e.preventDefault(); saveEdit() }
    if (e.key === 'Escape') { e.preventDefault(); cancelEdit() }
  }

  const deletePurchase = async (id: string) => {
    await supabase.from('paint_purchases').delete().eq('id', id)
    if (editingId === id) setEditingId(null)
    toast('Zamówienie usunięte')
    fetchPurchases()
  }

  const filtered = purchases

  const ic = "w-full rounded border border-gray-300 px-1.5 py-1 text-xs text-gray-800 outline-none focus:ring-2 focus:ring-amber-500/30"

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-gray-900">Zakupy lakierów</h1>
        <button onClick={() => setShowForm(true)}
          className="flex items-center gap-2 rounded-lg bg-amber-500 px-4 py-2 text-sm font-medium text-white hover:bg-amber-400">
          <Plus className="h-4 w-4" /> Dodaj zamówienie
        </button>
      </div>

      {/* Date filters with month shift */}
      <div className="flex items-center gap-2">
        <button onClick={() => {
          const d = new Date(dateFrom)
          d.setMonth(d.getMonth() - 1)
          const y = d.getFullYear(), m = d.getMonth()
          const first = `${y}-${String(m + 1).padStart(2, '0')}-01`
          const last = `${y}-${String(m + 1).padStart(2, '0')}-${String(new Date(y, m + 1, 0).getDate()).padStart(2, '0')}`
          setDateFrom(first); setDateTo(last)
        }} className="rounded-lg border border-gray-200 bg-white p-1.5 text-gray-500 hover:bg-gray-50 hover:text-gray-700" title="Miesiąc wstecz">
          <ChevronLeft className="h-4 w-4" />
        </button>
        <div className="flex items-center gap-1.5">
          <label className="text-xs text-gray-500">Od:</label>
          <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)}
            className="rounded-lg border border-gray-200 bg-white px-2.5 py-1.5 text-sm text-gray-700 outline-none focus:ring-2 focus:ring-amber-500/30" />
        </div>
        <div className="flex items-center gap-1.5">
          <label className="text-xs text-gray-500">Do:</label>
          <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)}
            className="rounded-lg border border-gray-200 bg-white px-2.5 py-1.5 text-sm text-gray-700 outline-none focus:ring-2 focus:ring-amber-500/30" />
        </div>
        <button onClick={() => {
          const d = new Date(dateFrom)
          d.setMonth(d.getMonth() + 1)
          const y = d.getFullYear(), m = d.getMonth()
          const first = `${y}-${String(m + 1).padStart(2, '0')}-01`
          const last = `${y}-${String(m + 1).padStart(2, '0')}-${String(new Date(y, m + 1, 0).getDate()).padStart(2, '0')}`
          setDateFrom(first); setDateTo(last)
        }} className="rounded-lg border border-gray-200 bg-white p-1.5 text-gray-500 hover:bg-gray-50 hover:text-gray-700" title="Miesiąc do przodu">
          <ChevronRight className="h-4 w-4" />
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
                <th className="px-2.5 py-2 text-left text-xs font-medium text-gray-500 w-12">#</th>
                <th className="px-2.5 py-2 text-left text-xs font-medium text-gray-500 w-24">Data</th>
                <th className="px-2.5 py-2 text-left text-xs font-medium text-gray-500">Dostawca</th>
                <th className="px-2.5 py-2 text-left text-xs font-medium text-gray-500">Produkt</th>
                <th className="px-2.5 py-2 text-right text-xs font-medium text-gray-500 w-20">Ilość</th>
                <th className="px-2.5 py-2 text-right text-xs font-medium text-gray-500 w-20">Cena</th>
                <th className="px-2.5 py-2 text-right text-xs font-medium text-gray-500 w-24">Suma</th>
                <th className="px-2.5 py-2 text-center text-xs font-medium text-gray-500 w-28">Status</th>
                <th className="px-2.5 py-2 text-left text-xs font-medium text-gray-500 w-24">Kolor</th>
                <th className="px-2.5 py-2 text-left text-xs font-medium text-gray-500">Komentarz</th>
                <th className="px-1 py-2 w-8"></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(p => {
                const isEditing = editingId === p.id

                if (isEditing) {
                  const qty = Number(eQuantity)
                  const price = Number(eUnitPrice)
                  return (
                    <tr key={p.id} ref={editRowRef} onBlur={handleRowBlur} onKeyDown={handleKeyDown}
                      className="border-b border-gray-100 bg-amber-50/50">
                      <td className="px-2.5 py-1.5 text-xs text-gray-400">{p.number ?? '—'}</td>
                      <td className="px-1.5 py-1">
                        <input type="date" value={eDate} onChange={e => setEDate(e.target.value)} className={ic} />
                      </td>
                      <td className="px-1.5 py-1">
                        <select value={eSupplierId} onChange={e => setESupplierId(e.target.value)} className={ic}>
                          <option value="">— wybierz —</option>
                          {suppliers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                        </select>
                      </td>
                      <td className="px-1.5 py-1">
                        <select value={eProductId} onChange={e => {
                          const pid = e.target.value
                          setEProductId(pid)
                          const prod = products.find(pp => pp.id === pid)
                          if (prod) {
                            setEProductName(prod.name)
                            if (prod.unit) setEUnit(prod.unit)
                            if (prod.default_price) setEUnitPrice(String(prod.default_price))
                          }
                        }} className={ic}>
                          <option value="">— wybierz —</option>
                          {products.map(pr => <option key={pr.id} value={pr.id}>{pr.name}</option>)}
                        </select>
                      </td>
                      <td className="px-1.5 py-1">
                        <div className="flex items-center gap-1">
                          <input type="number" value={eQuantity} onChange={e => setEQuantity(e.target.value)}
                            className={ic + " w-14 text-right"} />
                          <select value={eUnit} onChange={e => setEUnit(e.target.value)}
                            className="rounded border border-gray-300 px-1 py-1 text-xs text-gray-800 outline-none focus:ring-2 focus:ring-amber-500/30 w-12">
                            <option value="kg">kg</option><option value="l">l</option><option value="szt">szt</option>
                          </select>
                        </div>
                      </td>
                      <td className="px-1.5 py-1">
                        <input type="number" step="0.01" value={eUnitPrice} onChange={e => setEUnitPrice(e.target.value)}
                          className={ic + " w-16 text-right"} />
                      </td>
                      <td className="px-2.5 py-1.5 text-right text-xs font-medium text-amber-600">
                        {(qty * price).toFixed(2)} zł
                      </td>
                      <td className="px-1.5 py-1">
                        <select value={eStatus} onChange={e => setEStatus(e.target.value as PurchaseStatus)} className={ic}>
                          <option value="do_zamowienia">Do zamówienia</option>
                          <option value="zamowione">Zamówione</option>
                          <option value="dostarczone">Dostarczone</option>
                          <option value="faktura">Faktura</option>
                        </select>
                      </td>
                      <td className="px-1.5 py-1">
                        <input value={eColor} onChange={e => setEColor(e.target.value)} className={ic} placeholder="Kolor..." />
                      </td>
                      <td className="px-1.5 py-1">
                        <input value={eNotes} onChange={e => setENotes(e.target.value)} className={ic} placeholder="Komentarz..." />
                      </td>
                      <td className="px-1 py-1.5">
                        <button onClick={() => deletePurchase(p.id)}
                          className="rounded p-1 text-gray-300 hover:text-red-500 hover:bg-red-50">
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </td>
                    </tr>
                  )
                }

                return (
                  <tr key={p.id} onClick={() => startEdit(p)} className="border-b border-gray-100 hover:bg-gray-50/50 cursor-pointer">
                    <td className="px-2.5 py-1.5 text-xs text-gray-400">{p.number ?? '—'}</td>
                    <td className="px-2.5 py-1.5 text-xs text-gray-500">{p.date}</td>
                    <td className="px-2.5 py-1.5 text-xs font-medium text-gray-800">{p.supplier?.name ?? '—'}</td>
                    <td className="px-2.5 py-1.5 text-xs text-gray-600">{(p as any).product_ref?.name ?? p.product}</td>
                    <td className="px-2.5 py-1.5 text-right text-xs text-gray-600">{p.quantity} {p.unit}</td>
                    <td className="px-2.5 py-1.5 text-right text-xs text-gray-500">{Number(p.unit_price).toFixed(2)}</td>
                    <td className="px-2.5 py-1.5 text-right text-xs font-medium text-amber-600">{Number(p.total).toFixed(2)} zł</td>
                    <td className="px-2.5 py-1.5 text-center">
                      <StatusDropdown value={p.status} onChange={s => {
                        supabase.from('paint_purchases').update({ status: s }).eq('id', p.id).then(() => fetchPurchases())
                      }} />
                    </td>
                    <td className="px-2.5 py-1.5 text-xs text-gray-600">{p.color || '—'}</td>
                    <td className="px-2.5 py-1.5 text-xs text-gray-400 max-w-[150px] truncate" title={p.notes ?? ''}>
                      {p.notes || '—'}
                    </td>
                    <td className="px-1 py-1.5" onClick={e => e.stopPropagation()}>
                      <button onClick={() => deletePurchase(p.id)}
                        className="rounded p-1 text-gray-300 hover:text-red-500 hover:bg-red-50">
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </td>
                  </tr>
                )
              })}
              {filtered.length === 0 && (
                <tr><td colSpan={11} className="px-4 py-8 text-center text-gray-400">Brak zamówień</td></tr>
              )}
              {filtered.length > 0 && (
                <tr className="bg-gray-50 font-medium">
                  <td className="px-2.5 py-2 text-xs text-gray-600" colSpan={6}>Razem</td>
                  <td className="px-2.5 py-2 text-right text-xs font-medium text-amber-600">
                    {filtered.reduce((s, p) => s + Number(p.total), 0).toFixed(2)} zł
                  </td>
                  <td colSpan={4}></td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {showForm && (
        <PurchaseFormModal
          suppliers={suppliers}
          products={products}
          onSupplierAdded={fetchSuppliers}
          onProductAdded={fetchProducts}
          onClose={() => setShowForm(false)}
          onSaved={() => { setShowForm(false); toast('Zamówienie dodane'); fetchPurchases() }}
          onError={(msg) => toast(msg, 'error')}
        />
      )}

    </div>
  )
}

function StatusDropdown({ value, onChange }: { value: PurchaseStatus; onChange: (s: PurchaseStatus) => void }) {
  const [open, setOpen] = useState(false)
  const config = STATUS_CONFIG[value]

  return (
    <div className="relative inline-block" onClick={e => e.stopPropagation()}>
      <button
        onClick={() => setOpen(!open)}
        className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium ${config.color}`}
      >
        {config.label}
        <ChevronDown className="h-3 w-3" />
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute top-full mt-1 right-0 z-20 rounded-lg border border-gray-200 bg-white shadow-lg py-1 min-w-[120px]">
            {(Object.keys(STATUS_CONFIG) as PurchaseStatus[]).map(s => (
              <button
                key={s}
                onClick={() => { onChange(s); setOpen(false) }}
                className={`w-full text-left px-3 py-1.5 text-xs hover:bg-gray-50 ${s === value ? 'font-medium' : ''}`}
              >
                <span className={`inline-block rounded-full px-2 py-0.5 ${STATUS_CONFIG[s].color}`}>
                  {STATUS_CONFIG[s].label}
                </span>
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  )
}

interface ProductLine {
  productId: string
  quantity: number
  unit: string
  unitPrice: number
  color: string
}

function emptyLine(): ProductLine {
  return { productId: '', quantity: 0, unit: 'kg', unitPrice: 0, color: '' }
}

function PurchaseFormModal({ suppliers, products, onSupplierAdded, onProductAdded, onClose, onSaved, onError }: {
  suppliers: Supplier[]
  products: Product[]
  onSupplierAdded: () => void
  onProductAdded: () => void
  onClose: () => void
  onSaved: () => void
  onError: (msg: string) => void
}) {
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10))
  const [supplierId, setSupplierId] = useState('')
  const [newSupplierName, setNewSupplierName] = useState('')
  const [showNewSupplier, setShowNewSupplier] = useState(false)
  const [lines, setLines] = useState<ProductLine[]>([emptyLine()])
  const [notes, setNotes] = useState('')
  const [status, setStatus] = useState<PurchaseStatus>('do_zamowienia')
  const [saving, setSaving] = useState(false)
  const [showNewProduct, setShowNewProduct] = useState(false)
  const [newProductName, setNewProductName] = useState('')
  useModalKeys(onClose)

  const inputCls = "w-full rounded-lg bg-gray-50 border border-gray-300 px-3 py-2 text-sm text-gray-800 outline-none focus:ring-2 focus:ring-amber-500/30"

  const updateLine = (i: number, field: Partial<ProductLine>) => {
    setLines(prev => prev.map((l, j) => j === i ? { ...l, ...field } : l))
  }

  const grandTotal = lines.reduce((s, l) => s + l.quantity * l.unitPrice, 0)

  const handleAddSupplier = async () => {
    const name = newSupplierName.trim()
    if (!name) return
    const { data } = await supabase.from('suppliers').insert({ name }).select('id').single()
    if (data) {
      setSupplierId(data.id)
      setNewSupplierName('')
      setShowNewSupplier(false)
      onSupplierAdded()
    }
  }

  const handleAddProduct = async () => {
    const name = newProductName.trim()
    if (!name) return
    const { data } = await supabase.from('products').insert({ name }).select('id').single()
    if (data) {
      setNewProductName('')
      setShowNewProduct(false)
      onProductAdded()
    }
  }

  const canSave = supplierId && lines.every(l => l.productId && l.quantity > 0)

  const handleSave = async () => {
    if (!canSave) return
    setSaving(true)

    // Get a unique number for each line
    const numbers: (number | null)[] = []
    for (let idx = 0; idx < lines.length; idx++) {
      const { data: seqData, error: rpcErr } = await supabase.rpc('nextval_paint_purchase')
      numbers.push(rpcErr ? null : (seqData ?? null))
    }

    const supplierName = suppliers.find(s => s.id === supplierId)?.name ?? ''
    const rows = lines.map((l, idx) => ({
      date,
      supplier_id: supplierId,
      supplier: supplierName,
      product_id: l.productId,
      product: products.find(p => p.id === l.productId)?.name ?? '',
      quantity: l.quantity,
      unit: l.unit,
      unit_price: l.unitPrice,
      total: Math.round(l.quantity * l.unitPrice * 100) / 100,
      status,
      color: l.color.trim() || null,
      notes: notes || null,
      number: numbers[idx],
    }))
    const { error: insertErr } = await supabase.from('paint_purchases').insert(rows)
    setSaving(false)
    if (insertErr) {
      onError(`Błąd zapisu: ${insertErr.message}`)
      return
    }
    onSaved()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4" onClick={onClose}>
      <div className="w-full max-w-3xl rounded-xl bg-white border border-gray-200 shadow-lg p-6 max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900">Nowe zamówienie</h2>
          <button onClick={onClose} className="rounded-md p-1 text-gray-500 hover:bg-gray-100"><X className="h-5 w-5" /></button>
        </div>
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-500 uppercase mb-1">Data</label>
              <input type="date" value={date} onChange={e => setDate(e.target.value)} className={inputCls} />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 uppercase mb-1">Status</label>
              <select value={status} onChange={e => setStatus(e.target.value as PurchaseStatus)} className={inputCls}>
                <option value="do_zamowienia">Do zamówienia</option>
                <option value="zamowione">Zamówione</option>
                <option value="dostarczone">Dostarczone</option>
                <option value="faktura">Faktura</option>
              </select>
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 uppercase mb-1">Dostawca</label>
            {showNewSupplier ? (
              <div className="flex gap-2">
                <input type="text" value={newSupplierName} onChange={e => setNewSupplierName(e.target.value)}
                  placeholder="Nazwa dostawcy..." autoFocus
                  onKeyDown={e => { if (e.key === 'Enter') handleAddSupplier() }}
                  className={"flex-1 " + inputCls} />
                <button onClick={handleAddSupplier} className="rounded-lg bg-amber-500 px-3 py-2 text-sm font-medium text-white hover:bg-amber-400">Dodaj</button>
                <button onClick={() => setShowNewSupplier(false)} className="rounded-lg px-3 py-2 text-sm text-gray-500 hover:bg-gray-100">Anuluj</button>
              </div>
            ) : (
              <div className="flex gap-2">
                <select value={supplierId} onChange={e => setSupplierId(e.target.value)} className={"flex-1 " + inputCls}>
                  <option value="">— wybierz —</option>
                  {suppliers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
                <button onClick={() => setShowNewSupplier(true)} className="shrink-0 rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-600 hover:bg-gray-50">
                  <Plus className="h-4 w-4" />
                </button>
              </div>
            )}
          </div>

          {/* Product lines */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="block text-xs font-medium text-gray-500 uppercase">Produkty</label>
              {showNewProduct ? (
                <div className="flex gap-1">
                  <input type="text" value={newProductName} onChange={e => setNewProductName(e.target.value)}
                    placeholder="Nazwa..." autoFocus
                    onKeyDown={e => { if (e.key === 'Enter') handleAddProduct(); if (e.key === 'Escape') setShowNewProduct(false) }}
                    className="rounded border border-gray-300 px-2 py-0.5 text-xs outline-none focus:ring-2 focus:ring-amber-500/30 w-40" />
                  <button onClick={handleAddProduct} className="text-xs text-amber-600 font-medium">Dodaj</button>
                  <button onClick={() => setShowNewProduct(false)} className="text-xs text-gray-400">Anuluj</button>
                </div>
              ) : (
                <button onClick={() => setShowNewProduct(true)} className="text-xs text-amber-600 hover:text-amber-700 font-medium">+ nowy produkt</button>
              )}
            </div>
            <div className="space-y-2">
              {lines.map((line, i) => {
                const fieldCls = "w-full h-[38px] rounded-lg border border-gray-300 px-2.5 text-sm outline-none focus:ring-2 focus:ring-amber-500/30"
                return (
                  <div key={i} className="flex items-start gap-2 rounded-lg bg-gray-50 p-3">
                    <div className="flex-1 min-w-0">
                      <label className="block text-[10px] text-gray-400 mb-1">Produkt</label>
                      <select value={line.productId} onChange={e => {
                        const pid = e.target.value
                        const prod = products.find(p => p.id === pid)
                        const updates: Partial<ProductLine> = { productId: pid }
                        if (prod) {
                          if (prod.unit) updates.unit = prod.unit
                          if (prod.default_price) updates.unitPrice = Number(prod.default_price)
                          if (prod.default_supplier_id && !supplierId) setSupplierId(prod.default_supplier_id)
                        }
                        updateLine(i, updates)
                      }} className={fieldCls}>
                        <option value="">— wybierz —</option>
                        {products.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                      </select>
                    </div>
                    <div className="w-20">
                      <label className="block text-[10px] text-gray-400 mb-1">Ilość</label>
                      <input type="number" value={line.quantity || ''} onChange={e => updateLine(i, { quantity: Number(e.target.value) })}
                        className={fieldCls} />
                    </div>
                    <div className="w-[4.5rem]">
                      <label className="block text-[10px] text-gray-400 mb-1">Jedn.</label>
                      <select value={line.unit} onChange={e => updateLine(i, { unit: e.target.value })} className={fieldCls}>
                        <option value="kg">kg</option><option value="l">l</option><option value="szt">szt</option>
                      </select>
                    </div>
                    <div className="w-24">
                      <label className="block text-[10px] text-gray-400 mb-1">Cena</label>
                      <input type="number" step="0.01" value={line.unitPrice || ''} onChange={e => updateLine(i, { unitPrice: Number(e.target.value) })}
                        className={fieldCls} />
                    </div>
                    <div className="w-32">
                      <label className="block text-[10px] text-gray-400 mb-1">Kolor</label>
                      <input type="text" value={line.color} onChange={e => updateLine(i, { color: e.target.value })}
                        placeholder="np. biały"
                        className={fieldCls} />
                    </div>
                    <div className="w-20 text-right shrink-0">
                      <label className="block text-[10px] text-gray-400 mb-1">Suma</label>
                      <div className="h-[38px] flex items-center justify-end text-sm font-semibold text-amber-600">{(line.quantity * line.unitPrice).toFixed(2)} zł</div>
                    </div>
                    {lines.length > 1 && (
                      <div className="pt-[18px]">
                        <button onClick={() => setLines(prev => prev.filter((_, j) => j !== i))}
                          className="h-[38px] flex items-center rounded p-1.5 text-gray-300 hover:text-red-500 hover:bg-red-50">
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
            <button onClick={() => setLines(prev => [...prev, emptyLine()])}
              className="mt-2 flex items-center gap-1 text-xs text-amber-600 hover:text-amber-700 font-medium">
              <Plus className="h-3.5 w-3.5" /> Dodaj produkt
            </button>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-500 uppercase mb-1">Komentarz</label>
            <input type="text" value={notes} onChange={e => setNotes(e.target.value)} placeholder="Opcjonalny komentarz..."
              className={inputCls} />
          </div>

          <div className="rounded-lg bg-gray-50 p-3 text-sm">
            <span className="text-gray-500">Suma:</span> <span className="text-amber-600 font-bold">{grandTotal.toFixed(2)} zł</span>
          </div>
        </div>
        <div className="mt-4 flex justify-end gap-2">
          <button onClick={onClose} className="rounded-lg px-4 py-2 text-sm text-gray-500 hover:bg-gray-100">Anuluj</button>
          <button onClick={handleSave} disabled={!canSave || saving}
            className="rounded-lg bg-amber-500 px-4 py-2 text-sm font-medium text-white hover:bg-amber-400 disabled:opacity-50">
            {saving ? 'Zapisywanie...' : 'Dodaj'}
          </button>
        </div>
      </div>
    </div>
  )
}
