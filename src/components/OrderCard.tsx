import { Link } from 'react-router-dom'
import { Calendar, User } from 'lucide-react'
import type { Order } from '../types/database'

function getUrgencyClass(plannedDate: string | null, status: string): string {
  if (status === 'gotowe' || status === 'wydane' || status === 'zapłacone') return 'border-l-emerald-500'
  if (!plannedDate) return 'border-l-zinc-600'
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

export default function OrderCard({ order }: { order: Order }) {
  const value = getOrderValue(order)
  return (
    <Link
      to={`/zamowienia/${order.id}`}
      className={`block rounded-lg border-l-4 bg-zinc-800 p-3 transition-colors hover:bg-zinc-700 ${getUrgencyClass(order.planned_date, order.status)}`}
    >
      <div className="flex items-center justify-between">
        <span className="text-sm font-bold text-amber-400">#{order.number}</span>
        {order.planned_date && (
          <span className="flex items-center gap-1 text-xs text-zinc-400">
            <Calendar className="h-3 w-3" />
            {new Date(order.planned_date).toLocaleDateString('pl-PL')}
          </span>
        )}
      </div>
      <p className="mt-1 text-sm text-zinc-200 line-clamp-1">{order.description || 'Brak opisu'}</p>
      <div className="mt-2 flex items-center justify-between">
        <span className="flex items-center gap-1 text-xs text-zinc-400">
          <User className="h-3 w-3" />
          {getClientName(order)}
        </span>
        {value > 0 && <span className="text-xs font-medium text-emerald-400">{value.toFixed(0)} zł</span>}
      </div>
    </Link>
  )
}
