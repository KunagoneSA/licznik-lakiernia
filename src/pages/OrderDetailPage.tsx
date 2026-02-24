import { useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { ArrowLeft, Plus, Trash2 } from 'lucide-react'
import { useOrder } from '../hooks/useOrder'
import { useOrderItems } from '../hooks/useOrderItems'
import { useWorkLogs } from '../hooks/useWorkLogs'
import { usePaintingVariants } from '../hooks/usePaintingVariants'
import { useClientPricing } from '../hooks/useClientPricing'
import OrderItemFormModal from '../components/OrderItemFormModal'
import WorkLogFormModal from '../components/WorkLogFormModal'
import type { OrderStatus } from '../types/database'

const statusLabels: Record<OrderStatus, string> = {
  nowe: 'Nowe', w_trakcie: 'W trakcie', gotowe: 'Gotowe', wydane: 'Wydane', 'zapłacone': 'Zaplacone',
}
const statusColors: Record<OrderStatus, string> = {
  nowe: 'bg-blue-500', w_trakcie: 'bg-amber-500', gotowe: 'bg-emerald-500', wydane: 'bg-violet-500', 'zapłacone': 'bg-slate-500',
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

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-slate-700 border-t-amber-500" />
      </div>
    )
  }

  if (!order) return <p className="py-8 text-center text-red-400">Zamowienie nie znalezione</p>

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

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <Link to="/zamowienia" className="rounded-md p-1.5 text-slate-400 hover:bg-slate-800">
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <div>
            <h1 className="text-xl font-bold text-slate-100">Zamowienie #{order.number}</h1>
            <p className="text-sm text-slate-400">{getClientName(order as unknown as Record<string, unknown>)} &middot; {order.description || 'Brak opisu'}</p>
          </div>
        </div>
        <div className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-sm font-medium text-white ${statusColors[order.status]}`}>
          {statusLabels[order.status]}
        </div>
      </div>

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
                : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
            }`}
          >
            {statusLabels[s]}
          </button>
        ))}
      </div>

      {/* Checklist */}
      <div className="flex flex-wrap gap-4 rounded-lg bg-slate-800 p-4">
        {[
          { field: 'material_provided', label: 'Material dostarczony', value: order.material_provided },
          { field: 'paints_provided', label: 'Lakiery dostarczone', value: order.paints_provided },
          { field: 'dimensions_entered', label: 'Wymiary wpisane', value: order.dimensions_entered },
        ].map(({ field, label, value }) => (
          <label key={field} className="flex items-center gap-2 text-sm text-slate-300">
            <input
              type="checkbox"
              checked={value}
              onChange={(e) => handleCheckbox(field, e.target.checked)}
              className="rounded border-slate-600 bg-slate-900 text-amber-500 focus:ring-amber-500/50"
            />
            {label}
          </label>
        ))}
      </div>

      {/* Elements table */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold text-slate-300 uppercase tracking-wide">Elementy</h2>
          <button onClick={() => setShowItemForm(true)}
            className="flex items-center gap-1 rounded-lg bg-amber-500/20 px-3 py-1.5 text-xs font-medium text-amber-400 hover:bg-amber-500/30">
            <Plus className="h-3.5 w-3.5" /> Dodaj element
          </button>
        </div>
        <div className="overflow-x-auto rounded-lg border border-slate-800">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-800 bg-slate-800/50">
                <th className="px-3 py-2 text-left text-xs font-medium text-slate-400">Dl (mm)</th>
                <th className="px-3 py-2 text-left text-xs font-medium text-slate-400">Szer (mm)</th>
                <th className="px-3 py-2 text-left text-xs font-medium text-slate-400">Szt</th>
                <th className="px-3 py-2 text-left text-xs font-medium text-slate-400">Rodzaj</th>
                <th className="px-3 py-2 text-right text-xs font-medium text-slate-400">m2</th>
                <th className="px-3 py-2 text-right text-xs font-medium text-slate-400">Cena/m2</th>
                <th className="px-3 py-2 text-right text-xs font-medium text-slate-400">Razem</th>
                <th className="px-3 py-2 w-8"></th>
              </tr>
            </thead>
            <tbody>
              {items.map((item) => (
                <tr key={item.id} className="border-b border-slate-800/50">
                  <td className="px-3 py-2 text-slate-200">{item.length_mm}</td>
                  <td className="px-3 py-2 text-slate-200">{item.width_mm}</td>
                  <td className="px-3 py-2 text-slate-200">{item.quantity}</td>
                  <td className="px-3 py-2 text-slate-300">{(item.variant as { name: string } | undefined)?.name ?? '—'}</td>
                  <td className="px-3 py-2 text-right text-slate-300">{Number(item.m2).toFixed(4)}</td>
                  <td className="px-3 py-2 text-right text-slate-300">{Number(item.price_per_m2).toFixed(0)}</td>
                  <td className="px-3 py-2 text-right font-medium text-amber-400">{Number(item.total_price).toFixed(2)}</td>
                  <td className="px-3 py-2">
                    <button onClick={() => deleteItem(item.id)} className="rounded p-1 text-slate-500 hover:text-red-400 hover:bg-slate-700">
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </td>
                </tr>
              ))}
              {items.length === 0 && (
                <tr><td colSpan={8} className="px-3 py-6 text-center text-slate-500">Brak elementow</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        {[
          { label: 'Lakier m2', value: totalM2.toFixed(2), color: 'text-slate-200' },
          { label: 'Wartosc', value: `${totalValue.toFixed(2)} zl`, color: 'text-amber-400' },
          { label: 'Koszty pracy', value: `${totalLaborCost.toFixed(2)} zl`, color: 'text-red-400' },
          { label: 'Godziny', value: totalHours.toFixed(1), color: 'text-slate-200' },
          { label: 'Zysk', value: `${profit.toFixed(2)} zl`, color: profit >= 0 ? 'text-emerald-400' : 'text-red-400' },
          { label: 'Zysk/h', value: `${profitPerHour.toFixed(2)} zl`, color: profitPerHour >= 0 ? 'text-emerald-400' : 'text-red-400' },
        ].map((s) => (
          <div key={s.label} className="rounded-lg bg-slate-800 p-3">
            <p className="text-xs text-slate-500 uppercase">{s.label}</p>
            <p className={`mt-1 text-lg font-bold ${s.color}`}>{s.value}</p>
          </div>
        ))}
      </div>

      {/* Work logs */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold text-slate-300 uppercase tracking-wide">Etapy pracy</h2>
          <button onClick={() => setShowLogForm(true)}
            className="flex items-center gap-1 rounded-lg bg-amber-500/20 px-3 py-1.5 text-xs font-medium text-amber-400 hover:bg-amber-500/30">
            <Plus className="h-3.5 w-3.5" /> Dodaj etap
          </button>
        </div>
        <div className="space-y-2">
          {logs.map((log) => (
            <div key={log.id} className="flex items-center gap-4 rounded-lg bg-slate-800 p-3">
              <span className="text-xs text-slate-500">{new Date(log.date).toLocaleDateString('pl-PL')}</span>
              <span className="text-sm font-medium text-slate-200">{log.worker_name}</span>
              <span className="rounded-full bg-slate-700 px-2 py-0.5 text-xs text-slate-300">{log.operation}</span>
              <span className="ml-auto text-sm text-slate-400">{log.hours}h x {log.hourly_rate} zl</span>
              <span className="text-sm font-medium text-amber-400">{Number(log.cost).toFixed(2)} zl</span>
            </div>
          ))}
          {logs.length === 0 && <p className="py-4 text-center text-sm text-slate-500">Brak wpisow</p>}
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
