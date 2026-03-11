import { Link } from 'react-router-dom'
import { Calendar, Building2 } from 'lucide-react'
import type { Order } from '../types/database'

function getUrgencyClass(plannedDate: string | null, status: string): string {
  if (status === 'gotowe' || status === 'wydane' || status === 'zapłacone') return 'border-l-emerald-500'
  if (!plannedDate) return 'border-l-gray-300'
  const days = Math.ceil((new Date(plannedDate).getTime() - Date.now()) / 86400000)
  if (days < 0) return 'border-l-red-500'
  if (days <= 3) return 'border-l-amber-500'
  return 'border-l-emerald-500'
}

function getClientName(order: Order): string {
  const client = (order as unknown as Record<string, unknown>).client as { name: string } | null
  return client?.name ?? '—'
}

function getOrderValue(order: Order): number {
  const items = (order as unknown as Record<string, unknown>).order_items as { total_price: number }[] | undefined
  return items?.reduce((s, i) => s + Number(i.total_price), 0) ?? 0
}

function formatNumber(num: number, createdAt: string): string {
  const year = new Date(createdAt).getFullYear() % 100
  return `${num}/${year}`
}

export default function OrderCard({ order }: { order: Order }) {
  const value = getOrderValue(order)
  return (
    <Link
      to={`/zamowienia/${order.id}`}
      className={`block rounded-lg border-l-4 bg-white shadow-sm px-2.5 py-2 transition-colors hover:bg-gray-50 ${getUrgencyClass(order.planned_date, order.status)}`}
    >
      <div className="flex items-center justify-between">
        <span className="text-xs font-bold text-amber-600">{formatNumber(order.number, order.created_at)}</span>
        {order.planned_date && (
          <span className="flex items-center gap-1 text-[11px] text-gray-400">
            <Calendar className="h-3 w-3" />
            {new Date(order.planned_date).toLocaleDateString('pl-PL', { day: 'numeric', month: 'short' })}
          </span>
        )}
      </div>
      <p className="mt-0.5 text-xs text-gray-700 line-clamp-1">{order.description || 'Brak opisu'}</p>
      {order.color && <p className="text-[10px] font-medium text-gray-500">{order.color}</p>}
      {(!order.material_provided || !order.paints_provided) && (
        <div className="mt-0.5 flex gap-1">
          {!order.material_provided && <span className="text-[9px] font-bold text-red-500 bg-red-50 rounded px-1 py-0.5">Materiał</span>}
          {!order.paints_provided && <span className="text-[9px] font-bold text-red-500 bg-red-50 rounded px-1 py-0.5">Lakiery</span>}
        </div>
      )}
      <div className="mt-1 flex items-center justify-between">
        <span className="flex items-center gap-1 text-[11px] text-gray-500">
          <Building2 className="h-3 w-3" />
          {getClientName(order)}
        </span>
        {value > 0 && <span className="text-[11px] font-medium text-emerald-600">{value.toFixed(0)} zł</span>}
      </div>
    </Link>
  )
}
