import { useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { ArrowLeft, Plus, Trash2, Pencil, Check } from 'lucide-react'
import { useOrder } from '../hooks/useOrder'
import { useOrderItems } from '../hooks/useOrderItems'
import { useWorkLogs } from '../hooks/useWorkLogs'
import { usePaintingVariants } from '../hooks/usePaintingVariants'
import { useClientPricing } from '../hooks/useClientPricing'
import OrderItemFormModal from '../components/OrderItemFormModal'
import WorkLogFormModal from '../components/WorkLogFormModal'
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
  const { order, loading, updateOrder } = useOrder(id!)
  const { items, addItem, deleteItem } = useOrderItems(id!)
  const { logs, addLog } = useWorkLogs(id!)
  const { variants } = usePaintingVariants()
  const { getPriceForVariant } = useClientPricing(order?.client_id ?? null)
  const [showItemForm, setShowItemForm] = useState(false)
  const [showLogForm, setShowLogForm] = useState(false)
  const [editing, setEditing] = useState(false)
  const [editDesc, setEditDesc] = useState('')
  const [editDate, setEditDate] = useState('')
  const [editNotes, setEditNotes] = useState('')

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-gray-300 border-t-amber-500" />
      </div>
    )
  }

  if (!order) return <p className="py-8 text-center text-red-600">Zamówienie nie znalezione</p>

  const totalM2 = items.reduce((s, i) => s + Number(i.m2), 0)
  const totalValue = items.reduce((s, i) => s + Number(i.total_price), 0)
  const totalLaborCost = logs.reduce((s, l) => s + Number(l.cost), 0)
  const totalHours = logs.reduce((s, l) => s + Number(l.hours), 0)
  const profit = totalValue - totalLaborCost
  const profitPerHour = totalHours > 0 ? profit / totalHours : 0

  const handleStatusChange = async (newStatus: OrderStatus) => {
    const updates: Record<string, unknown> = { status: newStatus }
    if (newStatus === 'gotowe') updates.ready_date = new Date().toISOString().slice(0, 10)
    await updateOrder(updates)
  }

  const handleCheckbox = async (field: string, value: boolean) => {
    await updateOrder({ [field]: value })
  }

  const startEdit = () => {
    setEditDesc(order.description ?? '')
    setEditDate(order.planned_date ?? '')
    setEditNotes(order.notes ?? '')
    setEditing(true)
  }

  const saveEdit = async () => {
    await updateOrder({
      description: editDesc || null,
      planned_date: editDate || null,
      notes: editNotes || null,
    })
    setEditing(false)
  }

  const handleDeleteItem = async (itemId: string) => {
    if (!confirm('Usunąć ten element?')) return
    await deleteItem(itemId)
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <Link to="/zamowienia" className="rounded-md p-1.5 text-gray-500 hover:bg-gray-100">
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <div>
            <h1 className="text-xl font-bold text-gray-900">Zamówienie #{order.number}</h1>
            <p className="text-sm text-gray-500">{getClientName(order as unknown as Record<string, unknown>)} &middot; {order.description || 'Brak opisu'}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={editing ? saveEdit : startEdit}
            className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium text-gray-500 hover:bg-gray-100 hover:text-gray-800 transition-colors">
            {editing ? <><Check className="h-3.5 w-3.5" /> Zapisz</> : <><Pencil className="h-3.5 w-3.5" /> Edytuj</>}
          </button>
          <div className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-sm font-medium text-white ${statusColors[order.status]}`}>
            {statusLabels[order.status]}
          </div>
        </div>
      </div>

      {/* Editable fields */}
      {editing && (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3 rounded-lg bg-gray-50 p-4">
          <div>
            <label className="block text-xs font-medium text-gray-500 uppercase mb-1">Opis</label>
            <input type="text" value={editDesc} onChange={(e) => setEditDesc(e.target.value)}
              className="w-full rounded-lg bg-white border border-gray-300 px-3 py-2 text-sm text-gray-800 outline-none focus:ring-2 focus:ring-amber-500/30" />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 uppercase mb-1">Planowana data</label>
            <input type="date" value={editDate} onChange={(e) => setEditDate(e.target.value)}
              className="w-full rounded-lg bg-white border border-gray-300 px-3 py-2 text-sm text-gray-800 outline-none focus:ring-2 focus:ring-amber-500/30" />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 uppercase mb-1">Notatki</label>
            <input type="text" value={editNotes} onChange={(e) => setEditNotes(e.target.value)}
              className="w-full rounded-lg bg-white border border-gray-300 px-3 py-2 text-sm text-gray-800 outline-none focus:ring-2 focus:ring-amber-500/30" />
          </div>
        </div>
      )}

      {/* Status flow */}
      <div className="flex flex-wrap gap-2">
        {statusFlow.map((s) => (
          <button
            key={s}
            onClick={() => handleStatusChange(s)}
            disabled={order.status === s}
            className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
              order.status === s
                ? `${statusColors[s]} text-white`
                : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
            }`}
          >
            {statusLabels[s]}
          </button>
        ))}
      </div>

      {/* Checklist */}
      <div className="flex flex-wrap gap-4 rounded-lg bg-white shadow-sm p-4">
        {[
          { field: 'material_provided', label: 'Material dostarczony', value: order.material_provided },
          { field: 'paints_provided', label: 'Lakiery dostarczone', value: order.paints_provided },
          { field: 'dimensions_entered', label: 'Wymiary wpisane', value: order.dimensions_entered },
        ].map(({ field, label, value }) => (
          <label key={field} className="flex items-center gap-2 text-sm text-gray-600">
            <input
              type="checkbox"
              checked={value}
              onChange={(e) => handleCheckbox(field, e.target.checked)}
              className="rounded border-gray-300 bg-white text-amber-500 focus:ring-amber-500/30"
            />
            {label}
          </label>
        ))}
      </div>

      {/* Elements table */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold text-gray-600 uppercase tracking-wide">Elementy</h2>
          <button onClick={() => setShowItemForm(true)}
            className="flex items-center gap-1 rounded-lg bg-amber-50 px-3 py-1.5 text-xs font-medium text-amber-600 hover:bg-amber-100">
            <Plus className="h-3.5 w-3.5" /> Dodaj element
          </button>
        </div>
        <div className="overflow-x-auto rounded-lg border border-gray-200 bg-white">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200 bg-gray-50">
                <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">Dl (mm)</th>
                <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">Szer (mm)</th>
                <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">Szt</th>
                <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">Rodzaj</th>
                <th className="px-3 py-2 text-right text-xs font-medium text-gray-500">m2</th>
                <th className="px-3 py-2 text-right text-xs font-medium text-gray-500">Cena/m2</th>
                <th className="px-3 py-2 text-right text-xs font-medium text-gray-500">Razem</th>
                <th className="px-3 py-2 w-8"></th>
              </tr>
            </thead>
            <tbody>
              {items.map((item) => (
                <tr key={item.id} className="border-b border-gray-100">
                  <td className="px-3 py-2 text-gray-800">{item.length_mm}</td>
                  <td className="px-3 py-2 text-gray-800">{item.width_mm}</td>
                  <td className="px-3 py-2 text-gray-800">{item.quantity}</td>
                  <td className="px-3 py-2 text-gray-600">{(item.variant as { name: string } | undefined)?.name ?? '—'}</td>
                  <td className="px-3 py-2 text-right text-gray-600">{Number(item.m2).toFixed(4)}</td>
                  <td className="px-3 py-2 text-right text-gray-600">{Number(item.price_per_m2).toFixed(0)}</td>
                  <td className="px-3 py-2 text-right font-medium text-amber-600">{Number(item.total_price).toFixed(2)}</td>
                  <td className="px-3 py-2">
                    <button onClick={() => handleDeleteItem(item.id)} className="rounded p-1 text-gray-400 hover:text-red-600 hover:bg-gray-100">
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </td>
                </tr>
              ))}
              {items.length === 0 && (
                <tr><td colSpan={8} className="px-3 py-6 text-center text-gray-400">Brak elementów</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        {[
          { label: 'Lakier m\u00B2', value: totalM2.toFixed(2), color: 'text-gray-800' },
          { label: 'Wartość', value: `${totalValue.toFixed(2)} zl`, color: 'text-amber-600' },
          { label: 'Koszty pracy', value: `${totalLaborCost.toFixed(2)} zl`, color: 'text-red-600' },
          { label: 'Godziny', value: totalHours.toFixed(1), color: 'text-gray-800' },
          { label: 'Zysk', value: `${profit.toFixed(2)} zl`, color: profit >= 0 ? 'text-emerald-600' : 'text-red-600' },
          { label: 'Zysk/h', value: `${profitPerHour.toFixed(2)} zl`, color: profitPerHour >= 0 ? 'text-emerald-600' : 'text-red-600' },
        ].map((s) => (
          <div key={s.label} className="rounded-lg bg-white shadow-sm p-3">
            <p className="text-xs text-gray-400 uppercase">{s.label}</p>
            <p className={`mt-1 text-lg font-bold ${s.color}`}>{s.value}</p>
          </div>
        ))}
      </div>

      {/* Work logs */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold text-gray-600 uppercase tracking-wide">Etapy pracy</h2>
          <button onClick={() => setShowLogForm(true)}
            className="flex items-center gap-1 rounded-lg bg-amber-50 px-3 py-1.5 text-xs font-medium text-amber-600 hover:bg-amber-100">
            <Plus className="h-3.5 w-3.5" /> Dodaj etap
          </button>
        </div>
        <div className="space-y-2">
          {logs.map((log) => (
            <div key={log.id} className="flex items-center gap-4 rounded-lg bg-white shadow-sm p-3">
              <span className="text-xs text-gray-400">{new Date(log.date).toLocaleDateString('pl-PL')}</span>
              <span className="text-sm font-medium text-gray-800">{log.worker_name}</span>
              <span className="rounded-full bg-gray-200 px-2 py-0.5 text-xs text-gray-600">{log.operation}</span>
              <span className="ml-auto text-sm text-gray-500">{log.hours}h x {log.hourly_rate} zl</span>
              <span className="text-sm font-medium text-amber-600">{Number(log.cost).toFixed(2)} zl</span>
            </div>
          ))}
          {logs.length === 0 && <p className="py-4 text-center text-sm text-gray-400">Brak wpisów</p>}
        </div>
      </div>

      {showItemForm && (
        <OrderItemFormModal
          variants={variants}
          getPrice={(vid) => getPriceForVariant(vid, variants)}
          onClose={() => setShowItemForm(false)}
          onSave={async (item) => { await addItem(item); setShowItemForm(false) }}
        />
      )}
      {showLogForm && (
        <WorkLogFormModal
          orderId={id!}
          onClose={() => setShowLogForm(false)}
          onSave={async (log) => { await addLog(log); setShowLogForm(false) }}
        />
      )}
    </div>
  )
}
