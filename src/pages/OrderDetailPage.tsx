import { useState, useRef, useCallback } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { ArrowLeft, Plus, Trash2, Pencil, Check, X } from 'lucide-react'
import { useOrder } from '../hooks/useOrder'
import { useOrderItems } from '../hooks/useOrderItems'
import { useWorkLogs } from '../hooks/useWorkLogs'
import { usePaintingVariants } from '../hooks/usePaintingVariants'
import { useClientPricing } from '../hooks/useClientPricing'
import { supabase } from '../lib/supabase'
import type _WorkLogFormModal from '../components/WorkLogFormModal'
import { useToast } from '../contexts/ToastContext'
import { useWorkers } from '../hooks/useWorkers'
import type { OrderStatus } from '../types/database'

const statusLabels: Record<OrderStatus, string> = {
  nowe: 'Nowe', w_trakcie: 'W trakcie', gotowe: 'Gotowe', wydane: 'Wydane', 'zapłacone': 'Zapłacone',
}
const statusColors: Record<OrderStatus, string> = {
  nowe: 'bg-blue-500', w_trakcie: 'bg-amber-500', gotowe: 'bg-emerald-500', wydane: 'bg-violet-500', 'zapłacone': 'bg-gray-400',
}
const statusFlow: OrderStatus[] = ['nowe', 'w_trakcie', 'gotowe', 'wydane', 'zapłacone']

function getClientName(order: Record<string, unknown>): string {
  const client = order.client as { name: string } | null
  return client?.name ?? '—'
}

export default function OrderDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { order, loading, updateOrder } = useOrder(id!)
  const { items, addItem, updateItem, deleteItem } = useOrderItems(id!)
  const { logs, addLog, updateLog, deleteLog } = useWorkLogs(id!)
  const { variants } = usePaintingVariants()
  const { getPriceForVariant } = useClientPricing(order?.client_id ?? null)
  const { toast } = useToast()
  const { workers } = useWorkers()
  const activeWorkers = workers.filter((w) => w.active)
  const [showInlineAdd, setShowInlineAdd] = useState(false)
  const [newLength, setNewLength] = useState('')
  const [newWidth, setNewWidth] = useState('')
  const [newQty, setNewQty] = useState('1')
  const [newVariantId, setNewVariantId] = useState('')
  const [newPrice, setNewPrice] = useState('')
  const [newHandle, setNewHandle] = useState(false)
  const [newNotes, setNewNotes] = useState('')
  const [lastAddedId, setLastAddedId] = useState<string | null>(null)
  const lengthRef = useRef<HTMLInputElement>(null)
  const [showLogForm, setShowLogForm] = useState(false)
  const [logWorker, setLogWorker] = useState('Kasia')
  const [logOp, setLogOp] = useState('Przygotowanie')
  const [logDate, setLogDate] = useState(new Date().toISOString().slice(0, 10))
  const [logHours, setLogHours] = useState('')
  const [logRate, setLogRate] = useState('35')
  const [logNotes, setLogNotes] = useState('')
  const logDateRef = useRef<HTMLInputElement>(null)
  const itemRowRef = useRef<HTMLTableRowElement>(null)
  const logRowRef = useRef<HTMLTableRowElement>(null)
  const editItemRowRef = useRef<HTMLTableRowElement>(null)
  const editLogRowRef = useRef<HTMLTableRowElement>(null)

  const handleRowBlur = (ref: React.RefObject<HTMLElement | null>, saveFn: () => void) => (e: React.FocusEvent) => {
    const row = ref.current
    if (!row) return
    // relatedTarget is the element receiving focus — if still inside the row, skip
    if (e.relatedTarget && row.contains(e.relatedTarget as Node)) return
    // Small delay to let click events on buttons inside the row fire first
    requestAnimationFrame(() => {
      // Check if focus actually left the row (not just temporarily)
      if (row.contains(document.activeElement)) return
      saveFn()
    })
  }

  const operations = ['Przygotowanie', 'Podkład', 'Szlifowanie', 'Lakierowanie', 'Pakowanie', 'Sprzątanie', 'Inne']
  const getWorkerRate = (name: string) => activeWorkers.find((w) => w.name === name)?.hourly_rate ?? 35

  const resetLogForm = useCallback(() => {
    setLogWorker(activeWorkers[0]?.name ?? '')
    setLogOp('Przygotowanie')
    setLogDate(new Date().toISOString().slice(0, 10))
    setLogHours('')
    setLogRate(String(activeWorkers[0]?.hourly_rate ?? 35))
    setLogNotes('')
    setTimeout(() => logDateRef.current?.focus(), 0)
  }, [activeWorkers])

  const handleInlineLogAdd = useCallback(async () => {
    const h = Number(logHours)
    const r = Number(logRate)
    if (!h) return
    await addLog({
      order_id: id!,
      worker_name: logWorker,
      operation: logOp,
      date: logDate,
      hours: h,
      hourly_rate: r,
      cost: Math.round(h * r * 100) / 100,
      m2_painted: null,
      notes: logNotes || null,
    })
    toast('Etap dodany')
    resetLogForm()
  }, [logWorker, logOp, logDate, logHours, logRate, logNotes, id, addLog, toast, resetLogForm])

  const getDefaultPrice = useCallback((vid: string) => {
    return vid ? getPriceForVariant(vid, variants) : 0
  }, [getPriceForVariant, variants])

  const resetInlineForm = useCallback(() => {
    setNewLength('')
    setNewWidth('')
    setNewQty('1')
    setNewVariantId(variants[0]?.id ?? '')
    setNewPrice('')
    setNewHandle(false)
    setNewNotes('')
    setTimeout(() => lengthRef.current?.focus(), 0)
  }, [variants])

  const handleInlineAdd = useCallback(async () => {
    const l = Number(newLength)
    const w = Number(newWidth)
    const q = Number(newQty) || 1
    const vid = newVariantId || variants[0]?.id
    if (!l || !w || !vid) return
    const variant = variants.find((v) => v.id === vid)
    const sides = variant?.sides ?? 2
    const pricePerM2 = Number(newPrice) || getDefaultPrice(vid)
    const m2 = (l * w * q * sides) / 1_000_000
    const totalPrice = m2 * pricePerM2
    const err = await addItem({
      length_mm: l,
      width_mm: w,
      quantity: q,
      variant_id: vid,
      has_handle: newHandle,
      notes: newNotes || null,
      m2: Math.round(m2 * 10000) / 10000,
      price_per_m2: pricePerM2,
      total_price: Math.round(totalPrice * 100) / 100,
    })
    if (!err) {
      setLastAddedId(String(Date.now()))
      setTimeout(() => setLastAddedId(null), 1500)
    }
    resetInlineForm()
  }, [newLength, newWidth, newQty, newVariantId, newPrice, newHandle, variants, getDefaultPrice, addItem, toast, resetInlineForm])
  // Item inline edit
  const [editingItemId, setEditingItemId] = useState<string | null>(null)
  const [eiLength, setEiLength] = useState('')
  const [eiWidth, setEiWidth] = useState('')
  const [eiQty, setEiQty] = useState('')
  const [eiVariantId, setEiVariantId] = useState('')
  const [eiPrice, setEiPrice] = useState('')
  const [eiHandle, setEiHandle] = useState(false)
  const [eiNotes, setEiNotes] = useState('')

  // Log inline edit
  const [editingLogId, setEditingLogId] = useState<string | null>(null)
  const [elDate, setElDate] = useState('')
  const [elWorker, setElWorker] = useState('')
  const [elOp, setElOp] = useState('')
  const [elHours, setElHours] = useState('')
  const [elNotes, setElNotes] = useState('')

  const [editing, setEditing] = useState(false)
  const [editDesc, setEditDesc] = useState('')
  const [editDate, setEditDate] = useState('')
  const [editColor, setEditColor] = useState('')
  const [editNotes, setEditNotes] = useState('')
  const [commentValue, setCommentValue] = useState<string | null>(null)
  const commentText = commentValue ?? order?.notes ?? ''

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-gray-300 border-t-amber-500" />
      </div>
    )
  }

  if (!order) return <p className="py-8 text-center text-red-600">Zamówienie nie znalezione</p>

  const totalM2 = items.filter((i) => (i.variant as { name: string } | undefined)?.name !== 'Bejca').reduce((s, i) => s + Number(i.m2), 0)
  const handleVariant = variants.find((v) => v.name === 'Uchwyt frezowany')
  const totalHandleCost = handleVariant ? items.filter((i) => i.has_handle).reduce((s, i) => s + handleVariant.default_price_per_m2 * i.quantity, 0) : 0
  const totalValue = items.reduce((s, i) => s + Number(i.total_price), 0) + totalHandleCost
  const handleStatusChange = async (newStatus: OrderStatus) => {
    const updates: Record<string, unknown> = { status: newStatus }
    if (newStatus === 'gotowe') updates.ready_date = new Date().toISOString().slice(0, 10)
    await updateOrder(updates)
    toast(`Status zmieniony na: ${statusLabels[newStatus]}`)
  }

  const handleCheckbox = async (field: string, value: boolean) => {
    await updateOrder({ [field]: value })
  }

  const startEdit = () => {
    setEditDesc(order.description ?? '')
    setEditColor(order.color ?? '')
    setEditDate(order.planned_date ?? '')
    setEditNotes(order.notes ?? '')
    setEditing(true)
  }

  const saveEdit = async () => {
    await updateOrder({
      description: editDesc || null,
      color: editColor || null,
      planned_date: editDate || null,
      notes: editNotes || null,
    })
    setEditing(false)
    toast('Zamówienie zaktualizowane')
  }

  const startEditItem = (item: typeof items[0]) => {
    setEditingItemId(item.id)
    setEiLength(String(item.length_mm))
    setEiWidth(String(item.width_mm))
    setEiQty(String(item.quantity))
    setEiVariantId(item.variant_id)
    setEiPrice(String(item.price_per_m2))
    setEiHandle(item.has_handle)
    setEiNotes(item.notes ?? '')
  }

  const saveEditItem = async () => {
    if (!editingItemId) return
    const l = Number(eiLength)
    const w = Number(eiWidth)
    const q = Number(eiQty) || 1
    const vid = eiVariantId
    const variant = variants.find((v) => v.id === vid)
    const sides = variant?.sides ?? 2
    const pricePerM2 = Number(eiPrice) || getDefaultPrice(vid)
    const m2 = (l * w * q * sides) / 1_000_000
    const totalPrice = m2 * pricePerM2
    await updateItem(editingItemId, {
      length_mm: l,
      width_mm: w,
      quantity: q,
      variant_id: vid,
      has_handle: eiHandle,
      notes: eiNotes || null,
      m2: Math.round(m2 * 10000) / 10000,
      price_per_m2: pricePerM2,
      total_price: Math.round(totalPrice * 100) / 100,
    })
    setEditingItemId(null)
    toast('Element zaktualizowany')
  }

  const startEditLog = (log: typeof logs[0]) => {
    setEditingLogId(log.id)
    setElDate(log.date)
    setElWorker(log.worker_name)
    setElOp(log.operation)
    setElHours(String(log.hours))
    setElNotes(log.notes ?? '')
  }

  const saveEditLog = async () => {
    if (!editingLogId) return
    const h = Number(elHours)
    const r = getWorkerRate(elWorker)
    await updateLog(editingLogId, {
      date: elDate,
      worker_name: elWorker,
      operation: elOp,
      hours: h,
      hourly_rate: r,
      cost: Math.round(h * r * 100) / 100,
      notes: elNotes || null,
    })
    setEditingLogId(null)
    toast('Etap zaktualizowany')
  }

  const handleDeleteLog = async (logId: string) => {
    if (!confirm('Usunąć ten etap?')) return
    await deleteLog(logId)
    toast('Etap usunięty')
  }

  const handleDeleteItem = async (itemId: string) => {
    if (!confirm('Usunąć ten element?')) return
    await deleteItem(itemId)
    toast('Element usunięty')
  }

  const handleDeleteOrder = async () => {
    if (!confirm(`Usunąć zamówienie ${order.number}/${new Date(order.created_at).getFullYear() % 100}? Tej operacji nie można cofnąć.`)) return
    await supabase.from('orders').delete().eq('id', order.id)
    toast('Zamówienie usunięte')
    navigate('/zamowienia')
  }

  return (
    <div className="space-y-4 max-w-4xl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Link to="/zamowienia" className="rounded-md p-1 text-gray-500 hover:bg-gray-100">
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-base font-bold text-gray-900">Zamówienie {order.number}/{new Date(order.created_at).getFullYear() % 100}</h1>
              <div className={`rounded-full px-2 py-0.5 text-[10px] font-medium text-white ${statusColors[order.status]}`}>
                {statusLabels[order.status]}
              </div>
            </div>
            <p className="text-xs text-gray-500">
              {getClientName(order as unknown as Record<string, unknown>)} · {order.description || 'Brak opisu'}
              {order.planned_date && <> · {new Date(order.planned_date).toLocaleDateString('pl-PL')}</>}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <button onClick={editing ? saveEdit : startEdit}
            className="flex items-center gap-1 rounded-md px-2 py-1 text-[11px] font-medium text-gray-500 hover:bg-gray-100 hover:text-gray-800">
            {editing ? <><Check className="h-3 w-3" /> Zapisz</> : <><Pencil className="h-3 w-3" /> Edytuj</>}
          </button>
          <button onClick={handleDeleteOrder}
            className="flex items-center gap-1 rounded-md px-2 py-1 text-[11px] font-medium text-red-500 hover:bg-red-50">
            <Trash2 className="h-3 w-3" /> Usuń
          </button>
        </div>
      </div>

      {/* Color */}
      {order.color && !editing && (
        <div className="inline-flex items-center gap-2 rounded-lg bg-amber-50 border border-amber-200 px-3 py-1.5">
          <span className="text-[10px] font-bold text-amber-600 uppercase tracking-wider">Kolor</span>
          <span className="text-sm font-bold text-gray-900">{order.color}</span>
        </div>
      )}

      {/* Editable fields */}
      {editing && (
        <div className="grid grid-cols-4 gap-2 rounded-lg bg-gray-50 p-3"
          onBlur={(e) => { if (!e.currentTarget.contains(e.relatedTarget as Node)) saveEdit() }}>
          <div>
            <label className="block text-[10px] font-medium text-gray-500 uppercase mb-0.5">Opis</label>
            <input type="text" value={editDesc} onChange={(e) => setEditDesc(e.target.value)}
              className="w-full rounded bg-white border border-gray-300 px-2 py-1 text-xs text-gray-800 outline-none focus:ring-2 focus:ring-amber-500/30" />
          </div>
          <div>
            <label className="block text-[10px] font-medium text-gray-500 uppercase mb-0.5">Kolor</label>
            <input type="text" value={editColor} onChange={(e) => setEditColor(e.target.value)} placeholder="np. RAL 9016 MAT"
              className="w-full rounded bg-white border border-gray-300 px-2 py-1 text-xs text-gray-800 outline-none focus:ring-2 focus:ring-amber-500/30" />
          </div>
          <div>
            <label className="block text-[10px] font-medium text-gray-500 uppercase mb-0.5">Planowana data</label>
            <input type="date" value={editDate} onChange={(e) => setEditDate(e.target.value)}
              className="w-full rounded bg-white border border-gray-300 px-2 py-1 text-xs text-gray-800 outline-none focus:ring-2 focus:ring-amber-500/30" />
          </div>
          <div>
            <label className="block text-[10px] font-medium text-gray-500 uppercase mb-0.5">Notatki</label>
            <input type="text" value={editNotes} onChange={(e) => setEditNotes(e.target.value)}
              className="w-full rounded bg-white border border-gray-300 px-2 py-1 text-xs text-gray-800 outline-none focus:ring-2 focus:ring-amber-500/30" />
          </div>
        </div>
      )}

      {/* Status flow + Checklist */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex gap-1">
          {statusFlow.map((s) => (
            <button
              key={s}
              onClick={() => handleStatusChange(s)}
              disabled={order.status === s}
              className={`rounded-md px-2 py-1 text-[11px] font-medium transition-colors ${
                order.status === s
                  ? `${statusColors[s]} text-white`
                  : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
              }`}
            >
              {statusLabels[s]}
            </button>
          ))}
        </div>
        <div className="flex flex-col items-end gap-0.5">
          <span className="text-[10px] text-gray-400">Czy zamówione?</span>
          <div className="flex gap-3">
          {[
            { field: 'material_provided', label: 'Materiał', value: order.material_provided },
            { field: 'paints_provided', label: 'Lakiery', value: order.paints_provided },
          ].map(({ field, label, value }) => (
            <label key={field} className={`flex items-center gap-1 text-[11px] font-medium rounded-md px-2 py-1 transition-colors ${
              value ? 'text-emerald-600 bg-emerald-50' : 'text-red-600 bg-red-50 animate-pulse'
            }`}>
              <input
                type="checkbox"
                checked={value}
                onChange={(e) => handleCheckbox(field, e.target.checked)}
                className="h-3 w-3 rounded border-gray-300 bg-white text-amber-500 focus:ring-amber-500/30"
              />
              {label}
            </label>
          ))}
          </div>
        </div>
      </div>

      {/* Elements table */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-[11px] font-semibold text-gray-500 uppercase tracking-wide">Elementy</h2>
          {!showInlineAdd && (
            <button onClick={() => { setShowInlineAdd(true); setNewVariantId(variants[0]?.id ?? ''); setTimeout(() => lengthRef.current?.focus(), 50) }}
              className="flex items-center gap-1 rounded-md bg-amber-50 px-2 py-1 text-[11px] font-medium text-amber-600 hover:bg-amber-100">
              <Plus className="h-3 w-3" /> Dodaj
            </button>
          )}
        </div>
        <div className="rounded-lg border border-gray-200 bg-white overflow-hidden">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-gray-200 bg-gray-50">
                <th className="px-2 py-1.5 text-left text-[10px] font-medium text-gray-500 min-w-[55px]">Dl</th>
                <th className="px-2 py-1.5 text-left text-[10px] font-medium text-gray-500 min-w-[55px]">Szer</th>
                <th className="px-2 py-1.5 text-left text-[10px] font-medium text-gray-500 min-w-[55px]">Szt</th>
                <th className="px-2 py-1.5 text-left text-[10px] font-medium text-gray-500 w-full">Rodzaj</th>
                <th className="px-2 py-1.5 text-right text-[10px] font-medium text-gray-500">m²</th>
                <th className="px-2 py-1.5 text-right text-[10px] font-medium text-gray-500">Cena</th>
                <th className="px-2 py-1.5 text-center text-[10px] font-medium text-gray-500">Uchwyt</th>
                <th className="px-2 py-1.5 text-left text-[10px] font-medium text-gray-500 min-w-[120px]">Uwagi</th>
                <th className="px-1 py-1.5 w-6"></th>
              </tr>
            </thead>
            <tbody>
              {items.map((item, idx) => {
                const isEditing = editingItemId === item.id
                if (isEditing) {
                  const vid = eiVariantId
                  const variant = variants.find((v) => v.id === vid)
                  const sides = variant?.sides ?? 2
                  const l = Number(eiLength) || 0
                  const w = Number(eiWidth) || 0
                  const q = Number(eiQty) || 1
                  const m2 = (l * w * q * sides) / 1_000_000
                  const ic = "w-full bg-transparent border-b border-gray-300 px-1 py-0.5 text-xs text-gray-800 outline-none focus:border-amber-500 tabular-nums"
                  const kd = (e: React.KeyboardEvent) => { if (e.key === 'Enter') saveEditItem(); if (e.key === 'Escape') setEditingItemId(null) }
                  return (
                    <tr key={item.id} ref={editItemRowRef} onBlur={handleRowBlur(editItemRowRef, saveEditItem)} className="border-b border-gray-100 bg-blue-50/30">
                      <td className="px-2 py-1"><input type="text" inputMode="numeric" value={eiLength} onChange={(e) => setEiLength(e.target.value)} className={ic} onKeyDown={kd} /></td>
                      <td className="px-2 py-1"><input type="text" inputMode="numeric" value={eiWidth} onChange={(e) => setEiWidth(e.target.value)} className={ic} onKeyDown={kd} /></td>
                      <td className="px-2 py-1"><input type="number" value={eiQty} onChange={(e) => setEiQty(e.target.value)} className={`${ic} w-10`} onKeyDown={kd} /></td>
                      <td className="px-2 py-1">
                        <select value={eiVariantId} onChange={(e) => setEiVariantId(e.target.value)}
                          className="w-full bg-white border border-gray-300 rounded px-1 py-0.5 text-xs text-gray-800 outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500/30" onKeyDown={kd}>
                          {variants.map((v) => <option key={v.id} value={v.id}>{v.name}</option>)}
                        </select>
                      </td>
                      <td className="px-2 py-1 text-right text-gray-400 tabular-nums">{l && w ? m2.toFixed(3) : ''}</td>
                      <td className="px-2 py-1"><input type="number" value={eiPrice} onChange={(e) => setEiPrice(e.target.value)} className="w-14 bg-transparent border-b border-gray-300 px-1 py-0.5 text-right text-xs text-gray-800 outline-none focus:border-amber-500 tabular-nums" onKeyDown={kd} /></td>
                      <td className="px-2 py-1 text-center"><input type="checkbox" checked={eiHandle} onChange={(e) => setEiHandle(e.target.checked)} className="h-4 w-4 rounded border-gray-300 text-amber-500 focus:ring-amber-500/30" /></td>
                      <td className="px-2 py-1"><input type="text" value={eiNotes} onChange={(e) => setEiNotes(e.target.value)} className="w-full bg-transparent border-b border-gray-300 px-1 py-0.5 text-[10px] text-gray-600 outline-none focus:border-amber-500" onKeyDown={kd} /></td>
                      <td className="px-1 py-1 flex gap-0.5">
                        <button onClick={saveEditItem} className="rounded p-0.5 text-emerald-500 hover:text-emerald-700"><Check className="h-3 w-3" /></button>
                        <button onClick={() => setEditingItemId(null)} className="rounded p-0.5 text-gray-400 hover:text-gray-600"><X className="h-3 w-3" /></button>
                      </td>
                    </tr>
                  )
                }
                return (
                  <tr key={item.id} className="border-b border-gray-100 hover:bg-gray-50 cursor-pointer"
                    onClick={() => startEditItem(item)}
                    style={lastAddedId && idx === items.length - 1 ? { animation: 'rowFlash 1.5s ease-out' } : undefined}>
                    <td className="px-2 py-1.5 text-gray-800 tabular-nums">{item.length_mm}</td>
                    <td className="px-2 py-1.5 text-gray-800 tabular-nums">{item.width_mm}</td>
                    <td className="px-2 py-1.5 text-gray-800 tabular-nums">{item.quantity}</td>
                    <td className="px-2 py-1.5 text-gray-600">{(item.variant as { name: string } | undefined)?.name ?? '—'}</td>
                    <td className="px-2 py-1.5 text-right text-gray-600 tabular-nums">{Number(item.m2).toFixed(3)}</td>
                    <td className="px-2 py-1.5 text-right text-gray-600 tabular-nums">{Number(item.price_per_m2).toFixed(0)}</td>
                    <td className="px-2 py-1.5 text-center">{item.has_handle ? <span className="text-base font-bold text-emerald-600">✓</span> : ''}</td>
                    <td className="px-2 py-1.5 text-gray-400 text-[10px]">{item.notes || ''}</td>
                    <td className="px-1 py-1.5" onClick={(e) => e.stopPropagation()}>
                      <button onClick={() => handleDeleteItem(item.id)} className="rounded p-0.5 text-gray-400 hover:text-red-600 hover:bg-gray-100">
                        <Trash2 className="h-3 w-3" />
                      </button>
                    </td>
                  </tr>
                )
              })}
              {showInlineAdd && (() => {
                const vid = newVariantId || variants[0]?.id
                const variant = variants.find((v) => v.id === vid)
                const sides = variant?.sides ?? 2
                const pricePerM2 = vid ? getPriceForVariant(vid, variants) : 0
                const l = Number(newLength) || 0
                const w = Number(newWidth) || 0
                const q = Number(newQty) || 1
                const m2 = (l * w * q * sides) / 1_000_000
                const inputClass = "w-full bg-transparent border-b border-gray-300 px-1 py-0.5 text-xs text-gray-800 outline-none focus:border-amber-500 tabular-nums"
                return (
                  <tr ref={itemRowRef} onBlur={handleRowBlur(itemRowRef, handleInlineAdd)} className="border-b border-gray-100 bg-amber-50/30">
                    <td className="px-2 py-1">
                      <input ref={lengthRef} type="text" inputMode="numeric" value={newLength} onChange={(e) => setNewLength(e.target.value)}
                        placeholder="0" className={inputClass}
                        onKeyDown={(e) => { if (e.key === 'Enter') handleInlineAdd(); if (e.key === 'Escape') setShowInlineAdd(false) }} />
                    </td>
                    <td className="px-2 py-1">
                      <input type="text" inputMode="numeric" value={newWidth} onChange={(e) => setNewWidth(e.target.value)}
                        placeholder="0" className={inputClass}
                        onKeyDown={(e) => { if (e.key === 'Enter') handleInlineAdd(); if (e.key === 'Escape') setShowInlineAdd(false) }} />
                    </td>
                    <td className="px-2 py-1">
                      <input type="number" value={newQty} onChange={(e) => setNewQty(e.target.value)}
                        placeholder="1" className={`${inputClass} w-10`}
                        onKeyDown={(e) => { if (e.key === 'Enter') handleInlineAdd(); if (e.key === 'Escape') setShowInlineAdd(false) }} />
                    </td>
                    <td className="px-2 py-1">
                      <select value={newVariantId} onChange={(e) => setNewVariantId(e.target.value)}
                        className="w-full bg-white border border-gray-300 rounded px-1 py-0.5 text-xs text-gray-800 outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500/30"
                        onKeyDown={(e) => { if (e.key === 'Enter') handleInlineAdd(); if (e.key === 'Escape') setShowInlineAdd(false) }}>
                        {variants.map((v) => <option key={v.id} value={v.id}>{v.name}</option>)}
                      </select>
                    </td>
                    <td className="px-2 py-1 text-right text-gray-400 tabular-nums">{l && w ? m2.toFixed(3) : ''}</td>
                    <td className="px-2 py-1">
                      <input type="number" value={newPrice} onChange={(e) => setNewPrice(e.target.value)}
                        placeholder={String(pricePerM2 || '')}
                        className="w-14 bg-transparent border-b border-gray-300 px-1 py-0.5 text-right text-xs text-gray-800 outline-none focus:border-amber-500 tabular-nums"
                        onKeyDown={(e) => { if (e.key === 'Enter') handleInlineAdd(); if (e.key === 'Escape') setShowInlineAdd(false) }} />
                    </td>
                    <td className="px-2 py-1 text-center">
                      <input type="checkbox" checked={newHandle} onChange={(e) => setNewHandle(e.target.checked)}
                        className="h-4 w-4 rounded border-gray-300 text-amber-500 focus:ring-amber-500/30" />
                    </td>
                    <td className="px-2 py-1">
                      <input type="text" value={newNotes} onChange={(e) => setNewNotes(e.target.value)}
                        placeholder="uwagi"
                        className="w-full bg-transparent border-b border-gray-300 px-1 py-0.5 text-[10px] text-gray-600 outline-none focus:border-amber-500"
                        onKeyDown={(e) => { if (e.key === 'Enter') handleInlineAdd(); if (e.key === 'Escape') setShowInlineAdd(false) }} />
                    </td>
                    <td className="px-1 py-1">
                      <button onClick={() => setShowInlineAdd(false)} className="rounded p-0.5 text-gray-400 hover:text-gray-600">
                        <X className="h-3 w-3" />
                      </button>
                    </td>
                  </tr>
                )
              })()}
              {!showInlineAdd && items.length === 0 && (
                <tr><td colSpan={9} className="px-2 py-6 text-center text-xs text-gray-400">
                  Brak elementów — kliknij "Dodaj"
                </td></tr>
              )}
            </tbody>
          </table>
        </div>
        {showInlineAdd && (
          <div className="mt-1 flex gap-2 text-[10px] text-gray-400">
            <span>TAB = następne pole</span>
            <span>Enter = dodaj i nowy wiersz</span>
            <span>Esc = zamknij</span>
          </div>
        )}
      </div>

      {/* Summary */}
      <div className="flex gap-2 items-start">
        <div className="rounded-lg bg-white shadow-sm px-2 py-2">
          <p className="text-[10px] text-gray-500 uppercase">Lakier m²</p>
          <p className="text-sm font-bold tabular-nums text-gray-800">{totalM2.toFixed(2)}</p>
        </div>
        <div className="rounded-lg bg-white shadow-sm px-2 py-2">
          <p className="text-[10px] text-gray-500 uppercase">Bejca m²</p>
          <p className="text-sm font-bold tabular-nums text-gray-800">
            {items.filter((i) => (i.variant as { name: string } | undefined)?.name === 'Bejca').reduce((s, i) => s + Number(i.m2), 0).toFixed(2)}
          </p>
        </div>
        <div className="rounded-lg bg-white shadow-sm px-2 py-2">
          <p className="text-[10px] text-gray-500 uppercase">Uchwyty ({items.filter((i) => i.has_handle).reduce((s, i) => s + i.quantity, 0)} szt)</p>
          <p className="text-sm font-bold tabular-nums text-gray-800">{totalHandleCost.toFixed(2)}</p>
        </div>
        <div className="rounded-lg bg-white shadow-sm px-2 py-2">
          <p className="text-[10px] text-gray-500 uppercase">Wartość</p>
          <p className="text-sm font-bold tabular-nums text-amber-600">{totalValue.toFixed(2)}</p>
        </div>
        <div className="flex-1 rounded-lg bg-white shadow-sm px-2 py-2">
          <p className="text-[10px] text-gray-500 uppercase">Komentarz</p>
          <input type="text" value={commentText}
            onChange={(e) => setCommentValue(e.target.value)}
            onBlur={() => { if (commentValue !== null) { updateOrder({ notes: commentValue || null }); setCommentValue(null) } }}
            onKeyDown={(e) => { if (e.key === 'Enter') (e.target as HTMLInputElement).blur() }}
            className="w-full text-xs text-gray-700 bg-transparent outline-none border-b border-transparent focus:border-amber-500 mt-0.5"
            placeholder="dodaj komentarz..." />
        </div>
      </div>

      {/* Work logs */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-[11px] font-semibold text-gray-500 uppercase tracking-wide">Etapy pracy</h2>
          {!showLogForm && (
            <button onClick={() => { setShowLogForm(true); setTimeout(() => logDateRef.current?.focus(), 50) }}
              className="flex items-center gap-1 rounded-md bg-amber-50 px-2 py-1 text-[11px] font-medium text-amber-600 hover:bg-amber-100">
              <Plus className="h-3 w-3" /> Dodaj
            </button>
          )}
        </div>
        <div className="rounded-lg border border-gray-200 bg-white overflow-hidden">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-gray-200 bg-gray-50">
                <th className="px-2 py-1.5 text-left text-[10px] font-medium text-gray-500">Data</th>
                <th className="px-2 py-1.5 text-left text-[10px] font-medium text-gray-500 w-28">Pracownik</th>
                <th className="px-2 py-1.5 text-left text-[10px] font-medium text-gray-500 w-1/4">Operacja</th>
                <th className="px-2 py-1.5 text-right text-[10px] font-medium text-gray-500 w-16">Godz</th>
                <th className="px-2 py-1.5 text-left text-[10px] font-medium text-gray-500 w-1/3">Uwagi</th>
                <th className="px-1 py-1.5 w-6"></th>
              </tr>
            </thead>
            <tbody>
              {logs.map((log) => {
                const isEditing = editingLogId === log.id
                if (isEditing) {
                  const ic = "w-full bg-transparent border-b border-gray-300 px-1 py-0.5 text-xs text-gray-800 outline-none focus:border-amber-500"
                  const kd = (e: React.KeyboardEvent) => { if (e.key === 'Enter') saveEditLog(); if (e.key === 'Escape') setEditingLogId(null) }
                  return (
                    <tr key={log.id} ref={editLogRowRef} onBlur={handleRowBlur(editLogRowRef, saveEditLog)} className="border-b border-gray-100 bg-blue-50/30">
                      <td className="px-2 py-1"><input type="date" value={elDate} onChange={(e) => setElDate(e.target.value)} className={`${ic} tabular-nums`} onKeyDown={kd} /></td>
                      <td className="px-2 py-1">
                        <select value={elWorker} onChange={(e) => setElWorker(e.target.value)} className={ic} onKeyDown={kd}>
                          {activeWorkers.map((w) => <option key={w.id} value={w.name}>{w.name}</option>)}
                        </select>
                      </td>
                      <td className="px-2 py-1">
                        <select value={elOp} onChange={(e) => setElOp(e.target.value)} className={ic} onKeyDown={kd}>
                          {operations.map((o) => <option key={o} value={o}>{o}</option>)}
                        </select>
                      </td>
                      <td className="px-2 py-1"><input type="number" step="0.5" value={elHours} onChange={(e) => setElHours(e.target.value)} className={`${ic} text-right tabular-nums`} onKeyDown={kd} /></td>
                      <td className="px-2 py-1"><input type="text" value={elNotes} onChange={(e) => setElNotes(e.target.value)} className="w-full bg-transparent border-b border-gray-300 px-1 py-0.5 text-[10px] text-gray-600 outline-none focus:border-amber-500" onKeyDown={kd} /></td>
                      <td className="px-1 py-1 flex gap-0.5">
                        <button onClick={saveEditLog} className="rounded p-0.5 text-emerald-500 hover:text-emerald-700"><Check className="h-3 w-3" /></button>
                        <button onClick={() => setEditingLogId(null)} className="rounded p-0.5 text-gray-400 hover:text-gray-600"><X className="h-3 w-3" /></button>
                      </td>
                    </tr>
                  )
                }
                return (
                  <tr key={log.id} className="border-b border-gray-100 hover:bg-gray-50 cursor-pointer" onClick={() => startEditLog(log)}>
                    <td className="px-2 py-1.5 text-gray-400 tabular-nums">{new Date(log.date).toLocaleDateString('pl-PL')}</td>
                    <td className="px-2 py-1.5 font-medium text-gray-800">{log.worker_name}</td>
                    <td className="px-2 py-1.5 text-gray-600">{log.operation}</td>
                    <td className="px-2 py-1.5 text-right text-gray-600 tabular-nums">{log.hours}</td>
                    <td className="px-2 py-1.5 text-gray-400 text-[10px]">{log.notes || ''}</td>
                    <td className="px-1 py-1.5" onClick={(e) => e.stopPropagation()}>
                      <button onClick={() => handleDeleteLog(log.id)} className="rounded p-0.5 text-gray-400 hover:text-red-600 hover:bg-gray-100">
                        <Trash2 className="h-3 w-3" />
                      </button>
                    </td>
                  </tr>
                )
              })}
              {showLogForm && (() => {
                const inputClass = "w-full bg-transparent border-b border-gray-300 px-1 py-0.5 text-xs text-gray-800 outline-none focus:border-amber-500"
                const kd = (e: React.KeyboardEvent) => { if (e.key === 'Enter') handleInlineLogAdd(); if (e.key === 'Escape') setShowLogForm(false) }
                return (
                  <tr ref={logRowRef} onBlur={handleRowBlur(logRowRef, handleInlineLogAdd)} className="border-b border-gray-100 bg-amber-50/30">
                    <td className="px-2 py-1">
                      <input ref={logDateRef} type="date" value={logDate} onChange={(e) => setLogDate(e.target.value)}
                        className={`${inputClass} tabular-nums`} onKeyDown={kd} />
                    </td>
                    <td className="px-2 py-1">
                      <select value={logWorker} onChange={(e) => { setLogWorker(e.target.value); setLogRate(String(getWorkerRate(e.target.value))) }}
                        className={inputClass} onKeyDown={kd}>
                        {activeWorkers.map((w) => <option key={w.id} value={w.name}>{w.name}</option>)}
                      </select>
                    </td>
                    <td className="px-2 py-1">
                      <select value={logOp} onChange={(e) => setLogOp(e.target.value)}
                        className={inputClass} onKeyDown={kd}>
                        {operations.map((o) => <option key={o} value={o}>{o}</option>)}
                      </select>
                    </td>
                    <td className="px-2 py-1">
                      <input type="number" step="0.5" value={logHours} onChange={(e) => setLogHours(e.target.value)}
                        placeholder="0" className={`${inputClass} text-right tabular-nums`} onKeyDown={kd} />
                    </td>
                    <td className="px-2 py-1">
                      <input type="text" value={logNotes} onChange={(e) => setLogNotes(e.target.value)}
                        placeholder="uwagi"
                        className="w-full bg-transparent border-b border-gray-300 px-1 py-0.5 text-[10px] text-gray-600 outline-none focus:border-amber-500"
                        onKeyDown={kd} />
                    </td>
                    <td className="px-1 py-1">
                      <button onClick={() => setShowLogForm(false)} className="rounded p-0.5 text-gray-400 hover:text-gray-600">
                        <X className="h-3 w-3" />
                      </button>
                    </td>
                  </tr>
                )
              })()}
              {!showLogForm && logs.length === 0 && (
                <tr><td colSpan={6} className="px-2 py-6 text-center text-xs text-gray-400">
                  Brak etapów pracy
                </td></tr>
              )}
            </tbody>
          </table>
        </div>
        {showLogForm && (
          <div className="mt-1 flex gap-2 text-[10px] text-gray-400">
            <span>TAB = następne pole</span>
            <span>Enter = dodaj</span>
            <span>Esc = zamknij</span>
          </div>
        )}
      </div>
    </div>
  )
}
