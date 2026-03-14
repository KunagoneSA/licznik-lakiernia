import { Link } from 'react-router-dom'
import { Calendar, Building2, User } from 'lucide-react'
import type { Order } from '../types/database'

function getUrgencyClass(plannedDate: string | null, status: string): string {
  if (status === 'gotowe' || status === 'wydane' || status === 'zapłacone') return 'border-l-emerald-500'
  if (!plannedDate) return 'border-l-gray-300'
  const days = Math.ceil((new Date(plannedDate).getTime() - Date.now()) / 86400000)
  if (days < 0) return 'border-l-red-500'
  if (days <= 3) return 'border-l-amber-500'
  return 'border-l-emerald-500'
}

function getClient(order: Order): { name: string; type?: string } | null {
  return (order as unknown as Record<string, unknown>).client as { name: string; type?: string } | null
}

function formatNumber(num: number, createdAt: string): string {
  const year = new Date(createdAt).getFullYear() % 100
  return `${num}/${year}`
}

export default function OrderCard({ order }: { order: Order }) {
  return (
    <Link
      to={`/zamowienia/${order.id}`}
      className={`block rounded-lg border-l-4 bg-white shadow-sm px-2.5 py-1.5 transition-colors hover:bg-gray-50 ${getUrgencyClass(order.planned_date, order.status)}`}
    >
      <div className="flex items-start justify-between">
        <div className="min-w-0 flex-1">
          <span className="flex items-center gap-1 text-xs">
            <span className="font-bold text-amber-600">{formatNumber(order.number, order.created_at)}</span>
            <span className="text-gray-400">·</span>
            <span className="flex items-center gap-0.5 text-[11px] text-gray-500">
              {getClient(order)?.type === 'company' ? <Building2 className="h-3 w-3 text-blue-500" /> : <User className="h-3 w-3 text-violet-500" />}
              {getClient(order)?.name ?? '—'}
            </span>
          </span>
          <p className="text-[11px] text-gray-700 line-clamp-1">{order.description || 'Brak opisu'}</p>
          {order.color && <p className="text-[10px] font-medium text-gray-500">{order.color}</p>}
        </div>
        <div className="flex flex-col items-end gap-0.5 ml-2 shrink-0">
          {order.planned_date && (
            <span className="flex items-center gap-1 text-[11px] text-gray-400">
              <Calendar className="h-3 w-3" />
              {new Date(order.planned_date).toLocaleDateString('pl-PL', { day: 'numeric', month: 'short' })}
            </span>
          )}
          {(!order.material_provided || !order.paints_provided) && (
            <div className="flex gap-1">
              {!order.material_provided && <span className="text-[9px] font-bold text-red-500 bg-red-50 rounded px-1 py-0.5">Materiał</span>}
              {!order.paints_provided && <span className="text-[9px] font-bold text-red-500 bg-red-50 rounded px-1 py-0.5">Lakiery</span>}
            </div>
          )}
        </div>
      </div>
    </Link>
  )
}
